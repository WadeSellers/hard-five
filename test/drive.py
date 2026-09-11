#!/usr/bin/env python3
"""Minimal Chrome DevTools driver (stdlib only) for driving the app in headless Chrome with real frames and real input.
Used by test/scenarios.py. Serves the repo over http (ES modules do not load from file://). Adapted from proto/cdp.py."""
import base64, json, os, socket, struct, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHOTS = os.path.join(HERE, "shots")
import http.server, threading, functools

def serve(port=0):
    """static server for ROOT on a free port; returns (httpd, port)"""
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

class WS:
    def __init__(self, url):
        assert url.startswith("ws://")
        rest = url[5:]; host, path = rest.split("/", 1); path = "/" + path
        h, p = host.split(":"); self.s = socket.create_connection((h, int(p)), timeout=60)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (f"GET {path} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
               f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
        self.s.sendall(req.encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            chunk = self.s.recv(4096)
            if not chunk: raise RuntimeError("ws handshake failed")
            buf += chunk
        head, self.rest = buf.split(b"\r\n\r\n", 1)
        if b" 101 " not in head.split(b"\r\n")[0]: raise RuntimeError("ws handshake: " + head.decode(errors="replace"))
    def _recv(self, n):
        out = self.rest[:n]; self.rest = self.rest[n:]
        while len(out) < n:
            chunk = self.s.recv(min(1 << 20, n - len(out)))
            if not chunk: raise RuntimeError("ws closed")
            out += chunk
        return out
    def send(self, text):
        data = text.encode(); mask = os.urandom(4)
        hdr = bytes([0x81])
        n = len(data)
        if n < 126: hdr += bytes([0x80 | n])
        elif n < 65536: hdr += bytes([0x80 | 126]) + struct.pack(">H", n)
        else: hdr += bytes([0x80 | 127]) + struct.pack(">Q", n)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.s.sendall(hdr + mask + masked)
    def recv(self):
        msg = b""
        while True:
            b0, b1 = self._recv(2)
            fin, op = b0 & 0x80, b0 & 0x0F
            n = b1 & 0x7F
            if n == 126: n = struct.unpack(">H", self._recv(2))[0]
            elif n == 127: n = struct.unpack(">Q", self._recv(8))[0]
            if b1 & 0x80: mask = self._recv(4)
            else: mask = None
            payload = self._recv(n)
            if mask: payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
            if op == 0x9:  # ping -> pong
                self.s.sendall(bytes([0x8A, 0x80]) + b"\0\0\0\0"); continue
            if op == 0x8: raise RuntimeError("ws close")
            msg += payload
            if fin: return msg.decode()

class Chrome:
    def __init__(self, port=9333, size=(390, 844), profile=None, fresh=True):
        self.port = port; self.size = size
        self.profile = profile or os.path.join(HERE, ".cdp-profile")
        os.makedirs(SHOTS, exist_ok=True)
        if fresh: subprocess.run(["rm", "-rf", self.profile])
        self.proc = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--mute-audio",
                                      f"--remote-debugging-port={port}", f"--user-data-dir={self.profile}",
                                      f"--window-size={size[0]},{size[1]}", "about:blank"],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2)); break
            except Exception: time.sleep(0.1)
        else: raise RuntimeError("chrome did not start")
        page = [t for t in targets if t["type"] == "page"][0]
        self.attach(page["webSocketDebuggerUrl"])
    def attach(self, wsurl):
        self.ws = WS(wsurl); self.id = 0; self.events = []
        self.cmd("Page.enable"); self.cmd("Runtime.enable")
        self.cmd("Emulation.setDeviceMetricsOverride", width=self.size[0], height=self.size[1], deviceScaleFactor=2, mobile=self.size[0] < 900)
        if self.size[0] < 900: self.cmd("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=2)
    def new_tab(self):
        """a second page in the same browser (same profile: same localStorage, its own sessionStorage) driven by its own Chrome object"""
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}/json/new?about:blank", method="PUT")
        t = json.load(urllib.request.urlopen(req, timeout=5))
        other = Chrome.__new__(Chrome); other.port = self.port; other.size = self.size; other.profile = self.profile; other.proc = None
        other.attach(t["webSocketDebuggerUrl"]); return other
    def cmd(self, method, **params):
        self.id += 1; mid = self.id
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get("id") == mid:
                if "error" in m: raise RuntimeError(f"{method}: {m['error']}")
                return m.get("result", {})
            self.events.append(m)
    def nav(self, url, settle=1.5):
        self.cmd("Page.navigate", url=url); time.sleep(settle)
    def js(self, expr, await_=False):
        r = self.cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=await_)
        res = r.get("result", {})
        if "exceptionDetails" in r: raise RuntimeError(json.dumps(r["exceptionDetails"])[:600])
        return res.get("value")
    def shot(self, name):
        r = self.cmd("Page.captureScreenshot", format="png")
        path = os.path.join(SHOTS, name + ".png")
        with open(path, "wb") as f: f.write(base64.b64decode(r["data"]))
        return path
    # --- input: mouse events raise pointer events with pointerType mouse; touch events raise touch pointers ---
    def front(self):
        """headless Chrome does not deliver input to a background tab; bring this one forward first"""
        try: self.cmd("Page.bringToFront")
        except Exception: pass
        time.sleep(0.05)
    def touch(self, x, y, hold=0.0):
        self.front()
        self.cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": x, "y": y}])
        if hold: time.sleep(hold)
        self.cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
    def drag(self, x, y, dx, steps=12, dt=0.03):
        self.front()
        self.cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": x, "y": y}])
        for i in range(1, steps + 1):
            time.sleep(dt); self.cmd("Input.dispatchTouchEvent", type="touchMove", touchPoints=[{"x": x + dx * i / steps, "y": y}])
        time.sleep(dt); self.cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
    def hit(self, i):
        """centre of Wade's i-th tap target in CSS px"""
        return self.js(f"(function(){{var h=document.querySelector('.hit[data-i=\"{i}\"]'); if(!h) return null; var r=h.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2];}})()")
    def centre(self, sel):
        return self.js(f"(function(){{var h=document.querySelector('{sel}'); if(!h) return null; var r=h.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2];}})()")
    def state(self):
        return self.js("""(function(){ var H = window.HardFive; if(!H || !H.S.ready) return null; var s = H.S, d = s.days[s.dayOf]||{}, me = H.DEV.me;
          var names = {}; s.roster.forEach(function(p){ names[p.id] = p.name; });
          return { dayOf: s.dayOf, muted: H.DEV.muted, me: me, sync: H.sync.name + '/' + (H.sync.label||''), who: H.UI.who,
          roster: [...document.querySelectorAll('#runs .run')].sort(function(a,b){ return a.dataset.pid < b.dataset.pid ? -1 : 1; }).map(function(g){ var c = g.querySelector('.chalk'); var n = c.querySelector('[data-role=name]'); var cnt = [...c.querySelectorAll('[data-role=count],[data-role=count2]')].map(function(t){ return t.textContent + (t.classList.contains('struck') ? '~' : ''); }).join(' '); return g.dataset.pid + ':' + (n.tagName === 'text' ? n.textContent : '-') + ':' + cnt; }),
          anchors: s.roster.map(function(p){ return p.id + '@' + p.anchor.date + '#' + p.anchor.day + (p.uids && p.uids.length ? '+' + p.uids.length : ''); }),
          mine: d[me] && d[me].links, mineDone: d[me] && d[me].doneAt, mineStruck: d[me] && d[me].struck, wade: d.wade && d.wade.links, dan: d.dan && d.dan.links,
          links: Object.keys(d).map(function(k){ return k + ':' + ['DIET','LIFT','OUT','GAL','READ','PHOTO'].map(function(t){ return d[k].links[t] || '-'; }).join(','); }),
          parted: [...document.querySelectorAll('#turns use[id^=mk-]')].filter(function(u){ return u.getAttribute('href') === '#lk-parted'; }).map(function(u){ return u.id.slice(3); }),
          pending: Object.keys(H.PENDING),
          order: [...document.querySelectorAll('#runs .run')].map(function(g){ return g.dataset.pid + '@' + g.dataset.slot; }),
          times: [...document.querySelectorAll('[data-role="time"]')].map(function(t){ return t.textContent + (t.classList.contains('struck') ? '~' : ''); }),
          cd: (function(){ var t=[...document.querySelectorAll('#scene text.cp')][0]; return t && t.textContent; })(),
          light: document.getElementById('deck').dataset.light, circles: document.querySelectorAll('.circle').length,
          markers: s.roster.map(function(p){ var m = document.getElementById('mk-' + p.id); return p.id + ':' + (m ? m.getAttribute('href').slice(4) : '-'); }).join(' '),
          hits: [...document.querySelectorAll('.hit')].map(function(h){ return h.getAttribute('aria-label').replace(', ', ':'); }).join(' '),
          panel: !!document.querySelector('.panel'), allHands: !!document.querySelector('#cpAHr'), strikes: document.querySelectorAll('.strike').length,
          sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight }; })()""")
    def errors(self):
        out = []
        for e in self.events:
            if e.get("method") == "Runtime.exceptionThrown": out.append(json.dumps(e["params"]["exceptionDetails"])[:300])
            if e.get("method") == "Runtime.consoleAPICalled" and e["params"]["type"] in ("error", "warning"):
                out.append(e["params"]["type"] + ": " + " ".join(str(a.get("value", a.get("description"))) for a in e["params"]["args"]))
        return out
    def close(self):
        if self.proc is None:
            try: self.ws.s.close()
            except Exception: pass
            return
        try: self.cmd("Browser.close")
        except Exception: pass
        try: self.proc.kill()
        except Exception: pass

if __name__ == "__main__":
    httpd, port = serve()
    c = Chrome()
    c.nav(f"http://127.0.0.1:{port}/index.html?t=13:00&reset=1")
    print(c.state()); print(c.shot("smoke")); print(c.errors()); c.close(); httpd.shutdown()

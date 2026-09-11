#!/usr/bin/env python3
"""Minimal Chrome DevTools driver (stdlib only) for testing index.html with real frames and real input.
Usage as a module: see scenario scripts. Launches headless Chrome with a remote debugging port."""
import base64, json, os, socket, struct, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
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
        self.ws = WS(page["webSocketDebuggerUrl"]); self.id = 0; self.events = []
        self.cmd("Page.enable"); self.cmd("Runtime.enable")
        self.cmd("Emulation.setDeviceMetricsOverride", width=size[0], height=size[1], deviceScaleFactor=2, mobile=size[0] < 900)
        if size[0] < 900: self.cmd("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=2)
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
        path = os.path.join(HERE, "shots", name + ".png")
        with open(path, "wb") as f: f.write(base64.b64decode(r["data"]))
        return path
    # --- input: mouse events raise pointer events with pointerType mouse; touch events raise touch pointers ---
    def touch(self, x, y, hold=0.0):
        self.cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": x, "y": y}])
        if hold: time.sleep(hold)
        self.cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
    def drag(self, x, y, dx, steps=12, dt=0.03):
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
        return self.js("""(function(){ var s = JSON.parse(localStorage.getItem('hardfive.v1')||'null'); if(!s) return null; var d = s.days[s.dayOf]||{};
          return { dayOf: s.dayOf, muted: s.muted, me: s.me, roster: s.roster.map(function(p){ return p.name + ':' + p.day + (p.prevDay ? '(' + p.prevDay + ')' : ''); }),
          wade: d.wade && d.wade.links, wadeDone: d.wade && d.wade.doneAt, wadeStruck: d.wade && d.wade.struck, dan: d.dan && d.dan.links,
          parted: Object.keys(d).filter(function(k){ return d[k].parted; }),
          order: [...document.querySelectorAll('#runs .run')].map(function(g){ return g.dataset.pid + '@' + g.dataset.slot; }),
          times: [...document.querySelectorAll('[data-role="time"]')].map(function(t){ return t.textContent + (t.classList.contains('struck') ? '~' : ''); }),
          cd: (function(){ var t=[...document.querySelectorAll('#scene text.cp')][0]; return t && t.textContent; })(),
          light: document.getElementById('deck').dataset.light, circles: document.querySelectorAll('.circle').length,
          markers: ['wade','tom','mike','jess','dan'].map(function(p){ var m = document.getElementById('mk-' + p); return p + ':' + (m ? m.getAttribute('href').slice(4) : '-'); }).join(' '),
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
        try: self.cmd("Browser.close")
        except Exception: pass
        try: self.proc.kill()
        except Exception: pass

if __name__ == "__main__":
    c = Chrome()
    c.nav(f"file://{HERE}/index.html?t=13:00&reset=1")
    print(c.state()); print(c.shot("cdp-smoke")); print(c.errors()); c.close()

#!/usr/bin/env python3
"""Interaction scenarios for index.html, driven through cdp.py. usage: scenarios.py NAME PORT"""
import sys, time, json
from cdp import Chrome, HERE
URL = f"file://{HERE}/index.html"

def brief(s, keys=("order", "times", "hits", "wadeDone", "wadeStruck", "cd", "light", "circles", "markers", "panel", "allHands", "strikes", "muted", "me", "roster", "dayOf", "parted", "sw", "sh")):
    return {k: s.get(k) for k in keys if s and k in s}

def move(port):
    c = Chrome(port=port, profile=f"{HERE}/.prof-{port}")
    c.nav(URL + "?t=13:00&reset=1")
    x, y = c.hit(0); c.touch(x, y); time.sleep(0.09); c.shot("mv-01-jaw-90ms"); time.sleep(0.25); c.shot("mv-02-slack-340ms"); time.sleep(0.6)
    print("after 1:", brief(c.state(), ("hits", "order")))
    for i in range(1, 5):
        x, y = c.hit(i); c.touch(x, y); time.sleep(0.9)
    x, y = c.hit(5); c.touch(x, y); time.sleep(0.55); c.shot("mv-03-taut-time-550ms"); time.sleep(0.95); c.shot("mv-04-reflake-1500ms"); time.sleep(1.6); c.shot("mv-05-made")
    print("made:", brief(c.state()))
    # undo: long-press LIFT (closed) in the made run
    x, y = c.hit(1); c.touch(x, y, hold=0.9); time.sleep(0.5); c.shot("mv-06-undo-struck"); time.sleep(1.5)
    print("undone:", brief(c.state(), ("hits", "order", "times", "wadeStruck", "wadeDone", "strikes")))
    x, y = c.hit(1); c.touch(x, y); time.sleep(3.2); c.shot("mv-07-remade")
    print("remade:", brief(c.state(), ("hits", "order", "times", "wadeStruck", "wadeDone", "strikes")))
    # a tap in another run does nothing
    lk = c.js("(function(){var e=document.getElementById('lk-mike-2'); var r=e.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2];})()")
    c.touch(*lk); time.sleep(0.8); print("mike tap:", c.js("JSON.parse(localStorage.getItem('hardfive.v1')).days['2026-09-11'].mike.links"))
    print("errors:", c.errors()); c.close()

def chrome_bits(port):
    c = Chrome(port=port, profile=f"{HERE}/.prof-{port}")
    c.nav(URL + "?t=13:00&reset=1")
    c.touch(*c.centre('.tgt.local')); time.sleep(0.6); c.shot("ui-01-panel"); print("panel:", brief(c.state(), ("panel", "me")))
    c.touch(*c.centre('.tgt.margin[data-pid="mike"]')); time.sleep(0.6); c.shot("ui-02-panel-me-mike"); print("me->mike:", brief(c.state(), ("me",)))
    c.touch(*c.centre('.tgt.margin[data-pid="wade"]')); time.sleep(0.5)
    # edit Wade's day count through the hidden input
    c.touch(*c.centre('.tgt.edit[data-pid="wade"][data-field="day"]')); time.sleep(0.4)
    c.js("(function(){var k=document.getElementById('kbd'); k.value='31'; k.dispatchEvent(new Event('input')); k.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}));})()"); time.sleep(0.5)
    c.shot("ui-03-panel-edited"); print("edited:", brief(c.state(), ("roster", "panel")))
    c.touch(*c.centre('.tgt.panelBack')); time.sleep(0.6); c.shot("ui-04-panel-closed-day31"); print("closed:", brief(c.state(), ("panel", "roster", "markers")))
    c.touch(*c.centre('.tgt.date'), hold=0.9); time.sleep(0.5); c.shot("ui-05-muted"); print("muted:", brief(c.state(), ("muted",)))
    c.touch(*c.centre('.tgt.date'), hold=0.9); time.sleep(0.5); print("unmuted:", brief(c.state(), ("muted",)))
    # scrub: 60 px right = +4 h -> 17:00; then tap to snap live
    sx, sy = c.centre('.tgt.strip'); c.drag(sx, sy, 60); time.sleep(0.8); c.shot("ui-06-scrub-1700"); print("scrubbed:", brief(c.state(), ("cd", "light", "order", "times")))
    c.drag(sx, sy, 75); time.sleep(0.8); c.shot("ui-07-scrub-2200"); print("scrubbed 2:", brief(c.state(), ("cd", "light", "order", "times")))
    c.touch(sx, sy); time.sleep(0.8); print("live:", brief(c.state(), ("cd", "light")))
    # resize to laptop and back
    c.cmd("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=1, mobile=False); time.sleep(0.8)
    print("laptop:", c.js("({w: document.getElementById('deck').getAttribute('width'), sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight})"))
    c.shot("ui-08-resized-laptop")
    c.cmd("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=2, mobile=True); time.sleep(0.8)
    print("phone again:", c.js("({w: document.getElementById('deck').getAttribute('width'), sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight})"))
    print("errors:", c.errors()); c.close()

def midnight(port):
    c = Chrome(port=port, profile=f"{HERE}/.prof-{port}")
    c.nav(URL + "?t=23:59:57.5&reset=1", settle=0.5)
    c.nav(URL + "?t=23:59:57&run=1", settle=0.3)
    c.shot("mn-00-2359"); print("before:", brief(c.state(), ("cd", "circles", "order", "roster", "markers", "dayOf")))
    # minute tick fires ~3.0 s after load, bells 0.6 s (no audio context), part, then haul out 1.2 s, haul in 1.2 s
    t0 = time.time()
    def at(t, name):
        while time.time() - t0 < t: time.sleep(0.02)
        c.shot(name); return time.time() - t0
    print(at(3.85, "mn-01-parted"), "parted:", brief(c.state(), ("markers", "dayOf")))
    print(at(4.7, "mn-02-haul-out"))
    print(at(5.35, "mn-03-haul-out-late"))
    print(at(6.0, "mn-04-haul-in"))
    print(at(6.6, "mn-05-haul-in-late"))
    time.sleep(1.5); c.shot("mn-06-new-day"); print("after:", brief(c.state(), ("cd", "circles", "order", "roster", "markers", "dayOf", "parted", "light", "hits")))
    print("errors:", c.errors()); c.close()

def allhands(port):
    c = Chrome(port=port, profile=f"{HERE}/.prof-{port}")
    c.nav(URL + "?t=22:50&reset=1")
    print("start:", brief(c.state(), ("order", "times")))
    c.touch(*c.centre('.tgt.local')); time.sleep(0.5)
    c.touch(*c.centre('.tgt.margin[data-pid="dan"]')); time.sleep(0.5)
    c.touch(*c.centre('.tgt.panelBack')); time.sleep(0.6); print("me=dan:", brief(c.state(), ("me", "hits", "order")))
    for i in (2, 4, 5):
        x, y = c.hit(i); c.touch(x, y); time.sleep(0.9)
    time.sleep(2.5); c.shot("ah-01-dan-made"); print("dan made:", brief(c.state(), ("order", "times", "markers")))
    c.touch(*c.centre('.tgt.local')); time.sleep(0.5); c.touch(*c.centre('.tgt.margin[data-pid="wade"]')); time.sleep(0.5); c.touch(*c.centre('.tgt.panelBack')); time.sleep(0.6)
    for i in range(5):
        x, y = c.hit(i); c.touch(x, y); time.sleep(0.9)
    x, y = c.hit(5); c.touch(x, y); time.sleep(3.6); c.shot("ah-02-all-hands-paint"); time.sleep(1.0); c.shot("ah-03-all-hands")
    print("all hands:", brief(c.state(), ("order", "times", "allHands")))
    print("errors:", c.errors()); c.close()

def laptop_move(port):
    c = Chrome(port=port, size=(1440, 900), profile=f"{HERE}/.prof-{port}")
    c.nav(URL + "?t=13:00&reset=1")
    for i in range(6):
        x, y = c.hit(i); c.cmd("Input.dispatchMouseEvent", type="mousePressed", x=x, y=y, button="left", clickCount=1)
        c.cmd("Input.dispatchMouseEvent", type="mouseReleased", x=x, y=y, button="left", clickCount=1); time.sleep(0.9)
    time.sleep(2.5); c.shot("lp-01-made"); print("laptop made:", brief(c.state(), ("order", "times", "hits", "sw", "sh")))
    print("errors:", c.errors()); c.close()

if __name__ == "__main__":
    globals()[sys.argv[1]](int(sys.argv[2]))

#!/usr/bin/env python3
"""Two phones, one chain. Drives two tabs of the ?sync=fake crew in one headless Chrome (same localStorage, separate
sessionStorage, so each tab is its own device) and proves: first-run identity, a tap on A landing on B, undo on B landing
on A, roster edits crossing over, and derived day counts from seeded history. `python3 test/twophone.py`"""
import json, sys, time
from drive import Chrome, serve

def wait(c, expr, want=True, tries=40, dt=0.1):
    for _ in range(tries):
        if c.js(expr) == want: return True
        time.sleep(dt)
    return False

def main():
    httpd, port = serve()
    base = f"http://127.0.0.1:{port}/index.html?sync=fake&t=13:00&nosw=1"
    fails = []
    def check(name, ok, extra=""):
        print(("ok   " if ok else "FAIL ") + name + (("  " + extra) if extra else ""))
        if not ok: fails.append(name)

    a = Chrome(port=9351, size=(390, 844))
    a.nav(base + "&reset=1&fresh=1", settle=2.0)
    st = a.state()
    check("A: fresh device sees WHO ARE YOU", bool(st and st["who"] and st["panel"]), json.dumps({"who": st and st["who"], "me": st and st["me"]}))
    a.shot("tp-01-who-are-you")
    # claim WADE (p1) on A
    xy = a.centre('.tgt.claim[data-pid="p1"]')
    check("A: claim target exists", bool(xy))
    if xy:
        a.touch(*xy); time.sleep(0.6)
    st = a.state()
    check("A: claimed p1, panel closed", bool(st and st["me"] == "p1" and not st["panel"]), json.dumps({"me": st and st["me"], "panel": st and st["panel"]}))
    a.nav(base, settle=1.5)
    st = a.state()
    check("A: identity survives reload", bool(st and st["me"] == "p1"))

    b = a.new_tab()
    b.nav(base + "&fresh=1", settle=2.0)
    st = b.state()
    check("B: fresh tab asks WHO ARE YOU", bool(st and st["who"]))
    xy = b.centre('.tgt.claim[data-pid="p2"]')
    if xy: b.touch(*xy); time.sleep(0.6)
    st = b.state()
    check("B: claimed p2", bool(st and st["me"] == "p2"))
    b.shot("tp-02-b-claimed")

    # A taps DIET; B must see p1 DIET closed
    xy = a.hit(0)
    check("A: own DIET hit target", bool(xy))
    if xy: a.touch(*xy)
    got = wait(b, "(function(){var H=window.HardFive; var d=H.S.days[H.S.dayOf]||{}; return !!(d.p1&&d.p1.links&&d.p1.links.DIET);})()")
    check("B: sees A's DIET close within 4 s", got)
    time.sleep(1.0); b.shot("tp-03-b-sees-a-tap")
    hitsB = b.js("[...document.querySelectorAll('#run-p1 use[id^=lk-]')].map(u=>u.getAttribute('href')).join(' ')")
    check("B: p1 DIET drawn as a closed flat link", "#lk-flat" in (hitsB or "").split(" ")[0:1][0] if hitsB else False, hitsB)

    # B closes all six of p2; A must see p2 made and re-flaked to slot 0
    for i in range(6):
        xy = b.hit(i)
        if xy: b.touch(*xy); time.sleep(0.25)
    got = wait(a, "(function(){var H=window.HardFive; var d=H.S.days[H.S.dayOf]||{}; return !!(d.p2&&d.p2.doneAt);})()", tries=60)
    check("A: sees p2 made", got)
    time.sleep(2.5)
    order = a.state()["order"]
    check("A: p2 re-flaked to the top slot", "p2@0" in order, " ".join(order))
    a.shot("tp-04-a-sees-b-made")

    # B long-presses LIFT (undo); A must see p2 open again
    xy = b.hit(1)
    if xy: b.touch(*xy, hold=0.9)
    got = wait(a, "(function(){var H=window.HardFive; var d=H.S.days[H.S.dayOf]||{}; return !!(d.p2&&d.p2.links&&d.p2.links.LIFT==null);})()", tries=60)
    check("A: sees B's undo", got)

    # roster edit on A (rename p3) must appear on B
    a.js("(function(){var H=window.HardFive; var r=JSON.parse(JSON.stringify(H.S.roster)); r[2].name='JESS'; return H.sync.setRoster(r);})()", await_=True)
    got = wait(b, "(function(){var H=window.HardFive; return H.S.roster[2].name==='JESS';})()")
    check("B: sees A's roster edit", got)

    # derived day counts: seed history for p4 (made 3, missed 1, made 2 -> today is day 3, no parted marker)
    a.js("""(function(){ var H=window.HardFive; var key=H.S.dayOf; function ad(k,n){var p=k.split('-').map(Number);var t=new Date(Date.UTC(p[0],p[1]-1,p[2]+n));return t.getUTCFullYear()+'-'+String(t.getUTCMonth()+1).padStart(2,'0')+'-'+String(t.getUTCDate()).padStart(2,'0');}
      var raw=JSON.parse(localStorage.getItem('hardfive.fake')); var c=raw['default']; var made={DIET:'0600',LIFT:'0700',OUT:'0800',GAL:'0900',READ:'1000',PHOTO:'1100'};
      var pattern=[1,1,1,0,1,1]; // six days back to yesterday
      for(var i=0;i<6;i++){ var k=ad(key,i-6); if(!c.days[k]) c.days[k]={}; if(pattern[i]) c.days[k].p4={links:made,doneAt:'1100',doneSeq:1,struck:[]}; }
      c.roster[3].anchor={date:ad(key,-6),day:1}; c.roster[3].name='DAN';
      localStorage.setItem('hardfive.fake',JSON.stringify(raw)); new BroadcastChannel('hardfive-fake').postMessage({crew:'default'}); return true; })()""")
    time.sleep(1.0)
    st = a.state()
    row = [r for r in st["roster"] if r.startswith("p4:")]
    check("A: p4 derived count is 3 (made 3, missed 1, made 2)", bool(row) and row[0].endswith(":3"), " ".join(row))
    check("A: p4 not parted (yesterday was made)", "p4" not in st["parted"], " ".join(st["parted"]))
    # now make yesterday a miss: expect parted + struck previous count
    a.js("""(function(){ var H=window.HardFive; var key=H.S.dayOf; function ad(k,n){var p=k.split('-').map(Number);var t=new Date(Date.UTC(p[0],p[1]-1,p[2]+n));return t.getUTCFullYear()+'-'+String(t.getUTCMonth()+1).padStart(2,'0')+'-'+String(t.getUTCDate()).padStart(2,'0');}
      var raw=JSON.parse(localStorage.getItem('hardfive.fake')); var c=raw['default']; delete c.days[ad(key,-1)].p4; localStorage.setItem('hardfive.fake',JSON.stringify(raw)); new BroadcastChannel('hardfive-fake').postMessage({crew:'default'}); return true; })()""")
    time.sleep(1.0)
    st = a.state()
    row = [r for r in st["roster"] if r.startswith("p4:")]
    check("A: p4 parted after a missed yesterday, count struck 2 -> 1", ("p4" in st["parted"]) and bool(row) and ("2~" in row[0]) and row[0].endswith(":2~ 1"), " ".join(row) + " parted=" + " ".join(st["parted"]))
    a.shot("tp-05-derived-counts")

    errs = [e for e in a.errors() + b.errors() if "favicon" not in e and "Manifest" not in e]
    check("no console errors or warnings on either phone", not errs, " | ".join(errs)[:400])
    b.close(); a.close(); httpd.shutdown()
    print("\n" + ("ALL PASSED" if not fails else f"{len(fails)} FAILED: " + ", ".join(fails)))
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()

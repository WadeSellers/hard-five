#!/usr/bin/env python3
"""Renders icons/icon-192.png, icon-512.png and apple-touch-icon-180.png from tools/icon.html with headless Chrome at exact
pixel sizes (device metrics emulation; the --window-size flag alone cannot go below 500 px wide). `python3 tools/icons.py`"""
import base64, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "test"))
from drive import Chrome, serve, ROOT

SIZES = [("icon-192", 192), ("icon-512", 512), ("apple-touch-icon-180", 180)]

def main():
    httpd, port = serve()
    os.makedirs(os.path.join(ROOT, "icons"), exist_ok=True)
    c = Chrome(port=9345, size=(512, 512), profile="/tmp/hardfive-icons-profile")
    for name, px in SIZES:
        c.cmd("Emulation.setDeviceMetricsOverride", width=px, height=px, deviceScaleFactor=1, mobile=False)
        c.nav(f"http://127.0.0.1:{port}/tools/icon.html?s={px}", settle=0.8)
        for _ in range(50):
            if c.js("document.documentElement.getAttribute('data-ready')") == "1": break
            time.sleep(0.05)
        time.sleep(0.3)
        r = c.cmd("Page.captureScreenshot", format="png", clip={"x": 0, "y": 0, "width": px, "height": px, "scale": 1})
        out = os.path.join(ROOT, "icons", name + ".png")
        with open(out, "wb") as f: f.write(base64.b64decode(r["data"]))
        print("wrote", out)
    print("errors:", c.errors()); c.close(); httpd.shutdown()

if __name__ == "__main__": main()

#!/usr/bin/env python3
"""Writes index.html: the thin shell with the link symbols from proto/link-symbols.svg.txt inlined byte for byte.
Not a build step the app needs at runtime; run it only if the symbols or the shell change. `python3 tools/make-index.py`"""
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
symbols = (ROOT / "proto" / "link-symbols.svg.txt").read_text().strip()
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Hard Five</title>
<meta name="theme-color" content="#7F898C">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Hard Five">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" href="./icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon-180.png">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap">
<link rel="stylesheet" href="./app.css">
<style id="lapStyle">.lap{{--i1:#7D8386;--i2:#A9AFB2;--i3:#C7CBCD}}</style>
</head>
<body>
<div id="bulk"></div>
<svg id="deck" class="deck" xmlns="http://www.w3.org/2000/svg" width="100%" height="844" viewBox="0 0 390 844" preserveAspectRatio="xMidYMin slice">
{symbols}
<defs id="dyn"></defs>
<g id="scene"></g>
</svg>
<input id="kbd" type="text" autocomplete="off" autocapitalize="characters" aria-hidden="true" tabindex="-1">
<script type="module" src="./app.js"></script>
</body>
</html>
"""
(ROOT / "index.html").write_text(html)
print("wrote index.html", len(html), "bytes")

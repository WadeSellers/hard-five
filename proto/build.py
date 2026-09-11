#!/usr/bin/env python3
"""Assembles index.html (the deliverable, self-contained) from link-symbols.svg.txt + app.src.css + app.src.js."""
from pathlib import Path
HERE = Path(__file__).resolve().parent
symbols = (HERE / "link-symbols.svg.txt").read_text().strip()
css = (HERE / "app.src.css").read_text().strip()
js = (HERE / "app.src.js").read_text().strip()
assert "</script" not in js and "</style" not in css
html = f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hard Five</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap">
<style>
{css}
</style>
<style id="lapStyle">.lap{{--i1:#7D8386;--i2:#A9AFB2;--i3:#C7CBCD}}</style>
<svg id="deck" class="deck" xmlns="http://www.w3.org/2000/svg" width="100%" height="844" viewBox="0 0 390 844" preserveAspectRatio="xMidYMin slice">
{symbols}
<defs id="dyn"></defs>
<g id="scene"></g>
</svg>
<input id="kbd" type="text" autocomplete="off" autocapitalize="characters" aria-hidden="true" tabindex="-1">
<script>
{js}
</script>
"""
(HERE / "index.html").write_text(html)
print("wrote index.html", len(html), "bytes")

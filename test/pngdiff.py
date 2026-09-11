#!/usr/bin/env python3
"""Pure-stdlib PNG diff: pngdiff.py A.png B.png [OUT.png]
Prints size, count of differing pixels, max channel delta, and writes a diff image (red where pixels differ) if OUT is given.
Handles 8-bit RGB / RGBA non-interlaced PNGs (what headless Chrome writes)."""
import struct, sys, zlib

def read_png(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', path
    pos, idat, w, h, ct = 8, b'', 0, 0, 0
    while pos < len(data):
        n, = struct.unpack('>I', data[pos:pos + 4]); typ = data[pos + 4:pos + 8]; body = data[pos + 8:pos + 8 + n]; pos += 12 + n
        if typ == b'IHDR':
            w, h, bd, ct, comp, filt, il = struct.unpack('>IIBBBBB', body); assert bd == 8 and il == 0 and ct in (2, 6), (bd, ct, il)
        elif typ == b'IDAT': idat += body
        elif typ == b'IEND': break
    bpp = 3 if ct == 2 else 4
    raw = zlib.decompress(idat); stride = w * bpp; out = bytearray(); prev = bytearray(stride); p = 0
    for y in range(h):
        f = raw[p]; line = bytearray(raw[p + 1:p + 1 + stride]); p += 1 + stride
        if f == 1:
            for i in range(bpp, stride): line[i] = (line[i] + line[i - bpp]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride): line[i] = (line[i] + ((line[i - bpp] if i >= bpp else 0) + prev[i]) // 2) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0; b = prev[i]; c = prev[i - bpp] if i >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out += line; prev = line
    return w, h, bpp, bytes(out)

def write_png(path, w, h, rgb):
    raw = b''.join(b'\x00' + rgb[y * w * 3:(y + 1) * w * 3] for y in range(h))
    def chunk(t, b): return struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))

def main():
    a, b = sys.argv[1], sys.argv[2]; out = sys.argv[3] if len(sys.argv) > 3 else None
    wa, ha, ba, pa = read_png(a); wb, hb, bb, pb = read_png(b)
    if (wa, ha) != (wb, hb): print(f'SIZE DIFFERS {wa}x{ha} vs {wb}x{hb}'); sys.exit(2)
    n, mx, diff, minx, miny, maxx, maxy = 0, 0, bytearray(), wa, ha, -1, -1
    for i in range(wa * ha):
        ra, ga, bl = pa[i * ba], pa[i * ba + 1], pa[i * ba + 2]; rb, gb, bb2 = pb[i * bb], pb[i * bb + 1], pb[i * bb + 2]
        d = max(abs(ra - rb), abs(ga - gb), abs(bl - bb2))
        if d > 0:
            n += 1; mx = max(mx, d); x, y = i % wa, i // wa; minx, miny, maxx, maxy = min(minx, x), min(miny, y), max(maxx, x), max(maxy, y)
            if out: diff += bytes((255, 0, 0)) if d > 8 else bytes((255, 160, 0))
        elif out:
            g = (ra * 3 + ga * 6 + bl) // 10 // 2 + 96; diff += bytes((g, g, g))
    print(f'{wa}x{ha} differing={n} ({100 * n / (wa * ha):.3f}%) maxdelta={mx}' + (f' bbox=({minx},{miny})-({maxx},{maxy})' if n else ''))
    if out: write_png(out, wa, ha, bytes(diff))
    sys.exit(0 if n == 0 else 1)

if __name__ == '__main__': main()

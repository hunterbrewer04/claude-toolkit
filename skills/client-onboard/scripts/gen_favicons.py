#!/usr/bin/env python3
"""Generate a placeholder favicon set (solid neutral color, no branding yet)
for a freshly scaffolded client site: favicon.ico, favicon-16x16.png,
favicon-32x32.png, apple-touch-icon.png.

Pure stdlib (zlib + struct) -- no Pillow dependency, since this needs to run
on a bare macOS Python. Real branding replaces these before launch (see
To-Do.md in the scaffolded repo).

Usage: gen_favicons.py <target-dir>
"""
import os
import struct
import sys
import zlib

# Neutral near-black placeholder. Swap for the client's real brand color
# once DESIGN_SPEC.md has one -- this exists only so the repo isn't missing
# files the HTML/manifest reference.
COLOR = (17, 17, 17)


def make_png(path, size, color=COLOR):
    """Write a solid-color square PNG at <size>x<size>."""
    row = bytes((0,)) + bytes(color) * size  # filter-type byte + RGB pixels
    raw = row * size

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit, RGB
    idat = zlib.compress(raw, 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def make_ico(path, size=32, color=COLOR):
    """Write a single-image .ico wrapping an uncompressed 32bpp BMP."""
    bpp = 32
    bgra_pixel = bytes((color[2], color[1], color[0], 255))
    pixel_data = bgra_pixel * size * size
    and_mask_row_bytes = ((size + 31) // 32) * 4
    and_mask = bytes(and_mask_row_bytes * size)  # all zero -> fully opaque

    dib_header = struct.pack(
        "<IiiHHIIiiII",
        40,                              # biSize
        size,                            # biWidth
        size * 2,                        # biHeight (doubled: XOR + AND mask)
        1,                                # biPlanes
        bpp,                              # biBitCount
        0,                                # biCompression (BI_RGB)
        len(pixel_data) + len(and_mask),  # biSizeImage
        0, 0,                             # biX/YPelsPerMeter
        0, 0,                             # biClrUsed / biClrImportant
    )
    image_data = dib_header + pixel_data + and_mask

    ico_header = struct.pack("<HHH", 0, 1, 1)  # reserved, type=icon, count=1
    entry = struct.pack(
        "<BBBBHHII",
        size if size < 256 else 0,
        size if size < 256 else 0,
        0, 0,           # color count, reserved
        1, bpp,         # planes, bit count
        len(image_data),
        6 + 16,         # offset: ICONDIR (6) + one ICONDIRENTRY (16)
    )
    with open(path, "wb") as f:
        f.write(ico_header + entry + image_data)


def main():
    if len(sys.argv) != 2:
        print("usage: gen_favicons.py <target-dir>", file=sys.stderr)
        sys.exit(1)

    target = sys.argv[1]
    make_png(os.path.join(target, "favicon-16x16.png"), 16)
    make_png(os.path.join(target, "favicon-32x32.png"), 32)
    make_png(os.path.join(target, "apple-touch-icon.png"), 180)
    make_ico(os.path.join(target, "favicon.ico"), 32)
    print("placeholder favicons written (solid color) -- replace with real branding before launch")


if __name__ == "__main__":
    main()

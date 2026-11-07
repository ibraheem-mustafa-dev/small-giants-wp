#!/usr/bin/env python3
"""Write overlap-free static woff2 instances of a variable font, for text drawn with -webkit-text-stroke.

Variable fonts such as Montserrat build glyphs from overlapping contours. A filled glyph looks the
same, but a stroked (outlined) glyph also draws the stroke along every inner contour edge. A static
instance with overlaps merged (fontTools instancer OverlapMode.REMOVE, skia-pathops) strokes cleanly.

Usage:
  python make-outline-safe-fonts.py <variable-font.woff2> <weight> [<weight> ...]
  e.g. python make-outline-safe-fonts.py theme/sgs-theme/assets/fonts/montserrat/montserrat-variable-latin.woff2 800

Writes <name>-wght<weight>-outline.woff2 beside the input (montserrat-variable-latin.woff2 becomes
montserrat-wght800-outline-latin.woff2). Requires fontTools, brotli and skia-pathops.

Use it by declaring the file as an extra fontFace of the SAME family at that exact weight (fontWeight "800"),
for example in a client's theme-snapshot.json settings.typography.fontFamilies[].fontFace. A browser prefers the
exact-weight static face over a variable face whose range covers it, so every other weight keeps using the
variable file and fills look identical. Run compute-font-fallback-metrics.py afterwards.
"""
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.varLib.instancer import OverlapMode


def outline_name(src: Path, weight: int) -> Path:
    stem = src.stem.replace("-variable", "")
    m = re.match(r"^(.*?)(-latin.*)?$", stem)
    base, tail = m.group(1), m.group(2) or ""
    return src.with_name(f"{base}-wght{weight}-outline{tail}.woff2")


def make(src: Path, weight: int) -> Path:
    font = TTFont(src)
    if "fvar" not in font:
        raise SystemExit(f"{src} is not a variable font")
    static = instancer.instantiateVariableFont(font, {"wght": weight}, overlap=OverlapMode.REMOVE)
    static.flavor = "woff2"
    out = outline_name(src, weight)
    static.save(out)
    return out


def main(argv: list) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 2
    src = Path(argv[1])
    for w in argv[2:]:
        print(make(src, int(w)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

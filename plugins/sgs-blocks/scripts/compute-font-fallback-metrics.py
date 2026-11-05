#!/usr/bin/env python3
"""Compute size-matched fallback-face metrics for every woff2 under the theme's assets/fonts/.

For each web font file the script reads unitsPerEm, ascender, descender, lineGap (hhea) and the
average advance width of a lowercase-weighted Latin sample from the file itself, and compares them
with the metrics of the local font a fallback face would stand in for (Arial for sans, Times New
Roman for serif). The result is written to theme/sgs-theme/assets/fonts/fallback-metrics.json,
which `font_fallback_css()` in the theme turns into `@font-face` rules using `src: local(...)`,
`size-adjust`, `ascent-override`, `descent-override` and `line-gap-override`.

Run after adding or replacing a font file:  python compute-font-fallback-metrics.py [--check]
`--check` exits 1 when the committed JSON differs from what the files produce.
"""
import json
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[3]
FONTS = ROOT / "theme" / "sgs-theme" / "assets" / "fonts"
OUT = FONTS / "fallback-metrics.json"

# Letter frequencies of English text (per cent), plus the space, used to weight advance widths.
FREQ = {
    " ": 18.0, "e": 10.2, "t": 7.5, "a": 6.5, "o": 6.2, "i": 5.7, "n": 5.7, "s": 5.3, "h": 5.0,
    "r": 4.9, "d": 3.5, "l": 3.3, "c": 2.3, "u": 2.3, "m": 2.0, "w": 1.9, "f": 1.8, "g": 1.7,
    "y": 1.6, "p": 1.6, "b": 1.2, "v": 0.8, "k": 0.6, "x": 0.12, "j": 0.1, "q": 0.1, "z": 0.06,
}

# Local stand-ins, keyed by the generic family a stack ends with. First existing file wins.
BASES = {
    "sans-serif": ("Arial", ["C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf"]),
    "serif": ("Times New Roman", ["C:/Windows/Fonts/times.ttf", "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf", "/System/Library/Fonts/Supplemental/Times New Roman.ttf"]),
}


def metrics(path: str) -> dict:
    font = TTFont(path)
    upm = font["head"].unitsPerEm
    hhea = font["hhea"]
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    total = weighted = 0.0
    for ch, weight in FREQ.items():
        glyph = cmap.get(ord(ch))
        if glyph is None:
            continue
        weighted += hmtx[glyph][0] * weight
        total += weight
    return {
        "unitsPerEm": upm,
        "ascender": hhea.ascent,
        "descender": hhea.descent,
        "lineGap": hhea.lineGap,
        "avgWidth": round(weighted / total / upm, 5),
    }


def build() -> dict:
    bases = {}
    for generic, (label, candidates) in BASES.items():
        path = next((c for c in candidates if Path(c).exists()), None)
        if path is None:
            sys.exit(f"No local {label} (or metric-compatible) font found for the {generic} base.")
        # Liberation fonts are metric-compatible with Arial / Times New Roman.
        bases[generic] = {"local": label, **metrics(path)}
    files = {}
    for woff in sorted(FONTS.rglob("*.woff2")):
        files[woff.relative_to(FONTS).as_posix()] = metrics(str(woff))
    return {"bases": bases, "fonts": files}


if __name__ == "__main__":
    data = build()
    text = json.dumps(data, indent=1) + "\n"
    if "--check" in sys.argv:
        sys.exit(0 if OUT.exists() and OUT.read_text() == text else 1)
    OUT.write_text(text)
    print(f"wrote {OUT} ({len(data['fonts'])} fonts)")

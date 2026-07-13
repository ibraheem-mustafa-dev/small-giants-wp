"""colour.py — colour parsing + CIEDE2000 dedup for the Spec 33 extractor.

Reuses the same underlying maths as the sibling ``scripts/value-matcher/match.py`` (colormath
sRGB→Lab + ``delta_e_cie2000``) rather than hand-rolling ΔE. Alpha is kept as a SEPARATE axis —
``rgba(x,1)`` and ``rgba(x,0.1)`` never dedup (Spec 33 FR-33-2).

Deterministic by construction: no dict-ordering dependence, canonical lowercase hex, stable sort.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

import numpy as np
from colormath.color_objects import sRGBColor, LabColor
from colormath.color_conversions import convert_color
from colormath.color_diff import delta_e_cie2000

# colormath calls the numpy.asscalar removed in numpy>=1.24 (same shim as match.py).
if not hasattr(np, "asscalar"):  # pragma: no cover - environment shim
    np.asscalar = lambda a: a.item()  # type: ignore[attr-defined]

DEDUP_DELTA_E = 1.0  # Spec 33 FR-33-2: dedup at ΔE≤1.

_HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
_RGB_RE = re.compile(
    r"^rgba?\(\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)\s*(?:[,/]\s*([0-9.]+%?)\s*)?\)$",
    re.I,
)

# A minimal CSS named-colour set covering what real drafts use (extend as the corpus grows).
_NAMED = {
    "white": "#ffffff", "black": "#000000", "red": "#ff0000", "green": "#008000",
    "blue": "#0000ff", "transparent": None, "currentcolor": None, "inherit": None,
    "grey": "#808080", "gray": "#808080", "silver": "#c0c0c0", "navy": "#000080",
    "gold": "#ffd700", "orange": "#ffa500",
}


@dataclass(frozen=True)
class Colour:
    """A parsed colour: canonical lowercase 6-digit hex + alpha (0..1)."""
    hex: str          # '#rrggbb' lowercase
    alpha: float      # 0.0 .. 1.0

    @property
    def key(self) -> tuple:
        return (self.hex, round(self.alpha, 4))


def _clamp8(x: float) -> int:
    return max(0, min(255, int(round(x))))


def _chan(tok: str) -> int:
    tok = tok.strip()
    if tok.endswith("%"):
        return _clamp8(float(tok[:-1]) / 100.0 * 255.0)
    return _clamp8(float(tok))


def parse_colour(value: str):
    """Parse a CSS colour string → :class:`Colour`, or ``None`` if not a concrete colour.

    Handles #hex (3/4/6/8), rgb()/rgba(), and a small named set. ``var()``/keywords that carry no
    concrete colour return ``None`` (the caller resolves ``var()`` chains before calling this).
    """
    if not value:
        return None
    v = value.strip().lower()
    m = _HEX_RE.match(v)
    if m:
        h = m.group(1)
        if len(h) == 3:
            r, g, b = (int(c * 2, 16) for c in h)
            a = 1.0
        elif len(h) == 4:
            r, g, b, aa = (int(c * 2, 16) for c in h)
            a = round(aa / 255.0, 4)
        elif len(h) == 6:
            r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
            a = 1.0
        else:  # 8
            r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
            a = round(int(h[6:8], 16) / 255.0, 4)
        return Colour(f"#{r:02x}{g:02x}{b:02x}", a)
    m = _RGB_RE.match(v)
    if m:
        r, g, b = _chan(m.group(1)), _chan(m.group(2)), _chan(m.group(3))
        a = 1.0
        if m.group(4) is not None:
            at = m.group(4).strip()
            a = round(float(at[:-1]) / 100.0 if at.endswith("%") else float(at), 4)
        return Colour(f"#{r:02x}{g:02x}{b:02x}", a)
    if v in _NAMED:
        hx = _NAMED[v]
        return Colour(hx, 1.0) if hx else None
    return None


def _lab(hex6: str) -> LabColor:
    return convert_color(sRGBColor.new_from_rgb_hex(hex6), LabColor)


def delta_e(hex_a: str, hex_b: str) -> float:
    """CIEDE2000 distance between two 6-digit hex colours (ignores alpha)."""
    return float(delta_e_cie2000(_lab(hex_a), _lab(hex_b)))


def dedupe(colours: list) -> list:
    """Dedup a list of ``(name, Colour, first_offset)`` at ΔE≤1, ALPHA as a separate axis.

    Returns a list of clusters, each ``{canonical: Colour, names: [name…], aliases: [(name, Colour)…],
    first_offset: int}``. Deterministic: input is sorted by ``first_offset`` then canonical hex, and
    the cluster canonical is the lowest-first-offset member (Spec 33 FR-33-8).
    """
    items = sorted(colours, key=lambda t: (t[2], t[1].hex, t[0]))
    clusters: list = []
    for name, col, off in items:
        placed = False
        for c in clusters:
            can: Colour = c["canonical"]
            # same alpha axis + within ΔE
            if abs(can.alpha - col.alpha) < 1e-6 and delta_e(can.hex, col.hex) <= DEDUP_DELTA_E:
                c["names"].append(name)
                if col.hex != can.hex:
                    c["aliases"].append((name, col))
                placed = True
                break
        if not placed:
            clusters.append({"canonical": col, "names": [name], "aliases": [], "first_offset": off})
    return clusters

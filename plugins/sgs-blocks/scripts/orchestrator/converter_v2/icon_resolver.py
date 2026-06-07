"""
icon_resolver.py — SGS Trust-Bar Icon Identity Resolver
=========================================================

Takes a badge's icon DOM node (BeautifulSoup element containing an <svg>)
and resolves it to either:
  - A confident icon slug (matches the deployed lucide-icons.json library), or
  - A raw SVG fallback (sanitised outer string) when no confident match found.

Returns a dict:
  {
      "slug":       str | None,   # present on confident match
      "confidence": str,          # "high" | "medium" | "none"
      "raw_svg":    str | None,   # present on fallback (confidence="none")
  }

Confidence levels:
  high   — exact path-data fingerprint match in the reverse index
  medium — structural heuristic match (shape, element types, fill/stroke hints)
  none   — no match; raw_svg is set to the outer <svg> string for verbatim render

Design constraints:
  R-22-1  DB-first / no hardcoded dicts where a data source exists: the reverse
          index is built lazily from lucide-icons.json (1 917 icons) at first call.
          The structural-hint table only covers patterns that cannot be expressed
          as path-data (polygon, rect, mixed-element shapes from old lucide versions).
  Rule 2  No silent wrong icon — on confidence="none" the caller must set
          item["iconSvg"] instead of item["icon"] so render.php emits the raw SVG.
  Rule 1  Universal — handles any icon library or emoji glyph passed as an <svg>
          node; not limited to Lucide.

Usage (from convert.py trust-bar handler):

    from .icon_resolver import resolve_icon

    icon_node = badge_node.find("svg")  # may be None
    result    = resolve_icon(icon_node)

    if result["confidence"] in ("high", "medium"):
        item["icon"] = result["slug"]
    else:
        item["icon"] = ""        # leave slug empty — block editor shows empty slot
        if result["raw_svg"]:
            item["iconSvg"] = result["raw_svg"]

Author: SGS Framework / Claude Code
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from bs4 import Tag

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_HERE = os.path.dirname(__file__)
# Traverse: orchestrator/converter_v2 -> orchestrator -> scripts -> sgs-blocks -> assets/icons
_LUCIDE_JSON = os.path.normpath(
    os.path.join(_HERE, "..", "..", "..", "assets", "icons", "lucide-icons.json")
)
_WP_JSON = os.path.normpath(
    os.path.join(_HERE, "..", "..", "..", "assets", "icons", "wp-icons.json")
)

# ---------------------------------------------------------------------------
# Lazy reverse index (built once per process)
# ---------------------------------------------------------------------------

# _PATH_INDEX maps frozenset(normalised path strings) -> icon slug
_PATH_INDEX: dict[frozenset, str] | None = None


def _normalise_d(d: str) -> str:
    """Collapse whitespace and lower-case an SVG path `d` value for comparison."""
    return re.sub(r"\s+", " ", d.lower().strip())


def _extract_paths_from_svg_str(svg_str: str) -> list[str]:
    """Return all `d="…"` path data strings from an SVG markup string."""
    return re.findall(r'\s+d="([^"]+)"', svg_str)


def _build_index() -> dict[frozenset, str]:
    """
    Build (lazily, once) a reverse index from path-data fingerprint to icon name.

    Reads lucide-icons.json (and wp-icons.json if present). Each icon's SVG
    markup is parsed for `d="…"` attributes. The normalised frozenset of those
    strings becomes the key. On collision the first-encountered name wins
    (alphabetical, since the JSON keys are sorted in the generated file).
    """
    index: dict[frozenset, str] = {}

    for json_path, is_lucide in ((_LUCIDE_JSON, True), (_WP_JSON, False)):
        if not os.path.exists(json_path):
            continue
        with open(json_path, "r", encoding="utf-8") as fh:
            icons: dict[str, str] = json.load(fh)
        for name, svg_str in icons.items():
            paths = _extract_paths_from_svg_str(svg_str)
            if not paths:
                continue
            key = frozenset(_normalise_d(p) for p in paths)
            if key not in index:
                index[key] = name

    return index


def _get_index() -> dict[frozenset, str]:
    global _PATH_INDEX
    if _PATH_INDEX is None:
        _PATH_INDEX = _build_index()
    return _PATH_INDEX


# ---------------------------------------------------------------------------
# Structural heuristics
# ---------------------------------------------------------------------------
# These cover icon shapes that cannot be matched via path-data because:
#   (a) they use non-path SVG elements (polygon, rect, circle combinations), or
#   (b) they originate from an older Lucide version whose path data differs.
#
# Each rule is a tuple of:
#   (predicate_fn, slug)
# where predicate_fn receives the raw SVG *string* and returns True/False.
#
# Ordered most-specific first so an early match stops evaluation.

def _has_polygon_star(svg_str: str) -> bool:
    """
    Classic 5-point star expressed as a filled polygon with stroke=none.
    Pattern: <polygon points="12 2 15.09 8.26 22 9.27 …" /> with fill active,
    stroke absent or 'none'. Used in older Lucide as 'star'.
    """
    if "<polygon" not in svg_str:
        return False
    # stroke should be none or absent (fill-only star)
    stroke_none = 'stroke="none"' in svg_str or "stroke='none'" in svg_str
    stroke_absent = "stroke=" not in svg_str
    fill_active = "fill=" in svg_str and "fill=\"none\"" not in svg_str and "fill='none'" not in svg_str
    return fill_active and (stroke_none or stroke_absent)


def _is_vehicle_truck(svg_str: str) -> bool:
    """
    Old Lucide 'truck' fingerprint: a <rect> body + 1 small path for the cab
    section + exactly 2 <circle> elements (wheels). The rect is roughly the
    trailer (x≈1, y≈3, width≈15, height≈13 on a 24×24 grid).
    """
    has_rect = bool(re.search(r"<rect\b", svg_str))
    circle_count = len(re.findall(r"<circle\b", svg_str))
    path_count = len(re.findall(r"<path\b", svg_str))
    # Exactly 1 cab path + 2 wheel circles + 1 rect trailer body
    return has_rect and circle_count == 2 and path_count == 1


def _is_old_home(svg_str: str) -> bool:
    """
    Old Lucide 'home' fingerprint (pre-redesign): exactly 2 path elements,
    one of which begins with a diagonal roof stroke 'm3 12' or 'M3 12'
    (the classic peaked roof glyph, distinct from the current house/home redesign).
    """
    paths = _extract_paths_from_svg_str(svg_str)
    if len(paths) != 2:
        return False
    for p in paths:
        norm = _normalise_d(p)
        # Classic peaked-roof path: starts with 'm3 12 9-9 9 9'
        if norm.startswith("m3 12"):
            return True
    return False


# Ordered heuristics: (predicate, slug)
_STRUCTURAL_HINTS: list[tuple] = [
    (_has_polygon_star, "star"),
    (_is_vehicle_truck, "truck"),
    (_is_old_home, "home"),
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def resolve_icon(
    icon_node: "Tag | None",
    *,
    min_path_count: int = 1,
) -> dict:
    """
    Resolve a BeautifulSoup <svg> tag (or its parent span) to an icon identity.

    Parameters
    ----------
    icon_node:
        A BeautifulSoup element. May be the <svg> itself, a <span> wrapping
        the SVG, or None (when no icon was found in the badge).
    min_path_count:
        Minimum number of path-d values required to attempt path matching.
        Default 1 — even a single-path icon can be matched.

    Returns
    -------
    dict with keys:
        slug        str | None
        confidence  "high" | "medium" | "none"
        raw_svg     str | None   (set only when confidence == "none")
    """
    _none = {"slug": None, "confidence": "none", "raw_svg": None}

    if icon_node is None:
        return _none

    # Find the <svg> element regardless of whether we were passed the span or svg.
    if icon_node.name == "svg":
        svg_el = icon_node
    else:
        svg_el = icon_node.find("svg")

    if svg_el is None:
        return _none

    svg_str: str = str(svg_el)

    # ------------------------------------------------------------------
    # Stage 1: exact path-data fingerprint match (high confidence)
    # ------------------------------------------------------------------
    paths = _extract_paths_from_svg_str(svg_str)
    if len(paths) >= min_path_count:
        key = frozenset(_normalise_d(p) for p in paths)
        idx = _get_index()
        if key in idx:
            return {"slug": idx[key], "confidence": "high", "raw_svg": None}

    # ------------------------------------------------------------------
    # Stage 2: structural heuristics (medium confidence)
    # ------------------------------------------------------------------
    for predicate, slug in _STRUCTURAL_HINTS:
        if predicate(svg_str):
            return {"slug": slug, "confidence": "medium", "raw_svg": None}

    # ------------------------------------------------------------------
    # Stage 3: fallback — emit raw SVG for verbatim render
    # ------------------------------------------------------------------
    # Strip the outer <svg> wrapper's class, width, height, style attrs
    # (the block's CSS handles sizing); keep viewBox, fill, stroke, paths.
    raw = _strip_svg_wrapper_attrs(svg_str)
    return {"slug": None, "confidence": "none", "raw_svg": raw}


# ---------------------------------------------------------------------------
# SVG strip helper
# ---------------------------------------------------------------------------

# Attributes to strip from the outer <svg> tag before storing raw markup.
# The block renders these via CSS; keeping them would conflict.
_STRIP_ATTRS = frozenset({"class", "width", "height", "style", "xmlns", "xmlns:xlink"})


def _strip_svg_wrapper_attrs(svg_str: str) -> str:
    """
    Remove the wrapper attributes we don't want stored (class/width/height/style
    on the outer <svg> tag only). Keeps viewBox, fill, stroke, and all child
    elements intact. Falls back to the original string on parse error.
    """
    try:
        # Use a simple regex approach — avoids requiring lxml in the converter env.
        def _remove_attr(m: "re.Match") -> str:
            full = m.group(0)
            # Strip each unwanted attr="…" or attr='…' occurrence
            for attr in _STRIP_ATTRS:
                full = re.sub(
                    r'\s+' + re.escape(attr) + r'\s*=\s*(?:"[^"]*"|\'[^\']*\')',
                    "",
                    full,
                )
            return full

        # Replace only the opening <svg …> tag (not child elements)
        cleaned = re.sub(r"<svg\b[^>]*>", _remove_attr, svg_str, count=1)
        return cleaned.strip()
    except Exception:
        return svg_str.strip()


# ---------------------------------------------------------------------------
# CLI smoke-test (python icon_resolver.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print("BeautifulSoup4 not available — run: pip install beautifulsoup4")
        sys.exit(1)

    # The four actual draft badge SVGs from sites/mamas-munches/mockups/homepage/index.html
    draft_badges = [
        # Badge 1: home-like (old Lucide home, 2 paths, peaked-roof style)
        (
            '<svg viewBox="0 0 24 24"><path d="m3 12 9-9 9 9"/>'
            '<path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/></svg>',
            "Handmade in Birmingham",
        ),
        # Badge 2: check (exact Lucide match)
        (
            '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
            "Registered Food Business",
        ),
        # Badge 3: truck (old Lucide truck — rect + path + 2 circles)
        (
            '<svg viewBox="0 0 24 24">'
            '<rect x="1" y="3" width="15" height="13"/>'
            '<path d="m16 8 5 2v5h-5z"/>'
            '<circle cx="5.5" cy="18.5" r="2.5"/>'
            '<circle cx="18.5" cy="18.5" r="2.5"/>'
            "</svg>",
            "Free UK Delivery Over £35",
        ),
        # Badge 4: star (polygon, fill=currentColor, stroke=none)
        (
            '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" '
            'style="fill: var(--primary-dark);">'
            '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 '
            "12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/>"
            "</svg>",
            "Loved by Breastfeeding Mums",
        ),
    ]

    print("=== Icon Resolver — Smoke Test (draft badges) ===\n")
    for i, (svg_markup, label) in enumerate(draft_badges, 1):
        soup = BeautifulSoup(svg_markup, "html.parser")
        svg_node = soup.find("svg")
        result = resolve_icon(svg_node)
        slug = result["slug"] or "(none)"
        conf = result["confidence"]
        raw = "(set)" if result["raw_svg"] else "(not set)"
        print(
            f"Badge {i}: '{label}'\n"
            f"  slug={slug!r}  confidence={conf}  raw_svg={raw}"
        )
        if result["confidence"] == "none":
            print(f"  raw_svg preview: {result['raw_svg'][:80]}...")
        print()

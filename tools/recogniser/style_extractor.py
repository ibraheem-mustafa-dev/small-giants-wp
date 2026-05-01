"""Module 4 — Style Extractor.

Reads the computed CSS for a mockup and maps it to SGS palette,
spacing, and typography tokens. Colours nearest within ΔE<5 are mapped
to the active style variation's palette; misses are flagged for the gap
detector.

Spec: .claude/plans/recogniser-v1.md  Module 4.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[2]
THEME_STYLES_DIR = REPO_ROOT / "theme" / "sgs-theme" / "styles"
THEME_JSON = REPO_ROOT / "theme" / "sgs-theme" / "theme.json"

# ΔE tolerance — anything below this counts as a palette match
DELTA_E_TOLERANCE = 5.0
# Spacing tolerance in pixels
SPACING_TOLERANCE_PX = 2.0
SPACING_FLUID_TOLERANCE_PCT = 0.05
# Font-size tolerance in pixels
FONT_SIZE_TOLERANCE_PX = 2.0


# ---------------------------------------------------------------------------
# Colour conversion (sRGB -> Lab)
# ---------------------------------------------------------------------------

def hex_to_rgb(h: str) -> tuple[int, int, int] | None:
    """Convert ``#rgb`` / ``#rrggbb`` to an (r, g, b) tuple. Returns None on bad input."""
    if not h:
        return None
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6 or not re.fullmatch(r"[0-9a-fA-F]{6}", h):
        return None
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb_to_xyz(r: int, g: int, b: int) -> tuple[float, float, float]:
    """sRGB (0-255) -> XYZ (D65)."""
    rl = _srgb_to_linear(r / 255.0)
    gl = _srgb_to_linear(g / 255.0)
    bl = _srgb_to_linear(b / 255.0)
    x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375
    y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
    z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041
    return x, y, z


def xyz_to_lab(x: float, y: float, z: float) -> tuple[float, float, float]:
    """XYZ -> CIE Lab (D65 reference white)."""
    xr, yr, zr = 0.95047, 1.0, 1.08883

    def f(t: float) -> float:
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t + 16.0 / 116.0)

    fx, fy, fz = f(x / xr), f(y / yr), f(z / zr)
    L = 116.0 * fy - 16.0
    a = 500.0 * (fx - fy)
    b = 200.0 * (fy - fz)
    return L, a, b


def hex_to_lab(h: str) -> tuple[float, float, float] | None:
    rgb = hex_to_rgb(h)
    if rgb is None:
        return None
    return xyz_to_lab(*rgb_to_xyz(*rgb))


def delta_e(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    """CIE76 ΔE — Euclidean distance in Lab space."""
    return ((lab1[0] - lab2[0]) ** 2 + (lab1[1] - lab2[1]) ** 2 + (lab1[2] - lab2[2]) ** 2) ** 0.5


# ---------------------------------------------------------------------------
# Variation loading
# ---------------------------------------------------------------------------

def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def load_variation(slug: str) -> dict[str, Any]:
    """Load the style variation JSON merged with theme.json fallbacks for spacing/typography."""
    base = _load_json(THEME_JSON) if THEME_JSON.exists() else {}
    var_path = THEME_STYLES_DIR / f"{slug}.json"
    if not var_path.exists():
        raise FileNotFoundError(f"Style variation not found: {var_path}")
    var = _load_json(var_path)

    # Palette: variation wins
    palette = (
        var.get("settings", {}).get("color", {}).get("palette")
        or base.get("settings", {}).get("color", {}).get("palette")
        or []
    )
    # Spacing: variation > base
    spacing = (
        var.get("settings", {}).get("spacing", {}).get("spacingSizes")
        or base.get("settings", {}).get("spacing", {}).get("spacingSizes")
        or []
    )
    # Font sizes: variation > base
    font_sizes = (
        var.get("settings", {}).get("typography", {}).get("fontSizes")
        or base.get("settings", {}).get("typography", {}).get("fontSizes")
        or []
    )
    # Font families: variation > base
    font_families = (
        var.get("settings", {}).get("typography", {}).get("fontFamilies")
        or base.get("settings", {}).get("typography", {}).get("fontFamilies")
        or []
    )
    return {
        "palette": palette,
        "spacing": spacing,
        "font_sizes": font_sizes,
        "font_families": font_families,
    }


# ---------------------------------------------------------------------------
# CSS parsing
# ---------------------------------------------------------------------------

_STYLE_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.DOTALL | re.IGNORECASE)
_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
# Match "selector { body }" — non-greedy body
_RULE_RE = re.compile(r"([^{}]+)\{([^{}]*)\}", re.DOTALL)
_DECL_RE = re.compile(r"([a-zA-Z\-]+)\s*:\s*([^;]+?)\s*(?:;|$)")
_HEX_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b")
_RGB_RE = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)")
_VAR_REF_RE = re.compile(r"var\(\s*(--[a-zA-Z0-9\-_]+)\s*\)")
_LENGTH_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s*(px|rem|em|%|vw|vh)?")


def extract_style_blocks(html: str) -> str:
    """Return concatenated CSS text from all <style> tags, with comments stripped."""
    blocks = _STYLE_RE.findall(html)
    css = "\n".join(blocks)
    css = _COMMENT_RE.sub("", css)
    return css


def parse_css_vars(css: str) -> dict[str, str]:
    """Pull :root custom properties so var(--x) references can be resolved."""
    vars_map: dict[str, str] = {}
    # Find :root { ... } blocks
    for m in re.finditer(r":root\s*\{([^{}]*)\}", css, re.DOTALL):
        body = m.group(1)
        for d in _DECL_RE.finditer(body):
            name, value = d.group(1).strip(), d.group(2).strip()
            if name.startswith("--"):
                vars_map[name] = value
    return vars_map


def resolve_value(value: str, css_vars: dict[str, str], depth: int = 0) -> str:
    """Resolve a CSS value's var() references against css_vars (depth-limited)."""
    if depth > 5:
        return value
    out = value
    for m in _VAR_REF_RE.finditer(value):
        name = m.group(1)
        if name in css_vars:
            replacement = resolve_value(css_vars[name], css_vars, depth + 1)
            out = out.replace(m.group(0), replacement)
    return out


def iter_rules(css: str):
    """Yield (selector, declarations_text) for each rule. Skips at-rule wrappers minimally."""
    # Strip @media/@supports wrappers but keep their inner rules. Simplest: drop the @rule
    # opening tokens and rely on the rule regex to grab nested selectors.
    css = re.sub(r"@(media|supports|container)[^{]*\{", "", css, flags=re.IGNORECASE)
    # Drop @keyframes blocks entirely (their bodies aren't useful tokens)
    css = re.sub(r"@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}", "", css, flags=re.IGNORECASE)
    # Drop @font-face / @import / @charset etc.
    css = re.sub(r"@(font-face|import|charset|namespace)[^;{}]*(?:;|\{[^{}]*\})", "", css, flags=re.IGNORECASE)
    for m in _RULE_RE.finditer(css):
        sel = m.group(1).strip()
        body = m.group(2).strip()
        if not sel or not body:
            continue
        # Skip leftover braces (e.g. closing of a media query)
        if sel.startswith("@"):
            continue
        yield sel, body


def parse_decls(body: str) -> list[tuple[str, str]]:
    return [(m.group(1).strip().lower(), m.group(2).strip()) for m in _DECL_RE.finditer(body)]


# ---------------------------------------------------------------------------
# Value extraction
# ---------------------------------------------------------------------------

COLOUR_PROPS = {"color", "background-color", "border-color", "fill", "stroke",
                "border-top-color", "border-right-color", "border-bottom-color",
                "border-left-color", "outline-color"}
COLOURISH_PROPS = COLOUR_PROPS | {"background", "border", "border-top", "border-right",
                                  "border-bottom", "border-left", "outline", "box-shadow"}
SPACING_PROPS = {"padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
                 "padding-block", "padding-inline", "padding-block-start", "padding-block-end",
                 "padding-inline-start", "padding-inline-end",
                 "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
                 "margin-block", "margin-inline",
                 "gap", "row-gap", "column-gap",
                 "top", "right", "bottom", "left"}
FONT_FAMILY_PROPS = {"font-family"}
FONT_SIZE_PROPS = {"font-size"}


def extract_colours_from_value(value: str) -> list[str]:
    """Return list of normalised hex colours found in a CSS value."""
    out: list[str] = []
    for m in _HEX_RE.finditer(value):
        h = m.group(0)
        # Drop alpha (#rrggbbaa)
        if len(h) == 9:
            h = h[:7]
        elif len(h) == 5:  # #rgba
            h = h[:4]
        rgb = hex_to_rgb(h)
        if rgb:
            out.append("#{:02x}{:02x}{:02x}".format(*rgb))
    for m in _RGB_RE.finditer(value):
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        out.append("#{:02x}{:02x}{:02x}".format(r, g, b))
    return out


def to_pixels(value: str, base_px: float = 16.0) -> float | None:
    """Convert a single length token to px. Returns None for unitless or unsupported."""
    m = _LENGTH_RE.match(value.strip())
    if not m:
        return None
    num = float(m.group(1))
    unit = (m.group(2) or "").lower()
    if unit == "px" or unit == "":
        return num if unit == "px" else None  # unitless: skip (could be line-height)
    if unit in ("rem", "em"):
        return num * base_px
    return None  # %, vw, vh skipped for now


def extract_spacings_from_value(prop: str, value: str) -> list[float]:
    """Return list of pixel values found in a spacing declaration (handles shorthands)."""
    # value can have multiple tokens separated by spaces (shorthand)
    tokens = re.split(r"\s+", value.strip())
    px_values: list[float] = []
    for t in tokens:
        # Skip keywords like auto, inherit, calc(...)
        if t.startswith("calc(") or t in ("auto", "inherit", "initial", "unset", "0"):
            if t == "0":
                px_values.append(0.0)
            continue
        px = to_pixels(t)
        if px is not None and px > 0:
            px_values.append(px)
    return px_values


# ---------------------------------------------------------------------------
# Token matching
# ---------------------------------------------------------------------------

def match_colour(hex_value: str, palette: list[dict]) -> tuple[dict | None, float, dict | None]:
    """Return (matched_token_or_none, delta_e, nearest_token).

    matched is non-None only when delta_e < tolerance. nearest is always the closest.
    """
    src_lab = hex_to_lab(hex_value)
    if src_lab is None:
        return None, float("inf"), None
    nearest: dict | None = None
    nearest_de = float("inf")
    for token in palette:
        tlab = hex_to_lab(token.get("color", ""))
        if tlab is None:
            continue
        de = delta_e(src_lab, tlab)
        if de < nearest_de:
            nearest_de = de
            nearest = token
    if nearest and nearest_de < DELTA_E_TOLERANCE:
        return nearest, nearest_de, nearest
    return None, nearest_de, nearest


def _spacing_token_to_px(token: dict) -> float | None:
    size = token.get("size")
    if not size:
        return None
    return to_pixels(str(size))


def match_spacing(px_value: float, spacing_tokens: list[dict]) -> tuple[dict | None, float]:
    """Return (token_or_none, delta_px). Tolerance is the larger of ±2px and ±5% for fluid sizes."""
    best: dict | None = None
    best_delta = float("inf")
    for token in spacing_tokens:
        token_px = _spacing_token_to_px(token)
        if token_px is None:
            continue
        delta = abs(px_value - token_px)
        if delta < best_delta:
            best_delta = delta
            best = token
    if best is None:
        return None, best_delta
    tol = SPACING_TOLERANCE_PX
    if best.get("fluid"):
        tol = max(tol, _spacing_token_to_px(best) * SPACING_FLUID_TOLERANCE_PCT or tol)
    if best_delta <= tol:
        return best, best_delta
    return None, best_delta


def match_font_size(px_value: float, font_sizes: list[dict]) -> dict | None:
    best: dict | None = None
    best_delta = float("inf")
    for token in font_sizes:
        size = token.get("size")
        if not size:
            continue
        token_px = to_pixels(str(size))
        if token_px is None:
            continue
        delta = abs(px_value - token_px)
        if delta < best_delta:
            best_delta = delta
            best = token
    if best is not None and best_delta <= FONT_SIZE_TOLERANCE_PX:
        return best
    return None


def match_font_family(css_value: str, font_families: list[dict]) -> dict | None:
    """Match by primary font in the stack (first family, stripped of quotes)."""
    css_lower = css_value.lower()
    primary = re.split(r",", css_value, maxsplit=1)[0].strip().strip("'\"").lower()
    best: dict | None = None
    for token in font_families:
        family = token.get("fontFamily", "")
        token_primary = re.split(r",", family, maxsplit=1)[0].strip().strip("'\"").lower()
        if token_primary and token_primary in css_lower:
            return token
        if primary and primary == token_primary:
            return token
        # Loose: if any family in the token's stack appears in the css value
        for part in family.split(","):
            p = part.strip().strip("'\"").lower()
            if p and p == primary:
                return token
            if p and p in css_lower:
                best = token
    return best


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_styles(html: str, variation_slug: str = "mamas-munches") -> dict:
    """Extract style tokens from mockup HTML, mapped to variation palette.

    Returns a dict with colour_tokens, spacing_tokens, typography, hover, and misses.
    """
    variation = load_variation(variation_slug)
    palette = variation["palette"]
    spacing_tokens = variation["spacing"]
    font_size_tokens = variation["font_sizes"]
    font_family_tokens = variation["font_families"]

    css = extract_style_blocks(html)
    css_vars = parse_css_vars(css)

    # Aggregators
    # hex -> { delta_e, token, nearest, css_uses:set }
    colour_acc: dict[str, dict[str, Any]] = {}
    miss_acc: dict[str, dict[str, Any]] = {}
    # px -> { fluid, token, css_uses:set }
    spacing_acc: dict[float, dict[str, Any]] = {}
    spacing_miss_acc: dict[float, dict[str, Any]] = {}
    # font-family
    family_acc: dict[str, dict[str, Any]] = {}
    # font-size px -> { token, uses:set }
    font_size_acc: dict[float, dict[str, Any]] = {}
    # hover rules
    hover: list[dict[str, Any]] = []

    for selector, body in iter_rules(css):
        decls = parse_decls(body)
        is_hover = ":hover" in selector
        if is_hover:
            hover_rules: dict[str, str] = {}

        for prop, raw_value in decls:
            if not prop or not raw_value:
                continue
            value = resolve_value(raw_value, css_vars)

            # Capture whole-rule for hover
            if is_hover:
                hover_rules[prop] = value

            # ── Colours ──────────────────────────────
            if prop in COLOURISH_PROPS:
                hexes = extract_colours_from_value(value)
                for hx in hexes:
                    matched, de, nearest = match_colour(hx, palette)
                    if matched:
                        entry = colour_acc.setdefault(hx, {
                            "hex": hx,
                            "token": matched.get("slug"),
                            "delta_e": round(de, 2),
                            "css_uses": set(),
                        })
                        entry["css_uses"].add(prop)
                    else:
                        entry = miss_acc.setdefault(hx, {
                            "hex": hx,
                            "nearest": nearest.get("slug") if nearest else None,
                            "delta_e": round(de, 2),
                            "reason": "too far",
                            "css_uses": set(),
                        })
                        entry["css_uses"].add(prop)

            # ── Spacing ──────────────────────────────
            if prop in SPACING_PROPS:
                pxs = extract_spacings_from_value(prop, value)
                for px in pxs:
                    if px <= 0:
                        continue
                    px_round = round(px, 2)
                    token, _delta = match_spacing(px_round, spacing_tokens)
                    if token:
                        entry = spacing_acc.setdefault(px_round, {
                            "px": px_round,
                            "rem": round(px_round / 16.0, 4),
                            "token": token.get("slug"),
                            "fluid": bool(token.get("fluid")),
                            "css_uses": set(),
                        })
                        entry["css_uses"].add(prop)
                    else:
                        entry = spacing_miss_acc.setdefault(px_round, {
                            "px": px_round,
                            "rem": round(px_round / 16.0, 4),
                            "css_uses": set(),
                        })
                        entry["css_uses"].add(prop)

            # ── Typography ──────────────────────────
            if prop in FONT_FAMILY_PROPS:
                token = match_font_family(value, font_family_tokens)
                key = value.strip()
                entry = family_acc.setdefault(key, {
                    "css_value": key,
                    "token": token.get("slug") if token else None,
                    "uses": set(),
                })
                # Use the first selector token as a "use"
                entry["uses"].add(_use_label(selector))

            if prop in FONT_SIZE_PROPS:
                px = to_pixels(value)
                if px is not None and px > 0:
                    token = match_font_size(px, font_size_tokens)
                    entry = font_size_acc.setdefault(round(px, 2), {
                        "px": round(px, 2),
                        "rem": round(px / 16.0, 4),
                        "token": token.get("slug") if token else None,
                        "uses": set(),
                    })
                    entry["uses"].add(_use_label(selector))

        if is_hover and hover_rules:
            hover.append({"selector": selector.strip(), "rules": hover_rules})

    # Materialise sets into sorted lists for JSON
    colour_list = [
        {**v, "css_uses": sorted(v["css_uses"])} for v in colour_acc.values()
    ]
    misses = [
        {**v, "css_uses": sorted(v["css_uses"])} for v in miss_acc.values()
    ]
    spacing_list = [
        {**v, "css_uses": sorted(v["css_uses"])} for v in spacing_acc.values()
    ]
    spacing_misses = [
        {**v, "css_uses": sorted(v["css_uses"])} for v in spacing_miss_acc.values()
    ]
    family_list = [
        {**v, "uses": sorted(v["uses"])} for v in family_acc.values()
    ]
    font_size_list = [
        {**v, "uses": sorted(v["uses"])} for v in font_size_acc.values()
    ]

    # Sort outputs by descending usage count for readability
    colour_list.sort(key=lambda d: (-len(d["css_uses"]), d["hex"]))
    spacing_list.sort(key=lambda d: d["px"])
    font_size_list.sort(key=lambda d: d["px"])

    return {
        "variation": variation_slug,
        "colour_tokens": colour_list,
        "spacing_tokens": spacing_list,
        "spacing_misses": spacing_misses,
        "typography": {
            "font_families": family_list,
            "font_sizes": font_size_list,
        },
        "hover": hover,
        "misses": misses,
    }


def _use_label(selector: str) -> str:
    """Pick a short label for which selector used a property."""
    # Take the first comma-separated selector, trim
    first = selector.split(",")[0].strip()
    return first[:80]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _summarise(report: dict) -> str:
    matched = len(report["colour_tokens"])
    missed = len(report["misses"])
    total = matched + missed
    pct = (100.0 * matched / total) if total else 0.0
    lines = [
        f"Variation:         {report['variation']}",
        f"Colours matched:   {matched}/{total}  ({pct:.1f}%)  [tolerance dE<{DELTA_E_TOLERANCE}]",
        f"Spacing tokens:    {len(report['spacing_tokens'])} matched, {len(report['spacing_misses'])} unmatched",
        f"Font families:     {len(report['typography']['font_families'])}",
        f"Font sizes:        {len(report['typography']['font_sizes'])}",
        f"Hover rules:       {len(report['hover'])}",
        f"Acceptance gate:   {'PASS' if pct >= 80.0 else 'FAIL'} (>= 80%)",
    ]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Extract style tokens from a mockup HTML.")
    parser.add_argument("--html", required=True, help="Path to mockup HTML file.")
    parser.add_argument("--variation", default="mamas-munches", help="Style variation slug.")
    parser.add_argument("--output", required=True, help="Path to write JSON report.")
    args = parser.parse_args(argv)

    html_path = Path(args.html)
    if not html_path.exists():
        print(f"ERROR: HTML not found: {html_path}", file=sys.stderr)
        return 2
    html = html_path.read_text(encoding="utf-8")

    report = extract_styles(html, args.variation)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(_summarise(report))
    print(f"\nReport written to: {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

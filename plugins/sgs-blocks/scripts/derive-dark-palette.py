#!/usr/bin/env python3
"""
derive-dark-palette.py — automatic dark palette derivation (U-12 §D).

Design: .claude/reports/2026-09-26-u12-furniture-design.md §D.1-D.3.

Runs inside `push-theme-snapshot.py::prepare_deploy_snapshot` so every deploy path
(this script's own push AND `build-deploy.py`, which reuses `deploy_theme_json_bytes`)
carries the derived dark colours — there is no separate "ship the dark palette" step.

Configuration lives in the snapshot's top-level `_sgsDark` key (stripped before
deploy, like `_sgsExtractor`):

    "_sgsDark": {
        "enabled": true,
        "palette": { "primary": "#f4a3b5" },   // hand-set dark values, still checked
        "roles":   { "cookie-brown": "brand" } // role overrides, any slug
    }

Output: `settings.custom.dark.<slug>` for every palette slug. WordPress's own preset
machinery turns that into a `--wp--custom--dark--<slug>` custom property; the theme
side (functions.php::dark_mode_mapping_css) repoints `--wp--preset--color--<slug>` at
it while dark mode is active.

Roles (any slug, not a fixed list — `_sgsDark.roles` overrides the name-based guess):
    surface  slug*, *-bg, background*, base*, and footer-bg (endswith '-bg' covers it).
             Mapped onto a dark band: the base `surface` slug sits at OKLCh L 0.18;
             every OTHER surface slug sits at L 0.21-0.27 in its ORIGINAL lightness
             order (hue kept, chroma capped at 0.03 — a tinted cream becomes a tinted
             near-black, not a hueless grey).
    text     text*, *-text. A `*-text` slug whose prefix names another palette slug
             (`primary-text`, `accent-text`) is treated as TEXT-ON-THAT-FILL and paired
             against that fill's dark value, never a surface — same rule the design
             names explicitly for `text-inverse` (paired with `primary`, its brand
             fill), generalised to every "text painted on a fill" slug the palette
             actually has.
    border   border*.
    locked   whatsapp, plus anything the `roles` override marks locked. Never moved;
             still checked (a locked colour that fails is a real authored problem, not
             something to be silently swapped).
    brand    everything else (primary, accent, success, error, info, *-light, *-dark,
             client names).

Minimum-change rule (D.3): every non-surface colour is tested UNCHANGED against its
paired dark background(s) first. Passing -> kept byte-identical (the same hex the
light theme already used). Failing -> its OKLCh lightness moves the shortest distance
(either direction) that passes, hue and chroma kept (chroma is reduced only if the
candidate colour would otherwise leave the sRGB gamut). Targets: text 4.5:1;
border/brand 3:1 (WCAG 1.4.11 non-text UI).

Hand-set `_sgsDark.palette` values are used as-is (no search) and go through the same
final verification as every computed value. A verification failure raises
`DarkPaletteContrastError`, naming every failing (slug, background, ratio, target)
pair — the caller (push-theme-snapshot.py) lets it propagate, which is how "the deploy
stops" (D.3) is enforced: an uncaught exception exits the process non-zero.

OKLab/OKLCh maths: the standard Björn Ottosson sRGB<->OKLab matrices, inline (no new
pip dependency — matches the project's existing `scripts/nav-qa/palette-contrast-sweep.mjs`
which does the equivalent in JS for its own WCAG relative-luminance check). WCAG 2.1
relative luminance / contrast-ratio formulas match that file's maths exactly.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Optional

if sys.stdout.encoding is None or "utf-8" not in sys.stdout.encoding.lower():
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding is None or "utf-8" not in sys.stderr.encoding.lower():
    sys.stderr.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Targets (D.3).
# ---------------------------------------------------------------------------

TEXT_TARGET = 4.5
UI_TARGET = 3.0

BASE_SURFACE_L = 0.18
OTHER_SURFACE_L_MIN = 0.21
OTHER_SURFACE_L_MAX = 0.27
MAX_SURFACE_CHROMA = 0.03

LOCKED_NAMES = frozenset({"whatsapp"})


class DarkPaletteContrastError(ValueError):
    """Raised when one or more colour pairs fail their WCAG target after derivation.

    Deliberately a plain exception (never caught inside this module) — an uncaught
    raise from `prepare_deploy_snapshot` exits the process non-zero and names every
    failing pair, which is the "deploy stops" behaviour D.3 requires. `derive()`
    itself does not raise; it returns the failures so a caller (or a test) can
    inspect them without triggering a hard failure.
    """

    def __init__(self, failures: list[dict]):
        self.failures = failures
        lines = [
            f"  {f['slug']} vs {f['against']}: {f['ratio']}:1 (< {f['target']}:1 required)"
            for f in failures
        ]
        super().__init__(
            "dark-palette contrast check failed for "
            f"{len(failures)} pair(s):\n" + "\n".join(lines)
        )


# ---------------------------------------------------------------------------
# Colour maths — sRGB <-> linear <-> OKLab/OKLCh (Björn Ottosson matrices).
# ---------------------------------------------------------------------------

def hex_to_rgb01(hex_colour: str) -> tuple[float, float, float]:
    h = hex_colour.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        raise ValueError(f"not a hex colour: {hex_colour!r}")
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return (r, g, b)


def rgb01_to_hex(rgb: tuple[float, float, float]) -> str:
    def to_byte(c: float) -> int:
        return max(0, min(255, round(c * 255)))

    r, g, b = rgb
    return "#{:02x}{:02x}{:02x}".format(to_byte(r), to_byte(g), to_byte(b))


def _srgb_to_linear(c: float) -> float:
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def _linear_to_srgb(c: float) -> float:
    if c <= 0.0031308:
        return c * 12.92
    return 1.055 * (c ** (1 / 2.4)) - 0.055


def _cbrt(x: float) -> float:
    return math.copysign(abs(x) ** (1.0 / 3.0), x)


def rgb01_to_oklab(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    r, g, b = (_srgb_to_linear(c) for c in rgb)

    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

    l_, m_, s_ = _cbrt(l), _cbrt(m), _cbrt(s)

    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return (L, a, b2)


def oklab_to_rgb01(lab: tuple[float, float, float]) -> tuple[float, float, float]:
    L, a, b = lab
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b

    l = l_ ** 3
    m = m_ ** 3
    s = s_ ** 3

    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    b2 = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return tuple(_linear_to_srgb(c) for c in (r, g, b2))


def oklab_to_oklch(lab: tuple[float, float, float]) -> tuple[float, float, float]:
    L, a, b = lab
    C = math.hypot(a, b)
    H = math.degrees(math.atan2(b, a)) % 360
    return (L, C, H)


def oklch_to_oklab(lch: tuple[float, float, float]) -> tuple[float, float, float]:
    L, C, H = lch
    hr = math.radians(H)
    return (L, C * math.cos(hr), C * math.sin(hr))


def hex_to_oklch(hex_colour: str) -> tuple[float, float, float]:
    return oklab_to_oklch(rgb01_to_oklab(hex_to_rgb01(hex_colour)))


def _in_srgb_gamut(rgb: tuple[float, float, float], eps: float = 1e-4) -> bool:
    return all(-eps <= c <= 1 + eps for c in rgb)


def oklch_to_hex(lch: tuple[float, float, float]) -> str:
    """OKLCh -> sRGB hex. L and H are NEVER touched here; only C is reduced
    (in fixed 10% steps) until the colour fits the sRGB gamut — the "chroma
    reduced only if the colour leaves sRGB" clause of D.3."""
    L, C, H = lch
    c = max(0.0, C)
    rgb = oklab_to_rgb01(oklch_to_oklab((L, c, H)))
    for _ in range(60):
        if _in_srgb_gamut(rgb) or c <= 0.0:
            break
        c *= 0.9
        rgb = oklab_to_rgb01(oklch_to_oklab((L, c, H)))
    clamped = tuple(min(1.0, max(0.0, x)) for x in rgb)
    return rgb01_to_hex(clamped)


# ---------------------------------------------------------------------------
# WCAG 2.1 relative luminance / contrast — matches scripts/nav-qa/palette-contrast-sweep.mjs.
# ---------------------------------------------------------------------------

def relative_luminance(hex_colour: str) -> float:
    r, g, b = (_srgb_to_linear(c) for c in hex_to_rgb01(hex_colour))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(hex_a: str, hex_b: str) -> float:
    la = relative_luminance(hex_a)
    lb = relative_luminance(hex_b)
    lighter, darker = (la, lb) if la >= lb else (lb, la)
    return (lighter + 0.05) / (darker + 0.05)


# ---------------------------------------------------------------------------
# Role classification (D.2).
# ---------------------------------------------------------------------------

def classify_role(slug: str, roles_override: dict) -> str:
    if slug in roles_override:
        return roles_override[slug]
    s = slug.lower()
    if s in LOCKED_NAMES:
        return "locked"
    if (
        s.startswith("surface")
        or s.endswith("-bg")
        or s.startswith("background")
        or s.startswith("base")
    ):
        return "surface"
    if s.startswith("text") or s.endswith("-text"):
        return "text"
    if s.startswith("border"):
        return "border"
    return "brand"


def _text_pairs_with_fill(slug: str, palette: dict) -> Optional[str]:
    """A text-role slug painted ON a specific fill (`primary-text`, `accent-text`,
    `text-inverse`) pairs against that fill's dark value, not a surface (D.2's
    text-inverse rule, generalised to every "text on a named fill" slug the
    palette actually declares — the pattern is genuinely the same shape)."""
    s = slug.lower()
    if "inverse" in s:
        return "primary" if "primary" in palette else None
    if s.endswith("-text"):
        prefix = slug[: -len("-text")]
        if prefix and prefix in palette:
            return prefix
    return None


# ---------------------------------------------------------------------------
# Surfaces (D.2 — a direct L-band mapping, NOT the minimum-change search).
# ---------------------------------------------------------------------------

def _linspace(start: float, stop: float, n: int) -> list[float]:
    if n <= 0:
        return []
    if n == 1:
        return [start]
    step = (stop - start) / (n - 1)
    return [start + step * i for i in range(n)]


def derive_surfaces(palette: dict, roles_override: dict) -> dict:
    surface_slugs = [s for s in palette if classify_role(s, roles_override) == "surface"]
    base_slug = "surface" if "surface" in surface_slugs else None
    others = [s for s in surface_slugs if s != base_slug]
    others_sorted = sorted(others, key=lambda s: hex_to_oklch(palette[s])[0])
    levels = _linspace(OTHER_SURFACE_L_MIN, OTHER_SURFACE_L_MAX, len(others_sorted))

    out: dict[str, str] = {}
    if base_slug:
        _, C0, H0 = hex_to_oklch(palette[base_slug])
        out[base_slug] = oklch_to_hex((BASE_SURFACE_L, min(C0, MAX_SURFACE_CHROMA), H0))
    for slug, L in zip(others_sorted, levels):
        _, C, H = hex_to_oklch(palette[slug])
        out[slug] = oklch_to_hex((L, min(C, MAX_SURFACE_CHROMA), H))
    return out


# ---------------------------------------------------------------------------
# Minimum-change search for non-surface colours (D.3).
# ---------------------------------------------------------------------------

def _worst_contrast(hex_colour: str, backgrounds: list[str]) -> float:
    return min(contrast_ratio(hex_colour, bg) for bg in backgrounds)


def _passes(hex_colour: str, backgrounds: list[str], target: float) -> bool:
    return _worst_contrast(hex_colour, backgrounds) >= target


def solve_lightness(
    original_hex: str, backgrounds: list[str], target: float, max_steps: int = 100
) -> str:
    """Shortest OKLCh-lightness move (either direction, in 0.01 steps) that
    reaches `target` against every background, keeping hue/chroma from the
    original. Returns the original hex unchanged when it already passes."""
    if not backgrounds:
        return original_hex
    if _passes(original_hex, backgrounds, target):
        return original_hex

    L0, C0, H0 = hex_to_oklch(original_hex)
    step = 0.01
    candidates: list[tuple[float, str]] = []

    for direction in (1, -1):
        L = L0
        for _ in range(max_steps):
            L = min(1.0, max(0.0, L + direction * step))
            hexc = oklch_to_hex((L, C0, H0))
            if _passes(hexc, backgrounds, target):
                candidates.append((abs(L - L0), hexc))
                break
            if L in (0.0, 1.0):
                break

    if candidates:
        candidates.sort(key=lambda c: c[0])
        return candidates[0][1]

    # Lightness alone cannot reach the target (an extreme chroma/hue combination) —
    # fall back to whichever pole (white/black) contrasts better. The caller's
    # verification pass still checks the result and reports it if it still fails,
    # rather than silently pretending the search succeeded.
    white = oklch_to_hex((1.0, 0.0, H0))
    black = oklch_to_hex((0.0, 0.0, H0))
    return white if _worst_contrast(white, backgrounds) >= _worst_contrast(black, backgrounds) else black


# ---------------------------------------------------------------------------
# Full derivation (D.1-D.3).
# ---------------------------------------------------------------------------

def _palette_dict(snapshot: dict) -> dict:
    entries = ((snapshot.get("settings") or {}).get("color") or {}).get("palette") or []
    return {
        e["slug"]: e["color"]
        for e in entries
        if isinstance(e, dict) and isinstance(e.get("slug"), str) and isinstance(e.get("color"), str)
    }


def _backgrounds_for(slug: str, role: str, palette: dict, dark: dict, surface_bg: str, surface_alt_bg: Optional[str]) -> tuple[list[str], float]:
    if role == "text":
        pair_with = _text_pairs_with_fill(slug, palette)
        if pair_with:
            fill_dark = dark.get(pair_with) or palette.get(pair_with)
            return ([fill_dark] if fill_dark else [surface_bg]), TEXT_TARGET
        bgs = [surface_bg] + ([surface_alt_bg] if surface_alt_bg else [])
        return bgs, TEXT_TARGET
    # border / brand / locked (locked is checked with the same background rule
    # its name-inferred role would have used, even though its VALUE is never moved).
    return [surface_bg], UI_TARGET


def derive(snapshot: dict) -> dict:
    """Pure — no I/O, no sys.exit. Returns:
        {
          "enabled": bool,
          "dark": {slug: hex, ...},   # empty when not enabled
          "failures": [ {slug, against, ratio, target}, ... ],
        }
    `failures` is non-empty exactly when some pair could not be made to pass —
    callers that must "stop the deploy" raise `DarkPaletteContrastError(failures)`
    themselves (see `prepare_deploy_snapshot` in push-theme-snapshot.py).
    """
    cfg = snapshot.get("_sgsDark") or {}
    if not cfg.get("enabled"):
        return {"enabled": False, "dark": {}, "failures": []}

    palette = _palette_dict(snapshot)
    roles_override = cfg.get("roles") or {}
    hand_set = cfg.get("palette") or {}

    dark: dict[str, str] = {}
    dark.update(derive_surfaces(palette, roles_override))

    # Fallback background for checks when 'surface' itself is missing, or was
    # reclassified away from the surface role by an override — this is also
    # exactly the shape the negative-control test exercises (D.3's "a roles
    # override that makes a light slug a surface" — here, the inverse: an
    # override that takes the base surface OUT of the surface role leaves the
    # checks running against its un-darkened light value, which fails loudly).
    surface_bg = dark.get("surface") or palette.get("surface") or next(iter(dark.values()), "#000000")
    surface_alt_bg = dark.get("surface-alt")

    # Non-surface colours, brand/border/locked FIRST (so a text-on-fill pairing
    # like text-inverse/primary-text/accent-text has its fill's DARK value ready
    # before it is resolved).
    order = {"brand": 0, "border": 0, "locked": 0, "text": 1}
    ordered_slugs = sorted(
        (s for s in palette if classify_role(s, roles_override) != "surface"),
        key=lambda s: order.get(classify_role(s, roles_override), 0),
    )

    for slug in ordered_slugs:
        role = classify_role(slug, roles_override)
        original = palette[slug]

        if slug in hand_set:
            dark[slug] = hand_set[slug]
            continue
        if role == "locked":
            dark[slug] = original
            continue

        backgrounds, target = _backgrounds_for(slug, role, palette, dark, surface_bg, surface_alt_bg)
        dark[slug] = solve_lightness(original, backgrounds, target)

    # Verification — every non-surface slug, including locked/hand-set, must meet
    # its target against its FINAL background(s).
    failures: list[dict] = []
    for slug in ordered_slugs:
        role = classify_role(slug, roles_override)
        backgrounds, target = _backgrounds_for(slug, role, palette, dark, surface_bg, surface_alt_bg)
        final = dark[slug]
        for bg in backgrounds:
            ratio = contrast_ratio(final, bg)
            if ratio < target - 1e-9:
                failures.append(
                    {
                        "slug": slug,
                        "against": bg,
                        "ratio": round(ratio, 2),
                        "target": target,
                    }
                )

    return {"enabled": True, "dark": dark, "failures": failures}


# ---------------------------------------------------------------------------
# CLI — manual inspection only (push-theme-snapshot.py imports `derive()` directly).
# ---------------------------------------------------------------------------

def main() -> int:
    import json

    if len(sys.argv) != 2:
        print("Usage: python derive-dark-palette.py <path-to-theme-snapshot.json>", file=sys.stderr)
        return 2
    snapshot = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    result = derive(snapshot)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if result["failures"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

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

Fill-scoped ink: a text colour declared on a fill that stays light in dark mode
inside one style scope (the button element, a block, a markup fill class) keeps a
readable value in that scope only, output as `settings.custom.darkInk` and printed by
functions.php::dark_mode_ink_css. A text slug paired with a fill only by its name
counts only when that pair already reads in light mode (else a light-mode warning).

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
import re
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

# A surface already this dark or darker in the LIGHT theme (e.g. a footer band
# deliberately authored dark, like Mama's Munches' `footer-bg` #3A2E26, OKLCh
# L=0.312) is left byte-identical rather than pushed further into the dark band —
# measured fact, not the design note's original 0.27 guess: the real gap between
# such surfaces and the next-lightest "normal" surface in the wild is enormous
# (Mama's Munches: 0.312 vs 0.808), so 0.4 gives headroom on both sides without
# ever mistaking a genuinely light surface for an already-dark one.
ALREADY_DARK_SURFACE_L_MAX = 0.4

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


def _surface_is_already_dark(hexc: str) -> bool:
    L, _, _ = hex_to_oklch(hexc)
    return L <= ALREADY_DARK_SURFACE_L_MAX


def derive_surfaces(palette: dict, roles_override: dict) -> dict:
    """Map every LIGHT surface onto the dark band (D.2). A surface that is
    ALREADY dark in the light theme (`_surface_is_already_dark`) is kept
    byte-identical instead — it is not something dark mode needs to invent, it is
    already a deliberately dark section (a footer band, say), and pushing it even
    darker only breaks whatever the client already paired against it."""
    surface_slugs = [s for s in palette if classify_role(s, roles_override) == "surface"]
    base_slug = "surface" if "surface" in surface_slugs else None

    others = [s for s in surface_slugs if s != base_slug]
    already_dark = [s for s in others if _surface_is_already_dark(palette[s])]
    to_band = [s for s in others if s not in already_dark]
    to_band_sorted = sorted(to_band, key=lambda s: hex_to_oklch(palette[s])[0])
    levels = _linspace(OTHER_SURFACE_L_MIN, OTHER_SURFACE_L_MAX, len(to_band_sorted))

    out: dict[str, str] = {}
    for slug in already_dark:
        out[slug] = palette[slug]
    for slug, L in zip(to_band_sorted, levels):
        _, C, H = hex_to_oklch(palette[slug])
        out[slug] = oklch_to_hex((L, min(C, MAX_SURFACE_CHROMA), H))
    if base_slug:
        if _surface_is_already_dark(palette[base_slug]):
            out[base_slug] = palette[base_slug]
        else:
            _, C0, H0 = hex_to_oklch(palette[base_slug])
            out[base_slug] = oklch_to_hex((BASE_SURFACE_L, min(C0, MAX_SURFACE_CHROMA), H0))
    return out


# ---------------------------------------------------------------------------
# Minimum-change search for non-surface colours (D.3). A colour is now checked
# against every GROUND it is actually paired with (role defaults plus real usage
# pairs, §1 of the fix) — `pairs` is a list of (background-hex, target) tuples,
# each of which may carry its OWN target (4.5:1 for a text usage, 3:1 for a
# border/brand one), not one shared target for one shared background list.
# ---------------------------------------------------------------------------

def _passes_all(hex_colour: str, pairs: list[tuple[str, float]]) -> bool:
    return all(contrast_ratio(hex_colour, bg) >= target - 1e-9 for bg, target in pairs)


def solve_lightness(
    original_hex: str, pairs: list[tuple[str, float]], max_steps: int = 100
) -> str:
    """Shortest OKLCh-lightness move (either direction, in 0.01 steps) that
    reaches EVERY paired target simultaneously, keeping hue/chroma from the
    original. Returns the original hex unchanged when it already passes all of
    them, and unchanged again when NO lightness move passes all of them at once —
    a colour used as text on both a light fill and a dark surface can genuinely
    have no single lightness that satisfies both. That is an irresolvable
    conflict (D.3): fail closed by leaving the colour as-is rather than guessing
    a least-bad value, so the verification pass below reports every pair it still
    fails and the deploy stops instead of shipping an unreadable page."""
    if not pairs:
        return original_hex
    if _passes_all(original_hex, pairs):
        return original_hex

    L0, C0, H0 = hex_to_oklch(original_hex)
    step = 0.01
    candidates: list[tuple[float, str]] = []

    for direction in (1, -1):
        L = L0
        for _ in range(max_steps):
            L = min(1.0, max(0.0, L + direction * step))
            hexc = oklch_to_hex((L, C0, H0))
            if _passes_all(hexc, pairs):
                candidates.append((abs(L - L0), hexc))
                break
            if L in (0.0, 1.0):
                break

    if candidates:
        candidates.sort(key=lambda c: c[0])
        return candidates[0][1]

    return original_hex


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


def _surface_bg_slugs(palette: dict, roles_override: dict) -> list[str]:
    """Every slug currently classified `surface` — the full set of grounds a
    text/border/brand colour is checked against by default (§1: checking only
    the base `surface` + `surface-alt` missed real surfaces like `footer-bg`,
    which is exactly the live defect). Falls back to the untouched palette
    `surface` entry when a `roles` override leaves no surface at all — the same
    "there must be something to check against" guarantee the original
    surface_bg/surface_alt_bg fallback gave (this is what the negative-control
    test exercises)."""
    slugs = [s for s in palette if classify_role(s, roles_override) == "surface"]
    if not slugs and "surface" in palette:
        slugs = ["surface"]
    return slugs


def _guessed_fill(slug: str, palette: dict) -> Optional[str]:
    """The fill a text slug's NAME says it sits on (`_text_pairs_with_fill`), kept
    only when that pairing already reads in the LIGHT theme (4.5:1 with both light
    values). A name-guessed pairing that fails in light mode is not how the site
    uses the colour (Mama's Munches' cream `text-inverse` on its pink `primary`
    measures 2.4:1), so it cannot be a dark-mode constraint: `derive()` reports it
    as a light-mode warning instead."""
    fill = _text_pairs_with_fill(slug, palette)
    if not fill or fill not in palette or slug not in palette:
        return None
    if contrast_ratio(palette[slug], palette[fill]) < TEXT_TARGET - 1e-9:
        return None
    return fill


def _default_pairs_for_slug(
    slug: str, role: str, palette: dict, surface_slugs: list[str]
) -> list[tuple[str, float]]:
    """The role-based default grounds (D.2/D.3) a colour is checked against,
    as (background-SLUG, target) pairs — every surface, plus (for a text-on-fill
    slug like `text-inverse`) the specific fill it is guessed to sit on. This is
    additive with real usage pairs (`collect_usage_pairs`), never exclusive: the
    live defect was exactly `text-inverse` being checked ONLY against its guessed
    fill and never against the surfaces it is also used on."""
    if role == "text":
        pairs = [(s, TEXT_TARGET) for s in surface_slugs]
        pair_with = _guessed_fill(slug, palette)
        if pair_with:
            pairs.append((pair_with, TEXT_TARGET))
        return pairs
    # border / brand / locked (locked is checked with the same background rule
    # its name-inferred role would have used, even though its VALUE is never moved).
    return [(s, UI_TARGET) for s in surface_slugs]


# ---------------------------------------------------------------------------
# Real usage pairs (§1 of the fix) — every (text-slug, background-slug) and
# (border-slug, background-slug) the client's OWN snapshot actually declares,
# read from the documented theme.json shapes: `styles.color`, `styles.elements.*`
# (including `:hover`/`:focus`), `styles.blocks.*` and their own `elements`, plus
# any raw block markup a `templateParts`/`customTemplates` entry happens to carry.
# ---------------------------------------------------------------------------

_PRESET_VAR_RE = re.compile(r"^var\(--wp--preset--color--([a-zA-Z0-9_-]+)\)$")
_CONTENT_TEXT_COLOR_RE = re.compile(r'"textColor":"([a-zA-Z0-9_-]+)"')
_CONTENT_BG_COLOR_RE = re.compile(r'"backgroundColor":"([a-zA-Z0-9_-]+)"')
_CONTENT_COMMENT_RE = re.compile(r"<!--\s*wp:[a-zA-Z0-9/_-]+\s*(\{.*?\})?\s*/?-->", re.S)
_CONTENT_CLASS_RE = re.compile(r'class="([^"]*)"')
_CONTENT_HAS_TEXT_RE = re.compile(r"has-([a-zA-Z0-9_-]+)-color\b(?!-background)")
_CONTENT_HAS_BG_RE = re.compile(r"has-([a-zA-Z0-9_-]+)-background-color\b")


def _preset_slug(value: object) -> Optional[str]:
    """Resolve a theme.json colour value (`var:preset|color|<slug>` or
    `var(--wp--preset--color--<slug>)`) to its palette slug, else None — a
    literal hex/rgb value carries no slug and is not part of the checked usage
    graph (nothing to look up in `settings.custom.dark`)."""
    if not isinstance(value, str):
        return None
    v = value.strip()
    if v.startswith("var:preset|color|"):
        tail = v.split("|")[-1]
        return tail or None
    m = _PRESET_VAR_RE.match(v)
    return m.group(1) if m else None


def _pairs_from_markup(html: str, palette: dict) -> list[tuple[str, str, str]]:
    """Real usage pairs found in raw block markup, when a `templateParts` /
    `customTemplates` entry happens to carry one (a `content` string): block
    comment `textColor`/`backgroundColor` JSON attributes, and `has-<slug>-color`
    / `has-<slug>-background-color` class pairs on the same element."""
    pairs: list[tuple[str, str, str]] = []
    for m in _CONTENT_COMMENT_RE.finditer(html):
        attrs = m.group(1) or ""
        t = _CONTENT_TEXT_COLOR_RE.search(attrs)
        b = _CONTENT_BG_COLOR_RE.search(attrs)
        if t and b and t.group(1) != b.group(1) and t.group(1) in palette and b.group(1) in palette:
            pairs.append((t.group(1), b.group(1), "text"))
    for m in _CONTENT_CLASS_RE.finditer(html):
        cls = m.group(1)
        t = _CONTENT_HAS_TEXT_RE.search(cls)
        b = _CONTENT_HAS_BG_RE.search(cls)
        if t and b and t.group(1) != b.group(1) and t.group(1) in palette and b.group(1) in palette:
            pairs.append((t.group(1), b.group(1), "text"))
    return pairs


def _walk_style_scope(
    obj: object,
    ancestor_bg: Optional[str],
    palette: dict,
    out: list,
    scope: Optional[tuple[str, str, str]] = None,
) -> None:
    """Recurse into one theme.json style scope (an element, a block, a block's
    own element, or a pseudo-state of any of those), collecting every declared
    (text-slug, background-slug, "text") and (border-slug, background-slug,
    "border") pair. A scope with no `color.background` of its own inherits the
    nearest ancestor's — the same cascade WordPress itself applies. A border is
    checked against the surrounding (ancestor) background, never a background
    this SAME scope just set for itself — that would pair a fill against itself
    and always "fail" at 1:1, which is not a real usage. A fg/bg pair identical
    to itself (a text colour resolved to the same slug as its own background,
    which only happens when the real background lives outside what this snapshot
    captures — e.g. a header/footer's own colour, not global styles) is skipped
    for the same reason."""
    if not isinstance(obj, dict):
        return
    color = obj.get("color")
    own_bg = ancestor_bg
    text_slug = None
    if isinstance(color, dict):
        own_bg = _preset_slug(color.get("background")) or ancestor_bg
        text_slug = _preset_slug(color.get("text"))
    if text_slug and own_bg and text_slug != own_bg and text_slug in palette and own_bg in palette:
        out.append((text_slug, own_bg, "text", scope))
    border = obj.get("border")
    if isinstance(border, dict):
        border_slug = _preset_slug(border.get("color"))
        if (
            border_slug
            and ancestor_bg
            and border_slug != ancestor_bg
            and border_slug in palette
            and ancestor_bg in palette
        ):
            out.append((border_slug, ancestor_bg, "border", None))
    for key, sub in obj.items():
        if key.startswith(":") and isinstance(sub, dict):
            sub_scope = (scope[0], scope[1], key[1:]) if scope else None
            _walk_style_scope(sub, own_bg, palette, out, sub_scope)
    elements = obj.get("elements")
    if isinstance(elements, dict):
        for el_obj in elements.values():
            _walk_style_scope(el_obj, own_bg, palette, out)


def collect_usage_pairs(snapshot: dict, palette: dict) -> list[tuple[str, str, str]]:
    """Every real (foreground-slug, background-slug, kind) pair — see
    `collect_scoped_usage`, which also says WHERE each one was declared."""
    return [(fg, bg, kind) for fg, bg, kind, _scope in collect_scoped_usage(snapshot, palette)]


def collect_scoped_usage(
    snapshot: dict, palette: dict
) -> list[tuple[str, str, str, Optional[tuple[str, str, str]]]]:
    """Every real (foreground-slug, background-slug, kind) pair the client's own
    snapshot actually declares. This is what catches a slug used in more than the
    one role-guessed context its name suggests — D.2's `text-inverse` rule was
    only ever a guess at ONE such context (text on the brand fill); Mama's
    Munches also uses it as footer text, which this collects as a real pair
    wherever the snapshot's own declared styles show it."""
    styles = snapshot.get("styles") or {}
    root_color = styles.get("color") or {}
    root_bg = _preset_slug(root_color.get("background"))
    root_text = _preset_slug(root_color.get("text"))

    # Each pair's scope is (kind, name, state): ("element", "button", "base"),
    # ("block", "core/button", "hover"), ("fill", "<background-slug>", "base") for a
    # markup pair; None where no single selector owns it (the root, a block's own
    # nested element). A scope is what lets fill-scoped ink target just that element.
    pairs: list[tuple[str, str, str, Optional[tuple[str, str, str]]]] = []
    if root_text and root_bg and root_text != root_bg and root_text in palette and root_bg in palette:
        pairs.append((root_text, root_bg, "text", None))

    elements = styles.get("elements")
    if isinstance(elements, dict):
        for el_name, el_obj in elements.items():
            _walk_style_scope(el_obj, root_bg, palette, pairs, ("element", el_name, "base"))

    blocks = styles.get("blocks")
    if isinstance(blocks, dict):
        for block_name, block_style in blocks.items():
            _walk_style_scope(block_style, root_bg, palette, pairs, ("block", block_name, "base"))

    for coll_key in ("templateParts", "customTemplates"):
        entries = snapshot.get(coll_key)
        if isinstance(entries, list):
            for entry in entries:
                if isinstance(entry, dict):
                    content = entry.get("content")
                    if isinstance(content, str) and content:
                        for fg, bg, kind in _pairs_from_markup(content, palette):
                            pairs.append((fg, bg, kind, ("fill", bg, "base")))

    return pairs


def derive(snapshot: dict) -> dict:
    """Pure — no I/O, no sys.exit. Returns:
        {
          "enabled": bool,
          "dark": {slug: hex, ...},   # empty when not enabled
          "ink": {kind: {name: {state: {slug: hex}}}},  # fill-scoped ink
          "failures": [ {slug, against, ratio, target}, ... ],
          "warnings": [ {slug, against, ratio, target, mode}, ... ],
        }
    Fill-scoped ink: a text colour declared on a FILL (not a surface) inside one
    style scope (the button element, a block, a markup fill class) and failing
    against that fill's dark value once the page text has turned light keeps its
    own value in that scope only — the light-theme value when it still passes,
    else the shortest lightness move that does. `functions.php::dark_mode_ink_css`
    prints it as `--wp--preset--color--<slug>` on that scope's selector, so body
    text inverts while a bright button keeps a readable label.
    `failures` is non-empty exactly when some pair could not be made to pass —
    callers that must "stop the deploy" raise `DarkPaletteContrastError(failures)`
    themselves (see `prepare_deploy_snapshot` in push-theme-snapshot.py).
    """
    cfg = snapshot.get("_sgsDark") or {}
    if not cfg.get("enabled"):
        return {"enabled": False, "dark": {}, "ink": {}, "failures": [], "warnings": []}

    palette = _palette_dict(snapshot)
    roles_override = cfg.get("roles") or {}
    hand_set = cfg.get("palette") or {}

    dark: dict[str, str] = {}
    dark.update(derive_surfaces(palette, roles_override))

    surface_slugs = _surface_bg_slugs(palette, roles_override)

    # Real usage pairs (§1): a colour used as TEXT or a BORDER anywhere in the
    # client's own declared styles, split into slugs this module can still move
    # (fed into the minimum-change search alongside the role defaults) and slugs
    # that are themselves a SURFACE (their value is fixed by `derive_surfaces`'s
    # band placement, never by this search — they are only ever verified).
    scoped_usage = collect_scoped_usage(snapshot, palette)
    # A text pair on a non-surface fill that is declared ONLY inside scopes is
    # resolved by fill-scoped ink below, never by moving the colour site-wide
    # (one value cannot be light on the dark page and dark on a bright button).
    inkable: dict[tuple[str, str], list[tuple[str, str, str]]] = {}
    unscoped_text: set[tuple[str, str]] = set()
    for fg, bg, kind, scope in scoped_usage:
        if kind != "text" or classify_role(bg, roles_override) == "surface":
            continue
        if scope is None:
            unscoped_text.add((fg, bg))
        else:
            inkable.setdefault((fg, bg), []).append(scope)
    for key in unscoped_text:
        inkable.pop(key, None)

    usage_solvable: dict[str, list[tuple[str, float]]] = {}
    usage_surface_fg: list[tuple[str, str, float]] = []
    for fg, bg, kind, _scope in scoped_usage:
        if kind == "text" and (fg, bg) in inkable:
            continue
        target = TEXT_TARGET if kind == "text" else UI_TARGET
        if classify_role(fg, roles_override) == "surface":
            usage_surface_fg.append((fg, bg, target))
        else:
            usage_solvable.setdefault(fg, []).append((bg, target))

    def bg_hex(slug: str) -> str:
        return dark.get(slug) or palette.get(slug) or "#000000"

    # Non-surface colours, brand/border/locked FIRST (so a text-on-fill pairing
    # like text-inverse/primary-text/accent-text has its fill's DARK value ready
    # before it is resolved).
    order = {"brand": 0, "border": 0, "locked": 0, "text": 1}
    ordered_slugs = sorted(
        (s for s in palette if classify_role(s, roles_override) != "surface"),
        key=lambda s: order.get(classify_role(s, roles_override), 0),
    )

    def pairs_for(slug: str, role: str) -> list[tuple[str, float]]:
        """Every (background-slug, target) this slug is checked against: the
        role defaults PLUS any real usage pairs found for it, de-duplicated."""
        combined = _default_pairs_for_slug(slug, role, palette, surface_slugs) + usage_solvable.get(slug, [])
        seen: set[tuple[str, float]] = set()
        deduped: list[tuple[str, float]] = []
        for bg, target in combined:
            key = (bg, target)
            if key in seen:
                continue
            seen.add(key)
            deduped.append((bg, target))
        return deduped

    for slug in ordered_slugs:
        role = classify_role(slug, roles_override)
        original = palette[slug]

        if slug in hand_set:
            dark[slug] = hand_set[slug]
            continue
        if role == "locked":
            dark[slug] = original
            continue

        resolved = [(bg_hex(bg), target) for bg, target in pairs_for(slug, role)]
        dark[slug] = solve_lightness(original, resolved)

    # Verification — every non-surface slug, including locked/hand-set, must meet
    # EVERY target it is paired with (role default or real usage) against its
    # FINAL background. A surface used as a foreground elsewhere (e.g. `surface`
    # as a button's hover text) is verified the same way, but was never eligible
    # for the search above — its value comes from `derive_surfaces`'s band
    # placement, not this module's minimum-change search.
    failures: list[dict] = []
    for slug in ordered_slugs:
        role = classify_role(slug, roles_override)
        final = dark[slug]
        for bg, target in pairs_for(slug, role):
            ratio = contrast_ratio(final, bg_hex(bg))
            if ratio < target - 1e-9:
                failures.append(
                    {"slug": slug, "against": bg, "ratio": round(ratio, 2), "target": target}
                )

    for fg, bg, target in usage_surface_fg:
        final_fg = dark.get(fg) or palette.get(fg)
        if not final_fg:
            continue
        ratio = contrast_ratio(final_fg, bg_hex(bg))
        if ratio < target - 1e-9:
            failures.append({"slug": fg, "against": bg, "ratio": round(ratio, 2), "target": target})

    ink: dict[str, dict[str, dict[str, dict[str, str]]]] = {}
    for (fg, bg), scopes in inkable.items():
        final_fg = dark.get(fg) or palette.get(fg)
        final_bg = bg_hex(bg)
        if not final_fg or contrast_ratio(final_fg, final_bg) >= TEXT_TARGET - 1e-9:
            continue
        light_fg = palette[fg]
        value = light_fg if contrast_ratio(light_fg, final_bg) >= TEXT_TARGET - 1e-9 else solve_lightness(
            light_fg, [(final_bg, TEXT_TARGET)]
        )
        ratio = contrast_ratio(value, final_bg)
        if ratio < TEXT_TARGET - 1e-9:
            failures.append({"slug": fg, "against": bg, "ratio": round(ratio, 2), "target": TEXT_TARGET})
            continue
        for kind, name, state in scopes:
            ink.setdefault(kind, {}).setdefault(name, {}).setdefault(state, {})[fg] = value

    warnings: list[dict] = []
    for slug in ordered_slugs:
        fill = _text_pairs_with_fill(slug, palette)
        if fill and fill in palette and _guessed_fill(slug, palette) is None:
            warnings.append({
                "slug": slug, "against": fill, "target": TEXT_TARGET, "mode": "light",
                "ratio": round(contrast_ratio(palette[slug], palette[fill]), 2),
            })

    return {"enabled": True, "dark": dark, "ink": ink, "failures": failures, "warnings": warnings}


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

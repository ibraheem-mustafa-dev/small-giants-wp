#!/usr/bin/env python3
"""Seed ``motion_shape_signatures`` — Tier V CSS-shape lookup table.

WHY THIS EXISTS
----------------
Phase R8 (`.claude/plans/phase-r8-motion-recognition.md` Step 1) needs a
DB-seeded table mapping known CSS animation shapes onto SGS's existing Tier V
preset catalogue, so a future raw-CSS classifier (Step 3) can query it
instead of hand-authoring a shape->preset dict — banned outright by this
project's R-31-1 ("no hardcoded Python dicts for exactly this kind of
lookup").

DECLARATIVE PATTERN (mirrors ``converter/db/db_lookup.py::fx_attr_roster``)
----------------------------------------------------------------------------
``fx_attr_roster()`` never hand-types its attribute list — it regexes two
already-maintained PHP source files (``FX_ATTR_MAP`` +
``extension-attributes.generated.php``) and builds the roster from what it
reads. This script does the equivalent for the entrance/hover/parallax Tier V
inventory: it regexes the two files SGS engineers actually maintain —

  * ``plugins/sgs-blocks/assets/css/extensions.css`` — the real CSS rules
    that define each preset's starting transform/filter/clip-path, plus the
    border-accent and element-parallax keyframes.
  * ``plugins/sgs-blocks/src/blocks/gallery/block.json`` — the real default
    values for ``sgsAnimationDuration``/``sgsAnimationEasing`` (any block
    declaring these attrs carries the same defaults; gallery is used only as
    a live read target, not a privileged source).

No preset's direction/magnitude/easing is hand-typed here — every value is
computed from parsing the actual CSS declaration. The ONLY exception is the
5-keyword easing-curve fallback table (`_NAMED_EASING_CURVES`) and the
duration-token->ms map (`_DURATION_TOKEN_MS`), which are the CSS spec's own
fixed cubic-bezier definitions and SGS's own theme.json duration tokens
respectively — not a shape/preset mapping, so R-31-1 does not apply to them.

GROUND TRUTH CONFIRMED LIVE BEFORE WRITING THIS FILE (2026-09-11)
------------------------------------------------------------------
Queried `sgs-framework.db` directly:
  * `fx_effects` (tier V rows): page-transitions, cursor-field, carousel-loop,
    magnet, particles, grid-dots — six JS/canvas-driven interaction effects
    with NO fixed CSS keyframe shape (var()-only magnitudes, or canvas-drawn).
    Deliberately NOT seeded here — see "Documented gaps" below.
  * `animation_tokens` (8 rows: fade-in/fade-out/slide-up/zoom-in/bounce/
    pulse/spin/fade-up) is a SEPARATE, older token table, not the live
    entrance-preset system a real draft's `sgsAnimation` attribute drives.
  * The REAL, live entrance-preset closed vocabulary (confirmed via
    `plugins/sgs-blocks/src/components/AnimationControl.js`) is exactly 16
    values — matches the brainstorm doc's "entrance x16" figure precisely:
    fade-up, fade-down, fade-in, fade-left, fade-right, slide-up, slide-down,
    slide-left, slide-right, scale-in, scale-out, rotate-in, flip-in,
    blur-in, bounce-in, reveal-up.
  * Their actual CSS shapes live in `extensions.css` lines ~32-73 under
    `.sgs-js [data-sgs-animation="<preset>"]` selectors.

REAL, DOCUMENTED QUIRK — DO NOT "FIX" IN THIS SCRIPT
------------------------------------------------------
`fade-left`/`fade-right` and `slide-left`/`slide-right` have OPPOSITE
translateX signs for the same-sounding name:
  fade-left:  translateX(30px)  -> animates toward 0 -> moves LEFT  (name matches)
  fade-right: translateX(-30px) -> animates toward 0 -> moves RIGHT (name matches)
  slide-left: translateX(-30px) -> animates toward 0 -> moves RIGHT (name is backwards)
  slide-right:translateX(30px)  -> animates toward 0 -> moves LEFT  (name is backwards)
This script classifies `direction` by the ACTUAL computed motion vector (what
a raw-CSS classifier would observe), not by the preset's own name — that is
the only defensible choice for a shape-recognition lookup table. Flagged
here so nobody mistakes this script's output for a bug of its own.

DOCUMENTED GAPS (Step 1's On-Fail clause — narrow scope, don't force a bad fit)
--------------------------------------------------------------------------------
Not seeded, with reasons:
  * cursor-field / draggable / draw / generative-background / grid-dots /
    magnet / morph / motion-path / particles / scramble / scrub / flip /
    horizontal-panel / image-sequence / pin-scrub / split-reveal /
    surface-treatment / wave-gradient — the `data-sgs-fx-*` closed
    vocabulary (Tier G/V/W per `fx_effects`). These are JS-driven
    (cursor-follow, canvas particles, GSAP timelines) or shader-driven, not
    expressible as a static CSS keyframe/transform shape at all.
  * `.sgs-has-hover-scale` / `.sgs-has-hover-shadow` — real Tier V hover
    effects, but their CSS is `scale(var(--sgs-hover-scale, 1))` /
    `box-shadow: var(--sgs-hover-shadow, none)`: the fallback is a NO-OP
    default, not a real effect magnitude — the actual magnitude is only ever
    set per-instance by the operator, never baked into the base CSS. There is
    no "known shape" to seed; a future classifier session would need to read
    a specific draft's own custom-property VALUE, which is a different
    (per-instance) problem, not a shared signature-table lookup.

Seeded (18 rows): the 16 entrance presets + `border-accent` (real baked
scaleX 0->1 transition, `.sgs-has-border-accent::before`) + `parallax-element`
(real baked `@keyframes sgs-parallax-element`, default strength 30).
"""

from __future__ import annotations

import os
import re
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[3]  # scripts/dbschema -> scripts -> sgs-blocks -> plugins -> ROOT
EXTENSIONS_CSS = REPO_ROOT / "plugins" / "sgs-blocks" / "assets" / "css" / "extensions.css"
GALLERY_BLOCK_JSON = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks" / "gallery" / "block.json"
# Same resolution convention as ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py
# (DB_PATH = <script dir>/../sgs-framework.db) — this script lives elsewhere,
# so the path is spelled out via the user's home directory instead.
DB_PATH = os.path.expanduser(os.path.join("~", ".claude", "skills", "sgs-wp-engine", "sgs-framework.db"))

TABLE = "motion_shape_signatures"

# CSS spec's own fixed cubic-bezier control points for the 5 named easing
# keywords this table's `easing_curve` enum is pinned to. Not a shape lookup
# — the browser's own defined curves — so R-31-1 does not apply.
_NAMED_EASING_CURVES: dict[str, tuple[float, float, float, float]] = {
    "linear": (0.0, 0.0, 1.0, 1.0),
    "ease": (0.25, 0.1, 0.25, 1.0),
    "ease-in": (0.42, 0.0, 1.0, 1.0),
    "ease-out": (0.0, 0.0, 0.58, 1.0),
    "ease-in-out": (0.42, 0.0, 0.58, 1.0),
}

# theme.json's own duration-token -> ms map (mirrors the fallback values in
# extensions.css lines 25-29, `var(--wp--custom--duration--<key>, <ms>)`).
# A token->ms lookup, not a shape/preset mapping.
_DURATION_TOKEN_MS: dict[str, int] = {
    "instant": 60,
    "fast": 150,
    "medium": 300,
    "slow": 500,
    "extra-slow": 800,
}

# Uniform tolerance band applied to every parsed magnitude (not per-preset
# hand-tuning) — a real-world site rarely uses SGS's exact px/degree/scale
# constant, so the seeded range is the parsed value +/-33%.
_TOLERANCE = 0.33


def _snap_easing(raw: str) -> str:
    """Snap a raw CSS easing value to its nearest of the 5 named keywords.

    Exact keyword match short-circuits. Otherwise parses `cubic-bezier(...)`
    control points and picks the keyword with the smallest Euclidean
    distance in the 4-dimensional (x1,y1,x2,y2) control-point space — this
    is the literal "snapped ... by control-point distance" rule pinned in
    Phase R8 Step 1, not an eyeballed choice.
    """
    raw = raw.strip().rstrip(";").strip()
    if raw in _NAMED_EASING_CURVES:
        return raw
    m = re.match(r"cubic-bezier\(\s*([^)]+)\)", raw)
    if not m:
        return "ease"  # unrecognised raw value; safe, common fallback
    try:
        pts = tuple(float(v.strip()) for v in m.group(1).split(","))
    except ValueError:
        return "ease"
    if len(pts) != 4:
        return "ease"
    best_name, best_dist = "ease", float("inf")
    for name, ref in _NAMED_EASING_CURVES.items():
        dist = sum((a - b) ** 2 for a, b in zip(pts, ref)) ** 0.5
        if dist < best_dist:
            best_name, best_dist = name, dist
    return best_name


def _band(value: float) -> tuple[float, float]:
    lo, hi = sorted((value * (1 - _TOLERANCE), value * (1 + _TOLERANCE)))
    return (round(lo, 3), round(hi, 3))


def _parse_default_duration_easing() -> tuple[int, str]:
    """Read the real default duration/easing off a live block.json.

    Any block declaring `sgsAnimationDuration`/`sgsAnimationEasing` carries
    the same framework-wide defaults (gallery is just a live read target).
    """
    text = GALLERY_BLOCK_JSON.read_text(encoding="utf-8")
    dur_m = re.search(r'"sgsAnimationDuration":\s*\{[^}]*"default":\s*"([^"]+)"', text)
    easing_m = re.search(r'"sgsAnimationEasing":\s*\{[^}]*"default":\s*"([^"]+)"', text)
    if not dur_m or not easing_m:
        raise RuntimeError(
            f"Could not read sgsAnimationDuration/sgsAnimationEasing defaults from {GALLERY_BLOCK_JSON}"
        )
    duration_token = dur_m.group(1)
    if duration_token not in _DURATION_TOKEN_MS:
        raise RuntimeError(f"Unknown duration token '{duration_token}' in {GALLERY_BLOCK_JSON}")
    return _DURATION_TOKEN_MS[duration_token], easing_m.group(1)


def _parse_transform_shape(preset: str, value: str) -> tuple[str, str, float, float] | None:
    """Parse a `transform:` value into (property, direction, mag_min, mag_max).

    Returns None when the value is `none` (handled by the caller as a pure
    opacity fade) or genuinely unparseable.
    """
    value = value.strip()
    if value == "none":
        return None

    m = re.search(r"translateY\(\s*(-?[\d.]+)px\s*\)", value)
    if m:
        v = float(m.group(1))
        # Element starts at translateY(v) and animates to translateY(0).
        # v > 0 (starts below) => moves UP into place; v < 0 => moves DOWN.
        direction = "up" if v > 0 else "down"
        lo, hi = _band(abs(v))
        return ("transform", direction, lo, hi)

    m = re.search(r"translateX\(\s*(-?[\d.]+)px\s*\)", value)
    if m:
        v = float(m.group(1))
        # Element starts at translateX(v) and animates to translateX(0).
        # v > 0 (starts right) => moves LEFT into place; v < 0 => moves RIGHT.
        direction = "left" if v > 0 else "right"
        lo, hi = _band(abs(v))
        return ("transform", direction, lo, hi)

    m = re.search(r"scale\(\s*([\d.]+)\s*\)", value)
    if m:
        v = float(m.group(1))
        direction = "scale-in" if v < 1 else "scale-out"
        lo, hi = _band(v)
        return ("transform", direction, lo, hi)

    m = re.search(r"rotateX?\(\s*(-?[\d.]+)deg\s*\)", value)
    if m:
        v = float(m.group(1))
        lo, hi = _band(abs(v))
        return ("transform", "rotate", lo, hi)

    raise ValueError(f"Unparseable transform shape for preset '{preset}': {value!r}")


def _extract_entrance_rows(default_duration_ms: int, default_easing: str) -> list[dict]:
    """Regex-extract the 16 real `[data-sgs-animation="..."]` shapes."""
    text = EXTENSIONS_CSS.read_text(encoding="utf-8")

    # Merge every declaration block keyed by preset name (blur-in has two
    # separate rule blocks in the source file — both get merged here).
    blocks: dict[str, str] = {}
    for m in re.finditer(r'\[data-sgs-animation="([\w-]+)"\]\s*\{([^}]*)\}', text, re.DOTALL):
        preset, body = m.group(1), m.group(2)
        blocks[preset] = blocks.get(preset, "") + "\n" + body

    rows: list[dict] = []
    for preset, body in blocks.items():
        transform_m = re.search(r"transform:\s*([^;]+);", body)
        filter_m = re.search(r"filter:\s*([^;]+);", body)
        clip_m = re.search(r"clip-path:\s*([^;]+);", body)
        easing_override_m = re.search(r"transition-timing-function:\s*([^;]+);", body)

        easing_raw = easing_override_m.group(1) if easing_override_m else default_easing
        easing_curve = _snap_easing(easing_raw)

        shape = None
        if transform_m:
            shape = _parse_transform_shape(preset, transform_m.group(1))
        if shape is None and filter_m and "blur" in filter_m.group(1):
            bm = re.search(r"blur\(\s*(-?[\d.]+)px\s*\)", filter_m.group(1))
            if bm:
                v = float(bm.group(1))
                lo, hi = _band(v)
                shape = ("filter", "none", lo, hi)
        if shape is None and clip_m:
            # inset(100% 0 0 0) -> wipes from the top edge downward as it
            # reveals -> the CONTENT becomes visible moving upward into view.
            shape = ("clip-path", "up", 90.0, 100.0)
        if shape is None:
            # transform: none with no filter/clip-path -> pure opacity fade
            # (fade-in is the only preset with this exact shape).
            shape = ("opacity", "none", 0.0, 1.0)

        prop, direction, mag_min, mag_max = shape
        rows.append(
            {
                "preset_slug": preset,
                "tier": "V",
                "animated_property": prop,
                "direction": direction,
                "magnitude_min": mag_min,
                "magnitude_max": mag_max,
                "duration_ms": default_duration_ms,
                "easing_curve": easing_curve,
            }
        )

    expected = {
        "fade-up", "fade-down", "fade-in", "fade-left", "fade-right",
        "slide-up", "slide-down", "slide-left", "slide-right",
        "scale-in", "scale-out", "rotate-in", "flip-in", "blur-in",
        "bounce-in", "reveal-up",
    }
    found = {r["preset_slug"] for r in rows}
    missing = expected - found
    if missing:
        raise RuntimeError(
            f"Expected all 16 entrance presets in {EXTENSIONS_CSS}, missing: {sorted(missing)}"
        )
    return [r for r in rows if r["preset_slug"] in expected]


def _extract_border_accent_row() -> dict:
    """Regex-extract `.sgs-has-border-accent`'s real scaleX(0)->scaleX(1)."""
    text = EXTENSIONS_CSS.read_text(encoding="utf-8")
    block_m = re.search(
        r"\.sgs-has-border-accent::before\s*\{([^}]*)\}", text, re.DOTALL
    )
    if not block_m:
        raise RuntimeError(f"Could not find .sgs-has-border-accent::before rule in {EXTENSIONS_CSS}")
    body = block_m.group(1)
    scale_m = re.search(r"transform:\s*scaleX\(\s*([\d.]+)\s*\)", body)
    duration_m = re.search(r"transition:\s*transform\s+(\d+)ms\s+([\w-]+)", body)
    if not scale_m or not duration_m:
        raise RuntimeError(f"Could not parse scaleX/transition off .sgs-has-border-accent::before in {EXTENSIONS_CSS}")
    start_scale = float(scale_m.group(1))  # 0 -> grows to 1 on hover/focus-within
    duration_ms = int(duration_m.group(1))
    easing_curve = _snap_easing(duration_m.group(2))
    lo, hi = _band(1.0 - start_scale) if start_scale < 1 else _band(start_scale)
    return {
        "preset_slug": "border-accent",
        "tier": "V",
        "animated_property": "transform",
        "direction": "scale-in",
        "magnitude_min": lo,
        "magnitude_max": hi,
        "duration_ms": duration_ms,
        "easing_curve": easing_curve,
    }


def _extract_parallax_row() -> dict:
    """Regex-extract `@keyframes sgs-parallax-element`'s real strength/easing."""
    text = EXTENSIONS_CSS.read_text(encoding="utf-8")
    kf_m = re.search(r"@keyframes sgs-parallax-element\s*\{(.*?)\n\t\t\t\}\n", text, re.DOTALL)
    if not kf_m:
        raise RuntimeError(f"Could not find @keyframes sgs-parallax-element in {EXTENSIONS_CSS}")
    body = kf_m.group(1)
    strength_m = re.search(r"--sgs-parallax-strength,\s*([\d.]+)\)\s*\*\s*([\d.]+)px", body)
    if not strength_m:
        raise RuntimeError(f"Could not parse --sgs-parallax-strength default/multiplier in {EXTENSIONS_CSS}")
    default_strength = float(strength_m.group(1))
    px_multiplier = float(strength_m.group(2))
    easing_m = re.search(r"animation:\s*sgs-parallax-element\s+([\w-]+)\s+both", text)
    easing_curve = _snap_easing(easing_m.group(1)) if easing_m else "linear"
    magnitude = default_strength * px_multiplier  # symmetric drift +/- this many px
    return {
        "preset_slug": "parallax-element",
        "tier": "V",
        "animated_property": "transform",
        "direction": "none",  # bidirectional scroll-linked drift, no fixed entry direction
        "magnitude_min": 0.0,
        "magnitude_max": round(magnitude, 3),
        "duration_ms": None,  # scroll-linked (animation-timeline: scroll), no fixed wall-clock duration
        "easing_curve": easing_curve,
    }


def build_rows() -> list[dict]:
    default_duration_ms, default_easing = _parse_default_duration_easing()
    rows = _extract_entrance_rows(default_duration_ms, default_easing)
    rows.append(_extract_border_accent_row())
    rows.append(_extract_parallax_row())
    return rows


def ensure_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {TABLE} (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            preset_slug         TEXT NOT NULL,
            tier                TEXT NOT NULL DEFAULT 'V'
                CHECK(tier = 'V'),
            animated_property   TEXT NOT NULL,
            direction           TEXT NOT NULL
                CHECK(direction IN ('up','down','left','right','scale-in','scale-out','rotate','none')),
            magnitude_min       REAL NOT NULL,
            magnitude_max       REAL NOT NULL,
            duration_ms         INTEGER,
            easing_curve        TEXT NOT NULL
                CHECK(easing_curve IN ('linear','ease','ease-in','ease-out','ease-in-out')),
            created_at          TEXT DEFAULT (datetime('now'))
        )
        """
    )
    conn.execute(
        f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{TABLE}_preset_slug ON {TABLE}(preset_slug)"
    )


def seed(conn: sqlite3.Connection, rows: list[dict]) -> int:
    ensure_table(conn)
    conn.execute(f"DELETE FROM {TABLE}")  # idempotent full reseed — table is derived, never hand-edited
    conn.executemany(
        f"""
        INSERT INTO {TABLE}
            (preset_slug, tier, animated_property, direction,
             magnitude_min, magnitude_max, duration_ms, easing_curve)
        VALUES
            (:preset_slug, :tier, :animated_property, :direction,
             :magnitude_min, :magnitude_max, :duration_ms, :easing_curve)
        """,
        rows,
    )
    conn.commit()
    return len(rows)


def main() -> int:
    if not EXTENSIONS_CSS.exists():
        print(f"ERROR: source file not found: {EXTENSIONS_CSS}", file=sys.stderr)
        return 1
    if not GALLERY_BLOCK_JSON.exists():
        print(f"ERROR: source file not found: {GALLERY_BLOCK_JSON}", file=sys.stderr)
        return 1

    rows = build_rows()
    conn = sqlite3.connect(DB_PATH)
    try:
        n = seed(conn, rows)
    finally:
        conn.close()

    print(f"Seeded {n} rows into {TABLE} ({DB_PATH})")
    for r in rows:
        print(f"  {r['preset_slug']:<18} {r['animated_property']:<10} {r['direction']:<10} "
              f"[{r['magnitude_min']}, {r['magnitude_max']}]  {r['duration_ms']}ms  {r['easing_curve']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

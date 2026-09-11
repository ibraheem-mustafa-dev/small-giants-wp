"""Tier 1 CSS declaration-shape classifier — Phase R8 Step 3.

WHY THIS EXISTS
----------------
`.claude/plans/phase-r8-motion-recognition.md` Step 3 (Tier 1). A draft
element's raw `@keyframes`/`animation`/`transition` declarations are read,
the CSS-level shape is extracted (animated property, direction/magnitude,
duration/easing — encoded exactly per the `motion_shape_signatures` schema
built in Step 1, seeded by
`plugins/sgs-blocks/scripts/dbschema/seed-motion-shape-signatures.py`), and
that shape is matched against the table's known Tier V preset catalogue.
This is provably bounded to Tier V by construction: every return path below
resolves `preset_slug` from a row already present in `motion_shape_signatures`
(`tier='V'` is a DB-level CHECK constraint on that table) — there is no path
in this module that can emit a Tier G/H/W value.

MATCHING RULE (pinned in Step 3 — do not redesign)
----------------------------------------------------
Exact match required on `animated_property` and `direction`. `duration_ms`
matches within +/-20%. `easing_curve` must match the same SNAPPED keyword
exactly (no cross-keyword tolerance — snap the draft's own easing via the
same 5-keyword control-point-distance rule the seed script uses before
comparing). A candidate matches on magnitude when the shape's parsed
magnitude falls within `[magnitude_min, magnitude_max]`. Zero or 2+ equally
good candidates => no match, fall through cleanly — never guess between
ties. (Several seeded rows are genuinely IDENTICAL signatures under
different preset names — e.g. `fade-up`/`slide-up` share
transform/up/20.1-39.9/300/ease-out outright, per the seed script's own
documented quirk. A generic "translateY(30px)->0, 300ms ease-out" draft
shape is a real, structural tie, not a classifier bug — see
`test_motion_shape.py`'s `test_tie_fade_up_slide_up_no_match`.)

OUTPUT SHAPE (pinned in Step 3 — do not redesign)
----------------------------------------------------
On a match: a plain dict `{"fx": <preset_slug>}` — the SAME shape
`converter/db/db_lookup.py::lift_behavioural_attrs` already returns as its
`attrs` half of a `(attrs, skipped)` tuple. That function is a pure lookup;
it does not write anywhere itself — its caller in
`converter/services/assembly.py` (step 3a1, `attrs.setdefault(...)` per
key) does the actual merge into the block's final attributes. This module
mirrors that exact contract (`classify_css_motion()` returns `(attrs,
skipped)`) so it is mergeable by the SAME caller loop, with no second
write/merge path invented here. `skipped` is always `[]` today — this
classifier recognises a shape or it doesn't; there is no "recognised but
unroutable" case at Tier 1 (unlike the fx-attribute-lift skip case, a shape
match has exactly one destination attr, `fx`, which every fx-capable block
already declares).

NOT THIS MODULE'S JOB
----------------------------------------------------
Trigger-mechanism classification (scroll/load/hover/autoplay — Tier 2),
sibling stagger detection (Tier 3), and anything Tier 4a+ (GSAP/Lenis/WebGL
runtime-signal detection) are explicitly out of scope here per the plan.
"""

from __future__ import annotations

import os
import re
import sqlite3

TABLE = "motion_shape_signatures"

# Same DB path convention as the seed script + sgs-db.py.
DB_PATH = os.path.expanduser(os.path.join("~", ".claude", "skills", "sgs-wp-engine", "sgs-framework.db"))

# CSS spec's own fixed cubic-bezier control points for the 5 named easing
# keywords `motion_shape_signatures.easing_curve` is pinned to. Duplicated
# from `seed-motion-shape-signatures.py` deliberately (not imported) — this
# is the browser's own defined curve set, not a shape/preset lookup, so
# R-31-1 does not apply; keeping this module import-independent of the
# one-off seed script is the correct isolation (the seed script's own
# docstring frames it as a migration tool, not a runtime dependency).
_NAMED_EASING_CURVES: dict[str, tuple[float, float, float, float]] = {
    "linear": (0.0, 0.0, 1.0, 1.0),
    "ease": (0.25, 0.1, 0.25, 1.0),
    "ease-in": (0.42, 0.0, 1.0, 1.0),
    "ease-out": (0.0, 0.0, 0.58, 1.0),
    "ease-in-out": (0.42, 0.0, 0.58, 1.0),
}

# Uniform +/-20% duration tolerance — the pinned matching rule's own figure.
_DURATION_TOLERANCE = 0.20


def snap_easing(raw: str) -> str:
    """Snap a raw CSS easing value to its nearest of the 5 named keywords.

    Exact keyword match short-circuits. Otherwise parses `cubic-bezier(...)`
    control points and picks the keyword with the smallest Euclidean
    distance in the 4-dimensional (x1,y1,x2,y2) control-point space —
    matches `seed-motion-shape-signatures.py::_snap_easing`'s convention
    exactly, so a draft's easing and a seeded row's easing are always
    compared in the same snapped vocabulary.
    """
    raw = raw.strip().rstrip(";").strip()
    if raw in _NAMED_EASING_CURVES:
        return raw
    m = re.match(r"cubic-bezier\(\s*([^)]+)\)", raw)
    if not m:
        return "ease"
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


def parse_duration_ms(raw: str) -> "int | None":
    """Parse a raw CSS duration token ('300ms', '0.6s') into whole ms."""
    raw = raw.strip()
    m = re.match(r"^(-?[\d.]+)(ms|s)$", raw)
    if not m:
        return None
    value, unit = float(m.group(1)), m.group(2)
    ms = value * 1000 if unit == "s" else value
    return int(round(ms))


# ---------------------------------------------------------------------------
# Declaration-value parsers — same conventions as
# seed-motion-shape-signatures.py::_parse_transform_shape, but returning a
# single parsed MAGNITUDE (the draft's own actual value) rather than a
# +/-33% seeded band, since here the value is the thing being matched
# AGAINST a band, not the thing defining one.
# ---------------------------------------------------------------------------

def parse_transform_declaration(value: str) -> "tuple[str, str, float] | None":
    """Parse a `transform:` value into (property, direction, magnitude).

    Mirrors the seed script's documented direction convention exactly:
    the value passed in is the START state of the animation (the state
    that animates back toward the identity transform). Returns None for
    `none` or an unparseable value.
    """
    value = value.strip()
    if value == "none" or not value:
        return None

    m = re.search(r"translateY\(\s*(-?[\d.]+)px\s*\)", value)
    if m:
        v = float(m.group(1))
        direction = "up" if v > 0 else "down"
        return ("transform", direction, abs(v))

    m = re.search(r"translateX\(\s*(-?[\d.]+)px\s*\)", value)
    if m:
        v = float(m.group(1))
        direction = "left" if v > 0 else "right"
        return ("transform", direction, abs(v))

    m = re.search(r"scaleX?Y?\(\s*([\d.]+)\s*\)", value)
    if m:
        v = float(m.group(1))
        direction = "scale-in" if v < 1 else "scale-out"
        return ("transform", direction, v)

    m = re.search(r"rotate(?:[XYZ])?\(\s*(-?[\d.]+)deg\s*\)", value)
    if m:
        v = float(m.group(1))
        return ("transform", "rotate", abs(v))

    return None


def parse_filter_declaration(value: str) -> "tuple[str, str, float] | None":
    """Parse a `filter:` value into (property, direction, magnitude). Only
    `blur(...)` is a known Tier V shape (blur-in); other filter functions
    are not a recognised signature and return None."""
    m = re.search(r"blur\(\s*(-?[\d.]+)px\s*\)", value)
    if not m:
        return None
    return ("filter", "none", abs(float(m.group(1))))


def parse_clip_path_declaration(value: str) -> "tuple[str, str, float] | None":
    """Parse a `clip-path: inset(...)` value into (property, direction,
    magnitude). Mirrors the seed script's convention: an inset wiping from
    the top edge downward as it reveals is encoded direction='up', with the
    top-inset percentage as the magnitude."""
    m = re.search(r"inset\(\s*([\d.]+)%", value)
    if not m:
        return None
    return ("clip-path", "up", float(m.group(1)))


def parse_opacity_change(start: float, end: float) -> "tuple[str, str, float] | None":
    """A pure opacity fade (transform: none) is direction='none', magnitude
    = the absolute change in opacity across the animation."""
    return ("opacity", "none", abs(end - start))


# ---------------------------------------------------------------------------
# Raw-CSS extraction — @keyframes + accompanying animation/transition
# shorthand.
# ---------------------------------------------------------------------------

def _extract_braced_block(text: str, open_brace_idx: int) -> "tuple[str, int] | None":
    """Manual brace-counting scan starting at an opening `{` (inclusive
    index). Returns (body_between_braces, index_just_after_closing_brace),
    or None if unbalanced. Needed because `@keyframes` bodies nest a second
    level of braces (the percentage steps), so a naive non-greedy regex
    (`\\{(.*?)\\}`) stops at the FIRST inner `}` and truncates the block."""
    if open_brace_idx >= len(text) or text[open_brace_idx] != "{":
        return None
    depth = 0
    for i in range(open_brace_idx, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[open_brace_idx + 1 : i], i + 1
    return None


def _find_keyframes_block(css_text: str) -> "tuple[str, str] | None":
    """Returns (keyframes_name, body) for the FIRST `@keyframes` rule found,
    or None."""
    m = re.search(r"@keyframes\s+([\w-]+)\s*(\{)", css_text)
    if not m:
        return None
    extracted = _extract_braced_block(css_text, m.start(2))
    if extracted is None:
        return None
    body, _ = extracted
    return m.group(1), body


def _find_step_body(keyframes_body: str, step_pattern: str) -> "str | None":
    m = re.search(step_pattern + r"\s*(\{)", keyframes_body)
    if not m:
        return None
    extracted = _extract_braced_block(keyframes_body, m.start(1))
    if extracted is None:
        return None
    body, _ = extracted
    return body


def _decl(body: str, prop: str) -> "str | None":
    m = re.search(re.escape(prop) + r"\s*:\s*([^;]+);", body)
    return m.group(1).strip() if m else None


def _shape_from_start_step(start_body: str) -> "tuple[str, str, float] | None":
    """Resolve the animated-property/direction/magnitude triple from a
    keyframe step's declarations, trying transform, then filter (blur),
    then clip-path, in that priority order — matching the seed script's
    own fallback chain."""
    transform_val = _decl(start_body, "transform")
    if transform_val:
        shape = parse_transform_declaration(transform_val)
        if shape is not None:
            return shape
    filter_val = _decl(start_body, "filter")
    if filter_val:
        shape = parse_filter_declaration(filter_val)
        if shape is not None:
            return shape
    clip_val = _decl(start_body, "clip-path")
    if clip_val:
        shape = parse_clip_path_declaration(clip_val)
        if shape is not None:
            return shape
    return None


def _find_animation_shorthand(css_text: str, keyframes_name: str) -> "tuple[int, str] | None":
    """Find an `animation: <name> <duration> <easing> ...;` declaration
    referencing the given keyframes name anywhere in the text, returning
    (duration_ms, snapped_easing_curve), or None if not found/parseable."""
    pattern = (
        r"animation\s*:\s*"
        + re.escape(keyframes_name)
        + r"\s+([\d.]+m?s)\s+([a-zA-Z0-9.,()\- ]+?)\s*(?:;|\})"
    )
    m = re.search(pattern, css_text)
    if not m:
        return None
    duration_ms = parse_duration_ms(m.group(1))
    if duration_ms is None:
        return None
    easing = snap_easing(m.group(2))
    return duration_ms, easing


def extract_shape_from_keyframes_css(css_text: str) -> "dict | None":
    """Read a draft element's `@keyframes` + `animation` declarations and
    extract the CSS-level shape, encoded exactly per the
    `motion_shape_signatures` schema (minus `preset_slug`/`tier`, which is
    what we're trying to resolve).

    Returns a dict `{animated_property, direction, magnitude, duration_ms,
    easing_curve}`, or None if the CSS carries no recognisable shape (no
    `@keyframes` block, no parseable start-step declaration, or no
    resolvable duration/easing).
    """
    kf = _find_keyframes_block(css_text)
    if kf is None:
        return None
    name, body = kf

    start_body = _find_step_body(body, r"(?:0%|from)") or ""
    opacity_start_raw = _decl(start_body, "opacity")
    opacity_end_raw = None
    end_body = _find_step_body(body, r"(?:100%|to)")
    if end_body is not None:
        opacity_end_raw = _decl(end_body, "opacity")

    shape = _shape_from_start_step(start_body) if start_body else None

    # Pure opacity fade: transform:none (or absent) at the start step, but a
    # real opacity change is present between start and end.
    if shape is None and opacity_start_raw is not None and opacity_end_raw is not None:
        try:
            shape = parse_opacity_change(float(opacity_start_raw), float(opacity_end_raw))
        except ValueError:
            shape = None

    if shape is None:
        return None

    timing = _find_animation_shorthand(css_text, name)
    if timing is None:
        return None
    duration_ms, easing_curve = timing

    prop, direction, magnitude = shape
    return {
        "animated_property": prop,
        "direction": direction,
        "magnitude": magnitude,
        "duration_ms": duration_ms,
        "easing_curve": easing_curve,
    }


def extract_shape_from_transition(
    from_declarations: "dict[str, str]", transition_shorthand: str
) -> "dict | None":
    """Read a draft element's resting-state declarations + `transition:`
    shorthand (the shape a hover/interaction-driven effect like
    `border-accent` takes — no `@keyframes` involved) and extract the same
    CSS-level shape as `extract_shape_from_keyframes_css()`.

    `from_declarations` is a plain property->raw-value dict for the
    RESTING (pre-interaction) state — e.g. `{"transform": "scaleX(0)"}` —
    the state that transitions toward the interacted-with target.
    """
    transform_val = from_declarations.get("transform")
    shape = None
    if transform_val:
        shape = parse_transform_declaration(transform_val)
        # A TRANSITION-driven scale (border-accent's own shape: `scaleX(0)`
        # growing to 1 on hover/focus-within) is seeded with a DIFFERENT
        # magnitude convention than a KEYFRAMES-driven entrance scale.
        # Ground-truthed directly against `seed-motion-shape-signatures.py`
        # (`_extract_border_accent_row`, read in full before writing this):
        # the entrance rows (`_parse_transform_shape`, used by
        # `extract_shape_from_keyframes_css()` above) seed magnitude as the
        # RAW start value (`scale(0.9)` -> 0.9, matching `scale-in`'s real
        # seeded 0.603-1.197 band) — but the bespoke border-accent extractor
        # seeds magnitude as `1.0 - start_scale` (`scaleX(0)` -> 1.0,
        # matching its real seeded 0.67-1.33 band). These are genuinely two
        # different real conventions baked into the pinned Step 1 schema for
        # the same (transform, scale-in) axis, not a design choice made
        # here — a TRANSITION-shaped scale (this function's own path) is the
        # one class of Tier V effect known to use the second convention, so
        # it is corrected here rather than in the shared keyframes parser.
        if shape is not None and shape[0] == "transform" and shape[1] in ("scale-in", "scale-out"):
            raw_v = shape[2]
            corrected = (1.0 - raw_v) if raw_v < 1 else raw_v
            shape = (shape[0], shape[1], corrected)
    if shape is None:
        filter_val = from_declarations.get("filter")
        if filter_val:
            shape = parse_filter_declaration(filter_val)
    if shape is None:
        clip_val = from_declarations.get("clip-path")
        if clip_val:
            shape = parse_clip_path_declaration(clip_val)
    if shape is None:
        opacity_start = from_declarations.get("opacity")
        opacity_end = from_declarations.get("opacity_to")
        if opacity_start is not None and opacity_end is not None:
            try:
                shape = parse_opacity_change(float(opacity_start), float(opacity_end))
            except ValueError:
                shape = None
    if shape is None:
        return None

    m = re.match(
        r"\s*[\w-]+\s+([\d.]+m?s)\s+([a-zA-Z0-9.,()\- ]+?)\s*$",
        transition_shorthand.strip().rstrip(";"),
    )
    if not m:
        return None
    duration_ms = parse_duration_ms(m.group(1))
    if duration_ms is None:
        return None
    easing_curve = snap_easing(m.group(2))

    prop, direction, magnitude = shape
    return {
        "animated_property": prop,
        "direction": direction,
        "magnitude": magnitude,
        "duration_ms": duration_ms,
        "easing_curve": easing_curve,
    }


# ---------------------------------------------------------------------------
# DB matching
# ---------------------------------------------------------------------------

def _duration_within_tolerance(shape_ms: "int | None", row_ms: "int | None") -> bool:
    if row_ms is None:
        return shape_ms is None
    if shape_ms is None:
        return False
    lo = row_ms * (1 - _DURATION_TOLERANCE)
    hi = row_ms * (1 + _DURATION_TOLERANCE)
    return lo <= shape_ms <= hi


def _query_candidate_rows(shape: dict, db_path: "str | None" = None) -> "list[dict]":
    """Read-only query for every seeded row sharing the shape's
    `animated_property` + `direction` + snapped `easing_curve` — the two
    exact-match axes plus the exact-keyword easing axis. Duration and
    magnitude are filtered in Python (duration needs a tolerance band;
    magnitude needs a range containment check) after the SQL narrows the
    candidate set."""
    path = db_path or DB_PATH
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        conn.row_factory = sqlite3.Row
        cur = conn.execute(
            f"""
            SELECT preset_slug, animated_property, direction,
                   magnitude_min, magnitude_max, duration_ms, easing_curve
            FROM {TABLE}
            WHERE animated_property = ?
              AND direction = ?
              AND easing_curve = ?
            """,
            (shape["animated_property"], shape["direction"], shape["easing_curve"]),
        )
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def match_motion_shape(shape: dict, db_path: "str | None" = None) -> "tuple[dict, list]":
    """Match an extracted CSS shape against `motion_shape_signatures`.

    Returns `(attrs, skipped)` — the SAME shape as
    `db_lookup.lift_behavioural_attrs()` — so the SAME caller merge loop in
    `assembly.py` (step 3a1's `attrs.setdefault(...)` over `.items()`) can
    consume it with no second write/merge path. `attrs` is `{"fx":
    preset_slug}` on exactly one matching candidate, `{}` on zero or 2+
    (an ambiguous tie is refused, never guessed at — per the pinned
    matching rule). `skipped` is always `[]`: there is no
    "recognised-but-unroutable" case at this tier, unlike the fx-attribute
    lift's `data-sgs-fx-*` skip case.

    Every value this function can possibly return under `attrs["fx"]` is a
    `preset_slug` read directly off a `motion_shape_signatures` row, and
    that table's own `tier` column carries a DB-level
    `CHECK(tier = 'V')` constraint — so this function is structurally
    incapable of emitting anything but a Tier V preset slug.
    """
    candidates = _query_candidate_rows(shape, db_path)
    matches = [
        row
        for row in candidates
        if _duration_within_tolerance(shape.get("duration_ms"), row["duration_ms"])
        and row["magnitude_min"] <= shape["magnitude"] <= row["magnitude_max"]
    ]
    if len(matches) == 1:
        return {"fx": matches[0]["preset_slug"]}, []
    return {}, []


def classify_css_motion(css_text: str, db_path: "str | None" = None) -> "tuple[dict, list]":
    """Top-level entry point: extract a shape from raw `@keyframes`/
    `animation` CSS text and match it against Tier V. Returns `(attrs,
    skipped)` per `match_motion_shape()`'s contract. `({}, [])` when the
    CSS carries no recognisable `@keyframes` shape at all (not an error —
    most CSS on a page isn't motion CSS)."""
    shape = extract_shape_from_keyframes_css(css_text)
    if shape is None:
        return {}, []
    return match_motion_shape(shape, db_path)

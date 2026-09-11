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

MATCHING RULE (pinned in Step 3, AMENDED by Fix 6 — see that comment block
before touching easing logic)
----------------------------------------------------
Exact match required on `animated_property` and `direction`. `duration_ms`
matches within a tolerance band (Fix 3). `easing_curve` matches by FAMILY
(`ease`/`ease-in`/`ease-out`/`ease-in-out` pooled as one family; `linear`
stays strict/ungrouped) for every preset EXCEPT `scale-in`/`border-accent`,
which keep exact-keyword matching — that pair is the one case in the seeded
table where easing is the ONLY axis telling two overlapping rows apart, and
pooling them destroys a currently-correct match (see `_easing_matches` +
Fix 6 comment in the DB-matching section). A candidate matches on magnitude
when the shape's parsed
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
# Kept as the RELATIVE component of the tolerance window (Fix 3 below adds
# an absolute floor/ceiling on top of it; it does not replace it).
_DURATION_TOLERANCE = 0.20

# Fix 3 (2026-09-11 coverage report, root cause #3 — the second-largest
# real-world miss, independent of the name-order parsing bug). Every
# seeded row's `duration_ms` reflects SGS's OWN internal preset default
# (250ms/300ms), not a real-world convention — real sites measured across
# all 3 live production pages used 250ms-900ms for the SAME shapes this
# table already recognises (a confirmed Locomotive `scale-in`-shaped
# preloader at 900ms; a `.c-preloader` fade at 900ms), with the report's
# own 5000ms outlier example excluded here on separate grounds (declined
# as multi-step by Fix 4). A tight +/-20% RELATIVE band around a single
# internal default (240-360ms) rejects every one of those real,
# legitimate durations outright before the DB match is even attempted.
#
# Fixed as an ABSOLUTE floor/ceiling unioned with the existing relative
# band, in the tolerance CALCULATION (`_duration_within_tolerance` below)
# — not by hand-editing each seeded row's `duration_ms` — so it applies
# uniformly to every current and future row. The floor (200ms) sits just
# below `border-accent`'s own 250ms native default (real hover/interaction
# transitions commonly run a little faster than an entrance) while still
# excluding sub-200ms decorative micro-flicker (Framer's 10ms cursor-blink,
# explicitly noted in the report as "not genuinely Tier V motion content").
# The ceiling (5000ms) is the report's own observed real-world upper bound
# for a genuine (if ultimately declined) entrance/fade effect. Duration is
# a comparatively weak identity signal once property + direction +
# magnitude + easing already agree (the SAME visual shape is routinely
# authored at very different tempos by different sites) — widening it this
# far does not risk a false MATCH on its own, because a duration outside
# every candidate's window still falls through to `({}, [])`, and two
# candidates whose bands now both cover the same duration still resolve
# via the existing tie-refusal rule, never a guess.
_REAL_WORLD_DURATION_FLOOR_MS = 200.0
_REAL_WORLD_DURATION_CEILING_MS = 5000.0

# Fix 6 (2026-09-11 real-world re-measurement, post Fix 1-5). `easing_curve`
# was pinned as an EXACT snapped-keyword match (module docstring's "MATCHING
# RULE"). Real-world evidence disproves that as a blanket rule for the same
# reason Fix 3 disproved a tight duration band: 3 confirmed real declarations
# (TAG Heuer's `onetrust-fade-in` longhand `ease-in-out`, Locomotive's
# `.c-preloader` fade defaulting a `cubic-bezier(...)` to snapped `'ease'`,
# Locomotive's `.c-scrollbar` omitting easing entirely and defaulting to
# `'ease'`) are all genuine `fade-in` shapes (opacity/none/300ms-band) that
# only fail to match because their easing keyword isn't the DB row's exact
# `'ease-out'` — visually, `ease`/`ease-in`/`ease-out`/`ease-in-out` are
# close enough to be the same authored INTENT ("ease it"), unlike `linear`,
# which is visually distinct (constant velocity, no acceleration curve) and
# stays a strict, ungrouped keyword.
#
# BUT pooling those 4 keywords is NOT safe as a blanket rule. Ground-truthed
# directly against the seeded `motion_shape_signatures` table (18 rows,
# `sgs-framework.db`): `scale-in` (transform/scale-in/0.603-1.197/300ms/
# `ease-out`) and `border-accent` (transform/scale-in/0.67-1.33/250ms/
# `ease`) are the ONE pair in the whole table sharing the same
# `animated_property` + `direction`, with duration bands that both collapse
# into the same real-world 200-5000ms window (Fix 3), AND overlapping
# magnitude bands (0.67-1.197 overlap) — the ONLY axis still telling them
# apart is the exact easing keyword. Locomotive's own real `preloaderAppear`
# (keyframes scale(.9)->scale(1), 900ms, `cubic-bezier(...)` snapping to
# `'ease'`) sits exactly in that overlap and is CORRECTLY resolved today to
# `border-accent` (exact `'ease'` match, `scale-in` needs exact `'ease-out'`
# and is excluded) — pooling the family here would make BOTH rows match
# (scale-in via family, border-accent via its own exact keyword), producing
# an unresolvable tie and destroying a currently-correct match. That is a
# real regression, not a hypothetical one — verified directly by re-running
# `preloaderAppear` through this module with a naive pooled-family query.
#
# Fixed narrowly: family-tolerant easing applies to every row EXCEPT the
# `scale-in`/`border-accent` pair, which keeps exact-keyword matching (their
# own DB `easing_curve` value, unchanged). Do NOT simplify this back into a
# blanket pooled comparison — that reintroduces the exact regression this
# comment documents. If a future seed-table change removes the
# scale-in/border-accent magnitude-band overlap (or the pair is retired),
# revisit whether this exemption is still needed.
_EASING_FAMILIES: "tuple[frozenset[str], ...]" = (
    frozenset({"ease", "ease-in", "ease-out", "ease-in-out"}),
    frozenset({"linear"}),
)

# The one pair distinguished solely by exact easing keyword (see Fix 6
# above) — these preset slugs are matched on their own exact `easing_curve`
# value regardless of family, never pooled.
_EXACT_EASING_ONLY_PRESETS = frozenset({"scale-in", "border-accent"})


def _easing_family(curve: str) -> "frozenset[str]":
    for family in _EASING_FAMILIES:
        if curve in family:
            return family
    return frozenset({curve})


def _easing_matches(shape_easing: str, row_easing: str, preset_slug: str) -> bool:
    """True if a shape's snapped easing is compatible with a candidate row's
    seeded easing, per the exemption documented in Fix 6 above."""
    if preset_slug in _EXACT_EASING_ONLY_PRESETS:
        return shape_easing == row_easing
    return _easing_family(shape_easing) == _easing_family(row_easing)


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

# Standard browser default root font-size, used ONLY to convert a `rem`
# translate distance into the same px-equivalent magnitude-space every
# seeded row is expressed in. There is no better signal resolvable from
# static CSS text alone (no access to a real `<html>` element's computed
# font-size) — documented assumption, Fix 2 (2026-09-11 coverage report,
# root cause #2: TAG Heuer's `slideUp` used `translateY(10rem)`, silently
# mis-shaped to a bare opacity change because `rem` wasn't recognised).
_REM_TO_PX = 16.0


def _parse_length_token(raw: str) -> "float | None":
    """Parse a `px`/`%`/`rem` length/percentage token into a magnitude.

    `rem` converts to a px-equivalent via `_REM_TO_PX` so it lands in the
    same magnitude-space as every seeded (px) row. `%` is intentionally
    NOT converted to px — a translate percentage is relative to the
    element's own box size, which is not resolvable from static CSS text,
    so it is returned as its literal percentage number unchanged. This
    means a `%`-based shape is correctly EXTRACTED (Fix 2) instead of
    silently dropped, but will only ever match a seeded row whose own band
    happens to be expressed in the same percentage-scale numbers — it is
    never coerced into false agreement with a px-scale band.
    """
    m = re.match(r"^(-?[\d.]+)(px|%|rem)$", raw.strip())
    if not m:
        return None
    value, unit = float(m.group(1)), m.group(2)
    if unit == "rem":
        return value * _REM_TO_PX
    return value


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

    m = re.search(r"translateY\(\s*(-?[\d.]+(?:px|%|rem))\s*\)", value)
    if m:
        v = _parse_length_token(m.group(1))
        if v is not None:
            direction = "up" if v > 0 else "down"
            return ("transform", direction, abs(v))

    m = re.search(r"translateX\(\s*(-?[\d.]+(?:px|%|rem))\s*\)", value)
    if m:
        v = _parse_length_token(m.group(1))
        if v is not None:
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


# Fix 1 (2026-09-11 coverage report, root cause #1 — the single largest
# real-world miss). The ORIGINAL implementation assumed the `animation`
# shorthand is always authored `<name> <duration> <easing> ...` (name
# first). Every real declaration read off a LIVE page's rendered CSSOM
# across all 3 measured sites serialised the shorthand in the CSS spec's
# own canonical order instead — `duration easing delay count direction
# fill-mode play-state name` — with the name LAST, not first. This is
# standard browser CSSOM serialisation, not a quirk of those 3 sites, so it
# recurs on effectively any live page scraped the same way. Fixed by
# parsing the individual LONGHAND properties first (`animation-name` /
# `animation-duration` / `animation-timing-function` — unambiguous
# regardless of shorthand order, and what `getComputedStyle` exposes
# directly), then falling back to a shorthand reader that tokenises the
# value and identifies duration/easing BY SHAPE (a `<time>` token, a known
# easing keyword or `cubic-bezier(...)`/`steps(...)` token) rather than by
# position — so both name-first (draft-authored) and name-last (live-CSSOM)
# orders work identically.

_EASING_KEYWORDS = {"linear", "ease", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end"}
_TIME_TOKEN_RE = re.compile(r"^-?[\d.]+m?s$")


def _tokenize_shorthand_value(value: str) -> "list[str]":
    """Split a shorthand value on top-level whitespace only — a
    parenthesised function like `cubic-bezier(0.215, 0.61, 0.355, 1)`
    contains internal spaces (after each comma) that must NOT be treated as
    token boundaries, so depth-tracking is required rather than a plain
    `.split()`."""
    tokens: "list[str]" = []
    buf = ""
    depth = 0
    for ch in value:
        if ch == "(":
            depth += 1
            buf += ch
        elif ch == ")":
            depth -= 1
            buf += ch
        elif ch.isspace() and depth == 0:
            if buf:
                tokens.append(buf)
                buf = ""
        else:
            buf += ch
    if buf:
        tokens.append(buf)
    return tokens


def _split_comma_top_level(value: str) -> "list[str]":
    """Split a longhand property's value on top-level commas (multiple
    simultaneous `animation-name`/`animation-duration`/
    `animation-timing-function` values), respecting parenthesised
    functions."""
    parts: "list[str]" = []
    buf = ""
    depth = 0
    for ch in value:
        if ch == "(":
            depth += 1
            buf += ch
        elif ch == ")":
            depth -= 1
            buf += ch
        elif ch == "," and depth == 0:
            parts.append(buf.strip())
            buf = ""
        else:
            buf += ch
    if buf.strip():
        parts.append(buf.strip())
    return parts


def _find_animation_longhand(css_text: str, keyframes_name: str) -> "tuple[int, str] | None":
    """Read `animation-name` + `animation-duration` +
    `animation-timing-function` as separate longhand declarations —
    unambiguous regardless of shorthand order, and the exact surface
    `getComputedStyle` exposes directly. Returns (duration_ms,
    snapped_easing_curve), or None if `animation-name` doesn't reference
    `keyframes_name` at all, or duration is missing/unparseable.
    `animation-timing-function` absent -> defaults to `ease` (the browser's
    real default), matching Fix 5's same reasoning for `transition`.
    """
    name_m = re.search(r"animation-name\s*:\s*([^;]+);", css_text)
    if not name_m:
        return None
    names = _split_comma_top_level(name_m.group(1))
    if keyframes_name not in names:
        return None
    idx = names.index(keyframes_name)

    dur_m = re.search(r"animation-duration\s*:\s*([^;]+);", css_text)
    if not dur_m:
        return None
    durations = _split_comma_top_level(dur_m.group(1))
    duration_raw = durations[idx] if idx < len(durations) else durations[0]
    duration_ms = parse_duration_ms(duration_raw)
    if duration_ms is None:
        return None

    easing_m = re.search(r"animation-timing-function\s*:\s*([^;]+);", css_text)
    if easing_m:
        easings = _split_comma_top_level(easing_m.group(1))
        easing_raw = easings[idx] if idx < len(easings) else easings[0]
        easing = snap_easing(easing_raw)
    else:
        easing = "ease"

    return duration_ms, easing


def _find_animation_shorthand(css_text: str, keyframes_name: str) -> "tuple[int, str] | None":
    """Find an `animation:` shorthand declaration referencing the given
    keyframes name anywhere in the text, returning (duration_ms,
    snapped_easing_curve), or None if not found/parseable. Order-agnostic
    (Fix 1): identifies the duration token as the first `<time>`-shaped
    token, and the easing token as the first token matching a known easing
    keyword or a `cubic-bezier(...)`/`steps(...)` function — wherever
    either appears in the shorthand — rather than assuming a fixed
    position. `animation-timing-function` omitted from the shorthand
    -> defaults to `ease` (mirrors Fix 5's `transition` default)."""
    for m in re.finditer(r"animation\s*:\s*([^;{}]+)[;}]", css_text):
        value = m.group(1)
        tokens = _tokenize_shorthand_value(value)
        if keyframes_name not in tokens:
            continue

        time_tokens = [t for t in tokens if _TIME_TOKEN_RE.match(t)]
        if not time_tokens:
            continue
        duration_ms = parse_duration_ms(time_tokens[0])
        if duration_ms is None:
            continue

        easing = "ease"
        for t in tokens:
            if t in _EASING_KEYWORDS or t.startswith("cubic-bezier(") or t.startswith("steps("):
                easing = snap_easing(t)
                break

        return duration_ms, easing
    return None


def _find_animation_timing(css_text: str, keyframes_name: str) -> "tuple[int, str] | None":
    """Top-level timing lookup: longhand properties first (unambiguous),
    falling back to the order-agnostic shorthand reader. Either path
    returns (duration_ms, snapped_easing_curve), or None."""
    result = _find_animation_longhand(css_text, keyframes_name)
    if result is not None:
        return result
    return _find_animation_shorthand(css_text, keyframes_name)


def _keyframes_step_percentages(body: str) -> "set[float]":
    """Normalise every step-selector in a `@keyframes` body to a set of
    percentages (0%/`from` -> 0.0, 100%/`to` -> 100.0, `N%` -> N), including
    comma-grouped multi-selectors on one rule (`0%, 100% { ... }`)."""
    steps: "set[float]" = set()
    for m in re.finditer(
        r"(?:\d+(?:\.\d+)?%|from\b|to\b)(?:\s*,\s*(?:\d+(?:\.\d+)?%|from\b|to\b))*\s*\{",
        body,
    ):
        for token in re.findall(r"\d+(?:\.\d+)?%|from|to", m.group(0)):
            if token == "from":
                steps.add(0.0)
            elif token == "to":
                steps.add(100.0)
            else:
                steps.add(float(token.rstrip("%")))
    return steps


def extract_shape_from_keyframes_css(css_text: str) -> "dict | None":
    """Read a draft element's `@keyframes` + `animation` declarations and
    extract the CSS-level shape, encoded exactly per the
    `motion_shape_signatures` schema (minus `preset_slug`/`tier`, which is
    what we're trying to resolve).

    Returns a dict `{animated_property, direction, magnitude, duration_ms,
    easing_curve}`, or None if the CSS carries no recognisable shape (no
    `@keyframes` block, no parseable start-step declaration, no resolvable
    duration/easing, or — Fix 4 — a genuinely multi-step, non-monotonic
    keyframes body).
    """
    kf = _find_keyframes_block(css_text)
    if kf is None:
        return None
    name, body = kf

    # Fix 4 (2026-09-11 coverage report, root cause #4). The ORIGINAL
    # implementation only ever read the 0%/100% (or from/to) steps,
    # silently REDUCING any intermediate step to nothing — this produced a
    # confirmed MISCLASSIFY (an overshoot/bounce shape collapsed to a plain
    # scale-in) and a confirmed degenerate read (an appear-THEN-disappear
    # fade collapsed to a plain fade-in, when it actually starts AND ends
    # at opacity 0). Per this project's "never guess" discipline, a
    # keyframes body carrying any step OTHER than 0%/from/100%/to is
    # DECLINED outright (no shape, no guess) rather than silently reduced —
    # a declined match is safe; a wrong match is not.
    step_percentages = _keyframes_step_percentages(body)
    if step_percentages - {0.0, 100.0}:
        return None

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

    timing = _find_animation_timing(css_text, name)
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

    # Fix 5 (2026-09-11 coverage report, root cause #5). Easing is a
    # genuinely OPTIONAL token in the `transition` shorthand — the browser
    # defaults to `ease` when it's omitted (Locomotive's real
    # `.c-scrollbar { transition: transform 0.3s, opacity 0.3s; }`, no
    # easing token at all). The ORIGINAL regex required an explicit easing
    # token and returned None outright when absent, discarding a
    # perfectly real, common shape. The easing group is now optional;
    # absence defaults to `'ease'` rather than failing the whole match.
    m = re.match(
        r"\s*[\w-]+\s+([\d.]+m?s)(?:\s+([a-zA-Z0-9.,()\- ]+?))?\s*$",
        transition_shorthand.strip().rstrip(";"),
    )
    if not m:
        return None
    duration_ms = parse_duration_ms(m.group(1))
    if duration_ms is None:
        return None
    easing_raw = m.group(2)
    easing_curve = snap_easing(easing_raw) if easing_raw else "ease"

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
    # Fix 3: relative +/-20% band around the row's own native default,
    # UNIONED with the real-world absolute floor/ceiling — whichever is
    # wider wins on each side. A slow-default row's own relative band can
    # already exceed the absolute ceiling (e.g. a 3s preset's own +20% is
    # 3.6s > the 5s ceiling would not apply there); a fast-default row's
    # relative band is narrower than real-world territory, so the absolute
    # floor/ceiling takes over.
    lo = min(row_ms * (1 - _DURATION_TOLERANCE), _REAL_WORLD_DURATION_FLOOR_MS)
    hi = max(row_ms * (1 + _DURATION_TOLERANCE), _REAL_WORLD_DURATION_CEILING_MS)
    return lo <= shape_ms <= hi


def _query_candidate_rows(shape: dict, db_path: "str | None" = None) -> "list[dict]":
    """Read-only query for every seeded row sharing the shape's
    `animated_property` + `direction` — the two exact-match axes. Easing is
    NOT filtered in SQL (Fix 6): it needs per-row exempt-vs-pooled logic
    (`_easing_matches`) that SQL can't express cleanly, so it is filtered in
    Python alongside duration (tolerance band) and magnitude (range
    containment) in `match_motion_shape()`."""
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
            """,
            (shape["animated_property"], shape["direction"]),
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
        if _easing_matches(shape["easing_curve"], row["easing_curve"], row["preset_slug"])
        and _duration_within_tolerance(shape.get("duration_ms"), row["duration_ms"])
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

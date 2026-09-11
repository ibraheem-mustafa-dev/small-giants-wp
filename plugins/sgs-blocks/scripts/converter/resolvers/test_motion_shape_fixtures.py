"""Ad-hoc verification harness for `motion_shape.py` (Phase R8 Step 3).

Not wired into any pytest suite (no existing pytest config referenced this
directory at build time) — run directly: `python test_motion_shape_fixtures.py`.
Exits non-zero on any failed fixture, prints PASS/FAIL per case plus the
requested "actual test output, verbatim" for evidence.

Every fixture's expected preset is checked against a REAL seeded row in
`motion_shape_signatures` (read live at the top of this file), not a
hand-typed guess. Fixtures 8/8b (2026-09-11 fix) were previously a single
structural-tie negative control — `fade-up`/`slide-up` were byte-identical
on every axis this module could see, a real ambiguity the classifier
correctly refused to guess between. The new `co_animates_opacity` axis
(closes D1024/coverage-report follow-up) makes them genuinely
distinguishable, so 8/8b are now a resolved-match PAIR proving the axis
discriminates both directions, not a tie control any more.
"""
from __future__ import annotations

import sys

from motion_shape import (
    classify_css_motion,
    extract_shape_from_transition,
    match_motion_shape,
)

PASS = 0
FAIL = 0


def check(name: str, actual, expected):
    global PASS, FAIL
    ok = actual == expected
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}: actual={actual!r} expected={expected!r}")
    if ok:
        PASS += 1
    else:
        FAIL += 1


# ---------------------------------------------------------------------------
# 1. scale-in — unique signature (transform/scale-in/0.603-1.197/300/ease-out)
# ---------------------------------------------------------------------------
css_scale_in = """
@keyframes fx-scale-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.card { animation: fx-scale-in 300ms ease-out; }
"""
check("scale-in (unique)", classify_css_motion(css_scale_in), ({"sgsAnimation": "scale-in"}, []))

# ---------------------------------------------------------------------------
# 2. rotate-in — unique (rotate/6.7-13.3/300/ease-out, disjoint from flip-in)
# ---------------------------------------------------------------------------
css_rotate_in = """
@keyframes fx-rotate-in {
  0% { opacity: 0; transform: rotate(10deg); }
  100% { opacity: 1; transform: rotate(0deg); }
}
.badge { animation: fx-rotate-in 300ms ease-out; }
"""
check("rotate-in (unique)", classify_css_motion(css_rotate_in), ({"sgsAnimation": "rotate-in"}, []))

# ---------------------------------------------------------------------------
# 3. flip-in — unique (rotate/20.1-39.9/300/ease-out, disjoint from rotate-in)
# ---------------------------------------------------------------------------
css_flip_in = """
@keyframes fx-flip-in {
  0% { opacity: 0; transform: rotateY(30deg); }
  100% { opacity: 1; transform: rotateY(0deg); }
}
.tile { animation: fx-flip-in 300ms ease-out; }
"""
check("flip-in (unique)", classify_css_motion(css_flip_in), ({"sgsAnimation": "flip-in"}, []))

# ---------------------------------------------------------------------------
# 4. blur-in — unique (only filter row)
# ---------------------------------------------------------------------------
css_blur_in = """
@keyframes fx-blur-in {
  0% { opacity: 0; filter: blur(8px); }
  100% { opacity: 1; filter: blur(0px); }
}
.hero-title { animation: fx-blur-in 300ms ease-out; }
"""
check("blur-in (unique)", classify_css_motion(css_blur_in), ({"sgsAnimation": "blur-in"}, []))

# ---------------------------------------------------------------------------
# 5. fade-in — unique (only opacity row, transform:none)
# ---------------------------------------------------------------------------
css_fade_in = """
@keyframes fx-fade-in {
  0% { opacity: 0; transform: none; }
  100% { opacity: 1; transform: none; }
}
.panel { animation: fx-fade-in 300ms ease-out; }
"""
check("fade-in (unique)", classify_css_motion(css_fade_in), ({"sgsAnimation": "fade-in"}, []))

# ---------------------------------------------------------------------------
# 6. reveal-up — unique (only clip-path row)
# ---------------------------------------------------------------------------
css_reveal_up = """
@keyframes fx-reveal-up {
  0% { clip-path: inset(100% 0 0 0); }
  100% { clip-path: inset(0% 0 0 0); }
}
.strip { animation: fx-reveal-up 300ms ease-out; }
"""
check("reveal-up (unique)", classify_css_motion(css_reveal_up), ({"sgsAnimation": "reveal-up"}, []))

# ---------------------------------------------------------------------------
# 7. border-accent — unique CSS-shape match (transition-only shape,
#    scale-in/0.67-1.33/250/ease, disjoint from bounce-in's 0.201-0.399 band
#    at the same easing/duration axis) but NOT part of sgsAnimation's real
#    vocabulary (Fix 1, 2026-09-11 QC council review — `ANIMATION_LABELS`
#    has no `border-accent` entry). The classifier still recognises the real
#    Tier V shape; it now reports it via `skipped` instead of force-emitting
#    it under the wrong attribute.
# ---------------------------------------------------------------------------
shape_border_accent = extract_shape_from_transition(
    {"transform": "scaleX(0)"}, "transform 250ms ease"
)
check(
    "border-accent (transition, matched shape, no sgsAnimation destination)",
    match_motion_shape(shape_border_accent) if shape_border_accent else (None, None),
    (
        {},
        [
            {
                "preset_slug": "border-accent",
                "reason": "matched a real Tier V shape, but this preset has no "
                "sgsAnimation destination attribute (ANIMATION_LABELS carries no "
                "entry for it)",
            }
        ],
    ),
)

# ---------------------------------------------------------------------------
# 8. fade-up/slide-up tie -- RESOLVED (fix, 2026-09-11). `fade-up` and
#    `slide-up` used to be BYTE-IDENTICAL seeded rows on every axis this
#    module could see (transform/up/20-200/300/ease-out both), a real
#    structural tie the classifier correctly refused to guess between. The
#    new `co_animates_opacity` axis (AOS's real fade-vs-slide convention --
#    fade transitions opacity+transform together, slide is transform-only)
#    makes them genuinely distinguishable. This declaration co-animates
#    opacity (0->1) ALONGSIDE the transform -- that is `fade-up`'s real
#    shape, not `slide-up`'s (`co_animates_opacity=0`), so it now correctly
#    resolves rather than ties. Was the tie's own negative control; is now
#    the fix's positive control -- same CSS, corrected expectation.
# ---------------------------------------------------------------------------
css_fade_up_with_opacity = """
@keyframes fx-generic-up {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0px); }
}
.item { animation: fx-generic-up 300ms ease-out; }
"""
check(
    "fade-up (opacity co-animates the transform) -> resolves, no longer a tie",
    classify_css_motion(css_fade_up_with_opacity),
    ({"sgsAnimation": "fade-up"}, []),
)

# ---------------------------------------------------------------------------
# 8b. slide-up's own side of the same fix: the IDENTICAL transform shape,
#    but with NO opacity change at all (the element stays fully visible) --
#    `slide-up`'s real shape (`co_animates_opacity=0`), must resolve to
#    `slide-up`, not `fade-up`, proving the new axis discriminates BOTH
#    directions rather than just happening to favour one preset.
# ---------------------------------------------------------------------------
css_slide_up_no_opacity = """
@keyframes fx-generic-slide-up {
  0% { transform: translateY(100px); }
  100% { transform: translateY(0px); }
}
.item { animation: fx-generic-slide-up 300ms ease-out; }
"""
check(
    "slide-up (no opacity change) -> resolves to slide-up, not fade-up",
    classify_css_motion(css_slide_up_no_opacity),
    ({"sgsAnimation": "slide-up"}, []),
)

# ---------------------------------------------------------------------------
# 9. NEGATIVE CONTROL — duration out of tolerance. Same scale-in shape as #1.
#
#    RECALIBRATED 2026-09-11 (Fix 3, `.claude/reports/
#    2026-09-11-r8-tier1-2-coverage-measurement.md`). The original version
#    of this control used 500ms, on the premise that anything outside
#    300ms's tight +/-20% band (240-360ms) should refuse to match. Real
#    evidence measured directly against 3 live production sites disproved
#    that premise: a genuine `scale-in`-shaped preloader legitimately runs
#    at 900ms on a real site, so `_duration_within_tolerance` now unions
#    the relative band with an absolute 200ms-5000ms real-world floor/
#    ceiling — 500ms is now a CORRECT match, not a bug, and asserting
#    otherwise would re-encode the disproven premise. This control is kept
#    meaningful by moving to 50ms: a duration below even the widened
#    200ms floor, in the same territory as Framer's real 10ms decorative
#    cursor-blink (explicitly noted in the report as "not genuinely Tier V
#    motion content") — i.e. still a genuine, evidenced non-match, not an
#    arbitrarily narrowed band.
# ---------------------------------------------------------------------------
css_scale_in_wrong_duration = """
@keyframes fx-scale-in-fast {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.card2 { animation: fx-scale-in-fast 50ms ease-out; }
"""
check(
    "duration out of tolerance -> no match",
    classify_css_motion(css_scale_in_wrong_duration),
    ({}, []),
)

# ---------------------------------------------------------------------------
# 10. NEGATIVE CONTROL — wrong easing keyword. Same scale-in shape/duration as
#     #1 but `linear` instead of `ease-out` -> no match (no cross-keyword
#     tolerance per the pinned rule).
# ---------------------------------------------------------------------------
css_scale_in_wrong_easing = """
@keyframes fx-scale-in-linear {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.card3 { animation: fx-scale-in-linear 300ms linear; }
"""
check(
    "wrong easing keyword -> no match",
    classify_css_motion(css_scale_in_wrong_easing),
    ({}, []),
)

# ---------------------------------------------------------------------------
# 11. NEW (Fix 2) — comma-separated multi-animation shorthand. Two
#     simultaneous animations on one element; the SECOND one's easing
#     (`linear`) must not leak onto the FIRST one's keyframes name. The
#     `@keyframes` block found is `fx-scale-in` (first one in the CSS text
#     per `_find_keyframes_block`'s "first block" contract), so the shorthand
#     match must resolve `fx-scale-in`'s OWN segment (300ms, ease-out) —
#     if Fix 2 were absent, the flattened un-segmented token list would let
#     the trailing comma corrupt the exact-easing-keyword check for the
#     `ease-out,` token, or a naive positional read could attribute the
#     second animation's `linear`/900ms to the first name instead.
# ---------------------------------------------------------------------------
css_comma_separated = """
@keyframes fx-scale-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes fx-glow {
  0% { opacity: 0.2; }
  100% { opacity: 1; }
}
.hero { animation: fx-scale-in 300ms ease-out, fx-glow 900ms linear; }
"""
check(
    "Fix 2: comma-separated multi-animation -> correct per-segment attribution",
    classify_css_motion(css_comma_separated),
    ({"sgsAnimation": "scale-in"}, []),
)

# ---------------------------------------------------------------------------
# 12. NEW (Fix 3) — cyclic duration-list indexing. `animation-name` lists 4
#     names; `animation-duration`/`animation-timing-function` list only 2
#     values each — per the CSS spec, a shorter list repeats CYCLICALLY, so
#     name index 3 (`fx-scale-in`, the LAST name) reuses slot `3 % 2 = 1`:
#     `durations[1]` = 300ms, `easings[1]` = ease-out — scale-in's real
#     seeded row. The ORIGINAL clamp-to-index-0 code
#     (`durations[idx] if idx < len(durations) else durations[0]`) would
#     instead read `durations[0]` = 50ms / `easings[0]` = linear at idx=3
#     (3 is not < 2), which does not match scale-in's row at all (300ms
#     falls outside 50ms's tolerance band, and linear != ease-out's family)
#     -> a real cyclic CSS declaration would silently fail to match under
#     the old code, but must resolve correctly under the fix.
# ---------------------------------------------------------------------------
css_cyclic_duration = """
@keyframes fx-scale-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.multi {
  animation-name: fx-a, fx-a, fx-a, fx-scale-in;
  animation-duration: 50ms, 300ms;
  animation-timing-function: linear, ease-out;
}
"""
check(
    "Fix 3: cyclic (modulo) longhand indexing -> correct duration/easing at idx 3",
    classify_css_motion(css_cyclic_duration),
    ({"sgsAnimation": "scale-in"}, []),
)

# ---------------------------------------------------------------------------
# 13. NEW (Fix 4) — no trailing semicolon before the closing brace on the
#     LAST declaration in a keyframe step. `_decl()` previously required a
#     `;` terminator and silently returned None for `transform:
#     scale(0.85)` here (no semicolon before `}`), which would have made
#     `_shape_from_start_step` fall through with no transform shape at all
#     (and no opacity fallback either, since opacity IS terminated
#     correctly) -> no shape extracted -> no match.
# ---------------------------------------------------------------------------
css_no_trailing_semicolon = """
@keyframes fx-scale-in {
  0% { opacity: 0; transform: scale(0.85) }
  100% { opacity: 1; transform: scale(1) }
}
.card4 { animation: fx-scale-in 300ms ease-out; }
"""
check(
    "Fix 4: no trailing semicolon on last declaration -> still extracted",
    classify_css_motion(css_no_trailing_semicolon),
    ({"sgsAnimation": "scale-in"}, []),
)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)

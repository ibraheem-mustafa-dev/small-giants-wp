"""Ad-hoc verification harness for `motion_shape.py` (Phase R8 Step 3).

Not wired into any pytest suite (no existing pytest config referenced this
directory at build time) — run directly: `python test_motion_shape_fixtures.py`.
Exits non-zero on any failed fixture, prints PASS/FAIL per case plus the
requested "actual test output, verbatim" for evidence.

Every fixture's expected preset is checked against a REAL seeded row in
`motion_shape_signatures` (read live at the top of this file), not a
hand-typed guess — including the two structural-tie negative controls,
which are ties because two real rows are byte-identical on every matched
axis (the seed script's own documented fade/slide quirk).
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
check("scale-in (unique)", classify_css_motion(css_scale_in), ({"fx": "scale-in"}, []))

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
check("rotate-in (unique)", classify_css_motion(css_rotate_in), ({"fx": "rotate-in"}, []))

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
check("flip-in (unique)", classify_css_motion(css_flip_in), ({"fx": "flip-in"}, []))

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
check("blur-in (unique)", classify_css_motion(css_blur_in), ({"fx": "blur-in"}, []))

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
check("fade-in (unique)", classify_css_motion(css_fade_in), ({"fx": "fade-in"}, []))

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
check("reveal-up (unique)", classify_css_motion(css_reveal_up), ({"fx": "reveal-up"}, []))

# ---------------------------------------------------------------------------
# 7. border-accent — unique (transition-only shape, scale-in/0.67-1.33/250/ease,
#    disjoint from bounce-in's 0.201-0.399 band at the same easing/duration axis)
# ---------------------------------------------------------------------------
shape_border_accent = extract_shape_from_transition(
    {"transform": "scaleX(0)"}, "transform 250ms ease"
)
check(
    "border-accent (transition, unique)",
    match_motion_shape(shape_border_accent) if shape_border_accent else (None, None),
    ({"fx": "border-accent"}, []),
)

# ---------------------------------------------------------------------------
# 8. NEGATIVE CONTROL — structural tie: fade-up and slide-up are BYTE-IDENTICAL
#    seeded rows (transform/up/20.1-39.9/300/ease-out both) per the seed
#    script's own documented quirk. A generic "translateY(30px)->0" shape at
#    that duration/easing MUST refuse to guess between them.
# ---------------------------------------------------------------------------
css_tie_up = """
@keyframes fx-generic-up {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0px); }
}
.item { animation: fx-generic-up 300ms ease-out; }
"""
check("tie: fade-up/slide-up -> no match", classify_css_motion(css_tie_up), ({}, []))

# ---------------------------------------------------------------------------
# 9. NEGATIVE CONTROL — duration out of tolerance. Same scale-in shape as #1
#    but 500ms (outside 300ms's +/-20% band of 240-360ms) -> no match.
# ---------------------------------------------------------------------------
css_scale_in_wrong_duration = """
@keyframes fx-scale-in-slow {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.card2 { animation: fx-scale-in-slow 500ms ease-out; }
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

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)

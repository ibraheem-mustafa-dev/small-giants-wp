"""Ad-hoc verification harness for motion_trigger.py (Phase R8 Step 5).

3 required fixtures (load / hover / scroll), same underlying CSS shape
(scale-in — a unique, unambiguous Tier V signature per
motion_shape_signatures: transform/scale-in/0.603-1.197/300/ease-out), each
producing the SAME preset (sgsAnimation=scale-in — Fix 1, 2026-09-11 QC
council review: `motion_shape.py` was corrected to emit the REAL
`sgsAnimation` destination attribute instead of the wrong `fx` key) but a
DIFFERENT fxTrigger value. Plus 2 bonus edge fixtures (JS-observer scroll
signal; total-fallback).
"""
import sys
from motion_trigger import classify_css_motion_with_trigger, classify_trigger

PASS = 0
FAIL = 0


def check(name, actual, expected):
    global PASS, FAIL
    ok = actual == expected
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}: actual={actual!r} expected={expected!r}")
    if ok:
        PASS += 1
    else:
        FAIL += 1


# ---------------------------------------------------------------------------
# Fixture 1 — LOAD-triggered: unconditional `animation` on page load.
# ---------------------------------------------------------------------------
css_load = """
@keyframes fx-scale-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.card { animation: fx-scale-in 300ms ease-out; }
"""
check(
    "load-triggered scale-in",
    classify_css_motion_with_trigger(css_load),
    ({"sgsAnimation": "scale-in", "fxTrigger": "load"}, []),
)

# ---------------------------------------------------------------------------
# Fixture 2 — HOVER-triggered: the SAME @keyframes body, but the `animation`
# shorthand is declared inside a `:hover` selector.
# ---------------------------------------------------------------------------
css_hover = """
@keyframes fx-scale-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.card:hover { animation: fx-scale-in 300ms ease-out; }
"""
check(
    "hover-triggered scale-in",
    classify_css_motion_with_trigger(css_hover),
    ({"sgsAnimation": "scale-in", "fxTrigger": "hover"}, []),
)

# ---------------------------------------------------------------------------
# Fixture 3 — SCROLL-triggered: the SAME @keyframes body, gated by the
# CSS-native `animation-timeline: scroll()`. fxTrigger is OMITTED (fx.js's
# own "scroll is the default, maps to no attribute" convention).
# ---------------------------------------------------------------------------
css_scroll = """
@keyframes fx-scale-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.card { animation: fx-scale-in 300ms ease-out; animation-timeline: scroll(); }
"""
check(
    "scroll-triggered scale-in (CSS-native)",
    classify_css_motion_with_trigger(css_scroll),
    ({"sgsAnimation": "scale-in"}, []),
)

# ---------------------------------------------------------------------------
# Bonus edge fixture — JS-adjacent IntersectionObserver (no CSS-native
# scroll-timeline at all) -> still classified as scroll-triggered.
# ---------------------------------------------------------------------------
css_no_native_scroll_signal = """
@keyframes fx-scale-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.card { animation: fx-scale-in 300ms ease-out; }
"""
js_observer = """
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.target.classList.toggle('is-visible', e.isIntersecting));
});
document.querySelectorAll('.card').forEach((el) => io.observe(el));
"""
check(
    "JS IntersectionObserver -> scroll (bonus edge)",
    classify_css_motion_with_trigger(css_no_native_scroll_signal, js_observer),
    ({"sgsAnimation": "scale-in"}, []),
)

# ---------------------------------------------------------------------------
# Bonus fallback fixture — no @keyframes, no transition, no observer at all
# -> classify_trigger() itself still returns a concrete value ('load').
# ---------------------------------------------------------------------------
check(
    "total fallback -> load (bonus)",
    classify_trigger("body { color: red; }"),
    "load",
)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)

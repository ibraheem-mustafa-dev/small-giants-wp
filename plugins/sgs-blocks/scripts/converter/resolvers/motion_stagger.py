"""Tier 3 stagger/repetition detector — Phase R8 Step 9.

WHY THIS EXISTS
----------------
`.claude/plans/phase-r8-motion-recognition.md` Step 9. Given a group of
shape-alike sibling elements (Step 7's
`converter/services/sibling_shape_prefilter.py`) that EACH carry an
`animation-delay` (or a JS-driven stagger equivalent), recognise the group
as ONE staggered-reveal effect rather than N independent identical
entrance animations, and emit a SINGLE attribute write covering the whole
group.

This module owns the TIMING-COMPARISON logic only. Structural "are these
siblings shape-alike" comparison is explicitly out of scope here — that
lives in `sibling_shape_prefilter.py`, imported below, never
reimplemented. Per the brainstorm doc's Rater C correction
(`.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 3
section), this timing-comparison logic is NOT shared with the
BEM-recognition doc's future sibling-repeater detector (Q2) — that
detector is an EQUIVALENCE hash (collapses identical siblings to one key,
for dedup/loop-conversion); this module needs the opposite, a
DIFFERENCING signal (per-sibling delay values, preserved and compared for
a consistent pattern) — so it is built fresh, private to this module, with
zero import of Q2 or vice versa.

STAGGER-ACCEPTANCE RULE (pinned by the Hidden Decisions pass — do not
re-derive; read the phase plan Step 9 block first if this looks wrong)
----------------------------------------------------
Accept as a stagger when the per-sibling delay sequence is STRICTLY
MONOTONIC (all increasing, or all decreasing — reject on any reversal in
order) across EVERY sibling in the shape-alike group. No fixed arithmetic
step size is required — real staggers commonly use eased (non-linear)
offset curves. Reject (report "not a stagger", caller falls back to N
separate per-element writes) on:
  - a genuine reversal anywhere in the sequence, or
  - identical delays across all siblings (no stagger at all — zero is not
    "trivially monotonic" for this rule's purpose, it is the explicit
    "no stagger" case the pinned rule calls out by name).

GROUND-TRUTHED OUTPUT SHAPE (read before touching this file — do not
invent a new attribute)
----------------------------------------------------
`motion_shape.py` (Tier 1) returns `{"fx": preset_slug}` on a match — the
convention `converter/db/db_lookup.py::lift_behavioural_attrs` already
uses, mergeable by `assembly.py`'s existing `attrs.setdefault(...)` loop
with no second write path. There is NO dedicated Tier V "staggered-reveal"
preset in the seeded `motion_shape_signatures` table (checked directly,
2026-09-11: 18 seeded rows, none named anything resembling a stagger
variant — every row is a single-element entrance shape). So the correct
emission is the SAME base entrance preset `motion_shape.py` already
resolves for one representative sibling, PLUS a stagger-offset parameter
attribute — never a fabricated new preset slug.

Two real, already-declared candidate attributes were checked (never invent
a third):

1. `fxStagger` — declared in `fx_attr_roster()`
   (`converter/db/db_lookup.py`; sourced from
   `includes/fx-attributes.php` FX_ATTR_MAP + `includes/
   extension-attributes.generated.php`). Renders as `data-sgs-fx-stagger`,
   type `number`, unit SECONDS (editor `RangeControl` step 0.01, min 0,
   max 0.3 — `src/blocks/extensions/fx.js`). Declared on the fx-capable
   roster generically (33 `block_attributes` rows spanning `sgs/hero`,
   `sgs/container`, `sgs/gallery`, `sgs/testimonial`, etc. per
   `sgs-db.py sql "SELECT block_slug FROM block_attributes WHERE
   attr_name='fxStagger'"`) — the SAME universal fx system Tier 1's own
   `fx` attribute belongs to, so `{"fx": ..., "fxStagger": ...}` merges
   through the identical `attrs.setdefault()` loop with zero new plumbing.
   Its current EDITOR gating (`isSplit &&` in `fx.js`) only shows the
   control for text-split effects today; the attribute itself carries no
   such restriction at the data layer, and this converter-side emission
   does not touch that gate.
2. `staggerDelay` — declared on `sgs/card-grid`/`sgs/gallery`/
   `sgs/testimonial` only (block.json default 80, unit MILLISECONDS),
   paired with a DIFFERENT attribute trio (`sgsAnimation` /
   `sgsAnimationDuration` / `sgsAnimationEasing`) that is that composite's
   own bespoke per-item scroll-reveal system, not the general `fx`
   pipeline `motion_shape.py` resolves into. Rejected as this module's
   default emission: it is scoped to 3 specific repeater blocks (R-31-9
   "universal mechanisms, no per-block hyperfocus" — `fxStagger` is the
   universal one), and it belongs to a parallel attribute system this
   module has no business writing into on this composite's behalf.

This module therefore emits `{"fx": <preset_slug>, "fxStagger":
<offset_seconds>}` on an accepted stagger, matching Tier 1's own return
contract exactly (`(attrs, skipped)`, `skipped` always `[]` — same
reasoning as `motion_shape.classify_css_motion`: a recognised stagger has
exactly one destination pair of attrs, there is no "recognised but
unroutable" case here).

fxStagger IS a single scalar (seconds between each successive sibling),
not a curve. The pinned acceptance rule deliberately tolerates a
NON-uniform (eased) monotonic delay curve for RECOGNITION purposes, but
`fxStagger`'s own attribute contract has no way to express a curve — it is
multiplied by each child's index at runtime. Emitting a curve is not
possible without a new attribute (out of scope; not requested). The
honest, documented approximation used here: the MEAN step between
consecutive delays, rounded to the same 0.01s granularity the editor's own
`RangeControl` step already uses. This is a deliberate simplification,
disclosed here — not a silent loss of fidelity beyond what the single-
scalar attribute could ever represent regardless of how this module
computed it.

UK English in comments + output.
"""
from __future__ import annotations

import re
from typing import Any

from motion_shape import classify_css_motion

try:  # pragma: no cover - import shape depends on caller's sys.path setup
    from services.sibling_shape_prefilter import filter_shape_alike_group
except ImportError:  # pragma: no cover - fallback when run as a loose script
    import os
    import sys

    sys.path.insert(
        0,
        os.path.join(os.path.dirname(__file__), "..", "services"),
    )
    from sibling_shape_prefilter import filter_shape_alike_group  # type: ignore


# Matches the editor's own `RangeControl` granularity for `fxStagger`
# (`src/blocks/extensions/fx.js`: `step={0.01}`) — the emitted offset is
# rounded to this so it lands exactly on a value the control can represent.
_FX_STAGGER_STEP = 0.01

# `fxStagger`'s own declared editor range (`src/blocks/extensions/fx.js`:
# `min={0} max={0.3}`). An offset outside this band still gets EMITTED
# (this module does not silently clamp/lie about a real measured value),
# but is flagged in `skipped` so a caller can decide whether to clamp,
# widen the control, or drop the write — never a silent clamp here.
_FX_STAGGER_MIN = 0.0
_FX_STAGGER_MAX = 0.3


# ---------------------------------------------------------------------------
# `animation-delay` extraction
# ---------------------------------------------------------------------------

_TIME_VALUE_RE = re.compile(r"^(-?[\d.]+)(ms|s)$")


def _parse_time_to_seconds(raw: str) -> "float | None":
    """Parse a raw CSS time token ('0.1s', '100ms') into whole seconds."""
    m = _TIME_VALUE_RE.match(raw.strip())
    if not m:
        return None
    value, unit = float(m.group(1)), m.group(2)
    return value / 1000.0 if unit == "ms" else value


def extract_animation_delay_seconds(css_text: str) -> "float | None":
    """Read an `animation-delay` (longhand) declaration from a raw CSS
    fragment and return it in seconds. Returns `None` when absent/
    unparseable — callers treat a missing delay as "no stagger evidence for
    this sibling", never as an implicit `0`.

    Only the longhand is read here, matching `motion_shape.py`'s own
    preference for longhand-first extraction (Fix 1 in that module):
    `animation-delay` is unambiguous regardless of `animation:` shorthand
    ordering, and is what `getComputedStyle` exposes directly on a live
    scrape.
    """
    m = re.search(r"animation-delay\s*:\s*([^;]+);", css_text)
    if not m:
        return None
    return _parse_time_to_seconds(m.group(1).strip())


def _get_delay_seconds(element: Any) -> "float | None":
    """Read a sibling's stagger-timing evidence off a dict/object input.

    Accepts either a pre-parsed `animation_delay_ms` (number, milliseconds
    — the shape the pipeline's DOM-scrape JSON is expected to carry for a
    live `getComputedStyle().animationDelay` read) OR a raw `css_text`
    fragment (falls back to `extract_animation_delay_seconds` above) — a
    JS-driven stagger equivalent (e.g. an inline `style="animation-delay:
    ...`" written by a scroll-library at runtime) surfaces through the same
    `animation_delay_ms`/`css_text` fields, since by the time it is
    captured in a scrape it is just computed CSS regardless of what wrote
    it.
    """
    if isinstance(element, dict):
        raw_ms = element.get("animation_delay_ms")
        if raw_ms is not None:
            try:
                return float(raw_ms) / 1000.0
            except (TypeError, ValueError):
                return None
        css_text = element.get("css_text")
        if css_text:
            return extract_animation_delay_seconds(str(css_text))
        return None

    raw_ms = getattr(element, "animation_delay_ms", None)
    if raw_ms is not None:
        try:
            return float(raw_ms) / 1000.0
        except (TypeError, ValueError):
            return None
    css_text = getattr(element, "css_text", None)
    if css_text:
        return extract_animation_delay_seconds(str(css_text))
    return None


# ---------------------------------------------------------------------------
# Monotonicity check — the pinned acceptance rule
# ---------------------------------------------------------------------------

def classify_delay_sequence(delays: "list[float]") -> "str | None":
    """Classify a sequence of per-sibling delays per the pinned rule.

    Returns `"increasing"` / `"decreasing"` on a strictly monotonic
    sequence, or `None` on a reversal or on identical values throughout
    (the two REJECT cases the pinned rule names explicitly). Fewer than 2
    delays cannot demonstrate a stagger pattern at all and also returns
    `None`.
    """
    if len(delays) < 2:
        return None

    diffs = [b - a for a, b in zip(delays, delays[1:])]

    if all(d == 0 for d in diffs):
        return None  # identical delays across all siblings -- no stagger.
    if all(d > 0 for d in diffs):
        return "increasing"
    if all(d < 0 for d in diffs):
        return "decreasing"
    return None  # a reversal somewhere in the sequence.


def _mean_step(delays: "list[float]") -> float:
    """Mean absolute step between consecutive delays.

    See the module docstring's "fxStagger IS a single scalar" note: this is
    the documented, deliberate single-scalar approximation of a possibly
    eased (non-uniform) but still strictly monotonic curve. Direction
    (increasing/decreasing) does not change the magnitude of the offset —
    only its sign, which `fxStagger` (an unsigned per-item multiplier) has
    no way to express either way — so it is not a parameter here.
    """
    diffs = [abs(b - a) for a, b in zip(delays, delays[1:])]
    return sum(diffs) / len(diffs)


# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------

def detect_stagger(
    elements: "list[Any]",
    *,
    shape_css_text: "str | None" = None,
    min_group_size: int = 2,
    db_path: "str | None" = None,
) -> "tuple[dict, list]":
    """Detect a staggered-reveal group among `elements` and resolve it to a
    single attribute write.

    `elements` -- the FULL candidate sibling list (this function runs
    Step 7's shape-alike pre-filter itself; callers must NOT pre-filter,
    so the returned group and the delay sequence stay in the same DOM
    order the pre-filter's `group_shape_alike` preserves).

    `shape_css_text` -- the representative `@keyframes`/`animation` CSS
    text shared by the shape-alike group (by construction, shape-alike
    siblings share one entrance shape; only their delay differs — this is
    the ONE CSS fragment `motion_shape.classify_css_motion` needs to
    resolve the base Tier V preset). If omitted, the first shape-alike
    sibling exposing a `css_text` field is used automatically.

    Returns `(attrs, skipped)` -- the SAME shape `motion_shape.py` and
    `db_lookup.lift_behavioural_attrs` already return, mergeable by
    `assembly.py`'s existing loop with no second write path.

    `attrs` is `{"fx": preset_slug, "fxStagger": offset_seconds}` on an
    accepted stagger. `attrs` is `{}` (with an explanatory `skipped` entry)
    on:
      - fewer than `min_group_size` shape-alike siblings found at all,
      - fewer than `min_group_size` of those siblings carrying resolvable
        delay evidence,
      - a rejected delay sequence (reversal or all-identical — the pinned
        rule's own reject cases), or
      - the shared shape not resolving to any known Tier V preset.

    A `{}` return is the caller's explicit fall-back signal to make N
    separate per-element Tier 1 writes instead (the safe degradation this
    project's own On-Fail clause names) -- this function performs none of
    those per-element writes itself, it only refuses to claim a stagger
    that isn't one.
    """
    group = filter_shape_alike_group(elements, min_group_size=min_group_size)
    if not group:
        return {}, [
            {
                "reason": "no_shape_alike_group",
                "detail": (
                    f"fewer than {min_group_size} shape-alike siblings "
                    "found -- not a stagger candidate."
                ),
            }
        ]

    delays: "list[float]" = []
    for element in group:
        delay = _get_delay_seconds(element)
        if delay is None:
            return {}, [
                {
                    "reason": "missing_delay_evidence",
                    "detail": (
                        "a shape-alike sibling carried no resolvable "
                        "animation-delay -- refusing to guess at a "
                        "stagger with incomplete evidence."
                    ),
                }
            ]
        delays.append(delay)

    direction = classify_delay_sequence(delays)
    if direction is None:
        return {}, [
            {
                "reason": "not_monotonic",
                "detail": (
                    f"delay sequence {delays!r} is not strictly "
                    "monotonic (reversal or all-identical) -- per the "
                    "pinned acceptance rule this is not a stagger; fall "
                    "back to N separate entrance-preset writes."
                ),
            }
        ]

    css_text = shape_css_text
    if css_text is None:
        for element in group:
            candidate = (
                element.get("css_text")
                if isinstance(element, dict)
                else getattr(element, "css_text", None)
            )
            if candidate:
                css_text = str(candidate)
                break

    if not css_text:
        return {}, [
            {
                "reason": "no_shape_css",
                "detail": (
                    "monotonic delay sequence recognised, but no "
                    "@keyframes/animation CSS was available to resolve "
                    "the shared Tier V entrance preset."
                ),
            }
        ]

    shape_attrs, shape_skipped = classify_css_motion(css_text, db_path=db_path)
    preset_slug = shape_attrs.get("fx")
    if not preset_slug:
        return {}, [
            {
                "reason": "shape_unresolved",
                "detail": (
                    "monotonic delay sequence recognised, but the shared "
                    "entrance shape did not resolve to any known Tier V "
                    "preset -- refusing to invent a preset for a real "
                    "stagger pattern with no matching shape."
                ),
            },
            *shape_skipped,
        ]

    offset_seconds = round(_mean_step(delays) / _FX_STAGGER_STEP) * _FX_STAGGER_STEP
    offset_seconds = round(offset_seconds, 2)

    skipped: "list[dict]" = []
    if not (_FX_STAGGER_MIN <= offset_seconds <= _FX_STAGGER_MAX):
        skipped.append(
            {
                "reason": "fxStagger_out_of_editor_range",
                "detail": (
                    f"measured offset {offset_seconds}s falls outside "
                    f"fxStagger's own declared editor range "
                    f"[{_FX_STAGGER_MIN}, {_FX_STAGGER_MAX}] -- emitted "
                    "as measured, not silently clamped; caller decides."
                ),
            }
        )

    return {"fx": preset_slug, "fxStagger": offset_seconds}, skipped


# ---------------------------------------------------------------------------
# Self-test / fixture demonstration — the 3 phase-plan Step 9 fixtures.
# ---------------------------------------------------------------------------

def _demo() -> None:
    """Run the three phase-plan Step 9 fixtures and print their results."""

    # A real seeded Tier V shape with a UNIQUE signature (scale-in:
    # transform/scale-in/0.603-1.197/300/ease-out — confirmed live against
    # motion_shape_signatures, 2026-09-11, and the same fixture
    # `test_motion_shape_fixtures.py` uses for its own "unique signature"
    # case) shared by every sibling in each fixture; only the per-sibling
    # `animation-delay` differs, which is exactly the "shape-alike, timing
    # differs" case Tier 3 exists to recognise. `fade-up`/`slide-up` are
    # deliberately NOT used here — they are a documented structural TIE in
    # the seeded table (byte-identical signature, two preset names), which
    # `motion_shape.py` correctly refuses to resolve (2+ candidates = no
    # match) regardless of Tier 3 — using a tied shape here would exercise
    # that pre-existing Tier 1 behaviour, not Tier 3's own logic.
    shared_css = """
    @keyframes fx-scale-in {
      0% { opacity: 0; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1); }
    }
    .card { animation: fx-scale-in 300ms ease-out; }
    """

    def card(delay_ms: float) -> dict:
        return {
            "tag": "div",
            "classes": ["card"],
            "animation_delay_ms": delay_ms,
            "css_text": shared_css,
        }

    print("Fixture 1 -- 5 siblings, uniform 0.1s increments:")
    fixture_1 = [card(ms) for ms in (100, 200, 300, 400, 500)]
    attrs_1, skipped_1 = detect_stagger(fixture_1)
    print(f"  attrs={attrs_1!r}")
    print(f"  skipped={skipped_1!r}")

    print()
    print("Fixture 2 -- 5 siblings, non-uniform but monotonic (eased curve):")
    fixture_2 = [card(ms) for ms in (100, 150, 350, 500, 620)]
    attrs_2, skipped_2 = detect_stagger(fixture_2)
    print(f"  attrs={attrs_2!r}")
    print(f"  skipped={skipped_2!r}")

    print()
    print("Fixture 3 -- 5 siblings, random non-monotonic delays:")
    fixture_3 = [card(ms) for ms in (100, 400, 150, 500, 50)]
    attrs_3, skipped_3 = detect_stagger(fixture_3)
    print(f"  attrs={attrs_3!r}")
    print(f"  skipped={skipped_3!r}")


if __name__ == "__main__":
    _demo()

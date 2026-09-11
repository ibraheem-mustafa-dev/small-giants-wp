"""Tier 2 trigger-mechanism classifier — Phase R8 Step 5.

WHY THIS EXISTS
----------------
`.claude/plans/phase-r8-motion-recognition.md` Step 5 (Tier 2), extending
`motion_shape.py`'s Tier 1 CSS declaration-shape classifier (Step 3). Tier 1
answers "what SHAPE is this motion" (fade-up, scale-in, ...); this module
answers "WHEN does it fire" — scroll-into-view, on hover/focus, or
unconditionally on page load — per the exact 3-signal list in
`.claude/plans/2026-09-10-r8-motion-recognition-brainstorm.md` Tier 2
section:

  - CSS `animation-timeline: scroll()`, OR an adjacent IntersectionObserver
    JS pattern            -> scroll-triggered
  - a `:hover`/`:focus` selector owning the `animation` declaration
    -> hover-triggered
  - an unconditional on-load `animation` (no scroll/hover gating)
    -> load-triggered
  - no trigger signal detectable at all -> falls back to load-triggered
    (the documented fallback site is `classify_trigger()` below)

GROUNDING NOTE — "preset FAMILY" does not exist as a separate DB construct
----------------------------------------------------------------------------
The dispatching brief asked this module to route a Tier 1 shape match to
"a different Tier V preset FAMILY" depending on trigger, but explicitly
required checking whether such a routing table is real before building one
(R-31-1 / CLAUDE.md's "prove the cause before the fix"). It is not, and
forcing one would be exactly the "hardcoded routing dict for a table that
doesn't exist" trap CLAUDE.md warns against. Verified directly against both
of this codebase's real motion attribute surfaces:

  1. `motion_shape_signatures` (Tier V's only seeded catalogue) has NO
     trigger column at all — its 18 rows (`fade-up`, `scale-in`, `blur-in`,
     ...) are pure CSS shapes, and its ONE live consumer,
     `plugins/sgs-blocks/src/blocks/extensions/animation.js`
     (`sgsAnimation`/`sgsAnimationDelay`/`sgsAnimationDuration`/
     `sgsAnimationEasing`), is hard-wired to a single scroll-triggered
     IntersectionObserver mechanism by its own docblock ("scroll-triggered
     animation controls... The frontend IntersectionObserver reads these
     ... and triggers the CSS transition") — there is no load- or
     hover-triggered sibling attribute for this catalogue to route into.
  2. The ONLY real `load | scroll | hover` enum in the codebase belongs to a
     DIFFERENT tier — Tier G's `fxTrigger` attribute (Spec 38 §11.2,
     `plugins/sgs-blocks/src/blocks/extensions/fx.js`'s `FX_TRIGGER_LABELS`
     + `fxTriggerOptions()`) — and `class-sgs-motion-registry.php` (lines
     25-28) states outright that migrating Tier V onto that registry is an
     unbuilt future "Wave C item", i.e. the two systems are not unified yet.

Per Step 3's own pinned contract (`motion_shape.py::classify_css_motion`
returns `{"fx": <preset_slug>}` in the SAME `{attr_name: value}` shape
`db_lookup.py::lift_behavioural_attrs()` already returns, using that
function's `fx_attr_roster()` naming convention — `fx`, `fxTrigger`,
`fxStart`, ...), this module's correct, grounded output is to attach the
REAL `fxTrigger` attribute name to that same dict alongside the (unchanged)
shape-derived `fx` preset slug — never a different preset_slug per trigger,
since no such per-trigger preset exists to select. This is the one addition
that is both real (an attribute name and enum that genuinely exist) and
non-destructive (Tier 1's shape-matching logic is untouched).
"""

from __future__ import annotations

import re

from motion_shape import classify_css_motion

# The exact 3-value enum `fxTrigger` already uses (Spec 38 §11.2,
# `fx.js::FX_TRIGGER_LABELS`) — not invented here, reused verbatim so this
# module's output is a real, recognised attribute value rather than a
# parallel vocabulary the rest of the codebase has never heard of.
_VALID_TRIGGERS = ("scroll", "hover", "load")

# fx.js's own convention (`fxTriggerOptions()`): 'scroll' is the implicit
# module default and maps to the EMPTY attribute value — emitting it
# explicitly on every scroll-triggered block would write a redundant
# attribute that was never touched. Mirrored here so a Tier 2 classification
# of 'scroll' does not add a key at all.
_TRIGGER_OMITTED_WHEN_DEFAULT = "scroll"

_HOVER_OR_FOCUS_SELECTOR = re.compile(r":hover|:focus")
_SCROLL_TIMELINE = re.compile(r"animation-timeline\s*:\s*scroll\(")
_KEYFRAMES_NAME = re.compile(r"@keyframes\s+([\w-]+)")
_INTERSECTION_OBSERVER = re.compile(r"\bIntersectionObserver\s*\(")


def _find_animation_declaration_offset(css_text: str, keyframes_name: str) -> "int | None":
    """Offset of the FIRST `animation: <keyframes_name> ...` declaration
    referencing the given `@keyframes` name, or None if absent."""
    m = re.search(r"animation\s*:\s*" + re.escape(keyframes_name) + r"\b", css_text)
    return m.start() if m else None


def _selector_owning_offset(css_text: str, offset: int) -> "str | None":
    """Walk backward from `offset` to find the selector of the rule block
    that CONTAINS it — i.e. the nearest unmatched `{` reading backward, then
    the text between that and the previous rule boundary (`}` or start of
    string). Deliberately minimal (no @-rule/nesting awareness beyond brace
    counting) — this module classifies already-extracted CSS text for a
    single element's motion declarations (the same scope Tier 1 operates
    in), not a full stylesheet parse."""
    depth = 0
    i = offset
    while i > 0:
        i -= 1
        char = css_text[i]
        if char == "}":
            depth += 1
        elif char == "{":
            if depth == 0:
                j = i
                while j > 0 and css_text[j - 1] != "}":
                    j -= 1
                return css_text[j:i].strip()
            depth -= 1
    return None


def _classify_trigger_from_css(css_text: str) -> "str | None":
    """CSS-only trigger signals, per the pinned 3-signal list. Returns
    'scroll' | 'hover' | 'load', or None when no CSS-native signal is
    present at all (the caller then tries the JS signal, then the final
    fallback)."""
    # Signal 1 (highest confidence — an explicit, unambiguous CSS-native
    # declaration): `animation-timeline: scroll()`.
    if _SCROLL_TIMELINE.search(css_text):
        return "scroll"

    kf_match = _KEYFRAMES_NAME.search(css_text)
    if kf_match is None:
        # No @keyframes at all — this is a transition-driven shape (e.g.
        # `border-accent`'s `:hover { transition: transform ...; }` shape).
        # A transition can only ever be interaction-driven (there is no
        # "unconditional on-load transition" concept — a transition needs a
        # state CHANGE to animate at all), so a `:hover`/`:focus` selector
        # anywhere alongside a `transition:` declaration is a real, if
        # coarse, hover signal.
        if _HOVER_OR_FOCUS_SELECTOR.search(css_text) and re.search(r"transition\s*:", css_text):
            return "hover"
        return None

    keyframes_name = kf_match.group(1)
    offset = _find_animation_declaration_offset(css_text, keyframes_name)
    if offset is None:
        return None

    selector = _selector_owning_offset(css_text, offset)
    if selector and _HOVER_OR_FOCUS_SELECTOR.search(selector):
        # Signal 2: a `:hover`/`:focus` selector owns the `animation`
        # declaration — the keyframes only ever plays on interaction.
        return "hover"

    # Signal 3: the `animation` declaration is unconditional (no
    # scroll-timeline, no :hover/:focus gating found above it) -> load.
    return "load"


def detect_intersection_observer(js_text: "str | None") -> bool:
    """True when adjacent script content constructs an `IntersectionObserver`
    — the JS-side equivalent of the CSS-native `animation-timeline:
    scroll()` signal. Deliberately narrow (a single, well-known constructor
    call pattern), per the plan's own "pattern-matching on well-known,
    narrow JS shapes, not general code understanding" cost note."""
    if not js_text:
        return False
    return bool(_INTERSECTION_OBSERVER.search(js_text))


def classify_trigger(css_text: str, js_text: "str | None" = None) -> str:
    """Classify WHEN a motion effect fires. Always returns one of
    'scroll' | 'hover' | 'load' — never None — because Tier V's own runtime
    needs a concrete trigger for every recognised shape, and a genuinely
    undetectable trigger is documented (not silently guessed) as the
    'load' fallback below.

    Precedence (highest confidence first): a CSS-native `animation-timeline:
    scroll()` or an owning `:hover`/`:focus` selector are unambiguous
    CSS-level facts and win outright; only when NEITHER is present does the
    JS-adjacent IntersectionObserver signal get consulted; only when NONE of
    the three signals fire does this function fall back to 'load'.
    """
    css_signal = _classify_trigger_from_css(css_text)
    if css_signal in ("scroll", "hover"):
        return css_signal

    if detect_intersection_observer(js_text):
        return "scroll"

    if css_signal == "load":
        return "load"

    # No trigger signal detectable at all (per the plan's own On-Fail
    # clause): fall back to load-triggered — the least surprising
    # assumption, since an unconditional CSS animation with no recognised
    # gating is the closest real-world analogue. Documented here, at the
    # single fallback site, rather than silently defaulted upstream.
    return "load"


def classify_css_motion_with_trigger(
    css_text: str, js_text: "str | None" = None, db_path: "str | None" = None
) -> "tuple[dict, list]":
    """Tier 1 + Tier 2 combined entry point.

    Runs Tier 1's shape match unchanged (`motion_shape.classify_css_motion`)
    and, only on a real match, attaches the REAL `fxTrigger` attribute name
    (Spec 38 §11.2's existing `load | scroll | hover` enum — see this
    module's docstring for why this is the correct destination and not an
    invented "preset family"). Returns `(attrs, skipped)`, mergeable by the
    SAME `assembly.py` caller loop Tier 1's own contract already targets —
    no second write/merge path invented here.

    `fxTrigger` is OMITTED from `attrs` when the trigger classifies as
    'scroll' (fx.js's own default-omission convention — see
    `_TRIGGER_OMITTED_WHEN_DEFAULT`), so a plain scroll-triggered shape match
    round-trips through this function identically to calling Tier 1 alone.
    """
    attrs, skipped = classify_css_motion(css_text, db_path)
    if not attrs:
        return attrs, skipped

    trigger = classify_trigger(css_text, js_text)
    if trigger == _TRIGGER_OMITTED_WHEN_DEFAULT:
        return attrs, skipped

    return {**attrs, "fxTrigger": trigger}, skipped

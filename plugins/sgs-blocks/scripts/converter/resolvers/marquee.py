"""marquee.py — lift a draft's seamless-marquee animation onto the block's own marquee attrs.

WHY THIS EXISTS
---------------
A draft ticker or logo strip that scrolls endlessly is a CSS animation on the element that holds the
repeated items: ``animation: marquee 30s linear infinite`` over
``@keyframes marquee { to { transform: translateX(-50%) } }``. SGS blocks that scroll (``sgs/trust-bar``,
``sgs/brand-strip``) carry the behaviour as attributes: a toggle, and where the block supports it a
"below this width" switch and a duration in seconds. The generic CSS route cannot carry it: a raw
``animation`` shorthand is not a value for a boolean toggle (that mis-route wrote ``bgKenBurns:"none"``,
which PHP reads as true), and "below which device tier" is not a CSS declaration at all, it is the SHAPE of
the animation across the device tiers. So it is lifted here, once, from the element.

THE SIGNATURE (all three must hold on the animated element, per device tier)
-----------------------------------------------------------------------------
1. the element contains the block's repeated items (it is the items' parent, or an ancestor of that parent
   inside the block: the animated node may be the row or a track wrapping the row);
2. it runs an ``animation`` whose iteration count is ``infinite``;
3. the named ``@keyframes`` translate along X only (a non-zero X, no Y travel).

DB-DRIVEN (R-31-1 / R-31-9): the block names its own attrs by ROLE (``marquee-toggle`` / ``marquee-below`` /
``marquee-duration``, data/roles.json, assigned in attr-classification-overrides.json), read through
``db_lookup.marquee_attrs_for``. A block with no marquee role is an immediate no-op. No block name appears
here. The device tiers come from ``db_lookup.device_tier_ranges`` (fixed 768/1024), never from a literal.

WHAT IS WRITTEN
---------------
* toggle          True whenever the signature holds on at least one tier.
* below           the device-tier width the animation runs below: the marquee is active on a contiguous run
                  of tiers starting at the smallest (mobile only -> 768, mobile + tablet -> 1024, every tier
                  -> 0 = every width, written only if the attr's default differs). Any other set of tiers
                  cannot be said as "below a width": REPORTED, and nothing is written for the marquee
                  (writing the toggle alone would run it at every width, which the draft does not).
* duration        seconds, when the block has a duration attr and every active tier agrees.

NEVER INVENTED (Spec 31 §3.A step 8 / F-ii): a marquee that sits inside a NON-device-tier ``@media`` band
(a residual), a duration with nowhere to go, tiers that disagree, a block with no "below" attr for a
below-only marquee: each returns a ``(where, detail)`` row, recorded by the caller as a ContentGap. Nothing
is snapped, guessed or dropped without a reason.

Returns ``(attrs, skipped)`` exactly like ``motion_shape.classify_css_motion`` so the caller merges it with
the same ``attrs.setdefault`` loop.
"""
from __future__ import annotations

import re

from bs4 import Tag

from converter.db import db_lookup
from converter.models import ResidualBand
from converter.resolvers.array_content import _find_item_nodes
from converter.resolvers.motion_shape import (
    _EASING_KEYWORDS,
    _TIME_TOKEN_RE,
    _extract_animation_name_from_shorthand,
    _extract_named_keyframes_block,
    _split_comma_top_level,
    _tokenize_shorthand_value,
    parse_duration_ms,
)
from converter.services.styling_helpers import collect_css_decls_for_element

_ROLE_TOGGLE = "marquee-toggle"
_ROLE_BELOW = "marquee-below"
_ROLE_DURATION = "marquee-duration"

_TRANSFORM_DECL_RE = re.compile(r"transform\s*:\s*([^;}]+)", re.IGNORECASE)
_TRANSLATE_FN_RE = re.compile(r"translate(X|Y|3d)?\(([^)]*)\)", re.IGNORECASE)
_LEADING_NUMBER_RE = re.compile(r"^\s*(-?(?:\d+\.?\d*|\.\d+))")


def _travels(component: str) -> bool:
    """Whether one translate component moves the element. ``0`` / ``0px`` / ``0%`` do not; anything
    unparseable that still carries a digit (``calc(-50% - 4px)``, ``var(--x)`` with a number) is treated as
    moving, the safe reading for "is there X travel"."""
    m = _LEADING_NUMBER_RE.match(component)
    if m:
        return float(m.group(1)) != 0.0
    return bool(re.search(r"\d", component)) or "var(" in component


def _x_components(keyframes_block: str) -> "tuple[list[str], bool]":
    """``(the non-zero X components, whether any step travels on Y)`` of one ``@keyframes`` text.

    Every ``transform:`` value in the block is read; ``translateX(v)``, ``translate(x, y)`` and
    ``translate3d(x, y, z)`` are understood.
    """
    xs: "list[str]" = []
    y_moves = False
    for decl in _TRANSFORM_DECL_RE.finditer(keyframes_block):
        for fn in _TRANSLATE_FN_RE.finditer(decl.group(1)):
            kind = (fn.group(1) or "").lower()
            parts = [p.strip() for p in fn.group(2).split(",")]
            if kind == "x":
                x, y = parts[0], "0"
            elif kind == "y":
                x, y = "0", parts[0]
            else:  # translate(x, y) and translate3d(x, y, z)
                x = parts[0]
                y = parts[1] if len(parts) > 1 else "0"
            if _travels(y):
                y_moves = True
            if _travels(x):
                xs.append(x)
    return xs, y_moves


def keyframes_translate_x_only(keyframes_block: str) -> bool:
    """True when the ``@keyframes`` text moves the element along X and never along Y.

    A block that never translates, or that translates on Y at any step, is not a horizontal marquee.
    """
    xs, y_moves = _x_components(keyframes_block)
    return bool(xs) and not y_moves


# A seamless marquee scrolls the row by the width of ONE copy of its content, then jumps back invisibly:
# with 2 copies that is 50% of the row, 3 copies 33%, 4 copies 25%. A translate below this share of the
# row is a nudge (a shake, a drift), not a loop. The threshold is the smallest plausible copy count
# (5 copies = 20%), so a real marquee is never excluded and no decorative nudge reaches it.
_MIN_TRAVEL_PERCENT = 20.0
_PERCENT_RE = re.compile(r"^\s*(-?(?:\d+\.?\d*|\.\d+))%\s*$")
_PERCENT_TERM_RE = re.compile(r"(-?(?:\d+\.?\d*|\.\d+))%")
_TIMING_FUNCTION_PREFIXES = ("cubic-bezier(", "steps(", "linear(")
_DIRECTIONS = ("normal", "reverse", "alternate", "alternate-reverse")
_SEAMLESS_TIMING = "linear"


def _travel_percent(x: str) -> "float | None":
    """The percentage of the row's own width one X component moves it, or None when it is not a percentage.

    A plain ``-50%`` is read directly. ``calc(-50% - 8px)`` (the seamless-loop correction for a row that has
    a flex gap) is read by its percentage term, the px part being the gap correction. A pure px / rem / var()
    value has no relation to the row's width, so it cannot be proven a loop and returns None.
    """
    m = _PERCENT_RE.match(x)
    if m:
        return abs(float(m.group(1)))
    if x.lower().startswith("calc("):
        terms = [abs(float(t)) for t in _PERCENT_TERM_RE.findall(x)]
        if terms:
            return max(terms)
    return None


def keyframes_travel_problem(keyframes_block: str) -> "str | None":
    """Why the ``@keyframes`` X travel is not a seamless loop, or None when it is (>= 20% in percent)."""
    xs, _y = _x_components(keyframes_block)
    if not xs:
        return "it has no X travel"
    peak = 0.0
    for x in xs:
        share = _travel_percent(x)
        if share is None:
            return (f"its travel ({x}) is not a percentage of the row's own width, so it cannot be a "
                    "seamless loop of the repeated items")
        peak = max(peak, share)
    if peak < _MIN_TRAVEL_PERCENT:
        return (f"it travels only {peak:g}% of the row (a seamless loop travels at least "
                f"{_MIN_TRAVEL_PERCENT:g}%: 2 copies = 50%, 3 = 33%, 4 = 25%)")
    return None


def _seconds(token: "str | None") -> "float | None":
    ms = parse_duration_ms(token) if token else None
    return None if ms is None else ms / 1000.0


def _timing_of(tokens: "list[str]") -> "str | None":
    """The timing function token of one shorthand segment (``linear``, ``ease-in-out``, ``steps(3)``,
    ``cubic-bezier(...)``), or None when the segment names none (CSS then uses ``ease``)."""
    for t in tokens:
        if t in _EASING_KEYWORDS or t.startswith(_TIMING_FUNCTION_PREFIXES):
            return t
    return None


def _longhand_at(decls: dict, prop: str, i: int) -> "str | None":
    """The ``i``-th value of a comma list longhand, cycled per the CSS list rule; None when not declared."""
    values = _split_comma_top_level(decls.get(prop) or "")
    return values[i % len(values)].strip() if values else None


def _infinite_animations(decls: dict) -> "list[dict]":
    """One ``{name, seconds, direction, timing}`` per INFINITE animation in ``decls``.

    Reads the ``animation`` shorthand (one entry per comma-separated animation) or, failing that, the
    longhands (``animation-name`` with ``animation-duration`` / ``animation-iteration-count`` indexed
    cyclically per the CSS list rule). ``animation: none`` yields nothing. ``direction`` defaults to
    ``normal`` and ``timing`` to ``ease`` when nothing declares them (the CSS initial values). A declared
    ``animation-direction`` / ``animation-timing-function`` longhand overrides the shorthand's component
    (authored order cannot be recovered from a merged declaration map, and a longhand after the shorthand
    is the override pattern).
    """
    found: "list[dict]" = []
    shorthand = decls.get("animation")
    if shorthand:
        for i, segment in enumerate(_split_comma_top_level(shorthand)):
            tokens = _tokenize_shorthand_value(segment)
            if "infinite" not in tokens:
                continue
            name = _extract_animation_name_from_shorthand(segment)
            if not name:
                continue
            duration = next((t for t in tokens if _TIME_TOKEN_RE.match(t)), None)
            direction = next((t for t in tokens if t in _DIRECTIONS), None)
            found.append({
                "name": name,
                "seconds": _seconds(duration),
                "direction": _longhand_at(decls, "animation-direction", i) or direction or "normal",
                "timing": _longhand_at(decls, "animation-timing-function", i) or _timing_of(tokens) or "ease",
            })
        return found

    names_raw = decls.get("animation-name")
    if not names_raw:
        return found
    names = _split_comma_top_level(names_raw)
    counts = _split_comma_top_level(decls.get("animation-iteration-count") or "")
    durations = _split_comma_top_level(decls.get("animation-duration") or "")
    for i, name in enumerate(names):
        count = counts[i % len(counts)] if counts else ""
        if count.strip() != "infinite" or name.strip() in ("", "none"):
            continue
        duration = durations[i % len(durations)] if durations else None
        found.append({
            "name": name.strip(),
            "seconds": _seconds(duration),
            "direction": _longhand_at(decls, "animation-direction", i) or "normal",
            "timing": _longhand_at(decls, "animation-timing-function", i) or "ease",
        })
    return found


def marquee_verdict(decls: dict, css_text: str) -> "tuple[dict | None, list[str]]":
    """``(shape, rejections)`` for the animations in ``decls``.

    ``shape`` is ``{'name', 'seconds', 'direction'}`` for the first animation that is a seamless marquee,
    else None. ``rejections`` holds one reason per infinite X-only animation that looked like a marquee but
    is not one (so the caller can report it instead of dropping it silently).

    A seamless marquee is: an INFINITE animation, whose named ``@keyframes`` (found in ``css_text``; a name
    with no rule cannot be proven, never guessed from the name) translate along X only, and

    * direction ``normal`` or ``reverse`` (the row runs one way and loops). ``alternate`` and
      ``alternate-reverse`` bounce back and forth, which is a shake or a drift, never a seamless loop.
      ``reverse`` is accepted because the module already treated it as scrolling and it is still a loop;
      the block has no direction attribute, so nothing about the direction is written;
    * timing ``linear`` (constant speed is the marquee signature; ``steps()``, ``ease``, ``ease-in-out`` and
      every other curve is a decorative motion, and only ``linear`` is accepted, on purpose);
    * a travel of at least 20% of the row's own width, in percent (see ``keyframes_travel_problem``).
    """
    rejections: "list[str]" = []
    for anim in _infinite_animations(decls):
        block = _extract_named_keyframes_block(css_text, anim["name"])
        if block is None or not keyframes_translate_x_only(block):
            continue
        if anim["direction"] in ("alternate", "alternate-reverse"):
            rejections.append(
                f"infinite X animation '{anim['name']}' with direction {anim['direction']} bounces back and "
                "forth rather than looping, not treated as a marquee"
            )
            continue
        if anim["timing"] != _SEAMLESS_TIMING:
            rejections.append(
                f"infinite X animation '{anim['name']}' with non-linear timing ({anim['timing']}), "
                "not treated as a marquee"
            )
            continue
        problem = keyframes_travel_problem(block)
        if problem is not None:
            rejections.append(
                f"infinite X animation '{anim['name']}' not treated as a marquee: {problem}"
            )
            continue
        return {"name": anim["name"], "seconds": anim["seconds"], "direction": anim["direction"]}, rejections
    return None, rejections


def marquee_shape(decls: dict, css_text: str) -> "dict | None":
    """The seamless-marquee shape of ``decls`` (see ``marquee_verdict``), or None."""
    return marquee_verdict(decls, css_text)[0]


def _tier_order() -> "list[tuple[str, int, int]]":
    """The device tiers ascending by width, ``[(name, lo, hi)]`` (Mobile, Tablet, Desktop): DB-driven."""
    return sorted(((n, int(lo), int(hi)) for n, lo, hi in db_lookup.device_tier_ranges()), key=lambda t: t[1])


# collect_css_decls_for_element reports a tier's value only where it DIFFERS from the base, and cannot say
# "this tier has no animation at all" (a rule added by `min-width:1024px` is in the desktop base, and the
# tablet and mobile tiers, which lack it, are simply not listed, so they look like they inherit it). A
# lowest-specificity sentinel rule on the same element turns that absence into a value the collector CAN
# report: a tier where nothing sets the property keeps the sentinel, and the sentinel is stripped again below.
_ABSENT = "__sgs-absent__"
_ANIMATION_PROPS = ("animation", "animation-name")


def _with_absence_sentinel(node: Tag, css_rules: dict) -> dict:
    """``css_rules`` with the absence sentinel added as its OWN rule, first in source order.

    The sentinel is a bare tag rule (the lowest specificity that matches the element), so any draft rule
    that sets ``animation`` beats it. Its dict KEY must never equal a draft selector: a draft that already
    holds a bare ``ul { list-style:none }`` rule would otherwise have its rule REPLACE the sentinel (the
    key collision the marquee review reproduced), so every tier without an animation looked like it
    inherited the desktop one. The collector strips whitespace off the selector before matching, so padding
    the key with trailing spaces until it is unique makes a collision impossible while matching the same
    element, and the sentinel stays first so an equal-specificity draft rule (later source order) wins.
    """
    key = node.name or "*"
    while key in css_rules:
        key += " "
    return {key: {prop: _ABSENT for prop in _ANIMATION_PROPS}, **css_rules}


def _tier_shapes(
    node: Tag, css_rules: dict, css_text: str
) -> "tuple[dict[str, dict], list[str], list[str]]":
    """``({tier name: shape}, residual notes, rejected reasons)`` for one element.

    The widest tier is the base declaration set; every other tier is the base overlaid with that tier's own
    differing declarations (``collect_css_decls_for_element``'s contract), read against the sentinel rule
    above so a tier with NO animation is not mistaken for one that inherits the desktop animation. A residual
    band (a non-device-tier ``@media`` the tier model cannot hold) that carries a marquee animation is
    reported, never mapped. ``rejected reasons`` are the de-duplicated reasons an infinite X animation on this
    element was NOT treated as a marquee (``marquee_verdict``).
    """
    sink: "list[ResidualBand]" = []
    probe_rules = _with_absence_sentinel(node, css_rules)
    base_decls, bp_decls = collect_css_decls_for_element(node, probe_rules, residual_sink=sink)
    order = _tier_order()
    base_tier = order[-1][0]
    shapes: "dict[str, dict]" = {}
    rejected: "list[str]" = []
    for name, _lo, _hi in order:
        effective = dict(base_decls)
        if name != base_tier:
            effective.update(bp_decls.get(name, {}))
        effective = {k: v for k, v in effective.items() if v != _ABSENT}
        shape, why = marquee_verdict(effective, css_text)
        if shape is not None:
            shapes[name] = shape
        rejected.extend(r for r in why if r not in rejected)
    residual: "list[str]" = []
    for band in sink:
        band_shape, why = marquee_verdict(band.decls, css_text)
        if band_shape is not None:
            residual.append(f"{band.media_cond}: {sorted(k for k in band.decls if k.startswith('animation'))}")
        rejected.extend(r for r in why if r not in rejected)
    return shapes, residual, rejected


def _candidate_elements(holder: Tag, section_root: Tag) -> "list[Tag]":
    """The elements whose animation may be the items row's marquee: the HOLDER of the repeated items (their
    parent) and, only when the holder is the wrapper's sole element child, that single direct wrapper (a
    ``belt`` that clips a ``track``).

    Why not every ancestor up to the section root (the old walk): an ancestor that holds anything besides
    the row (a heading, a second column, the whole section) is not the marquee, and its infinite X animation
    (a drifting decoration, a shaking badge) was being attributed to the items row. The section root itself
    is inspected only when it IS the single wrapper of the row; nothing above it ever is.
    """
    candidates: "list[Tag]" = [holder]
    wrapper = holder.parent
    if holder is not section_root and isinstance(wrapper, Tag):
        element_kids = wrapper.find_all(True, recursive=False)
        if len(element_kids) == 1:
            candidates.append(wrapper)
    return candidates


def lift_marquee_attrs(
    slug: "str | None",
    section_root: Tag,
    css_rules: dict,
    css_text: "str | None",
) -> "tuple[dict, list[tuple[str, str]]]":
    """Lift the block's marquee attrs from its items container's animation. See the module docstring."""
    if not slug or not css_text:
        return {}, []
    roles = db_lookup.marquee_attrs_for(slug)
    toggle = roles.get(_ROLE_TOGGLE)
    if toggle is None:
        return {}, []
    items, _below_threshold = _find_item_nodes(section_root)
    if not items or items[0].parent is None:
        return {}, []

    where = f"{slug}.marquee"
    shapes: "dict[str, dict]" = {}
    residual: "list[str]" = []
    rejected: "list[str]" = []
    for el in _candidate_elements(items[0].parent, section_root):
        shapes, residual, rejected = _tier_shapes(el, css_rules, css_text)
        if shapes or residual or rejected:
            break
    skipped: "list[tuple[str, str]]" = [
        (where, f"non-device-tier marquee breakpoint, not mapped (Spec 31 F-ii): {note}") for note in residual
    ]
    skipped.extend((where, reason) for reason in rejected)
    if not shapes:
        return {}, skipped

    order = _tier_order()
    names = [n for n, _lo, _hi in order]
    active = [n for n in names if n in shapes]
    k = len(active)
    if active != names[:k]:
        skipped.append((where, (
            f"the marquee runs on {active} only; {slug} can only say 'below a width' (a run of tiers "
            f"starting at {names[0]}), so nothing was written for it"
        )))
        return {}, skipped

    attrs: dict = {}
    below = roles.get(_ROLE_BELOW)
    every_width = k == len(names)
    if not every_width:
        below_value = order[k - 1][2] + 1
        if below is None:
            skipped.append((where, (
                f"the marquee runs below {below_value}px only, but {slug} has no {_ROLE_BELOW} attribute; "
                "nothing was written (the toggle alone would run it at every width)"
            )))
            return {}, skipped
        allowed = below["enum"]
        if isinstance(allowed, list) and below_value not in allowed:
            skipped.append((where, (
                f"the marquee runs below {below_value}px, not one of {below['attr']}'s values {allowed}; "
                "nothing was written"
            )))
            return {}, skipped
        attrs[below["attr"]] = below_value
    elif below is not None and below["default"] not in (0, None):
        attrs[below["attr"]] = 0

    attrs[toggle["attr"]] = True

    durations = {shapes[n]["seconds"] for n in active if shapes[n]["seconds"] is not None}
    duration = roles.get(_ROLE_DURATION)
    if durations:
        if duration is None:
            skipped.append((where, (
                f"draft marquee duration {sorted(durations)}s has no destination: {slug} has no "
                f"{_ROLE_DURATION} attribute"
            )))
        elif len(durations) > 1:
            skipped.append((where, (
                f"draft marquee duration differs by tier {sorted(durations)}s; one {duration['attr']} "
                "value cannot carry it, so none was written"
            )))
        else:
            seconds = next(iter(durations))
            attrs[duration["attr"]] = int(seconds) if float(seconds).is_integer() else seconds
    return attrs, skipped


__all__ = [
    "keyframes_translate_x_only",
    "keyframes_travel_problem",
    "lift_marquee_attrs",
    "marquee_shape",
    "marquee_verdict",
]

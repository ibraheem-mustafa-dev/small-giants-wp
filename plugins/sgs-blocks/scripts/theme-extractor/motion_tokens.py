"""motion_tokens.py — the draft's easing curves and hover movement timing (FR-33-1).

Two jobs, both read from the draft's ``tokens/*.css`` and the draft's own transitions:

1. ``apply_easings`` carries every easing a token file declares into ``settings.custom.easing`` of the
   snapshot (WordPress prints each key as ``--wp--custom--easing--<key>``). An easing is recognised by its
   VALUE (``cubic-bezier()`` or ``linear()``), never by the token's name. The client's own spring, the
   curve that overshoots 1 and is used most in the draft's CSS, takes the existing ``spring`` slot; every
   other curve is added under the token's name with its ``ease-`` stem removed, or skipped when an existing
   slot already holds the same curve.
2. ``movement_timing`` finds the hover movement timing: the duration and easing pair most used by the
   draft's transitions of ``transform``, ``translate``, ``scale`` or ``rotate``. ``apply_movement_timing``
   writes it to ``settings.custom.hover.duration`` and ``.easing`` (printed as ``--wp--custom--hover--*``,
   read by the Hover state's movement owners when the state stores no timing of its own). Each value is a
   ``var()`` reference to the duration or easing token that holds the same value, or the exact value when
   none does. A draft with no movement transition leaves the snapshot's hover timing as it was.
"""
from __future__ import annotations

import re
from collections import Counter

SPRING_SLOT = "spring"
_EASING_FN_RE = re.compile(r"^(cubic-bezier|linear)\(([^()]*)\)$", re.IGNORECASE)
_NUMBER_RE = re.compile(r"-?\d*\.?\d+")
_TRANSITION_RE = re.compile(r"(?<![\w-])transition\s*:\s*([^;{}\"'`]+)", re.IGNORECASE)
_VAR_RE = re.compile(r"var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)")
_TIME_RE = re.compile(r"^(-?\d*\.?\d+)(ms|s)$", re.IGNORECASE)
_WORD_SPLIT_RE = re.compile(r"\s+(?![^()]*\))")
_MOVEMENT_PROPS = frozenset({"transform", "translate", "scale", "rotate"})
_KEYWORD_EASINGS = ("ease", "ease-in", "ease-out", "ease-in-out", "linear")
_STEM_RE = re.compile(r"^(?:[a-z0-9]+-)?ease-")


def _fmt(num: float) -> str:
    text = f"{num:.4f}".rstrip("0").rstrip(".")
    return text if text not in ("", "-0") else "0"


def normalise_easing(value: str) -> str | None:
    """The curve in the snapshot's spelling (``cubic-bezier(0.3, 1.6, 0.5, 1)``), or None when the value is
    not a ``cubic-bezier()`` of four numbers or a ``linear()`` with stops."""
    match = _EASING_FN_RE.match(value.strip())
    if not match:
        return None
    fn, body = match.group(1).lower(), match.group(2)
    numbers = [float(n) for n in _NUMBER_RE.findall(body)]
    if fn == "cubic-bezier":
        return f"cubic-bezier({', '.join(_fmt(n) for n in numbers)})" if len(numbers) == 4 else None
    if not numbers:
        return None
    stops = ", ".join(" ".join(p.split()) for p in body.split(","))
    return f"linear({stops})"


def declared_easings(tokens: dict) -> dict:
    """``{token name: normalised curve}`` for every token whose value is an easing function, in declared order."""
    found: dict = {}
    for name, value in tokens.items():
        curve = normalise_easing(str(value))
        if curve:
            found[name] = curve
    return found


def _overshoots(curve: str) -> bool:
    numbers = [float(n) for n in _NUMBER_RE.findall(curve[curve.index("(") + 1:-1])]
    if curve.startswith("cubic-bezier"):
        return numbers[1] > 1 or numbers[3] > 1
    return any(n > 1 for n in numbers)


def _uses(html: str, name: str, curve: str = "") -> int:
    """Times the draft's CSS uses the token: by ``var()`` and by writing its curve out."""
    by_var = len(re.findall(r"var\(\s*--" + re.escape(name.lstrip("-")) + r"\s*[,)]", html))
    squashed = re.sub(r"\s+", "", html)
    numbers = _NUMBER_RE.findall(curve[curve.index("(") + 1:-1]) if curve else []
    pattern = r"cubic-bezier\(" + r",".join(r"0*" + re.escape(n.lstrip("0") or "0") + r"0*" for n in numbers) + r"\)"
    return by_var + (len(re.findall(pattern, squashed)) if curve.startswith("cubic-bezier") else 0)


def _key_for(name: str, taken: dict, curve: str) -> str:
    bare = name.lstrip("-").lower()
    key = _STEM_RE.sub("", bare) or bare
    return key if key not in taken or taken[key] == curve else f"draft-{key}"


def _token_values(tokens) -> dict:
    return tokens.get("tokens", tokens) if tokens else {}


def apply_easings(snap: dict, tokens, html: str, trace: list) -> dict:
    """Carry the token files' easings into ``settings.custom.easing`` (see the module docstring)."""
    easings = declared_easings(_token_values(tokens))
    if not easings:
        return snap
    slots = snap.setdefault("settings", {}).setdefault("custom", {}).setdefault("easing", {})
    springs = {n: c for n, c in easings.items() if _overshoots(c)}
    spring_name = None
    if springs:
        order = list(springs)
        spring_name = max(springs, key=lambda n: (_uses(html, n, springs[n]), -order.index(n)))
        slots[SPRING_SLOT] = springs[spring_name]
        trace.append({"kind": "motion", "what": f"settings.custom.easing.{SPRING_SLOT}",
                      "reason": f"the draft's own spring, {spring_name} (overshoots 1, used "
                                f"{_uses(html, spring_name, springs[spring_name])} times in its CSS)", "value": springs[spring_name]})
    for name, curve in easings.items():
        if name == spring_name:
            continue
        held = [k for k, v in slots.items() if v == curve]
        if held:
            trace.append({"kind": "motion", "what": f"tokens/*.css {name}",
                          "reason": f"already held by settings.custom.easing.{held[0]}", "value": curve})
            continue
        key = _key_for(name, slots, curve)
        slots[key] = curve
        trace.append({"kind": "motion", "what": f"settings.custom.easing.{key}",
                      "reason": f"carried from tokens/*.css {name}", "value": curve})
    return snap


def _milliseconds(text: str) -> int | None:
    match = _TIME_RE.match(text.strip())
    if not match:
        return None
    return round(float(match.group(1)) * (1 if match.group(2).lower() == "ms" else 1000))


def _split_top(text: str) -> list:
    parts, depth, start = [], 0, 0
    for i, ch in enumerate(text):
        depth += (ch == "(") - (ch == ")")
        if ch == "," and depth == 0:
            parts.append(text[start:i])
            start = i + 1
    parts.append(text[start:])
    return [p.strip() for p in parts if p.strip()]


def _resolve(text: str, values: dict) -> str:
    return _VAR_RE.sub(lambda m: str(values.get(m.group(1)[2:], m.group(0))), text)


def movement_timing(html: str, tokens) -> dict | None:
    """``{"duration_ms", "easing", "uses", "of"}`` for the duration and easing most used by the draft's
    movement transitions (ties go to the first seen), or None when it has none. A transition on ``all``
    names no property and is not counted. An easing the transition does not state is ``ease``."""
    values = _token_values(tokens)
    counts: Counter = Counter()
    for match in _TRANSITION_RE.finditer(html):
        for item in _split_top(_resolve(match.group(1), values)):
            words = _WORD_SPLIT_RE.split(item)
            if words[0].lower() not in _MOVEMENT_PROPS:
                continue
            times = [ms for ms in (_milliseconds(w) for w in words[1:]) if ms is not None]
            if not times:
                continue
            curve = next((normalise_easing(w) or w.lower() for w in words[1:]
                          if _EASING_FN_RE.match(w) or w.lower() in _KEYWORD_EASINGS), "ease")
            counts[(times[0], curve)] += 1
    if not counts:
        return None
    (duration, easing), uses = counts.most_common(1)[0]
    return {"duration_ms": duration, "easing": easing, "uses": uses, "of": sum(counts.values())}


def overall_timing(html: str, tokens) -> dict | None:
    """``{"duration_ms", "easing", "uses", "of"}`` for the duration and easing most used by every transition of the draft
    (any property, ``all`` included), or None when it has none. An easing a transition does not state is ``ease``."""
    values = _token_values(tokens)
    counts: Counter = Counter()
    for match in _TRANSITION_RE.finditer(html):
        for item in _split_top(_resolve(match.group(1), values)):
            words = _WORD_SPLIT_RE.split(item)
            if words[0].lower() == "none":
                continue
            times = [ms for ms in (_milliseconds(w) for w in words[1:]) if ms is not None]
            if not times:
                continue
            curve = next((normalise_easing(w) or w.lower() for w in words[1:]
                          if _EASING_FN_RE.match(w) or w.lower() in _KEYWORD_EASINGS), "ease")
            counts[(times[0], curve)] += 1
    if not counts:
        return None
    (duration, easing), uses = counts.most_common(1)[0]
    return {"duration_ms": duration, "easing": easing, "uses": uses, "of": sum(counts.values())}


def propose_movement_timing(html: str, tokens, trace: list) -> dict | None:
    """Trace the movement timing proposal as a ``proposal`` row named ``hover-movement-timing``."""
    proposal = movement_timing(html, tokens)
    if proposal:
        trace.append({"kind": "proposal", "what": "hover-movement-timing",
                      "reason": "most-used duration and easing of the draft's transform, translate, scale and "
                                "rotate transitions (written to settings.custom.hover)", **proposal})
    return proposal


def _token_scale(snap: dict, baseline: dict | None, group: str) -> dict:
    """The site's ``settings.custom.<group>`` as WordPress merges it: the snapshot's keys over the theme's."""
    theme = (((baseline or {}).get("settings") or {}).get("custom") or {}).get(group) or {}
    own = ((snap.get("settings") or {}).get("custom") or {}).get(group) or {}
    return {**theme, **own}


def _duration_value(ms: int, scale: dict) -> str:
    key = next((k for k, v in scale.items() if _milliseconds(str(v)) == ms), None)
    return f"var(--wp--custom--duration--{key})" if key else f"{ms}ms"


def _easing_value(curve: str, scale: dict) -> str:
    def same(value) -> bool:
        text = str(value).strip()
        return (normalise_easing(text) or text.lower()) == curve
    key = next((k for k, v in scale.items() if same(v)), None)
    return f"var(--wp--custom--easing--{key})" if key else curve


def apply_movement_timing(snap: dict, proposal: dict | None, baseline: dict | None, trace: list) -> dict:
    """Write the movement timing to ``settings.custom.hover`` (see the module docstring). Run it after
    ``apply_easings`` so the client's own spring is already in its slot."""
    if not proposal:
        return snap
    hover = {
        "duration": _duration_value(proposal["duration_ms"], _token_scale(snap, baseline, "duration")),
        "easing": _easing_value(proposal["easing"], _token_scale(snap, baseline, "easing")),
    }
    snap.setdefault("settings", {}).setdefault("custom", {})["hover"] = hover
    for key, value in hover.items():
        trace.append({"kind": "motion", "what": f"settings.custom.hover.{key}",
                      "reason": f"the draft's movement timing, {proposal['duration_ms']}ms {proposal['easing']} "
                                f"({proposal['uses']} of {proposal['of']} movement transitions)", "value": value})
    return snap

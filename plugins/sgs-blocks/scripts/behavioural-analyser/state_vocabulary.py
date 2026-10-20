"""state_vocabulary.py -- the framework state vocabulary for the classifier (Spec 48 FR-48-81, the states wave).

The classifier tags a setting's `css_state` from the selector its declaration sits under. The state words and every
mechanism that expresses them come from `scripts/data/states.json` (the source of the framework DB's `states` table),
never from a list in code:

  * `derive_state(selector)` -> (state, token text) for the first vocabulary token the selector carries, outside any
    `:not( ... )` (a negated token says "not in that state");
  * `bem_state(selector, block, siblings)` -> (state, token text) for a BEM element modifier (`__item--active`) that the
    vocabulary names, only when every modifier the stylesheet pairs with that element is a state modifier: a modifier
    beside a value variant (`price--current` next to `price--regular`) is a variant, never a state.

Only the families this wave tags are used (TAGGED_FAMILIES): form-field states belong to the shop, forms and data wave,
effect states to the behaviour recognisers, and environment states (media features) to the media-feature entries.
Player states are left out because their styles are fixed (no setting paints under them), and their class names collide
with other meanings elsewhere (sgs/choice-flow's `.is-muted` is de-emphasised text, not a muted player).
Tokens a reader cannot enter in a page (reach `unreachable`, `at-rest`, `emulate-media`) tag nothing.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

STATES_FILE = Path(__file__).resolve().parent.parent / "data" / "states.json"
TAGGED_FAMILIES = frozenset(("pointer-keyboard", "press", "current", "open", "disabled", "page", "visibility", "progress"))
ENTERABLE = frozenset(("force-pseudo", "set-attribute", "toggle-class", "call", "scroll"))


def token_regex(row: dict) -> "str | None":
    """The regex that finds one vocabulary row's token in a selector (the classifier lowercases selectors first).
    Mirrors scripts/computed-route/lib/fill-state-read.mjs::tokenSource."""
    t = row["token"].lower()
    kind = row["kind"]
    if kind == "media":
        return None
    if kind == "pseudo-class":
        return re.escape(t) + r"(?![\w-])"
    if t.startswith("["):
        m = re.match(r'^\[([\w-]+)(?:([~|^$*]?=)"?([^"\]]*)"?)?(\])?$', t)
        if not m:
            return None
        name, op, value, closed = m.groups()
        if not closed:
            return r"\[\s*" + re.escape(name) + r"(?![\w-])[^\]]*\]"
        if op:
            return r"\[\s*" + re.escape(name) + r"\s*" + re.escape(op) + r"\s*[\"']?" + re.escape(value) + r"[\"']?\s*\]"
        return r"\[\s*" + re.escape(name) + r"(?:\s*[~|^$*]?=[^\]]*)?\s*\]"
    if t.startswith("--"):
        return None  # a BEM modifier: bem_state() judges it with its siblings
    if t.endswith("-"):
        return r"\." + re.escape(t) + r"[\w-]+"
    return r"\." + re.escape(t) + r"(?![\w-])"


@lru_cache(maxsize=1)
def _rows() -> "tuple[dict, ...]":
    data = json.loads(STATES_FILE.read_text(encoding="utf-8"))
    return tuple(r for r in data["states"] if r["family"] in TAGGED_FAMILIES and r["reach"] in ENTERABLE)


@lru_cache(maxsize=1)
def _patterns() -> "tuple[tuple[re.Pattern, str], ...]":
    out = []
    for r in _rows():
        src = token_regex(r)
        if src:
            out.append((re.compile(src), r["state"]))
    return tuple(out)


@lru_cache(maxsize=1)
def bem_modifiers() -> "dict[str, str]":
    """Every BEM modifier the vocabulary names in the tagged families: suffix (without `--`) -> state."""
    return {r["token"][2:].lower(): r["state"] for r in _rows() if r["kind"] == "class" and r["token"].startswith("--")}


def _negated(sel: str, at: int) -> bool:
    depth = 0
    for k in range(at - 1, -1, -1):
        ch = sel[k]
        if ch == ")":
            depth += 1
        elif ch == "(":
            depth -= 1
            if depth < 0:
                return sel[:k].endswith(":not")
    return False


def derive_state(selector: str) -> "tuple[str | None, str | None]":
    """(state, token text) for the first vocabulary token in the selector, in vocabulary order; (None, None) when none."""
    sel = selector.lower()
    for pattern, state in _patterns():
        for m in pattern.finditer(sel):
            if not _negated(sel, m.start()):
                return state, m.group(0)
    return None, None


@lru_cache(maxsize=1)
def _untagged_patterns() -> "tuple[re.Pattern, ...]":
    data = json.loads(STATES_FILE.read_text(encoding="utf-8"))
    rows = [r for r in data["states"] if r["family"] not in TAGGED_FAMILIES and r["family"] != "environment"]
    return tuple(re.compile(src) for src in (token_regex(r) for r in rows) if src)


def untagged_state_token(selector: str) -> bool:
    """Whether the selector carries a state token from a family another wave owns (form-field, effect, player)."""
    sel = selector.lower()
    return any(p.search(sel) for p in _untagged_patterns())


_BEM_ELEMENT_MODIFIER_RE = re.compile(r"sgs-([a-z0-9-]+?)__([a-z0-9-]+)--([a-z0-9-]+)", re.IGNORECASE)


def bem_state(selector: str, block_short_slug: str, sibling_modifiers: "dict[str, set[str]]") -> "tuple[str | None, str | None]":
    """(state, token text) for a state modifier on one of this block's BEM elements, when every modifier the stylesheet
    pairs with that element is a state modifier; (None, None) otherwise."""
    states = bem_modifiers()
    for m in _BEM_ELEMENT_MODIFIER_RE.finditer(selector):
        if m.group(1).lower() != block_short_slug.lower() or _negated(selector.lower(), m.start()):
            continue
        element, modifier = m.group(2).lower(), m.group(3).lower()
        siblings = sibling_modifiers.get(element, set()) | {modifier}
        if modifier in states and siblings <= set(states):
            return states[modifier], "--" + modifier
    return None, None

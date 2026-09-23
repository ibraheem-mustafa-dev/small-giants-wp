"""preset_absence.py — Build #3 Option B: preset-absence transfer (AUTO-DERIVE).

Design ref: dispatch prompt "preset-absence transfer (Build #3, Option B,
AUTO-DERIVE variant)", 2026-07-24. Spec 31 §13.1 R-31-1 (DB-first, no
hardcoded dicts) / R-31-9 (universal mechanisms, no per-block carve-outs).

THE PROBLEM. When the cloning pipeline builds a card-like block (info-box,
team-member, card-grid, testimonial) from a draft, it always leaves the
block's style-preset attrs (`cardStyle`, `effectHover`) at their block.json
default — e.g. `cardStyle=elevated` (paints box-shadow) / `effectHover=lift`
(paints a hover transform) — regardless of what the draft actually had. This
module fixes that: it reads what the cloned element's REAL CSS declares and
picks the preset value that matches, or the block's neutral value when
nothing matches.

THE MAPPING IS NEVER HAND-AUTHORED HERE. The per-value CSS→meaning mapping
(does "elevated" mean box-shadow? does "bordered" mean border?) is
AUTO-DERIVED at `/sgs-update` time by parsing each block's own style.css
against a minimal block.json hint (`supports.sgs.presetSelectors`) — see
`sgs-update-v2.py::_populate_preset_implications` — and cached in the
`preset_implications` DB table. This module only reads that table plus the
current node's already-collected declarations; it is a single universal
function that runs identically for every block with rows in the table (most
blocks: zero rows, true no-op) — no `if rec.slug == "sgs/info-box"` branch
anywhere (enforced by gates/no_slug_literal.py + this module's own scoped
gate, gates/check_preset_absence_no_slug_literal.py).
"""
from __future__ import annotations

import functools
import json
import sqlite3
from pathlib import Path
from typing import Any

from converter.context import Recognition
from converter.db import db_lookup

# Which collected-declaration bucket each preset attr's signal lives in, and
# the css_state the RECONCILIATION query (below) is scoped to. A per-ATTR-NAME
# convention (universal across any block that declares the attr), mirroring
# `sgs-update-v2._PRESET_CLASS_CONVENTIONS` on the seeding side.
_PRESET_STATE: dict[str, "str | None"] = {
    "cardStyle": None,
    "effectHover": "hover",
}

# Tie-break priority when >=2 candidate values fully match the SAME number of
# present signal properties (Component 4 step 4: "prefer shadow (elevated)").
# Higher wins.
_SIGNAL_PRIORITY: dict[str, int] = {"box-shadow": 3, "border": 2, "transform": 1, "transition": 0}


def _present_properties_from_decls(decls: dict) -> set:
    """Which signal properties a raw declaration dict (`base_decls` or a
    `state_decls['Hover']` bucket) meaningfully paints.

    Mirrors `sgs-update-v2._classify_preset_decls` EXACTLY — the seeding side
    and the matching side must use identical semantics, or a value could be
    seeded as "has box-shadow" and never match a draft that genuinely has one
    (or the reverse).
    """
    signals: set = set()
    box_shadow = str(decls.get("box-shadow", "")).strip().lower()
    if box_shadow and box_shadow != "none":
        signals.add("box-shadow")
    border_shorthand = str(decls.get("border", "")).strip().lower()
    border_width = str(decls.get("border-width", "")).strip().lower()
    border_style = str(decls.get("border-style", "")).strip().lower()
    if (
        (border_shorthand and not border_shorthand.startswith(("none", "0")))
        or (border_width and border_width not in ("0", "0px", "none"))
        or (border_style and border_style not in ("none", ""))
    ):
        signals.add("border")
    transform = str(decls.get("transform", "")).strip().lower()
    if transform and transform != "none":
        signals.add("transform")
    return signals


def _is_written(value: Any) -> bool:
    """Presence test for an already-resolved attr value in `attrs_so_far`
    (mirrors `db_lookup._slot_extracted`'s "meaningfully written" semantics)."""
    if value is None or value == "":
        return False
    if isinstance(value, (dict, list, tuple, set, frozenset)) and len(value) == 0:
        return False
    return True


def _reconcile_properties(
    block_slug: str,
    state: "str | None",
    candidate_props: frozenset,
    attrs_so_far: dict,
    raw_present: set,
) -> set:
    """Component 4 step 3 — RECONCILIATION.

    For each signal property this preset attr's candidates care about: if the
    block declares a DIFFERENT attr for the same (css_property, css_state) —
    e.g. `cardShadow` (box-shadow, base state) or `scaleHover`/`shadowHover`
    (transform/box-shadow, hover state) — that attr's WRITE presence in
    `attrs_so_far` (already resolved by an earlier resolver in THIS same
    process_element pass) is authoritative: DEFER to it rather than
    re-deriving from the raw declarations. This keeps the two mechanisms
    disjoint — the preset resolver only ever WRITES the preset-selector attr
    itself (`cardStyle`/`effectHover`), never the underlying shadow/transform
    attr, so there is no double-paint.

    Falls back to the raw-declarations signal for any property with no
    dedicated reconciliation attr on this block (e.g. info-box's cardStyle has
    no `cardShadow`/`cardBorderWidth` companion at base state).
    """
    resolved: set = set()
    for prop in candidate_props:
        reconciliation_attrs = db_lookup.attrs_for_css_property_state(block_slug, prop, state)
        if reconciliation_attrs and any(_is_written(attrs_so_far.get(a)) for a in reconciliation_attrs):
            # A dedicated companion attr (e.g. cardShadow) captured this property
            # as a real value — DEFER to its write (present) and never re-derive,
            # so the two mechanisms stay disjoint (no double-paint).
            resolved.add(prop)
        elif prop in raw_present:
            # No companion write. Either the block has no companion attr for this
            # property (info-box's cardStyle), OR the companion's writer GAPPED it
            # — e.g. outer_box's box-shadow token-snap rejects a non-preset shadow
            # value and writes nothing (a deliberate no-cheats gap). In BOTH cases
            # the draft still genuinely paints the property (raw_present already
            # excludes `none`/`0`), so it counts PRESENT and the preset picks its
            # "present" value (e.g. elevated), rendering the block's generic preset
            # fallback rather than dropping to the neutral. FIDELITY FLOOR: a real
            # shadow the token-snap can't match must NOT silently become "no shadow"
            # on the clone (qc-council finding, 2026-07-24).
            resolved.add(prop)
    return resolved


@functools.lru_cache(maxsize=256)
def _declared_default(db_path: str, block_slug: str, attr: str) -> Any:
    """The block's own `block.json` default for `attr` (`block_attributes.default_value`, JSON), or None when the row,
    the column or the database is missing (soft-fail: the tie rule then simply does not apply). Keyed on the database
    path so a caller that repoints `db_lookup.SGS_DB` (a pinned copy) never reads a stale answer."""
    if not Path(db_path).is_file():
        return None
    try:
        conn = db_lookup.get_connection(db_path)
    except sqlite3.Error:
        return None
    try:
        row = conn.execute(
            "SELECT default_value FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr),
        ).fetchone()
    except sqlite3.Error:
        row = None
    finally:
        conn.close()
    if not row or row[0] is None:
        return None
    try:
        return json.loads(row[0])
    except (TypeError, ValueError):
        return None


def _block_default(block_slug: str, attr: str) -> Any:
    return _declared_default(str(db_lookup.SGS_DB), block_slug, attr)


def _default_holds(candidates: tuple, present_props: set, default: "str | None", qualifying: list) -> bool:
    """The tie rule of `_pick_value`: the block's default is kept (see there). `qualifying` = [(value, count, priority)]."""
    best = max((count for _v, count, _p in qualifying), default=0)
    for value, props, is_neutral in candidates:
        if value != default or is_neutral:
            continue
        if props:
            return props.issubset(present_props) and len(props) == best
        return bool(qualifying) and best <= 1
    return False


def _pick_value(candidates: tuple, present_props: set, default: "str | None" = None) -> "str | None":
    """Component 4 step 4 — PICK.

    `candidates` = ((enum_value, frozenset(implied_props), is_neutral), ...).
    `default` = the block's own `block.json` default for this attr (None when unknown).

    A non-neutral value QUALIFIES only when EVERY one of its implied
    properties is present — a full-match requirement, so a value needing only
    `transform` (e.g. card-grid's "zoom") never wins over one needing BOTH
    `transform` AND `box-shadow` (e.g. "lift") when both properties are
    genuinely present; "lift" is the more specific, more correct match.

    PREFER THE DEFAULT ON A TIE (design 2026-09-23 §4, Bean-approved shared change). The block's default look is its
    baseline, so it is kept whenever the draft gives no reason to leave it:
      * a default WITH implied properties is kept when it qualifies and no qualifying value needs MORE properties
        (an equal-count rival such as `bordered` beside a bordered default no longer displaces it);
      * a SIGNAL-LESS, non-neutral default (a hand-picked look, `supports.sgs.presetManualValues`, seeded with no implied
        property so it is never auto-picked; or a look whose CSS paints none of the signal properties) says nothing the
        draft could contradict, so it ties with any ONE-property match and is kept unless a qualifying value needs two or
        more properties (strictly more specific). It is NOT kept when the draft paints none of the signal properties at
        all: the neutral is then the exact match (a non-neutral look paints something the draft does not).
    A neutral default changes nothing (the neutral already wins only when nothing qualifies).

    Otherwise, among qualifying values: prefer more implied properties (more specific
    match wins), then the highest-priority single property
    (`_SIGNAL_PRIORITY` — box-shadow beats border/transform on an equal-count
    tie, e.g. info-box "elevated" vs "bordered" both needing exactly 1
    property), then alphabetical order (deterministic tie-break of last
    resort). No qualifying value -> the block's `is_neutral` value.
    """
    qualifying = []
    for value, props, is_neutral in candidates:
        if is_neutral or not props:
            continue
        if props.issubset(present_props):
            priority = max((_SIGNAL_PRIORITY.get(p, -1) for p in props), default=-1)
            qualifying.append((value, len(props), priority))
    if _default_holds(candidates, present_props, default, qualifying):
        return default
    if qualifying:
        qualifying.sort(key=lambda t: (-t[1], -t[2], t[0]))
        return qualifying[0][0]
    for value, _props, is_neutral in candidates:
        if is_neutral:
            return value
    return None


def apply_preset_absence(
    rec: "Recognition | None",
    attrs_so_far: dict,
    base_decls: dict,
    state_decls: dict,
) -> dict:
    """Component 4 entry point.

    Called by `css_pass._build_css_attrs` AFTER `process_element` has run and
    merged its attrs into `attrs_so_far` (so shadow/border/transform resolvers
    have already written whatever they were going to write), BEFORE that
    function returns.

    Returns `{preset_attr: enum_value}` to merge into the block's attrs — only
    for preset attrs the block actually has rows for in `preset_implications`
    (the overwhelming majority of blocks: empty dict, true no-op — the DB-
    existence gate in step 5 of the design, keyed on `rec.slug`, never a slug
    literal).
    """
    if rec is None or rec.slug is None:
        return {}

    candidates_by_attr: dict[str, list] = {}
    for preset_attr, enum_value, props, is_neutral in db_lookup.preset_implications_for(rec.slug):
        candidates_by_attr.setdefault(preset_attr, []).append((enum_value, props, is_neutral))
    if not candidates_by_attr:
        return {}

    out: dict = {}
    for preset_attr, candidates in candidates_by_attr.items():
        state = _PRESET_STATE.get(preset_attr)
        raw_decls = state_decls.get("Hover", {}) if state == "hover" else base_decls
        raw_present = _present_properties_from_decls(raw_decls or {})
        candidate_props = frozenset().union(*(props for _v, props, _n in candidates)) if candidates else frozenset()
        present_props = _reconcile_properties(
            rec.slug, state, candidate_props, attrs_so_far, raw_present
        )
        default = _block_default(rec.slug, preset_attr)
        picked = _pick_value(tuple(candidates), present_props, default if isinstance(default, str) else None)
        if picked is not None:
            out[preset_attr] = picked
    return out

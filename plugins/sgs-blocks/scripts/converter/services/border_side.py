"""border_side — per-side border-width longhand → merged ``borderWidth`` object.

A draft's per-side border longhands (``border-top-width`` / ``border-right-width``
/ ``border-bottom-width`` / ``border-left-width``) must ACCUMULATE into the block's
SGS-custom ``borderWidth`` box-object attr ``{top,right,bottom,left}``
(``attr_type='object'``, ``box_family='borderWidth'`` on the 8 blocks that declare
it — button/heading/icon-list/option-picker/process-steps/quote/text/timeline),
EXACTLY as the per-side PADDING longhands accumulate into ``contentBandPadding``
via ``content_band._content_band_box_write``. Each longhand returns ONE partial
side ``Write(attr='borderWidth', value={side: length})``; ``ElementResult.attrs()``
merges the up-to-4 partial writes into the single object (first-write-per-key,
Spec 31 §3.A step 3b / box-object interface contract §3/§4) — the SAME accumulator
seam padding uses, never a hand-rolled parallel merge.

WHY a shared helper called from BOTH resolvers: the border-width self-merge already
lives (deliberately duplicated, "ONE mechanism" R-31-9) in BOTH ``outer_box.resolve``
and ``content_band.resolve``, because a border-carrying block routes to ``outer_box``
when its base layer is OUTER and to ``content_band`` when it is a CONTENT leaf
(sgs/text's disclaimer — D307). The per-side path must cover both; one shared
function, imported by both, keeps them in lock-step.

GATE — ``box_family`` DB classification, NEVER an attr-name regex (§13.4 FR-31-22.2
AST collision gate, ``scripts/check-box-family-guard.py``): the ``side in`` test is
exempt only because this function also binds the identifier ``box_family`` from the
DB. The ``border-{side}-width`` split is a CSS-PROPERTY parse (the SAME idiom
``content_band`` uses for ``padding-{side}``), not a block/attr name carve-out.

TIERS — ``borderWidth`` is base-only on all 8 blocks (no ``borderWidthTablet``/
``Mobile``). A Tablet/Mobile per-side longhand resolves ``object_attr=
'borderWidthTablet'``, which no block declares → ``box_family_for`` returns None
!= ``object_attr`` → this returns None → the caller emits an honest NO_DESTINATION
gap. That is the SAME base-only contract the shorthand self-merge already has, via
the SAME shared ``tier_state_suffix`` mechanism — no separate tier handling.
"""
from __future__ import annotations

from typing import Any

from converter.db import db_lookup
from converter.models import Write
from converter.services.attr_resolve import attr_resolve
from converter.services.styling_helpers import strip_important
from converter.services.tier_suffix import tier_state_suffix

# CSS box-model side tokens (the border-{side}-width longhand set). CSS vocabulary,
# not a block/attr/slot carve-out (no_slug_literal scope) — same class as
# content_band's ("top","right","bottom","left") side check.
_BORDER_SIDES: frozenset[str] = frozenset({"top", "right", "bottom", "left"})

# The un-sided base CSS property whose block attr the sided longhands share. A CSS
# property literal (the same class as content_band's "padding-" prefix), not a slug.
_BORDER_WIDTH_PROP = "border-width"


def border_side_write(decl: Any, ctx: Any) -> Write | None:
    """Route a ``border-{side}-width`` decl into the merged ``borderWidth`` object.

    Returns a partial-side ``Write(attr=<borderWidth tier attr>, value={side: length})``
    when the owning block declares the ``borderWidth`` box-object family at this decl's
    tier; ``None`` (never a GAP) when it does not — the caller falls through to its
    ordinary layer-priority / suffix chain unchanged, which emits the honest gap.
    """
    prop = decl.property
    if not (prop.startswith("border-") and prop.endswith("-width")):
        return None
    side = prop[len("border-"):-len("-width")]
    if side not in _BORDER_SIDES:
        return None

    # ``borderWidth`` is an OUTER/box property: resolve the block's base attr for the
    # un-sided ``border-width`` (DB-driven, name-free — the SAME attr the shorthand
    # self-merge writes), then re-append the tier suffix via the shared helper.
    base_attr = attr_resolve(ctx, "OUTER", _BORDER_WIDTH_PROP)
    if base_attr is None:
        return None
    object_attr = tier_state_suffix(base_attr, decl, ctx.conn)

    # Self-merge box-object signal: the attr IS its own family base (the same gate
    # outer_box / content_band use, ``box_family_for(block, attr) == attr``). Binding
    # the identifier ``box_family`` here is what exempts the ``side in`` test from the
    # AST collision gate — the grouping is DB-classification-driven, not a name guess.
    box_family = db_lookup.box_family_for(ctx.block_slug, object_attr)
    if box_family != object_attr:
        return None

    value = strip_important(decl.value).strip()
    if not value:
        return None
    return Write(attr=object_attr, value={side: value}, property=prop, tier=decl.tier)

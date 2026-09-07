"""box_side — per-side padding/margin longhand -> merged box-object attr.

Sibling of ``border_side.border_side_write`` (``border-{side}-width`` -> merged
``borderWidth``), generalised to the other two box families a leaf/content block
may declare: ``padding`` and ``margin``. A draft's per-side longhands
(``padding-top``/``-right``/``-bottom``/``-left``, ``margin-top``/``-right``/
``-bottom``/``-left``) must ACCUMULATE into the owning block's SGS-custom
box-object attr (``attr_type='object'``, ``box_family=<attr>`` self-referencing,
e.g. ``sgs/text.margin``/``sgs/text.padding``) exactly the way per-side
border-width longhands already do.

BUG FIX (2026-09-07): ``margin-bottom`` stopped extracting on every content leaf
(sgs/text, sgs/heading, ...) once those blocks moved margin OFF native
WordPress ``supports.spacing.margin`` (which ``root_supports.py`` lifted
per-side into ``style.spacing.margin.*`` generically) onto their own custom
``margin`` box-object attr (Spec 32 no-inline-styling contract). Nothing
replaced the per-side merge path for the new custom-attr shape: the ordinary
``attr_for_layer_property`` chain only matches a FLAT per-side attr name
(``marginBottom``), which these blocks no longer declare, so every per-side
margin longhand fell through to an honest NO_DESTINATION gap. ``padding``
happened to keep working only where the draft declares the full ``padding``
SHORTHAND (``outer_box.resolve`` has its own dedicated shorthand branch); a
per-side ``padding-{side}`` longhand had exactly the same gap as margin. This
module closes both, universally, via the same box_family gate
``border_side_write`` already uses — no per-block branch.

GATE — ``box_family`` DB classification, NEVER an attr-name regex (§13.4
FR-31-22.2 AST collision gate, ``scripts/check-box-family-guard.py``): the
``side in`` test is exempt only because this function also binds the
identifier ``box_family`` from the DB, mirroring ``border_side_write``'s own
exemption.

Resolves at the OUTER layer unconditionally, regardless of which resolver
calls it (``outer_box.py`` or ``content_band.py``) — the SAME choice
``border_side_write`` already makes for ``borderWidth``: a box-family attr
like ``margin``/``padding`` is always registered unprefixed on the owning
block, never CONTENT/GRID-prefixed (those prefixed families, e.g.
``contentBandPadding``, are owned by ``content_band._content_band_box_write``
instead and are tried first by callers).
"""
from __future__ import annotations

from typing import Any

from converter.db import db_lookup
from converter.models import Write
from converter.services.attr_resolve import attr_resolve
from converter.services.styling_helpers import strip_important
from converter.services.tier_suffix import tier_state_suffix

# CSS box-model side tokens — the {padding,margin}-{side} longhand set. CSS
# vocabulary, not a block/attr/slot carve-out (no_slug_literal scope), same
# class as ``border_side._BORDER_SIDES``.
_BOX_SIDES: frozenset[str] = frozenset({"top", "right", "bottom", "left"})

# The two un-sided base CSS properties whose block attr the sided longhands
# share. CSS property literals (the same class as ``content_band``'s
# ``_BAND_BOX_PROPS``), not slugs.
_BOX_SIDE_PROPS: frozenset[str] = frozenset({"padding", "margin"})


def box_side_write(decl: Any, ctx: Any) -> Write | None:
    """Route a ``padding-{side}``/``margin-{side}`` decl into the block's own
    merged ``padding``/``margin`` box-object attr.

    Returns a partial-side ``Write(attr=<box tier attr>, value={side: length})``
    when the owning block declares that box-object family at this decl's tier;
    ``None`` (never a GAP) when it does not — the caller falls through to its
    ordinary layer-priority / property_suffixes chain unchanged, which emits
    the honest gap.
    """
    prop = decl.property
    base_prop: str | None = None
    side: str | None = None
    for candidate in _BOX_SIDE_PROPS:
        if prop.startswith(f"{candidate}-"):
            maybe_side = prop[len(candidate) + 1:]
            if maybe_side in _BOX_SIDES:
                base_prop = candidate
                side = maybe_side
            break
    if base_prop is None or side is None:
        return None

    # Resolve the block's base attr for the un-sided property at the OUTER
    # layer (DB-driven, name-free — the SAME attr a full shorthand self-merges
    # onto), then re-append the tier/state suffix via the shared helper.
    base_attr = attr_resolve(ctx, "OUTER", base_prop)
    if base_attr is None:
        return None
    object_attr = tier_state_suffix(base_attr, decl, ctx.conn, ctx.block_slug)

    # Self-merge box-object signal: the attr IS its own family base (the same
    # gate outer_box / content_band / border_side use). Binding the identifier
    # ``box_family`` here is what exempts the ``maybe_side in`` test above from
    # the AST collision gate — the grouping is DB-classification-driven, not a
    # name guess.
    box_family = db_lookup.box_family_for(ctx.block_slug, object_attr)
    if box_family != object_attr:
        return None

    value = strip_important(decl.value).strip()
    if not value:
        return None
    return Write(attr=object_attr, value={side: value}, property=prop, tier=decl.tier)

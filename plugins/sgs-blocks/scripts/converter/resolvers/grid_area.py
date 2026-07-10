"""grid_area — the GRID_AREA-layer resolver (Spec 31 §3.A L4 / D207 grid-per-area).

An element the Ctx-builder placed in a named area of its PARENT's grid (BEM token ∈
parent ``grid_item_areas``; ``ctx.area_name`` set; ``layer_detect`` → GRID_AREA)
DISSOLVES into the owning composite — its own box CSS routes to the owning block's
per-area attrs ``<areaName>+<PropertySuffix>`` (``content``+``PaddingTop`` →
``contentPaddingTop``) via ``db.attr_for_area_property(block, area, css_property)``
(Spec 31 §3.A.3 step 2; the faithful per-decl modular form of convert.py
``_route_area_css_to_block_attrs`` 2405).

Real transfers (this resolver OWNS the GRID_AREA layer): every per-area box CSS
property the owning block declares an ``<area>+<suffix>`` attr for — padding
longhands, background-color, etc. Numeric per-area attrs store the number + a
``…Unit`` companion (list[Write], seam decision multi-Write). Tier handling uses the
standard device-tier ``tier_suffix`` (ONE tier vocabulary, Spec 31 §3.A.4) — Base →
unsuffixed (SGS desktop), Tablet → ``*Tablet``, Mobile → ``*Mobile``.

FIX-A decision (per-slot max-width — DOCUMENTED EXCLUDED GAP, not Ctx enrichment):
a per-area ``max-width`` resolves through the SAME ``attr_for_area_property`` path
per declaration; when the owning block declares no ``<area>MaxWidth``/``<area>Width``
attr (e.g. sgs/hero has ``contentWidth`` but NOT a per-area ``contentMaxWidth``), the
declaration gaps NO_DESTINATION with a proposed-action reason. The convert.py FIX-A
read the node's full base_decls to special-case this; the per-decl seam does not
carry the node's other decls, and special-casing one property would re-introduce a
per-property branch. The honest gap is the faithful behaviour — closing it is a DB
seed (add the per-area attr), not a resolver workaround. (Seam decision item 6.)

REUSES main's shared helpers: ``styling_helpers.split_value_unit``,
``strip_important``. NO block-slug literals.
"""
from __future__ import annotations

from typing import Any

from converter.models import GAP, GapOrigin, Write
from converter.services.gap_writer import gap_writer
from converter.services.styling_helpers import split_value_unit, strip_important
from converter.services.tier_suffix import tier_suffix
from converter.services.validate import attr_is_number, validate
from converter.services.value_serialise import value_serialise
from converter.db import db_lookup
from converter.db.db_lookup import attr_for_area_property, unit_companion_attr

# Per-area properties NOT routed (mirrors convert.py's _area_excluded set: a grid
# item's own sizing/positioning is consumed by the grid dissolve, not re-emitted).
_AREA_EXCLUDED = frozenset({
    "grid-area", "width", "height", "max-height", "min-height", "min-width",
    "display", "grid-template-columns", "grid-template-rows", "grid-template-areas",
})


# The attr_type predicate moved to the SHARED converter.services.validate.
# attr_is_number (CG-4 rater Finding 2, 2026-07-05) — this local copy was
# number-only and MISSED the Step-12 'integer' widening; ONE implementation
# now serves all four resolvers (R-31-9).
_attr_is_number = attr_is_number


def _area_box_write(decl: Any, ctx: Any, area: str) -> Write | None:
    """Route a per-area ``padding-{side}`` declaration into the owning block's
    merged ``{area}Padding{Tier}`` box-object attr (box-object interface contract
    §3/§4, FR-31-22), mirroring ``content_band._content_band_box_write`` for the
    L4 GRID-PER-AREA layer.

    When a composite migrated its per-area padding flat→OBJECT (D295 sgs/hero:
    ``contentPadding``/``mediaPadding``/``imagePadding`` incl. Tablet/Mobile
    tiers), the flat ``attr_for_area_property`` path returns None (the flat
    ``contentPaddingTop`` no longer exists), so this diverts the side decl into
    the object attr BEFORE that flat chain — the orchestrator accumulator
    (``ElementResult.attrs``) folds the four ``{side: value}`` writes into the one
    object attr. Gated on ``db_lookup.box_family_for``, NEVER an attr-name regex
    (§3.A step-3b AST gate).

    Returns ``None`` (never a GAP — caller falls through to the flat chain) when
    the box-object path doesn't apply: a non-padding per-area property
    (``background-color`` → ``contentBackground``), or a block still on flat
    per-area attrs (``box_family_for`` None). No block-slug literal.
    """
    prop = decl.property
    if not prop.startswith("padding-"):
        return None
    side = prop[len("padding-"):]
    if side not in ("top", "right", "bottom", "left"):
        return None

    area_prefix = area[0].lower() + area[1:]
    family = f"{area_prefix}Padding"
    object_attr = tier_suffix(family, decl.tier, ctx.conn)
    # Gate on the DB box_family classification (§3.A step-3b), NEVER a name regex.
    box_family = db_lookup.box_family_for(ctx.block_slug, object_attr)
    if box_family is None:
        return None

    # Box-object value = a CSS length STRING with its unit inline (Spec 32 §6.1(a);
    # e.g. "32px"), never a number + Unit companion — the object holds all sides.
    value = value_serialise("string", None, strip_important(decl.value).strip())
    return Write(attr=object_attr, value={side: value}, property=prop, tier=decl.tier)


def resolve(decl: Any, ctx: Any) -> Write | list[Write] | GAP:
    prop = decl.property
    area = getattr(ctx, "area_name", None)
    if not area:
        # Should not happen — layer_detect returns GRID_AREA only when area_name is
        # set. A GRID_AREA dispatch with no area is a routing bug → fail loud.
        return GAP(
            origin=GapOrigin.UNROUTED,
            property=prop,
            tier=decl.tier,
            detail="grid_area resolver reached with no ctx.area_name (routing bug)",
        )

    if prop in _AREA_EXCLUDED:
        return gap_writer(
            ctx, decl, GapOrigin.EXCLUDED,
            f"{prop} is consumed by the grid dissolve, not re-emitted as a per-area attr",
            f4_ref=prop,
        )

    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for {prop} (§3.A A4)",
        )

    # Box-object contract (§3.A step-3b / FR-31-22): a padding-side decl
    # accumulates into the owner's merged {area}Padding{Tier} OBJECT attr when
    # box_family gates it (D295 hero migrated per-area padding flat→object),
    # BEFORE the legacy flat per-area attr chain runs. Non-box per-area props
    # (background) return None here and fall through unchanged.
    box_write = _area_box_write(decl, ctx, area)
    if box_write is not None:
        return box_write

    base_attr = attr_for_area_property(ctx.block_slug, area, prop)
    if base_attr is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} has no per-area attr for ({area}, {prop}) "
            f"(proposed_action: add attr {area}+{prop} or seed property_suffixes)",
        )

    attr = tier_suffix(base_attr, decl.tier, ctx.conn)
    if not validate(ctx, attr, decl.value):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} does not declare {attr!r} (tier {decl.tier})",
        )

    raw = strip_important(decl.value).strip()

    # Numeric per-area attr (e.g. contentPaddingTop) → number + Unit companion.
    if _attr_is_number(ctx, attr):
        num, unit = split_value_unit(raw)
        if num is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {raw!r} not parseable for numeric attr {attr!r}",
            )
        num_out: int | float = int(num) if float(num).is_integer() else num
        writes: list[Write] = [Write(attr=attr, value=num_out, property=prop, tier=decl.tier)]
        # The per-area padding family shares ONE Unit attr (e.g. contentPaddingUnit) —
        # derive it by stripping the DB-owned breakpoint + side suffixes and appending
        # the DB unit suffix (R-31-1 — modifier_suffixes owns the grammar, no hardcoded
        # Top|Right|…|Mobile|… literals; faithful to convert.py:2353).
        unit_attr = unit_companion_attr(attr, ctx.conn)
        if unit and unit_attr and decl.tier == "Base" and validate(ctx, unit_attr, unit):
            writes.append(Write(attr=unit_attr, value=unit, property=prop, tier=decl.tier))
        return writes

    # String per-area attr (e.g. contentBackground) → verbatim.
    value = value_serialise("string", None, raw)
    return Write(attr=attr, value=value, property=prop, tier=decl.tier)

"""content_band — the CONTENT-layer resolver (Spec 31 §3.A, layer L2).

The CONTENT band is a non-root inner element that constrains content width
(``max-width`` + margin-centring, or a ``--content-width`` custom property —
detected by ``layer_detect`` — the live MF-3 root-guard). Spec 31
§3.A.3 routes the band's ``max-width`` to the block's CONTENT-layer attr
(``contentWidth`` for sgs/container) via ``db.attr_for_layer_property(block,
'CONTENT', css_property)``; the old 3-way MaxWidth/ContentSize/WideSize widthMode
snap is RETIRED (D230/D231) — contentWidth is a token-or-literal, written verbatim
here (token-snap is identity for length literals, §3.A.6).

Real transfers (this resolver OWNS the CONTENT layer):
  - ``max-width`` → ``contentWidth*`` (the content-band cap; §3.A.3 L2)

CONTENT-band padding longhands are an HONEST DB-ROUTING GAP for sgs/container: the
block declares ``contentBandPadding{Side}*`` (NOT the ``contentPadding{Side}*`` the
layer resolver derives from the ``content`` prefix). ``attr_for_layer_property``
returns None for content padding, so those declarations gap NO_DESTINATION with a
proposed-action reason (Spec 31 §3.A.8 — never silent). Closing this is a
``property_suffixes`` seed / DB change (STOP-24 override channel), NOT a resolver
workaround.

REUSES main's shared helpers: ``fold_helpers._resolve_co_declared_var`` for a band
``max-width:var(--content-width)``; ``styling_helpers.strip_important``. NO
block-slug literals.
"""
from __future__ import annotations

from typing import Any

from converter.models import GAP, GapOrigin, Write
from converter.services.attr_resolve import attr_resolve
from converter.services.fold_helpers import _resolve_co_declared_var
from converter.services.gap_writer import gap_writer
from converter.services.styling_helpers import split_value_unit, strip_important
from converter.services.tier_suffix import tier_suffix
from converter.services.token_snap import token_snap
from converter.services.validate import attr_is_number, validate
from converter.services.value_serialise import value_serialise

# ---------------------------------------------------------------------------
# EXECUTION Step 7 (FR-31-2.8.4, the 2e2 ONE-cascade): the retired hand-rolled
# fold ladder (fold_helpers.route_interior_css_to_parent_slot:551-571) is
# RE-EXPRESSED here as EXPLICIT per-property layer priorities — the recorded
# Step-3 semantics decision ("layer_detect-first, the old fold ladder
# re-expressed as explicit registry priorities"). A CONTENT-layer node's
# declaration tries each layer's attr on the OWNING block in this order;
# first DB hit wins (each lookup MF-4-guarded via attr_for_layer_property).
# CSS-standard layer semantics, not block knowledge — the R-31-1
# permitted-constant class (same as the ladder it replaces + _GRID_LAYOUT_PROPS).
# ---------------------------------------------------------------------------

_WIDTH_PROPS = frozenset({"max-width", "width", "--content-width"})
_GAP_MARGIN_MINH = frozenset({
    "gap", "row-gap", "column-gap", "min-height",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
})


def _layer_priorities(prop: str) -> tuple[str, ...]:
    """The explicit layer fallback chain for one CONTENT-layer declaration."""
    if prop in _WIDTH_PROPS:
        return ("CONTENT", "OUTER")
    if prop.startswith("padding"):
        return ("CONTENT", "GRID", "OUTER")
    if prop in _GAP_MARGIN_MINH:
        return ("GRID", "OUTER")
    return ("CONTENT", "OUTER")


def resolve(decl: Any, ctx: Any) -> Write | list[Write] | GAP:
    prop = decl.property

    # Device-tier gate first (§3.A A4): a non-device-tier breakpoint gaps for
    # the accurate reason and avoids wasted DB queries.
    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for {prop} (§3.A A4)",
        )

    # Explicit layer-priority chain (the re-expressed fold ladder): first
    # layer whose attr the OWNING block actually declares wins.
    base_attr = None
    for layer in _layer_priorities(prop):
        base_attr = attr_resolve(ctx, layer, prop)
        if base_attr is not None:
            break
    if base_attr is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} has no CONTENT/GRID/OUTER attr for {prop} "
            f"(proposed_action: add attr or seed property_suffixes)",
        )

    attr = tier_suffix(base_attr, decl.tier, ctx.conn)
    if not validate(ctx, attr, decl.value):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} does not declare {attr!r} (tier {decl.tier})",
        )

    # Resolve a co-declared var() (max-width:var(--content-width)); identity
    # unless the value is a self-contained var with a fallback.
    resolved = _resolve_co_declared_var(strip_important(decl.value).strip(), {})

    # Spec 31 §3.A.5: serialise by block_attributes.attr_type. A numeric attr
    # (sgs/text.maxWidth, button paddings/minHeight) stores the bare number +
    # a Base-tier Unit companion — a px-STRING here is silently DISCARDED by
    # WP's schema validation at render (the CG-4 bug: hero-sub 420px /
    # ingredients-intro 540px / disclaimer 620px all stretched full-width).
    # Mirrors outer_box.resolve's number path exactly (ONE mechanism, R-31-9).
    if attr_is_number(ctx, attr):
        num, unit = split_value_unit(resolved)
        if num is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} is not a parseable number for "
                f"numeric attr {attr!r}",
            )
        num_out: int | float = int(num) if float(num).is_integer() else num
        writes: list[Write] = [Write(attr=attr, value=num_out, property=prop, tier=decl.tier)]
        # Unit companion: the tier-suffixed name first (a block may declare
        # e.g. minHeightTabletUnit), else the Base-tier base-name companion.
        # A NON-px unit with no Unit destination is an HONEST GAP — a bare
        # number renders through the px default (3rem → 3px, a WRONG value,
        # worse than the loss). px needs no companion (the schema default).
        tier_unit_attr = f"{attr}Unit"
        base_unit_attr = f"{base_attr}Unit"
        if unit and attr != base_attr and validate(ctx, tier_unit_attr, unit):
            writes.append(Write(attr=tier_unit_attr, value=unit, property=prop, tier=decl.tier))
        elif unit and decl.tier == "Base" and validate(ctx, base_unit_attr, unit):
            writes.append(Write(attr=base_unit_attr, value=unit, property=prop, tier=decl.tier))
        elif unit and unit != "px":
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} carries non-px unit {unit!r} but "
                f"{ctx.block_slug} declares no Unit companion for {attr!r} — a bare "
                f"number would render via the px default (wrong value)",
            )
        return writes

    # String/length-literal attr: verbatim serialise (D230 — contentWidth is
    # token-or-literal; token-snap is identity for a length literal, §3.A.6).
    value = token_snap(prop, value_serialise("string", None, resolved), ctx.conn)
    return Write(attr=attr, value=value, property=prop, tier=decl.tier)

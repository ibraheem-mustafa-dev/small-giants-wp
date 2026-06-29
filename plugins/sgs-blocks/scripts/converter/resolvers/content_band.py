"""content_band — the CONTENT-layer resolver (Spec 31 §3.A, layer L2).

The CONTENT band is a non-root inner element that constrains content width
(``max-width`` + margin-centring, or a ``--content-width`` custom property —
detected by ``layer_detect`` → ``fold_helpers.detect_content_layer``). Spec 31
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
from converter.services.styling_helpers import strip_important
from converter.services.tier_suffix import tier_suffix
from converter.services.token_snap import token_snap
from converter.services.validate import validate
from converter.services.value_serialise import value_serialise

# CONTENT-band CSS properties this resolver transfers (Spec 31 §3.A L2). Padding
# longhands are deliberately NOT here — they route to the (honest) NO_DESTINATION
# gap for blocks whose content padding attr name diverges from the layer prefix.
_CONTENT_TRANSFER_PROPS = frozenset({"max-width"})


def resolve(decl: Any, ctx: Any) -> Write | GAP:
    prop = decl.property

    if prop not in _CONTENT_TRANSFER_PROPS:
        # CONTENT-layer padding/margin/etc. Check the device-tier gate FIRST (match
        # the max-width branch + the other resolvers): a non-device-tier breakpoint
        # gaps for the accurate reason and avoids a wasted attr_resolve DB query.
        if not decl.is_device_tier:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"non-device-tier breakpoint {decl.tier!r} for {prop} (§3.A A4)",
            )
        # Resolve a destination if the block has one; else an HONEST gap (e.g.
        # container's contentBandPadding* divergence).
        base_attr = attr_resolve(ctx, "CONTENT", prop)
        if base_attr is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no CONTENT-layer attr for {prop} "
                f"(proposed_action: add attr or seed property_suffixes; "
                f"e.g. container uses contentBandPadding* not contentPadding*)",
            )
        attr = tier_suffix(base_attr, decl.tier, ctx.conn)
        if not validate(ctx, attr, decl.value):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {attr!r} (tier {decl.tier})",
            )
        value = token_snap(prop, value_serialise("string", None, decl.value), ctx.conn)
        return Write(attr=attr, value=value, property=prop, tier=decl.tier)

    # max-width → contentWidth (§3.A.3 L2).
    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for {prop} (§3.A A4)",
        )

    base_attr = attr_resolve(ctx, "CONTENT", prop)   # → 'contentWidth' for sgs/container
    if base_attr is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} has no CONTENT attr for {prop}",
        )

    attr = tier_suffix(base_attr, decl.tier, ctx.conn)
    if not validate(ctx, attr, decl.value):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} does not declare {attr!r} (tier {decl.tier})",
        )

    # Resolve a co-declared var() (max-width:var(--content-width)) against the band's
    # own decls is a node-context concern; per-decl we only have the value, so resolve
    # against an empty map (identity unless the value is a self-contained var with a
    # fallback). Then verbatim serialise (D230 — contentWidth is token-or-literal,
    # token-snap is identity for a length literal, §3.A.6).
    resolved = _resolve_co_declared_var(strip_important(decl.value).strip(), {})
    value = token_snap(prop, value_serialise("string", None, resolved), ctx.conn)
    return Write(attr=attr, value=value, property=prop, tier=decl.tier)

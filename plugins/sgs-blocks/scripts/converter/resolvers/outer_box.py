"""outer_box — the OUTER-layer resolver (the ONE real resolver in the slice).

Design §3: the vertical-slice property is `max-width` on a section root → OUTER layer
→ `maxWidth` exact string literal (D230/D231), proven to LAND draft-vs-clone.

SLICE SCOPE (A14 — generalisation deferred to step-3 per-resolver proof): only
`max-width` is transferred for real. Other OUTER properties (padding/gap/background/
align) route here too (layer==OUTER) and are returned as a TRACKED GAP
(UNIMPLEMENTED_STUB) — honest non-transfer, accounted by conservation, never a silent
drop — pending step-3 OUTER completion.
"""
from __future__ import annotations

from typing import Any

from converter.models import GAP, GapOrigin, Write
from converter.services.attr_resolve import attr_resolve
from converter.services.gap_writer import gap_writer
from converter.services.tier_suffix import tier_suffix
from converter.services.token_snap import token_snap
from converter.services.validate import validate
from converter.services.value_serialise import value_serialise


def resolve(decl: Any, ctx: Any) -> Write | GAP:
    prop = decl.property

    # Slice scope: only max-width is a real transfer. Everything else OUTER is
    # an honest tracked stub pending step 3 (A14).
    if prop != "max-width":
        return gap_writer(
            ctx, decl, GapOrigin.UNIMPLEMENTED_STUB,
            f"outer_box slice transfers max-width only; '{prop}' pending step-3 OUTER completion",
        )

    # A4: a non-device-tier breakpoint has no device bucket — gap it, never coerce.
    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for max-width (design §10 A4)",
        )

    # Name resolution (db_lookup), then tier suffix — fixed order (design §3.1).
    base_attr = attr_resolve(ctx, "OUTER", "max-width")   # → 'maxWidth' for sgs/container
    if base_attr is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} has no OUTER attr for max-width",
        )

    attr = tier_suffix(base_attr, decl.tier, ctx.conn)
    if not validate(ctx, attr, decl.value):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} does not declare {attr!r} (tier {decl.tier})",
        )

    # Exact literal (D230): serialise verbatim, no token snap for a length literal.
    value = token_snap("max-width", value_serialise("string", None, decl.value), ctx.conn)
    return Write(attr=attr, value=value, property="max-width", tier=decl.tier)

"""grid — the GRID-layer resolver (Spec 31 §3.A, layer L3 / D207 grid engine).

A node carrying ``display:grid`` / ``grid-template-columns`` is the GRID layer
(``layer_detect`` §2.2). Spec 31 §3.A routes its grid CSS to the block's grid attrs.
Two destination families on the container:

  - ``grid-template-columns`` → ``gridTemplateColumns*`` (string template) PLUS, when
    the template is a ``repeat(N, …)`` pattern, the integer column COUNT
    ``columns*`` (number) — ONE declaration → a list[Write] of BOTH attrs (the seam
    decision's multi-Write contract; render.php drives column count via the integer
    attr while keeping the raw template). The column-count derivation is the faithful
    port of convert.py ``_parse_repeat_columns`` (5494).
  - ``gap`` / ``column-gap`` → the block's ``gap*`` attr (the grid gap).
  - per-grid-ITEM box CSS (``padding``/``box-shadow``/``border-radius``/
    ``background-color``/``color``) → the ``gridItem*`` attrs via
    ``db.attr_for_layer_property(block, 'GRID', css_property)``.

Tier mapping uses the standard device-tier suffix (``tier_suffix``): Base →
unsuffixed, Tablet → ``*Tablet``, Mobile → ``*Mobile`` (Spec 31 §3.A.4; the device
system is fixed 768/1024). Non-device-tier breakpoints gap NO_DESTINATION (§3.A A4).

REUSES main's shared helpers: ``styling_helpers.strip_important``. NO block-slug
literals (F5 gate); all destinations DB-resolved via attr_for_property /
attr_for_layer_property.
"""
from __future__ import annotations

import re
from typing import Any

from converter.models import GAP, GapOrigin, Write
from converter.services.attr_resolve import attr_resolve
from converter.services.gap_writer import gap_writer
from converter.services.styling_helpers import strip_important
from converter.services.tier_suffix import tier_suffix
from converter.services.token_snap import token_snap
from converter.services.validate import validate
from converter.services.value_serialise import value_serialise
from orchestrator.converter_v2.db_lookup import attr_for_property

# CSS gap properties → the single grid gap attr family.
_GAP_PROPS = frozenset({"gap", "column-gap"})
# Per-grid-item box CSS routed via the GRID (gridItem*) layer prefix.
_GRID_ITEM_PROPS = frozenset({
    "padding", "box-shadow", "border-radius", "background-color", "color",
})


def _parse_repeat_columns(cols_str: str) -> int | None:
    """Extract N from ``repeat(N, …)``; None for explicit track lists (faithful
    port of convert.py:5494 ``_parse_repeat_columns``)."""
    if not cols_str:
        return None
    m = re.match(r"repeat\(\s*(\d+)\s*,", cols_str.strip(), re.IGNORECASE)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            return None
    return None


def resolve(decl: Any, ctx: Any) -> Write | list[Write] | GAP:
    prop = decl.property

    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for {prop} (§3.A A4)",
        )

    # --- grid-template-columns → gridTemplateColumns* (+ columns* count) ---------
    if prop == "grid-template-columns":
        resolved = attr_for_property(ctx.block_slug, prop)
        if resolved is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no attr for {prop}",
            )
        _wp, base_template_attr, _kind = resolved
        template_attr = tier_suffix(base_template_attr, decl.tier, ctx.conn)
        if not validate(ctx, template_attr, decl.value):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {template_attr!r} (tier {decl.tier})",
            )
        raw = strip_important(decl.value).strip()
        template_value = value_serialise("string", None, raw)
        writes: list[Write] = [
            Write(attr=template_attr, value=template_value, property=prop, tier=decl.tier)
        ]
        # Second Write of the list: the integer column count from repeat(N, …),
        # when the block declares the matching columns* attr.
        n = _parse_repeat_columns(raw)
        if n is not None:
            base_count_attr = "columns"
            count_attr = tier_suffix(base_count_attr, decl.tier, ctx.conn)
            if validate(ctx, count_attr, str(n)):
                writes.append(
                    Write(attr=count_attr, value=n, property=prop, tier=decl.tier)
                )
        return writes

    # --- gap / column-gap → gap* -------------------------------------------------
    if prop in _GAP_PROPS:
        # Resolve via the block's actual gap attr (attr_for_property handles 'gap';
        # 'column-gap' shares the same destination family — resolve through 'gap').
        resolved = attr_for_property(ctx.block_slug, "gap")
        if resolved is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no gap attr for {prop}",
            )
        _wp, base_gap_attr, _kind = resolved
        gap_attr = tier_suffix(base_gap_attr, decl.tier, ctx.conn)
        if not validate(ctx, gap_attr, decl.value):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {gap_attr!r} (tier {decl.tier})",
            )
        value = token_snap(
            "gap", value_serialise("string", None, strip_important(decl.value).strip()),
            ctx.conn,
        )
        return Write(attr=gap_attr, value=value, property=prop, tier=decl.tier)

    # --- per-grid-item box CSS → gridItem* --------------------------------------
    if prop in _GRID_ITEM_PROPS:
        base_attr = attr_resolve(ctx, "GRID", prop)
        if base_attr is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no GRID (gridItem*) attr for {prop}",
            )
        attr = tier_suffix(base_attr, decl.tier, ctx.conn)
        if not validate(ctx, attr, decl.value):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {attr!r} (tier {decl.tier})",
            )
        value = value_serialise("string", None, strip_important(decl.value).strip())
        return Write(attr=attr, value=value, property=prop, tier=decl.tier)

    # A GRID-layer property this resolver does not yet own — honest tracked stub.
    return gap_writer(
        ctx, decl, GapOrigin.UNIMPLEMENTED_STUB,
        f"grid resolver does not own GRID property '{prop}' yet",
    )

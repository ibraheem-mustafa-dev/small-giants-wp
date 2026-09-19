"""Resolver registry — resolver_id (from dispatch_table) → resolve callable.

The orchestrator dispatches by DATA: dispatch_table names an id, REGISTRY maps it to
a `resolve(decl, ctx) -> Write | GAP` callable. No `if slug ==` branching anywhere.

Resolver status:
  - REAL (CSS-side):  outer_box, content_band, grid, typography — each transfers real
    properties to DB-resolved attrs and emits an HONEST GAP only when a block declares no
    destination attr / a property is unowned.
  - CONTENT-SIDE LIFTS (not registered here): `lift_scalar_content` / `lift_styling_content`
    are a DIFFERENT dispatch entirely (services.extraction / walk.py's B1/B2 mechanism).
    Grid-per-area routing is `services.fold_helpers.route_area_css_to_block_attrs`, called
    directly from `services.assembly` step 3d, keyed on the draft's BEM element token, not
    on this dispatch table.
  - SINKS:  `excluded` is an intentional non-lift (F4); `unrouted` is a suspected
    routing bug that MUST fail loud (GAP origin=UNROUTED) — never laundered to a silent gap.
"""
from __future__ import annotations

from typing import Any

from converter.models import GAP, GapOrigin
from converter.resolvers import (
    content_band,
    grid,
    outer_box,
    typography,
)


def _excluded_sink(decl: Any, ctx: Any) -> GAP:
    """F4 excluded_properties: intentional non-lift (still cloned via passthrough)."""
    return GAP(
        origin=GapOrigin.EXCLUDED,
        property=decl.property,
        tier=decl.tier,
        detail="property is in the F4 excluded_properties table",
        f4_ref=decl.property,
    )


def _unrouted_sink(decl: Any, ctx: Any) -> GAP:
    """A property with a known writer_path but no home — a SUSPECTED ROUTING BUG.
    Returns GAP(UNROUTED); the orchestrator/conservation gate treats UNROUTED as a
    HARD FAILURE (design §3.2 / §2). Never silently absorbed."""
    return GAP(
        origin=GapOrigin.UNROUTED,
        property=decl.property,
        tier=decl.tier,
        detail="routed to 'unrouted' — no resolver claimed this (layer, property)",
    )


REGISTRY: dict = {
    "outer_box": outer_box.resolve,
    "content_band": content_band.resolve,
    "grid": grid.resolve,
    "typography": typography.resolve,
    "excluded": _excluded_sink,
    "unrouted": _unrouted_sink,
}

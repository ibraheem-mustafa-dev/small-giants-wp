"""Resolver registry — resolver_id (from dispatch_table) → resolve callable.

The orchestrator dispatches by DATA: dispatch_table names an id, REGISTRY maps it to
a `resolve(decl, ctx) -> Write | GAP` callable. No `if slug ==` branching anywhere.

outer_box is the ONE real resolver (the slice). The other six are honest GAP-stubs
(UNIMPLEMENTED_STUB) built one-per-stage in step 3. `excluded` and `unrouted` are
sinks: `excluded` is an intentional non-lift (F4); `unrouted` is a suspected routing
bug that MUST fail loud (GAP origin=UNROUTED) — never laundered into a silent gap.
"""
from __future__ import annotations

from typing import Any

from converter.models import GAP, GapOrigin
from converter.resolvers import (
    content_band,
    grid,
    grid_area,
    outer_box,
    scalar_content,
    scalar_media,
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
    "grid_area": grid_area.resolve,
    "typography": typography.resolve,
    "scalar_content": scalar_content.resolve,
    "scalar_media": scalar_media.resolve,
    "excluded": _excluded_sink,
    "unrouted": _unrouted_sink,
}

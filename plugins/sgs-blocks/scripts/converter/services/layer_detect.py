"""layer_detect — classify a node's structural layer (design §2 / §2.2).

Returns OUTER | CONTENT | GRID | GRID_AREA from the node's CSS signature + its
structural position (MF-3), NEVER its class name. Computed once on the BASE
(non-@media) declaration set and cached on Ctx.base_layer (tier-invariance §2.1).

Slice-scoped/provisional (§10 A15): re-validated at the grid stage against a
`display`-switch fixture. The precedence order below is pinned + tested.
"""
from __future__ import annotations

from typing import Any


def layer_detect(ctx: Any, base_decls: dict[str, str]) -> str:
    # MF-3 structural-position guard: the root element is OUTER. This kills the
    # OUTER-vs-CONTENT ambiguity on a `max-width; margin:0 auto` root section.
    if ctx.is_root:
        return "OUTER"

    # §2.2 precedence: a node carrying display:grid / grid-template-columns IS GRID
    # (the more specific, attr-bearing concern) — its max-width routes to the grid.
    if base_decls.get("display", "").strip() == "grid":
        return "GRID"
    if "grid-template-columns" in base_decls:
        return "GRID"

    # A non-root content-constraint (max-width bounded + auto margins) → CONTENT band.
    if "max-width" in base_decls and "margin" in base_decls:
        return "CONTENT"

    # Default structural layer for a non-root box.
    return "CONTENT"

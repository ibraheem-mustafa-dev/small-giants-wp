"""dispatch_table.py — the DB-sourced routing function (design §2).

Given a declaration's (layer, css_property) plus the element's structural facts
(has_inner_blocks) the table returns exactly ONE resolver id, or an explicit sink.
It NAMES NO BLOCK (R-31-1 / R-31-9): block-specific behaviour comes from the DB
(property_suffixes / block_attributes / excluded_properties), never an `if slug ==`.

Routing algorithm (design §2, with the §10 conformance corrections folded in):

    resolver_id(layer, property) =
        typography     if property is in db_lookup's _TYPOGRAPHY_CSS_SCOPE   (A13 pre-layer sink)
        excluded       elif property in the F4 excluded_properties table     (A13 pre-layer sink)
        outer_box      elif layer == OUTER
        content_band   elif layer == CONTENT
        grid           elif layer == GRID
        grid_area      elif layer == GRID_AREA                               (stub-only this phase)
        scalar_media   elif has_inner_blocks == 0 and media_signal(property) (A11 deferred — see below)
        scalar_content elif has_inner_blocks == 0
        unrouted       else                                                  (FAIL LOUD, never a silent gap)

Tier does NOT affect the resolver choice (tier-invariance, §2.1) — routing is a
function of the node's base-tier layer, cached on Ctx. A non-device-tier breakpoint
is handled at the tier-resolution seam (services.tier_suffix), routed to
gap(origin=NO_DESTINATION), never coerced into a device tier (§10 A4).
"""
from __future__ import annotations

import sqlite3

# Single-source-of-truth import: the typography property set lives in db_lookup
# (db_lookup.py:1268). Importing the FROZENSET (not re-declaring it) avoids the
# duplicated-calculation drift trap, matching db-consistency/resolver_bridge.py.
# db_lookup is the ONE import the import-ban gate permits from the frozen engine.
from orchestrator.converter_v2.db_lookup import _TYPOGRAPHY_CSS_SCOPE

# Resolver ids the table can return (each maps to resolvers/<id>.py).
RESOLVER_IDS = frozenset({
    "typography", "excluded",
    "outer_box", "content_band", "grid", "grid_area",
    "scalar_media", "scalar_content",
    "unrouted",
})

_LAYER_TO_RESOLVER = {
    "OUTER": "outer_box",
    "CONTENT": "content_band",
    "GRID": "grid",
    "GRID_AREA": "grid_area",
}

# GRID-layer-INTRINSIC properties (D249 / W3 all-routes fix). A node carrying
# `grid-template-*` IS a grid container for those declarations, regardless of its own
# BOX layer — a section ROOT is OUTER for its box CSS (max-width/padding/background) but
# GRID for its children's TRACK layout. So these route to the grid resolver as a
# PRE-LAYER concern (the same idiom as typography), never to the node's box-layer
# resolver. `gap`/`column-gap`/`row-gap` are deliberately NOT here — gap is layer-
# AMBIGUOUS (an OUTER box gap vs a grid gap) and stays with the by-layer dispatch.
_GRID_LAYOUT_PROPS = frozenset({
    "grid-template-columns", "grid-template-rows", "grid-template-areas",
    "grid-auto-columns", "grid-auto-rows", "grid-auto-flow",
})


def _writer_path(css_property: str) -> str:
    """'typography' iff css_property is in db_lookup's typography scope, else
    'wrapper_css'. Mirrors db_lookup.attr_for_property's internal branch
    (db_lookup.py:1367) using the IMPORTED scope set — same idiom as
    resolver_bridge._writer_path (single-source data, trivial local branch)."""
    return "typography" if css_property in _TYPOGRAPHY_CSS_SCOPE else "wrapper_css"


def _load_excluded_properties(conn: sqlite3.Connection) -> frozenset[str]:
    """The F4 closed EXCLUDED set (currently ships empty, D235). A property here
    is intentionally not-lifted (still cloned via passthrough) — a SINK, not a drop."""
    try:
        rows = conn.execute("SELECT css_property FROM excluded_properties").fetchall()
    except sqlite3.Error:
        return frozenset()
    return frozenset(r[0] for r in rows)


def media_signal(css_property: str, conn: sqlite3.Connection) -> bool:
    """Whether a property is a media-bearing signal (background-image/object-fit/…).

    DEFERRED (design §10 A11): the OUTER-`max-width` slice never reaches the scalar
    branch, so media_signal is NOT exercised now. Its DB source (a named
    property_suffixes.role / media-slot query + a 'set read from DB' test) is pinned
    at the scalar stage in step 3 — NOT faked inline as a brace-set dict here
    (that would be an R-31-1 smuggled-dict smell). Calling it in the slice is a bug.
    """
    raise NotImplementedError(
        "media_signal is owned by the step-3 scalar stage (design §10 A11); the "
        "OUTER max-width vertical slice must never route to the scalar branch. If "
        "this fires, a non-scalar declaration reached the scalar path — investigate, "
        "do not stub a dict here."
    )


def resolver_id(
    layer: str,
    css_property: str,
    *,
    has_inner_blocks: int,
    conn: sqlite3.Connection,
) -> str:
    """Return exactly one resolver id (or 'unrouted') for a declaration.

    Names no block — `has_inner_blocks` (a per-element DB fact precomputed on Ctx)
    is the only structural input. See the module docstring for the full algorithm.
    """
    # Pre-layer sinks (A13): typography is layer-agnostic; excluded never lifts.
    if _writer_path(css_property) == "typography":
        return "typography"
    if css_property in _load_excluded_properties(conn):
        return "excluded"
    # Grid-layer-intrinsic (D249 W3 all-routes fix): grid-template-* describe the node's
    # OWN grid, so they route to the grid resolver regardless of the node's box layer
    # (Spec 31 §2 Axis-1: a section root is OUTER for its box CSS but GRID for its child
    # tracks). Mirrors the typography pre-layer sink. gap stays by-layer (ambiguous).
    if css_property in _GRID_LAYOUT_PROPS:
        return "grid"

    # Layer-driven structural resolvers.
    by_layer = _LAYER_TO_RESOLVER.get(layer)
    if by_layer is not None:
        return by_layer

    # Scalar leaf (no child InnerBlocks): media vs content.
    if has_inner_blocks == 0:
        if media_signal(css_property, conn):   # deferred — never reached in the slice
            return "scalar_media"
        return "scalar_content"

    # A property with a known writer_path/suffix that found no home is a SUSPECTED
    # ROUTING BUG — fail loud, never laundered into the gap sink (cheat MF-E).
    return "unrouted"

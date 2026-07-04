"""test_dispatch_table.py — routing-function correctness (design §2 + §10).

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_dispatch_table.py
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.dispatch_table import (
    _LAYER_TO_RESOLVER,
    RESOLVER_IDS,
    _writer_path,
    media_signal,
    resolver_id,
)
from converter.services.layer_detect import layer_detect


def _conn(excluded: list[str] | None = None) -> sqlite3.Connection:
    c = sqlite3.connect(":memory:")
    c.execute("CREATE TABLE excluded_properties (css_property TEXT)")
    for p in excluded or []:
        c.execute("INSERT INTO excluded_properties VALUES (?)", (p,))
    return c


# -- the slice path --------------------------------------------------------

def test_outer_max_width_routes_to_outer_box():
    # The vertical-slice property: OUTER max-width on a composing block.
    assert resolver_id("OUTER", "max-width", delegates_content=1, conn=_conn()) == "outer_box"


# -- pre-layer sinks (A13) -------------------------------------------------

def test_typography_property_is_pre_layer_sink():
    # font-size is in db_lookup's _TYPOGRAPHY_CSS_SCOPE → typography, regardless of layer.
    assert resolver_id("OUTER", "font-size", delegates_content=1, conn=_conn()) == "typography"
    assert _writer_path("font-size") == "typography"
    assert _writer_path("max-width") == "wrapper_css"


def test_excluded_property_is_pre_layer_sink():
    conn = _conn(excluded=["filter"])
    assert resolver_id("OUTER", "filter", delegates_content=1, conn=conn) == "excluded"


# -- layer-driven resolvers ------------------------------------------------

@pytest.mark.parametrize("layer,expected", [
    ("OUTER", "outer_box"),
    ("CONTENT", "content_band"),
    ("GRID", "grid"),
    ("GRID_AREA", "grid_area"),
])
def test_layer_routing(layer, expected):
    assert resolver_id(layer, "max-width", delegates_content=1, conn=_conn()) == expected


# -- unrouted = fail loud (not a silent gap) -------------------------------

def test_unknown_layer_with_inner_blocks_is_unrouted():
    assert resolver_id("???", "max-width", delegates_content=1, conn=_conn()) == "unrouted"


# -- EXECUTION Step 12 (2026-07-04): the scalar_content/scalar_media branch was
# REMOVED as proven-dead code. Below: the removal is behaviour-safe (an unknown
# layer now routes straight to 'unrouted' regardless of delegates_content), plus
# the reachability proof itself (layer_detect's exhaustive return domain). -------

def test_scalar_branch_removed_unknown_layer_is_unrouted_regardless_of_delegates_content():
    # Before the removal this raised NotImplementedError (delegates_content==0 hit
    # the scalar branch's deferred media_signal call). The branch is gone now, so
    # an unknown layer routes straight to 'unrouted' for EITHER delegates_content
    # value — proving the removal did not change behaviour for any REAL layer
    # value (only for the synthetic "???" probe, which no real ctx.base_layer ever
    # produces — see the proof test below).
    assert resolver_id("???", "max-width", delegates_content=0, conn=_conn()) == "unrouted"
    assert resolver_id("???", "max-width", delegates_content=1, conn=_conn()) == "unrouted"


def test_media_signal_is_deferred():
    # media_signal (the FUNCTION) is retained — still directly testable, still an
    # honest documented-deferred stub — even though resolver_id no longer calls it.
    with pytest.raises(NotImplementedError):
        media_signal("background-image", _conn())


def test_layer_detect_domain_is_exhaustively_covered_by_layer_to_resolver():
    """The reachability proof for the removed scalar_content/scalar_media branch.

    resolver_id has exactly ONE production call site (orchestrator.process_element),
    which always passes ctx.base_layer — and ctx.base_layer is ALWAYS layer_detect's
    return value (services/layer_detect.py, cached once per element). This test
    enumerates every code path layer_detect can take and proves each one returns a
    value already present in _LAYER_TO_RESOLVER — so `by_layer is not None` always
    holds for a REAL layer, and the removed `delegates_content == 0` branch could
    only ever have fired for a layer value layer_detect can provably never produce.
    """
    class _FakeCtx:
        def __init__(self, is_root, area_name=None):
            self.is_root = is_root
            self.area_name = area_name

    cases = [
        # (ctx, base_decls) -> every branch in layer_detect, in source order.
        (_FakeCtx(is_root=True), {}),                                          # OUTER (root)
        (_FakeCtx(is_root=False, area_name="header"), {}),                    # GRID_AREA
        (_FakeCtx(is_root=False), {"display": "grid"}),                       # GRID (display)
        (_FakeCtx(is_root=False), {"grid-template-columns": "1fr 1fr"}),      # GRID (template)
        (_FakeCtx(is_root=False), {"max-width": "600px", "margin": "0 auto"}),  # CONTENT (band)
        (_FakeCtx(is_root=False), {"color": "red"}),                          # CONTENT (default)
    ]
    for ctx, base_decls in cases:
        layer = layer_detect(ctx, base_decls)
        assert layer in _LAYER_TO_RESOLVER, (
            f"layer_detect returned {layer!r}, which is NOT in _LAYER_TO_RESOLVER — "
            f"this would make the removed scalar branch reachable again; the "
            f"EXECUTION Step 12 removal's premise (exhaustive layer coverage) is broken."
        )


# -- tier-invariance (§2.1) — true by construction (no tier param) ---------

def test_routing_is_tier_invariant_by_construction():
    # resolver_id takes no tier; identical (layer, property) → identical id.
    a = resolver_id("OUTER", "max-width", delegates_content=1, conn=_conn())
    b = resolver_id("OUTER", "max-width", delegates_content=1, conn=_conn())
    assert a == b == "outer_box"


def test_all_returns_are_registered_ids():
    for layer in ("OUTER", "CONTENT", "GRID", "GRID_AREA", "???"):
        rid = resolver_id(layer, "max-width", delegates_content=1, conn=_conn())
        assert rid in RESOLVER_IDS

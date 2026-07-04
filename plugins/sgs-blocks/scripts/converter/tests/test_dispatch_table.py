"""test_dispatch_table.py — routing-function correctness (design §2 + §10).

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_dispatch_table.py
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.dispatch_table import (
    RESOLVER_IDS,
    _writer_path,
    media_signal,
    resolver_id,
)


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


# -- A11: media_signal is an honest deferred stub, not a faked dict --------

def test_scalar_branch_raises_deferred_not_faked():
    # delegates_content==0 + non-typography/non-excluded/non-layer property reaches
    # the scalar branch, which calls the deferred media_signal → NotImplementedError.
    with pytest.raises(NotImplementedError):
        resolver_id("???", "max-width", delegates_content=0, conn=_conn())


def test_media_signal_is_deferred():
    with pytest.raises(NotImplementedError):
        media_signal("background-image", _conn())


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

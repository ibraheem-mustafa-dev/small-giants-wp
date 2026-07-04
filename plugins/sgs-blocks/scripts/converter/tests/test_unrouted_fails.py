"""test_unrouted_fails.py — A9 / Rule 4 / STOP-3: UNROUTED is a tested HARD failure.

Design §10 A9: feed a (block, layer, property) that routes to 'unrouted' and assert a
HARD failure (ConservationError), NOT a quietly-written GAP. "UNROUTED fails" must be
a tested failure-path, not a prose promise.

A property reaches 'unrouted' only when: it is NOT typography, NOT excluded, NOT a
known layer (OUTER/CONTENT/GRID/GRID_AREA), and the block HAS inner blocks (so the
scalar branch is not taken). That combination = a routing bug, and it must fail loud.
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.dispatch_table import resolver_id
from converter.orchestrator import ConservationError, process_element
from orchestrator.converter_v2.db_lookup import SGS_DB


def _ctx(base_layer: str) -> Ctx:
    # base_layer pre-set to an unknown layer so dispatch returns 'unrouted' for a
    # composing block (delegates_content=1) on a non-typography/non-excluded property.
    return Ctx("sgs/container", "section", 1, None, None, None, True, base_layer,
               sqlite3.connect(SGS_DB))


def test_resolver_id_returns_unrouted_for_unknown_layer():
    rid = resolver_id("MYSTERY_LAYER", "max-width", delegates_content=1,
                      conn=sqlite3.connect(SGS_DB))
    assert rid == "unrouted"


def test_process_element_hard_fails_on_unrouted():
    # base_layer is forced to an unknown layer → the max-width decl routes to unrouted.
    ctx = _ctx(base_layer="MYSTERY_LAYER")
    with pytest.raises(ConservationError, match="UNROUTED"):
        process_element(ctx, [Decl("max-width", "1200px", "Base")])

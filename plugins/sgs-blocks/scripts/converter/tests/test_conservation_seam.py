"""test_conservation_seam.py — the seam decision Option A conservation proofs.

The 2026-06-29 seam widened ``_check_conservation`` from per-WRITE TOTALITY
(``len(writes)+len(gaps)==decl_count``) to per-DECLARATION-RESULT totality (every
declaration produced ≥1 routed result). This file PROVES the widened invariant still
catches a genuine leak and a wrong-type return, while a legit multi-Write does NOT
trip it, and UNROUTED still fails (the whole point of the spine).
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.models import GAP, GapOrigin, Write
from converter.orchestrator import (
    ConservationError,
    ElementResult,
    _check_conservation,
    process_element,
)
from converter.resolvers import REGISTRY
from orchestrator.converter_v2.db_lookup import SGS_DB


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


def _ctx(conn, *, slug="sgs/container", hib=1, layer=None):
    return Ctx(slug, "section", hib, None, None, None, True, layer, conn)


# ---------------------------------------------------------------------------
# PROOF 1: a planted leak (resolver returns None / [] / wrong type) → fail
# ---------------------------------------------------------------------------

def test_planted_leak_none_return_fails(conn, monkeypatch):
    # A resolver that drops a declaration (returns None) must trip TOTALITY: the
    # decl_results count falls below decl_count.
    monkeypatch.setitem(REGISTRY, "outer_box", lambda decl, ctx: None)
    with pytest.raises(ConservationError, match="TOTALITY"):
        process_element(_ctx(conn), [Decl("max-width", "1200px", "Base")])


def test_planted_leak_empty_list_return_fails(conn, monkeypatch):
    monkeypatch.setitem(REGISTRY, "outer_box", lambda decl, ctx: [])
    with pytest.raises(ConservationError, match="TOTALITY"):
        process_element(_ctx(conn), [Decl("max-width", "1200px", "Base")])


def test_planted_leak_wrong_type_return_fails(conn, monkeypatch):
    # A resolver returning a non-Write/GAP scalar leaks the declaration.
    monkeypatch.setitem(REGISTRY, "outer_box", lambda decl, ctx: "1200px")
    with pytest.raises(ConservationError, match="TOTALITY"):
        process_element(_ctx(conn), [Decl("max-width", "1200px", "Base")])


# ---------------------------------------------------------------------------
# PROOF 2: a legit multi-Write (list[Write]) does NOT trip conservation
# ---------------------------------------------------------------------------

def test_multi_write_list_does_not_trip_conservation(conn, monkeypatch):
    # ONE declaration → a list of TWO Writes is the faithful contract (Option A);
    # conservation must accept it (decl_results==decl_count even though writes>decl).
    def _two_writes(decl, ctx):
        return [
            Write(attr="gridTemplateColumns", value="repeat(3, 1fr)",
                  property=decl.property, tier=decl.tier),
            Write(attr="columns", value=3, property=decl.property, tier=decl.tier),
        ]
    monkeypatch.setitem(REGISTRY, "outer_box", _two_writes)
    result = process_element(_ctx(conn), [Decl("max-width", "x", "Base")])
    assert result.decl_results == 1          # ONE declaration routed
    assert len(result.writes) == 2           # producing TWO attribute writes
    assert result.unrouted() == []


# ---------------------------------------------------------------------------
# PROOF 3: UNROUTED still hard-fails (unchanged spine guarantee)
# ---------------------------------------------------------------------------

def test_unrouted_still_hard_fails(conn):
    # base_layer forced to an unknown layer → max-width routes to 'unrouted'.
    ctx = _ctx(conn, layer="MYSTERY_LAYER")
    with pytest.raises(ConservationError, match="UNROUTED"):
        process_element(ctx, [Decl("max-width", "1200px", "Base")])


# ---------------------------------------------------------------------------
# PROOF 4: the bare invariant helper (no orchestration) — direct unit check
# ---------------------------------------------------------------------------

def test_check_conservation_passes_when_results_match():
    r = ElementResult(block_slug="sgs/container", decl_count=2, decl_results=2)
    r.writes.append(Write("maxWidth", "1200px", "max-width", "Base"))
    _check_conservation(r)  # no raise


def test_check_conservation_fails_on_shortfall():
    r = ElementResult(block_slug="sgs/container", decl_count=2, decl_results=1)
    with pytest.raises(ConservationError, match="TOTALITY"):
        _check_conservation(r)


def test_check_conservation_fails_on_unrouted_origin():
    r = ElementResult(block_slug="sgs/container", decl_count=1, decl_results=1)
    r.gaps.append(GAP(origin=GapOrigin.UNROUTED, property="x", tier="Base"))
    with pytest.raises(ConservationError, match="UNROUTED"):
        _check_conservation(r)

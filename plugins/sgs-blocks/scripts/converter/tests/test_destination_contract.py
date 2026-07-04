"""test_destination_contract.py — EXECUTION Step 3 (FR-31-2.8.4) proofs.

The Ctx destination contract: a Ctx may carry a DESTINATION (owning block slug
+ target attr-dict). Default None = self (behaviour-identical — the caller
merges ElementResult.attrs() as before, proven by the untouched full suite).
Non-None = the fold case: process_element setdefault-writes each Write into
the destination dict (earlier paths win, the frozen convert.py:2888 contract).

Also the two binding guards FR-31-2.8.4 names:
  MF-4 — attr_for_layer_property FAIL-LOUD on ≥2 candidate attrs (never a
         silent rowid-pick). Live-DB enumeration 2026-07-04: ZERO ambiguous
         combos, so the raise is behaviour-identical on real data.
  MF-3 — detect_content_layer rejects a root node (a section root declaring
         max-width + margin:0 auto is OUTER, never a CONTENT band).
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl, Destination
from converter.models import Write
from converter.orchestrator import ConservationError, process_element
from converter.resolvers import REGISTRY
from converter.services.fold_helpers import detect_content_layer
from converter.db import db_lookup
from converter.db.db_lookup import (
    SGS_DB,
    AmbiguousLayerAttrError,
    attr_for_layer_property,
)


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


def _ctx(conn, *, dest=None):
    # base_layer pre-set to OUTER so layer_detect (which reads node decls) is skipped.
    return Ctx(
        "sgs/container", "section", 1, None, None, None, True, "OUTER", conn,
        destination=dest,
    )


# ---------------------------------------------------------------------------
# 1. A destination-parametric write lands on the PARENT dict.
# ---------------------------------------------------------------------------

def test_destination_write_lands_on_parent_dict(conn, monkeypatch):
    parent_attrs: dict = {}
    monkeypatch.setitem(
        REGISTRY, "outer_box",
        lambda decl, ctx: Write("maxWidth", "1200px", decl.property, decl.tier),
    )
    dest = Destination(block_slug="sgs/container", attrs=parent_attrs)
    result = process_element(_ctx(conn, dest=dest), [Decl("max-width", "1200px", "Base")])
    assert parent_attrs == {"maxWidth": "1200px"}
    # The ElementResult still reports the writes (progress signal unchanged).
    assert result.attrs()["maxWidth"] == "1200px"


# ---------------------------------------------------------------------------
# 2. setdefault semantics: an EARLIER value in the destination dict wins
#    (the frozen convert.py:2888 "earlier paths win" contract).
# ---------------------------------------------------------------------------

def test_destination_setdefault_earlier_value_wins(conn, monkeypatch):
    parent_attrs = {"maxWidth": "960px"}   # set by an earlier path
    monkeypatch.setitem(
        REGISTRY, "outer_box",
        lambda decl, ctx: Write("maxWidth", "1200px", decl.property, decl.tier),
    )
    dest = Destination(block_slug="sgs/container", attrs=parent_attrs)
    process_element(_ctx(conn, dest=dest), [Decl("max-width", "1200px", "Base")])
    assert parent_attrs["maxWidth"] == "960px", (
        "destination writes must setdefault (earlier paths win), not overwrite"
    )


# ---------------------------------------------------------------------------
# 3. A destination whose owner slug mismatches the Ctx slug is a mis-built
#    fold Ctx → fail loud (raise, never a silent wrong-block write).
# ---------------------------------------------------------------------------

def test_destination_slug_mismatch_raises(conn, monkeypatch):
    monkeypatch.setitem(
        REGISTRY, "outer_box",
        lambda decl, ctx: Write("maxWidth", "1200px", decl.property, decl.tier),
    )
    dest = Destination(block_slug="sgs/hero", attrs={})
    with pytest.raises(ConservationError, match="DESTINATION MISMATCH"):
        process_element(_ctx(conn, dest=dest), [Decl("max-width", "1200px", "Base")])


# ---------------------------------------------------------------------------
# 4. Default (destination=None) leaves the caller-side contract untouched.
# ---------------------------------------------------------------------------

def test_default_destination_is_self_behaviour_identical(conn, monkeypatch):
    monkeypatch.setitem(
        REGISTRY, "outer_box",
        lambda decl, ctx: Write("maxWidth", "1200px", decl.property, decl.tier),
    )
    result = process_element(_ctx(conn), [Decl("max-width", "1200px", "Base")])
    assert result.attrs() == {"maxWidth": "1200px"}


# ---------------------------------------------------------------------------
# MF-4 — attr_for_layer_property fail-loud on ambiguity (never rowid-pick).
# box-shadow has TWO property_suffixes rows (Shadow, BoxShadow) on the real
# DB; a fake block declaring BOTH candidate attrs must raise, not pick.
# ---------------------------------------------------------------------------

def test_mf4_ambiguous_layer_attr_raises(monkeypatch):
    # Precondition guard (DB-drift-proof): the test's ambiguity comes from the
    # REAL property_suffixes rows for box-shadow (Shadow + BoxShadow). If a
    # reseed ever changes those rows, fail HERE loudly instead of silently
    # asserting nothing (reviewer finding, 2026-07-04).
    c = sqlite3.connect(SGS_DB)
    try:
        suffixes = {r[0] for r in c.execute(
            "SELECT suffix FROM property_suffixes WHERE css_property='box-shadow'"
        )}
    finally:
        c.close()
    assert {"Shadow", "BoxShadow"} <= suffixes, (
        f"box-shadow property_suffixes rows changed ({suffixes}) — this test's "
        f"ambiguity fixture is stale; pick another dual-suffix property."
    )

    attr_for_layer_property.cache_clear()
    monkeypatch.setattr(
        db_lookup, "block_attrs",
        lambda slug: {"shadow": {}, "boxShadow": {}},
    )
    try:
        with pytest.raises(AmbiguousLayerAttrError, match="box-shadow"):
            attr_for_layer_property("sgs/mf4-fake-block", "OUTER", "box-shadow")
    finally:
        attr_for_layer_property.cache_clear()


def test_mf4_single_candidate_still_resolves(monkeypatch):
    attr_for_layer_property.cache_clear()
    monkeypatch.setattr(
        db_lookup, "block_attrs",
        lambda slug: {"shadow": {}},
    )
    try:
        assert attr_for_layer_property("sgs/mf4-fake-block", "OUTER", "box-shadow") == "shadow"
    finally:
        attr_for_layer_property.cache_clear()


# ---------------------------------------------------------------------------
# MF-3 — detect_content_layer rejects a root node.
# ---------------------------------------------------------------------------

def test_mf3_root_node_never_content_layer():
    band_signature = {"max-width": "1200px", "margin": "0 auto"}
    assert detect_content_layer(band_signature) is True            # non-root: band
    assert detect_content_layer(band_signature, is_root=True) is False  # root: OUTER

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
  MF-3 — the LIVE root-guard (layer_detect) classifies a root node OUTER (a
         section root declaring max-width + margin:0 auto is OUTER, never a
         CONTENT band). Re-pointed 2026-07-05 QC: the Step-3 commit put the
         guard on fold_helpers.detect_content_layer, which had zero production
         callers (deleted); layer_detect.py is where MF-3 actually runs.
"""
from __future__ import annotations

import sqlite3
from types import SimpleNamespace

import pytest

from converter.context import Ctx, Decl, Destination
from converter.models import Write
from converter.orchestrator import ConservationError, process_element
from converter.resolvers import REGISTRY
from converter.services.layer_detect import layer_detect
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
# MF-3 — the LIVE root-guard: layer_detect classifies a root node OUTER.
# ---------------------------------------------------------------------------

def test_mf3_root_node_never_content_layer():
    band_signature = {"max-width": "1200px", "margin": "0 auto"}
    non_root = SimpleNamespace(is_root=False, area_name=None)
    root = SimpleNamespace(is_root=True, area_name=None)
    assert layer_detect(non_root, band_signature) == "CONTENT"  # non-root: band
    assert layer_detect(root, band_signature) == "OUTER"        # root: OUTER, never CONTENT


# ---------------------------------------------------------------------------
# FIX 2 — cross-node destination-fold guards (council finding, box-object
# interface contract §3/§4, 2026-07-09). `_check_conservation` only ever sees
# ONE folded call's writes; these guards catch collisions/mismatches ACROSS
# repeated `process_element` calls sharing the same `Destination`.
# ---------------------------------------------------------------------------

def test_destination_fold_dict_scalar_shape_mismatch_raises(conn, monkeypatch):
    """Two folded nodes write the SAME dest attr — one a box-object partial
    (dict), the other a plain scalar — an ambiguous shape that must raise."""
    calls = iter([
        Write("padding", {"top": "10px"}, "padding-top", "Base"),
        Write("padding", "20px", "padding", "Base"),
    ])
    monkeypatch.setitem(REGISTRY, "outer_box", lambda decl, ctx: next(calls))
    dest = Destination(block_slug="sgs/container", attrs={})

    process_element(_ctx(conn, dest=dest), [Decl("padding-top", "10px", "Base")])
    with pytest.raises(ConservationError, match="DESTINATION SHAPE MISMATCH"):
        process_element(_ctx(conn, dest=dest), [Decl("padding", "20px", "Base")])


def test_destination_fold_dict_dict_shared_key_different_value_raises(conn, monkeypatch):
    """Two folded nodes each write a dict partial for the SAME dest attr,
    sharing the SAME side key with a DIFFERENT value — a real cross-node
    collision `_check_conservation` cannot see (it only sees one call's
    writes) — must raise."""
    calls = iter([
        Write("padding", {"top": "10px"}, "padding-top", "Base"),
        Write("padding", {"top": "99px"}, "padding-top", "Base"),
    ])
    monkeypatch.setitem(REGISTRY, "outer_box", lambda decl, ctx: next(calls))
    dest = Destination(block_slug="sgs/container", attrs={})

    process_element(_ctx(conn, dest=dest), [Decl("padding-top", "10px", "Base")])
    with pytest.raises(ConservationError, match="DESTINATION COLLISION"):
        process_element(_ctx(conn, dest=dest), [Decl("padding-top", "99px", "Base")])


def test_destination_fold_dict_dict_distinct_keys_merge_cleanly(conn, monkeypatch):
    """Two folded nodes write DIFFERENT side keys for the same dest attr —
    legitimate accumulation, must merge cleanly with no raise."""
    calls = iter([
        Write("padding", {"top": "10px"}, "padding-top", "Base"),
        Write("padding", {"right": "20px"}, "padding-right", "Base"),
    ])
    monkeypatch.setitem(REGISTRY, "outer_box", lambda decl, ctx: next(calls))
    parent_attrs: dict = {}
    dest = Destination(block_slug="sgs/container", attrs=parent_attrs)

    process_element(_ctx(conn, dest=dest), [Decl("padding-top", "10px", "Base")])
    process_element(_ctx(conn, dest=dest), [Decl("padding-right", "20px", "Base")])
    # Both fold calls also emit the synthetic align:"full" post-pass (no
    # max-width decl present, ctx forced OUTER) — irrelevant to this guard,
    # asserted narrowly on the attr under test instead of full-dict equality.
    assert parent_attrs["padding"] == {"top": "10px", "right": "20px"}


# ---------------------------------------------------------------------------
# FIX 3 — copy-on-first-write: the destination's merge target must NEVER
# alias a Write's own `.value` dict (a `Write` is frozen, but freezing blocks
# reassigning `.value`, not mutating the dict object it points to).
# ---------------------------------------------------------------------------

def test_destination_first_dict_write_not_aliased(conn, monkeypatch):
    first_write = Write("padding", {"top": "10px"}, "padding-top", "Base")
    calls = iter([
        first_write,
        Write("padding", {"right": "20px"}, "padding-right", "Base"),
    ])
    monkeypatch.setitem(REGISTRY, "outer_box", lambda decl, ctx: next(calls))
    parent_attrs: dict = {}
    dest = Destination(block_slug="sgs/container", attrs=parent_attrs)

    process_element(_ctx(conn, dest=dest), [Decl("padding-top", "10px", "Base")])
    process_element(_ctx(conn, dest=dest), [Decl("padding-right", "20px", "Base")])

    # The second fold call's merge must NOT have mutated the first Write's
    # own dict — it must still hold ONLY its own side.
    assert first_write.value == {"top": "10px"}, (
        f"first_write.value was mutated by a later fold's merge — aliasing "
        f"bug, got {first_write.value!r}"
    )
    assert parent_attrs["padding"] == {"top": "10px", "right": "20px"}


def test_element_result_attrs_first_dict_write_not_aliased():
    """Same aliasing proof for the SELF-merge path (`ElementResult.attrs()`)."""
    from converter.orchestrator import ElementResult

    first_write = Write("padding", {"top": "10px"}, "padding-top", "Base")
    second_write = Write("padding", {"right": "20px"}, "padding-right", "Base")
    result = ElementResult(block_slug="sgs/container", decl_count=2, decl_results=2)
    result.writes.append(first_write)
    result.writes.append(second_write)

    merged = result.attrs()
    assert merged["padding"] == {"top": "10px", "right": "20px"}
    assert first_write.value == {"top": "10px"}, (
        f"result.writes[0].value was mutated by attrs() merging a later "
        f"write — aliasing bug, got {first_write.value!r}"
    )

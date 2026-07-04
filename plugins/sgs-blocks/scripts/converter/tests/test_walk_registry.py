"""test_walk_registry.py — EXECUTION Step 5 (FR-31-2.7 / FR-31-2.8) proofs.

1. COVERAGE / TOTALITY: enumerate the PRODUCIBLE signature space from the DB
   (every registered block × its producible recognition kinds × its real
   has_inner/capability/leaf facts) MINUS the validity constraints (the D212
   forbidden combo raises, it is not a registry entry) and assert every
   signature matches ≥1 CONTENT_HANDLERS entry (FR-31-2.8.5).
2. ADDITIVE emission: a Case-1 signature composes scalar+styling(+array)
   handlers in explicit priority order (FR-31-2.8.3).
3. Pre-registry gates: MF5 None-guard + D212 raise still fire (re-homed).
4. FR-31-2.7 classifier: the DB container-default slug is the ONLY holder.
5. STOP-31 plant tests for the no_slug_literal gate widening: the scan-file
   list covers dispatch_table/orchestrator/walk, and a slug-keyed registry
   entry FORM is caught by the scanner.
"""
from __future__ import annotations

import sqlite3

import pytest

from converter import walk
from converter.context import ContentConservationError, ContentGap, Recognition
from converter.gates import no_slug_literal
from converter.services.has_inner import derive_has_inner_blocks
from orchestrator.converter_v2 import db_lookup
from orchestrator.converter_v2.db_lookup import SGS_DB


def _all_block_slugs() -> list[str]:
    c = sqlite3.connect(SGS_DB)
    try:
        return [r[0] for r in c.execute("SELECT DISTINCT slug FROM blocks")]
    finally:
        c.close()


def _producible_kinds(slug: str, atomic_targets: set, scalar_targets: set) -> list[str]:
    kinds = ["named"]  # every registered block is reachable via its BEM root class
    if slug in atomic_targets:
        kinds.append("atomic")
    if slug in scalar_targets:
        kinds.append("scalar")
    return kinds


# ---------------------------------------------------------------------------
# 1. Registry TOTALITY over the DB-derived producible signature space
# ---------------------------------------------------------------------------

def test_registry_covers_every_producible_signature():
    atomic_targets = set(db_lookup.atomic_tag_map().values())
    c = sqlite3.connect(SGS_DB)
    try:
        scalar_targets = {
            r[0] for r in c.execute(
                "SELECT DISTINCT standalone_block FROM slots "
                "WHERE standalone_block IS NOT NULL"
            )
        }
    finally:
        c.close()

    uncovered: list = []
    checked = 0
    for slug in _all_block_slugs():
        hib = derive_has_inner_blocks(slug)
        caps = db_lookup.capabilities_for(slug)
        # D212 validity constraint: has_inner=1 + scalar-content-lift RAISES
        # pre-registry — excluded from the producible space (FR-31-2.8.5).
        if hib == 1 and "scalar-content-lift" in caps:
            continue
        for kind in _producible_kinds(slug, atomic_targets, scalar_targets):
            rec = Recognition(kind, slug, None, hib)
            sig = walk.signature_for(rec)
            checked += 1
            if not walk.handlers_for(sig):
                uncovered.append((slug, kind, sig))

    assert checked > 0, "enumeration produced zero signatures — DB missing?"
    assert not uncovered, (
        f"{len(uncovered)} producible signature(s) match NO handler "
        f"(registry lost totality): {uncovered[:5]}"
    )


# ---------------------------------------------------------------------------
# 2. ADDITIVE emission with explicit priority (FR-31-2.8.3)
# ---------------------------------------------------------------------------

def test_case1_signature_composes_walk_styling_array_in_priority_order():
    # Step-6 shape (FR-31-2.6): the universal per-attr walk replaced the
    # block-level scalar/child/leaf case handlers; styling + array compose
    # additively after it (explicit priorities 20 < 31 < 40).
    sig = walk.NodeSignature(
        kind="named", classify="composite", has_inner=0,
        scalar_lift=True, array_lift=True, content_leaf=True,
    )
    names = [h.name for h in walk.handlers_for(sig)]
    assert names == ["universal_walk", "styling_content", "array_content"], names


def test_case2_signature_composes_walk_plus_array():
    sig = walk.NodeSignature(
        kind="named", classify="composite", has_inner=1,
        scalar_lift=False, array_lift=True, content_leaf=False,
    )
    names = [h.name for h in walk.handlers_for(sig)]
    assert names == ["universal_walk", "styling_content", "array_content"], names


def test_holder_signature_routes_to_container_default_only():
    sig = walk.NodeSignature(
        kind="named", classify="holder", has_inner=1,
        scalar_lift=False, array_lift=False, content_leaf=False,
    )
    names = [h.name for h in walk.handlers_for(sig)]
    assert names == ["container_default"], names


# ---------------------------------------------------------------------------
# 3. Pre-registry gates re-homed (MF5 + D212)
# ---------------------------------------------------------------------------

def test_mf5_none_has_inner_is_loud_content_gap():
    rec = Recognition("named", None, None, None)
    out = walk.walk_content(rec, None)
    assert len(out) == 1 and isinstance(out[0], ContentGap)
    assert "has_inner_blocks=None" in out[0].detail


def test_d212_mutual_exclusion_raises(monkeypatch):
    monkeypatch.setattr(
        db_lookup, "capabilities_for",
        lambda slug: frozenset({"scalar-content-lift"}),
    )
    rec = Recognition("named", "sgs-test-fake", None, 1)
    with pytest.raises(ContentConservationError, match="D212"):
        walk.walk_content(rec, None)


# ---------------------------------------------------------------------------
# 4. FR-31-2.7 classifier — composed DB signal, the DB default is the holder
# ---------------------------------------------------------------------------

def test_classifier_holder_is_db_container_default():
    default = db_lookup.container_default_slug()
    assert default, "DB absent — container_default_slug returned None"
    assert walk.classify_node(Recognition("named", default, None, 1)) == "holder"


def test_classifier_typed_composites_are_not_holders():
    # card-grid / gallery / post-grid are TYPED composites (D272 premise
    # correction) — enumerate REAL non-default slugs from the DB, no literals.
    default = db_lookup.container_default_slug()
    others = [s for s in _all_block_slugs() if s != default][:5]
    assert others
    for slug in others:
        assert walk.classify_node(Recognition("named", slug, None, 0)) == "composite"


# ---------------------------------------------------------------------------
# 5. STOP-31 plant tests — the gate widening actually bites
# ---------------------------------------------------------------------------

def test_gate_scan_files_cover_the_dispatch_surface():
    names = {p.name for p in no_slug_literal._SCAN_FILES}
    assert {"recognition.py", "dispatch_table.py", "orchestrator.py", "walk.py"} <= names


def test_gate_catches_slug_keyed_registry_entry(tmp_path):
    # The exact carve-out FORM the widening exists to catch: a registry dict
    # keyed by a block slug (FR-31-2.8.2 forbids it).
    d = tmp_path / "probe_dir"
    d.mkdir()
    (d / "probe.py").write_text(
        "CONTENT_HANDLERS = {'sgs/hero': lambda r, n, m, c: []}\n",
        encoding="utf-8",
    )
    findings = no_slug_literal.run(scan_dirs=[d])
    assert findings, "slug-keyed registry entry NOT caught — the gate widening is hollow"


def test_gate_default_scan_has_no_new_findings():
    # The widened default scan must introduce NO NEW findings vs the gate's
    # own baseline (its --check contract) — i.e. the widening smuggled in no
    # unaccounted debt. (Reviewer fix 2026-07-04: a raw ==[] assertion would
    # break on any future legitimately-baselined finding elsewhere.)
    baseline = no_slug_literal._load_baseline()
    new = [v for v in no_slug_literal.run() if v["key"] not in baseline]
    assert new == [], f"gate widening introduced NEW findings: {new}"

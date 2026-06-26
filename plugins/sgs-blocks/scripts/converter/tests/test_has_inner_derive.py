"""test_has_inner_derive.py — has_inner_blocks derived fresh from save.js (real).

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_has_inner_derive.py
Design ref: .claude/plans/2026-06-23-stage2-recognition-design.md §3 + Spec 31 §12.7.

The production path (services.has_inner) DERIVES from save.js+render.php at convert-time
(NOT the cached column). The drift-guard test cross-checks that this fresh derivation
AGREES with the F6-validated cached column for every block whose source is on disk — so
the deliberate fresh re-implementation cannot silently drift from F6's AND-rule.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from converter.services.has_inner import _BLOCKS_DIR, derive_has_inner_blocks
from orchestrator.converter_v2 import db_lookup


def test_hero_composes_inner_blocks():
    assert derive_has_inner_blocks("sgs/hero") == 1


def test_missing_source_fails_closed_to_zero():
    # A slug with no src dir -> 0 (a leaf cannot host children; safe non-dropping default).
    assert derive_has_inner_blocks("sgs/this-block-does-not-exist") == 0


def _blocks_with_source_and_row():
    """[(slug, column_value)] for every block_composition row whose src dir exists."""
    conn = sqlite3.connect(db_lookup.SGS_DB)
    try:
        rows = conn.execute(
            "SELECT block_slug, has_inner_blocks FROM block_composition"
        ).fetchall()
    finally:
        conn.close()
    out = []
    for slug, col in rows:
        if not str(slug).startswith("sgs/"):
            continue
        if (_BLOCKS_DIR / slug.split("/")[-1]).is_dir():
            out.append((slug, int(col) if col is not None else None))
    return out


def test_drift_guard_fresh_derivation_agrees_with_f6_column():
    """For every block with source, the fresh save.js derivation == the cached column
    (which F6 db-consistency keeps in sync with the AND-rule). Any drift fails here."""
    pairs = _blocks_with_source_and_row()
    assert pairs, "no block_composition rows with source found — check cwd / DB path"
    mismatches = [
        (slug, col, derive_has_inner_blocks(slug))
        for slug, col in pairs
        if col is not None and derive_has_inner_blocks(slug) != col
    ]
    assert not mismatches, (
        "fresh has_inner derivation drifted from the F6 column for: "
        + ", ".join(f"{s}: column={c} derived={d}" for s, c, d in mismatches)
    )


def test_block_json_override_wins_when_present():
    """Any block declaring supports.sgs.hasInnerBlocks must derive to that value."""
    checked = 0
    for bj in _BLOCKS_DIR.glob("*/block.json"):
        try:
            meta = json.loads(bj.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        sgs = ((meta.get("supports") or {}).get("sgs") or {})
        if isinstance(sgs, dict) and "hasInnerBlocks" in sgs:
            slug = meta.get("name", f"sgs/{bj.parent.name}")
            expected = 0 if not sgs["hasInnerBlocks"] else 1
            assert derive_has_inner_blocks(slug) == expected, f"{slug} override not honoured"
            checked += 1
    if checked == 0:
        pytest.skip("no block.json declares a hasInnerBlocks override")

"""test_has_inner_derive.py — has_inner_blocks derived fresh from save.js (real).

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_has_inner_derive.py
Design ref: .claude/plans/2026-06-23-stage2-recognition-design.md §3 + Spec 31 §12.7.

The production path (services.has_inner) DERIVES from save.js+render.php at convert-time
(NOT a cached column).

REMOVED (EXECUTION Step 16, 2026-07-05): the drift-guard test
(``test_drift_guard_fresh_derivation_agrees_with_f6_column`` + its
``_blocks_with_source_and_row`` helper) cross-checked this fresh derivation
against the ``block_composition.has_inner_blocks`` cached column, which is
DROPPED at Step 16 (migration
``migrations/2026-07-05-drop-has-inner-blocks-column.py`` — F6
db-consistency's ``check_composition.py`` Check #2 no longer has a stored
value to compare against, so the corresponding invariant it protected —
"the cached column matches the AND-rule" — evaporates along with the column;
there is nothing left to drift-guard). The remaining tests below (derivation
correctness + block.json override) have zero DB-column dependency and are
unaffected by the drop.
"""
from __future__ import annotations

import json

import pytest

from converter.services.has_inner import _BLOCKS_DIR, derive_delegates_content


def test_hero_composes_inner_blocks():
    assert derive_delegates_content("sgs/hero") == 1


def test_missing_source_fails_closed_to_zero():
    # A slug with no src dir -> 0 (a leaf cannot host children; safe non-dropping default).
    assert derive_delegates_content("sgs/this-block-does-not-exist") == 0


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
            assert derive_delegates_content(slug) == expected, f"{slug} override not honoured"
            checked += 1
    if checked == 0:
        pytest.skip("no block.json declares a hasInnerBlocks override")

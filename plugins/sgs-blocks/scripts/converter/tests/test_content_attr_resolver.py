"""test_content_attr_resolver.py — content_attr_for_element best-match ranking.

Spec 31 §13.3 FR-31-2.6: content_attr_for_element(block_slug, bem_element) resolves
a draft BEM __element to the block's content attr. Added 2026-07-04: a bare
"first DB row wins" scan is row-ORDER-dependent, not MATCH-STRENGTH-dependent — a
row that only matches via a slot ALIAS (indirect) could beat a later row with a
DIRECT exact match on canonical_slot/attr_name purely by having a lower rowid.
This test builds an isolated in-memory-shaped SQLite DB (monkeypatching
db_lookup.SGS_DB) so the ranking is verified independently of the live,
constantly-drifting sgs-framework.db content.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_content_attr_resolver.py -q --import-mode=importlib
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.db import db_lookup


def _make_db(tmp_path, rows, slot_aliases):
    """Build a throwaway SQLite file with the two tables content_attr_for_element
    reads: block_attributes (attr_name, canonical_slot, emit_shape, role,
    attr_type, block_slug) and slots (slot_name, scope, aliases JSON)."""
    db_path = tmp_path / "fixture.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT,"
        " canonical_slot TEXT, emit_shape TEXT, role TEXT, attr_type TEXT)"
    )
    conn.execute(
        "CREATE TABLE slots (slot_name TEXT, scope TEXT, aliases TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes (block_slug, attr_name, canonical_slot,"
        " emit_shape, role, attr_type) VALUES (?, ?, ?, ?, ?, ?)",
        rows,
    )
    conn.executemany(
        "INSERT INTO slots (slot_name, scope, aliases) VALUES (?, 'element', ?)",
        slot_aliases,
    )
    conn.commit()
    conn.close()
    return db_path


def test_exact_canonical_slot_match_beats_earlier_alias_row(tmp_path, monkeypatch):
    """A row matching only via a slot ALIAS, inserted BEFORE a row with a DIRECT
    exact canonical_slot match, must NOT win — the exact match outranks it
    regardless of DB row order (the bug this fix closes)."""
    rows = [
        # rowid 1 — matches ONLY via the 'greeting' slot's alias list (indirect).
        ("sgs/widget", "aliasOnlyAttr", "greeting", "nested", "text-content", "string"),
        # rowid 2 — DIRECT exact canonical_slot match on the element token itself.
        ("sgs/widget", "exactAttr", "hello", "nested", "text-content", "string"),
    ]
    slot_aliases = [("greeting", '["hello"]')]
    db_path = _make_db(tmp_path, rows, slot_aliases)
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/widget", "hello")
    assert result is not None
    attr_name, emit_shape, role, attr_type = result
    assert attr_name == "exactAttr", (
        f"Expected the DIRECT exact-match attr 'exactAttr' to win over the"
        f" alias-only 'aliasOnlyAttr' (row-order-only would wrongly pick"
        f" 'aliasOnlyAttr' since it was inserted first); got {attr_name!r}"
    )


def test_genuine_tie_keeps_first_db_row(tmp_path, monkeypatch):
    """Two attrs that BOTH exactly match the same element token (same tier) are
    genuine ambiguity — the resolver keeps the first-DB-row result unchanged
    (documented behaviour, not silently "fixed" by guessing a secondary attr)."""
    rows = [
        ("sgs/widget", "ctaText", "button", "nested", "text-content", "string"),
        ("sgs/widget", "ctaUrl", "button", "nested", "content", "string"),
    ]
    db_path = _make_db(tmp_path, rows, [])
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/widget", "button")
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "ctaText", (
        f"Expected the first-inserted tier-0 row 'ctaText' to win on a genuine"
        f" tie; got {attr_name!r}"
    )


def test_attr_name_exact_match_ranks_as_exact_not_alias(tmp_path, monkeypatch):
    """An attr whose own NAME (not its canonical_slot) exactly equals the element
    token is a direct/exact match too, and must outrank a looser alias hit on a
    different, earlier row."""
    rows = [
        # rowid 1 — alias-only match via 'label' slot's aliases.
        ("sgs/widget", "aliasAttr", "label", "nested", "text-content", "string"),
        # rowid 2 — the attr's OWN name equals the element token; canonical_slot
        # is unrelated, so only the attr_name-exact rung fires.
        ("sgs/widget", "eyebrow", "unrelated", "nested", "text-content", "string"),
    ]
    slot_aliases = [("label", '["eyebrow"]')]
    db_path = _make_db(tmp_path, rows, slot_aliases)
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/widget", "eyebrow")
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "eyebrow", (
        f"Expected the attr-name-exact match 'eyebrow' to outrank the"
        f" alias-only 'aliasAttr'; got {attr_name!r}"
    )

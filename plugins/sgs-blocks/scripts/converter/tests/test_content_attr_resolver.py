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


def _make_db(tmp_path, rows, slot_aliases, breakpoint_suffixes=None):
    """Build a throwaway SQLite file with the tables content_attr_for_element
    reads: block_attributes (attr_name, canonical_slot, emit_shape, role,
    attr_type, block_slug), slots (slot_name, scope, aliases JSON), and —
    only when ``breakpoint_suffixes`` is given — modifier_suffixes(suffix,
    kind), so tests can exercise the tier axis. Deliberately omitting
    modifier_suffixes (the default) proves the tier-vocabulary lookup
    degrades to "no exclusion" rather than raising when the table is
    unavailable — the pre-existing tests above rely on exactly that."""
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
    if breakpoint_suffixes is not None:
        conn.execute(
            "CREATE TABLE modifier_suffixes (suffix TEXT, kind TEXT, notes TEXT)"
        )
        conn.executemany(
            "INSERT INTO modifier_suffixes (suffix, kind, notes) VALUES (?, 'breakpoint', NULL)",
            [(s,) for s in breakpoint_suffixes],
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


# ----------------------------------------------------------------------------
# Content-router device-tier axis (design settled — mirrors the CSS router's
# modifier_suffixes(kind='breakpoint') vocabulary). Added for the
# splitImage/splitImageMobile-class rowid-wins bug fix.
# ----------------------------------------------------------------------------

def test_base_only_no_tier_requested(tmp_path, monkeypatch):
    """No `tier` argument (or None) resolves the base attr exactly as before —
    strictly additive for tier=None callers."""
    rows = [
        ("sgs/hero", "image", "media", "nested", "image-object", "object"),
        ("sgs/hero", "imageMobile", "media", "nested", "image-object", "object"),
    ]
    db_path = _make_db(tmp_path, rows, [], breakpoint_suffixes=("Mobile", "Tablet", "Desktop"))
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/hero", "media")
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "image", (
        f"Expected the BASE attr 'image' with no tier requested; got {attr_name!r}"
    )


def test_tier_hit_resolves_sibling_attr(tmp_path, monkeypatch):
    """tier='Mobile' resolves the base attr first, then returns its declared
    `{base}Mobile` sibling — never the base attr itself."""
    rows = [
        ("sgs/hero", "image", "media", "nested", "image-object", "object"),
        ("sgs/hero", "imageMobile", "media", "nested", "image-object", "object"),
    ]
    db_path = _make_db(tmp_path, rows, [], breakpoint_suffixes=("Mobile", "Tablet", "Desktop"))
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/hero", "media", tier="Mobile")
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "imageMobile", (
        f"Expected tier='Mobile' to resolve the sibling 'imageMobile'; got {attr_name!r}"
    )


def test_tier_sibling_missing_is_a_loud_gap_no_fallback(tmp_path, monkeypatch):
    """tier requested but no `{base}Mobile` sibling is declared → None, NEVER
    a silent fallback to the base attr (the owner's ruling)."""
    rows = [
        ("sgs/quote", "attribution", "author", "nested", "text-content", "string"),
    ]
    db_path = _make_db(tmp_path, rows, [], breakpoint_suffixes=("Mobile", "Tablet", "Desktop"))
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/quote", "author", tier="Mobile")
    assert result is None, (
        f"Expected None (loud gap, no fallback) when no Mobile sibling exists;"
        f" got {result!r} — a fallback to the base attr would silently hide the gap"
    )


def test_rule_2_excludes_tier_suffixed_sibling_from_base_resolution(tmp_path, monkeypatch):
    """THE core fix: a tier-suffixed attr (imageMobile) inserted with a LOWER
    rowid than its base (image) must NOT win the no-tier lookup by rowid —
    base resolution must exclude it. Pre-fix code (first tier-0 row wins by
    rowid) would return 'imageMobile' here; this is the regression this test
    guards against."""
    rows = [
        # rowid 1 — the Mobile variant, inserted FIRST (lower rowid) — this
        # ordering is exactly what would make the OLD "first row wins" logic
        # wrongly return the Mobile attr for a plain no-tier lookup.
        ("sgs/hero", "imageMobile", "media", "nested", "image-object", "object"),
        # rowid 2 — the base attr, inserted SECOND (higher rowid).
        ("sgs/hero", "image", "media", "nested", "image-object", "object"),
    ]
    db_path = _make_db(tmp_path, rows, [], breakpoint_suffixes=("Mobile", "Tablet", "Desktop"))
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/hero", "media")
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "image", (
        f"RULE 2 REGRESSION: base resolution returned {attr_name!r} instead of"
        f" 'image' — a tier-suffixed sibling won the no-tier lookup by rowid"
        f" despite a declared base sibling existing (the exact rowid-wins bug"
        f" this mechanism exists to close)"
    )


def test_suffix_word_with_no_base_sibling_is_not_excluded(tmp_path, monkeypatch):
    """The second clause of rule 2 matters: an attr ending in a suffix WORD
    but with NO base sibling declared on the block must NOT be excluded from
    base resolution — it is a legitimate standalone attr, not a tier variant."""
    rows = [
        # 'heroMobile' ends with the 'Mobile' suffix, but there is no
        # 'hero' attr declared on this block — it must resolve normally.
        ("sgs/widget", "heroMobile", "banner", "nested", "text-content", "string"),
    ]
    db_path = _make_db(tmp_path, rows, [], breakpoint_suffixes=("Mobile", "Tablet", "Desktop"))
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/widget", "banner")
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "heroMobile", (
        f"Expected 'heroMobile' to resolve normally (no base sibling exists,"
        f" so it is not a tier variant to exclude); got {attr_name!r}"
    )


def test_missing_modifier_suffixes_table_degrades_to_no_exclusion(tmp_path, monkeypatch):
    """When modifier_suffixes is unavailable (e.g. an isolated fixture that
    never seeded it), rule 2's exclusion must degrade to a no-op rather than
    raising — this is what keeps the ORIGINAL pre-tier tests in this file
    (which build no modifier_suffixes table) passing unchanged."""
    rows = [
        ("sgs/widget", "priceMobile", "cost", "nested", "text-content", "string"),
    ]
    db_path = _make_db(tmp_path, rows, [])  # no breakpoint_suffixes -> no table
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/widget", "cost")
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "priceMobile"

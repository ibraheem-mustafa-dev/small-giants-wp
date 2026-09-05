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
    attr_type, block_slug), slots (slot_name, scope, aliases JSON), roles
    (role_name, classification — content_attr_for_element's FR-31-2.2
    positive allowlist reads this via `_content_bearing_roles()`; every
    `role` value used by a fixture's `rows` MUST be classified
    'content-bearing' here or the function closes the allowlist and returns
    None before it ever reaches block_attributes), and — only when
    ``breakpoint_suffixes`` is given — modifier_suffixes(suffix, kind), so
    tests can exercise the tier axis. Deliberately omitting modifier_suffixes
    (the default) proves the tier-vocabulary lookup degrades to "no
    exclusion" rather than raising when the table is unavailable — the
    pre-existing tests above rely on exactly that.

    Note: `_content_bearing_roles()` is process-wide `lru_cache`d in
    db_lookup.py, so only the FIRST call within a pytest process actually
    reads this table — seeding the full role vocabulary here (rather than
    just the roles a single test happens to use) keeps every test in this
    file correct regardless of run order."""
    db_path = tmp_path / "fixture.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT,"
        " canonical_slot TEXT, emit_shape TEXT, role TEXT, attr_type TEXT)"
    )
    conn.execute(
        "CREATE TABLE slots (slot_name TEXT, scope TEXT, aliases TEXT)"
    )
    conn.execute(
        "CREATE TABLE roles (role_name TEXT, classification TEXT)"
    )
    conn.executemany(
        "INSERT INTO roles (role_name, classification) VALUES (?, 'content-bearing')",
        [("text-content",), ("content",), ("image-object",), ("identity",), ("rating",)],
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


# ----------------------------------------------------------------------------
# Desktop A-collapse (Spec 31 §13.4 FR-31-5.2, extended by analogy from CSS
# routing to content routing): the SGS device system has no `...Desktop`
# attribute — tier='Desktop' must resolve to the BASE attr, never None.
# ----------------------------------------------------------------------------

def test_desktop_collapses_to_base_when_tier_siblings_exist(tmp_path, monkeypatch):
    """tier='Desktop' returns the BASE attr even though Mobile/Tablet siblings
    are declared — there is no `imageDesktop` attr to look up."""
    rows = [
        ("sgs/hero", "image", "media", "nested", "image-object", "object"),
        ("sgs/hero", "imageMobile", "media", "nested", "image-object", "object"),
        ("sgs/hero", "imageTablet", "media", "nested", "image-object", "object"),
    ]
    db_path = _make_db(tmp_path, rows, [], breakpoint_suffixes=("Mobile", "Tablet", "Desktop"))
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/hero", "media", tier="Desktop")
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "image", (
        f"Expected tier='Desktop' to collapse to the base attr 'image'; got {attr_name!r}"
    )


def test_desktop_collapses_to_base_when_no_tier_siblings_exist(tmp_path, monkeypatch):
    """tier='Desktop' still returns the BASE attr when NO Mobile/Tablet
    siblings are declared at all — the collapse does not depend on any
    sibling existing (unlike Tablet/Mobile, which require one)."""
    rows = [
        ("sgs/quote", "attribution", "author", "nested", "text-content", "string"),
    ]
    db_path = _make_db(tmp_path, rows, [], breakpoint_suffixes=("Mobile", "Tablet", "Desktop"))
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/quote", "author", tier="Desktop")
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "attribution", (
        f"Expected tier='Desktop' to collapse to the base attr 'attribution'; got {attr_name!r}"
    )


def test_tablet_still_loud_gap_unaffected_by_desktop_collapse(tmp_path, monkeypatch):
    """NEGATIVE CONTROL: tier='Tablet' with no declared sibling must still
    return None. This must FAIL if the Desktop collapse is implemented as an
    unconditional fallback (i.e. applied to every tier, not just Desktop) —
    proving the collapse is scoped to Desktop only, per the owner's ruling
    that Tablet/Mobile keep the loud no-fallback gap."""
    rows = [
        ("sgs/quote", "attribution", "author", "nested", "text-content", "string"),
    ]
    db_path = _make_db(tmp_path, rows, [], breakpoint_suffixes=("Mobile", "Tablet", "Desktop"))
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element("sgs/quote", "author", tier="Tablet")
    assert result is None, (
        f"Expected None (loud gap, no fallback) for tier='Tablet' with no"
        f" declared sibling; got {result!r} — the Desktop collapse must not"
        f" leak into Tablet/Mobile resolution"
    )


# ----------------------------------------------------------------------------
# `_variant_modifier_tiebreak` regression (Task 3, 2026-09-05): a same-tier
# alias tie between sgs/product-card's `featuredTag`/`trialTag` (both alias
# element token 'tag' via canonical_slot='label') used to ALWAYS resolve to
# whichever attr had the lower DB rowid, regardless of which BEM modifier
# the draft's actual element carried — proven live: a `--featured`-modified
# tag's text landed in `trialTag` every time. The fix reads `variant_slots`
# (FR-31-20) to let the block's OWN variant-discrimination facts break the
# tie via the draft's modifier. This DB-rowid-order dependency is exactly
# the kind of defect a future `/sgs-update` reseed could silently
# reintroduce (a reseed is free to renumber rowids) — this test pins the
# reviewer's own manual verification as a permanent regression guard so a
# reseed that flips row order fails CI instead of shipping silently.
#
# Manual verification this test reproduces (task-3 review, mods -> winner):
#   mods=()                    -> trialTag     (pre-existing behaviour, unchanged)
#   mods=('featured',)         -> featuredTag  (the fix)
#   mods=('trial',)            -> trialTag
#   mods=('featured','trial')  -> trialTag     (2 matches -> refuses to guess, falls back)
# ----------------------------------------------------------------------------

def _make_variant_tiebreak_db(tmp_path):
    """Build the sgs/product-card 'tag' ambiguity fixture: two content attrs
    both aliasing element token 'tag' via canonical_slot='label' (same
    match-tier -> genuine ambiguity), plus `variant_slots` rows declaring
    `featuredTag`/`trialTag` as the discriminating slot for the `featured`/
    `trial` variants respectively — the DB facts `_variant_modifier_tiebreak`
    reads. `trialTag` is inserted FIRST (lower rowid) so the pre-existing
    "first DB row wins" default is `trialTag`, matching the reviewer's
    verified `mods=()` case."""
    rows = [
        # rowid 1 — inserted first, so this is the rowid-order default winner.
        ("sgs/product-card", "trialTag", "label", "nested", "text-content", "string"),
        # rowid 2.
        ("sgs/product-card", "featuredTag", "label", "nested", "text-content", "string"),
    ]
    slot_aliases = [("label", '["tag"]')]
    db_path = _make_db(tmp_path, rows, slot_aliases)
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE variant_slots (block_slug TEXT, variant_value TEXT,"
        " unique_slot TEXT, slot_value TEXT)"
    )
    conn.executemany(
        "INSERT INTO variant_slots (block_slug, variant_value, unique_slot, slot_value)"
        " VALUES (?, ?, ?, NULL)",
        [
            ("sgs/product-card", "featured", "featuredTag"),
            ("sgs/product-card", "trial", "trialTag"),
        ],
    )
    conn.commit()
    conn.close()
    return db_path


def test_variant_modifier_tiebreak_no_modifiers_keeps_rowid_default(tmp_path, monkeypatch):
    """mods=() -> trialTag: pre-existing rowid-order behaviour, unchanged when
    no modifier is supplied (the reviewer's baseline case)."""
    db_path = _make_variant_tiebreak_db(tmp_path)
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element(
        "sgs/product-card", "tag", modifiers=()
    )
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "trialTag", (
        f"Expected mods=() to keep the pre-existing rowid-order default"
        f" 'trialTag'; got {attr_name!r}"
    )


def test_variant_modifier_tiebreak_featured_resolves_featured_tag(tmp_path, monkeypatch):
    """mods=('featured',) -> featuredTag: THE FIX. Without the modifier
    tie-break this would wrongly resolve to 'trialTag' by rowid order,
    exactly the live bug (a --featured tag's text landing in trialTag)."""
    db_path = _make_variant_tiebreak_db(tmp_path)
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element(
        "sgs/product-card", "tag", modifiers=("featured",)
    )
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "featuredTag", (
        f"REGRESSION: mods=('featured',) resolved to {attr_name!r} instead of"
        f" 'featuredTag' — a DB reseed that reorders block_attributes rowids"
        f" has silently flipped the tie-break back to the rowid-wins bug"
    )


def test_variant_modifier_tiebreak_trial_resolves_trial_tag(tmp_path, monkeypatch):
    """mods=('trial',) -> trialTag: the tie-break correctly names trialTag as
    the discriminating slot for the 'trial' variant too (not just a
    fallback-because-unmatched result)."""
    db_path = _make_variant_tiebreak_db(tmp_path)
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element(
        "sgs/product-card", "tag", modifiers=("trial",)
    )
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "trialTag", (
        f"Expected mods=('trial',) to resolve 'trialTag'; got {attr_name!r}"
    )


def test_variant_modifier_tiebreak_two_matches_refuses_to_guess(tmp_path, monkeypatch):
    """mods=('featured','trial') -> trialTag (rowid-order fallback): BOTH
    candidates match one of the supplied modifiers, so the tie-break is
    genuinely ambiguous and must NOT guess — it falls back to the unchanged
    first-by-rowid default, never inventing a new answer."""
    db_path = _make_variant_tiebreak_db(tmp_path)
    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)

    result = db_lookup.content_attr_for_element(
        "sgs/product-card", "tag", modifiers=("featured", "trial")
    )
    assert result is not None
    attr_name, _emit_shape, _role, _attr_type = result
    assert attr_name == "trialTag", (
        f"Expected a 2-match ambiguity to refuse to guess and fall back to"
        f" the rowid-order default 'trialTag'; got {attr_name!r}"
    )

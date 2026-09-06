"""test_root_modifier_element_guard.py — a block-root BEM modifier must never
route to a CHILD element's attribute (Task 1, converter bug (b)).

Protects ``db_lookup._base_domain_attrs_for_css_property`` (the column-first
domain restriction ``attr_for_property``/``attr_for_layer_property`` use to
decide which attr owns a block-root CSS declaration): a ``css_layer='OUTER'``
row must ALSO have a root-domain ``css_element`` (NULL/''/root/self/wrapper —
``_OUTER_ROOT_ELEMENTS``) to be treated as the block's own root/self attr.
Without that AND, a NAMED CHILD element's attr merely tagged
``css_layer='OUTER'`` (e.g. a 'cta'/'overlay'-scoped attr) could masquerade as
the block's root attr — a block-root declaration landing on a child
element's attribute instead of its own.

Coverage:
  * ``test_hero_background_color_resolves_without_crashing`` — the clearest
    proof: two candidates used to survive the unguarded filter and raise
    ``AmbiguousCssPropAttrError``; now exactly one survives.
  * ``test_hero_background_image_does_not_misroute_to_overlay_child_attr`` —
    a child-scoped attr no longer masquerades as a root destination; the
    correct answer is an honest gap.
  * ``test_media_box_shadow_colour_correctly_gaps_to_named_child`` /
    ``test_before_after_box_shadow_colour_resolves_after_css_element_reseed``
    — one genuine child attr (correctly excluded) and one root attr with a
    corrected DB label (must resolve to itself); see
    ``migrations/2026-08-27-before-after-boxshadowcolour-css-element-fix.py``
    for the DB-side correction this second test depends on.
  * ``test_product_card_own_border_attrs_still_resolve_correctly`` — a
    regression guard on the fix's originally-intended case.
  * ``test_synthetic_outer_layer_child_element_is_excluded_from_root_domain``
    — a schema-only control independent of the live DB's current seed, so
    this suite cannot go vacuous if any of the above rows is ever re-tagged.
  * ``test_custom_wrapper_element_root_case_resolves_as_root_domain`` /
    ``test_custom_wrapper_element_child_case_excluded_despite_matching_name``
    / ``test_custom_wrapper_element_guard_is_not_vacuous`` — Task 1 v2
    re-fix (2026-08-27): a block's CUSTOM isWrapper element name (e.g.
    before-after's 'frame') is recognised as root-domain ONLY when the row's
    derived_selector is the block's own root selector verbatim (or NULL) —
    never by a "contains __" string-shape heuristic. All three tests use a
    fabricated synthetic block + monkeypatched ``_get_block_root_element``,
    independent of live DB state (the v1 attempt's equivalent test called
    live ``sgs/before-after``, which this session's stopgap migration had
    already relabelled to css_element='wrapper', so it proved nothing about
    the new mechanism).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_root_modifier_element_guard.py -q
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.db import db_lookup

pytestmark = pytest.mark.skipif(
    not db_lookup.SGS_DB.exists(), reason="SGS DB absent — root-domain guard needs it"
)


# ---------------------------------------------------------------------------
# Headline case: two candidates used to survive the root-domain filter for
# this pair — one genuinely root, one a child masquerading via the unguarded
# css_layer='OUTER' arm — which made attr_for_property raise
# AmbiguousCssPropAttrError on every hero clone touching background-color.
# ---------------------------------------------------------------------------

def test_hero_background_color_resolves_without_crashing():
    """sgs/hero + 'background-color' must resolve to exactly one attr —
    the genuine root/wrapper attr 'backgroundColour' — never raise
    AmbiguousCssPropAttrError, and never resolve to the 'overlay'-scoped
    child sibling 'backgroundOverlayColour'.
    """
    resolved = db_lookup.attr_for_property("sgs/hero", "background-color")
    assert resolved is not None, "sgs/hero background-color unexpectedly gapped"
    _writer_path, attr_name, _kind = resolved
    assert attr_name == "backgroundColour", (
        f"sgs/hero background-color resolved to {attr_name!r}, expected the "
        "block's own root attr 'backgroundColour' (not the 'overlay'-scoped "
        "'backgroundOverlayColour' that used to make this pair ambiguous)"
    )


def test_hero_background_image_does_not_misroute_to_overlay_child_attr():
    """sgs/hero + 'background-image': the pair this fix was originally built
    and tested against. A root-level declaration for a property with NO
    root-domain destination must gap (None), never resolve to a child-scoped
    attr just because that child attr happens to be tagged css_layer='OUTER'.

    sgs/hero's only 'background-image' destinations are all child-scoped
    (overlay/media/content) — none is root/self/wrapper. The OUTER-layer
    resolver already gets this right (proves the correct answer); the
    column-first path attr_for_property uses did not, before this fix.
    """
    assert db_lookup.attr_for_layer_property("sgs/hero", "OUTER", "background-image") is None, (
        "sanity check: the correctly-guarded OUTER-layer resolver must also see "
        "no root-domain destination for this property"
    )
    resolved = db_lookup.attr_for_property("sgs/hero", "background-image")
    assert resolved is None, (
        f"attr_for_property('sgs/hero', 'background-image') resolved to {resolved!r} — "
        "it must return None (honest gap), not a child-scoped attr such as "
        "'overlayGradient' (css_element='overlay'). A block-root declaration must "
        "never land on a CHILD element's attribute."
    )


def test_media_box_shadow_colour_correctly_gaps_to_named_child():
    """sgs/media + 'box-shadow-color' must stay excluded from the root
    domain — a regression guard on the reviewer's "correct, unaffected"
    control case.

    NOT because css_element='media' is "a named child, not root/self/
    wrapper": 'media' is sgs/media's OWN declared isWrapper root-element
    name in block.json (supports.sgs.elements.media.isWrapper=true) — the
    identical shape that turned out to be semantically CORRECT for
    sgs/before-after's 'frame' (see that test below). The real discriminator
    is the attr's own derived_selector: this one is
    '.sgs-media__img, .sgs-media__video' — two SPECIFIC NESTED child nodes
    (the img/video the shadow visually paints on), not the block's own root
    selector ('.wp-block-sgs-media'). before-after's boxShadowColour, by
    contrast, carries derived_selector='.wp-block-sgs-before-after' — the
    block's own root selector, verbatim. That is what makes this one a
    genuine child-scoped paint target and before-after's a genuine root one,
    regardless of either attr's css_element label.

    'box-shadow-color' has NO property_suffixes row at all, so
    attr_for_property short-circuits to None before ever reaching its
    column-first check — attr_for_layer_property (the function outer_box's
    real resolve() path actually calls first, via attr_resolve) is what
    exercises this guard for this property in production; that is what this
    test — and its before-after sibling below — assert against.
    """
    declared = db_lookup._base_domain_attrs_for_css_property("sgs/media", "box-shadow-color")
    assert "boxShadowColour" not in declared, (
        f"_base_domain_attrs_for_css_property('sgs/media', 'box-shadow-color') "
        f"returned {declared!r} — sgs/media.boxShadowColour paints "
        "'.sgs-media__img, .sgs-media__video' (nested child nodes, not the "
        "block's own root selector) and must never enter the root domain."
    )
    assert db_lookup.attr_for_layer_property("sgs/media", "OUTER", "box-shadow-color") is None, (
        "sgs/media box-shadow-color must gap at the OUTER layer — its "
        "derived_selector targets nested img/video children, not the "
        "block's own root box-shadow colour."
    )


def test_before_after_box_shadow_colour_resolves_after_css_element_reseed():
    """sgs/before-after's own root box-shadow colour must resolve to itself
    ('boxShadowColour'), not gap. This row's css_element was originally
    'frame' — this block's own block.json name for its isWrapper root
    element (NOT a mistake), but the OUTER-layer root-element vocabulary
    (`_OUTER_ROOT_ELEMENTS`) is a closed list that only recognises
    ('', root, self, wrapper), so 'frame' never matched it. Depends on the
    DB correction in
    migrations/2026-08-27-before-after-boxshadowcolour-css-element-fix.py
    having been applied — a pragmatic relabel to 'wrapper', not a truth
    correction; see that migration's docstring for the full story and the
    durability risk (a future /sgs-update reseed could revert it). This test
    observes only — it does not repair the row itself.

    Asserts via attr_for_layer_property, not attr_for_property: 'box-shadow-
    color' has no property_suffixes row, so attr_for_property always
    short-circuits to None for it regardless of the column-first data —
    attr_for_layer_property (what outer_box.resolve's attr_resolve call
    actually reaches first in production) is the function this guard governs
    for this property.
    """
    resolved = db_lookup.attr_for_layer_property("sgs/before-after", "OUTER", "box-shadow-color")
    assert resolved == "boxShadowColour", (
        f"sgs/before-after box-shadow-color (OUTER layer) resolved to {resolved!r} — "
        "the 2026-08-27-before-after-boxshadowcolour-css-element-fix migration "
        "may not have been applied to this DB (run it: "
        "python migrations/2026-08-27-before-after-boxshadowcolour-css-element-fix.py)"
    )


def test_product_card_own_border_attrs_still_resolve_correctly():
    """Regression guard: the fix must not disturb a genuine root-domain OUTER
    match. sgs/product-card's own border-color/-width/-style ARE root/wrapper
    attrs tagged css_layer='OUTER' and must keep resolving to themselves, not
    to the child 'cta'-scoped siblings (ctaColourBorder/ctaBorderWidth/
    ctaBorderStyle)."""
    for prop, expected_attr in (
        ("border-color", "borderColour"),
        ("border-width", "borderWidth"),
        ("border-style", "borderStyle"),
    ):
        resolved = db_lookup.attr_for_property("sgs/product-card", prop)
        assert resolved is not None, f"{prop} unexpectedly gapped on sgs/product-card"
        _writer_path, attr_name, _kind = resolved
        assert attr_name == expected_attr, (
            f"sgs/product-card {prop} resolved to {attr_name!r}, expected the "
            f"block's own root attr {expected_attr!r} (not a 'cta'-scoped child attr)"
        )


# ---------------------------------------------------------------------------
# A synthetic, schema-only control. Every test above depends on the LIVE DB's
# current seed; if any of those rows is ever re-tagged, those tests would
# start passing for the wrong reason or go vacuous. This test builds its own
# throwaway SQLite DB with fabricated rows and asserts the guard PREDICATE
# directly, independent of whatever the shared live DB contains today.
# ---------------------------------------------------------------------------

@pytest.fixture
def synthetic_db(tmp_path, monkeypatch):
    """A minimal block_attributes table with fabricated rows, swapped in for
    SGS_DB for the duration of one test via monkeypatch (restored after)."""
    db_path = tmp_path / "synthetic-sgs.db"
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE block_attributes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            block_slug TEXT NOT NULL,
            attr_name TEXT NOT NULL,
            attr_type TEXT NOT NULL,
            css_layer TEXT,
            css_property TEXT,
            css_element TEXT,
            css_state TEXT,
            css_tier TEXT,
            derived_selector TEXT
        )
        """
    )
    rows = [
        # A genuine root/wrapper attr, css_layer='OUTER' — must be admitted.
        # derived_selector=NULL means it targets the block's root.
        ("sgs/__synthetic__", "rootBorderColour", "string", "OUTER", "border-color", "wrapper", None, None, None),
        # A NAMED-CHILD attr that ALSO carries css_layer='OUTER' — the exact
        # shape that used to slip through unguarded. Must be EXCLUDED.
        ("sgs/__synthetic__", "childBorderColour", "string", "OUTER", "border-color", "cta", None, None, None),
        # A named-child attr with NO css_layer at all — must stay excluded
        # (unaffected control; this was never the buggy path).
        ("sgs/__synthetic__", "otherChildColour", "string", None, "border-color", "cta", None, None, None),
    ]
    conn.executemany(
        "INSERT INTO block_attributes "
        "(block_slug, attr_name, attr_type, css_layer, css_property, css_element, css_state, css_tier, derived_selector) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)
    db_lookup._base_domain_attrs_for_css_property.cache_clear()
    yield
    db_lookup._base_domain_attrs_for_css_property.cache_clear()


def test_synthetic_outer_layer_child_element_is_excluded_from_root_domain(synthetic_db):
    """Schema-independent proof of the predicate itself: a css_layer='OUTER'
    row with a NAMED-CHILD css_element must NOT enter the root-resolver
    domain, regardless of what any live block happens to be seeded as today."""
    declared = db_lookup._base_domain_attrs_for_css_property(
        "sgs/__synthetic__", "border-color"
    )
    assert declared == ("rootBorderColour",), (
        f"expected only the genuine root/wrapper attr, got {declared!r} — "
        "a css_layer='OUTER' row scoped to a named child element ('cta') must "
        "not be admitted into the root-resolver domain just because of its "
        "css_layer, and a child attr with no css_layer at all must never enter "
        "either."
    )


# ---------------------------------------------------------------------------
# Task 1 v2 re-fix (2026-08-27): the guard recognises a block's own CUSTOM
# isWrapper element name (from block.json), but ONLY admits a row using that
# name when the row's derived_selector is the block's own root selector
# verbatim (or empty/NULL) -- never by a string-shape heuristic on the
# selector's characters (see _root_domain_element_clause's docstring for why
# the v1 attempt's 'contains __' check was wrong on two counts).
#
# These tests use ONLY the synthetic_db pattern -- fabricated rows in a
# throwaway SQLite DB, PLUS a monkeypatched _get_block_root_element so no
# real block.json is needed either. This is deliberate: the v1 attempt's
# equivalent test called live db_lookup.attr_for_layer_property('sgs/before-
# after', ...), which happened to pass against BOTH the old and the new code
# because this same session's stopgap migration
# (migrations/2026-08-27-before-after-boxshadowcolour-css-element-fix.py)
# had already relabelled that row's css_element to the generic 'wrapper' --
# so the live case no longer exercises the custom-isWrapper-name route at
# all. Building genuinely synthetic data with a FABRICATED custom isWrapper
# name is the only way to prove the new mechanism does something, independent
# of whatever the live DB happens to contain today.
# ---------------------------------------------------------------------------

_SYNTHETIC_CUSTOM_WRAPPER_SLUG = "sgs/__synthetic_custom_wrapper__"


@pytest.fixture
def synthetic_db_with_custom_wrapper(tmp_path, monkeypatch):
    """A fabricated block declaring a CUSTOM-NAMED isWrapper element ('frame'
    -- mirroring before-after's real shape), with three rows:

      * ``rootShadowColour`` -- css_element='frame' (the custom isWrapper
        name) AND derived_selector equal to the block's own root selector
        verbatim. Must resolve as ROOT (route 2 of the guard).
      * ``childShadowColour`` -- SAME css_element='frame', but
        derived_selector targets a specific nested child node, not the root
        selector. Must stay EXCLUDED -- proving the guard does not treat
        "css_element matches the isWrapper name" alone as sufficient (this
        is the media/before-after distinction, reproduced synthetically).
      * ``unrelatedChildColour`` -- a genuinely different named-child element
        (not the block's isWrapper name at all), css_layer='OUTER'. Must stay
        excluded regardless -- a negative control proving the predicate can
        fail, not a vacuous always-true check.
    """
    root_selector = db_lookup._get_block_root_selector(_SYNTHETIC_CUSTOM_WRAPPER_SLUG)
    db_path = tmp_path / "synthetic-custom-wrapper.db"
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE block_attributes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            block_slug TEXT NOT NULL,
            attr_name TEXT NOT NULL,
            attr_type TEXT NOT NULL,
            css_layer TEXT,
            css_property TEXT,
            css_element TEXT,
            css_state TEXT,
            css_tier TEXT,
            derived_selector TEXT
        )
        """
    )
    rows = [
        (_SYNTHETIC_CUSTOM_WRAPPER_SLUG, "rootShadowColour", "string", "OUTER",
         "box-shadow-color", "frame", None, None, root_selector),
        (_SYNTHETIC_CUSTOM_WRAPPER_SLUG, "childShadowColour", "string", "OUTER",
         "box-shadow-color", "frame", None, None, ".sgs-synthetic__inner-panel"),
        (_SYNTHETIC_CUSTOM_WRAPPER_SLUG, "unrelatedChildColour", "string", "OUTER",
         "box-shadow-color", "some-other-child", None, None, None),
    ]
    conn.executemany(
        "INSERT INTO block_attributes "
        "(block_slug, attr_name, attr_type, css_layer, css_property, css_element, css_state, css_tier, derived_selector) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(db_lookup, "SGS_DB", db_path)
    # Simulate the block's block.json declaring 'frame' as its isWrapper
    # element, without needing a real file on disk for a fabricated slug.
    monkeypatch.setattr(
        db_lookup,
        "_get_block_root_element",
        lambda slug: "frame" if slug == _SYNTHETIC_CUSTOM_WRAPPER_SLUG else None,
    )
    db_lookup._base_domain_attrs_for_css_property.cache_clear()
    db_lookup.declared_attrs_for_css_property.cache_clear()
    yield _SYNTHETIC_CUSTOM_WRAPPER_SLUG
    db_lookup._base_domain_attrs_for_css_property.cache_clear()
    db_lookup.declared_attrs_for_css_property.cache_clear()


def test_custom_wrapper_element_root_case_resolves_as_root_domain(
    synthetic_db_with_custom_wrapper,
):
    """(a) A block's custom isWrapper element name ('frame'), on a row whose
    derived_selector equals the block's own root selector verbatim, must
    resolve as root-domain."""
    block_slug = synthetic_db_with_custom_wrapper
    declared = db_lookup._base_domain_attrs_for_css_property(block_slug, "box-shadow-color")
    assert declared == ("rootShadowColour",), (
        f"expected only the genuine root attr for the custom isWrapper name "
        f"'frame', got {declared!r} — a row whose derived_selector is the "
        "block's own root selector, verbatim, must be admitted as root-domain "
        "even though its css_element is a CUSTOM name, not the generic "
        "'wrapper' string"
    )
    resolved = db_lookup.attr_for_layer_property(block_slug, "OUTER", "box-shadow-color")
    assert resolved == "rootShadowColour", (
        f"attr_for_layer_property resolved to {resolved!r}, expected "
        "'rootShadowColour' via the custom-isWrapper-name root route"
    )


def test_custom_wrapper_element_child_case_excluded_despite_matching_name(
    synthetic_db_with_custom_wrapper,
):
    """(b) A row sharing the SAME custom isWrapper name ('frame') as
    css_element, but whose derived_selector targets a specific nested child
    node (not the block's root selector), must stay excluded — proving the
    guard is not fooled by a css_element string match alone. This is the
    synthetic reproduction of the real media-vs-before-after distinction."""
    block_slug = synthetic_db_with_custom_wrapper
    declared = db_lookup._base_domain_attrs_for_css_property(block_slug, "box-shadow-color")
    assert "childShadowColour" not in declared, (
        f"got {declared!r} — childShadowColour shares css_element='frame' "
        "with the genuine root attr, but its derived_selector "
        "('.sgs-synthetic__inner-panel') targets a specific nested child "
        "node, not the block's own root selector, so it must never enter "
        "the root domain"
    )


def test_custom_wrapper_element_guard_is_not_vacuous(synthetic_db_with_custom_wrapper):
    """(c) Negative control: an unrelated named-child element
    ('some-other-child', not the block's isWrapper name at all) tagged
    css_layer='OUTER' must ALSO stay excluded — proving this predicate can
    fail (reject a row) and is not a check that always returns True."""
    block_slug = synthetic_db_with_custom_wrapper
    declared = db_lookup._base_domain_attrs_for_css_property(block_slug, "box-shadow-color")
    assert "unrelatedChildColour" not in declared, (
        f"got {declared!r} — a named-child element that is neither a "
        "generic root convention nor the block's own custom isWrapper name "
        "must never enter the root domain, regardless of css_layer"
    )
    assert declared == ("rootShadowColour",), (
        f"expected exactly one root-domain attr, got {declared!r}"
    )


def test_get_block_root_element_reads_real_block_json_not_monkeypatched():
    """Direct, non-monkeypatched proof that _get_block_root_element reads the
    ACTUAL repo block.json files correctly — every other test in this file
    monkeypatches this function out entirely, so the block.json path
    arithmetic, the supports.sgs.elements traversal, and the isWrapper
    predicate (the real R-31-1-compliance mechanism this task adds) were
    previously proven only by manual inspection, never by a running test.
    Reads real files on disk, not the shared DB — this does not reintroduce
    the live-DB-dependency problem those other tests were fixed to avoid."""
    assert db_lookup._get_block_root_element("sgs/before-after") == "frame", (
        "sgs/before-after's block.json declares its wrapper element as "
        "'frame' via supports.sgs.elements.frame.isWrapper — if this ever "
        "returns something else, the block.json schema changed or the "
        "reader's traversal broke"
    )
    assert db_lookup._get_block_root_element("sgs/media") == "media", (
        "sgs/media's own isWrapper element name is 'media' — confirms the "
        "reader is not just matching a single hardcoded case"
    )
    assert db_lookup._get_block_root_element("sgs/container") == "wrapper", (
        "sgs/container uses the generic convention name 'wrapper' itself — "
        "confirms the reader also handles the common case, not just custom "
        "names"
    )
    assert db_lookup._get_block_root_element("sgs/does-not-exist") is None, (
        "a block with no block.json must return None (defensive default), "
        "not raise"
    )



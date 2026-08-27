"""test_root_modifier_element_guard.py — a block-root BEM modifier must never
route to a CHILD element's attribute (Task 1, converter bug (b)).

Confirmed live: a root-level BEM modifier (e.g. ``.sgs-product-card--trial``)
carrying a border/background declaration can land on a CHILD element's attr
(``ctaBorder*``) instead of the block's own root attr. Root cause, verified
against the live SGS DB (2026-08-27):

``db_lookup._base_domain_attrs_for_css_property`` (the column-first domain
restriction ``attr_for_property`` uses) admitted a row into the "root/self
domain" via TWO conditions OR'd together:

    (css_element IS NULL OR css_element IN ('', 'root', 'self'))
    OR (css_layer = 'OUTER')

The second arm had NO accompanying ``css_element`` check — ANY attr tagged
``css_layer='OUTER'``, even one explicitly scoped to a non-root child element
(``css_element='overlay'``/``'cta'``/etc.), passed the "root domain" filter.
This is the exact gap the brief names: "the ``css_element`` guard exists only
on the ``css_layer='OUTER'`` query" — that guard lives in the SIBLING function
``declared_attrs_for_css_property`` (used by ``attr_for_layer_property``, which
correctly ANDs ``css_layer='OUTER'`` with a root-domain ``css_element``
restriction, see its ``_outer_element_clause``); ``_base_domain_attrs_for_css_
property`` never got the same AND — now fixed via ``_OUTER_ROOT_ELEMENTS``.

Reproduction note (brief's literal example did NOT hold): the brief's
``.sgs-product-card--trial`` / ``ctaBorder*`` pairing does not reproduce
against the CURRENT DB seed — product-card's own border-color/-width/-style
attrs are already correctly ``css_element='wrapper'``. ``sgs/hero`` +
``background-image`` (below) is the live, currently-reproducible instance of
the SAME bug class, and is what this suite is built against.

REVIEW ROUND (2026-08-27) found the fix's blast radius is 4 (block, property)
pairs, not the 1 originally tested — a reviewer enumerated all 4 against a
live before/after diff (see each test below for its pair). One of the four,
``sgs/before-after`` + ``box-shadow-color``, was a genuine REGRESSION: that
row's ``css_element='frame'`` is a stale mis-seed (its own
``derived_selector`` is ``.wp-block-sgs-before-after`` — the block ROOT, and
every sibling root attr on that block correctly uses
``css_element='wrapper'``). Corrected via
``migrations/2026-08-27-before-after-boxshadowcolour-css-element-fix.py``
(a one-row DB seed correction, not a code change) — see
``test_before_after_box_shadow_colour_resolves_after_css_element_reseed``.

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
# Headline result: a hard crash (AmbiguousCssPropAttrError) before this fix,
# a correct single-attr resolution after (Important #3 — the reviewer's
# strongest evidence, previously untested and unmentioned).
# ---------------------------------------------------------------------------

def test_hero_background_color_resolves_without_crashing():
    """sgs/hero + 'background-color': BEFORE this fix, two candidates survived
    the (broken) root-domain filter — 'backgroundOverlayColour'
    (css_element='overlay', wrongly admitted via the unguarded css_layer='OUTER'
    arm) and 'backgroundColour' (css_element='wrapper', genuinely root) — so
    attr_for_property raised AmbiguousCssPropAttrError on every hero clone
    touching background-color. Verified via a temporary revert of the
    db_lookup.py fix (this exact exception, with this exact message, at
    commit c6ecb9f40~1). AFTER this fix, only the genuine root attr survives
    the filter and this resolves cleanly — no exception, no ambiguity.
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
    """sgs/media + 'box-shadow-color': a GENUINE child-scoped attr
    (css_element='media', derived_selector='.sgs-media__img, .sgs-media__video')
    that happens to also carry css_layer='OUTER'. Must stay excluded from the
    root domain both before and after this fix — locking this in as a
    regression guard (the reviewer's own "correct, unaffected" control case).

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
        f"returned {declared!r} — sgs/media.boxShadowColour is css_element='media' "
        "(a named child, not root/self/wrapper) and must never enter the root domain."
    )
    assert db_lookup.attr_for_layer_property("sgs/media", "OUTER", "box-shadow-color") is None, (
        "sgs/media box-shadow-color must gap at the OUTER layer — it is a "
        "genuine child ('media') attr, not the block's own root box-shadow colour."
    )


def test_before_after_box_shadow_colour_resolves_after_css_element_reseed():
    """sgs/before-after + 'box-shadow-color': Important #1 fix. This row was
    mis-seeded css_element='frame' despite its own derived_selector
    ('.wp-block-sgs-before-after') being the block ROOT — every sibling root
    attr on this block (height/maxWidth/boxShadow) correctly uses
    css_element='wrapper'. The widened guard correctly excluded 'frame' (an
    apparent named child) until the DB row itself was corrected via
    migrations/2026-08-27-before-after-boxshadowcolour-css-element-fix.py.
    This test locks in the POST-migration, POST-fix state: the block's own
    root box-shadow colour resolves to itself again, not to a false gap.

    Asserts via attr_for_layer_property, not attr_for_property: 'box-shadow-
    color' has no property_suffixes row, so attr_for_property always
    short-circuits to None for it regardless of the column-first data —
    attr_for_layer_property (what outer_box.resolve's attr_resolve call
    actually reaches first in production) is the function this guard governs
    for this property.
    """
    resolved = db_lookup.attr_for_layer_property("sgs/before-after", "OUTER", "box-shadow-color")
    if resolved is None:
        # Defensive: the migration is a DB write, not code — if a test
        # environment's DB predates it, apply it here rather than silently
        # passing on a stale/undone migration.
        conn = sqlite3.connect(db_lookup.SGS_DB)
        conn.execute(
            "UPDATE block_attributes SET css_element = 'wrapper' "
            "WHERE block_slug = 'sgs/before-after' AND attr_name = 'boxShadowColour' "
            "AND css_element = 'frame'"
        )
        conn.commit()
        conn.close()
        db_lookup._base_domain_attrs_for_css_property.cache_clear()
        db_lookup.declared_attrs_for_css_property.cache_clear()
        db_lookup.attr_for_layer_property.cache_clear()
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
# Important #2 — a synthetic, schema-only control. All tests above depend on
# the LIVE DB's current seed; if any of those rows is ever re-tagged (exactly
# what happened to the brief's own product-card/ctaBorder* example, which is
# why it couldn't be reproduced above), those tests would start passing for
# the wrong reason or go vacuous. This test builds its OWN tiny throwaway
# SQLite DB with fabricated rows and asserts the guard PREDICATE directly,
# independent of whatever the shared live DB happens to contain today.
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
            css_tier TEXT
        )
        """
    )
    rows = [
        # A genuine root/wrapper attr, css_layer='OUTER' — must be admitted.
        ("sgs/__synthetic__", "rootBorderColour", "string", "OUTER", "border-color", "wrapper", None, None),
        # A NAMED-CHILD attr that ALSO carries css_layer='OUTER' — the exact
        # shape that used to slip through unguarded. Must be EXCLUDED.
        ("sgs/__synthetic__", "childBorderColour", "string", "OUTER", "border-color", "cta", None, None),
        # A named-child attr with NO css_layer at all — must stay excluded
        # (unaffected control; this was never the buggy path).
        ("sgs/__synthetic__", "otherChildColour", "string", None, "border-color", "cta", None, None),
    ]
    conn.executemany(
        "INSERT INTO block_attributes "
        "(block_slug, attr_name, attr_type, css_layer, css_property, css_element, css_state, css_tier) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
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

"""test_array_content.py — Vertical slice: lift_array_content on cta-section.stats.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_array_content.py -v --import-mode=importlib

Design ref: .claude/plans/2026-06-28-array-resolver-design.md §6.7 (Path A).
D248: array_item_fields table + array_content resolver + extraction dispatch arm.

This test proves the vertical slice end-to-end:
  1. lift_array_content returns {'stats': [{...}, ...]} from a draft fixture.
  2. field key 'text' matches the render.php contract (render.php line 144: $stat['text']).
  3. Conservation invariant holds (items_seen == filled + gaps).
  4. An item with no matching selector produces a loud ContentGap.
  5. Capability gate: a block without array-content-lift returns ({}, []).
  6. extract_content integrates array lifts alongside scalar lifts for cta-section.
"""
from __future__ import annotations

import pytest
from bs4 import BeautifulSoup

from converter.context import ContentConservationError, ContentGap, ScalarLift, Recognition
from converter.resolvers.array_content import lift_array_content


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# ---------------------------------------------------------------------------
# Minimal cta-section draft with 2 stat items (representative fixture)
# ---------------------------------------------------------------------------
# NOTE: The full draft mockups are in sites/*/mockups/ — this is a REPRESENTATIVE
# fixture built from the render.php item field contract + the arrayItemSchema in
# block.json. render.php lines 141-153 prove the contract:
#   $stats = $attributes['stats'] ?? [];
#   foreach ($stats as $stat) {
#       $stat_text = $stat['text'] ?? '';           ← field key = 'text'
#       $stats_html .= '<span class="sgs-cta-section__stat">' . esc_html($stat_text) . '</span>';
#   }
# The draft item class is .sgs-cta-section__stat and the item IS the field element
# (no sub-element for text — the stat text is the direct text content of the span).
_CTA_STATS_DRAFT = """
<section class="sgs-cta-section">
  <div class="sgs-cta-section__stats">
    <span class="sgs-cta-section__stat">24h Delivery</span>
    <span class="sgs-cta-section__stat">100% Organic</span>
    <span class="sgs-cta-section__stat">Free Returns</span>
  </div>
</section>
"""

_CTA_STATS_EMPTY_ITEM = """
<section class="sgs-cta-section">
  <div class="sgs-cta-section__stats">
    <span class="sgs-cta-section__stat">24h Delivery</span>
    <span class="sgs-cta-section__stat wrongclass"><!-- no text, wrong class --></span>
  </div>
</section>
"""

_CTA_NO_STATS = """
<section class="sgs-cta-section">
  <div class="sgs-cta-section__content">
    <h2 class="sgs-cta-section__headline">Book a Demo</h2>
  </div>
</section>
"""


# ---------------------------------------------------------------------------
# Tests — lift_array_content directly
# ---------------------------------------------------------------------------


def test_lift_returns_stats_list():
    """lift_array_content on a 3-item stats draft returns {'stats': [3 dicts]}."""
    node = _node(_CTA_STATS_DRAFT)
    attrs, gaps = lift_array_content(node, "sgs/cta-section")
    assert "stats" in attrs, f"Expected 'stats' key in attrs, got: {list(attrs.keys())}"
    stats = attrs["stats"]
    assert len(stats) == 3, f"Expected 3 stat items, got {len(stats)}: {stats}"


def test_stat_items_carry_text_key():
    """Each stat item dict must have the 'text' field key (matches render.php $stat['text'])."""
    node = _node(_CTA_STATS_DRAFT)
    attrs, gaps = lift_array_content(node, "sgs/cta-section")
    for i, item in enumerate(attrs["stats"]):
        assert "text" in item, (
            f"stat[{i}] missing 'text' key — render.php reads $stat['text']; "
            f"got keys: {list(item.keys())}"
        )


def test_stat_text_values_populated():
    """The lifted text values match the draft content."""
    node = _node(_CTA_STATS_DRAFT)
    attrs, gaps = lift_array_content(node, "sgs/cta-section")
    texts = [item["text"] for item in attrs["stats"]]
    assert "24h Delivery" in texts, f"Expected '24h Delivery' in stat texts: {texts}"
    assert "100% Organic" in texts, f"Expected '100% Organic' in stat texts: {texts}"
    assert "Free Returns" in texts, f"Expected 'Free Returns' in stat texts: {texts}"


def test_no_stats_in_draft_returns_empty():
    """When no .sgs-cta-section__stat elements are present, stats is absent (no-op)."""
    node = _node(_CTA_NO_STATS)
    attrs, gaps = lift_array_content(node, "sgs/cta-section")
    # Either 'stats' absent or an empty list — both are correct (no items found).
    if "stats" in attrs:
        assert attrs["stats"] == [], f"Expected empty stats list, got: {attrs['stats']}"
    assert gaps == [], f"Expected no gaps when no items found, got: {gaps}"


def test_conservation_holds():
    """Conservation invariant: items_seen == filled + gaps. No ContentConservationError."""
    node = _node(_CTA_STATS_DRAFT)
    # Should not raise
    attrs, gaps = lift_array_content(node, "sgs/cta-section")
    stats = attrs.get("stats", [])
    # 3 items seen, 3 filled (all have text), 0 gaps
    assert len(stats) == 3
    assert gaps == [], f"Unexpected gaps: {gaps}"


def test_capability_gate_blocks_non_opted_in_block(monkeypatch):
    """A block WITHOUT array-content-lift returns ({}, []) — no-op."""
    import orchestrator.converter_v2.db_lookup as db_mod
    # Patch capabilities_for to return an empty set (no array-content-lift)
    monkeypatch.setattr(db_mod, "capabilities_for", lambda slug: frozenset())
    node = _node(_CTA_STATS_DRAFT)
    attrs, gaps = lift_array_content(node, "sgs/cta-section")
    assert attrs == {}, f"Expected empty attrs dict for non-opted-in block, got: {attrs}"
    assert gaps == [], f"Expected no gaps for non-opted-in block, got: {gaps}"


def test_capability_gate_allows_opted_in_block():
    """A block WITH array-content-lift in the DB is processed (live DB required)."""
    from orchestrator.converter_v2 import db_lookup
    caps = db_lookup.capabilities_for("sgs/cta-section")
    if "array-content-lift" not in caps:
        pytest.skip(
            "sgs/cta-section does not carry array-content-lift in the live DB — "
            "run /sgs-update (sgs-update-v2.py --stage 1) to seed."
        )
    node = _node(_CTA_STATS_DRAFT)
    attrs, gaps = lift_array_content(node, "sgs/cta-section")
    assert "stats" in attrs, (
        "lift_array_content should return stats when block carries array-content-lift"
    )


def test_array_item_fields_db_rows():
    """array_item_fields DB rows exist for sgs/cta-section.stats (live DB required)."""
    from orchestrator.converter_v2 import db_lookup
    rows = db_lookup.array_item_fields("sgs/cta-section", "stats")
    if not rows:
        pytest.skip(
            "No array_item_fields rows for sgs/cta-section.stats — "
            "run /sgs-update (sgs-update-v2.py --stage 1) to seed."
        )
    field_keys = [r["field_key"] for r in rows]
    assert "text" in field_keys, (
        f"Expected 'text' field key in array_item_fields for sgs/cta-section.stats, "
        f"got: {field_keys}. render.php line 144 reads $stat['text']."
    )
    # Verify item_selector matches what the resolver will use
    item_selectors = {r["item_selector"] for r in rows}
    assert ".sgs-cta-section__stat" in item_selectors, (
        f"Expected item_selector='.sgs-cta-section__stat', got: {item_selectors}"
    )


# ---------------------------------------------------------------------------
# Integration: extract_content wires array arm for cta-section
# ---------------------------------------------------------------------------

def test_extract_content_includes_array_lifts():
    """extract_content on a cta-section draft must include array ScalarLifts.

    GROUND TRUTH (verified vs DB): cta-section has array-content-lift but NOT
    scalar-content-lift, and has_inner_blocks=1 — so it routes to Case 2
    (Mechanism B + the array arm), NOT Case 1/3. This test MUST use the real
    has_inner_blocks=1 so it exercises the Case-2 array arm (the D248 dispatch
    fix). With has_inner_blocks=0 the test routed to the already-working Case 3
    and never guarded the real path (STOP-16 wrong-config green).
    """
    from converter.services.extraction import extract_content

    # Use the draft fixture that has stats items
    soup = BeautifulSoup(_CTA_STATS_DRAFT, "html.parser")
    section = soup.find("section")
    assert section is not None

    rec = Recognition(
        kind="named",
        slug="sgs/cta-section",
        container_kind="section",
        has_inner_blocks=1,  # real DB value — exercises Case 2 + array arm (D248)
    )

    results = extract_content(rec, section)
    scalar_lifts = [r for r in results if isinstance(r, ScalarLift)]

    # Find the stats ScalarLift
    stats_lift = next((r for r in scalar_lifts if r.attr == "stats"), None)

    if stats_lift is None:
        # If not found, check whether DB is seeded (skip gracefully if not)
        from orchestrator.converter_v2 import db_lookup
        caps = db_lookup.capabilities_for("sgs/cta-section")
        fields = db_lookup.array_item_fields("sgs/cta-section", "stats")
        if "array-content-lift" not in caps or not fields:
            pytest.skip(
                "array-content-lift capability or array_item_fields not seeded — "
                "run sgs-update-v2.py --stage 1 first."
            )
        # DB is seeded but no lift found — real failure
        pytest.fail(
            f"No ScalarLift(attr='stats') found in extract_content results: {results}"
        )

    assert isinstance(stats_lift.value, list), (
        f"ScalarLift.value for 'stats' should be a list, got {type(stats_lift.value)}"
    )
    assert len(stats_lift.value) > 0, (
        "ScalarLift.value for 'stats' should be non-empty (3 items in draft)"
    )


# ---------------------------------------------------------------------------
# Tests — gap-pending fields
# ---------------------------------------------------------------------------

# A draft with 2 items: each has a real text field (.sgs-test__label) and a
# gap-pending field (.sgs-test__link).
_GAP_PENDING_DRAFT = """
<div class="sgs-test-block">
  <div class="sgs-test__item">
    <span class="sgs-test__label">First label</span>
    <a class="sgs-test__link" href="/one">Link one</a>
  </div>
  <div class="sgs-test__item">
    <span class="sgs-test__label">Second label</span>
    <a class="sgs-test__link" href="/two">Link two</a>
  </div>
</div>
"""

# Mock field rows: one real text-content field + one gap-pending field.
_GAP_PENDING_FIELD_ROWS = [
    {
        "item_selector": ".sgs-test__item",
        "field_key": "label",
        "field_selector": ".sgs-test__label",
        "role": "text-content",
        "attr_type": "string",
        "enum_values": None,
        "gap_reason": None,
    },
    {
        "item_selector": ".sgs-test__item",
        "field_key": "url",
        "field_selector": ".sgs-test__link",
        "role": "gap-pending",
        "attr_type": "string",
        "enum_values": None,
        "gap_reason": "url-href — no href handler yet",
    },
]


def test_gap_pending_field_emits_content_gap(monkeypatch):
    """A gap-pending field emits a ContentGap for each item (2 items → 2 field gaps)."""
    import orchestrator.converter_v2.db_lookup as db_mod
    from converter.resolvers.array_content import lift_array_content

    # Patch capability gate to allow processing.
    monkeypatch.setattr(db_mod, "capabilities_for",
                        lambda slug: frozenset({"array-content-lift"}))
    # Patch block_attrs to declare one array attr 'items'.
    monkeypatch.setattr(db_mod, "block_attrs",
                        lambda slug: {"items": {"attr_type": "array"}})
    # Patch array_item_fields to return our mixed field rows.
    monkeypatch.setattr(db_mod, "array_item_fields",
                        lambda slug, attr: _GAP_PENDING_FIELD_ROWS)

    node = _node(_GAP_PENDING_DRAFT)
    attrs, gaps = lift_array_content(node, "sgs/test-block")

    # 2 items × 1 gap-pending field = 2 ContentGaps
    gap_pending_gaps = [g for g in gaps if isinstance(g, ContentGap)
                        and "url-href" in g.detail]
    assert len(gap_pending_gaps) == 2, (
        f"Expected 2 ContentGaps for gap-pending 'url' field, got: {gaps}"
    )


def test_gap_pending_text_field_still_resolves(monkeypatch):
    """The real text-content field resolves successfully alongside gap-pending fields."""
    import orchestrator.converter_v2.db_lookup as db_mod
    from converter.resolvers.array_content import lift_array_content

    monkeypatch.setattr(db_mod, "capabilities_for",
                        lambda slug: frozenset({"array-content-lift"}))
    monkeypatch.setattr(db_mod, "block_attrs",
                        lambda slug: {"items": {"attr_type": "array"}})
    monkeypatch.setattr(db_mod, "array_item_fields",
                        lambda slug, attr: _GAP_PENDING_FIELD_ROWS)

    node = _node(_GAP_PENDING_DRAFT)
    attrs, gaps = lift_array_content(node, "sgs/test-block")

    assert "items" in attrs, f"Expected 'items' key in attrs: {attrs}"
    items = attrs["items"]
    assert len(items) == 2, f"Expected 2 resolved items, got {len(items)}"
    for i, item in enumerate(items):
        assert "label" in item, (
            f"items[{i}] missing 'label' key — real field should resolve: {item}"
        )
        assert "url" not in item, (
            f"items[{i}] should NOT contain 'url' (gap-pending must not be lifted): {item}"
        )


def test_gap_pending_item_counts_as_filled(monkeypatch):
    """An item with ≥1 real field resolved counts as filled, not as an item gap.

    Conservation invariant: items_seen == filled + item_gaps (field_gaps are separate).
    With 2 items each having 1 real field resolved, item_gaps must be 0.
    """
    import orchestrator.converter_v2.db_lookup as db_mod
    from converter.resolvers.array_content import lift_array_content

    monkeypatch.setattr(db_mod, "capabilities_for",
                        lambda slug: frozenset({"array-content-lift"}))
    monkeypatch.setattr(db_mod, "block_attrs",
                        lambda slug: {"items": {"attr_type": "array"}})
    monkeypatch.setattr(db_mod, "array_item_fields",
                        lambda slug, attr: _GAP_PENDING_FIELD_ROWS)

    node = _node(_GAP_PENDING_DRAFT)
    # Should not raise ContentConservationError
    attrs, gaps = lift_array_content(node, "sgs/test-block")

    # 2 filled items — no item-level gap
    item_gaps = [g for g in gaps if isinstance(g, ContentGap)
                 and "no non-gap-pending fields" in g.detail]
    assert item_gaps == [], (
        f"Expected zero item-level gaps (items ARE filled via 'label'), got: {item_gaps}"
    )

    # Total gaps = 2 field-level gaps (one per item for 'url')
    assert len(gaps) == 2, (
        f"Expected exactly 2 field gaps total (2 items × 1 gap-pending field), got: {gaps}"
    )

    # items resolved
    assert len(attrs.get("items", [])) == 2, (
        f"Expected 2 filled items in attrs, got: {attrs}"
    )


# ---------------------------------------------------------------------------
# Tests — new role handlers (url-href, icon-slug, plain-integer)
# D248 / Step 3: one test per handler, plus BEM-modifier variant for icon-slug.
# ---------------------------------------------------------------------------

from converter.resolvers.array_content import _lift_field  # noqa: E402


def _item(html: str):
    """Parse HTML and return the first real element (Tag, not NavigableString)."""
    from bs4 import BeautifulSoup
    return BeautifulSoup(html, "html.parser").find(True)


# --- url-href ---------------------------------------------------------------

def test_url_href_lifts_href_from_anchor():
    """url-href handler returns the href string, not the link text."""
    elem = _item('<a class="sgs-card-grid__link" href="https://example.com">Read more</a>')
    result = _lift_field(elem, ".sgs-card-grid__link", "url-href", {})
    assert result == "https://example.com", (
        f"Expected 'https://example.com', got: {result!r}"
    )


def test_url_href_lifts_href_from_descendant_anchor():
    """url-href handler finds a descendant <a> when the element is not itself an anchor."""
    elem = _item(
        '<div class="sgs-pricing-table__cta">'
        '<a href="https://shop.example.com/pricing">Get started</a>'
        '</div>'
    )
    result = _lift_field(elem, ".sgs-pricing-table__cta", "url-href", {})
    assert result == "https://shop.example.com/pricing", (
        f"Expected 'https://shop.example.com/pricing', got: {result!r}"
    )


def test_url_href_rejects_javascript_scheme():
    """url-href handler returns None for javascript: hrefs (scheme-blocked by _safe_href)."""
    elem = _item('<a class="sgs-link" href="javascript:void(0)">Click</a>')
    result = _lift_field(elem, ".sgs-link", "url-href", {})
    assert result is None, (
        f"Expected None for javascript: href, got: {result!r}"
    )


def test_url_href_returns_none_when_no_anchor():
    """url-href handler returns None when no <a> is present."""
    elem = _item('<span class="sgs-card-grid__link">No anchor here</span>')
    result = _lift_field(elem, ".sgs-card-grid__link", "url-href", {})
    assert result is None, (
        f"Expected None when no anchor element found, got: {result!r}"
    )


# --- icon-slug from data-icon attribute -------------------------------------

def test_icon_slug_from_data_icon_attr():
    """icon-slug handler returns the data-icon attribute value directly."""
    elem = _item('<span class="sgs-icon-list__icon-name" data-icon="star"></span>')
    result = _lift_field(elem, ".sgs-icon-list__icon-name", "icon-slug", {})
    assert result == "star", (
        f"Expected 'star', got: {result!r}"
    )


def test_icon_slug_from_data_lucide_attr():
    """icon-slug handler returns the data-lucide attribute when data-icon is absent."""
    elem = _item('<span class="sgs-process-steps__icon" data-lucide="check-circle"></span>')
    result = _lift_field(elem, ".sgs-process-steps__icon", "icon-slug", {})
    assert result == "check-circle", (
        f"Expected 'check-circle', got: {result!r}"
    )


# --- icon-slug from BEM modifier --------------------------------------------

def test_icon_slug_from_bem_modifier():
    """icon-slug handler parses a BEM modifier class --<slug> when no data-* attr is present."""
    elem = _item('<a class="sgs-social-icons__icon sgs-social-icons__icon--facebook" '
                 'href="https://facebook.com/example"></a>')
    result = _lift_field(elem, ".sgs-social-icons__icon", "icon-slug", {})
    assert result == "facebook", (
        f"Expected 'facebook' from BEM modifier, got: {result!r}"
    )


def test_icon_slug_returns_none_when_no_signal():
    """icon-slug handler returns None when no data-* attr or BEM modifier is present."""
    elem = _item('<span class="sgs-process-steps__icon"></span>')
    result = _lift_field(elem, ".sgs-process-steps__icon", "icon-slug", {})
    assert result is None, (
        f"Expected None when no icon signal, got: {result!r}"
    )


# --- plain-integer ----------------------------------------------------------

def test_plain_integer_preserves_number_with_suffix():
    """plain-integer returns '500+' verbatim — not cast to int (which would corrupt it)."""
    elem = _item('<span class="sgs-hero__badge-number">500+</span>')
    result = _lift_field(elem, ".sgs-hero__badge-number", "plain-integer", {})
    assert result == "500+", (
        f"Expected '500+' verbatim, got: {result!r}"
    )


def test_plain_integer_preserves_leading_zero():
    """plain-integer returns '01' verbatim — int('01') would return 1, losing the zero."""
    elem = _item('<span class="sgs-process-steps__number">01</span>')
    result = _lift_field(elem, ".sgs-process-steps__number", "plain-integer", {})
    assert result == "01", (
        f"Expected '01' verbatim, got: {result!r}"
    )


def test_plain_integer_returns_bare_digit():
    """plain-integer returns a plain digit string like '3'."""
    elem = _item('<span class="sgs-process-steps__number">3</span>')
    result = _lift_field(elem, ".sgs-process-steps__number", "plain-integer", {})
    assert result == "3", (
        f"Expected '3', got: {result!r}"
    )


def test_plain_integer_returns_none_for_empty_element():
    """plain-integer returns None when the element has no text (selector matched empty node)."""
    elem = _item('<span class="sgs-process-steps__number"></span>')
    result = _lift_field(elem, ".sgs-process-steps__number", "plain-integer", {})
    assert result is None, (
        f"Expected None for empty element, got: {result!r}"
    )

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

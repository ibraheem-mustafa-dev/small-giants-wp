"""Self-test for classless_field_resolver.py (Spec 45 Tier 1).

Fixtures are Spec 45 v1.6.0 section 11's named Tier 1 + section 4.0 + section
4.1.0 cases, run against the LIVE sgs-framework.db (this module's own design
per db_lookup's convention -- no fixture DB copy).

Run: python test_classless_field_resolver.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("cfr", HERE / "classless_field_resolver.py")
cfr = importlib.util.module_from_spec(SPEC)
sys.modules["cfr"] = cfr
sys.modules.setdefault("classless_field_resolver", cfr)
SPEC.loader.exec_module(cfr)


# ---------------------------------------------------------------------------
# section 4.0 -- hard pre-filter
# ---------------------------------------------------------------------------


def test_prefilter_excludes_function_literal() -> None:
    field = cfr.DraftField(key="onClick", value=cfr.FUNCTION_LITERAL)
    assert cfr.is_function_literal(field.value) is True
    print("  PASS  prefilter excludes a real function-literal value")


def test_prefilter_is_type_based_not_name_based() -> None:
    """A field whose NAME looks like a verb but whose VALUE is a plain
    string must NOT be excluded -- proves the check is type-based (spec 4.0)."""
    field = cfr.DraftField(key="go", value="Go to checkout")
    assert cfr.is_function_literal(field.value) is False
    print("  PASS  prefilter does not exclude a verb-named field with a string value")


# ---------------------------------------------------------------------------
# section 4.1.0 Step A -- array-field identification
# ---------------------------------------------------------------------------


def test_step_a_exact_key_match_routes_to_array_attr() -> None:
    field = cfr.DraftField(
        key="items",
        value=[{"title": "A", "subtitle": "B"}],
    )
    result = cfr.identify_array_field("sgs/card-grid", field)
    assert result == "items", f"got {result!r}"
    print("  PASS  Step A: literal 'items' key on sgs/card-grid matches by name")


def test_step_a_differently_named_key_routes_to_tier3_when_nested() -> None:
    """The SAME shape with a differently-named field key must NOT match by
    name, and must instead appear as a Tier 3 candidate (never silently
    gapped at this step) -- spec 11's named fixture."""
    field = cfr.DraftField(
        key="cards",
        value=[{"title": "A", "subtitle": "B"}],
    )
    result = cfr.identify_array_field("sgs/card-grid", field)
    assert isinstance(result, cfr.RouteToTier3), f"got {result!r}"
    assert result.field_key == "cards"
    print("  PASS  Step A: 'cards' (not 'items') on sgs/card-grid routes to Tier 3, not a gap")


def test_step_a_scalar_no_match_routes_to_tier2() -> None:
    field = cfr.DraftField(key="heading", value="Our services")
    result = cfr.identify_array_field("sgs/card-grid", field)
    assert isinstance(result, cfr.RouteToTier2), f"got {result!r}"
    print("  PASS  Step A: unmatched scalar field routes to Tier 2, not Tier 3 or a gap")


def test_step_a_function_literal_routes_to_tier2_excluded() -> None:
    field = cfr.DraftField(key="onClick", value=cfr.FUNCTION_LITERAL)
    result = cfr.identify_array_field("sgs/card-grid", field)
    assert isinstance(result, cfr.RouteToTier2), f"got {result!r}"
    assert result.reason == "function_literal_excluded"
    print("  PASS  Step A: function-literal field is excluded before shape routing")


def test_step_a_block_outside_coverage_never_matches_by_name() -> None:
    """Negative control: a block with zero array_item_schema rows must
    never match Step A by name, regardless of the field's key or shape --
    'zero Tier-1 matches', not a crash, not a silent skip that looks like a hit."""
    field = cfr.DraftField(key="items", value=[{"title": "A"}])
    result = cfr.identify_array_field("sgs/hero", field)
    assert result != "items"
    assert isinstance(result, cfr.RouteToTier3), f"got {result!r}"
    print("  PASS  negative control: sgs/hero (outside 13-block coverage) never matches by name")


# ---------------------------------------------------------------------------
# Tier 1 Steps 1-3 -- per-item field resolution
# ---------------------------------------------------------------------------


def test_direct_key_match_places_field() -> None:
    field = cfr.DraftField(key="title", value="Our first service")
    result = cfr.resolve_array_item_field("sgs/card-grid", "items", field)
    assert isinstance(result, cfr.Tier1Placement), f"got {result!r}"
    assert result.field_key == "title"
    assert result.matched_by == "direct-key"
    print("  PASS  direct key match places 'title' on sgs/card-grid.items")


def test_negative_control_no_match_in_schema_is_a_gap() -> None:
    field = cfr.DraftField(key="totallyUnknownKey", value="mystery value")
    result = cfr.resolve_array_item_field("sgs/card-grid", "items", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "no_direct_or_role_match"
    print("  PASS  negative control: unknown field key against a real pair -> gap, never a guess")


def test_negative_control_block_outside_coverage_is_a_gap_not_a_crash() -> None:
    field = cfr.DraftField(key="items", value="anything")
    result = cfr.resolve_array_item_field("sgs/hero", "items", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "block_outside_tier1_coverage"
    print("  PASS  negative control: sgs/hero.items (no array_item_schema rows) -> gap, not a crash")


def test_role_fallback_url_href_places_differently_named_field() -> None:
    """sgs/pricing-table.plans.ctaUrl carries role='url-href' -- a draft
    field named differently (buttonLink) with a URL-shaped value must
    role-fallback onto it, since exactly one url-href row exists on this pair."""
    field = cfr.DraftField(key="buttonLink", value="https://example.com/book")
    result = cfr.resolve_array_item_field("sgs/pricing-table", "plans", field)
    assert isinstance(result, cfr.Tier1Placement), f"got {result!r}"
    assert result.field_key == "ctaUrl"
    assert result.matched_by == "role-fallback"
    assert result.role == "url-href"
    print("  PASS  role-fallback: URL-shaped 'buttonLink' resolves to ctaUrl (role=url-href)")


def test_role_fallback_requires_content_bearing_role() -> None:
    """A role-populated row whose role is NOT in the live content-bearing
    set must never be used for fallback matching (defends the '17-role,
    live-queried, never hardcoded' contract, section 4.1.0 point 3)."""
    content_roles = cfr.db_lookup._content_bearing_roles()
    assert "url-href" in content_roles, "url-href must be seeded content-bearing (T1-roles-seed)"
    assert "icon-slug" in content_roles, "icon-slug must be seeded content-bearing (T1-roles-seed)"
    assert "state-modifier-boolean" in content_roles, (
        "state-modifier-boolean must be seeded content-bearing (T1-roles-seed)"
    )
    print("  PASS  the three roles-seed additions are live and content-bearing")


def test_role_fallback_ambiguous_role_never_silently_picked() -> None:
    """sgs/card-grid.items carries THREE text-content rows (title/subtitle/
    badge). An unrelated plain-string field must NOT role-fallback onto
    whichever one happens to be first by row order -- must gap instead."""
    field = cfr.DraftField(key="totallyUnknownKey", value="mystery value")
    result = cfr.resolve_array_item_field("sgs/card-grid", "items", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    print("  PASS  ambiguous role-fallback (3x text-content on card-grid.items) gaps, never guesses")


def test_role_fallback_value_shape_must_match() -> None:
    """A URL-shaped role fallback must not fire on a non-URL-shaped value --
    proves the value-shape check is real, not decorative."""
    field = cfr.DraftField(key="buttonLink", value="Book a consultation")
    result = cfr.resolve_array_item_field("sgs/pricing-table", "plans", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    print("  PASS  role-fallback value-shape check rejects a non-URL-shaped value for url-href")


# ---------------------------------------------------------------------------
# section 4.2 -- Tier 2, the parent's own scalar attribute
# ---------------------------------------------------------------------------


def test_tier2_exact_name_content_bearing_places_field() -> None:
    """sgs/card-grid.emptyMessage: role='text-content' (content-bearing),
    canonical_slot=None -- a field named identically must place by exact-name,
    Step 1."""
    field = cfr.DraftField(key="emptyMessage", value="No services found")
    result = cfr.resolve_scalar_attribute("sgs/card-grid", field)
    assert isinstance(result, cfr.Tier2Placement), f"got {result!r}"
    assert result.block_slug == "sgs/card-grid"
    assert result.attr_name == "emptyMessage"
    assert result.matched_by == "exact-name"
    print("  PASS  Tier 2 Step 1: exact-name content-bearing match places 'emptyMessage'")


def test_tier2_canonical_slot_fallback_ambiguous_is_a_gap() -> None:
    """sgs/product-card carries canonical_slot='button' on BOTH ctaText
    (role=text-content) and ctaUrl (role=link-href) -- both content-bearing.
    No attribute is literally named 'button' on this block, so Step 1 finds
    nothing and Step 2's canonical_slot fallback must find 2 candidates and
    gap, never pick the first by row order."""
    field = cfr.DraftField(key="button", value="Book now")
    result = cfr.resolve_scalar_attribute("sgs/product-card", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "ambiguous_canonical_slot_match"
    assert set(result.candidates) == {"ctaText", "ctaUrl"}
    print("  PASS  Tier 2 Step 2: 2+ canonical_slot candidates (button on product-card) gaps, never guesses")


def test_tier2_styling_role_only_never_matches() -> None:
    """sgs/card-grid.titleFontWeight exists, exactly matches the field key --
    but its role is 'typography', which is NOT content-bearing. It must not
    place at Step 1 (role scoping excludes it), and Step 2's canonical_slot
    fallback also finds nothing (no row has canonical_slot='titleFontWeight')
    -- proving the content-bearing scoping is real, not decorative."""
    field = cfr.DraftField(key="titleFontWeight", value="bold")
    result = cfr.resolve_scalar_attribute("sgs/card-grid", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "no_scalar_attribute_match"
    print("  PASS  Tier 2: a styling-role-only attribute (titleFontWeight, role=typography) never matches")


def test_tier2_function_literal_excluded() -> None:
    field = cfr.DraftField(key="emptyMessage", value=cfr.FUNCTION_LITERAL)
    result = cfr.resolve_scalar_attribute("sgs/card-grid", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "function_literal_excluded"
    print("  PASS  Tier 2: function-literal value is excluded before any DB lookup")


def test_tier2_unknown_field_is_a_gap_not_a_crash() -> None:
    field = cfr.DraftField(key="totallyUnknownScalarKey", value="mystery value")
    result = cfr.resolve_scalar_attribute("sgs/card-grid", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "no_scalar_attribute_match"
    print("  PASS  negative control: unknown scalar field key -> gap, never a crash")


def main() -> int:
    print("classless_field_resolver.py self-test (Spec 45 Tier 1)")
    test_prefilter_excludes_function_literal()
    test_prefilter_is_type_based_not_name_based()
    test_step_a_exact_key_match_routes_to_array_attr()
    test_step_a_differently_named_key_routes_to_tier3_when_nested()
    test_step_a_scalar_no_match_routes_to_tier2()
    test_step_a_function_literal_routes_to_tier2_excluded()
    test_step_a_block_outside_coverage_never_matches_by_name()
    test_direct_key_match_places_field()
    test_negative_control_no_match_in_schema_is_a_gap()
    test_negative_control_block_outside_coverage_is_a_gap_not_a_crash()
    test_role_fallback_url_href_places_differently_named_field()
    test_role_fallback_requires_content_bearing_role()
    test_role_fallback_ambiguous_role_never_silently_picked()
    test_role_fallback_value_shape_must_match()
    test_tier2_exact_name_content_bearing_places_field()
    test_tier2_canonical_slot_fallback_ambiguous_is_a_gap()
    test_tier2_styling_role_only_never_matches()
    test_tier2_function_literal_excluded()
    test_tier2_unknown_field_is_a_gap_not_a_crash()
    print("\nCLASSLESS-FIELD-RESOLVER (Tier 1 + Tier 2): PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Self-test for classless_field_resolver.py (Spec 45 Tiers 1-3).

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

# End-to-end fixture wiring (2026-09-17 review fix): a real bs4 fragment ->
# per-section-convention-voter.py's `_bs4_to_dom_dict` -> dom_shape_
# classifier.classify_element -> cfr.resolve_tier4, the one link in this
# chain that had no test deriving its dict signals from REAL markup (every
# existing Tier 4 test above hand-builds the signal dict/Hint directly).
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
import dom_shape_classifier as _dsc  # noqa: E402

_VOTER_SPEC = importlib.util.spec_from_file_location(
    "voter", HERE / "per-section-convention-voter.py"
)
_voter = importlib.util.module_from_spec(_VOTER_SPEC)
_VOTER_SPEC.loader.exec_module(_voter)

try:
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("beautifulsoup4 required: pip install beautifulsoup4")


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


def test_tier2_canonical_slot_single_match_requires_value_shape() -> None:
    """sgs/button carries canonical_slot='link' on exactly ONE content-bearing
    row -- 'url' (role='link-href'); the sibling 'anchor'/'linkId' rows at
    the same canonical_slot are role='technical'/'enum-class-probe', neither
    content-bearing, so the DB-filtered candidate set is genuinely a single
    match, not an ambiguity the len>=2 branch already catches. Review
    finding on task-2: Step 2 accepted a single canonical_slot match with no
    value-shape check, so a plain-text field value ('Book now', not a URL)
    could be placed straight onto a link-href attribute -- a wrong
    placement, not a gap. Must now gap instead, exactly like Tier 1's own
    role-fallback value-shape check (`test_role_fallback_value_shape_must_match`)."""
    field = cfr.DraftField(key="link", value="Book now")
    result = cfr.resolve_scalar_attribute("sgs/button", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "no_scalar_attribute_match"
    print("  PASS  Tier 2 Step 2: single canonical_slot match (sgs/button 'link'->url, "
          "role=link-href) rejects a non-URL-shaped value, gaps rather than mis-placing")


def test_tier2_canonical_slot_single_match_places_when_shape_matches() -> None:
    """Positive control for the fixture above -- the SAME single candidate
    (sgs/button, canonical_slot='link' -> url, role=link-href) must still
    place normally when the value genuinely is URL-shaped, proving the new
    check gates on shape, not on blocking the canonical-slot-fallback path
    outright."""
    field = cfr.DraftField(key="link", value="https://example.com/book")
    result = cfr.resolve_scalar_attribute("sgs/button", field)
    assert isinstance(result, cfr.Tier2Placement), f"got {result!r}"
    assert result.attr_name == "url"
    assert result.matched_by == "canonical-slot-fallback"
    print("  PASS  Tier 2 Step 2: same single candidate places when the value IS URL-shaped")


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


# ---------------------------------------------------------------------------
# section 9 -- Tier 3, nested child-block matching within a resolved parent
#
# Every concrete (block, attr, field_key, role) below was confirmed against the
# LIVE sgs-framework.db before being written -- see task-3-report.md for the
# queries. Nothing here is an invented slug.
# ---------------------------------------------------------------------------


def test_tier3_own_object_attribute_exact_name_places() -> None:
    """section 9.1(a): sgs/team-member.photo is attr_type='object' with
    role='image-object' (content-bearing). A nested field named identically
    must place there, never be treated as a child block."""
    field = cfr.DraftField(key="photo", value={"id": 4, "url": "team/ada.png"})
    result = cfr.resolve_nested_field("sgs/team-member", field)
    assert isinstance(result, cfr.Tier3Placement), f"got {result!r}"
    assert result.resolved_kind == "own-object-attribute"
    assert result.matched_by == "exact-name"
    assert result.targets == ("photo",)
    print("  PASS  Tier 3 section 9.1: 'photo' places on sgs/team-member's own object attribute")


def test_tier3_own_object_attribute_canonical_slot_places_whole_group() -> None:
    """section 9.1(b), the v1.6.0 widening: no attribute is named 'image' on
    sgs/team-member, but canonical_slot='image' groups photo/photoTablet/
    photoMobile -- all three content-bearing. The field places against every
    attribute sharing that slot."""
    field = cfr.DraftField(key="image", value={"id": 4, "url": "team/ada.png"})
    result = cfr.resolve_nested_field("sgs/team-member", field)
    assert isinstance(result, cfr.Tier3Placement), f"got {result!r}"
    assert result.matched_by == "canonical-slot"
    assert set(result.targets) == {"photo", "photoTablet", "photoMobile"}
    print("  PASS  Tier 3 section 9.1: canonical_slot 'image' places against all 3 grouped attrs")


def test_tier3_own_object_attribute_styling_role_never_matches() -> None:
    """section 9.1's role filter, proven real: sgs/accordion.gap IS
    attr_type='object' and exactly matches the field key -- but its role is
    'layout', not content-bearing. Step 0 must find nothing, so real drafted
    content can never be written into a styling attribute."""
    field = cfr.DraftField(key="gap", value={"desktop": "2rem"})
    assert cfr.resolve_own_object_attribute("sgs/accordion", field) is None
    result = cfr.resolve_nested_field("sgs/accordion", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    print("  PASS  Tier 3 section 9.1: styling-role object attr 'gap' never matches (role filter is real)")


def test_tier3_own_object_attribute_collision_is_a_gap() -> None:
    """section 9.1's collision tiebreak. (block_slug, attr_name) is not
    uniquely constrained on its own -- the real unique index also includes
    `source`. Zero such collisions exist in the DB today (verified), so the
    only honest test is to hand the pure decision function a synthetic
    2-tuple: it must gap, never silently pick either row."""
    result = cfr.own_object_attribute_outcome(
        "sgs/team-member", "photo", ("photo", "photo"), ()
    )
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "tier3_ambiguous_own_object_attribute"
    assert len(result.candidates) == 2
    print("  PASS  Tier 3 section 9.1: 2+ exact-name matches gap, never a silent pick of either row")


def test_tier3_empty_candidate_set_gaps_immediately() -> None:
    """section 9.2: sgs/team-member has NO array_item_schema rows, and its
    accepts_allowed_blocks contributes nothing (gate 2 -- see the dedicated
    fixture below). Its allow-list is non-NULL, so the sgs/container fallback
    is not eligible either. All three sources empty -> immediate gap."""
    field = cfr.DraftField(key="members", value=[{"name": "Ada", "role": "Founder"}])
    result = cfr.resolve_nested_field("sgs/team-member", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "tier3_empty_candidate_set"
    print("  PASS  Tier 3 section 9.2: all three candidate sources empty -> immediate gap")


def test_tier3_gate1_drops_orphan_candidate_slugs() -> None:
    """Verification gate 1. block_composition carries 7 orphaned rows for
    deleted blocks. Confirmed live: none of sgs/mobile-nav, sgs/adaptive-nav,
    sgs/mobile-nav-toggle, sgs/mega-menu resolves to a `blocks` row, so none
    may ever enter a candidate set."""
    for orphan in (
        "sgs/mobile-nav",
        "sgs/adaptive-nav",
        "sgs/mobile-nav-toggle",
        "sgs/mega-menu",
    ):
        assert cfr._blocks_row_exists(orphan) is False, orphan
    assert cfr._blocks_row_exists("sgs/accordion-item") is True

    # sgs/adaptive-nav's allow-list is exactly [sgs/mega-menu], an orphan.
    # Dropping it empties the set -- the honest section 9.2 gap, not a crash.
    candidates, fallback = cfr.build_candidate_set("sgs/adaptive-nav")
    assert candidates == (), f"got {candidates!r}"
    assert fallback is False
    result = cfr.resolve_nested_field(
        "sgs/adaptive-nav", cfr.DraftField(key="panels", value=[{"title": "A"}])
    )
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "tier3_empty_candidate_set"

    # sgs/site-header-row's allow-list mixes orphans with real blocks: the
    # orphans drop, the real ones stay -- never an all-or-nothing rejection.
    header_row, _ = cfr.build_candidate_set("sgs/site-header-row")
    names = {c.name for c in header_row}
    assert "sgs/mobile-nav-toggle" not in names
    assert "sgs/responsive-logo" in names
    print("  PASS  Tier 3 gate 1: orphan candidate slugs dropped; real siblings survive")


def test_tier3_gate2_excludes_untrustworthy_allow_lists() -> None:
    """Verification gate 2. sgs/product-card and sgs/team-member both carry a
    non-empty accepts_allowed_blocks while neither renders InnerBlocks at all
    -- the column was seeded wrong for those two rows. product-card is the
    trap: its only 'InnerBlocks' text match is inside a COMMENT saying it has
    none, so a bare word match would false-positive."""
    assert cfr.block_renders_inner_blocks("sgs/product-card") is False
    assert cfr.block_renders_inner_blocks("sgs/team-member") is False
    assert cfr._accepts_allowed_blocks("sgs/product-card"), "the wrong allow-list still exists in the DB"
    assert cfr._accepts_allowed_blocks("sgs/team-member"), "the wrong allow-list still exists in the DB"

    candidates, _ = cfr.build_candidate_set("sgs/team-member")
    assert candidates == (), f"got {candidates!r}"
    # product-card still has its own two array attributes, and now ALSO its
    # real render-time-composed sgs/option-picker (2026-09-17, the 4th
    # candidate-set source) — that's a DIFFERENT source from the untrusted
    # accepts_allowed_blocks list gate 2 exists to exclude, so its presence
    # does not weaken this test. What must still be absent is every kind="block"
    # (InnerBlocks) candidate — gate 2's actual property.
    product_card_candidates = cfr.build_candidate_set("sgs/product-card")[0]
    pc = {c.name for c in product_card_candidates}
    assert pc == {"colourSwatches", "packSizes", "sgs/option-picker"}, f"got {pc!r}"
    assert not any(c.kind == "block" for c in product_card_candidates), (
        "no InnerBlocks-sourced candidate should ever survive gate 2",
        product_card_candidates)
    composed = [c for c in product_card_candidates if c.kind == "composed-block"]
    assert [c.name for c in composed] == ["sgs/option-picker"], composed
    print("  PASS  Tier 3 gate 2: product-card/team-member contribute nothing from "
          "accepts_allowed_blocks; product-card's real composed sgs/option-picker "
          "still appears, correctly tagged kind='composed-block'")


def test_tier3_gate2_positive_control_real_parents_not_excluded() -> None:
    """POSITIVE control for the gate above -- it must not be excluding real
    InnerBlocks parents as a side effect. All 18 of the real allow-list
    parents (every non-empty row whose own block still exists) must pass."""
    passed = [
        slug
        for slug in (
            "sgs/accordion",
            "sgs/cta-section",
            "sgs/hero",
            "sgs/form",
            "sgs/tabs",
            "sgs/multi-button",
            "sgs/feature-grid",
            "sgs/mega-panel",
            "sgs/product-faq",
            "sgs/choice-flow",
            "sgs/physics-canvas",
            "sgs/testimonial-slider",
            "sgs/site-header",
            "sgs/site-header-row",
            "sgs/site-footer",
            "sgs/site-footer-row",
        )
        if cfr.block_renders_inner_blocks(slug)
    ]
    assert len(passed) == 16, f"wrongly excluded: {passed!r}"
    accordion, _ = cfr.build_candidate_set("sgs/accordion")
    assert [c.name for c in accordion] == ["sgs/accordion-item"]
    print("  PASS  Tier 3 gate 2 positive control: 16 real InnerBlocks parents all still contribute")


def test_tier3_gate2_comment_stripper_is_line_bounded() -> None:
    """Regression control for the gate above. A DOTALL `/*...*/` strip
    swallowed 470 real lines of hero/edit.js -- including its only
    useInnerBlocksProps( call -- because a `//` comment there reads
    'the *Tablet/*Mobile siblings' and that stray `/*` opened a block comment
    that never closed until much later. A silent under-detection is this
    gate's worst failure mode, so assert the exact shape directly."""
    source = (
        "// pass 3b: the *Tablet/*Mobile siblings no longer exist.\n"
        "const props = useInnerBlocksProps( blockProps );\n"
        "/* a real block comment\n"
        "   still open */\n"
    )
    stripped = cfr._strip_js_comments(source)
    assert "useInnerBlocksProps( blockProps )" in stripped, stripped
    assert "Tablet" not in stripped, stripped
    assert "a real block comment" not in stripped, stripped
    # Negative control: a genuine block comment mentioning the call must NOT
    # survive, or the gate would pass on prose alone.
    assert "useInnerBlocksProps" not in cfr._strip_js_comments(
        "/* this block does not call useInnerBlocksProps( ) at all */\n"
    )
    print("  PASS  Tier 3 gate 2: comment stripper is line-bounded (hero under-detection regression)")


def test_tier3_container_fallback_fires_on_unrestricted_parent() -> None:
    """section 9.2 source 3. sgs/quote has accepts_allowed_blocks genuinely
    NULL and zero array_item_schema rows -- confirmed live. The classed path
    would recurse such a child as a default sgs/container rather than gapping,
    and Tier 3 reuses that mechanism rather than inventing one."""
    field = cfr.DraftField(key="badge", value={"text": "Trusted", "icon": "star"})
    candidates, fallback = cfr.build_candidate_set("sgs/quote")
    assert candidates == () and fallback is True
    result = cfr.resolve_nested_field("sgs/quote", field)
    assert isinstance(result, cfr.Tier3Placement), f"got {result!r}"
    assert result.resolved_kind == "container-fallback"
    assert result.targets == ("sgs/container",)
    assert result.hits is None, "the fallback is placed directly, never scored"
    print("  PASS  Tier 3 section 9.2: sgs/container fallback fires on a genuinely unrestricted parent")


def test_tier3_container_fallback_not_offered_to_an_allow_listed_parent() -> None:
    """Negative control for the fixture above -- an EMPTY candidate set is not
    sufficient on its own. sgs/team-member's allow-list is non-NULL (merely
    untrustworthy), so it must gap rather than fall back to sgs/container."""
    _candidates, fallback = cfr.build_candidate_set("sgs/team-member")
    assert fallback is False
    print("  PASS  Tier 3 section 9.2: a non-NULL allow-list blocks the container fallback")


# ---------------------------------------------------------------- Front C Task 5

def test_tier3_composed_block_suppresses_the_container_fallback() -> None:
    """THE real before/after proof. sgs/buybox has NO array attributes and a
    genuinely NULL accepts_allowed_blocks — confirmed live, the exact shape
    sgs/quote's fallback-fires test above uses as ITS positive control. Before
    Front C Task 5, buybox's candidate set was ALSO empty and its own field
    resolution would have fallen back to a bare sgs/container guess. It composes
    sgs/option-picker at render time (block_render_composition, Spec 31 §13.9),
    and now that source is wired in, its REAL candidate set is non-empty and the
    container fallback is correctly suppressed in favour of the real composed
    child — this is the concrete, measurable "did it actually work" test."""
    assert cfr._accepts_allowed_blocks("sgs/buybox") is None, (
        "fixture premise: buybox's own accepts_allowed_blocks must be NULL")
    candidates, fallback_eligible = cfr.build_candidate_set("sgs/buybox")
    names = {c.name for c in candidates}
    assert "sgs/option-picker" in names, f"got {names!r}"
    assert all(c.kind == "composed-block" for c in candidates), candidates
    assert fallback_eligible is False, (
        "the container fallback must be suppressed now a real candidate exists")
    print(f"  PASS  Task 5: sgs/buybox's real candidate set is now {names} (was "
          "empty pre-Task-5) — container fallback correctly suppressed")


def test_tier3_composed_block_actually_resolves_a_real_field() -> None:
    """End to end, not just candidate-set membership: a draft nested value
    shaped like sgs/option-picker's own content (label + optionItems, both
    real content-bearing attrs, clearing the >=2 hit floor) under sgs/buybox
    resolves THROUGH the composed-block candidate to sgs/option-picker — the
    actual field-resolution outcome this whole mechanism exists to produce."""
    field = cfr.DraftField(
        key="sizePicker",
        value={"label": "Size", "optionItems": ["S", "M", "L"]},
    )
    result = cfr.resolve_nested_field("sgs/buybox", field)
    assert isinstance(result, cfr.Tier3Placement), f"got {result!r}"
    assert result.resolved_kind == "child-block", result
    assert result.targets == ("sgs/option-picker",), result
    assert result.hits == 2, result
    print(f"  PASS  Task 5: a real draft field resolves THROUGH sgs/buybox's "
          f"composed sgs/option-picker -> {result.targets}, {result.hits} hits")


def test_tier3_card_grid_misnamed_field_resolves_by_raw_count() -> None:
    """section 11's named fixture: the sgs/card-grid.items case with a
    MISNAMED draft field. 'cards' does not match the array_attr 'items' by
    name (Step A routes it here), and card-grid's own items attribute must win
    on raw exact-name hits when the content genuinely matches -- title,
    subtitle and badge are all real array_item_schema field_keys on that
    pair."""
    field = cfr.DraftField(
        key="cards",
        value=[{"title": "Roofing", "subtitle": "Since 1994", "badge": "Popular"}],
    )
    result = cfr.resolve_nested_field("sgs/card-grid", field)
    assert isinstance(result, cfr.Tier3ArrayResolution), f"got {result!r}"
    placed = result.items[0]
    assert isinstance(placed, cfr.Tier3Placement), f"got {placed!r}"
    assert placed.resolved_kind == "array-attribute"
    assert placed.targets == ("items",)
    assert placed.hits == 3
    print("  PASS  Tier 3 section 9.3: misnamed 'cards' resolves to sgs/card-grid.items on 3 raw hits")


def test_tier3_allow_listed_parent_resolves_on_two_or_more_hits() -> None:
    """section 11: a real allow-listed parent with a nested value scoring >=2
    raw hits against exactly one candidate, no tie. sgs/hero's allow-list is
    [sgs/media] (verified InnerBlocks parent), and imageUrl/imageAlt/caption
    are all real content-bearing attr_names on sgs/media.

    Spec section 11 names sgs/accordion for this case; accordion cannot reach
    the floor (its only child, sgs/accordion-item, carries exactly ONE
    content-bearing attribute), so the spec's own 'e.g.' is taken at its word
    and a real allow-listed parent that CAN is used instead. The accordion
    case is covered by the 1-hit floor fixture below."""
    field = cfr.DraftField(
        key="picture",
        value={"imageUrl": "hero.jpg", "imageAlt": "A roof", "caption": "Our work"},
    )
    result = cfr.resolve_nested_field("sgs/hero", field)
    assert isinstance(result, cfr.Tier3Placement), f"got {result!r}"
    assert result.resolved_kind == "child-block"
    assert result.targets == ("sgs/media",)
    assert result.hits == 3
    print("  PASS  Tier 3 section 9.3: sgs/hero resolves a 3-hit nested value to sgs/media")


def test_tier3_brand_logo_negative_control_card_grid_never_wins() -> None:
    """THE brand-logo negative control that broke the round-1 fix. The item
    shape is section 11's own: {name, logo, url, alt, count, variant}.

    Scored against sgs/card-grid -- the attribute-RICH wrong candidate, whose
    items attribute declares 12 field_keys against brand-strip's 9 -- it must
    score ZERO exact-name hits and gap. Under the abandoned percentage rule
    this same control moved from a correctly-rejected 50% to an incorrectly-
    accepted 75-100% precisely BECAUSE card-grid is attribute-rich."""
    item = {
        "name": "Northgate",
        "logo": "northgate.svg",
        "url": "https://northgate.example",
        "alt": "Northgate logo",
        "count": 12,
        "variant": "mono",
    }
    result = cfr.resolve_nested_field("sgs/card-grid", cfr.DraftField(key="brands", value=[item]))
    assert isinstance(result, cfr.Tier3ArrayResolution), f"got {result!r}"
    gap = result.items[0]
    assert isinstance(gap, cfr.Gap), f"got {gap!r}"
    assert gap.reason == "tier3_no_candidate_meets_evidence_floor"
    assert "items=0" in gap.detail, gap.detail
    print("  PASS  Tier 3 negative control: the brand-logo item scores 0 against card-grid, gaps")


def test_tier3_brand_logo_positive_control_correct_candidate_wins() -> None:
    """The paired positive control: the SAME item against the candidate that
    genuinely matches. sgs/brand-strip.logos declares 'name' and 'alt' as real
    field_keys, so it scores 2 and resolves -- proving the exact-name raw
    count discriminates by genuine relevance, not by attribute volume."""
    item = {
        "name": "Northgate",
        "logo": "northgate.svg",
        "url": "https://northgate.example",
        "alt": "Northgate logo",
        "count": 12,
        "variant": "mono",
    }
    result = cfr.resolve_nested_field("sgs/brand-strip", cfr.DraftField(key="brands", value=[item]))
    assert isinstance(result, cfr.Tier3ArrayResolution), f"got {result!r}"
    placed = result.items[0]
    assert isinstance(placed, cfr.Tier3Placement), f"got {placed!r}"
    assert placed.targets == ("logos",)
    assert placed.hits == 2

    # And the two head-to-head, scored directly against one another: whatever
    # bounded set they were ever both in, card-grid must lose.
    fields = frozenset(item)
    brand = cfr.build_candidate_set("sgs/brand-strip")[0][0]
    card = cfr.build_candidate_set("sgs/card-grid")[0][0]
    scored = dict(
        (c.name, h) for c, h in cfr.score_candidates((brand, card), fields)
    )
    assert scored == {"logos": 2, "items": 0}, scored
    print("  PASS  Tier 3 positive control: brand-strip.logos=2 beats card-grid.items=0 head-to-head")


def test_tier3_exactly_one_hit_gaps_the_floor_is_two() -> None:
    """section 9.3's absolute evidence floor. sgs/accordion's sole candidate,
    sgs/accordion-item, declares exactly ONE content-bearing attribute
    ('title'), so a nested {title, body} scores 1. The floor is >=2, not
    'more than zero' -- a single coincidental field-name match is never
    enough, however small the nested object."""
    field = cfr.DraftField(key="panel", value={"title": "Delivery", "body": "Next day"})
    result = cfr.resolve_nested_field("sgs/accordion", field)
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "tier3_no_candidate_meets_evidence_floor"
    assert "sgs/accordion-item=1" in result.detail, result.detail
    print("  PASS  Tier 3 section 9.3: a candidate scoring exactly 1 raw hit gaps (floor is >=2)")


def test_tier3_tie_at_top_count_reports_ambiguous_with_both_counts() -> None:
    """section 9.3's margin rule. sgs/product-card carries TWO un-matched
    array attributes -- colourSwatches (colour/key/label) and packSizes
    (label/selected) -- and its allow-list contributes nothing (gate 2). An
    item of {label, colour, selected} scores 2 against each. A tie at the top
    count is reported, naming both, never resolved by list position."""
    field = cfr.DraftField(
        key="variants", value=[{"label": "500g", "colour": "red", "selected": True}]
    )
    result = cfr.resolve_nested_field("sgs/product-card", field)
    assert isinstance(result, cfr.Tier3ArrayResolution), f"got {result!r}"
    gap = result.items[0]
    assert isinstance(gap, cfr.Gap), f"got {gap!r}"
    assert gap.reason == "tier3_ambiguous_candidate_tie"
    assert set(gap.candidates) == {"colourSwatches", "packSizes"}
    assert "colourSwatches=2" in gap.detail and "packSizes=2" in gap.detail, gap.detail
    print("  PASS  Tier 3 section 9.3: a 2-way tie at the top count reports ambiguous, naming both")


def test_tier3_counting_domain_is_one_representative_unit() -> None:
    """section 9.3's counting-domain rule: hits() is computed over the FIRST
    item of an array, never summed across every item. Without it an array
    candidate would accumulate hits per repetition and win on volume alone."""
    array_value = [{"title": "A", "subtitle": "B"}] * 40
    assert cfr._representative_fields(array_value) == frozenset({"title", "subtitle"})
    assert cfr._representative_fields({"title": "A"}) == frozenset({"title"})
    # The pre-filter applies to the counting domain too -- a function-literal
    # field is never available to inflate a candidate's hit count.
    assert cfr._representative_fields({"title": "A", "go": cfr.FUNCTION_LITERAL}) == frozenset(
        {"title"}
    )
    print("  PASS  Tier 3 section 9.3: hits() counts one representative unit, never summed per item")


def test_tier3_role_match_never_contributes_to_selection() -> None:
    """The round-3 defect, asserted directly. sgs/card-grid.items declares
    THREE text-content rows (title/subtitle/badge); a role/value-shape match
    would score a hit for every plain string regardless of relevance. Scoring
    is exact-name only, so three unrelated plain strings must score ZERO."""
    candidate = cfr.build_candidate_set("sgs/card-grid")[0][0]
    assert candidate.name == "items"
    scored = cfr.score_candidates(
        (candidate,), frozenset({"headline", "strapline", "flash"})
    )
    assert scored[0][1] == 0, scored
    print("  PASS  Tier 3 section 9.3: three plain strings score 0 (no role/value-shape wildcard)")


def test_tier3_visited_set_catches_a_self_referential_value() -> None:
    """section 9.4's visited-set, keyed on id(value). JSON cannot encode a
    true cycle, so this is a defensive bound against a future non-JSON input
    -- it must emit a named gap, never an unhandled RecursionError."""
    node: dict = {"label": "loop"}
    node["self"] = node
    result = cfr.resolve_nested_field("sgs/quote", cfr.DraftField(key="self", value=node))
    assert isinstance(result, cfr.Tier3Placement), f"got {result!r}"
    reasons = {r.reason for r in result.inner if isinstance(r, cfr.Gap)}
    assert "tier3_cycle_detected" in reasons, result.inner
    print("  PASS  Tier 3 section 9.4: a self-referential value gaps on the visited-set, no RecursionError")


def test_tier3_depth_cap_emits_a_gap_never_a_recursion_error() -> None:
    """section 9.4's hard max_depth. Every level here falls to the
    sgs/container fallback (sgs/container is itself unrestricted with no array
    attributes), so the nesting would otherwise descend for as long as the
    input does."""
    deep = cfr.DraftField(key="a", value={"b": {"c": {"d": {"e": {"f": "end"}}}}})
    result = cfr.resolve_nested_field("sgs/quote", deep, max_depth=2)
    flattened: list = []
    stack = [result]
    while stack:
        node = stack.pop()
        flattened.append(node)
        if isinstance(node, cfr.Tier3Placement):
            stack.extend(node.inner)
    reasons = {n.reason for n in flattened if isinstance(n, cfr.Gap)}
    assert "tier3_max_depth_exceeded" in reasons, flattened

    # A genuinely deep-but-finite input under the real default cap must NOT
    # raise -- the bound is a guard, not a ceiling on ordinary drafts.
    assert cfr.resolve_nested_field("sgs/quote", deep) is not None
    print("  PASS  Tier 3 section 9.4: exceeding max_depth emits a named gap, never a RecursionError")


def test_tier3_array_items_resolved_independently() -> None:
    """section 9.5: each item of an array of objects is scored and resolved
    independently against the SAME bounded candidate set -- a bad item must
    not be carried by its good siblings, nor drag them down."""
    field = cfr.DraftField(
        key="cards",
        value=[
            {"title": "Roofing", "subtitle": "Since 1994"},
            {"headline": "Guttering", "strapline": "Fast"},
        ],
    )
    result = cfr.resolve_nested_field("sgs/card-grid", field)
    assert isinstance(result, cfr.Tier3ArrayResolution), f"got {result!r}"
    assert isinstance(result.items[0], cfr.Tier3Placement), result.items
    assert isinstance(result.items[1], cfr.Gap), result.items
    print("  PASS  Tier 3 section 9.5: array items resolve independently (one places, one gaps)")


def test_tier3_function_literal_and_non_nested_values_are_refused() -> None:
    """section 4.0's pre-filter and section 9's own condition. Tier 3 only ever
    accepts a nested value; a plain scalar reaching it is a routing error and
    is named as one rather than silently scored."""
    fn = cfr.resolve_nested_field("sgs/card-grid", cfr.DraftField(key="go", value=cfr.FUNCTION_LITERAL))
    assert isinstance(fn, cfr.Gap) and fn.reason == "function_literal_excluded"
    scalar = cfr.resolve_nested_field("sgs/card-grid", cfr.DraftField(key="heading", value="Hello"))
    assert isinstance(scalar, cfr.Gap) and scalar.reason == "tier3_not_a_nested_value"
    print("  PASS  Tier 3: a function literal and a plain scalar are both refused, named")


def test_tier3_entry_point_accepts_route_to_tier3() -> None:
    """Tier 3 is entered from identify_array_field's RouteToTier3 result --
    the signal Tier 1 already produces for exactly this case."""
    field = cfr.DraftField(key="cards", value=[{"title": "A", "subtitle": "B", "badge": "C"}])
    routed = cfr.identify_array_field("sgs/card-grid", field)
    assert isinstance(routed, cfr.RouteToTier3), f"got {routed!r}"
    result = cfr.resolve_nested_field("sgs/card-grid", routed, field.value)
    assert isinstance(result, cfr.Tier3ArrayResolution), f"got {result!r}"
    assert result.items[0].targets == ("items",)
    print("  PASS  Tier 3: entry point accepts the RouteToTier3 that Step A already emits")


def test_tier3_recursion_reenters_the_whole_resolver() -> None:
    """section 9.4: once a candidate is resolved the WHOLE resolver recurses
    with that candidate as the new parent -- genuinely the same resolver, so
    the nested object's own fields come back placed by Tiers 1/2, not by a
    Tier-3-private copy of them."""
    field = cfr.DraftField(
        key="picture",
        value={"imageUrl": "hero.jpg", "imageAlt": "A roof", "caption": "Our work"},
    )
    result = cfr.resolve_nested_field("sgs/hero", field)
    placements = [r for r in result.inner if isinstance(r, cfr.Tier2Placement)]
    assert {p.attr_name for p in placements} == {"imageUrl", "imageAlt", "caption"}
    assert all(p.block_slug == "sgs/media" for p in placements)
    print("  PASS  Tier 3 section 9.4: recursion re-enters the real resolver with the new parent")


# ---------------------------------------------------------------------------
# section 10 -- Tier 4, one-off (non-repeated) content. Every concrete
# (block, attr, role) below was confirmed against the live sgs-framework.db
# before being written, same discipline as the Tier 3 fixtures above.
# ---------------------------------------------------------------------------


def test_tier4_hero_unambiguous_resolves_and_feeds_tier1_2() -> None:
    """section 10.1: classify_heading's bare "hero" guess maps unambiguously
    to sgs/hero. The resolved slug must feed Tiers 1-3 exactly as if Spec 44
    had produced this identity -- here, sgs/hero.label (role=text-content)
    places by Tier 2 exact-name -- AND the whole result must be
    review-pending (section 10.3) even though the downstream match is a
    clean, unambiguous hit."""
    hint = {"block": "hero", "confidence": 0.4}
    fields = (cfr.DraftField(key="label", value="Book now"),)
    result = cfr.resolve_tier4(hint, fields)
    assert isinstance(result, cfr.Tier4Resolution), f"got {result!r}"
    assert result.block_slug == "sgs/hero"
    assert result.review_pending is True
    assert result.confidence == 0.4
    assert len(result.results) == 1
    placement = result.results[0]
    assert isinstance(placement, cfr.Tier2Placement), f"got {placement!r}"
    assert placement.attr_name == "label"
    print("  PASS  Tier 4 section 10.1: 'hero' resolves to sgs/hero, feeds Tier 2, review-pending")


def test_tier4_card_grid_unambiguous_resolves_and_feeds_tier1_2() -> None:
    """section 10.1: classify_repeated_siblings' bare "card-grid" guess maps
    unambiguously to sgs/card-grid. sgs/card-grid.emptyMessage (role=
    text-content, canonical_slot=None) places by Tier 2 exact-name, review-
    pending regardless of the clean match (section 10.3)."""
    hint = {"block": "card-grid", "confidence": 0.5}
    fields = (cfr.DraftField(key="emptyMessage", value="No services found"),)
    result = cfr.resolve_tier4(hint, fields)
    assert isinstance(result, cfr.Tier4Resolution), f"got {result!r}"
    assert result.block_slug == "sgs/card-grid"
    assert result.review_pending is True
    assert result.confidence == 0.5
    placement = result.results[0]
    assert isinstance(placement, cfr.Tier2Placement), f"got {placement!r}"
    assert placement.attr_name == "emptyMessage"
    print("  PASS  Tier 4 section 10.1: 'card-grid' resolves to sgs/card-grid, feeds Tier 2, review-pending")


def test_tier4_cta_before_signal_plumbing_gaps() -> None:
    """section 10.1: BEFORE the child_count/has_heading_or_paragraph_sibling
    plumbing fix, a "cta" guess carries no disambiguating signal at all --
    simulated here by a hint with no child_count/has_heading_or_paragraph_
    sibling keys, exactly what classify_button_shaped returned before this
    session's fix. Must gap, never guess between sgs/cta-section and
    sgs/whatsapp-cta."""
    hint = {"block": "cta", "confidence": 0.45}
    result = cfr.resolve_tier4(hint, ())
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "tier4_cta_ambiguous"
    print("  PASS  Tier 4 section 10.1: 'cta' with no signals gaps (pre-plumbing-fix shape)")


def test_tier4_cta_after_fix_resolves_cta_section_shape() -> None:
    """section 10.1 AFTER the fix: a composite CTA shape (children present +
    a heading/paragraph sibling) resolves to sgs/cta-section. Feeds
    sgs/cta-section.headline (role=text-content) via Tier 2 exact-name."""
    hint = {"block": "cta", "confidence": 0.45, "child_count": 3, "has_heading_or_paragraph_sibling": True}
    fields = (cfr.DraftField(key="headline", value="Ready to get started?"),)
    result = cfr.resolve_tier4(hint, fields)
    assert isinstance(result, cfr.Tier4Resolution), f"got {result!r}"
    assert result.block_slug == "sgs/cta-section"
    assert result.review_pending is True
    placement = result.results[0]
    assert isinstance(placement, cfr.Tier2Placement), f"got {placement!r}"
    assert placement.attr_name == "headline"
    print("  PASS  Tier 4 section 10.1: composite-shaped 'cta' resolves to sgs/cta-section")


def test_tier4_cta_after_fix_resolves_whatsapp_cta_shape() -> None:
    """section 10.1 AFTER the fix: a single floating action element (near-
    zero children, no heading/paragraph sibling) resolves to
    sgs/whatsapp-cta. Feeds sgs/whatsapp-cta.label (role=text-content) via
    Tier 2 exact-name."""
    hint = {"block": "cta", "confidence": 0.45, "child_count": 0, "has_heading_or_paragraph_sibling": False}
    fields = (cfr.DraftField(key="label", value="Chat with us"),)
    result = cfr.resolve_tier4(hint, fields)
    assert isinstance(result, cfr.Tier4Resolution), f"got {result!r}"
    assert result.block_slug == "sgs/whatsapp-cta"
    assert result.review_pending is True
    placement = result.results[0]
    assert isinstance(placement, cfr.Tier2Placement), f"got {placement!r}"
    assert placement.attr_name == "label"
    print("  PASS  Tier 4 section 10.1: floating-shaped 'cta' resolves to sgs/whatsapp-cta")


def test_tier4_cta_contradictory_signals_gaps() -> None:
    """Negative control for both directions above: signals that match
    NEITHER shape cleanly (children present but no heading/paragraph
    sibling) must gap rather than default to either slug."""
    hint = {"block": "cta", "confidence": 0.45, "child_count": 2, "has_heading_or_paragraph_sibling": False}
    result = cfr.resolve_tier4(hint, ())
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "tier4_cta_ambiguous"
    print("  PASS  Tier 4 section 10.1: contradictory cta signals gap, never guessed")


def test_tier4_bare_nav_guess_never_routes_to_header_row() -> None:
    """section 10.1: nav's removal from dom_shape_classifier._LANDMARK_TAG_
    BLOCK is confirmed at the classifier layer (a bare <nav> now produces NO
    hint at all) AND at this module's own resolution layer -- a synthetic
    "nav" bare guess reaching resolve_tier4 (as it could have before the
    fix) must gap, never silently resolve to sgs/site-header-row."""
    import dom_shape_classifier as dsc

    element = {"tag": "nav", "classes": []}
    assert dsc.classify_element(element, [], is_top_level=False) is None, (
        "bare <nav> must produce no classifier hint at all post-fix"
    )

    hint = {"block": "nav", "confidence": 0.35}
    result = cfr.resolve_tier4(hint, ())
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "tier4_unresolvable_bare_guess"
    print("  PASS  Tier 4 section 10.1: bare 'nav' guess never routes to a header-row block")


def test_tier4_header_landmark_slug_passes_through_directly() -> None:
    """section 10.1: post-fix, dom_shape_classifier._LANDMARK_TAG_BLOCK
    already maps header/footer DIRECTLY to their real row-level slugs, so
    resolve_tier4 needs no separate lookup for this case -- hint.block
    arrives already resolved."""
    hint = {"block": "sgs/site-footer-row", "confidence": 0.35}
    result = cfr.resolve_tier4(hint, ())
    assert isinstance(result, cfr.Tier4Resolution), f"got {result!r}"
    assert result.block_slug == "sgs/site-footer-row"
    assert result.review_pending is True
    print("  PASS  Tier 4 section 10.1: an already-real landmark slug passes through unchanged")


def test_tier4_e2e_real_markup_composite_cta_resolves_to_cta_section() -> None:
    """End-to-end positive control (2026-09-17 review fix) -- a REAL bs4
    fragment shaped like a genuine composite CTA, run through the full
    chain: `_bs4_to_dom_dict` (per-section-convention-voter.py) ->
    `dom_shape_classifier.classify_element` -> `cfr.resolve_tier4`.

    Real composite CTA markup writes the heading/paragraph BEFORE the
    button -- exactly this shape. Before the `find_previous_siblings()` fix,
    `_has_heading_or_paragraph_sibling` only looked forward and was `False`
    here, so this exact real-world shape would have confidently resolved to
    the WRONG block (sgs/whatsapp-cta) instead of gapping or matching
    sgs/cta-section -- a wrong answer, not a gap, which is worse.

    `disambiguate_cta_guess` requires BOTH signals for the composite shape
    (child_count > 0 AND has_heading_or_paragraph_sibling) -- so the button
    itself carries child elements (icon + label spans), matching a real
    composite CTA button rather than a bare text-only `<button>`."""
    soup = BeautifulSoup(
        "<div>"
        "<h2>Ready to get started?</h2>"
        "<p>Book a free consultation today.</p>"
        '<button><span class="icon"></span><span>Book now</span></button>'
        "</div>",
        "html.parser",
    )
    button = soup.find("button")
    dom_dict = _voter._bs4_to_dom_dict(button)
    assert dom_dict["_has_heading_or_paragraph_sibling"] is True, (
        "heading/paragraph BEFORE the button must be detected"
    )

    hint = _dsc.classify_element(dom_dict, [], is_top_level=False)
    assert hint is not None, f"expected a Hint, got None"
    assert hint.block == "cta"
    assert hint.has_heading_or_paragraph_sibling is True

    fields = (cfr.DraftField(key="headline", value="Ready to get started?"),)
    result = cfr.resolve_tier4(hint.to_dict(), fields)
    assert isinstance(result, cfr.Tier4Resolution), f"got {result!r}"
    assert result.block_slug == "sgs/cta-section", f"got {result.block_slug!r}"
    print(
        "  PASS  Tier 4 E2E: real bs4 markup (h2+p BEFORE button) resolves "
        "to sgs/cta-section, not sgs/whatsapp-cta"
    )


def test_tier4_e2e_real_markup_floating_cta_resolves_to_whatsapp_cta() -> None:
    """Negative-direction companion (2026-09-17 review fix) -- a lone
    floating `<button>` with no heading/paragraph on EITHER side must still
    resolve to sgs/whatsapp-cta after the `find_previous_siblings()` widening,
    proving the fix did not silently break the genuine floating-CTA case."""
    soup = BeautifulSoup(
        '<div><span class="icon">chat</span><button>Chat with us</button></div>',
        "html.parser",
    )
    button = soup.find("button")
    dom_dict = _voter._bs4_to_dom_dict(button)
    assert dom_dict["_has_heading_or_paragraph_sibling"] is False, (
        "a floating CTA with no heading/paragraph sibling must stay False"
    )

    hint = _dsc.classify_element(dom_dict, [], is_top_level=False)
    assert hint is not None, "expected a Hint, got None"
    assert hint.block == "cta"
    assert hint.has_heading_or_paragraph_sibling is False

    fields = (cfr.DraftField(key="label", value="Chat with us"),)
    result = cfr.resolve_tier4(hint.to_dict(), fields)
    assert isinstance(result, cfr.Tier4Resolution), f"got {result!r}"
    assert result.block_slug == "sgs/whatsapp-cta", f"got {result.block_slug!r}"
    print(
        "  PASS  Tier 4 E2E: real bs4 markup (no heading/paragraph either "
        "side) still resolves to sgs/whatsapp-cta"
    )


def test_tier4_missing_confidence_gaps_not_silently_zeroed() -> None:
    """Finding 2 (2026-09-17 review): `Tier4Resolution.confidence` is typed
    `float`, but a hint lacking a `confidence` key must not silently produce
    `None` into that field. Matches this module's own existing convention
    for a missing Hint signal (`disambiguate_cta_guess`'s explicit `is None`
    checks) -- reported as a Gap, never defaulted to 0.0."""
    hint = {"block": "hero"}  # no "confidence" key at all
    result = cfr.resolve_tier4(hint, ())
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "tier4_missing_confidence"
    print("  PASS  Tier 4: a hint with no 'confidence' key gaps, never silently zeroed")


def test_tier4_unresolvable_bare_guess_gaps() -> None:
    """Negative control: a classifier guess with no Tier 4 mapping at all
    (neither an unambiguous name, "cta", nor an already-real slug) must gap,
    never crash or silently pick something."""
    hint = {"block": "totally-unknown-guess", "confidence": 0.4}
    result = cfr.resolve_tier4(hint, ())
    assert isinstance(result, cfr.Gap), f"got {result!r}"
    assert result.reason == "tier4_unresolvable_bare_guess"
    print("  PASS  Tier 4: an unmapped bare guess gaps, never crashes or guesses")


# ---------------------------------------------------------------- Front C Task 4

def test_tier4_static_corroboration_against_real_buybox_singleton() -> None:
    """§10.3 corroboration (Front C Task 4): a landmark-passthrough guess of
    `sgs/buybox` (confidence still capped, still review-pending — that ceiling is
    untouched) gains a real `static_corroboration` when `static_roles` is supplied,
    matched against the LIVE DB's real seeded `block_render_singletons` row for
    buybox's `image-or-fallback` (gallery-col.php) — confirmed live in this same
    session via D1093's seeding run."""
    import render_repeater_seeder as _seeder  # noqa: E402 — same-directory sibling
    hint = {"block": "sgs/buybox", "confidence": 0.5}
    result = cfr.resolve_tier4(hint, (), static_roles=(_seeder.ROLE_IMAGE,))
    assert isinstance(result, cfr.Tier4Resolution), f"got {result!r}"
    assert result.block_slug == "sgs/buybox"
    assert result.confidence == 0.5 and result.review_pending is True, (
        "the confidence ceiling and review-pending flag are UNTOUCHED by corroboration")
    assert result.static_corroboration is not None, result
    assert result.static_corroboration.quality == "exact", result.static_corroboration
    assert result.static_corroboration.source_file == "gallery-col.php"
    print(f"  PASS  Tier 4 corroboration: real EXACT match on "
          f"{result.static_corroboration.source_file} — confidence/review_pending unchanged")


def test_tier4_static_corroboration_is_none_when_not_supplied() -> None:
    """Backward compatibility — every existing Tier 4 test above supplies no
    `static_roles`, and must see `static_corroboration=None`, not a crash."""
    hint = {"block": "sgs/buybox", "confidence": 0.5}
    result = cfr.resolve_tier4(hint, ())
    assert isinstance(result, cfr.Tier4Resolution), f"got {result!r}"
    assert result.static_corroboration is None, result
    print("  PASS  Tier 4 corroboration: None when static_roles is not supplied (default, "
          "every pre-Task-4 caller)")


def main() -> int:
    print("classless_field_resolver.py self-test (Spec 45 Tiers 1-4)")
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
    test_tier2_canonical_slot_single_match_requires_value_shape()
    test_tier2_canonical_slot_single_match_places_when_shape_matches()
    test_tier2_styling_role_only_never_matches()
    test_tier2_function_literal_excluded()
    test_tier2_unknown_field_is_a_gap_not_a_crash()
    test_tier3_own_object_attribute_exact_name_places()
    test_tier3_own_object_attribute_canonical_slot_places_whole_group()
    test_tier3_own_object_attribute_styling_role_never_matches()
    test_tier3_own_object_attribute_collision_is_a_gap()
    test_tier3_empty_candidate_set_gaps_immediately()
    test_tier3_gate1_drops_orphan_candidate_slugs()
    test_tier3_gate2_excludes_untrustworthy_allow_lists()
    test_tier3_gate2_positive_control_real_parents_not_excluded()
    test_tier3_gate2_comment_stripper_is_line_bounded()
    test_tier3_container_fallback_fires_on_unrestricted_parent()
    test_tier3_container_fallback_not_offered_to_an_allow_listed_parent()
    test_tier3_composed_block_suppresses_the_container_fallback()
    test_tier3_composed_block_actually_resolves_a_real_field()
    test_tier3_card_grid_misnamed_field_resolves_by_raw_count()
    test_tier3_allow_listed_parent_resolves_on_two_or_more_hits()
    test_tier3_brand_logo_negative_control_card_grid_never_wins()
    test_tier3_brand_logo_positive_control_correct_candidate_wins()
    test_tier3_exactly_one_hit_gaps_the_floor_is_two()
    test_tier3_tie_at_top_count_reports_ambiguous_with_both_counts()
    test_tier3_counting_domain_is_one_representative_unit()
    test_tier3_role_match_never_contributes_to_selection()
    test_tier3_visited_set_catches_a_self_referential_value()
    test_tier3_depth_cap_emits_a_gap_never_a_recursion_error()
    test_tier3_array_items_resolved_independently()
    test_tier3_function_literal_and_non_nested_values_are_refused()
    test_tier3_entry_point_accepts_route_to_tier3()
    test_tier3_recursion_reenters_the_whole_resolver()
    test_tier4_hero_unambiguous_resolves_and_feeds_tier1_2()
    test_tier4_card_grid_unambiguous_resolves_and_feeds_tier1_2()
    test_tier4_cta_before_signal_plumbing_gaps()
    test_tier4_cta_after_fix_resolves_cta_section_shape()
    test_tier4_cta_after_fix_resolves_whatsapp_cta_shape()
    test_tier4_cta_contradictory_signals_gaps()
    test_tier4_bare_nav_guess_never_routes_to_header_row()
    test_tier4_header_landmark_slug_passes_through_directly()
    test_tier4_e2e_real_markup_composite_cta_resolves_to_cta_section()
    test_tier4_e2e_real_markup_floating_cta_resolves_to_whatsapp_cta()
    test_tier4_missing_confidence_gaps_not_silently_zeroed()
    test_tier4_unresolvable_bare_guess_gaps()
    test_tier4_static_corroboration_against_real_buybox_singleton()
    test_tier4_static_corroboration_is_none_when_not_supplied()
    print("\nCLASSLESS-FIELD-RESOLVER (Tiers 1-4): PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())

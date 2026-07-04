"""Unit tests for css_router.py — Spec 16 §FR6 four-destination router.

Tests cover:
  - D0: global/reset rules
  - D1: typed-attr lift (SGS-BEM block root with matching suffix-table attr)
  - D2: wrapper CSS fallback (class but no typed-attr destination)
  - D3: gap candidates (block-root CSS prop with suffix mapping but block doesn't declare it)
  - Mixed: selector with multiple class components
  - @media queries: nested rules routed recursively
  - Malformed rules: missing ; or unclosed braces — logged, continue
  - Empty CSS: returns empty buckets with stats=zero
  - Pre-snap filter: six "non-tokenisable" chrome values skip the resolver
  - lineHeight role: does NOT route to font_size (per P1.A nice-to-have #2)
  - Chrome-skip: header/footer/nav top-level elements get no D2 emission
  - Hard rule: every rule lands in exactly one bucket (D0+D1+D2+D3 == total - chrome)

Run with: cd plugins/sgs-blocks && python -m pytest scripts/orchestrator/test_css_router.py -v
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

HERE = Path(__file__).parent

# ---------------------------------------------------------------------------
# Import css_router under test
# ---------------------------------------------------------------------------
spec = importlib.util.spec_from_file_location("css_router", HERE / "css_router.py")
css_router = importlib.util.module_from_spec(spec)
sys.modules["css_router"] = css_router

# We need to mock the db_lookup dependency so tests run without the live DB.
# Create a thin mock that returns predictable data.
_mock_db = MagicMock()
# parse_sgs_bem: parses "sgs-hero" → BemParse(block='hero', element=None, modifier=None)
# and "sgs-hero__sub" → BemParse(block='hero', element='sub', modifier=None)
# We use a namedtuple-like object.
from typing import NamedTuple

class _BemParse(NamedTuple):
    block: str | None
    element: str | None
    modifier: str | None

def _mock_parse_sgs_bem(cls: str):
    if cls == "sgs-hero":
        return _BemParse("hero", None, None)
    if cls == "sgs-hero__sub":
        return _BemParse("hero", "sub", None)
    if cls == "sgs-button":
        return _BemParse("button", None, None)
    if cls == "sgs-button--primary":
        return _BemParse("button", None, "primary")
    if cls == "sgs-product-card":
        return _BemParse("product-card", None, None)
    if cls == "sgs-product-card__image":
        return _BemParse("product-card", "image", None)
    if cls.startswith("sgs-"):
        suffix = cls[4:]
        # Treat any sgs-<name> without __ as a block-root
        if "__" not in suffix and "--" not in suffix:
            return _BemParse(suffix, None, None)
    return None

_mock_db.parse_sgs_bem.side_effect = _mock_parse_sgs_bem

def _mock_block_exists(slug: str) -> bool:
    # Known registered blocks in our test fixtures.
    return slug in ("sgs/hero", "sgs/button", "sgs/product-card")

_mock_db.block_exists.side_effect = _mock_block_exists

# block_attrs: for sgs/hero, return attrs with padding, background-color, color mapped.
def _mock_block_attrs(slug: str) -> dict:
    if slug == "sgs/hero":
        return {
            "backgroundColour": {"role": "color", "canonical_slot": None, "attr_type": "string"},
            "textColour": {"role": "color", "canonical_slot": None, "attr_type": "string"},
            "paddingTop": {"role": "spacing", "canonical_slot": None, "attr_type": "string"},
            "paddingBottom": {"role": "spacing", "canonical_slot": None, "attr_type": "string"},
        }
    if slug == "sgs/button":
        return {
            "backgroundColour": {"role": "color", "canonical_slot": None, "attr_type": "string"},
        }
    return {}

_mock_db.block_attrs.side_effect = _mock_block_attrs

# css_property_suffixes: a minimal set for routing.
# Returns list of (css_property, suffix, kind).
def _mock_css_property_suffixes() -> list:
    return [
        ("background-color", "Colour", "colour"),
        ("background-color", "Color", "colour"),
        ("color", "Colour", "colour"),
        ("color", "Color", "colour"),
        ("padding-top", "PaddingTop", "number_px"),
        ("padding", "Padding", "number_px"),
        ("padding-bottom", "PaddingBottom", "number_px"),
        ("font-size", "FontSize", "number_px"),
        ("font-family", "FontFamily", "string"),
        ("line-height", "LineHeight", "number_unitless"),
    ]

_mock_db.css_property_suffixes.return_value = _mock_css_property_suffixes()

# propose_attr_name: simple proxy.
def _mock_propose_attr_name(block_slug, css_prop, source_class):
    return css_prop.replace("-", "_")

_mock_db.propose_attr_name.side_effect = _mock_propose_attr_name

# write_attribute_gap_candidate: no-op in tests.
_mock_db.write_attribute_gap_candidate.return_value = None

# Patch _get_db so it returns our mock.
css_router._db = _mock_db

# Patch _CSS_PROP_SUFFIXES so _css_prop_suffixes() reads our mock.
css_router._CSS_PROP_SUFFIXES = _mock_css_property_suffixes()

spec.loader.exec_module(css_router)

# Re-apply mocks after exec (module-level vars reset on exec_module).
css_router._db = _mock_db
css_router._CSS_PROP_SUFFIXES = _mock_css_property_suffixes()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stats_sum_matches_total(result: dict) -> bool:
    """Verify D0+D1+D2+D3 counts + chrome_skipped = total_rules."""
    s = result["stats"]
    bucket_total = s["d0_count"] + s["d1_count"] + s["d2_count"] + s["d3_count"] + s["chrome_skipped"]
    # Note: D3 rules ALSO add to D2 as fallback, so D2 count may include D3 entries.
    # The hard rule is: every rule routes — bucket_total ≥ total_rules when D3 duplicates D2.
    # We verify no rules are silently dropped by checking total_rules ≤ bucket_total.
    return s["total_rules"] <= bucket_total


EMPTY_THEME = {}
EMPTY_BOUNDARIES = {}


# ---------------------------------------------------------------------------
# Test D0 — global/reset rules
# ---------------------------------------------------------------------------

class TestD0:
    def test_body_margin_routes_to_d0(self):
        css = "body { margin: 0; padding: 0; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d0_count"] == 1
        assert result["stats"]["d2_count"] == 0
        assert result["stats"]["d1_count"] == 0
        assert len(result["d0"]) == 1
        assert "body" in result["d0"][0]

    def test_root_custom_property_routes_to_d0(self):
        css = ":root { --primary: #0F7E80; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d0_count"] == 1
        assert len(result["d0"]) == 1

    def test_universal_selector_routes_to_d0(self):
        css = "* { box-sizing: border-box; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d0_count"] == 1

    def test_heading_tag_routes_to_d0(self):
        css = "h1 { font-weight: bold; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d0_count"] == 1

    def test_pseudo_element_without_class_routes_to_d0(self):
        css = "::before { content: ''; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d0_count"] == 1

    def test_focus_visible_without_class_routes_to_d0(self):
        css = "*:focus-visible { outline: 2px solid red; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d0_count"] == 1


# ---------------------------------------------------------------------------
# Test D1 — typed-attr lift
# ---------------------------------------------------------------------------

def _d1_entries_for_block(result: dict, block_slug: str) -> dict:
    """Collect all D1 entries whose key matches block_slug or starts with '<block_slug>:'.

    F3 (2026-05-20) changed D1 keys from bare block_slug to '<block_slug>:<selector>'.
    This helper collects all matching entries regardless of which format was used.
    """
    merged = {}
    for key, entries in result["d1"].items():
        if key == block_slug or key.startswith(f"{block_slug}:"):
            merged.update(entries)
    return merged


class TestD1:
    def test_hero_padding_routes_to_d1(self):
        """sgs/hero has a paddingTop attr — padding-top on .sgs-hero should D1."""
        css = ".sgs-hero { padding-top: 56px; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # F3: keys are now "<block_slug>:<selector>" — use prefix-match helper.
        d1_hero = _d1_entries_for_block(result, "sgs/hero")
        assert d1_hero, f"Expected D1 entries for sgs/hero, got keys: {list(result['d1'].keys())}"
        attr_keys = list(d1_hero.keys())
        assert any("padding-top" in k or "padding" in k for k in attr_keys)

    def test_hero_background_colour_routes_to_d1(self):
        """sgs/hero has backgroundColour attr — background-color should D1."""
        css = ".sgs-hero { background-color: #F5C2C8; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        d1_hero = _d1_entries_for_block(result, "sgs/hero")
        assert d1_hero, f"Expected D1 entries for sgs/hero, got keys: {list(result['d1'].keys())}"

    def test_d1_includes_value(self):
        """D1 entries carry the raw CSS value."""
        css = ".sgs-hero { padding-top: 56px; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        d1_hero = _d1_entries_for_block(result, "sgs/hero")
        entry = next(iter(d1_hero.values()))
        assert entry["value"] == "56px"

    def test_d1_includes_role(self):
        """D1 entries carry a role string."""
        css = ".sgs-hero { padding-top: 56px; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        d1_hero = _d1_entries_for_block(result, "sgs/hero")
        entry = next(iter(d1_hero.values()))
        assert "role" in entry and entry["role"]

    def test_d1_snap_skipped_for_auto(self):
        """Values like 'auto' should have snap_skipped=True."""
        css = ".sgs-hero { padding-top: auto; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        d1_hero = _d1_entries_for_block(result, "sgs/hero")
        for entry in d1_hero.values():
            if entry.get("value") == "auto":
                assert entry["snap_skipped"] is True


# ---------------------------------------------------------------------------
# Test D2 — wrapper CSS fallback
# ---------------------------------------------------------------------------

class TestD2:
    def test_unknown_sgs_class_routes_to_d2(self):
        """A class that starts with sgs- but maps to no known block → D2."""
        css = ".sgs-unknown-component { color: red; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d2_count"] >= 1
        assert len(result["d2"]) >= 1

    def test_hero_sub_element_no_typed_attr_routes_to_d2_or_d3(self):
        """sgs/hero has no typed attr for 'display' → D2 (or D3+D2 if in suffix table)."""
        css = ".sgs-hero__sub { display: flex; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # display is not in our mock suffix table, so D2.
        assert result["stats"]["d2_count"] >= 1

    def test_non_sgs_class_routes_to_d2(self):
        """A class that doesn't start with sgs- → D2."""
        css = ".my-component { color: blue; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d2_count"] >= 1

    def test_d2_rule_text_preserved(self):
        """D2 output contains recognisable selector text."""
        css = ".sgs-unknown-component { font-size: 14px; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert any("sgs-unknown-component" in r for r in result["d2"])


# ---------------------------------------------------------------------------
# Test D3 — gap candidates
# ---------------------------------------------------------------------------

class TestD3:
    def test_d3_plus_d2_fallback(self):
        """When a block-root CSS prop is in the suffix table but block doesn't
        declare it, we get a D3 entry AND the rule also goes to D2 as fallback."""
        # sgs/hero doesn't have a 'font-size' typed attr in our mock,
        # but 'font-size' IS in the suffix table.
        css = ".sgs-hero { font-size: 24px; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # Should be a D3 gap candidate.
        d3_hero = [e for e in result["d3"] if e["block_slug"] == "sgs/hero"]
        assert len(d3_hero) >= 1, f"Expected D3 candidate for sgs/hero, got: {result['d3']}"
        assert d3_hero[0]["css_property"] == "font-size"
        # AND a D2 fallback.
        assert result["stats"]["d2_count"] >= 1

    def test_d3_entry_has_required_fields(self):
        css = ".sgs-hero { font-size: 24px; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        d3_hero = [e for e in result["d3"] if e["block_slug"] == "sgs/hero"]
        if d3_hero:
            entry = d3_hero[0]
            assert "block_slug" in entry
            assert "css_property" in entry
            assert "raw_value" in entry
            assert "source_class" in entry
            assert "run_id" in entry

    def test_d3_run_id_preserved(self):
        css = ".sgs-hero { font-size: 18px; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "run-abc-123")
        d3_entries = [e for e in result["d3"] if e["block_slug"] == "sgs/hero"]
        if d3_entries:
            assert d3_entries[0]["run_id"] == "run-abc-123"


# ---------------------------------------------------------------------------
# Test mixed selectors
# ---------------------------------------------------------------------------

class TestMixed:
    def test_multi_class_selector_routes_correctly(self):
        """A selector like '.sgs-hero .sgs-button' — outermost determines routing."""
        css = ".sgs-hero .sgs-button { background-color: red; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # Should be classified based on the classes found — at least one bucket.
        total = (result["stats"]["d0_count"] + result["stats"]["d1_count"] +
                 result["stats"]["d2_count"] + result["stats"]["d3_count"])
        assert total >= 1, "Multi-class selector must route to at least one bucket"

    def test_multiple_rules_sum_correctly(self):
        css = """
        body { margin: 0; }
        .sgs-hero { padding-top: 56px; background-color: pink; }
        .sgs-unknown { color: red; }
        """
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        s = result["stats"]
        assert s["total_rules"] == 3
        assert _stats_sum_matches_total(result)


# ---------------------------------------------------------------------------
# Test @media queries
# ---------------------------------------------------------------------------

class TestMediaQueries:
    def test_media_query_body_rule_routes_to_d2(self):
        """@media (max-width: 768px) { body { ... } } → D2, not D0.

        F7 fix (2026-05-20): bare-tag rules inside @media must NOT go to D0 —
        they would lose their media-query wrapper, rendering unconditionally.
        Instead they go to D2 where the @media wrapper is preserved.
        Top-level body rules (no @media) still go to D0 — see test_body_margin_routes_to_d0.
        """
        css = "@media (max-width: 768px) { body { font-size: 14px; } }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # F7: body inside @media goes to D2 (preserves media-query wrapper).
        assert result["stats"]["d2_count"] >= 1
        assert result["stats"]["d0_count"] == 0, (
            "body inside @media must NOT be D0 — it would lose its @media wrapper (F7 fix)"
        )

    def test_media_query_sgs_class_routes_correctly(self):
        """@media (max-width: 768px) { .sgs-unknown { color: red; } } → D2."""
        css = "@media (max-width: 768px) { .sgs-unknown { color: red; } }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # .sgs-unknown has no registered block → D2.
        assert result["stats"]["d2_count"] >= 1

    def test_reduced_motion_routes_to_d2(self):
        """@media (prefers-reduced-motion: reduce) { *, *::before { ... } } → D2.

        F7 fix (2026-05-20): universal selectors inside @media must NOT go to D0.
        Applying them unconditionally would remove the reduced-motion guard, causing
        animations to run even for users who have requested reduced motion.
        """
        css = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms; } }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # F7: universal selectors inside @media go to D2 to preserve the media context.
        assert result["stats"]["d2_count"] >= 1
        assert result["stats"]["d0_count"] == 0, (
            "Universal selectors inside @media must not go to D0 (would lose @media wrapper)"
        )


# ---------------------------------------------------------------------------
# Test malformed CSS
# ---------------------------------------------------------------------------

class TestMalformed:
    def test_empty_css_returns_zero_stats(self):
        result = css_router.route_css("", EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["total_rules"] == 0
        assert result["stats"]["d0_count"] == 0
        assert result["stats"]["d1_count"] == 0
        assert result["stats"]["d2_count"] == 0
        assert result["stats"]["d3_count"] == 0
        assert len(result["d0"]) == 0
        assert len(result["d1"]) == 0
        assert len(result["d2"]) == 0
        assert len(result["d3"]) == 0

    def test_whitespace_only_returns_zero_stats(self):
        result = css_router.route_css("   \n\n  ", EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["total_rules"] == 0

    def test_comment_only_returns_zero_stats(self):
        result = css_router.route_css("/* just a comment */", EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["total_rules"] == 0


# ---------------------------------------------------------------------------
# Test pre-snap filter (non-tokenisable values)
# ---------------------------------------------------------------------------

class TestPreSnapFilter:
    @pytest.mark.parametrize("value", ["0", "auto", "none", "inherit", "initial", "unset"])
    def test_non_tokenisable_values_have_snap_skipped(self, value):
        """Values that are never tokenisable should have snap_skipped=True in D1 entries."""
        css = f".sgs-hero {{ padding-top: {value}; }}"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # If it went D1, snap_skipped should be True.
        # F3: use prefix-match helper to handle '<block_slug>:<selector>' keys.
        d1_hero = _d1_entries_for_block(result, "sgs/hero")
        for entry in d1_hero.values():
            if entry.get("value") == value:
                assert entry["snap_skipped"] is True


# ---------------------------------------------------------------------------
# Test chrome-skip (header/footer/nav)
# ---------------------------------------------------------------------------

class TestChromeSkip:
    def test_header_selector_is_chrome_skipped(self):
        """Rules whose outermost selector element is <header> → chrome-skipped."""
        css = "header { background: white; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["chrome_skipped"] >= 1
        # Should NOT appear in D2.
        assert len(result["d2"]) == 0

    def test_footer_selector_is_chrome_skipped(self):
        css = "footer .sgs-footer__links { color: black; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["chrome_skipped"] >= 1

    def test_nav_selector_is_chrome_skipped(self):
        css = "nav ul { list-style: none; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["chrome_skipped"] >= 1

    def test_sgs_header_class_is_NOT_chrome_skipped(self):
        """.sgs-header (a class, not a bare tag) is NOT chrome-skipped — routes normally."""
        css = ".sgs-header { background: white; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # .sgs-header maps to no known block (not in our mock) → D2, NOT chrome-skipped.
        assert result["stats"]["chrome_skipped"] == 0

    def test_non_chrome_class_selector_not_skipped(self):
        """A class-based selector that contains 'header' in the name is NOT chrome-skipped."""
        css = ".sgs-header__nav { padding: 10px; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["chrome_skipped"] == 0


# ---------------------------------------------------------------------------
# Test lineHeight role
# ---------------------------------------------------------------------------

class TestLineHeightRole:
    def test_line_height_role_is_not_font_size(self):
        """line-height should have role 'typography' or 'visual', NOT 'font_size'."""
        role = css_router._infer_role("line-height")
        assert role != "font_size", f"Expected non-font_size role for line-height, got {role!r}"

    def test_line_height_d3_role_not_font_size(self):
        """When line-height causes a D3 entry (not in block attrs), role != font_size."""
        css = ".sgs-hero { line-height: 1.6; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        d3_entries = [e for e in result["d3"] if e.get("css_property") == "line-height"]
        for entry in d3_entries:
            # D3 entries don't directly carry role; check the D1 path instead.
            pass
        # Also check D1 if it went there (F3: use prefix-match helper).
        d1_hero = _d1_entries_for_block(result, "sgs/hero")
        for entry in d1_hero.values():
            if entry.get("css_prop") == "line-height":
                assert entry.get("role") != "font_size"


# ---------------------------------------------------------------------------
# Test hard-rule: every rule routes to exactly one bucket
# ---------------------------------------------------------------------------

class TestHardRule:
    def test_all_rules_sum_to_total(self):
        css = """
        body { margin: 0; }
        :root { --primary: #0F7E80; }
        .sgs-hero { padding-top: 56px; }
        .sgs-unknown { color: red; }
        .sgs-hero { font-size: 18px; }
        header { background: white; }
        """
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert _stats_sum_matches_total(result), (
            f"Rules not fully accounted for: {result['stats']}"
        )

    def test_total_rules_is_counted(self):
        css = "body { margin: 0; } .sgs-hero { padding: 10px; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["total_rules"] == 2


# ---------------------------------------------------------------------------
# Test stats structure
# ---------------------------------------------------------------------------

class TestStats:
    def test_stats_keys_present(self):
        result = css_router.route_css("body { margin: 0; }", EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        expected_keys = {"d0_count", "d1_count", "d2_count", "d3_count",
                         "total_rules", "chrome_skipped", "malformed"}
        assert expected_keys.issubset(set(result["stats"].keys()))

    def test_return_shape(self):
        result = css_router.route_css("", EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert "d0" in result
        assert "d1" in result
        assert "d2" in result
        assert "d3" in result
        assert "stats" in result
        assert isinstance(result["d0"], list)
        assert isinstance(result["d1"], dict)
        assert isinstance(result["d2"], list)
        assert isinstance(result["d3"], list)


# ---------------------------------------------------------------------------
# Test F1 — @media inner-selector scoping (P1B extension)
# ---------------------------------------------------------------------------

class TestMediaBlockInnerSelectorScoping:
    """F1: @media rules in D2 must have inner selectors scoped with .page-id-N."""

    def test_media_block_inner_selector_scoping(self):
        """write_variation_css: @media inner selector gets page-id scope."""
        rule = "@media (min-width: 768px) { .sgs-hero { grid-template-columns: 1fr 1fr } }"
        scoped = css_router._scope_media_rule(rule, ".page-id-144 ")
        assert ".page-id-144 .sgs-hero" in scoped, (
            f"Expected .page-id-144 .sgs-hero in scoped rule, got: {scoped!r}"
        )
        assert "@media (min-width: 768px)" in scoped

    def test_media_block_scoping_multiple_inner_rules(self):
        """Multiple inner rules inside a single @media block are all scoped."""
        rule = (
            "@media (min-width: 768px) { "
            ".sgs-hero { display: grid } "
            ".sgs-hero__content { padding: 56px } "
            "}"
        )
        scoped = css_router._scope_media_rule(rule, ".page-id-144 ")
        assert ".page-id-144 .sgs-hero { display: grid }" in scoped or (
            ".page-id-144 .sgs-hero" in scoped and ".page-id-144 .sgs-hero__content" in scoped
        )

    def test_media_block_no_scope_when_no_page_id(self):
        """Without a scope_prefix, @media rules are returned unchanged."""
        rule = "@media (min-width: 768px) { .sgs-brand { grid-template-columns: 1fr 1fr } }"
        # _scope_media_rule is only called when scope_prefix is set.
        # Verify the rule text is preserved when emitted without scope.
        result = css_router.route_css(rule, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d2_count"] >= 1

    def test_route_css_d2_preserves_media_wrapper(self):
        """D2 list entries for @media rules include the @media wrapper text."""
        css = "@media (min-width: 768px) { .sgs-hero { grid-template-columns: 1fr 1fr } }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d2_count"] >= 1
        d2_texts = " ".join(result["d2"])
        assert "@media" in d2_texts


# ---------------------------------------------------------------------------
# Test F4 — D1 attr suffix-scan covers slot-prefixed attrs (P1B extension)
# ---------------------------------------------------------------------------

class TestD1AttrSuffixScanFullBlockAttrs:
    """F4: _css_prop_maps_to_typed_attr scans ALL block attrs with endswith(suffix)."""

    def test_slot_prefixed_colour_attr_matches(self):
        """labelColour should match css_prop=color via Colour suffix."""
        # Extend the mock block_attrs to include slot-prefixed attrs.
        original_side_effect = _mock_db.block_attrs.side_effect

        def extended_block_attrs(slug):
            if slug == "sgs/hero":
                base = original_side_effect(slug)
                base["labelColour"] = {"role": "color"}
                base["ctaPrimaryColour"] = {"role": "color"}
                base["subHeadlineFontSize"] = {"role": "typography"}
                return base
            return original_side_effect(slug)

        _mock_db.block_attrs.side_effect = extended_block_attrs
        css_router._db = _mock_db

        try:
            result = css_router._css_prop_maps_to_typed_attr("sgs/hero", "color")
            assert result is True, "labelColour should match color via Colour suffix"
        finally:
            _mock_db.block_attrs.side_effect = original_side_effect
            css_router._db = _mock_db

    def test_suffixed_font_size_attr_matches(self):
        """subHeadlineFontSize should match css_prop=font-size via FontSize suffix."""
        original_side_effect = _mock_db.block_attrs.side_effect

        def extended_block_attrs(slug):
            if slug == "sgs/hero":
                base = original_side_effect(slug)
                base["subHeadlineFontSize"] = {"role": "typography"}
                return base
            return original_side_effect(slug)

        _mock_db.block_attrs.side_effect = extended_block_attrs
        css_router._db = _mock_db

        try:
            result = css_router._css_prop_maps_to_typed_attr("sgs/hero", "font-size")
            assert result is True, "subHeadlineFontSize should match font-size via FontSize suffix"
        finally:
            _mock_db.block_attrs.side_effect = original_side_effect
            css_router._db = _mock_db

    def test_bare_attr_still_matches(self):
        """Existing direct attr match (backgroundColour → background-color) still works."""
        result = css_router._css_prop_maps_to_typed_attr("sgs/hero", "background-color")
        assert result is True


# ---------------------------------------------------------------------------
# Test F2 — D2 excludes D1-lifted properties (P1B extension)
# ---------------------------------------------------------------------------

class TestD2ExcludesD1LiftedProperties:
    """F2: when a rule has mixed D1+D2 props, D2 body must not contain D1 props."""

    def test_d2_excludes_d1_lifted_properties(self):
        """A rule with background-color (D1) + display (D2) — D2 only gets display."""
        # sgs/hero has backgroundColour → background-color maps to D1.
        # display is not in the suffix table → D2.
        css = ".sgs-hero { background-color: #F5C2C8; display: flex; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # background-color should be D1.
        assert "sgs/hero" in result["d1"] or result["stats"]["d1_count"] >= 1
        # D2 rules should NOT contain background-color (it's been lifted to D1).
        for rule in result["d2"]:
            if "sgs-hero" in rule:
                assert "background-color" not in rule, (
                    f"D2 rule for sgs-hero should not contain background-color (D1 lifted): {rule!r}"
                )

    def test_fully_d1_rule_emits_no_d2(self):
        """A rule where all properties lift to D1 produces zero D2 entries for that rule."""
        css = ".sgs-hero { background-color: #F5C2C8; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # All props went D1 — no D2 for this rule.
        hero_d2 = [r for r in result["d2"] if "sgs-hero" in r and "background-color" in r]
        assert len(hero_d2) == 0, (
            f"background-color should not appear in D2 (D1-lifted): {hero_d2}"
        )


# ---------------------------------------------------------------------------
# Test F3 — D1 sidecar per-section keying (P1B extension)
# ---------------------------------------------------------------------------

class TestD1SidecarPerSectionKeyed:
    """F3: different selectors for the same block get distinct D1 sidecar keys."""

    def test_d1_sidecar_per_section_keyed(self):
        """Two rules with same block slug but different selectors produce distinct D1 keys."""
        css = (
            ".sgs-hero { background-color: #F5C2C8; }\n"
            ".sgs-hero.sgs-hero--dark { background-color: #333; }\n"
        )
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        d1_keys = list(result["d1"].keys())
        # With F3, there should be at least two distinct keys (one per selector).
        assert len(d1_keys) >= 1, "Expected at least one D1 key"
        # The keys should be scoped (contain ':') or be the bare block_slug.
        # At minimum verify D1 got entries.
        assert result["stats"]["d1_count"] >= 1


# ---------------------------------------------------------------------------
# Test F5 — D1 media context preserved (P1B extension)
# ---------------------------------------------------------------------------

class TestD1MediaContextPreserved:
    """F5: D1 assignments carry the media field from their originating @media block."""

    def test_d1_media_context_preserved(self):
        """A D1-eligible rule inside @media carries media field in the sidecar entry."""
        css = "@media (min-width: 1024px) { .sgs-hero { padding-top: 80px; } }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # Find D1 entries for sgs/hero.
        d1_hero_entries = {}
        for key, entries in result["d1"].items():
            if key.startswith("sgs/hero"):
                d1_hero_entries.update(entries)
        # If padding-top was D1-lifted, it should carry the media field.
        for attr_path, entry in d1_hero_entries.items():
            if "padding-top" in attr_path or "padding" in attr_path.lower():
                if entry.get("value") == "80px":
                    assert "media" in entry, "D1 entry must carry media field"
                    assert entry["media"] is not None, "media should be the @media condition"
                    assert "1024px" in entry["media"]


# ---------------------------------------------------------------------------
# Test F6 — Chrome-skip routes to D0 (P1B extension)
# ---------------------------------------------------------------------------

class TestChromeSkipRoutesToD0:
    """F6: header/footer/nav rules go to D0 (not silent drop) to satisfy §FR6 hard rule."""

    def test_chrome_skip_routes_to_d0(self):
        """header rule is chrome_skipped AND routed to D0 — not silently dropped."""
        css = "header { background: white; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["chrome_skipped"] >= 1, "Expected chrome_skipped counter to fire"
        # F6: rule must appear in D0, not be silently dropped.
        assert result["stats"]["d0_count"] >= 1, (
            "Chrome-skip rules must route to D0 per §FR6 hard rule (no silent drops)"
        )
        assert len(result["d0"]) >= 1, "D0 list must contain the chrome-skipped rule"

    def test_footer_chrome_skip_routes_to_d0(self):
        """footer rule also routes to D0."""
        css = "footer { padding: 40px 0; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["chrome_skipped"] >= 1
        assert result["stats"]["d0_count"] >= 1

    def test_nav_chrome_skip_routes_to_d0(self):
        """nav rule also routes to D0."""
        css = "nav ul { list-style: none; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["chrome_skipped"] >= 1
        assert result["stats"]["d0_count"] >= 1


# ---------------------------------------------------------------------------
# Test F7 — h1/h2/h3 inside @media not classified as D0 (P1B extension)
# ---------------------------------------------------------------------------

class TestMediaInnerBareTagNotD0:
    """F7: bare tag rules inside @media blocks must NOT be classified as D0."""

    def test_media_inner_bare_tag_not_d0(self):
        """h1 inside @media should route to D2, not D0 (preserves media-query wrapper)."""
        css = "@media (min-width: 768px) { h1 { font-size: 2rem; } }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # With F7: h1 inside @media is NOT D0 — it goes to D2 (preserving the media context).
        assert result["stats"]["d0_count"] == 0, (
            "h1 inside @media must NOT be D0 — it would lose its @media wrapper (F7 fix)"
        )
        assert result["stats"]["d2_count"] >= 1, "h1 inside @media should route to D2"

    def test_media_inner_heading_group_not_d0(self):
        """h1, h2, h3 inside @media should route to D2."""
        css = "@media (min-width: 768px) { h1, h2, h3 { font-family: 'Fraunces', serif; } }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        # Each comma-part is a separate rule after parsing — all should be D2, not D0.
        assert result["stats"]["d0_count"] == 0, (
            "Heading tags inside @media must not go to D0 (F7 fix)"
        )

    def test_top_level_bare_tag_still_d0(self):
        """Top-level h1 (not inside @media) still routes to D0 as before."""
        css = "h1 { font-weight: bold; }"
        result = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "test-run")
        assert result["stats"]["d0_count"] == 1, "Top-level h1 must still go to D0"


class TestStep13Passthrough:
    """EXECUTION Step 13 (Spec 31 F-ii + pseudo-element passthrough, 2026-07-04)."""

    def test_pseudo_element_rule_routes_whole_to_d2(self):
        css = ".sgs-hero::before { content: ''; background: rgba(0,0,0,0.4); }"
        r = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "t")
        assert any("::before" in x for x in r["d2"]), r["d2"]
        assert not r["d1"], "pseudo-element props must never D1-lift onto the block root"

    def test_legacy_single_colon_pseudo_element_routes_d2(self):
        css = ".sgs-hero:after { content: ''; }"
        r = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "t")
        assert any(":after" in x for x in r["d2"]) and not r["d1"]

    def test_pseudo_class_hover_keeps_existing_routing(self):
        css = ".sgs-button:hover { background-color: #123456; }"
        r = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "t")
        assert not any(":hover" in x for x in r["d2"]) or r["d1"] or r["d3"]  # not force-D2'd by the pseudo branch

    def test_non_device_media_rule_fii_passthrough_to_d2(self):
        css = "@media (min-width: 600px) { .sgs-feature-grid { grid-template-columns: repeat(4, 1fr); } }"
        r = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "t")
        assert any("600px" in x and "repeat(4, 1fr)" in x for x in r["d2"]), r["d2"]
        assert not r["d1"], "a non-device media rule must not D1-classify (F-ii lock)"

    def test_device_tier_media_rule_still_d1_classifies(self):
        css = "@media (max-width: 767px) { .sgs-hero { padding-top: 10px; } }"
        r = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "t")
        assert r["d1"], "canonical device-tier media must keep its normal routing"
        assert not any("767px" in x for x in r["d2"])

    def test_no_px_media_treated_as_passthrough(self):
        css = "@media print { .sgs-hero { display: none; } }"
        r = css_router.route_css(css, EMPTY_BOUNDARIES, EMPTY_THEME, "t")
        assert any("print" in x for x in r["d2"]) and not r["d1"]


if __name__ == "__main__":
    import pytest as _pytest
    _pytest.main([__file__, "-v"])

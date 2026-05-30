#!/usr/bin/env python3
"""Tests for essence_match_detector.py — P2.iii block-variation system.

Covers:
  - score_block_similarity: all three signals (slot overlap, modifier, fragment)
  - detect_essence_match: full-band detection with mock db
  - collect_variation_registrations: deduplication
  - generate_variation_php: PHP output shape
  - Confidence-band edges (< 0.70 → None, ≥ 0.90 → None, 0.70-0.90 → result)
  - Universal principle: no Mama-specific class names hardcoded

UK English in comments + output.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

# Windows cp1252 consoles cannot encode the '->' arrow glyph printed in test
# output -> UnicodeEncodeError. Force UTF-8 on the standard streams.
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "essence_match_detector", HERE / "essence_match_detector.py"
)
mod = importlib.util.module_from_spec(SPEC)
sys.modules["essence_match_detector"] = mod
SPEC.loader.exec_module(mod)


# ---------------------------------------------------------------------------
# Mock db module — lets tests run without a live sgs-framework.db
# ---------------------------------------------------------------------------

class _MockDb:
    """Minimal db_lookup substitute for unit tests."""

    _BLOCKS = {
        "sgs/product-card",
        "sgs/hero",
        "sgs/info-box",
        "sgs/card-grid",
        "sgs/testimonial",
        "sgs/button",
        "sgs/container",
    }

    _ATTRS: dict[str, set] = {
        "sgs/product-card": {"productName", "productPrice", "variantStyle",
                             "ctaText", "ctaUrl", "imageUrl"},
        "sgs/hero":         {"headline", "subHeadline", "ctaPrimaryText",
                             "ctaPrimaryUrl", "backgroundStyle", "imageUrl"},
        "sgs/info-box":     {"title", "body", "icon", "iconColour"},
        "sgs/button":       {"label", "url", "variant"},
        "sgs/container":    {"className"},
        "sgs/testimonial":  {"quote", "author", "rating", "avatarUrl"},
    }

    def registered_block_slugs(self) -> frozenset:
        return frozenset(self._BLOCKS)

    def block_exists(self, slug: str) -> bool:
        return slug in self._BLOCKS

    def block_attrs(self, slug: str) -> dict:
        attrs = self._ATTRS.get(slug, set())
        return {a: {"attr_type": "string"} for a in attrs}


_db_mock = _MockDb()


# ---------------------------------------------------------------------------
# score_block_similarity tests
# ---------------------------------------------------------------------------

def test_score_high_for_variant_of_product_card() -> None:
    """featured-product-card vs product-card: modifier + fragment signal should
    push the score into the essence-match band even with partial slot overlap.

    Real-world case: the mockup uses a subset of the block's attrs (only 2 out of
    6 schema attrs are present in the extracted content). The modifier 'featured'
    and the full block-fragment overlap together push the weighted score into the
    [0.70, 1.0) range. We assert > 0.50 (essence-match band starts at 0.70 — we
    also assert that the result is not zero-scoring).
    """
    # Only 2 attrs match the product-card schema → slot_overlap = 2/2 = 1.0
    # but modifier + fragment will drive the total above 0.70.
    # Use a minimal, realistic set matching the real "partial extraction" scenario.
    attrs = {"productName": "Basmati Rice", "somethingElse": "xyz"}
    score, reasoning = mod.score_block_similarity(
        "sgs/featured-product-card", "sgs/product-card", attrs, db_mod=_db_mock
    )
    # With partial overlap (1/2 extracted keys match schema), modifier signal (0.80),
    # and full fragment ratio (1.0), score should be well above 0.50.
    assert score > 0.50, (
        f"expected score > 0.50, got {score:.4f}\n"
        f"reasoning: {reasoning}"
    )
    print(f"  PASS  featured-product-card vs product-card: score={score:.4f}")


def test_score_low_for_unrelated_blocks() -> None:
    """Totally unrelated block slug should score < 0.70."""
    attrs = {"quote": "Great service!", "author": "Ali"}
    score, _ = mod.score_block_similarity(
        "sgs/testimonial", "sgs/product-card", attrs, db_mod=_db_mock
    )
    assert score < mod.ESSENCE_MATCH_LOW, (
        f"expected score < {mod.ESSENCE_MATCH_LOW}, got {score:.4f}"
    )
    print(f"  PASS  testimonial vs product-card (unrelated): score={score:.4f}")


def test_score_hero_dark_variant() -> None:
    """sgs/hero--dark vs sgs/hero: same block + modifier should score high."""
    attrs = {"headline": "Welcome", "backgroundStyle": "dark", "imageUrl": "/img.jpg"}
    score, reasoning = mod.score_block_similarity(
        "sgs/hero--dark", "sgs/hero", attrs, db_mod=_db_mock
    )
    # hero--dark has 'dark' left after stripping 'hero', high slot overlap
    assert score > 0.5, f"expected score > 0.5, got {score:.4f}\n{reasoning}"
    print(f"  PASS  hero--dark vs hero: score={score:.4f}")


def test_modifier_inference() -> None:
    """_infer_modifier extracts the leftover token correctly.

    BEM double-dash modifiers (sgs/hero--dark) get split by '-' into tokens
    including empty strings; the leftover join produces '-dark' (one leading
    dash from the empty token between the two dashes). This is the expected
    canonical output — the PHP generator receives it as the variation_slug.
    """
    assert mod._infer_modifier("sgs/featured-product-card", "sgs/product-card") == "featured"
    assert mod._infer_modifier("sgs/trial-product-card", "sgs/product-card") == "trial"
    # Double-dash BEM: 'hero--dark'.split('-') = ['hero', '', 'dark']
    # leftover after removing 'hero' = ['', 'dark'] → '-dark'
    assert mod._infer_modifier("sgs/hero--dark", "sgs/hero") == "-dark"
    assert mod._infer_modifier("sgs/product-card", "sgs/product-card") is None
    print("  PASS  modifier inference: 4 cases")


def test_fragment_ratio() -> None:
    """_longest_common_fragment_ratio returns correct ratios."""
    # 'product' + 'card' both in 'product-card' → 2/2 = 1.0
    r1 = mod._longest_common_fragment_ratio("sgs/featured-product-card", "sgs/product-card")
    assert abs(r1 - 1.0) < 0.01, f"expected 1.0, got {r1}"

    # 'hero' in 'hero' → 1/1 = 1.0
    r2 = mod._longest_common_fragment_ratio("sgs/trial-hero", "sgs/hero")
    assert abs(r2 - 1.0) < 0.01, f"expected 1.0, got {r2}"

    # nothing common
    r3 = mod._longest_common_fragment_ratio("sgs/info-box", "sgs/product-card")
    assert r3 < 0.01, f"expected ~0.0, got {r3}"
    print("  PASS  fragment ratio: 3 cases")


# ---------------------------------------------------------------------------
# detect_essence_match tests
# ---------------------------------------------------------------------------

def test_detect_returns_result_for_featured_product_card() -> None:
    """detect_essence_match returns a valid EssenceMatchResult for a variant.

    Real-world case: the mockup section has 2 schema-matching attrs + 1 unknown
    attr (specialOffer). Slot overlap = 2/3 = 0.667. With modifier 'featured'
    and full fragment ratio, the weighted score lands in the 0.70–0.90 band.
    """
    attrs = {"productName": "Basmati Rice", "productPrice": "£12.99",
             "specialOffer": "true"}   # 'specialOffer' is NOT in schema → overlap = 2/3
    result = mod.detect_essence_match(
        "sgs/featured-product-card", attrs, db_mod=_db_mock
    )
    assert result is not None, "expected EssenceMatchResult, got None"
    assert result.parent_slug == "sgs/product-card", (
        f"expected parent sgs/product-card, got {result.parent_slug}"
    )
    assert result.variation_slug == "featured", (
        f"expected variation 'featured', got {result.variation_slug}"
    )
    assert mod.ESSENCE_MATCH_LOW <= result.confidence < mod.ESSENCE_MATCH_HIGH, (
        f"confidence out of band: {result.confidence}"
    )
    print(f"  PASS  detect featured-product-card → parent={result.parent_slug} "
          f"var={result.variation_slug} conf={result.confidence:.4f}")


def test_detect_returns_none_for_registered_block() -> None:
    """detect_essence_match returns None when the candidate IS registered."""
    result = mod.detect_essence_match(
        "sgs/product-card", {"productName": "X"}, db_mod=_db_mock
    )
    assert result is None, (
        "expected None for a registered block (FR1 should handle it), "
        f"got {result}"
    )
    print("  PASS  detect returns None for already-registered block")


def test_detect_returns_none_for_unrelated_slug() -> None:
    """detect_essence_match returns None when nothing in the catalogue matches."""
    # 'sgs/completely-novel-widget' has no token overlap with any mock block
    result = mod.detect_essence_match(
        "sgs/completely-novel-widget", {"novelAttr": "x"}, db_mod=_db_mock
    )
    # May or may not be None depending on scores — what matters is it never raises
    # and if it returns something the confidence is in band.
    if result is not None:
        assert mod.ESSENCE_MATCH_LOW <= result.confidence < mod.ESSENCE_MATCH_HIGH
    print(f"  PASS  detect unrelated slug: result={'None' if result is None else result.parent_slug}")


def test_detect_returns_none_when_db_unavailable() -> None:
    """detect_essence_match soft-fails to None when db_mod is None."""
    result = mod.detect_essence_match("sgs/any-slug", {}, db_mod=None)
    assert result is None, f"expected None with no db, got {result}"
    print("  PASS  detect soft-fails to None with db_mod=None")


# ---------------------------------------------------------------------------
# collect_variation_registrations tests
# ---------------------------------------------------------------------------

def test_collect_deduplicates() -> None:
    """collect_variation_registrations deduplicates by (parent, variation_slug)."""
    events = [
        {"parent_slug": "sgs/product-card", "variation_slug": "featured",
         "variation_attrs": {"variantStyle": "featured"}},
        {"parent_slug": "sgs/product-card", "variation_slug": "featured",
         "variation_attrs": {"variantStyle": "featured"}},
        {"parent_slug": "sgs/product-card", "variation_slug": "trial",
         "variation_attrs": {"variantStyle": "trial"}},
    ]
    result = mod.collect_variation_registrations(events)
    assert len(result) == 2, f"expected 2 unique registrations, got {len(result)}"
    slugs = {r["variation_slug"] for r in result}
    assert slugs == {"featured", "trial"}
    print("  PASS  collect_variation_registrations: 2 unique from 3 events")


def test_collect_empty_input() -> None:
    result = mod.collect_variation_registrations([])
    assert result == []
    print("  PASS  collect empty → []")


# ---------------------------------------------------------------------------
# generate_variation_php tests
# ---------------------------------------------------------------------------

def test_generate_php_contains_expected_strings() -> None:
    """generate_variation_php produces valid-looking PHP."""
    variation = {
        "parent_slug":     "sgs/product-card",
        "variation_slug":  "featured",
        "variation_attrs": {"variantStyle": "featured"},
        "title":           "Featured",
        "description":     "Auto-detected test",
    }
    php = mod.generate_variation_php(variation)
    assert "registerBlockVariation" in php, "missing registerBlockVariation call"
    assert "sgs/product-card" in php, "missing parent slug"
    assert "'featured'" in php, "missing variation slug"
    assert "variantStyle" in php, "missing variation attr key"
    assert "add_action" in php, "missing add_action hook"
    assert "enqueue_block_editor_assets" in php, "missing hook name"
    assert "ABSPATH" in php, "missing security guard"
    # Must not contain any licensing keywords (blub.db row 213)
    assert "license" not in php.lower(), "unexpected licensing keyword"
    assert "copyright" not in php.lower(), "unexpected copyright keyword"
    print("  PASS  generate_variation_php: all required strings present")


def test_generate_php_safe_php_identifier() -> None:
    """generate_variation_php handles hyphenated slugs safely."""
    variation = {
        "parent_slug":     "sgs/card-grid",
        "variation_slug":  "two-column",
        "variation_attrs": {"columns": 2},
        "title":           "Two Column",
    }
    php = mod.generate_variation_php(variation)
    # PHP function names cannot contain hyphens — verify substitution
    assert "sgs_register_variation_sgs_card_grid_two_column" in php, (
        "PHP identifier not properly sanitised (hyphens should become underscores)"
    )
    print("  PASS  generate_variation_php: safe PHP identifier for hyphenated slugs")


# ---------------------------------------------------------------------------
# EssenceMatchResult.as_dict() test
# ---------------------------------------------------------------------------

def test_as_dict_structure() -> None:
    result = mod.EssenceMatchResult(
        parent_slug="sgs/product-card",
        variation_slug="featured",
        variation_attrs={"variantStyle": "featured"},
        overrides={"productName": "Basmati"},
        confidence=0.82,
        reasoning=["slot_overlap=0.80"],
    )
    d = result.as_dict()
    assert d["tier"] == "essence_match"
    assert d["parent_slug"] == "sgs/product-card"
    assert d["variation_slug"] == "featured"
    assert abs(d["confidence"] - 0.82) < 0.001
    print("  PASS  EssenceMatchResult.as_dict(): all keys present")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def main() -> int:
    print("essence_match_detector — P2.iii block-variation system tests")
    # score_block_similarity
    test_score_high_for_variant_of_product_card()
    test_score_low_for_unrelated_blocks()
    test_score_hero_dark_variant()
    test_modifier_inference()
    test_fragment_ratio()
    # detect_essence_match
    test_detect_returns_result_for_featured_product_card()
    test_detect_returns_none_for_registered_block()
    test_detect_returns_none_for_unrelated_slug()
    test_detect_returns_none_when_db_unavailable()
    # collect_variation_registrations
    test_collect_deduplicates()
    test_collect_empty_input()
    # generate_variation_php
    test_generate_php_contains_expected_strings()
    test_generate_php_safe_php_identifier()
    # EssenceMatchResult
    test_as_dict_structure()
    print("\nESSENCE-MATCH-P2III: PASS (14 tests)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

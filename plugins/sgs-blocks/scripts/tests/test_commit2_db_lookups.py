"""test_commit2_db_lookups.py — Unit tests for the three Commit 2 DB-lookup functions.

Tests:
  1. slot_has_equivalent_block — CONTENT-fork predicate (FR-22-5.3)
  2. attr_for_layer_property   — per-block layer→attr resolver (DEC-1/DEC-3, D194)
  3. child_block_for_parent_token — parent-scoped child-block resolver (FR-22-5.3 clause 5)

All tests hit the real sgs-framework.db (same pattern as test_converter_conformance.py
TestDbInvariants).  Tests are skipped when the DB is unavailable (offline / path not found).

UK English throughout.
Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_commit2_db_lookups.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# sys.path — add scripts root so orchestrator.converter_v2 resolves
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]        # small-giants-wp/
_SCRIPTS_ROOT = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"

if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

_SGS_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# ---------------------------------------------------------------------------
# Skip guard — applied to every test class via autouse fixture
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True, scope="module")
def _skip_if_no_db() -> None:
    """Skip the entire module when sgs-framework.db is not available."""
    if not _SGS_DB_PATH.exists():
        pytest.skip(
            f"sgs-framework.db not found at {_SGS_DB_PATH} — "
            "Commit 2 DB-lookup tests require the live DB.  Run /sgs-update to populate."
        )


# ---------------------------------------------------------------------------
# Import under test
# ---------------------------------------------------------------------------

from orchestrator.converter_v2.db_lookup import (  # noqa: E402
    attr_for_layer_property,
    child_block_for_parent_token,
    slot_has_equivalent_block,
)


# ===========================================================================
# 1. slot_has_equivalent_block
# ===========================================================================

class TestSlotHasEquivalentBlock:
    """FR-22-5.3 CONTENT-fork predicate.

    Contract: SELECT 1 FROM block_attributes WHERE block_slug=?
              AND canonical_slot=? AND role IN (<content-bearing roles>) LIMIT 1.
    """

    def test_true_for_known_content_bearing_slot(self) -> None:
        """sgs/product-card + canonical_slot='text' has role='text-content' → True.

        DB evidence: block_attributes WHERE block_slug='sgs/product-card'
        AND attr_name='description' has canonical_slot='text', role='text-content'.
        'text-content' IS in the content-bearing roles allowlist.
        """
        assert slot_has_equivalent_block("sgs/product-card", "text") is True, (
            "sgs/product-card has a 'description' attr with canonical_slot='text' "
            "and role='text-content' (content-bearing).  "
            "slot_has_equivalent_block must return True for this pair."
        )

    def test_true_for_hero_heading_slot(self) -> None:
        """sgs/hero + canonical_slot='heading' has role='text-content' → True.

        DB evidence: sgs/hero.headline has canonical_slot='heading', role='text-content'.
        """
        assert slot_has_equivalent_block("sgs/hero", "heading") is True, (
            "sgs/hero.headline: canonical_slot='heading', role='text-content'. "
            "slot_has_equivalent_block must return True."
        )

    def test_false_for_content_slot_on_hero(self) -> None:
        """sgs/hero + canonical_slot='content' must return False.

        Critical regression guard (Spec 22 STAGE1-DESIGN.md §Commit 2 build
        contract): ALL rows on sgs/hero with canonical_slot='content' carry
        role='layout', which is classified 'styling-behaviour' — NOT
        content-bearing.  If this returns True the cross-node step would
        mis-route contentPadding* CSS to an InnerBlock rather than the parent's
        layout attrs.

        DB evidence: SELECT DISTINCT role FROM block_attributes
        WHERE block_slug='sgs/hero' AND canonical_slot='content' → ['layout'].
        """
        assert slot_has_equivalent_block("sgs/hero", "content") is False, (
            "sgs/hero attrs with canonical_slot='content' ALL have role='layout' "
            "(styling-behaviour, NOT content-bearing).  "
            "slot_has_equivalent_block must return False here — "
            "a True result would mis-route contentPadding* CSS to an InnerBlock."
        )

    def test_false_for_nonexistent_slot(self) -> None:
        """A slot name that no block_attributes row carries → False."""
        assert slot_has_equivalent_block("sgs/hero", "totally-nonexistent-slot-xyz") is False

    def test_false_for_empty_inputs(self) -> None:
        """Empty / None inputs return False without raising."""
        assert slot_has_equivalent_block("", "heading") is False
        assert slot_has_equivalent_block("sgs/hero", "") is False

    def test_false_for_nonexistent_block(self) -> None:
        """A block slug with no DB rows → False."""
        assert slot_has_equivalent_block("sgs/does-not-exist", "content") is False


# ===========================================================================
# 2. attr_for_layer_property
# ===========================================================================

class TestAttrForLayerProperty:
    """Per-block layer→attr resolver (DEC-1/DEC-3, D194).

    Verifies the three layer prefix families:
      OUTER   → '' (unprefixed attrs)
      CONTENT → 'content' prefix
      GRID    → 'gridItem' prefix

    Also verifies the max-width ↔ contentWidth mapping
    (_CONTENT_LAYER_MAX_WIDTH_EQUIV, mirrors convert.py:3800).
    """

    # ---- CONTENT layer ------------------------------------------------------

    def test_content_max_width_resolves_to_content_width_on_hero(self) -> None:
        """(sgs/hero, CONTENT, max-width) → 'contentWidth'.

        Key test: max-width on a content-area element IS the content-width
        constraint.  sgs/hero.contentWidth is registered via the 'width' suffix
        family, NOT 'max-width' → MaxWidth.  The function must expand to
        include 'width' rows when css_property='max-width' and layer='CONTENT'
        (_CONTENT_LAYER_MAX_WIDTH_EQUIV), matching convert.py line 3800 semantics.
        """
        result = attr_for_layer_property("sgs/hero", "CONTENT", "max-width")
        assert result == "contentWidth", (
            f"Expected 'contentWidth', got {result!r}.  "
            "sgs/hero.contentWidth is the content-area width attr; "
            "max-width on a __content element IS the content-width constraint "
            "(mirrors convert.py:3800).  Check _CONTENT_LAYER_MAX_WIDTH_EQUIV handling."
        )

    def test_content_padding_top_resolves_on_hero(self) -> None:
        """(sgs/hero, CONTENT, padding-top) → 'contentPaddingTop'."""
        result = attr_for_layer_property("sgs/hero", "CONTENT", "padding-top")
        assert result == "contentPaddingTop", (
            f"Expected 'contentPaddingTop', got {result!r}.  "
            "sgs/hero has contentPadding* attrs registered with role='layout'."
        )

    def test_content_max_width_on_block_without_content_width_returns_none(self) -> None:
        """A block with no content* layout attrs → None.

        sgs/button has no contentWidth attr (it is a leaf block, not a
        container-mirror composite).
        """
        result = attr_for_layer_property("sgs/button", "CONTENT", "max-width")
        assert result is None, (
            f"Expected None for sgs/button CONTENT max-width, got {result!r}.  "
            "sgs/button is not a container-mirror composite and has no content* layout attrs."
        )

    # ---- OUTER layer --------------------------------------------------------

    def test_outer_max_width_resolves_to_max_width_on_container(self) -> None:
        """(sgs/container, OUTER, max-width) → 'maxWidth'.

        sgs/container.maxWidth is the unprefixed outer width constraint.
        property_suffixes for max-width has suffix 'MaxWidth' → camelCase 'maxWidth'.
        """
        result = attr_for_layer_property("sgs/container", "OUTER", "max-width")
        assert result == "maxWidth", (
            f"Expected 'maxWidth', got {result!r}.  "
            "sgs/container.maxWidth should resolve via OUTER layer + max-width suffix 'MaxWidth'."
        )

    def test_outer_gap_resolves_on_container(self) -> None:
        """(sgs/container, OUTER, gap) → 'gap'."""
        result = attr_for_layer_property("sgs/container", "OUTER", "gap")
        assert result == "gap", (
            f"Expected 'gap', got {result!r}.  "
            "sgs/container.gap is the unprefixed OUTER gap attr."
        )

    # ---- GRID layer ---------------------------------------------------------

    def test_grid_layer_resolves_grid_item_padding_on_hero(self) -> None:
        """(sgs/hero, GRID, padding) → 'gridItemPadding'.

        sgs/hero has gridItemPadding registered as a per-grid-item attr.
        """
        result = attr_for_layer_property("sgs/hero", "GRID", "padding")
        assert result == "gridItemPadding", (
            f"Expected 'gridItemPadding', got {result!r}.  "
            "sgs/hero.gridItemPadding is the GRID-layer padding attr."
        )

    # ---- None returns -------------------------------------------------------

    def test_returns_none_for_nonexistent_block(self) -> None:
        """Non-existent block slug → None."""
        assert attr_for_layer_property("sgs/does-not-exist", "CONTENT", "max-width") is None

    def test_returns_none_for_unknown_layer(self) -> None:
        """Unknown layer name → None (soft-fail, no raise)."""
        assert attr_for_layer_property("sgs/hero", "UNKNOWN_LAYER", "max-width") is None

    def test_returns_none_for_empty_inputs(self) -> None:
        """Empty inputs → None without raising."""
        assert attr_for_layer_property("", "CONTENT", "max-width") is None
        assert attr_for_layer_property("sgs/hero", "CONTENT", "") is None


# ===========================================================================
# 3. child_block_for_parent_token
# ===========================================================================

class TestChildBlockForParentToken:
    """Parent-scoped child-block resolver (FR-22-5.3 clause 5).

    Verifies the two confirmed collision-resolution cases from the build contract
    plus the sgs/tabs edge case, and a None-return for an unregistered token.
    """

    def test_accordion_item_resolves_to_accordion_item(self) -> None:
        """sgs/accordion + 'item' → 'sgs/accordion-item' (NOT 'sgs/info-box').

        This is the first confirmed collision: the global 'card' slot has 'item'
        in its aliases and resolves to sgs/info-box.  The parent-scoped lookup
        must beat the global alias.
        """
        result = child_block_for_parent_token("sgs/accordion", "item")
        assert result == "sgs/accordion-item", (
            f"Expected 'sgs/accordion-item', got {result!r}.  "
            "The global 'card' slot aliases include 'item' → sgs/info-box; "
            "parent-scoped resolution must override this to sgs/accordion-item."
        )

    def test_form_step_resolves_to_form_step(self) -> None:
        """sgs/form + 'step' → 'sgs/form-step' (NOT 'sgs/process-steps').

        Second confirmed collision: a global 'step' alias maps to sgs/process-steps.
        Parent-scoped resolution must return sgs/form-step.
        """
        result = child_block_for_parent_token("sgs/form", "step")
        assert result == "sgs/form-step", (
            f"Expected 'sgs/form-step', got {result!r}.  "
            "A global step alias may map to sgs/process-steps; "
            "parent-scoped resolution must return sgs/form-step."
        )

    def test_tabs_tab_resolves_to_tab(self) -> None:
        """sgs/tabs + 'tab' → 'sgs/tab'.

        Edge case: child slug does NOT share the parent name prefix
        ('sgs/tab' rather than 'sgs/tabs-tab').  The SQL CASE expression
        falls through to ``substr(slug, 5)`` = 'tab'.
        """
        result = child_block_for_parent_token("sgs/tabs", "tab")
        assert result == "sgs/tab", (
            f"Expected 'sgs/tab', got {result!r}.  "
            "sgs/tab is a child of sgs/tabs; its token is 'tab' "
            "(child slug does not share the parent prefix 'tabs-')."
        )

    def test_form_field_text_resolves(self) -> None:
        """sgs/form + 'field-text' → 'sgs/form-field-text'."""
        result = child_block_for_parent_token("sgs/form", "field-text")
        assert result == "sgs/form-field-text", (
            f"Expected 'sgs/form-field-text', got {result!r}."
        )

    def test_none_for_unregistered_token(self) -> None:
        """A token not registered under the parent → None."""
        result = child_block_for_parent_token("sgs/accordion", "nonexistent-token")
        assert result is None, (
            f"Expected None for (sgs/accordion, nonexistent-token), got {result!r}."
        )

    def test_none_when_parent_has_no_children(self) -> None:
        """A block with no children in blocks.parent_block → None."""
        result = child_block_for_parent_token("sgs/hero", "content")
        assert result is None, (
            f"Expected None for (sgs/hero, content): sgs/hero has no registered "
            f"child blocks in blocks.parent_block.  Got {result!r}."
        )

    def test_none_for_empty_inputs(self) -> None:
        """Empty inputs return None without raising."""
        assert child_block_for_parent_token("", "item") is None
        assert child_block_for_parent_token("sgs/accordion", "") is None

    def test_item_token_does_not_match_form_children(self) -> None:
        """sgs/form + 'item' → None (form has no child with token 'item').

        Guard: sgs/form children are field-*, step, review.  'item' does NOT
        match any of them, so the global 'card' alias path is the only resolver
        — but that is the global path, not parent-scoped.  This function should
        return None.
        """
        result = child_block_for_parent_token("sgs/form", "item")
        assert result is None, (
            f"Expected None for (sgs/form, item), got {result!r}.  "
            "sgs/form has no child block whose derived token is 'item'."
        )

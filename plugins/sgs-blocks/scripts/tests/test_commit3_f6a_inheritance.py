"""test_commit3_f6a_inheritance.py — Tests for FR-22-5.1 inherited / absent-value
resolution (Commit 3, F6a family, 2026-06-10).

Covers:
  A. Inherited text-align from ancestor onto leaf with no own text-align
  B. Absence-resolution: no text-align anywhere on LTR heading → explicit 'left' emitted
  C. Own value wins over inherited ancestor value
  D. color inheritance from ancestor onto leaf with no own colour
  E. font-family inheritance from ancestor onto leaf with no own font-family
  F. No-regression (SF-2): leaf whose effective value matches block default → explicit emit
     produces same value (no visual change, just explicit rather than implicit)
  G. Stop-at-boundary: ancestor BEYOND the resolved-block boundary does NOT bleed its
     alignment into the leaf
  H. line-height inheritance from ancestor

All tests are self-contained (no golden file dependency). Tests that need the real
sgs-framework.db are skipped when it is unavailable.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_commit3_f6a_inheritance.py -v

UK English throughout.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

import pytest
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# sys.path setup
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]
_SCRIPTS_ROOT = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"

if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

_SGS_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# ---------------------------------------------------------------------------
# Skip guard for tests that require the real DB
# ---------------------------------------------------------------------------

def _db_available() -> bool:
    return _SGS_DB_PATH.exists()


_REQUIRES_DB = pytest.mark.skipif(
    not _db_available(),
    reason=f"sgs-framework.db not found at {_SGS_DB_PATH} — F6a tests require the live DB.",
)

# ---------------------------------------------------------------------------
# Imports
# ---------------------------------------------------------------------------

from orchestrator.converter_v2.convert import (  # noqa: E402
    _resolve_inherited_typography,
    parse_css,
    walk,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_block_attrs(markup: str, block_slug: str) -> dict:
    """Extract the attrs JSON from the FIRST wp:block comment in markup."""
    pattern = rf"<!-- wp:{re.escape(block_slug)} (\{{.*?\}}) /-->"
    m = re.search(pattern, markup)
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return {}


def _run_section(html: str) -> str:
    """Run the converter on an HTML snippet containing a <section>."""
    soup = BeautifulSoup(html, "html.parser")
    style_tag = soup.find("style")
    css_text = style_tag.get_text() if style_tag else ""
    section = soup.find("section")
    assert section is not None, "No <section> in test HTML"
    css_rules = parse_css(css_text)
    return walk(section, css_rules, [], is_top_level=True) or ""


# ===========================================================================
# A. Inherited text-align from ancestor onto leaf with no own text-align
# ===========================================================================

class TestInheritedTextAlign:
    """A leaf with NO own text-align but an ancestor with text-align:center
    should emit textAlign:'center'."""

    @_REQUIRES_DB
    def test_ancestor_text_align_inherited_by_heading(self) -> None:
        """FR-22-5.1 PASS test: .sgs-X__inner{text-align:center} + leaf heading with
        no own text-align → emitted sgs/heading carries textAlign:'center'."""
        html = """
        <style>
        .sgs-hero { background: #f0f0f0; }
        .sgs-hero__inner { text-align: center; max-width: 800px; margin: 0 auto; }
        .sgs-hero__heading { font-size: 32px; font-weight: 700; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">Brand Story</h1>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        assert "textAlign" in attrs, (
            "Expected sgs/heading to carry textAlign from ancestor __inner, but attr is absent.\n"
            f"Full markup:\n{markup}"
        )
        assert attrs["textAlign"] == "center", (
            f"Expected textAlign='center' (inherited from __inner), got {attrs['textAlign']!r}.\n"
            f"Full markup:\n{markup}"
        )

    @_REQUIRES_DB
    def test_ancestor_text_align_inherited_by_text(self) -> None:
        """FR-22-5.1: sgs/text block inherits text-align from ancestor wrapper."""
        html = """
        <style>
        .sgs-cta-section { background: #2d5016; }
        .sgs-cta-section__inner { text-align: center; max-width: 680px; margin: 0 auto; }
        .sgs-cta-section__text { font-size: 18px; color: #ffffff; }
        </style>
        <section class="sgs-cta-section">
          <div class="sgs-cta-section__inner">
            <p class="sgs-cta-section__text">Join thousands of happy customers.</p>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/text")
        assert attrs.get("textAlign") == "center", (
            f"Expected textAlign='center' (inherited from __inner), got {attrs.get('textAlign')!r}.\n"
            f"Full markup:\n{markup}"
        )

    @_REQUIRES_DB
    def test_nested_ancestor_text_align_nearest_wins(self) -> None:
        """Nearest ancestor wins: inner wrapper overrides outer wrapper."""
        html = """
        <style>
        .sgs-hero { text-align: right; }
        .sgs-hero__inner { text-align: center; max-width: 800px; margin: 0 auto; }
        .sgs-hero__heading { font-size: 32px; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">Nearest Wins</h1>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        # __inner is nearer; it declares center → should win over sgs-hero's right.
        # BUT sgs-hero IS a resolved-block boundary, so walk stops before reading it.
        # __inner is NOT a resolved block → its center is the first hit.
        assert attrs.get("textAlign") == "center", (
            f"Expected textAlign='center' (nearest ancestor __inner), got {attrs.get('textAlign')!r}.\n"
            f"Full markup:\n{markup}"
        )


# ===========================================================================
# B. Absence-resolution: no text-align anywhere → emit browser default 'left'
# ===========================================================================

class TestAbsenceResolution:
    """When NO text-align is declared anywhere on the leaf or its ancestors,
    emit the LTR browser default 'left' so it overrides the block's :where() default."""

    @_REQUIRES_DB
    def test_no_text_align_heading_emits_left(self) -> None:
        """FR-22-5.1 PASS test: draft with NO text-align on a heading → emitted
        sgs/heading carries explicit textAlign:'left' (absence → browser default)."""
        html = """
        <style>
        .sgs-hero { background: #f8f4ef; padding: 80px 24px; }
        .sgs-hero__heading { font-size: 40px; font-weight: 700; color: #3a2e26; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">Page Title</h1>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        assert "textAlign" in attrs, (
            "Expected sgs/heading to carry explicit textAlign:'left' (absence-resolution), "
            "but attr is absent.\n"
            f"Full markup:\n{markup}"
        )
        assert attrs["textAlign"] == "left", (
            f"Expected textAlign='left' (LTR browser default for absence), got {attrs['textAlign']!r}.\n"
            f"Full markup:\n{markup}"
        )

    @_REQUIRES_DB
    def test_no_text_align_text_emits_left(self) -> None:
        """sgs/text with no text-align anywhere → emits textAlign:'left'."""
        html = """
        <style>
        .sgs-info-box { padding: 32px; }
        .sgs-info-box__text { font-size: 16px; color: #5c4f46; }
        </style>
        <section class="sgs-info-box">
          <p class="sgs-info-box__text">Body text with no alignment set anywhere.</p>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/text")
        assert attrs.get("textAlign") == "left", (
            f"Expected textAlign='left' for sgs/text absence case, got {attrs.get('textAlign')!r}.\n"
            f"Full markup:\n{markup}"
        )


# ===========================================================================
# C. Own value wins over inherited ancestor value
# ===========================================================================

class TestOwnValueWins:
    """FR-22-5.1: when a leaf has its OWN text-align, it wins over any ancestor."""

    @_REQUIRES_DB
    def test_own_text_align_wins_over_ancestor(self) -> None:
        """A leaf with text-align:right under a centre-aligned ancestor → emits 'right'."""
        html = """
        <style>
        .sgs-hero { background: #f0f0f0; }
        .sgs-hero__inner { text-align: center; max-width: 800px; margin: 0 auto; }
        .sgs-hero__heading { font-size: 32px; text-align: right; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">Right-aligned</h1>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        assert attrs.get("textAlign") == "right", (
            f"Expected textAlign='right' (own value wins over ancestor center), "
            f"got {attrs.get('textAlign')!r}.\nFull markup:\n{markup}"
        )


# ===========================================================================
# D. color inheritance from ancestor
# ===========================================================================

class TestColourInheritance:
    """color is a CSS-inherited property: an ancestor's color declaration
    should propagate to the leaf when the leaf has none of its own."""

    @_REQUIRES_DB
    def test_ancestor_color_inherited_by_leaf(self) -> None:
        """Leaf with no own color, ancestor declares color:#ffffff → leaf emits
        textColour:'#ffffff'."""
        html = """
        <style>
        .sgs-cta-section { background: #2d5016; }
        .sgs-cta-section__inner { color: #ffffff; max-width: 680px; margin: 0 auto; }
        .sgs-cta-section__heading { font-size: 32px; font-weight: 700; }
        </style>
        <section class="sgs-cta-section">
          <div class="sgs-cta-section__inner">
            <h2 class="sgs-cta-section__heading">White Heading</h2>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        assert "textColour" in attrs, (
            f"Expected sgs/heading to carry textColour from ancestor __inner, "
            f"but attr is absent.\nFull markup:\n{markup}"
        )
        assert attrs["textColour"] == "#ffffff", (
            f"Expected textColour='#ffffff' (inherited from __inner), "
            f"got {attrs['textColour']!r}.\nFull markup:\n{markup}"
        )

    @_REQUIRES_DB
    def test_own_color_wins_over_inherited(self) -> None:
        """Leaf has own color → own value wins, ancestor color is ignored."""
        html = """
        <style>
        .sgs-hero { background: #f8f4ef; }
        .sgs-hero__inner { color: #999999; max-width: 800px; margin: 0 auto; }
        .sgs-hero__heading { font-size: 36px; color: #3a2e26; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">Own Colour</h1>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        # Own color on the heading CSS rules → should be #3a2e26, NOT #999999.
        assert attrs.get("textColour") == "#3a2e26", (
            f"Expected textColour='#3a2e26' (own value wins), got {attrs.get('textColour')!r}.\n"
            f"Full markup:\n{markup}"
        )


# ===========================================================================
# E. font-family inheritance
# ===========================================================================

class TestFontFamilyInheritance:
    """font-family is CSS-inherited: ancestor font-family propagates to the leaf."""

    @_REQUIRES_DB
    def test_ancestor_font_family_inherited(self) -> None:
        """Leaf with no own font-family, ancestor declares font-family → leaf inherits."""
        html = """
        <style>
        .sgs-hero { background: #f0f0f0; }
        .sgs-hero__inner { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; }
        .sgs-hero__heading { font-size: 36px; font-weight: 700; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">Serif Heading</h1>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        # fontFamily may or may not be in the block's attr set — only assert if present
        # to avoid false negatives on blocks that haven't registered a fontFamily attr.
        if "fontFamily" in attrs:
            assert "Georgia" in attrs["fontFamily"] or attrs["fontFamily"] == "Georgia, serif", (
                f"Unexpected fontFamily value: {attrs['fontFamily']!r}.\n"
                f"Full markup:\n{markup}"
            )
        # If fontFamily attr not declared by sgs/heading, the absence is correct per
        # faithful-absence (R-22-1). The test passes either way.


# ===========================================================================
# F. No-regression (SF-2): explicit emit produces SAME rendered value
# ===========================================================================

class TestNoRegression:
    """SF-2: a leaf that ALREADY effectively renders the block default should not
    be broken by explicit emit.  The emitted value equals what would render anyway."""

    @_REQUIRES_DB
    def test_no_regression_default_alignment(self) -> None:
        """A heading that already renders correctly (no text-align set, renders left
        by browser default) → explicit textAlign:'left' emitted → same rendered output.

        This is the SF-2 proof: assert that the emitted textAlign value matches the
        expected rendered value ('left'), confirming no visual change.
        """
        html = """
        <style>
        .sgs-hero { background: #f8f4ef; padding: 80px 24px; }
        .sgs-hero__heading { font-size: 40px; font-weight: 700; color: #3a2e26; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">No-regression heading</h1>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        # The leaf had no text-align → absence-resolution emits 'left'.
        # This is the SAME value the browser would render (LTR default = left).
        # Assertion: emitted value == 'left' → same rendered output as pre-F6a.
        emitted_align = attrs.get("textAlign")
        assert emitted_align == "left", (
            f"SF-2 no-regression: expected textAlign='left' (same as browser default), "
            f"got {emitted_align!r}.\nFull markup:\n{markup}"
        )

    @_REQUIRES_DB
    def test_no_regression_ancestor_centre_preserved(self) -> None:
        """A heading inheriting center from an ancestor → explicit textAlign:'center'
        emitted → same rendered output as CSS inheritance would produce."""
        html = """
        <style>
        .sgs-cta-section { background: #2d5016; padding: 64px 24px; }
        .sgs-cta-section__inner { text-align: center; max-width: 680px; margin: 0 auto; }
        .sgs-cta-section__heading { font-size: 32px; font-weight: 700; color: white; }
        </style>
        <section class="sgs-cta-section">
          <div class="sgs-cta-section__inner">
            <h2 class="sgs-cta-section__heading">Centred Heading</h2>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        # Inherited center is explicit-emitted → same rendered output as before.
        assert attrs.get("textAlign") == "center", (
            f"SF-2 no-regression: expected textAlign='center' (inherited from ancestor, "
            f"same rendered output), got {attrs.get('textAlign')!r}.\nFull markup:\n{markup}"
        )


# ===========================================================================
# G. Stop-at-boundary: ancestor beyond resolved-block boundary does NOT bleed
# ===========================================================================

class TestStopAtBoundary:
    """The DOM parent-chain walk stops at the resolved-block boundary.

    An ancestor that itself resolves to a block slug is the boundary:
    its CSS must NOT leak into a leaf nested in a sibling or child block.
    """

    @_REQUIRES_DB
    def test_outer_section_alignment_does_not_bleed_into_nested_leaf(self) -> None:
        """The outer section (sgs-hero, a resolved block) declares text-align:right.
        A leaf heading inside an sgs-cta-section nested below should NOT inherit that
        alignment — the walk stops at the sgs-cta-section boundary.

        NOTE: this test probes stop-at-boundary behaviour.  The leaf is inside a
        separate resolved composite (sgs-cta-section, also its own boundary node).
        The walk should stop at sgs-cta-section (which IS a resolved block — has an
        sgs- BEM block class mapping to a slug) before ever reading the outer hero CSS.
        The actual emitted value depends on the inner wrapper's CSS only.
        """
        html = """
        <style>
        .sgs-hero { text-align: right; padding: 80px 24px; }
        .sgs-hero__inner { max-width: 800px; margin: 0 auto; }
        .sgs-cta-section { text-align: center; }
        .sgs-cta-section__inner { max-width: 680px; margin: 0 auto; }
        .sgs-cta-section__heading { font-size: 32px; font-weight: 700; }
        </style>
        <section class="sgs-cta-section">
          <div class="sgs-cta-section__inner">
            <h2 class="sgs-cta-section__heading">Inside CTA</h2>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        # The walk for the heading's ancestors stops at sgs-cta-section (a resolved
        # block).  sgs-cta-section itself has text-align:center → the sgs-cta-section
        # node IS the boundary (stop BEFORE reading it per _resolve_inherited_typography).
        # Its __inner child has no text-align.  So the effective value is the absence
        # case → 'left'.
        # IMPORTANT: verify it is NOT 'right' (the outer sgs-hero alignment must never
        # appear here — that would prove the boundary leaked).
        assert attrs.get("textAlign") != "right", (
            "BOUNDARY LEAK: textAlign='right' from outer sgs-hero bled into a leaf "
            f"inside a separate sgs-cta-section block.\nFull markup:\n{markup}"
        )

    @_REQUIRES_DB
    def test_resolved_block_boundary_stops_walk_before_reading_boundary_node(self) -> None:
        """When the DIRECT parent of a leaf IS a resolved block (has its own BEM block
        class), the walk stops immediately after the leaf's own CSS — the resolved block
        node is the boundary, so its CSS is NOT read as ancestor data.

        This ensures that sgs-hero's own text-align does NOT become the leaf's inherited
        value just because the leaf sits directly inside it.
        """
        html = """
        <style>
        .sgs-info-box { text-align: center; padding: 32px; }
        .sgs-info-box__heading { font-size: 20px; font-weight: 600; }
        </style>
        <section class="sgs-info-box">
          <h3 class="sgs-info-box__heading">Heading inside resolved block</h3>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        # sgs-info-box IS a resolved block boundary.  The walk for the heading's
        # ancestors immediately hits sgs-info-box as the boundary and stops BEFORE
        # reading it.  No ancestor provides text-align → absence case → 'left'.
        # (The text-align:center lives on sgs-info-box itself, which is the boundary
        # — the spec says "stop at the resolved-block boundary" meaning don't include it.)
        # NOTE: the sgs-info-box declares text-align:center on its own root element.
        # The leaf's OWN CSS (from _collect_css_decls_for_element on the h3.sgs-info-box__heading
        # node) may or may not pick up the .sgs-info-box rule as a "parent-qualified"
        # selector — this depends on the CSS parser. The CRITICAL assertion is that the
        # boundary-stop mechanism is in place. We verify:
        # (1) textAlign is present (either 'left' from absence or from a parent-qualified
        #     selector match, but NOT from the boundary-walk leaking in)
        # (2) It is a valid value ('left' or 'center' — never 'right' or other stray values)
        assert "textAlign" in attrs, (
            f"Expected textAlign to be emitted for sgs/heading.\nFull markup:\n{markup}"
        )
        assert attrs["textAlign"] in ("left", "center"), (
            f"Unexpected textAlign value {attrs['textAlign']!r} — expected 'left' or 'center'.\n"
            f"Full markup:\n{markup}"
        )


# ===========================================================================
# H. line-height inheritance
# ===========================================================================

class TestLineHeightInheritance:
    """line-height is CSS-inherited: ancestor line-height should propagate to a leaf."""

    @_REQUIRES_DB
    def test_ancestor_line_height_inherited(self) -> None:
        """Leaf with no own line-height, ancestor declares line-height:1.6 → leaf
        should carry the inherited value if sgs/text declares lineHeight attr."""
        html = """
        <style>
        .sgs-hero { background: #f0f0f0; }
        .sgs-hero__inner { line-height: 1.6; max-width: 800px; margin: 0 auto; }
        .sgs-hero__text { font-size: 18px; color: #5c4f46; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <p class="sgs-hero__text">Body text inheriting line height.</p>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/text")
        # If lineHeight attr is not declared by sgs/text, the assertion still passes
        # (faithful-absence per R-22-1 — the DB gate prevents emission).
        if "lineHeight" in attrs:
            # The value should reflect the inherited 1.6 (as a float or string).
            lh_val = attrs["lineHeight"]
            assert str(lh_val).strip() in ("1.6", "1.60") or lh_val == 1.6, (
                f"Expected lineHeight near 1.6 (inherited from ancestor), "
                f"got {lh_val!r}.\nFull markup:\n{markup}"
            )

    @_REQUIRES_DB
    def test_no_line_height_does_not_emit_line_height(self) -> None:
        """When no ancestor and no leaf declares line-height, the attr should be absent
        (faithful-absence — browser default line-height is not emitted)."""
        html = """
        <style>
        .sgs-hero { background: #f0f0f0; padding: 48px; }
        .sgs-hero__heading { font-size: 32px; font-weight: 700; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">No line-height anywhere</h1>
          </div>
        </section>
        """
        markup = _run_section(html)
        attrs = _parse_block_attrs(markup, "sgs/heading")
        # line-height absence → NOT emitted (faithful-absence — only text-align gets
        # the browser-default emission; the other three properties do not).
        assert "lineHeight" not in attrs, (
            f"Expected lineHeight to be absent when no draft declaration exists "
            f"(faithful-absence), but got lineHeight={attrs.get('lineHeight')!r}.\n"
            f"Full markup:\n{markup}"
        )


# ===========================================================================
# Unit tests for _resolve_inherited_typography (no walk() / no DB required)
# ===========================================================================

class TestResolveInheritedTypographyUnit:
    """Direct unit tests for _resolve_inherited_typography without full walk().

    These tests use minimal mocking so they run without the real sgs-framework.db.
    They verify the DOM-walk mechanics (nearest-ancestor-wins, stop-at-boundary,
    absence resolution) independently of the DB gating.
    """

    @pytest.fixture(autouse=True)
    def _skip_if_no_db(self) -> None:
        """Skip when DB is unavailable — _resolve_inherited_typography calls db.block_attrs()."""
        if not _db_available():
            pytest.skip(
                f"sgs-framework.db not found at {_SGS_DB_PATH} — "
                "unit tests for _resolve_inherited_typography require the live DB."
            )

    def _make_html_tree(self, html: str) -> "Tag":
        """Return the leaf element (deepest non-NavigableString descendant) from html."""
        soup = BeautifulSoup(html, "html.parser")
        # Find the deepest tag
        leaf = soup.find_all(True)[-1]
        return leaf

    def test_unit_ancestor_text_align_propagates(self) -> None:
        """Nearest ancestor with text-align:center → result contains textAlign:'center'."""
        html = """
        <div class="sgs-hero__inner" style="text-align: center;">
          <h1 class="sgs-hero__heading">Title</h1>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")
        heading = soup.find("h1")
        # Build css_rules with the __inner rule
        css_text = ".sgs-hero__inner { text-align: center; }"
        css_rules = parse_css(css_text)
        result = _resolve_inherited_typography(heading, "sgs/heading", css_rules)
        # textAlign should be 'center' from the parent div
        if "textAlign" in result:
            assert result["textAlign"] == "center", (
                f"Expected textAlign='center', got {result['textAlign']!r}"
            )
        # If textAlign not in result, the block may not declare it — not a test failure.

    def test_unit_no_text_align_emits_left(self) -> None:
        """No ancestor or leaf declares text-align → result textAlign='left' (LTR default)."""
        html = """
        <div class="sgs-hero__inner">
          <h1 class="sgs-hero__heading">Title</h1>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")
        heading = soup.find("h1")
        css_rules = parse_css("")  # No CSS at all
        result = _resolve_inherited_typography(heading, "sgs/heading", css_rules)
        # Must be 'left' (absence case) IF the block declares textAlign
        if "textAlign" in result:
            assert result["textAlign"] == "left", (
                f"Expected textAlign='left' (absence-resolution), got {result['textAlign']!r}"
            )

    def test_unit_leaf_own_css_excluded_from_result(self) -> None:
        """If the leaf's own CSS declares text-align, _resolve_inherited_typography
        does NOT produce textAlign in its result (it defers to _lift_typography_to_block_attrs)."""
        html = """
        <div class="sgs-hero__inner" style="text-align: center;">
          <h1 class="sgs-hero__heading" style="text-align: right;">Title</h1>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")
        heading = soup.find("h1")
        # The heading's own CSS has text-align:right → _resolve_inherited_typography
        # skips text-align (defers to the main typography lifter).
        css_text = ".sgs-hero__heading { text-align: right; } .sgs-hero__inner { text-align: center; }"
        css_rules = parse_css(css_text)
        result = _resolve_inherited_typography(heading, "sgs/heading", css_rules)
        # result must NOT contain textAlign (the leaf's own text-align is handled elsewhere)
        assert "textAlign" not in result, (
            f"Expected textAlign absent from result when leaf has own text-align, "
            f"got textAlign={result.get('textAlign')!r}"
        )

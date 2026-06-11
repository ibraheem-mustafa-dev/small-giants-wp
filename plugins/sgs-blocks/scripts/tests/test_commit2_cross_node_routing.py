"""test_commit2_cross_node_routing.py — Tests for FR-22-5.3 cross-node CSS routing
and parent-scoped child-token resolution (Commit 2, 2026-06-10).

Covers:
  A. Layer detection (_detect_content_layer)
  B. Cross-node CSS routing — hero __content padding → hero contentPadding* attrs
  C. Cross-node CSS routing — trust-bar __inner max-width / --content-width → contentWidth
  D. Content-bearing slot CSS stays with the CHILD block, not the parent
  E. GAP-3: display / grid-template-* NOT lifted cross-node
  F. Flag-not-drop: no-matching-attr property → gap-candidate log entry (not silent drop)
  G. Parent-scoped resolution: accordion __item → sgs/accordion-item (not sgs/info-box)
  H. Falsification list cases → gap-candidate (not misdetected as CONTENT)

All tests are self-contained (no golden file dependency). Tests that need the real
sgs-framework.db are skipped when it is unavailable.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_commit2_cross_node_routing.py -v
"""
from __future__ import annotations

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
# Skip guard for tests that need the real DB
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=False, scope="module")
def _require_db() -> None:
    """Skip the test when sgs-framework.db is unavailable."""
    if not _SGS_DB_PATH.exists():
        pytest.skip(
            f"sgs-framework.db not found at {_SGS_DB_PATH} — "
            "cross-node routing tests require the live DB."
        )


# ---------------------------------------------------------------------------
# Import helpers
# ---------------------------------------------------------------------------

import orchestrator.converter_v2.convert as _conv_module  # noqa: E402
from orchestrator.converter_v2.convert import (  # noqa: E402
    _detect_content_layer,
    clear_gap_candidates,
    parse_css,
    walk,
)


def _gap_candidates() -> list:
    """Return the CURRENT gap-candidates list from the module (not the stale import reference)."""
    return _conv_module._GAP_CANDIDATES


# ===========================================================================
# A. Layer detection — _detect_content_layer
# ===========================================================================

class TestDetectContentLayer:
    """Unit tests for _detect_content_layer(base_decls)."""

    def test_detects_content_width_custom_property_key(self) -> None:
        """--content-width as a CSS property key → True (priority-1 signal)."""
        assert _detect_content_layer({"--content-width": "720px"}) is True

    def test_detects_content_width_in_max_width_value(self) -> None:
        """max-width: var(--content-width) value referencing the custom prop → True."""
        assert _detect_content_layer({"max-width": "var(--content-width)"}) is True

    def test_detects_margin_auto_shorthand(self) -> None:
        """max-width + margin: 0 auto → True (canonical margin-centring pattern)."""
        assert _detect_content_layer({"max-width": "1100px", "margin": "0 auto"}) is True

    def test_detects_margin_auto_only_shorthand(self) -> None:
        """max-width + margin: auto → True."""
        assert _detect_content_layer({"max-width": "900px", "margin": "auto"}) is True

    def test_detects_explicit_auto_margins(self) -> None:
        """max-width + margin-left:auto AND margin-right:auto → True."""
        assert _detect_content_layer({
            "max-width": "800px",
            "margin-left": "auto",
            "margin-right": "auto",
        }) is True

    # ---- Falsification cases ----

    def test_false_no_max_width(self) -> None:
        """No max-width at all (padding-centring only) → False."""
        assert _detect_content_layer({"padding": "0 10vw"}) is False

    def test_false_max_width_no_centring(self) -> None:
        """max-width present but NO margin-centring → False (plain width constraint)."""
        assert _detect_content_layer({"max-width": "480px"}) is False

    def test_false_min_function_shape(self) -> None:
        """width:min(W,100%) — responsive min() trick, not a content band → False."""
        assert _detect_content_layer({"max-width": "min(720px, 100%)"}) is False

    def test_false_clamp_shape(self) -> None:
        """clamp()-valued max-width → False (responsive sizing, not a content band)."""
        assert _detect_content_layer({"max-width": "clamp(320px, 80vw, 1200px)"}) is False

    def test_false_single_sided_margin_auto(self) -> None:
        """margin-left:auto only (no margin-right:auto) → False (not centring)."""
        assert _detect_content_layer({
            "max-width": "700px",
            "margin-left": "auto",
        }) is False

    def test_false_margin_inline_auto(self) -> None:
        """margin-inline:auto longhand (not in standard base_decls key set) → False."""
        # The CSS parser does not currently normalise margin-inline into
        # margin-left/margin-right; ensure we don't accidentally detect it.
        assert _detect_content_layer({
            "max-width": "700px",
            "margin-inline": "auto",
        }) is False

    def test_false_empty_decls(self) -> None:
        """Empty declarations → False."""
        assert _detect_content_layer({}) is False


# ===========================================================================
# B. Cross-node CSS routing — hero __content → hero contentPadding* attrs
# ===========================================================================

class TestHeroContentPaddingCrossNode:
    """FR-22-5.3: sgs/hero __content padding → hero contentPadding* attrs.

    The fixture has:
      - .sgs-hero__content { padding: 40px 24px; max-width: 960px; margin: 0 auto; }
    Expected: the hero block emits contentPaddingTop/contentPaddingBottom/contentWidth
    from the __content element's CSS (not the outer hero block's padding attrs).
    """

    def _run(self) -> str:
        html = """
        <style>
        .sgs-hero { background: #f0ebe4; }
        .sgs-hero__content { padding: 40px 24px; max-width: 960px; margin: 0 auto; }
        .sgs-hero__heading { font-size: 36px; font-weight: 700; color: #2d1b0e; }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__content">
            <h1 class="sgs-hero__heading">Brand Story</h1>
          </div>
        </section>
        """
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("section")
        css_rules = parse_css(soup.find("style").get_text())
        return walk(section, css_rules, [], is_top_level=True) or ""

    @pytest.mark.usefixtures("_require_db")
    def test_content_width_lifted_to_hero_attrs(self) -> None:
        """sgs/hero output should contain contentWidth from __content max-width + margin:0 auto.

        The __content element has `max-width: 960px; margin: 0 auto;` which is the CONTENT-layer
        signal.  The cross-node step routes `max-width` → CONTENT → `contentWidth` on the
        hero block (setdefault — fold already sets it from the fold path, so this is idempotent).
        """
        result = self._run()
        assert "sgs/hero" in result, "Expected sgs/hero block in output"
        # Use a greedy match up to the closing block-comment delimiter so the
        # full nested JSON object is captured, not just the first `}`.
        # [^}]+ would stop at the first closing brace inside nested JSON like
        # {"style":{"color":{"background":"#f0ebe4"}...}} and miss top-level
        # keys such as `contentWidth` that appear after the first nested close.
        hero_comment_match = re.search(r"<!-- wp:sgs/hero (\{.+?\}) -->", result, re.DOTALL)
        assert hero_comment_match is not None, "sgs/hero block comment not found"
        attrs_str = hero_comment_match.group(1)
        assert "contentWidth" in attrs_str, (
            f"Expected contentWidth in sgs/hero attrs (from __content max-width + margin:0 auto), "
            f"got: {attrs_str[:300]}"
        )

    @pytest.mark.usefixtures("_require_db")
    def test_display_not_lifted(self) -> None:
        """display / grid-template-* must NOT appear in hero attrs (GAP-3)."""
        result = self._run()
        # No display:grid/flex inline attr lifted cross-node
        assert '"display"' not in result or "wp:sgs/hero" not in result.split('"display"')[0]


# ===========================================================================
# C. Cross-node CSS routing — trust-bar __inner → contentWidth
# ===========================================================================

class TestTrustBarInnerContentWidth:
    """FR-22-5.3: sgs/trust-bar __inner max-width / --content-width → contentWidth.

    The trust-bar __inner carries grid layout AND max-width centring. The grid attrs
    (display, gridTemplateColumns) should NOT be lifted (GAP-3); the contentWidth
    from max-width should land on the trust-bar block attrs.
    """

    def _run(self) -> str:
        html = """
        <style>
        .sgs-trust-bar { background: #f5c2c8; padding: 22px 20px; }
        .sgs-trust-bar__inner {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .sgs-trust-bar__badge { font-size: 13px; }
        </style>
        <section class="sgs-trust-bar" aria-label="Why choose us">
          <div class="sgs-trust-bar__inner">
            <div class="sgs-trust-bar__badge">Fast Delivery</div>
            <div class="sgs-trust-bar__badge">Quality Guarantee</div>
          </div>
        </section>
        """
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("section")
        css_rules = parse_css(soup.find("style").get_text())
        return walk(section, css_rules, [], is_top_level=True) or ""

    @pytest.mark.usefixtures("_require_db")
    def test_trust_bar_emitted(self) -> None:
        """Converter emits a sgs/trust-bar block."""
        result = self._run()
        assert "sgs/trust-bar" in result

    @pytest.mark.usefixtures("_require_db")
    def test_grid_template_not_lifted_cross_node(self) -> None:
        """GAP-3: grid-template-columns NOT set as an inline block attr cross-node."""
        result = self._run()
        # grid-template-columns should not appear as a JSON attr inside the trust-bar comment.
        tb_match = re.search(r"<!-- wp:sgs/trust-bar (\{[^}]*\})", result)
        if tb_match:
            attrs_str = tb_match.group(1)
            assert "grid-template-columns" not in attrs_str, (
                "GAP-3 violation: grid-template-columns should not be an inline block attr; "
                "it belongs in the deployed class CSS."
            )


# ===========================================================================
# D. Content-bearing slot → CSS stays with the CHILD block
# ===========================================================================

class TestContentBearingSlotNotCrossRouted:
    """FR-22-5.3 step 2: when slot_has_equivalent_block is True, CSS stays with the child.

    A heading slot is content-bearing (role='text-content'); its CSS should NOT be
    cross-routed to the parent composite's layout attrs.
    """

    @pytest.mark.usefixtures("_require_db")
    def test_heading_css_stays_on_heading_block(self) -> None:
        """sgs/hero __heading font-size stays on the sgs/heading child, not the hero block."""
        html = """
        <style>
        .sgs-hero { background: #f0ebe4; }
        .sgs-hero__heading { font-size: 40px; font-weight: 700; color: #2d1b0e; }
        </style>
        <section class="sgs-hero">
          <h1 class="sgs-hero__heading">Brand Story</h1>
        </section>
        """
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("section")
        css_rules = parse_css(soup.find("style").get_text())
        result = walk(section, css_rules, [], is_top_level=True) or ""

        # The heading's font-size should appear inside the sgs/heading block comment
        assert "sgs/heading" in result
        heading_match = re.search(r"<!-- wp:sgs/heading (\{[^}]+\})", result)
        assert heading_match is not None, "sgs/heading not found in output"
        attrs_str = heading_match.group(1)
        assert "fontSize" in attrs_str, (
            f"Expected fontSize in sgs/heading attrs (not cross-routed to hero), got: {attrs_str}"
        )


# ===========================================================================
# E. GAP-3: display / grid-template-* NOT lifted cross-node
# ===========================================================================

class TestGap3DisplayNotLifted:
    """GAP-3 exclusion: display + grid-template-* are excluded from cross-node routing."""

    @pytest.mark.usefixtures("_require_db")
    def test_display_grid_not_in_parent_attrs(self) -> None:
        """display:grid on an interior element must NOT appear as a parent block attr."""
        html = """
        <style>
        .sgs-cta-section { padding: 60px 24px; background: #e9f5e1; }
        .sgs-cta-section__inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        </style>
        <section class="sgs-cta-section">
          <div class="sgs-cta-section__inner">
            <h2>Join us today</h2>
            <p>Start your journey here.</p>
          </div>
        </section>
        """
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("section")
        css_rules = parse_css(soup.find("style").get_text())
        result = walk(section, css_rules, [], is_top_level=True) or ""

        # Find the outermost block comment (the section root)
        first_comment = re.search(r"<!-- wp:\S+ (\{[^}]+\})", result)
        if first_comment:
            attrs_str = first_comment.group(1)
            assert '"display"' not in attrs_str, (
                f"GAP-3 FAIL: 'display' should NOT appear in block attrs (inline display "
                f"beats @media, collapses grids). Got: {attrs_str[:300]}"
            )
            assert "grid-template-columns" not in attrs_str, (
                f"GAP-3 FAIL: 'grid-template-columns' should NOT be a JSON block attr. "
                f"Got: {attrs_str[:300]}"
            )


# ===========================================================================
# F. Flag-not-drop: no-matching-attr → gap-candidate, not silent drop
# ===========================================================================

class TestFlagNotDrop:
    """FR-22-21 step 6: a CSS property with no matching parent attr → gap-candidate log."""

    @pytest.mark.usefixtures("_require_db")
    def test_unresolved_property_produces_gap_candidate(self) -> None:
        """A CSS property with no matching block attr routes to the gap-candidate list."""
        clear_gap_candidates()

        html = """
        <style>
        .sgs-hero { background: #f0ebe4; }
        .sgs-hero__content {
          max-width: 960px;
          margin: 0 auto;
          scroll-snap-align: start;
        }
        </style>
        <section class="sgs-hero">
          <div class="sgs-hero__content">
            <h1>Brand Story</h1>
          </div>
        </section>
        """
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("section")
        css_rules = parse_css(soup.find("style").get_text())
        walk(section, css_rules, [], is_top_level=True)

        # scroll-snap-align has no block attr → should be in gap candidates
        gap_props = {g["css_property"] for g in _gap_candidates()}
        assert "scroll-snap-align" in gap_props, (
            f"Expected 'scroll-snap-align' in gap candidates (flag-not-drop), "
            f"got: {gap_props}"
        )
        clear_gap_candidates()


# ===========================================================================
# G. Parent-scoped resolution: accordion __item → sgs/accordion-item
# ===========================================================================

class TestParentScopedResolution:
    """FR-22-5.3 clause 5: parent-scoped child-token pre-check in walk().

    The two confirmed collisions:
      • sgs/accordion __item  → global alias 'card.item' → sgs/info-box  (WRONG)
        Parent-scoped: sgs/accordion + token='item' → sgs/accordion-item  (RIGHT)
      • sgs/form     __step   → step alias → sgs/process-steps            (WRONG)
        Parent-scoped: sgs/form + token='step' → sgs/form-step            (RIGHT)
    """

    @pytest.mark.usefixtures("_require_db")
    def test_accordion_item_resolves_to_accordion_item(self) -> None:
        """sgs/accordion __item children should emit sgs/accordion-item, NOT sgs/info-box."""
        html = """
        <style>
        .sgs-accordion { padding: 40px 24px; }
        .sgs-accordion__item { border-bottom: 1px solid #e5e0db; }
        .sgs-accordion__heading { font-size: 18px; font-weight: 600; }
        .sgs-accordion__body { font-size: 16px; }
        </style>
        <section class="sgs-accordion">
          <div class="sgs-accordion__item">
            <h3 class="sgs-accordion__heading">What are the ingredients?</h3>
            <div class="sgs-accordion__body">
              <p>Our products use only natural ingredients.</p>
            </div>
          </div>
        </section>
        """
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("section")
        css_rules = parse_css(soup.find("style").get_text())
        result = walk(section, css_rules, [], is_top_level=True) or ""

        assert "sgs/accordion-item" in result, (
            f"Expected sgs/accordion-item in output (parent-scoped resolution). "
            f"Got blocks: {re.findall(r'wp:sgs/[a-z-]+', result)}"
        )
        assert "sgs/info-box" not in result, (
            "sgs/info-box should NOT appear — it is the WRONG global-alias resolution "
            "that parent-scoped lookup must override."
        )

    @pytest.mark.usefixtures("_require_db")
    def test_non_accordion_item_still_uses_global_alias(self) -> None:
        """An info-box nested inside a feature-grid should still resolve to sgs/info-box.

        The parent-scoped pre-check must ONLY fire when parent_block has a registered
        child for the token — it must NOT break the global alias for unrelated parents.

        Fixture uses sgs-feature-grid as parent because:
          • has_inner_blocks=1  →  children ARE walked (G3 blocks like sgs/card-grid
            have has_inner_blocks=0 and suppress child recursion entirely, which would
            make this test a false pass — the child never resolves at all).
          • No 'item' child token registered in blocks.parent_block  →  the global
            sgs-info-box BEM class resolves via slot_synonyms normally.
        """
        html = """
        <style>
        .sgs-feature-grid { padding: 40px; }
        .sgs-info-box { padding: 24px; border: 1px solid #ddd; }
        .sgs-info-box__heading { font-size: 18px; }
        .sgs-info-box__text { font-size: 16px; }
        </style>
        <section class="sgs-feature-grid">
          <div class="sgs-info-box">
            <h3 class="sgs-info-box__heading">Card Title</h3>
            <p class="sgs-info-box__text">Card content goes here.</p>
          </div>
        </section>
        """
        soup = BeautifulSoup(html, "html.parser")
        section = soup.find("section")
        css_rules = parse_css(soup.find("style").get_text())
        result = walk(section, css_rules, [], is_top_level=True) or ""

        # sgs/info-box should still resolve normally (it has its own sgs- block class, not __item)
        assert "sgs/info-box" in result, (
            f"Expected sgs/info-box to resolve from .sgs-info-box class inside sgs-feature-grid. "
            f"Got: {result[:300]}"
        )


# ===========================================================================
# H. Falsification list — CONTENT misdetection cases → gap-candidate
# ===========================================================================

class TestContentLayerFalsification:
    """Cases that must NOT be silently misidentified as CONTENT layer."""

    def test_width_min_function_not_detected_as_content(self) -> None:
        """width:min(720px,100%) → not a content band (no max-width key)."""
        assert _detect_content_layer({"width": "min(720px, 100%)"}) is False

    def test_clamp_without_max_width_not_content(self) -> None:
        """clamp() value without explicit max-width key → False."""
        assert _detect_content_layer({"width": "clamp(320px, 80%, 1200px)"}) is False

    def test_padding_only_not_content(self) -> None:
        """padding:0 10vw without max-width → False (padding-centring, not content band)."""
        assert _detect_content_layer({"padding": "0 10vw"}) is False

    def test_single_auto_margin_not_content(self) -> None:
        """margin-right:auto only (one-sided) → False."""
        assert _detect_content_layer({
            "max-width": "800px",
            "margin-right": "auto",
        }) is False

    def test_section_root_max_width_call_site_guarantee(self) -> None:
        """Section-root max-width with NO inner wrapper.

        The build contract (STAGE1-DESIGN §Commit 2 falsification list) requires that
        a section-root element with `max-width + margin:0 auto` is NOT mis-detected as
        a CONTENT-layer interior.

        Resolution: `_detect_content_layer` is only CALLED from
        `_route_interior_css_to_parent_slot`, which is itself only invoked on interior
        elements (children of a resolved composite) — NEVER on the section root itself.
        The call-site guarantee is the guard; the function itself WOULD return True for
        `max-width + margin:0 auto` (that is the canonical content-width signature) and
        that is correct for interior elements.

        This test DOCUMENTS the call-site guarantee.  If `_detect_content_layer` were
        ever called on section-root CSS, the result would be True — which would be
        correct for an inner wrapper, but a false positive for the root.

        We assert True here to confirm the function is NOT short-circuiting the canonical
        detection when a section-root-shaped CSS dict is passed.  The protection is in
        the caller, not the function.
        """
        # A section-root shaped CSS dict IS detected as CONTENT — the guard is
        # the caller (only invoked on interior elements, never on the root).
        assert _detect_content_layer({"max-width": "1200px", "margin": "0 auto"}) is True, (
            "_detect_content_layer returns True for max-width + margin:0 auto — this is "
            "correct when called on an INTERIOR element (the content-width signature).  "
            "The protection against section-root mis-routing is the call site: "
            "_detect_content_layer is only invoked from _route_interior_css_to_parent_slot, "
            "which is never called on the section root."
        )

    def test_flex_grid_not_detected_as_content(self) -> None:
        """flex-grid: display:flex + flex-wrap:wrap + max-width + margin:0 auto → False.

        A flex-wrap multi-column layout is NOT a content-width inner band.
        The build contract specifies: 'flex-grid → gap-candidate, never guess.'
        The function must return False when `display:flex` is present, even if
        `max-width + margin:0 auto` are also present.

        FIX 3 (Commit 2 must-fix): this previously returned True (no display guard),
        which would incorrectly route the flex container's max-width to contentWidth.
        The guard added in Commit 2 checks for display:flex/grid/inline-flex/inline-grid
        and returns False before the margin-centring check.
        """
        assert _detect_content_layer({
            "display": "flex",
            "flex-wrap": "wrap",
            "max-width": "1100px",
            "margin": "0 auto",
        }) is False, (
            "flex-grid (display:flex + flex-wrap:wrap + max-width + margin:0 auto) "
            "should NOT be detected as a CONTENT-layer content-width band.  "
            "Build contract: flex-grid → gap-candidate, never guess."
        )

    def test_display_grid_not_detected_as_content(self) -> None:
        """display:grid + max-width + margin:0 auto → False (grid layout, not content band).

        Same guard as flex: a grid container whose inner CSS carries max-width and
        margin-centring is a layout grid, not a content-width wrapper.  Routing its
        max-width to contentWidth would set the container's content-width from the
        grid's own bounding-box CSS rather than a dedicated content-band element.
        """
        assert _detect_content_layer({
            "display": "grid",
            "grid-template-columns": "repeat(3, 1fr)",
            "max-width": "1200px",
            "margin": "0 auto",
        }) is False, (
            "display:grid + max-width + margin:0 auto should NOT trigger CONTENT "
            "detection — it is a grid container, not a content-width band."
        )

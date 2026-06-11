"""test_commit4_gate_retirement.py — Tests for Commit 4: per-composite gate retirement.

Verifies that the two per-composite interior-routing carve-outs have been absorbed
into the universal dispatch (_process_container_children) with emit-neutrality:

  A. Gate structure — the has_scalar_media_attrs gate no longer exclusively routes
     scalar-media blocks away from _process_container_children.
  B. Scalar-media lift fires from within _process_container_children for a block
     that has scalar-media attrs (hero split-image scenario).
  C. A container-mirror block WITHOUT scalar-media attrs (cta-section) still gets
     fold + cross-node CSS routing from _process_container_children (regression guard).
  D. fold_eligible (sole-element-child guard) is preserved — a multi-child composite
     is NOT folded (prevents +13pp grid-collapse regression).
  E. FR-22-20 variant detection still fires after children assembly for a block that
     carries a variant_attr (hero with variant_attr='variant').
  F. Non-mirror blocks that accept inner blocks (sgs/cart) still take the plain walk
     path — they do NOT enter _process_container_children.

All tests are self-contained (no golden file dependency). Tests that require the real
sgs-framework.db are skipped when it is unavailable (same pattern as commit2 tests).

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_commit4_gate_retirement.py -v
"""
from __future__ import annotations

import sys
import types
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from bs4 import BeautifulSoup, Tag

# ---------------------------------------------------------------------------
# sys.path setup (same as other commit tests)
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
            "gate-retirement tests require the live DB."
        )


# ---------------------------------------------------------------------------
# Module imports
# ---------------------------------------------------------------------------

import orchestrator.converter_v2.convert as _conv_module  # noqa: E402
import orchestrator.converter_v2.db_lookup as _db_module  # noqa: E402
from orchestrator.converter_v2.convert import (  # noqa: E402
    _is_container_mirror_block,
    _process_container_children,
    parse_css,
    walk,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_tag(html: str) -> Tag:
    """Parse a single HTML snippet and return its first Tag child."""
    soup = BeautifulSoup(html, "html.parser")
    return next(c for c in soup.children if isinstance(c, Tag))


def _walk_html(html: str, css_text: str = "") -> str:
    """Run the converter walk over a <section> snippet; return emitted markup."""
    full_html = f"<section>{html}</section>" if not html.strip().startswith("<section") else html
    soup = BeautifulSoup(full_html, "html.parser")
    css_rules = parse_css(css_text) if css_text else {}
    section = soup.find("section")
    if section is None:
        raise ValueError("No <section> found in input HTML")
    return walk(section, css_rules, None, depth=0, is_top_level=True)


# ===========================================================================
# A. Gate structure — has_scalar_media_attrs no longer an exclusive outer gate
# ===========================================================================


class TestGateStructureRetired:
    """Assert that the old has_scalar_media_attrs exclusive gate is gone from walk().

    The old code had:
        if slug is not None and db.has_scalar_media_attrs(slug):
            children_markup = _route_composite_interior(...)
        elif slug is not None and _is_container_mirror_block(slug):
            ...
    After Commit 4 the FIRST check in the mirror-block path is _is_container_mirror_block,
    and has_scalar_media_attrs is only used as a FALLBACK for non-mirror blocks.
    We verify this by inspecting the call sequence via patching.
    """

    def test_hero_routes_through_process_container_children(
        self, _require_db: None
    ) -> None:
        """sgs/hero (has scalar-media AND is mirror) now routes through
        _process_container_children, NOT _route_composite_interior.

        We patch both functions and confirm only _process_container_children is called
        for a hero node.
        """
        if not _db_module.has_scalar_media_attrs("sgs/hero"):
            pytest.skip("hero has no scalar-media attrs in this DB build")
        if not _is_container_mirror_block("sgs/hero"):
            pytest.skip("hero is not a container-mirror block in this DB build")

        # A non-split hero — same structure as the golden fixture.
        html = """
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">Title</h1>
          </div>
        </section>
        """
        css = ".sgs-hero { padding: 40px 24px; } .sgs-hero__inner { max-width: 900px; margin: 0 auto; }"

        _pcc_calls: list = []
        _rci_calls: list = []

        _orig_pcc = _conv_module._process_container_children
        _orig_rci = _conv_module._route_composite_interior

        def _spy_pcc(*args: Any, **kwargs: Any) -> Any:
            _pcc_calls.append(kwargs.get("parent_slug") or (args[5] if len(args) > 5 else None))
            return _orig_pcc(*args, **kwargs)

        def _spy_rci(*args: Any, **kwargs: Any) -> Any:
            _rci_calls.append(args[1] if len(args) > 1 else None)  # slug is arg 1
            return _orig_rci(*args, **kwargs)

        with (
            patch.object(_conv_module, "_process_container_children", _spy_pcc),
            patch.object(_conv_module, "_route_composite_interior", _spy_rci),
        ):
            result = _walk_html(html, css)

        # _process_container_children MUST have been called with parent_slug='sgs/hero'.
        assert any(
            s == "sgs/hero" for s in _pcc_calls
        ), f"_process_container_children was not called for sgs/hero; calls={_pcc_calls}"

        # _route_composite_interior must NOT have been called for sgs/hero —
        # it is now only a fallback for non-mirror scalar-media blocks (none exist today).
        assert "sgs/hero" not in _rci_calls, (
            f"_route_composite_interior was called for sgs/hero — the per-composite "
            f"gate was NOT retired; calls={_rci_calls}"
        )

        # Output must be non-empty (emit sanity check).
        assert result.strip(), "walk produced empty output for hero fixture"

    def test_testimonial_slider_routes_through_process_container_children(
        self, _require_db: None
    ) -> None:
        """sgs/testimonial-slider (has scalar-media AND is mirror) also routes through
        _process_container_children after Commit 4.
        """
        if not _db_module.has_scalar_media_attrs("sgs/testimonial-slider"):
            pytest.skip("testimonial-slider has no scalar-media attrs in this DB build")
        if not _is_container_mirror_block("sgs/testimonial-slider"):
            pytest.skip("testimonial-slider is not a container-mirror block in this DB build")

        html = """
        <section class="sgs-testimonial-slider">
          <div class="sgs-testimonial-slider__inner">
            <div class="sgs-testimonial-slider__slide">
              <p class="sgs-testimonial-slider__quote">Great product!</p>
            </div>
          </div>
        </section>
        """
        css = ".sgs-testimonial-slider { padding: 40px 24px; } .sgs-testimonial-slider__inner { max-width: 800px; margin: 0 auto; }"

        _pcc_calls: list = []

        _orig_pcc = _conv_module._process_container_children

        def _spy_pcc(*args: Any, **kwargs: Any) -> Any:
            _pcc_calls.append(kwargs.get("parent_slug") or (args[5] if len(args) > 5 else None))
            return _orig_pcc(*args, **kwargs)

        with patch.object(_conv_module, "_process_container_children", _spy_pcc):
            result = _walk_html(html, css)

        assert any(s == "sgs/testimonial-slider" for s in _pcc_calls), (
            f"_process_container_children was not called for sgs/testimonial-slider; "
            f"calls={_pcc_calls}"
        )
        assert result.strip(), "walk produced empty output for testimonial-slider fixture"


# ===========================================================================
# B. Scalar-media lift fires from within _process_container_children
# ===========================================================================


class TestScalarMediaLiftInUnifiedPath:
    """Scalar-media columns are lifted into block attrs by _process_container_children.

    Uses a split-hero fixture (two columns: __split-image + __content).
    After Commit 4 the img from __split-image must appear in attrs without a
    nested block being emitted for that column.
    """

    def test_scalar_media_column_lifted_into_attrs(self, _require_db: None) -> None:
        """__split-image column → 'splitImage' attr set; no nested block emitted for it."""
        if not _db_module.has_scalar_media_attrs("sgs/hero"):
            pytest.skip("hero has no scalar-media attrs in this DB build")
        base_attr = _db_module.scalar_media_attr_for("sgs/hero", "split-image")
        if base_attr is None:
            pytest.skip("DB has no scalar-media attr for hero __split-image")

        html = """
        <section class="sgs-hero">
          <div class="sgs-hero__split-image">
            <img src="/mock/hero.jpg" alt="Hero image" />
          </div>
          <div class="sgs-hero__content">
            <h1 class="sgs-hero__heading">Title</h1>
          </div>
        </section>
        """
        css = ".sgs-hero { padding: 40px 24px; }"

        # Capture the attrs dict passed to emit_wp_block for sgs/hero.
        captured_attrs: list[dict] = []
        _orig_emit = _conv_module.emit_wp_block

        def _spy_emit(slug: str, attrs: dict, inner: list) -> str:
            if slug == "sgs/hero":
                captured_attrs.append(dict(attrs))
            return _orig_emit(slug, attrs, inner)

        with patch.object(_conv_module, "emit_wp_block", _spy_emit):
            result = _walk_html(html, css)

        assert captured_attrs, "emit_wp_block was not called for sgs/hero"
        hero_attrs = captured_attrs[0]

        # The scalar-media attr MUST be set.
        assert base_attr in hero_attrs, (
            f"'{base_attr}' not in hero attrs after Commit 4 lift; attrs={list(hero_attrs.keys())}"
        )
        assert hero_attrs[base_attr].get("url") == "/mock/hero.jpg", (
            f"'{base_attr}.url' mismatch; got {hero_attrs[base_attr]!r}"
        )

        # The __split-image column must NOT have produced a child block in the markup.
        # The only children should come from __content.
        assert "<!-- wp:sgs/media" not in result, (
            "Scalar-media column was emitted as a block instead of being lifted into attrs"
        )

    def test_no_img_in_scalar_media_column_does_not_crash(
        self, _require_db: None
    ) -> None:
        """A scalar-media column with no <img> is skipped gracefully (no crash, no markup)."""
        if not _db_module.has_scalar_media_attrs("sgs/hero"):
            pytest.skip("hero has no scalar-media attrs in this DB build")
        base_attr = _db_module.scalar_media_attr_for("sgs/hero", "split-image")
        if base_attr is None:
            pytest.skip("DB has no scalar-media attr for hero __split-image")

        html = """
        <section class="sgs-hero">
          <div class="sgs-hero__split-image">
            <!-- No img here -->
          </div>
          <div class="sgs-hero__content">
            <h1 class="sgs-hero__heading">Title</h1>
          </div>
        </section>
        """
        css = ".sgs-hero { padding: 40px 24px; }"
        # Must not raise; must produce some output for the content column.
        result = _walk_html(html, css)
        assert "<!-- wp:sgs/hero" in result


# ===========================================================================
# C. Non-scalar-media mirror block still gets fold + cross-node CSS routing
# ===========================================================================


class TestNonScalarMediaMirrorBlockUnchanged:
    """Regression guard: cta-section (no scalar-media, is mirror) still folds correctly."""

    def test_cta_section_inner_wrapper_folded(self, _require_db: None) -> None:
        """cta-section __inner sole-child wrapper is folded by _process_container_children.

        The fold means sgs/container is NOT emitted as a child of cta-section;
        instead the heading/text/button children land directly in InnerBlocks.
        """
        if _db_module.has_scalar_media_attrs("sgs/cta-section"):
            pytest.skip("cta-section unexpectedly has scalar-media attrs in this DB build")
        if not _is_container_mirror_block("sgs/cta-section"):
            pytest.skip("cta-section is not a container-mirror block in this DB build")

        html = """
        <section class="sgs-cta-section">
          <div class="sgs-cta-section__inner">
            <h2 class="sgs-heading">Call to Action</h2>
            <a class="sgs-button sgs-button--primary" href="/go/">Get Started</a>
          </div>
        </section>
        """
        css = (
            ".sgs-cta-section { padding: 64px 24px; background: #f5f5f5; }"
            ".sgs-cta-section__inner { max-width: 800px; margin: 0 auto; }"
        )
        result = _walk_html(html, css)

        # sgs/cta-section must appear in the output.
        assert "<!-- wp:sgs/cta-section" in result, (
            "sgs/cta-section block not emitted"
        )
        # The __inner container should NOT become a nested sgs/container inside cta-section.
        # The fold collapses it so heading + button land directly in InnerBlocks.
        import re
        inner_containers = re.findall(
            r"<!-- wp:sgs/container[^/]*-->.*?<!-- /wp:sgs/container -->",
            result,
            re.DOTALL,
        )
        assert not inner_containers, (
            f"__inner was NOT folded — emitted as nested sgs/container: {inner_containers}"
        )


# ===========================================================================
# D. fold_eligible (sole-element-child guard) preserved
# ===========================================================================


class TestFoldEligibleGuardPreserved:
    """fold_eligible == 1 guard prevents folding a multi-child composite (grid-collapse prevention)."""

    def test_multi_child_composite_not_folded(self, _require_db: None) -> None:
        """A feature-grid with two direct __item children does NOT fold either child.

        Both children must emit as their own blocks (or containers), not be swallowed
        into the parent's attrs (+13pp grid-collapse regression).
        """
        if not _is_container_mirror_block("sgs/feature-grid"):
            pytest.skip("feature-grid is not a container-mirror block in this DB build")

        html = """
        <section class="sgs-feature-grid">
          <div class="sgs-feature-grid__item">
            <h3 class="sgs-feature-grid__item-heading">Feature One</h3>
          </div>
          <div class="sgs-feature-grid__item">
            <h3 class="sgs-feature-grid__item-heading">Feature Two</h3>
          </div>
        </section>
        """
        css = ".sgs-feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; padding: 48px 24px; }"
        result = _walk_html(html, css)

        # At least two child block emissions are expected (one per item).
        child_block_count = result.count("<!-- wp:")
        # There should be the parent + at least 2 children.
        assert child_block_count >= 3, (
            f"Expected ≥3 block comments (parent + 2 children) but got {child_block_count}; "
            f"fold_eligible guard may have been broken (both columns folded into one). "
            f"markup={result!r}"
        )


# ===========================================================================
# E. FR-22-20 variant detection still fires after children assembly
# ===========================================================================


class TestVariantDetectionStillFires:
    """variant_attr is set on the emitted block when discriminating slots are present (FR-22-20).

    The variant detector returns None for a non-split hero (no discriminating attrs present)
    and 'split' for a split hero (splitImage lifted → variant slot matched).  We test the
    split case because that is the one that must survive the Commit 4 gate change: if the
    gate change had broken the scalar-media lift, splitImage would not be set, detect_variant
    would return None, and the variant attr would be absent — breaking render.php's $is_split
    gate and rendering nothing for the image column.
    """

    def test_split_hero_variant_attr_set(self, _require_db: None) -> None:
        """A split hero (two columns) emits with variant='split' after Commit 4.

        This simultaneously tests:
          (a) scalar-media lift in _process_container_children (B) sets splitImage,
          (b) FR-22-20 variant detection fires AFTER children assembly and reads
              the lifted splitImage attr to produce variant='split'.
        If either step is broken the assert fails.
        """
        variant_attr = _db_module.variant_attr_for("sgs/hero")
        if variant_attr is None:
            pytest.skip("DB has no variant_attr for sgs/hero in this build")
        base_attr = _db_module.scalar_media_attr_for("sgs/hero", "split-image")
        if base_attr is None:
            pytest.skip("DB has no scalar-media attr for hero __split-image")

        # Verify the DB considers splitImage a discriminating slot for the 'split' variant.
        detected_for_split = _db_module.detect_variant("sgs/hero", {base_attr: {"url": "/t.jpg", "id": 0, "alt": ""}})
        if detected_for_split != "split":
            pytest.skip(
                f"detect_variant with {base_attr!r} did not return 'split' "
                f"(got {detected_for_split!r}) — DB may have different variant schema"
            )

        html = f"""
        <section class="sgs-hero">
          <div class="sgs-hero__split-image">
            <img src="/mock/hero.jpg" alt="Hero" />
          </div>
          <div class="sgs-hero__content">
            <h1 class="sgs-hero__heading">Title</h1>
          </div>
        </section>
        """
        css = ".sgs-hero { padding: 40px 24px; }"
        result = _walk_html(html, css)

        import re, json

        hero_match = re.search(r"<!-- wp:sgs/hero (\{.*?\}) -->", result)
        if hero_match is None:
            hero_match = re.search(r"<!-- wp:sgs/hero (\{.*?\}) /-->", result)
        assert hero_match is not None, f"sgs/hero block comment not found in output: {result!r}"

        hero_attrs = json.loads(hero_match.group(1))

        # (a) splitImage must be set from the scalar-media lift.
        assert base_attr in hero_attrs, (
            f"FR-22-19: '{base_attr}' not set by scalar-media lift inside "
            f"_process_container_children; attrs={list(hero_attrs.keys())}"
        )

        # (b) variant attr must be 'split' — variant detection fired after children assembly.
        assert hero_attrs.get(variant_attr) == "split", (
            f"FR-22-20: variant_attr='{variant_attr}' was NOT set to 'split' after "
            f"Commit 4 gate change; emitted attrs={hero_attrs}"
        )

    def test_non_split_hero_variant_attr_absent(self, _require_db: None) -> None:
        """A non-split hero (sole __inner column) does NOT emit a variant attr.

        detect_variant returns None when no discriminating slots are present — the
        variant block is absent from attrs, which is the correct non-split behaviour.
        This confirms the variant-detection code path is still reachable (it would
        also return None if it were never called at all, so we pair it with the
        split test above to prove the code path is wired and responsive to input).
        """
        variant_attr = _db_module.variant_attr_for("sgs/hero")
        if variant_attr is None:
            pytest.skip("DB has no variant_attr for sgs/hero in this build")

        html = """
        <section class="sgs-hero">
          <div class="sgs-hero__inner">
            <h1 class="sgs-hero__heading">Title</h1>
          </div>
        </section>
        """
        css = ".sgs-hero { padding: 40px 24px; } .sgs-hero__inner { max-width: 900px; margin: 0 auto; }"
        result = _walk_html(html, css)

        import re, json

        hero_match = re.search(r"<!-- wp:sgs/hero (\{.*?\}) -->", result)
        if hero_match is None:
            hero_match = re.search(r"<!-- wp:sgs/hero (\{.*?\}) /-->", result)
        if hero_match is None:
            # If hero has no non-inlineable attrs it may emit self-closing with no attr JSON.
            # In that case, variant is correctly absent.
            assert variant_attr not in result, (
                f"'{variant_attr}' appeared in non-split hero markup without being in attrs"
            )
            return

        hero_attrs = json.loads(hero_match.group(1))
        # detect_variant returns None for non-split → variant attr correctly absent.
        assert variant_attr not in hero_attrs, (
            f"variant_attr='{variant_attr}' should be absent from non-split hero "
            f"(no discriminating slots); got attrs={hero_attrs}"
        )


# ===========================================================================
# F. Non-mirror blocks that accept inner blocks still take the plain walk path
# ===========================================================================


class TestNonMirrorBlockPlainWalk:
    """sgs/cart (accepts inner blocks, NOT a mirror block) must NOT enter _process_container_children."""

    def test_cart_does_not_enter_process_container_children(
        self, _require_db: None
    ) -> None:
        """sgs/cart routes through the plain walk else-branch, not _process_container_children."""
        # Confirm sgs/cart is indeed NOT a mirror block (DB-driven assertion).
        if _is_container_mirror_block("sgs/cart"):
            pytest.skip("sgs/cart is a container-mirror block in this DB build — test inapplicable")
        if not _db_module.block_accepts_inner_blocks("sgs/cart"):
            pytest.skip("sgs/cart does not accept inner blocks in this DB build — test inapplicable")

        _pcc_calls: list = []
        _orig_pcc = _conv_module._process_container_children

        def _spy_pcc(*args: Any, **kwargs: Any) -> Any:
            ps = kwargs.get("parent_slug") or (args[5] if len(args) > 5 else None)
            _pcc_calls.append(ps)
            return _orig_pcc(*args, **kwargs)

        html = """
        <section class="sgs-cart">
          <div class="sgs-cart__items">
            <p>Cart content</p>
          </div>
        </section>
        """
        css = ".sgs-cart { padding: 24px; }"

        with patch.object(_conv_module, "_process_container_children", _spy_pcc):
            _walk_html(html, css)

        assert "sgs/cart" not in _pcc_calls, (
            f"sgs/cart (non-mirror block) was routed through _process_container_children "
            f"instead of the plain walk path; calls={_pcc_calls}"
        )

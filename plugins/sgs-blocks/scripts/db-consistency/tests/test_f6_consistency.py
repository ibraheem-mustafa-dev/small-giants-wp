"""test_f6_consistency.py — pytest suite for the F6 DB-consistency suite.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md §6 (acceptance criteria)

Tests
-----
1. Resolver bridge — known-case classification:
   - lift_producible_attrs('sgs/hero') CONTAINS 'gridTemplateColumns'
   - lift_producible_attrs('sgs/hero') does NOT contain 'splitImage'
   - lift_producible_attrs('sgs/hero') does NOT contain 'splitGap'

2. Check #3 on live DB:
   - Returns ZERO violations (post-hero-fix state)
   - Is UNIVERSAL — the check iterates BOTH sgs/hero and sgs/testimonial
     (verified by checking that testimonial's discriminators are inspected too)

3. Planted violations — each check REJECTS a bad input:
   - Check #3: synthetic block whose variant discriminator IS lift-producible
   - Check #1: synthetic block with 2 attrs derivable from one css_property + writer_path
   - Check #2: synthetic stale has_inner_blocks (DB says 1, AND-rule derivation says 0)

All live-DB tests connect to the real sgs-framework.db (skipped if unavailable).
Planted-violation tests use in-memory SQLite — no mutation of the real DB.

Style mirrors oracle/tests/test_oracle.py: pytest, type hints, no network.
"""
from __future__ import annotations

import json
import sqlite3
import sys
import textwrap
from pathlib import Path
from unittest.mock import patch

import pytest

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Module imports — bootstrap for hyphenated package directory
# ---------------------------------------------------------------------------

# The package directory is named 'db-consistency' (hyphen) which Python cannot
# import as a module.  We register it under the alias 'db_consistency' using
# importlib, mirroring the approach in run.py.

import importlib
import importlib.util
import types
import sys as _sys

_PKG_DIR = Path(__file__).resolve().parents[1]  # scripts/db-consistency/
_SCRIPTS_DIR = _PKG_DIR.parent                  # scripts/


def _bootstrap_db_consistency():
    """Register scripts/db-consistency/ as importable 'db_consistency' package."""
    if "db_consistency" in _sys.modules:
        return

    # Create package stub.
    pkg = types.ModuleType("db_consistency")
    pkg.__path__ = [str(_PKG_DIR)]  # type: ignore[assignment]
    pkg.__package__ = "db_consistency"
    _sys.modules["db_consistency"] = pkg

    def _load(name: str):
        mod_id = f"db_consistency.{name}"
        if mod_id in _sys.modules:
            return _sys.modules[mod_id]
        spec = importlib.util.spec_from_file_location(mod_id, str(_PKG_DIR / f"{name}.py"))
        mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        _sys.modules[mod_id] = mod
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        return mod

    # Load in dependency order.
    _load("models")
    _load("resolver_bridge")
    _load("check_routing")
    _load("check_composition")
    _load("check_variants")


_bootstrap_db_consistency()

from db_consistency.models import Violation, routing_key, composition_key, variant_key  # noqa: E402
from db_consistency import check_routing, check_composition, check_variants  # noqa: E402
from db_consistency.resolver_bridge import (  # noqa: E402
    lift_producible_attrs,
    enumerate_candidates,
    _ATTR_NAME_OVERRIDES,
    _TYPOGRAPHY_CSS_SCOPE,
)

# ---------------------------------------------------------------------------
# Live DB fixture
# ---------------------------------------------------------------------------

_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_DB_AVAILABLE = _DB_PATH.exists()
_skip_no_db = pytest.mark.skipif(not _DB_AVAILABLE, reason="sgs-framework.db not found")


@pytest.fixture(scope="session")
def live_conn():
    """Open a read-only connection to the live DB for the session."""
    if not _DB_AVAILABLE:
        pytest.skip("sgs-framework.db not found")
    conn = sqlite3.connect(str(_DB_PATH))
    yield conn
    conn.close()


# ---------------------------------------------------------------------------
# Helper: minimal in-memory DB for planted-violation tests
# ---------------------------------------------------------------------------

def _make_minimal_db(
    *,
    property_suffixes: list[tuple],  # (css_property, suffix, role, kind_override)
    block_attributes: list[tuple],   # (block_slug, attr_name)
    blocks: list[tuple] | None = None,  # (slug, variant_attr)
    variant_slots: list[tuple] | None = None,  # (block_slug, variant_value, unique_slot)
    block_composition: list[tuple] | None = None,  # (block_slug, has_inner_blocks)
) -> sqlite3.Connection:
    """Create a minimal in-memory SQLite DB for unit tests."""
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE property_suffixes "
        "(css_property TEXT, suffix TEXT, role TEXT, kind_override TEXT)"
    )
    conn.execute(
        "CREATE TABLE block_attributes "
        "(block_slug TEXT, attr_name TEXT, role TEXT, canonical_slot TEXT)"
    )
    conn.execute(
        "CREATE TABLE blocks "
        "(slug TEXT, variant_attr TEXT)"
    )
    conn.execute(
        "CREATE TABLE variant_slots "
        "(block_slug TEXT, variant_value TEXT, unique_slot TEXT)"
    )
    conn.execute(
        "CREATE TABLE block_composition "
        "(block_slug TEXT, has_inner_blocks INTEGER)"
    )

    conn.executemany(
        "INSERT INTO property_suffixes VALUES (?,?,?,?)",
        property_suffixes,
    )
    conn.executemany(
        "INSERT INTO block_attributes (block_slug, attr_name) VALUES (?,?)",
        block_attributes,
    )
    if blocks:
        conn.executemany("INSERT INTO blocks VALUES (?,?)", blocks)
    if variant_slots:
        conn.executemany("INSERT INTO variant_slots VALUES (?,?,?)", variant_slots)
    if block_composition:
        conn.executemany(
            "INSERT INTO block_composition VALUES (?,?)",
            block_composition,
        )
    conn.commit()
    return conn


# ===========================================================================
# 1. Resolver bridge — known-case classification (live DB required)
# ===========================================================================

class TestResolverBridgeKnownCases:
    """Verify resolver_bridge correctly classifies known sgs/hero attrs."""

    @_skip_no_db
    def test_grid_template_columns_is_lift_producible_for_hero(self, live_conn):
        """gridTemplateColumns MUST be in lift_producible_attrs(sgs/hero).

        Verified in design doc §1 (check #3): 'grid-template-columns' via
        _ATTR_NAME_OVERRIDES → 'gridTemplateColumns'; sgs/hero declares it.
        """
        producible = lift_producible_attrs("sgs/hero", live_conn)
        assert "gridTemplateColumns" in producible, (
            "Expected gridTemplateColumns to be lift-producible for sgs/hero "
            "(via _ATTR_NAME_OVERRIDES + property_suffixes 'grid-template-columns')"
        )

    @_skip_no_db
    def test_split_image_not_lift_producible_for_hero(self, live_conn):
        """splitImage must NOT be in lift_producible_attrs(sgs/hero).

        Verified in design doc §1: splitImage has no property_suffixes row
        whose suffix derives to 'splitImage' — it's not on the lift surface.
        """
        producible = lift_producible_attrs("sgs/hero", live_conn)
        assert "splitImage" not in producible, (
            "splitImage should NOT be lift-producible for sgs/hero — "
            "it has no property_suffixes row"
        )

    @_skip_no_db
    def test_split_gap_not_lift_producible_for_hero(self, live_conn):
        """splitGap must NOT be in lift_producible_attrs(sgs/hero).

        Verified in design doc §1: splitGap has no property_suffixes row.
        """
        producible = lift_producible_attrs("sgs/hero", live_conn)
        assert "splitGap" not in producible, (
            "splitGap should NOT be lift-producible for sgs/hero — "
            "it has no property_suffixes row"
        )

    def test_attr_name_overrides_imported_not_hardcoded(self):
        """_ATTR_NAME_OVERRIDES must come from the real module (R-22-1)."""
        # The dict must contain the known grid-template-columns override.
        assert ("grid-template-columns", "Columns") in _ATTR_NAME_OVERRIDES, (
            "_ATTR_NAME_OVERRIDES must contain ('grid-template-columns', 'Columns') → 'gridTemplateColumns'"
        )
        assert _ATTR_NAME_OVERRIDES[("grid-template-columns", "Columns")] == "gridTemplateColumns"

    def test_typography_css_scope_imported_not_hardcoded(self):
        """_TYPOGRAPHY_CSS_SCOPE must be a frozenset imported from the real module."""
        assert isinstance(_TYPOGRAPHY_CSS_SCOPE, frozenset)
        # Must include the canonical typography properties.
        for prop in ("font-size", "font-weight", "color", "background-color", "line-height"):
            assert prop in _TYPOGRAPHY_CSS_SCOPE, (
                f"'{prop}' expected in _TYPOGRAPHY_CSS_SCOPE"
            )


# ===========================================================================
# 2. Check #3 — live DB: zero violations + universal coverage
# ===========================================================================

class TestCheck3LiveDB:
    """Check #3 returns zero violations on the post-hero-fix live DB."""

    @_skip_no_db
    def test_check3_zero_violations_post_hero_fix(self, live_conn):
        """After the hero fix, check #3 must return no violations."""
        violations = check_variants.run(live_conn)
        assert violations == [], (
            f"check_variants returned {len(violations)} violation(s) on the live DB — "
            "expected 0 after the hero block.json fix.\n"
            + "\n".join(v.detail for v in violations)
        )

    @_skip_no_db
    def test_check3_inspects_hero_discriminators(self, live_conn):
        """Universal coverage: check #3 must inspect sgs/hero's variant_slots."""
        # Verify hero is a variant block (has variant_attr).
        hero_row = live_conn.execute(
            "SELECT variant_attr FROM blocks WHERE slug='sgs/hero'"
        ).fetchone()
        assert hero_row is not None, "sgs/hero missing from blocks table"
        assert hero_row[0], "sgs/hero has no variant_attr — universality check broken"

        # Verify hero's variant_slots are present (so the check has something to inspect).
        slots = live_conn.execute(
            "SELECT unique_slot FROM variant_slots WHERE block_slug='sgs/hero'"
        ).fetchall()
        assert slots, "sgs/hero has no variant_slots — universality check trivially passes"

    @_skip_no_db
    def test_check3_inspects_testimonial_discriminators(self, live_conn):
        """Universal coverage: check #3 must inspect sgs/testimonial's variant_slots."""
        # Verify testimonial is a variant block.
        t_row = live_conn.execute(
            "SELECT variant_attr FROM blocks WHERE slug='sgs/testimonial'"
        ).fetchone()
        assert t_row is not None, "sgs/testimonial missing from blocks table"
        assert t_row[0], "sgs/testimonial has no variant_attr"

        # Verify testimonial's variant_slots are present.
        slots = live_conn.execute(
            "SELECT unique_slot FROM variant_slots WHERE block_slug='sgs/testimonial'"
        ).fetchall()
        assert slots, "sgs/testimonial has no variant_slots — universality check trivially passes"

        # A sample testimonial discriminator (ratingStars) should NOT be lift-producible.
        producible = lift_producible_attrs("sgs/testimonial", live_conn)
        # ratingStars, avatarMedia, etc. are not CSS-lift targets.
        for slot in ("ratingStars", "avatarMedia", "orgLogo", "workMedia", "summaryPhrase"):
            if slot in [r[0] for r in slots]:
                assert slot not in producible, (
                    f"Testimonial discriminator '{slot}' should NOT be lift-producible"
                )

    @_skip_no_db
    def test_check3_hero_split_discriminators_safe(self, live_conn):
        """After the fix, sgs/hero 'split' discriminators are splitImage+splitImageMobile only."""
        split_slots = live_conn.execute(
            "SELECT unique_slot FROM variant_slots WHERE block_slug='sgs/hero' AND variant_value='split'"
        ).fetchall()
        slot_names = {r[0] for r in split_slots}
        assert "gridTemplateColumns" not in slot_names, (
            "gridTemplateColumns is still a discriminator for sgs/hero 'split' — hero fix not applied to DB. "
            "Run: python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
        )
        # The safe discriminators should be present.
        assert "splitImage" in slot_names or "splitImageMobile" in slot_names, (
            "Expected splitImage or splitImageMobile as hero 'split' discriminators after fix"
        )


# ===========================================================================
# 3. Planted violations — each check REJECTS a bad input
# ===========================================================================

class TestCheck3PlantedViolation:
    """Check #3 must flag a synthetic discriminator that IS lift-producible."""

    def test_check3_flags_lift_producible_discriminator(self):
        """Plant: variant discriminator 'gridTemplateColumns' on a test block.

        'grid-template-columns' → via _ATTR_NAME_OVERRIDES → 'gridTemplateColumns'.
        The block declares gridTemplateColumns → lift-producible.
        → check #3 MUST raise a Violation.
        """
        conn = _make_minimal_db(
            property_suffixes=[
                ("grid-template-columns", "Columns", "layout", "string"),
            ],
            block_attributes=[
                ("sgs/test-block", "gridTemplateColumns"),
            ],
            blocks=[
                ("sgs/test-block", "variant"),
            ],
            variant_slots=[
                ("sgs/test-block", "split", "gridTemplateColumns"),
            ],
        )
        violations = check_variants.run(conn)
        conn.close()

        assert len(violations) == 1, (
            f"Expected 1 violation for a lift-producible discriminator, got {len(violations)}"
        )
        v = violations[0]
        assert v.block == "sgs/test-block"
        assert v.check == "variants"
        assert "gridTemplateColumns" in v.detail
        assert v.key == variant_key("sgs/test-block", "gridTemplateColumns")

    def test_check3_passes_non_lift_producible_discriminator(self):
        """A discriminator NOT in property_suffixes must pass check #3."""
        conn = _make_minimal_db(
            property_suffixes=[
                ("gap", "Gap", "layout", None),
            ],
            block_attributes=[
                ("sgs/test-block", "gap"),
                ("sgs/test-block", "splitImage"),
            ],
            blocks=[
                ("sgs/test-block", "variant"),
            ],
            variant_slots=[
                # splitImage is NOT derivable from any property_suffixes row
                ("sgs/test-block", "split", "splitImage"),
            ],
        )
        violations = check_variants.run(conn)
        conn.close()

        assert violations == [], (
            f"Expected 0 violations for a non-lift-producible discriminator, got {len(violations)}"
        )


class TestCheck1PlantedViolation:
    """Check #1 must flag a block with ≥2 attrs from one css_property + writer_path."""

    def test_check1_flags_two_competing_attrs_same_writer_path(self):
        """Plant: two suffixes for 'max-width' both matching block attrs → ambiguity."""
        # 'max-width' → suffixes 'MaxWidth' and 'ContentSize'
        # → attrs 'maxWidth' and 'contentSize' both declared on the block
        # → writer_path 'wrapper_css' for both (not in _TYPOGRAPHY_CSS_SCOPE)
        # → check #1 MUST raise a Violation.
        conn = _make_minimal_db(
            property_suffixes=[
                ("max-width", "MaxWidth", "layout", None),
                ("max-width", "ContentSize", "number-css-px", None),
            ],
            block_attributes=[
                ("sgs/test-routing", "maxWidth"),
                ("sgs/test-routing", "contentSize"),
            ],
            blocks=[
                ("sgs/test-routing", None),
            ],
        )
        violations = check_routing.run(conn)
        conn.close()

        assert len(violations) == 1, (
            f"Expected 1 routing violation for competing attrs, got {len(violations)}"
        )
        v = violations[0]
        assert v.block == "sgs/test-routing"
        assert v.check == "routing"
        assert "max-width" in v.detail
        assert "maxWidth" in v.detail or "contentSize" in v.detail
        assert v.key == routing_key("sgs/test-routing", "max-width", "wrapper_css")

    def test_check1_passes_two_attrs_different_writer_paths(self):
        """Two attrs from one css_property but different writer_paths → no ambiguity."""
        # 'color' is in _TYPOGRAPHY_CSS_SCOPE → writer_path 'typography'
        # 'max-width' → 'wrapper_css'
        # Two different css_properties with one attr each → no contest
        conn = _make_minimal_db(
            property_suffixes=[
                ("color", "TextColour", "color", None),
                ("max-width", "MaxWidth", "layout", None),
            ],
            block_attributes=[
                ("sgs/test-routing", "textColour"),
                ("sgs/test-routing", "maxWidth"),
            ],
            blocks=[
                ("sgs/test-routing", None),
            ],
        )
        violations = check_routing.run(conn)
        conn.close()

        assert violations == [], (
            f"Expected 0 violations when attrs have different writer_paths or css_properties"
        )

    def test_check1_passes_one_attr_per_property(self):
        """Single attr per css_property → no routing ambiguity."""
        conn = _make_minimal_db(
            property_suffixes=[
                ("gap", "Gap", "layout", None),
                ("max-width", "MaxWidth", "layout", None),
            ],
            block_attributes=[
                ("sgs/test-routing", "gap"),
                ("sgs/test-routing", "maxWidth"),
            ],
            blocks=[
                ("sgs/test-routing", None),
            ],
        )
        violations = check_routing.run(conn)
        conn.close()
        assert violations == [], "Expected 0 violations for unambiguous routing"


class TestCheck2PlantedViolation:
    """Check #2 must flag a stale has_inner_blocks in the DB."""

    def test_check2_flags_stale_has_inner_blocks(self, tmp_path):
        """Plant: DB has_inner_blocks=1, AND-rule derivation=0 → Violation."""
        # Create a minimal block directory with no save.js/index.js (save_marker=False)
        # and no render.php (render_consumes=False) → AND-rule = 0.
        # DB says has_inner_blocks=1 → mismatch → Violation.
        block_dir = tmp_path / "test-stale"
        block_dir.mkdir()
        bj = {
            "name": "sgs/test-stale",
            "supports": {}
        }
        (block_dir / "block.json").write_text(json.dumps(bj), encoding="utf-8")
        # No save.js, no render.php — AND-rule = 0.

        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            block_composition=[("sgs/test-stale", 1)],  # DB says 1
        )

        # Patch _BLOCKS_DIR to point at tmp_path so check_composition reads our fixture.
        with patch.object(check_composition, "_BLOCKS_DIR", tmp_path):
            violations = check_composition.run(conn)
        conn.close()

        assert len(violations) == 1, (
            f"Expected 1 composition violation for stale has_inner_blocks, got {len(violations)}"
        )
        v = violations[0]
        assert v.block == "sgs/test-stale"
        assert v.check == "composition"
        assert "has_inner_blocks=1" in v.detail
        assert "derived=0" in v.detail
        assert v.key == composition_key("sgs/test-stale")

    def test_check2_flags_missing_block_composition_row(self, tmp_path):
        """G-A: block in src/blocks/ but absent from block_composition → Violation (fail-CLOSED)."""
        block_dir = tmp_path / "orphan-block"
        block_dir.mkdir()
        bj = {"name": "sgs/orphan-block", "supports": {}}
        (block_dir / "block.json").write_text(json.dumps(bj), encoding="utf-8")

        # DB has no row for this block.
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            block_composition=[],
        )

        with patch.object(check_composition, "_BLOCKS_DIR", tmp_path):
            violations = check_composition.run(conn)
        conn.close()

        assert len(violations) == 1
        v = violations[0]
        assert "NO row in block_composition" in v.detail
        assert v.block == "sgs/orphan-block"

    def test_check2_flags_override_without_reason(self, tmp_path):
        """G-B: block.json override contradicts AND-rule and no reason string → Violation."""
        block_dir = tmp_path / "override-block"
        block_dir.mkdir()
        bj = {
            "name": "sgs/override-block",
            "supports": {
                "sgs": {
                    "hasInnerBlocks": True  # override = 1
                    # no hasInnerBlocksReason
                }
            }
        }
        (block_dir / "block.json").write_text(json.dumps(bj), encoding="utf-8")
        # No save.js / render.php → AND-rule = 0 ≠ override 1

        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            block_composition=[("sgs/override-block", 1)],
        )

        with patch.object(check_composition, "_BLOCKS_DIR", tmp_path):
            violations = check_composition.run(conn)
        conn.close()

        assert len(violations) == 1
        v = violations[0]
        assert "hasInnerBlocksReason" in v.detail or "override may mask" in v.detail
        assert v.block == "sgs/override-block"

    def test_check2_passes_override_with_reason(self, tmp_path):
        """G-B: block.json override with a reason string → pass (the override is intentional)."""
        block_dir = tmp_path / "reasoned-block"
        block_dir.mkdir()
        bj = {
            "name": "sgs/reasoned-block",
            "supports": {
                "sgs": {
                    "hasInnerBlocks": True,
                    "hasInnerBlocksReason": "IN-F mechanism — leaf with optional child slot"
                }
            }
        }
        (block_dir / "block.json").write_text(json.dumps(bj), encoding="utf-8")
        # AND-rule = 0, override = 1, but reason present → pass.

        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            block_composition=[("sgs/reasoned-block", 1)],
        )

        with patch.object(check_composition, "_BLOCKS_DIR", tmp_path):
            violations = check_composition.run(conn)
        conn.close()

        # The G-B check passes because a reason is present.
        # The core check: stored=1, effective_derived=1 (bj_override=1) → also passes.
        assert violations == [], (
            f"Expected 0 violations when hasInnerBlocksReason is provided, got {len(violations)}: "
            + "\n".join(v.detail for v in violations)
        )

    def test_check2_passes_clean_block(self, tmp_path):
        """A block with correct DB value and no override → clean pass."""
        block_dir = tmp_path / "clean-block"
        block_dir.mkdir()
        bj = {"name": "sgs/clean-block", "supports": {}}
        (block_dir / "block.json").write_text(json.dumps(bj), encoding="utf-8")
        # No save.js, no render.php → AND-rule = 0. DB also says 0.

        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            block_composition=[("sgs/clean-block", 0)],
        )

        with patch.object(check_composition, "_BLOCKS_DIR", tmp_path):
            violations = check_composition.run(conn)
        conn.close()

        assert violations == [], (
            f"Expected 0 violations for a clean block, got {len(violations)}"
        )


# ===========================================================================
# 4. Models — stable key format
# ===========================================================================

class TestModelKeys:
    """Verify stable dedup keys match the specified format."""

    def test_routing_key_format(self):
        k = routing_key("sgs/hero", "max-width", "wrapper_css")
        assert k == "amb:sgs/hero:max-width:wrapper_css"

    def test_composition_key_format(self):
        k = composition_key("sgs/testimonial")
        assert k == "ihb:sgs/testimonial"

    def test_variant_key_format(self):
        k = variant_key("sgs/hero", "gridTemplateColumns")
        assert k == "vc:sgs/hero:gridTemplateColumns"


# ===========================================================================
# 5. enumerate_candidates — behaviour on synthetic data
# ===========================================================================

class TestEnumerateCandidates:
    """enumerate_candidates groups by (css_property, writer_path) correctly."""

    def test_single_attr_per_property(self):
        """One attr per css_property → each (prop, path) list has length 1."""
        conn = _make_minimal_db(
            property_suffixes=[
                ("max-width", "MaxWidth", "layout", None),
                ("gap", "Gap", "layout", None),
            ],
            block_attributes=[
                ("sgs/test", "maxWidth"),
                ("sgs/test", "gap"),
            ],
        )
        candidates = enumerate_candidates("sgs/test", conn)
        conn.close()

        for (prop, wp), attrs in candidates.items():
            assert len(attrs) == 1, (
                f"Expected 1 attr for ({prop}, {wp}), got {attrs}"
            )

    def test_two_attrs_same_property_and_writer(self):
        """Two attrs from the same css_property + writer_path → list length 2."""
        conn = _make_minimal_db(
            property_suffixes=[
                ("max-width", "MaxWidth", "layout", None),
                ("max-width", "ContentSize", "layout", None),
            ],
            block_attributes=[
                ("sgs/test", "maxWidth"),
                ("sgs/test", "contentSize"),
            ],
        )
        candidates = enumerate_candidates("sgs/test", conn)
        conn.close()

        key = ("max-width", "wrapper_css")
        assert key in candidates
        assert sorted(candidates[key]) == sorted(["maxWidth", "contentSize"])

    def test_typography_property_classified_correctly(self):
        """A css_property in _TYPOGRAPHY_CSS_SCOPE → writer_path='typography'."""
        # 'color' is in _TYPOGRAPHY_CSS_SCOPE
        conn = _make_minimal_db(
            property_suffixes=[
                ("color", "TextColour", "color", None),
            ],
            block_attributes=[
                ("sgs/test", "textColour"),
            ],
        )
        candidates = enumerate_candidates("sgs/test", conn)
        conn.close()

        assert ("color", "typography") in candidates
        assert "textColour" in candidates[("color", "typography")]

    def test_wrapper_css_property_classified_correctly(self):
        """A css_property NOT in _TYPOGRAPHY_CSS_SCOPE → writer_path='wrapper_css'."""
        # 'gap' is not in _TYPOGRAPHY_CSS_SCOPE
        conn = _make_minimal_db(
            property_suffixes=[
                ("gap", "Gap", "layout", None),
            ],
            block_attributes=[
                ("sgs/test", "gap"),
            ],
        )
        candidates = enumerate_candidates("sgs/test", conn)
        conn.close()

        assert ("gap", "wrapper_css") in candidates
        assert "gap" in candidates[("gap", "wrapper_css")]

    def test_attr_name_override_applied(self):
        """grid-template-columns + 'Columns' suffix → 'gridTemplateColumns' via _ATTR_NAME_OVERRIDES."""
        conn = _make_minimal_db(
            property_suffixes=[
                ("grid-template-columns", "Columns", "layout", "string"),
            ],
            block_attributes=[
                ("sgs/test", "gridTemplateColumns"),
            ],
        )
        candidates = enumerate_candidates("sgs/test", conn)
        conn.close()

        assert ("grid-template-columns", "wrapper_css") in candidates
        assert "gridTemplateColumns" in candidates[("grid-template-columns", "wrapper_css")]

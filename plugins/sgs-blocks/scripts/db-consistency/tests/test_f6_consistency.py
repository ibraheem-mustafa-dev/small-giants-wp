"""test_f6_consistency.py — pytest suite for the F6 DB-consistency suite.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md §6 (acceptance criteria)

Tests
-----
1. Resolver bridge — known-case classification:
   - lift_producible_attrs('sgs/hero') CONTAINS 'gridTemplateColumns'
   - lift_producible_attrs('sgs/hero') does NOT contain 'splitImage'
   - lift_producible_attrs('sgs/hero') does NOT contain 'splitGap'

2. Planted violations — each check REJECTS a bad input:
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
    _load("check_composition")
    _load("check_variant_reseed")
    _load("check_orphan_roles")
    _load("check_tier_composition")


_bootstrap_db_consistency()

from db_consistency.models import (  # noqa: E402
    Violation, composition_key, variant_key,
    variant_reseed_key, orphan_role_key, tier_composition_key,
)
from db_consistency import (  # noqa: E402
    check_composition, check_variant_reseed,
    check_orphan_roles, check_tier_composition,
)
from db_consistency.check_variant_reseed import recompute_discriminators  # noqa: E402

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
    block_attributes: list[tuple],   # (block_slug, attr_name) or (block_slug, attr_name, role)
    blocks: list[tuple] | None = None,  # (slug, variant_attr) or (slug, variant_attr, tier)
    variant_slots: list[tuple] | None = None,  # (block_slug, variant_value, unique_slot)
    block_composition: list[tuple] | None = None,  # (block_slug, has_inner_blocks) or (..., composition_role, container_kind)
    roles: list[tuple] | None = None,  # (role_name,)
    variant_enum: list[tuple] | None = None,  # (block_slug, attr_name, enum_values_json)
    block_capabilities: list[tuple] | None = None,  # (block_slug, capability)
    emit_shape_attrs: list[tuple] | None = None,  # (block_slug, attr_name) -> emit_shape='child'
) -> sqlite3.Connection:
    """Create a minimal in-memory SQLite DB for unit tests.

    block_attributes rows may be 2-tuples (block_slug, attr_name) or
    3-tuples (block_slug, attr_name, role).
    blocks rows may be 2-tuples (slug, variant_attr) or 3-tuples (slug, variant_attr, tier).
    block_composition rows may be 2-tuples (block_slug, has_inner_blocks) or
    4-tuples (block_slug, has_inner_blocks, composition_role, container_kind).
    variant_enum rows are 3-tuples (block_slug, attr_name, enum_values_json) —
    the variant-attr's own declared enum roster (check #3's ambiguity rule
    reads this to see zero-discriminator variants that never get a
    variant_slots row).
    block_capabilities rows are 2-tuples (block_slug, capability) — check
    #10's second content-extraction path ('array-content-lift').
    emit_shape_attrs rows are 2-tuples (block_slug, attr_name) — each gets
    emit_shape='child' on its block_attributes row, check #10's third
    content-extraction path.
    """
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE property_suffixes "
        "(css_property TEXT, suffix TEXT, role TEXT, kind_override TEXT)"
    )
    conn.execute(
        "CREATE TABLE block_attributes "
        "(block_slug TEXT, attr_name TEXT, role TEXT, canonical_slot TEXT, "
        "enum_values TEXT, emit_shape TEXT)"
    )
    conn.execute(
        "CREATE TABLE block_capabilities "
        "(block_slug TEXT, capability TEXT)"
    )
    conn.execute(
        "CREATE TABLE blocks "
        "(slug TEXT, variant_attr TEXT, tier TEXT)"
    )
    conn.execute(
        "CREATE TABLE variant_slots "
        "(block_slug TEXT, variant_value TEXT, unique_slot TEXT)"
    )
    conn.execute(
        "CREATE TABLE block_composition "
        "(block_slug TEXT, has_inner_blocks INTEGER, composition_role TEXT, container_kind TEXT)"
    )
    conn.execute(
        "CREATE TABLE roles (role_name TEXT)"
    )

    conn.executemany(
        "INSERT INTO property_suffixes VALUES (?,?,?,?)",
        property_suffixes,
    )
    for row in block_attributes:
        if len(row) == 2:
            conn.execute(
                "INSERT INTO block_attributes (block_slug, attr_name) VALUES (?,?)",
                row,
            )
        else:
            conn.execute(
                "INSERT INTO block_attributes (block_slug, attr_name, role) VALUES (?,?,?)",
                row,
            )
    if blocks:
        for row in blocks:
            if len(row) == 2:
                conn.execute("INSERT INTO blocks (slug, variant_attr) VALUES (?,?)", row)
            else:
                conn.execute("INSERT INTO blocks (slug, variant_attr, tier) VALUES (?,?,?)", row)
    if variant_slots:
        conn.executemany("INSERT INTO variant_slots VALUES (?,?,?)", variant_slots)
    if block_composition:
        for row in block_composition:
            if len(row) == 2:
                conn.execute(
                    "INSERT INTO block_composition (block_slug, has_inner_blocks) VALUES (?,?)",
                    row,
                )
            else:
                conn.execute(
                    "INSERT INTO block_composition "
                    "(block_slug, has_inner_blocks, composition_role, container_kind) VALUES (?,?,?,?)",
                    row,
                )
    if roles:
        conn.executemany("INSERT INTO roles (role_name) VALUES (?)", roles)
    if variant_enum:
        conn.executemany(
            "INSERT INTO block_attributes (block_slug, attr_name, enum_values) VALUES (?,?,?)",
            variant_enum,
        )
    if block_capabilities:
        conn.executemany(
            "INSERT INTO block_capabilities (block_slug, capability) VALUES (?,?)",
            block_capabilities,
        )
    if emit_shape_attrs:
        conn.executemany(
            "INSERT INTO block_attributes (block_slug, attr_name, emit_shape) VALUES (?,?,'child')",
            emit_shape_attrs,
        )
    conn.commit()
    return conn


# ===========================================================================
# 3. Planted violations — each check REJECTS a bad input
# ===========================================================================

class TestCheck2PlantedViolation:
    """Check #2 — block.json hasInnerBlocks override sanity (G-A row-existence
    + G-B override-vs-AND-rule). The CORE has_inner_blocks-column drift check
    (DB stored value vs AND-rule derivation) is RETIRED (EXECUTION Step 16,
    2026-07-05) along with the block_composition.has_inner_blocks column it
    compared — see check_composition.py's module docstring. The retired
    ``test_check2_flags_stale_has_inner_blocks`` test asserted exactly that
    dead comparison and is deleted with it; G-A/G-B below never depended on
    the column value itself (only on a block_composition ROW existing), so
    they are unaffected and still exercise real check_composition.py
    behaviour against a synthetic DB.
    """

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

    def test_composition_key_format(self):
        k = composition_key("sgs/testimonial")
        assert k == "ihb:sgs/testimonial"

    def test_variant_key_format(self):
        k = variant_key("sgs/hero", "gridTemplateColumns")
        assert k == "vc:sgs/hero:gridTemplateColumns"


# ===========================================================================
# 7. Check #5 — variant_slots ↔ block.json determinism (THE valuable one)
# ===========================================================================

class TestCheck5VariantReseed:
    """Check #5: DB variant_slots equals the block.json set-difference recompute."""

    @_skip_no_db
    def test_check5_zero_violations_today(self, live_conn):
        """variant_slots is in sync with block.json today → 0 violations."""
        violations = check_variant_reseed.run(live_conn)
        assert violations == [], (
            f"Expected 0 variant-reseed violations, got {len(violations)}: "
            + "\n".join(v.detail for v in violations)
        )

    @_skip_no_db
    def test_check5_universal_over_all_variant_blocks(self, live_conn):
        """Check #5 must inspect every variant_attr block (hero + testimonial)."""
        variant_blocks = {
            r[0] for r in live_conn.execute(
                "SELECT slug FROM blocks WHERE variant_attr IS NOT NULL AND variant_attr != ''"
            ).fetchall()
        }
        assert "sgs/hero" in variant_blocks
        assert "sgs/testimonial" in variant_blocks

    def test_recompute_discriminators_set_difference(self):
        """The recompute mirrors sgs-update-v2.py: shared slots are NOT discriminators."""
        variants = {
            "standard": ["backgroundImage", "minHeight"],
            "split": ["splitImage", "minHeight"],  # minHeight shared → not a discriminator
        }
        result = recompute_discriminators(variants)
        assert ("standard", "backgroundImage") in result
        assert ("split", "splitImage") in result
        # minHeight is shared between both variants → excluded from BOTH.
        assert ("standard", "minHeight") not in result
        assert ("split", "minHeight") not in result

    def test_check5_flags_stale_variant_slots(self, tmp_path):
        """Plant: block.json says {split:splitImage}, DB has a stale gridTemplateColumns row → Violation."""
        # Build a block.json fixture.
        block_dir = tmp_path / "stale-variant"
        block_dir.mkdir()
        bj = {
            "name": "sgs/stale-variant",
            "supports": {
                "sgs": {
                    "variants": {
                        "standard": ["backgroundImage"],
                        "split": ["splitImage"],
                    }
                }
            }
        }
        (block_dir / "block.json").write_text(json.dumps(bj), encoding="utf-8")

        # DB has a STALE extra row that block.json no longer lists.
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            blocks=[("sgs/stale-variant", "variant")],
            variant_slots=[
                ("sgs/stale-variant", "standard", "backgroundImage"),
                ("sgs/stale-variant", "split", "splitImage"),
                ("sgs/stale-variant", "split", "gridTemplateColumns"),  # STALE extra
            ],
        )

        with patch.object(check_variant_reseed, "_BLOCKS_DIR", tmp_path):
            violations = check_variant_reseed.run(conn)
        conn.close()

        assert len(violations) == 1, (
            f"Expected 1 variant-reseed violation for the stale row, got {len(violations)}: "
            + "\n".join(v.detail for v in violations)
        )
        v = violations[0]
        assert v.block == "sgs/stale-variant"
        assert v.check == "variant_reseed"
        assert "gridTemplateColumns" in v.detail
        assert v.key == variant_reseed_key("sgs/stale-variant", "gridTemplateColumns")

    def test_check5_flags_missing_variant_slot(self, tmp_path):
        """Plant: block.json adds a discriminator the DB is missing → Violation."""
        block_dir = tmp_path / "missing-variant"
        block_dir.mkdir()
        bj = {
            "name": "sgs/missing-variant",
            "supports": {
                "sgs": {
                    "variants": {
                        "standard": ["backgroundImage"],
                        "split": ["splitImage", "splitImageMobile"],  # mobile not in DB
                    }
                }
            }
        }
        (block_dir / "block.json").write_text(json.dumps(bj), encoding="utf-8")

        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            blocks=[("sgs/missing-variant", "variant")],
            variant_slots=[
                ("sgs/missing-variant", "standard", "backgroundImage"),
                ("sgs/missing-variant", "split", "splitImage"),
                # splitImageMobile MISSING from DB
            ],
        )

        with patch.object(check_variant_reseed, "_BLOCKS_DIR", tmp_path):
            violations = check_variant_reseed.run(conn)
        conn.close()

        assert len(violations) == 1
        v = violations[0]
        assert "splitImageMobile" in v.detail
        assert "missing from DB" in v.detail

    def test_check5_passes_when_in_sync(self, tmp_path):
        """block.json recompute == DB rows → no Violation."""
        block_dir = tmp_path / "synced-variant"
        block_dir.mkdir()
        bj = {
            "name": "sgs/synced-variant",
            "supports": {
                "sgs": {
                    "variants": {
                        "standard": ["backgroundImage"],
                        "split": ["splitImage", "splitImageMobile"],
                    }
                }
            }
        }
        (block_dir / "block.json").write_text(json.dumps(bj), encoding="utf-8")

        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            blocks=[("sgs/synced-variant", "variant")],
            variant_slots=[
                ("sgs/synced-variant", "standard", "backgroundImage"),
                ("sgs/synced-variant", "split", "splitImage"),
                ("sgs/synced-variant", "split", "splitImageMobile"),
            ],
        )

        with patch.object(check_variant_reseed, "_BLOCKS_DIR", tmp_path):
            violations = check_variant_reseed.run(conn)
        conn.close()

        assert violations == [], (
            f"Expected 0 violations when in sync, got {len(violations)}: "
            + "\n".join(v.detail for v in violations)
        )


# ===========================================================================
# 8. Check #6 — orphan roles (role referential integrity)
# ===========================================================================

class TestCheck6OrphanRoles:
    """Check #6: every block_attributes.role exists in the roles table."""

    @_skip_no_db
    def test_check6_zero_violations_today(self, live_conn):
        """No orphan roles today (rating registered) → 0 violations."""
        violations = check_orphan_roles.run(live_conn)
        assert violations == [], (
            f"Expected 0 orphan-role violations, got {len(violations)}: "
            + "\n".join(v.detail for v in violations)
        )

    def test_check6_flags_orphan_role(self):
        """Plant: an attr role not in the roles table → Violation."""
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[
                ("sgs/test-block", "someAttr", "phantom-role"),  # role with no roles row
            ],
            roles=[("known-role",)],  # phantom-role NOT registered
        )
        violations = check_orphan_roles.run(conn)
        conn.close()

        assert len(violations) == 1, (
            f"Expected 1 orphan-role violation, got {len(violations)}"
        )
        v = violations[0]
        assert v.check == "orphan_roles"
        assert "phantom-role" in v.detail
        assert v.key == orphan_role_key("phantom-role")

    def test_check6_passes_registered_role(self):
        """A role present in the roles table → no Violation."""
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[
                ("sgs/test-block", "someAttr", "rating"),
            ],
            roles=[("rating",), ("layout",)],
        )
        violations = check_orphan_roles.run(conn)
        conn.close()
        assert violations == [], (
            f"Expected 0 violations for a registered role, got {len(violations)}"
        )

    def test_check6_ignores_null_and_empty_roles(self):
        """NULL/empty roles are not flagged (they're not classified)."""
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[
                ("sgs/test-block", "attrA", None),
                ("sgs/test-block", "attrB", ""),
            ],
            roles=[("layout",)],
        )
        violations = check_orphan_roles.run(conn)
        conn.close()
        assert violations == [], "NULL/empty roles must not be flagged as orphans"


# ===========================================================================
# 9. Check #7 — tier ↔ composition_role/container_kind
# ===========================================================================

class TestCheck7TierComposition:
    """Check #7: tier=class-section blocks have valid composition_role + container_kind."""

    @_skip_no_db
    def test_check7_zero_violations_today(self, live_conn):
        """All 3 class-section blocks pass today → 0 violations."""
        violations = check_tier_composition.run(live_conn)
        assert violations == [], (
            f"Expected 0 tier-composition violations, got {len(violations)}: "
            + "\n".join(v.detail for v in violations)
        )

    @_skip_no_db
    def test_check7_content_block_role_allowed(self, live_conn):
        """trust-bar uses composition_role='content-block' — must NOT be flagged."""
        # trust-bar is tier=class-section with content-block — verify it passes.
        violations = check_tier_composition.run(live_conn)
        flagged = {v.block for v in violations}
        assert "sgs/trust-bar" not in flagged, (
            "sgs/trust-bar (content-block) was wrongly flagged — content-block IS valid"
        )

    def test_check7_flags_null_container_kind(self):
        """Plant: a class-section block with NULL container_kind → Violation."""
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            blocks=[("sgs/bad-section", None, "class-section")],
            block_composition=[("sgs/bad-section", 0, "section-root", None)],  # container_kind NULL
        )
        violations = check_tier_composition.run(conn)
        conn.close()

        assert len(violations) == 1, (
            f"Expected 1 tier-composition violation, got {len(violations)}"
        )
        v = violations[0]
        assert v.check == "tier_composition"
        assert "container_kind" in v.detail
        assert v.key == tier_composition_key("sgs/bad-section")

    def test_check7_flags_invalid_composition_role(self):
        """Plant: a class-section block with composition_role='leaf' → Violation."""
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            blocks=[("sgs/bad-role", None, "class-section")],
            block_composition=[("sgs/bad-role", 0, "leaf", "section")],  # leaf is invalid for class-section
        )
        violations = check_tier_composition.run(conn)
        conn.close()

        assert len(violations) == 1
        v = violations[0]
        assert "composition_role" in v.detail

    def test_check7_passes_content_block(self):
        """A class-section block with content-block role + container_kind → no Violation."""
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            blocks=[("sgs/good-section", None, "class-section")],
            block_composition=[("sgs/good-section", 0, "content-block", "section")],
        )
        violations = check_tier_composition.run(conn)
        conn.close()
        assert violations == [], (
            f"Expected 0 violations for a valid content-block class-section, got {len(violations)}"
        )

    def test_check7_passes_section_root(self):
        """A class-section block with section-root role → no Violation."""
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            blocks=[("sgs/root-section", None, "class-section")],
            block_composition=[("sgs/root-section", 0, "section-root", "section")],
        )
        violations = check_tier_composition.run(conn)
        conn.close()
        assert violations == []

    def test_check7_ignores_non_class_section_blocks(self):
        """A tier='block' block is not subject to this check even with NULL container_kind."""
        conn = _make_minimal_db(
            property_suffixes=[],
            block_attributes=[],
            blocks=[("sgs/plain-block", None, "block")],
            block_composition=[("sgs/plain-block", 0, "leaf", None)],
        )
        violations = check_tier_composition.run(conn)
        conn.close()
        assert violations == [], "Non-class-section blocks must not be checked"


# ===========================================================================
# 10. New model keys — stable format
# ===========================================================================

class TestNewModelKeys:
    """Verify the 4 new stable dedup keys match the specified prefixes."""

    def test_variant_reseed_key_format(self):
        assert variant_reseed_key("sgs/hero", "splitImage") == "vslot:sgs/hero:splitImage"

    def test_orphan_role_key_format(self):
        assert orphan_role_key("rating") == "orphan:rating"

    def test_tier_composition_key_format(self):
        assert tier_composition_key("sgs/hero") == "tiercomp:sgs/hero"

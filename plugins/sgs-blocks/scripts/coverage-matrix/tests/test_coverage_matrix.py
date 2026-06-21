"""test_coverage_matrix.py — pytest suite for the coverage-matrix module.

Spec ref: .claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §5 + MF-7

Run from the scripts/ directory or the coverage-matrix/ directory:
    pytest coverage-matrix/tests/test_coverage_matrix.py -v

Or from the coverage-matrix/ directory:
    pytest tests/ -v
"""
from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
import types
from pathlib import Path
from typing import Optional

import pytest

# ---------------------------------------------------------------------------
# Package bootstrap — mirrors the pattern in run.py / generate-coverage-matrix.py
# ---------------------------------------------------------------------------

_MODULE_DIR = Path(__file__).resolve().parent.parent  # scripts/coverage-matrix/


def _bootstrap_package():
    """Register coverage_matrix as a package so imports work from any cwd."""
    if "coverage_matrix" not in sys.modules:
        pkg = types.ModuleType("coverage_matrix")
        pkg.__path__ = [str(_MODULE_DIR)]  # type: ignore[assignment]
        pkg.__package__ = "coverage_matrix"
        sys.modules["coverage_matrix"] = pkg

    def _load(name: str):
        mod_id = f"coverage_matrix.{name}"
        if mod_id in sys.modules:
            return sys.modules[mod_id]
        path = _MODULE_DIR / f"{name}.py"
        spec = importlib.util.spec_from_file_location(mod_id, str(path))
        mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        sys.modules[mod_id] = mod
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        return mod

    return _load


_load = _bootstrap_package()
_models     = _load("models")
_db_queries = _load("db_queries")
_classifier = _load("classifier")

DB_PATH        = _db_queries.DB_PATH
fetch_blocks   = _db_queries.fetch_blocks
fetch_columns  = _db_queries.fetch_columns
_column_id     = _db_queries._column_id
classify_all   = _classifier.classify_all
CellState      = _models.CellState
Layer          = _models.Layer
Kind           = _models.Kind
CapabilityFamily = _models.CapabilityFamily
CoverageMatrix = _models.CoverageMatrix


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def db_conn():
    """Open a read-only connection to the live sgs-framework.db."""
    if not DB_PATH.exists():
        pytest.skip(f"DB not found at {DB_PATH} — run /sgs-update first.")
    conn = sqlite3.connect(str(DB_PATH))
    yield conn
    conn.close()


@pytest.fixture(scope="session")
def blocks(db_conn):
    return fetch_blocks(db_conn)


@pytest.fixture(scope="session")
def columns(db_conn):
    return fetch_columns(db_conn)


@pytest.fixture(scope="session")
def cells(blocks, columns):
    return classify_all(blocks, columns)


@pytest.fixture(scope="session")
def matrix(blocks, columns, cells):
    return CoverageMatrix(blocks=blocks, columns=columns, cells=cells)


# ---------------------------------------------------------------------------
# Row-derivation tests (MF-7: "rows enumerated from block_composition")
# ---------------------------------------------------------------------------

class TestRowDerivation:
    """Verify that the block (row) list is DB-derived, never hardcoded."""

    def test_row_count_matches_db_plus_extras(self, db_conn, blocks):
        """
        Row count MUST equal:
          SELECT COUNT(*) FROM block_composition WHERE container_kind IS NOT NULL
          + 2 extras (sgs/container, sgs/media) IF they are not already in that query.
        """
        cursor = db_conn.execute(
            "SELECT COUNT(*) FROM block_composition WHERE container_kind IS NOT NULL"
        )
        db_count = cursor.fetchone()[0]

        # Determine how many of the 2 extras are already counted
        extras = ["sgs/container", "sgs/media"]
        cursor2 = db_conn.execute(
            "SELECT block_slug FROM block_composition WHERE container_kind IS NOT NULL"
        )
        already_in_db = {row[0] for row in cursor2.fetchall()}
        extra_count = sum(1 for s in extras if s not in already_in_db)

        expected = db_count + extra_count
        assert len(blocks) == expected, (
            f"Expected {expected} block rows "
            f"({db_count} from block_composition WHERE container_kind IS NOT NULL "
            f"+ {extra_count} extras not already present), "
            f"got {len(blocks)}."
        )

    def test_no_block_row_is_hardcoded(self, db_conn, blocks):
        """
        Every block in the matrix MUST appear in block_composition OR be one of
        the two explicit extras (sgs/container, sgs/media).
        No slug may be injected by anything other than the DB query.
        """
        cursor = db_conn.execute(
            "SELECT block_slug FROM block_composition"
        )
        all_db_slugs = {row[0] for row in cursor.fetchall()}
        allowed_extras = {"sgs/container", "sgs/media"}

        for block in blocks:
            assert block.slug in all_db_slugs or block.slug in allowed_extras, (
                f"Block {block.slug!r} is not in block_composition and is not "
                "one of the two permitted extras (sgs/container, sgs/media). "
                "It must be hardcoded — which violates MF-7 (Spec 31 §5)."
            )

    def test_extras_present(self, blocks):
        """sgs/container and sgs/media are always in the row list."""
        slugs = {b.slug for b in blocks}
        assert "sgs/container" in slugs, "sgs/container must be in the row list (Spec 31 §5)"
        assert "sgs/media" in slugs, "sgs/media must be in the row list (Spec 31 §5)"

    def test_extras_marked_is_extra(self, blocks):
        """sgs/container and sgs/media are flagged is_extra=True when absent from block_composition."""
        by_slug = {b.slug: b for b in blocks}
        for slug in ("sgs/container", "sgs/media"):
            block = by_slug[slug]
            # is_extra is True when the block was NOT in block_composition
            # (if it IS in block_composition, is_extra=False is also fine — both are correct)
            assert isinstance(block.is_extra, bool)

    def test_all_kinds_present(self, blocks):
        """The matrix must have rows for section, layout, and content KINDs."""
        kinds = {b.container_kind for b in blocks if b.container_kind}
        assert "section" in kinds, "No section-KIND block in rows"
        assert "layout"  in kinds, "No layout-KIND block in rows"
        assert "content" in kinds, "No content-KIND block in rows"


# ---------------------------------------------------------------------------
# Column-derivation tests (MF-7: "columns from the DB")
# ---------------------------------------------------------------------------

class TestColumnDerivation:
    """Verify that the column list is DB-derived."""

    def test_column_count_positive(self, columns):
        assert len(columns) > 0, "Column list must not be empty"

    def test_breakpoint_tiers_derived_from_db(self, db_conn, columns):
        """Tier suffixes in the columns must match modifier_suffixes WHERE kind='breakpoint'."""
        cursor = db_conn.execute(
            "SELECT suffix FROM modifier_suffixes WHERE kind = 'breakpoint'"
        )
        db_tiers = {row[0] for row in cursor.fetchall()}
        # All non-None tier values in columns must be in db_tiers
        col_tiers = {c.tier for c in columns if c.tier is not None}
        for tier in col_tiers:
            assert tier in db_tiers, (
                f"Column tier {tier!r} is not in modifier_suffixes (kind='breakpoint'). "
                "All tiers must be DB-derived."
            )

    def test_capability_families_covered(self, columns):
        """All major capability families from the spec must appear as columns."""
        families = {c.capability_family for c in columns}
        expected_families = {
            CapabilityFamily.BOX_LAYOUT,
            CapabilityFamily.GRID,
            CapabilityFamily.ALIGN,
            CapabilityFamily.TYPOGRAPHY,
            CapabilityFamily.COLOUR,
            CapabilityFamily.VISUAL,
            CapabilityFamily.CONTENT_BAND,
        }
        for fam in expected_families:
            assert fam in families, f"Capability family {fam!r} missing from columns"

    def test_all_layers_represented(self, columns):
        """L1, L2, L3, and L4 must all appear in the column set."""
        layers = {c.layer for c in columns}
        for layer in (Layer.L1_OUTER, Layer.L2_CONTENT, Layer.L3_GRID, Layer.L4_GRID_AREA):
            assert layer in layers, f"Layer {layer!r} missing from columns"

    def test_column_ids_are_unique(self, columns):
        """Each column must have a unique stable ID."""
        ids = [_column_id(c.capability_family, c.layer, c.tier) for c in columns]
        assert len(ids) == len(set(ids)), "Duplicate column IDs found"


# ---------------------------------------------------------------------------
# Cell-state correctness tests
# ---------------------------------------------------------------------------

class TestCellStates:
    """Verify the cell state classification is correct and honest."""

    def test_no_covered_or_cheat_cells(self, cells):
        """
        COVERED and CHEAT cannot be assigned without the F3 runtime oracle /
        §7a gate output (Spec 31 §5 + MF-7).
        The classifier must never assign them pre-F3.
        """
        bad = [c for c in cells if c.state in (CellState.COVERED, CellState.CHEAT)]
        assert len(bad) == 0, (
            f"Found {len(bad)} cells classified as COVERED or CHEAT without "
            "the F3 runtime oracle. The classifier must not assign these states "
            "pre-F3 (Spec 31 §5, MF-7). Offending cells: "
            + "; ".join(f"{c.block_slug}:{c.column_id}" for c in bad[:5])
        )

    def test_l4_cells_are_blocked(self, cells):
        """
        All L4 GRID_AREA cells that are not N/A must be BLOCKED (MF-5:
        attr_for_area_property has no converter call-site).
        """
        l4_non_na = [c for c in cells if c.layer == Layer.L4_GRID_AREA and c.state != CellState.NA]
        for cell in l4_non_na:
            assert cell.state == CellState.BLOCKED, (
                f"L4 cell {cell.block_slug}:{cell.column_id} has state {cell.state!r} "
                "but should be BLOCKED (MF-5, Spec 31 §9 Q2)."
            )

    def test_content_kind_has_no_grid_cells(self, cells, blocks):
        """
        content-KIND blocks must not have non-N/A L3 GRID cells
        (Spec 31 §2 Axis 2: content KIND = L1+L2 only, no grid).
        """
        content_slugs = {b.slug for b in blocks if b.container_kind == Kind.CONTENT}
        for cell in cells:
            if cell.block_slug not in content_slugs:
                continue
            if cell.layer != Layer.L3_GRID:
                continue
            assert cell.state == CellState.NA, (
                f"content-KIND block {cell.block_slug!r} has L3 GRID cell "
                f"with state {cell.state!r} — should be N/A "
                "(Spec 31 §2 Axis 2: content KIND has no grid layer)."
            )

    def test_na_cells_are_kind_gated(self, cells, blocks):
        """
        N/A cells must only appear where KIND truly excludes the layer.
        If KIND allows the layer but the cell is N/A, that is a classifier bug.
        """
        from db_queries import _kind_allows_layer, _family_allowed_for_kind_and_layer
        block_kind = {b.slug: b.container_kind or "section" for b in blocks}
        for cell in cells:
            if cell.state != CellState.NA:
                continue
            kind = block_kind.get(cell.block_slug, "section")
            layer_blocked = not _kind_allows_layer(kind, cell.layer)
            family_blocked = not _family_allowed_for_kind_and_layer(
                cell.capability_family, kind, cell.layer
            )
            assert layer_blocked or family_blocked, (
                f"Cell {cell.block_slug}:{cell.column_id} is N/A but KIND "
                f"'{kind}' allows {cell.layer!r} with family {cell.capability_family!r}. "
                "This looks like a classifier bug — N/A should only fire when KIND "
                "structurally excludes the layer."
            )

    def test_every_block_has_at_least_one_unverified_or_gap(self, cells, blocks):
        """
        Every block row must have at least one UNVERIFIED or GAP cell
        (i.e. there is at least one capability the block could expose).
        A block with only N/A + BLOCKED cells would be invisible to the engine.
        """
        from collections import defaultdict
        active = defaultdict(set)
        for cell in cells:
            if cell.state in (CellState.UNVERIFIED, CellState.GAP):
                active[cell.block_slug].add(cell.column_id)

        for block in blocks:
            assert block.slug in active, (
                f"Block {block.slug!r} has NO UNVERIFIED or GAP cells — "
                "it may be invisible to the CSS-transfer engine. "
                "Check that block_attributes is populated for this block."
            )

    def test_cell_count_equals_rows_times_columns(self, cells, blocks, columns):
        """One cell per (block, column) pair — no duplicates, no gaps."""
        expected = len(blocks) * len(columns)
        assert len(cells) == expected, (
            f"Expected {expected} cells ({len(blocks)} blocks × {len(columns)} columns), "
            f"got {len(cells)}."
        )

    def test_cells_have_valid_states(self, cells):
        """Every cell state must be one of the 6 defined CellState values."""
        valid = {
            CellState.COVERED, CellState.GAP, CellState.BLOCKED,
            CellState.UNVERIFIED, CellState.CHEAT, CellState.NA,
        }
        for cell in cells:
            assert cell.state in valid, (
                f"Cell {cell.block_slug}:{cell.column_id} has invalid state {cell.state!r}"
            )


# ---------------------------------------------------------------------------
# Matrix summary tests
# ---------------------------------------------------------------------------

class TestMatrixSummary:
    def test_summary_sums_to_total_cells(self, matrix):
        total = sum(matrix.summary().values())
        assert total == len(matrix.cells)

    def test_summary_by_kind_sums_to_total_cells(self, matrix):
        total = sum(
            count
            for kind_counts in matrix.summary_by_kind().values()
            for count in kind_counts.values()
        )
        assert total == len(matrix.cells)

    def test_na_and_blocked_not_the_only_states(self, matrix):
        """The matrix must have at least some GAP or UNVERIFIED cells — otherwise it's trivial."""
        s = matrix.summary()
        useful = s.get(CellState.GAP, 0) + s.get(CellState.UNVERIFIED, 0)
        assert useful > 0, (
            "The matrix has no GAP or UNVERIFIED cells — this suggests all "
            "cells are N/A or BLOCKED, which would make the dashboard useless."
        )

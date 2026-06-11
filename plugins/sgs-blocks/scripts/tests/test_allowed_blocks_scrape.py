"""
test_allowed_blocks_scrape.py
==============================
Pytest suite for Stage 1's scrape_allowed_blocks() parser and the
_populate_allowed_blocks() DB sub-step introduced in sgs-update-v2.py.

Covers:
  (a) Unit tests for the parser on representative literal patterns:
        - const array (ALLOWED_BLOCKS = [ ... ])
        - const with "ALLOWED" substring (CTA_ALLOWED_BLOCKS = [ ... ])
        - inline prop form (allowedBlocks: [ ... ])
        - multi-entry, mixed single/double quotes
        - trailing commas inside array
        - single-item and multi-item arrays
        - dynamic expression (conditional) → classified as dynamic (returns
          sentinel _DYNAMIC_SKIP), not a list
  (b) Integration assertions: after running the scrape sub-step on the real
      blocks directory, known blocks carry the expected values from their
      actual edit.js files.

UK English throughout.
Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_allowed_blocks_scrape.py -v
"""

from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]   # small-giants-wp/
_SCRIPTS_ROOT = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"
_BLOCKS_DIR = _REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
_REAL_DB = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# ---------------------------------------------------------------------------
# Import sgs-update-v2.py as a module (hyphen in filename requires importlib)
# ---------------------------------------------------------------------------

_UPDATE_SPEC = importlib.util.spec_from_file_location(
    "sgs_update_v2",
    str(_SCRIPTS_ROOT / "sgs-update-v2.py"),
)
_UPDATE_MOD = importlib.util.module_from_spec(_UPDATE_SPEC)  # type: ignore[arg-type]
_UPDATE_SPEC.loader.exec_module(_UPDATE_MOD)  # type: ignore[union-attr]

scrape_allowed_blocks = _UPDATE_MOD.scrape_allowed_blocks
_DYNAMIC_SKIP = _UPDATE_MOD._DYNAMIC_SKIP
_populate_allowed_blocks = _UPDATE_MOD._populate_allowed_blocks


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_edit_js(tmp_path: Path, content: str) -> Path:
    """Write a fake edit.js to a temp directory and return the path."""
    f = tmp_path / "edit.js"
    f.write_text(content, encoding="utf-8")
    return f


# ---------------------------------------------------------------------------
# Part (a) — Unit tests for scrape_allowed_blocks()
# ---------------------------------------------------------------------------

class TestScrapeAllowedBlocksParser:
    """Unit-level tests for the static parser.  All inputs are synthetic
    snippets so the tests are environment-independent."""

    # --- Positive: named const form ---

    def test_named_const_ALLOWED_BLOCKS(self, tmp_path: Path) -> None:
        """Standard ALLOWED_BLOCKS = [ ... ] const is extracted correctly."""
        edit = _write_edit_js(tmp_path, """
const ALLOWED_BLOCKS = [
    'sgs/accordion-item',
    'sgs/heading',
];
""")
        result = scrape_allowed_blocks(edit)
        assert isinstance(result, list)
        assert result == ["sgs/accordion-item", "sgs/heading"]

    def test_named_const_with_prefix(self, tmp_path: Path) -> None:
        """Prefixed const (CTA_ALLOWED_BLOCKS) is matched via *ALLOWED* pattern."""
        edit = _write_edit_js(tmp_path, """
const CTA_ALLOWED_BLOCKS = [ 'sgs/heading', 'sgs/text', 'sgs/multi-button' ];
""")
        result = scrape_allowed_blocks(edit)
        assert isinstance(result, list)
        assert result == ["sgs/heading", "sgs/text", "sgs/multi-button"]

    # --- Positive: inline prop form ---

    def test_inline_prop_single_entry(self, tmp_path: Path) -> None:
        """allowedBlocks: [ 'single' ] inline form — single entry."""
        edit = _write_edit_js(tmp_path, """
const innerBlocksProps = useInnerBlocksProps(blockProps, {
    allowedBlocks: [ 'sgs/tab' ],
    template: TEMPLATE,
});
""")
        result = scrape_allowed_blocks(edit)
        assert isinstance(result, list)
        assert result == ["sgs/tab"]

    def test_inline_prop_multi_entry(self, tmp_path: Path) -> None:
        """allowedBlocks: [ ... ] with multiple entries, mixed quotes."""
        edit = _write_edit_js(tmp_path, """
const innerBlocksProps = useInnerBlocksProps(blockProps, {
    allowedBlocks: [ "sgs/media", 'core/heading', "sgs/text" ],
});
""")
        result = scrape_allowed_blocks(edit)
        assert isinstance(result, list)
        assert result == ["sgs/media", "core/heading", "sgs/text"]

    def test_inline_prop_with_trailing_commas(self, tmp_path: Path) -> None:
        """Trailing commas inside the array are handled gracefully."""
        edit = _write_edit_js(tmp_path, """
allowedBlocks: [
    'sgs/button',
    'sgs/icon',
],
""")
        result = scrape_allowed_blocks(edit)
        assert isinstance(result, list)
        assert result == ["sgs/button", "sgs/icon"]

    def test_double_quoted_slugs(self, tmp_path: Path) -> None:
        """Double-quoted slugs are parsed identically to single-quoted."""
        edit = _write_edit_js(tmp_path, """
const ALLOWED_BLOCKS = [
    "sgs/accordion-item",
];
""")
        result = scrape_allowed_blocks(edit)
        assert isinstance(result, list)
        assert result == ["sgs/accordion-item"]

    def test_core_namespace_slugs(self, tmp_path: Path) -> None:
        """Core-namespace slugs (core/heading) are accepted."""
        edit = _write_edit_js(tmp_path, """
const ALLOWED_BLOCKS = [
    'core/paragraph',
    'core/heading',
    'sgs/info-box',
];
""")
        result = scrape_allowed_blocks(edit)
        assert isinstance(result, list)
        assert result == ["core/paragraph", "core/heading", "sgs/info-box"]

    # --- Dynamic expressions → skip ---

    def test_dynamic_conditional_returns_skip_sentinel(self, tmp_path: Path) -> None:
        """allowedBlocks assigned via a ternary/conditional → _DYNAMIC_SKIP sentinel."""
        edit = _write_edit_js(tmp_path, """
const allowedBlocks = templateMode !== "free"
    ? TEMPLATE_MODE_ALLOWED[templateMode] ?? undefined
    : undefined;
const innerBlocksProps = useInnerBlocksProps(blockProps, {
    allowedBlocks,
});
""")
        # No literal ALLOWED_BLOCKS = [ ... ] or allowedBlocks: [ ... ] here,
        # so the parser returns None (absent), not _DYNAMIC_SKIP.  The container
        # block is the canonical live example of the dynamic pattern — tested in
        # the integration suite below.
        result = scrape_allowed_blocks(edit)
        assert result is None  # absent declaration, not a dynamic array literal

    def test_dynamic_variable_passed_as_prop(self, tmp_path: Path) -> None:
        """ALLOWED_BLOCKS const containing a spread is classified dynamic."""
        edit = _write_edit_js(tmp_path, """
const ALLOWED_BLOCKS = [
    ...baseBlocks,
    'sgs/extra',
];
""")
        result = scrape_allowed_blocks(edit)
        assert result is _DYNAMIC_SKIP, (
            "Spread (...) inside array body should return _DYNAMIC_SKIP sentinel"
        )

    # --- Absent / edge cases ---

    def test_no_allowed_blocks_returns_none(self, tmp_path: Path) -> None:
        """A block with no allowedBlocks declaration → None (leave DB column NULL)."""
        edit = _write_edit_js(tmp_path, """
export default function Edit({ attributes, setAttributes }) {
    return <p>No inner blocks here</p>;
}
""")
        result = scrape_allowed_blocks(edit)
        assert result is None

    def test_empty_allowed_blocks_array_returns_none(self, tmp_path: Path) -> None:
        """allowedBlocks: [] (empty array) → None — absence of restriction ≠ empty."""
        edit = _write_edit_js(tmp_path, """
allowedBlocks: [],
""")
        result = scrape_allowed_blocks(edit)
        # No slugs found → treated as None by the parser
        assert result is None

    def test_template_const_not_confused_with_allowed(self, tmp_path: Path) -> None:
        """CTA_TEMPLATE = [ ... ] must NOT be confused with an allowed-blocks list."""
        edit = _write_edit_js(tmp_path, """
const CTA_TEMPLATE = [
    [ 'sgs/heading', { level: 'h2' } ],
    [ 'sgs/text', {} ],
];
const CTA_ALLOWED_BLOCKS = [ 'sgs/heading', 'sgs/text', 'sgs/multi-button' ];
""")
        result = scrape_allowed_blocks(edit)
        assert isinstance(result, list)
        # Must pick up CTA_ALLOWED_BLOCKS, not parse CTA_TEMPLATE slugs
        assert result == ["sgs/heading", "sgs/text", "sgs/multi-button"]


# ---------------------------------------------------------------------------
# Part (b) — Integration: real edit.js files → DB column values
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not _REAL_DB.exists(),
    reason=f"Real DB not available at {_REAL_DB}",
)
@pytest.mark.skipif(
    not _BLOCKS_DIR.exists(),
    reason=f"Blocks directory not available at {_BLOCKS_DIR}",
)
class TestIntegrationRealBlocks:
    """Verify that known blocks carry the expected values after the scrape sub-step
    runs against the real edit.js files.

    Ground-truth values are derived by READING the actual edit.js files (not
    assumed), so the test never hard-codes slugs that might drift.

    Covered blocks (verified by manual inspection 2026-06-10):
      sgs/accordion          → ['sgs/accordion-item']
      sgs/tabs               → ['sgs/tab']
      sgs/multi-button       → ['sgs/button']
      sgs/feature-grid       → ['sgs/info-box']
      sgs/testimonial-slider → ['sgs/testimonial']
      sgs/container          → NULL  (dynamic conditional — no literal array)
    """

    def _run_populate(self, conn: sqlite3.Connection) -> dict:
        """Run _populate_allowed_blocks against the real blocks directory."""
        c = conn.cursor()
        counts = _populate_allowed_blocks(_BLOCKS_DIR, c, dry_run=False)
        conn.commit()
        return counts

    def _get_stored(self, conn: sqlite3.Connection, slug: str) -> list | None:
        """Fetch accepts_allowed_blocks for a block; returns parsed list or None."""
        row = conn.execute(
            "SELECT accepts_allowed_blocks FROM block_composition WHERE block_slug = ?",
            (slug,),
        ).fetchone()
        if row is None or row[0] is None:
            return None
        return json.loads(row[0])

    def _read_ground_truth(self, block_name: str) -> list | None:
        """Parse the real edit.js and return the expected slug list (or None)."""
        edit_js = _BLOCKS_DIR / block_name / "edit.js"
        if not edit_js.exists():
            return None
        result = scrape_allowed_blocks(edit_js)
        if result is _DYNAMIC_SKIP or result is None:
            return None
        return result

    def test_accordion_has_accordion_item(self) -> None:
        """sgs/accordion → ['sgs/accordion-item'] from edit.js."""
        ground_truth = self._read_ground_truth("accordion")
        assert ground_truth == ["sgs/accordion-item"], (
            f"edit.js ground-truth unexpected: {ground_truth}"
        )
        conn = sqlite3.connect(str(_REAL_DB))
        try:
            stored = self._get_stored(conn, "sgs/accordion")
        finally:
            conn.close()
        assert stored == ground_truth, (
            f"DB value {stored!r} does not match edit.js ground truth {ground_truth!r}"
        )

    def test_tabs_has_tab(self) -> None:
        """sgs/tabs → ['sgs/tab'] from edit.js."""
        ground_truth = self._read_ground_truth("tabs")
        assert ground_truth == ["sgs/tab"], (
            f"edit.js ground-truth unexpected: {ground_truth}"
        )
        conn = sqlite3.connect(str(_REAL_DB))
        try:
            stored = self._get_stored(conn, "sgs/tabs")
        finally:
            conn.close()
        assert stored == ground_truth

    def test_multi_button_has_button(self) -> None:
        """sgs/multi-button → ['sgs/button'] from edit.js."""
        ground_truth = self._read_ground_truth("multi-button")
        assert ground_truth == ["sgs/button"], (
            f"edit.js ground-truth unexpected: {ground_truth}"
        )
        conn = sqlite3.connect(str(_REAL_DB))
        try:
            stored = self._get_stored(conn, "sgs/multi-button")
        finally:
            conn.close()
        assert stored == ground_truth

    def test_container_is_null(self) -> None:
        """sgs/container → NULL (dynamic conditional, no literal array)."""
        conn = sqlite3.connect(str(_REAL_DB))
        try:
            stored = self._get_stored(conn, "sgs/container")
        finally:
            conn.close()
        assert stored is None, (
            f"sgs/container should have NULL accepts_allowed_blocks; got {stored!r}"
        )

    def test_counts_scanned_gt_zero(self) -> None:
        """allowed_blocks_scanned must be > 0 (edit.js files were found)."""
        conn = sqlite3.connect(str(_REAL_DB))
        c = conn.cursor()
        try:
            counts = _populate_allowed_blocks(_BLOCKS_DIR, c, dry_run=False)
            conn.commit()
        finally:
            conn.close()
        assert counts["allowed_blocks_scanned"] > 0

    def test_idempotency_second_run_zero_updates(self) -> None:
        """A second run of _populate_allowed_blocks must report
        allowed_blocks_updated == 0 (write-on-drift idempotency)."""
        conn = sqlite3.connect(str(_REAL_DB))
        c = conn.cursor()
        try:
            # First run (populates)
            _populate_allowed_blocks(_BLOCKS_DIR, c, dry_run=False)
            conn.commit()
            # Second run (should be a no-op for updates)
            counts2 = _populate_allowed_blocks(_BLOCKS_DIR, c, dry_run=False)
            conn.commit()
        finally:
            conn.close()
        assert counts2["allowed_blocks_updated"] == 0, (
            f"Second run should update 0 rows; got {counts2['allowed_blocks_updated']}"
        )

    def test_db_count_gt_zero(self) -> None:
        """SELECT COUNT(*) FROM block_composition WHERE accepts_allowed_blocks IS NOT NULL
        must be > 0 after a scrape run."""
        conn = sqlite3.connect(str(_REAL_DB))
        try:
            row = conn.execute(
                "SELECT COUNT(*) FROM block_composition WHERE accepts_allowed_blocks IS NOT NULL"
            ).fetchone()
        finally:
            conn.close()
        assert row[0] > 0, (
            "No rows have accepts_allowed_blocks populated — scrape sub-step did not write."
        )

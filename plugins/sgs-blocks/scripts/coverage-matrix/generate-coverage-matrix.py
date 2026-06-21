"""generate-coverage-matrix.py — Spec 31 §5 + MF-7 auto-generated coverage dashboard.

Spec ref:
  .claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md  §2, §4, §5, §7b, MF-7

Usage
-----
    python generate-coverage-matrix.py              # generate + print summary (default)
    python generate-coverage-matrix.py --check      # generate + informational check (always exit 0)
    python generate-coverage-matrix.py --out PATH   # write JSON to a custom path

What this is (and what it isn't)
---------------------------------
This is a SECONDARY validation/dashboard (Spec 31 §5 note):

  "The matrix only sees cells it already knows about (it cannot see the ~15
  no-suffix-row property classes), whereas the F2 draft-declaration ledger
  accounts for the whole draft declaration stream.  The matrix is a secondary
  validation/dashboard, not the completeness gate."

This script NEVER exits non-zero in normal operation.  --check is informational.
The hard completeness gate is the F2 draft-declaration ledger (not yet built).

Current state classification limits
-------------------------------------
Without the F3 runtime oracle this script can only classify:
  N/A        — KIND does not expose this layer (structurally impossible cells)
  BLOCKED    — L4 GRID_AREA cells (no converter call-site, MF-5)
  GAP        — no destination attr in block_attributes
  UNVERIFIED — destination attr exists but not live-probed

It CANNOT classify:
  COVERED — requires F3 render-diff oracle (LANDED on non-default-value fixture)
  CHEAT   — requires §7a check-converter-cheats.py gate output (MF-7)

This is stated honestly in the JSON output and the printed summary.
"""
from __future__ import annotations

import argparse
import importlib
import importlib.util
import json
import sqlite3
import sys
from pathlib import Path
from typing import Optional

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Module bootstrap — mirrors the F6 db-consistency pattern
# Works both as `python generate-coverage-matrix.py` and when imported.
# ---------------------------------------------------------------------------

_SCRIPT_DIR = Path(__file__).resolve().parent   # scripts/coverage-matrix/

def _load_sibling(name: str):
    """Load a sibling module from the coverage-matrix/ directory by filename."""
    module_path = _SCRIPT_DIR / f"{name}.py"
    if not module_path.exists():
        raise ImportError(f"[coverage-matrix] Cannot find sibling module: {module_path}")
    mod_id = f"coverage_matrix.{name}"
    if mod_id in sys.modules:
        return sys.modules[mod_id]
    spec = importlib.util.spec_from_file_location(mod_id, str(module_path))
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    sys.modules[mod_id] = mod
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod

if "coverage_matrix" not in sys.modules:
    import types
    pkg = types.ModuleType("coverage_matrix")
    pkg.__path__ = [str(_SCRIPT_DIR)]  # type: ignore[assignment]
    pkg.__package__ = "coverage_matrix"
    sys.modules["coverage_matrix"] = pkg

_models_mod     = _load_sibling("models")
_db_queries_mod = _load_sibling("db_queries")
_classifier_mod = _load_sibling("classifier")

CellState       = _models_mod.CellState
CoverageMatrix  = _models_mod.CoverageMatrix
DB_PATH         = _db_queries_mod.DB_PATH
fetch_blocks    = _db_queries_mod.fetch_blocks
fetch_columns   = _db_queries_mod.fetch_columns
_column_id      = _db_queries_mod._column_id
classify_all    = _classifier_mod.classify_all

# ---------------------------------------------------------------------------
# Default output path
# ---------------------------------------------------------------------------
_DEFAULT_OUT = _SCRIPT_DIR / "coverage-matrix.json"


# ---------------------------------------------------------------------------
# Serialisation helpers
# ---------------------------------------------------------------------------

def _blocks_to_dict(blocks) -> list[dict]:
    return [
        {
            "slug":            b.slug,
            "container_kind":  b.container_kind,
            "has_inner_blocks": b.has_inner_blocks,
            "is_extra":        b.is_extra,
            "attr_count":      len(b.attr_names),
        }
        for b in blocks
    ]


def _columns_to_dict(columns) -> list[dict]:
    return [
        {
            "column_id":          _column_id(c.capability_family, c.layer, c.tier),
            "capability_family":  c.capability_family,
            "layer":              c.layer,
            "tier":               c.tier,
            "css_properties":     c.css_properties,
        }
        for c in columns
    ]


def _cells_to_dict(cells) -> list[dict]:
    return [
        {
            "block_slug":        cell.block_slug,
            "column_id":         cell.column_id,
            "layer":             cell.layer,
            "capability_family": cell.capability_family,
            "tier":              cell.tier,
            "state":             cell.state,
            "reason":            cell.reason,
        }
        for cell in cells
    ]


def _build_matrix_json(matrix: CoverageMatrix, row_count: int, col_count: int) -> dict:
    return {
        "spec":    "Spec 31 §5 + MF-7",
        "version": "0.1-pre-F3",
        "note": (
            "SECONDARY dashboard only. "
            "COVERED/CHEAT classification requires F3 runtime oracle (deferred). "
            "Primary completeness gate = F2 draft-declaration ledger (not yet built). "
            "States currently classifiable: N/A, BLOCKED, GAP, UNVERIFIED."
        ),
        "counts": {
            "rows":  row_count,
            "columns": col_count,
            "cells": len(matrix.cells),
        },
        "summary":         matrix.summary(),
        "summary_by_kind": matrix.summary_by_kind(),
        "blocks":   _blocks_to_dict(matrix.blocks),
        "columns":  _columns_to_dict(matrix.columns),
        "cells":    _cells_to_dict(matrix.cells),
    }


# ---------------------------------------------------------------------------
# Report printing
# ---------------------------------------------------------------------------

def _print_summary(matrix: CoverageMatrix, row_count: int, col_count: int) -> None:
    print()
    print("=" * 62)
    print("  Spec 31 §5 Coverage Matrix — auto-generated dashboard")
    print("=" * 62)
    print()
    print(f"  Rows    (blocks):  {row_count}")
    print(f"  Columns (capabilities × layer × tier):  {col_count}")
    print(f"  Total cells:  {len(matrix.cells)}")
    print()
    print("  ── Per-state summary ──────────────────────────────────")
    totals = matrix.summary()
    state_order = [
        CellState.COVERED,
        CellState.CHEAT,
        CellState.GAP,
        CellState.BLOCKED,
        CellState.UNVERIFIED,
        CellState.NA,
    ]
    for state in state_order:
        count = totals.get(state, 0)
        note = ""
        if state == CellState.COVERED:
            note = "  ← requires F3 oracle (deferred)"
        elif state == CellState.CHEAT:
            note = "  ← requires §7a gate output (deferred)"
        print(f"    {state:<12}  {count:>5}{note}")
    print()
    print("  ── Per-KIND breakdown ─────────────────────────────────")
    by_kind = matrix.summary_by_kind()
    for kind in sorted(by_kind.keys()):
        counts = by_kind[kind]
        parts = ", ".join(f"{s}:{n}" for s, n in sorted(counts.items()))
        print(f"    {kind:<10}  {parts}")
    print()
    print("  ── Honest classification limits ───────────────────────")
    print("    COVERED  — deferred until F3 render-diff oracle (Spec 31 §12.2.2)")
    print("    CHEAT    — deferred until §7a check-converter-cheats.py gate (MF-7)")
    print("    N/A      — KIND gates (structurally impossible; assigned now)")
    print("    BLOCKED  — L4 GRID_AREA (no converter call-site, MF-5)")
    print("    GAP      — no destination attr in block_attributes (assigned now)")
    print("    UNVERIFIED — dest attr exists; not yet live-probed (assigned now)")
    print()
    print("  This is a SECONDARY dashboard (Spec 31 §5 note).")
    print("  Primary completeness gate = F2 draft-declaration ledger.")
    print()


def _print_gap_list(matrix: CoverageMatrix, max_rows: int = 20) -> None:
    """Print a sample of the GAP cells so they're visible without opening JSON."""
    gap_cells = [c for c in matrix.cells if c.state == CellState.GAP]
    if not gap_cells:
        print("  No GAP cells found.")
        return

    print(f"  ── GAP cells ({len(gap_cells)} total — showing first {min(max_rows, len(gap_cells))}) ──")
    for cell in gap_cells[:max_rows]:
        tier_label = cell.tier or "base"
        print(f"    {cell.block_slug:<35}  {cell.capability_family:<15}  {cell.layer:<15}  {tier_label}")
    if len(gap_cells) > max_rows:
        print(f"    ... and {len(gap_cells) - max_rows} more — see coverage-matrix.json")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate the Spec 31 §5 coverage matrix (secondary dashboard)."
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=_DEFAULT_OUT,
        help=f"Path to write the JSON output (default: {_DEFAULT_OUT})",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        default=False,
        help=(
            "Informational check mode — print a warning if structurally impossible "
            "states are found (e.g. a COVERED cell without F3 oracle).  "
            "Always exits 0 (secondary instrument, not a hard gate)."
        ),
    )
    parser.add_argument(
        "--gaps-only",
        action="store_true",
        default=False,
        help="Print only the GAP cell list (no full summary).",
    )
    args = parser.parse_args()

    # DB availability check
    if not DB_PATH.exists():
        print(
            f"[coverage-matrix] ERROR: DB not found: {DB_PATH}\n"
            "  Ensure sgs-framework.db exists before running.\n"
            "  Run: python plugins/sgs-blocks/scripts/sgs-update-v2.py"
        )
        return 1

    conn = sqlite3.connect(str(DB_PATH))
    try:
        blocks  = fetch_blocks(conn)
        columns = fetch_columns(conn)
    finally:
        conn.close()

    row_count = len(blocks)
    col_count = len(columns)

    print(f"[coverage-matrix] Derived {row_count} block rows from DB.")
    print(f"[coverage-matrix] Derived {col_count} capability columns from DB.")

    cells   = classify_all(blocks, columns)
    matrix  = CoverageMatrix(blocks=blocks, columns=columns, cells=cells)

    # Write JSON artefact
    out_path: Path = args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = _build_matrix_json(matrix, row_count, col_count)
    out_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"[coverage-matrix] Written: {out_path}")

    # Print human-readable summary
    if not args.gaps_only:
        _print_summary(matrix, row_count, col_count)
        _print_gap_list(matrix)
    else:
        _print_gap_list(matrix, max_rows=100)

    # --check: informational only
    if args.check:
        # Flag structurally impossible states (e.g. COVERED/CHEAT without oracle)
        bad = [
            c for c in matrix.cells
            if c.state in (CellState.COVERED, CellState.CHEAT)
        ]
        if bad:
            print(
                f"[coverage-matrix] WARNING: {len(bad)} cell(s) classified as "
                f"COVERED or CHEAT without a runtime oracle.\n"
                "  This suggests the classifier was modified incorrectly. "
                "Review classifier.py.\n"
                "  (Exiting 0 — this is an informational warning, not a hard gate.)"
            )
        else:
            print(
                "[coverage-matrix] Check passed — no structurally impossible states found."
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

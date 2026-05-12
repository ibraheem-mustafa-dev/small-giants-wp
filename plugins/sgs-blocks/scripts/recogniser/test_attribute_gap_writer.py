"""Spec 15 Phase 5a.4 self-test for attribute-gap-writer.py.

Asserts the FR8 provenance + run_id contract: every staged row carries
`provenance='sgs-clone:<run_id>'` (or 'sgs-clone' when run_id missing)
and every required schema column is populated.

Dry-run mode only -- this test must NEVER write to uimax.

Also writes to an EPHEMERAL in-memory SQLite DB with the same schema
to verify the SQL INSERT statement is well-formed and de-dupe logic
works.

Run: python test_attribute_gap_writer.py
"""
from __future__ import annotations

import importlib.util
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "attribute_gap_writer", HERE / "attribute-gap-writer.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


SCHEMA_SQL = """
CREATE TABLE attribute_gap_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_slug TEXT,
    selector TEXT,
    css_property TEXT,
    value_seen TEXT,
    role_proposed TEXT,
    confidence REAL,
    seen_count INTEGER DEFAULT 1,
    last_seen TEXT,
    staged_at TEXT,
    applied_at TEXT,
    provenance TEXT,
    status TEXT DEFAULT 'pending'
);
"""


def sample_gaps() -> list[dict]:
    return [
        {
            "block_slug": "sgs/hero",
            "selector": ".hero-cta",
            "css_property": "background-color",
            "value_seen": "#fff7ed",
            "role_proposed": "color",
            "confidence": 0.83,
        },
        {
            "block_slug": None,                       # un-routed orphan
            "selector": ".bespoke-band",
            "css_property": "padding-top",
            "value_seen": "72px",
            "role_proposed": "layout",
            "confidence": 0.74,
        },
    ]


def test_provenance_stamping() -> None:
    result = mod.stage(sample_gaps(), run_id="test-run-5a4", write=False)
    assert result["mode"] == "dry-run", f"dry-run expected, got {result['mode']}"
    assert result["row_count"] == 2
    for row in result["rows"]:
        assert row["provenance"] == "sgs-clone:test-run-5a4", (
            f"provenance must include run_id, got {row['provenance']}"
        )
        # FR8 mandatory shape:
        for key in ("block_slug", "selector", "css_property", "value_seen",
                    "role_proposed", "confidence", "seen_count", "last_seen",
                    "staged_at", "provenance", "status"):
            assert key in row, f"missing required column: {key}"
        assert row["status"] == "pending"
        assert row["seen_count"] == 1
    print(f"  PASS  provenance-stamping: 2 rows, all carry sgs-clone:test-run-5a4")


def test_provenance_bare_when_run_id_missing() -> None:
    result = mod.stage(sample_gaps()[:1], run_id=None, write=False)
    row = result["rows"][0]
    assert row["provenance"] == "sgs-clone", (
        f"bare provenance when run_id missing, got {row['provenance']}"
    )
    print(f"  PASS  bare-provenance: run_id=None -> provenance='sgs-clone'")


def test_insert_against_ephemeral_db() -> None:
    """Verify the SQL INSERT statement runs cleanly + de-dupe upserts work."""
    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA_SQL)

    rows = mod.stage(sample_gaps(), run_id="ephemeral-run", write=False)["rows"]

    # First pass: insert both rows
    counts = mod.write_rows(rows, conn)
    assert counts["inserted"] == 2, f"expected 2 inserts, got {counts}"
    assert counts["bumped"] == 0
    total = conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates").fetchone()[0]
    assert total == 2

    # Re-insert same rows: should bump seen_count, not duplicate
    counts2 = mod.write_rows(rows, conn)
    assert counts2["inserted"] == 0, f"expected 0 new inserts on re-run, got {counts2}"
    assert counts2["bumped"] == 2
    seen_counts = [r[0] for r in conn.execute(
        "SELECT seen_count FROM attribute_gap_candidates ORDER BY id"
    ).fetchall()]
    assert seen_counts == [2, 2], f"expected seen_count bumped to 2, got {seen_counts}"

    # Provenance preserved on the original row
    provs = [r[0] for r in conn.execute(
        "SELECT provenance FROM attribute_gap_candidates"
    ).fetchall()]
    assert all(p == "sgs-clone:ephemeral-run" for p in provs), (
        f"provenance must be preserved across upserts, got {provs}"
    )
    conn.close()
    print(f"  PASS  ephemeral-insert: 2 rows + de-dupe upsert + provenance preserved")


def main() -> int:
    print("Spec 15 Phase 5a.4 -- attribute-gap-writer FR8 provenance contract")
    test_provenance_stamping()
    test_provenance_bare_when_run_id_missing()
    test_insert_against_ephemeral_db()
    print("\nATTR-WRITER-5A.4: PASS (provenance+run_id stamped, schema columns populated, de-dupe works)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

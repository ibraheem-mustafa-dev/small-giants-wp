"""
Spec 15 §6 Stage 10 — Gap Detection
====================================
Identifies attributes whose canonical_slot is NULL (un-decomposable by the
current vocabulary) and stages them as gap candidates so they surface for
operator review. Also drains `recognition_log` extraction_failed events
into the same gap-candidate queue.

Idempotent — re-runs add zero rows when no new gaps have appeared since
the previous run. Stage 4 (assign-canonical) handles the bulk Phase-1
backfill; Stage 10 catches anything new each scan.

Reads from sgs-framework.db tables:
  - block_attributes (canonical_slot IS NULL → candidate)
  - recognition_log (extraction_failed events, if table exists)

Writes to sgs-framework.db.attribute_gap_candidates with proposed_action
indicating the source.

Usage:
    python detect.py            # report + write new gaps; exit 0

UK English in all comments and output.
"""

from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
    )
)


def table_exists(conn: sqlite3.Connection, name: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone() is not None


def detect_unresolved_attrs(conn: sqlite3.Connection) -> int:
    """Stage candidates for attributes with NULL canonical_slot."""
    cur = conn.execute(
        """
        SELECT ba.block_slug, ba.attr_name
        FROM block_attributes ba
        LEFT JOIN attribute_gap_candidates gc
          ON gc.block_slug = ba.block_slug AND gc.attr_name = ba.attr_name
        WHERE ba.canonical_slot IS NULL
          AND gc.id IS NULL
        """
    )
    new_rows = [(slug, attr, attr, 'new-canonical-slot-needed') for slug, attr in cur.fetchall()]
    if not new_rows:
        return 0
    conn.executemany(
        """
        INSERT INTO attribute_gap_candidates
          (block_slug, attr_name, stem, proposed_action)
        VALUES (?, ?, ?, ?)
        """,
        new_rows,
    )
    conn.commit()
    return len(new_rows)


def detect_recognition_failures(conn: sqlite3.Connection) -> int:
    """Drain extraction_failed events from recognition_log if present."""
    if not table_exists(conn, 'recognition_log'):
        return 0
    cur = conn.execute(
        """
        SELECT DISTINCT rl.block_slug, rl.attr_name
        FROM recognition_log rl
        LEFT JOIN attribute_gap_candidates gc
          ON gc.block_slug = rl.block_slug AND gc.attr_name = rl.attr_name
        WHERE rl.event_type = 'extraction_failed'
          AND gc.id IS NULL
        """
    )
    new_rows = [(slug, attr, attr, 'extraction-failed-in-clone') for slug, attr in cur.fetchall()]
    if not new_rows:
        return 0
    conn.executemany(
        """
        INSERT INTO attribute_gap_candidates
          (block_slug, attr_name, stem, proposed_action)
        VALUES (?, ?, ?, ?)
        """,
        new_rows,
    )
    conn.commit()
    return len(new_rows)


def main() -> int:
    if not DB_PATH.exists():
        print(f"ERROR: DB not found at {DB_PATH}")
        return 2

    conn = sqlite3.connect(str(DB_PATH))
    try:
        existing_total = conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates").fetchone()[0]
        added_attrs = detect_unresolved_attrs(conn)
        added_recog = detect_recognition_failures(conn)
        new_total = conn.execute("SELECT COUNT(*) FROM attribute_gap_candidates").fetchone()[0]
    finally:
        conn.close()

    print(f"GAP-DETECTION: existing={existing_total}  +unresolved-attrs={added_attrs}  +recognition-failures={added_recog}  total={new_total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

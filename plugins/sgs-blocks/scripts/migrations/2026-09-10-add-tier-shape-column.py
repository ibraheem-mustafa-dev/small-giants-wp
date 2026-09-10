#!/usr/bin/env python3
"""2026-09-10-add-tier-shape-column.py — add block_attributes.tier_shape.

WHAT AND WHY
------------
`block_attributes.attr_type='object'` conflates three genuinely different
shapes (`.claude/plans/cloning-pipeline-tier-migration-requirements.md`
G5): flat_sibling (has a declared Tablet/Mobile sibling), tier_object (one
attribute unpacked into `{desktop,tablet,mobile}`), box_only (represents
`{top,right,bottom,left}` box sides). `attr_type` and `box_family` are
identical for the last two shapes — only the property's real PHP consumer
tells them apart. `tier_shape TEXT` records that classification, mirroring
`box_family`'s existing shape (nullable, no DEFAULT clause, populated only
where it applies).

Never hand-maintained: `sgs-update-v2.py` Stage 1 (`sgs_codebase_scan`)
recomputes `tier_shape` fresh on every run via
`orchestrator/object_attr_shape.py::classify_object_attr_shape()` — the
same idempotent column-add guard also lives inline in that stage, so this
migration is a convenience for a fresh/out-of-band DB, not the only path
that can add the column.

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT (see
dbschema/migrate.py's header). Idempotent: a column already present is
reported and skipped, so a replay is safe.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

TABLE = "block_attributes"
COLUMN = "tier_shape"


def columns(con: sqlite3.Connection, table: str) -> set[str]:
    return {r[1] for r in con.execute(f'PRAGMA table_info("{table}")')}


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    try:
        if COLUMN in columns(con, TABLE):
            print(f"  skipped  {TABLE}.{COLUMN} (already present)")
            return 0
        con.execute(f'ALTER TABLE "{TABLE}" ADD COLUMN "{COLUMN}" TEXT')
        con.commit()
    finally:
        con.close()
    print(f"  ADDED    {TABLE}.{COLUMN} TEXT (nullable, no default)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

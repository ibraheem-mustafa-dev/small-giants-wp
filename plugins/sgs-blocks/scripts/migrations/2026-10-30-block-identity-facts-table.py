#!/usr/bin/env python3
"""2026-10-30-block-identity-facts-table.py -- Spec 48 F1 step A0/A1 (plan .claude/plans/2026-10-30-clone-recognition-fixes.md,
"F1: identify blocks by elimination").

WHAT AND WHY
------------
Creates `block_identity_facts`, one row per (block, fact, value): whether the block can print a tag, an ARIA role or an
ARIA attribute, how its open state behaves, whether it moves a track itself, the platform it belongs to, where it may
sit and the kinds of value its icon fields accept, each `yes`, `no` or `unknown` with the evidence. The skeleton
writer's elimination matcher rules a block out only on a proven `no`. Rows are not written here: `sgs-update-v2.py`
stage 14 seeds the `code` rows (`scripts/lib/block_identity_facts.py`); the live read (step A2b) adds `live` rows.

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT. Idempotent: an existing table is reported and
skipped, so a replay is safe. The DB is $SGS_FRAMEWORK_DB when set, else the shared framework DB.
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")

DDL = """
CREATE TABLE block_identity_facts (
  block_slug TEXT NOT NULL,
  fact       TEXT NOT NULL,
  value      TEXT NOT NULL,
  state      TEXT NOT NULL CHECK( state IN ( 'yes', 'no', 'unknown' ) ),
  source     TEXT NOT NULL CHECK( source IN ( 'code', 'live' ) ),
  evidence   TEXT NOT NULL,
  PRIMARY KEY ( block_slug, fact, value, source )
)
"""


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    try:
        if con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='block_identity_facts'").fetchone():
            print("  skipped  block_identity_facts (already present)")
        else:
            con.execute(DDL)
            print("  CREATED  block_identity_facts")
        con.commit()
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

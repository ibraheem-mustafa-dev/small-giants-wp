#!/usr/bin/env python3
"""2026-10-20-states-table.py -- Spec 48 FR-48-81, the states wave (plan .claude/plans/archive/2026-10-20-states-wave.md).

WHAT AND WHY
------------
Creates `states`, the framework's state vocabulary: every mechanism that expresses an interaction, disclosure,
selection or page state (a pseudo-class, an ARIA or native attribute, a state class, a data attribute, a media
feature), the state word it maps to and how a reader reaches it. The computed route reads it instead of keeping its own
lists. Rows are not written here: `dbschema/seed_reference_data.py` seeds them from `scripts/data/states.json`.

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT. Idempotent: an existing table is
reported and skipped, so a replay is safe. The DB is $SGS_FRAMEWORK_DB when set, else the shared framework DB.
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")

STATES_DDL = """
CREATE TABLE states (
    id          INTEGER PRIMARY KEY,
    state       TEXT NOT NULL,
    family      TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('pseudo-class', 'aria', 'attribute', 'class', 'data-attribute', 'media')),
    token       TEXT NOT NULL,
    reach       TEXT NOT NULL CHECK (reach IN ('force-pseudo', 'set-attribute', 'toggle-class', 'call', 'scroll', 'emulate-media', 'at-rest', 'unreachable')),
    call        TEXT,
    note        TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now')),
    UNIQUE (kind, token)
)
"""


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    try:
        if con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='states'").fetchone():
            print("  skipped  states (already present)")
        else:
            con.execute(STATES_DDL)
            print("  CREATED  states")
        con.commit()
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""2026-10-20-property-equivalents-table.py -- Spec 48 FR-48-8 step 5 (Bean, 2026-10-19).

WHAT AND WHY
------------
Creates `property_equivalents`, the framework-DB table the computed route's Fill reads for "same look, different
setting": a draft property no setting holds on its own element, painted the same by a setting for another property on
the element itself or on its parent, under a named condition. Rows are not written here:
`dbschema/seed_reference_data.py` seeds them from `scripts/data/property-equivalents.json`.

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

PROPERTY_EQUIVALENTS_DDL = """
CREATE TABLE property_equivalents (
    draft_property    TEXT NOT NULL,
    setting_property  TEXT NOT NULL,
    hop               TEXT NOT NULL CHECK (hop IN ('self', 'parent')),
    condition         TEXT NOT NULL CHECK (condition IN ('every-child-same', 'render-matches')),
    note              TEXT NOT NULL,
    created_at        TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (draft_property, setting_property, hop)
)
"""


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    try:
        if con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='property_equivalents'").fetchone():
            print("  skipped  property_equivalents (already present)")
        else:
            con.execute(PROPERTY_EQUIVALENTS_DDL)
            print("  CREATED  property_equivalents")
        con.commit()
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

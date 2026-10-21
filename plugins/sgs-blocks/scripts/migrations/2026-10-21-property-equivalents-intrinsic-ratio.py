#!/usr/bin/env python3
"""2026-10-21-property-equivalents-intrinsic-ratio.py -- Spec 48 FR-48-8 step 5, the `intrinsic-ratio` condition.

WHAT AND WHY
------------
`property_equivalents.condition` is a CHECK-constrained column listing the conditions Fill evaluates. SQLite cannot
alter a CHECK, so this rebuilds the table with `intrinsic-ratio` added (an image, SVG or logo of intrinsic ratio: a
declared height is its maximum height). Existing rows are copied across; `dbschema/seed_reference_data.py` then seeds
the new row from `scripts/data/property-equivalents.json`.

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT. Idempotent: a table whose definition already
names `intrinsic-ratio` is reported and skipped; an absent table is left for 2026-10-20-property-equivalents-table.py.
The rebuild runs in one transaction. The DB is $SGS_FRAMEWORK_DB when set, else the shared framework DB.
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")

COLUMNS = "draft_property, setting_property, hop, condition, note, created_at"

REBUILT_DDL = """
CREATE TABLE property_equivalents (
    draft_property    TEXT NOT NULL,
    setting_property  TEXT NOT NULL,
    hop               TEXT NOT NULL CHECK (hop IN ('self', 'parent')),
    condition         TEXT NOT NULL CHECK (condition IN ('every-child-same', 'render-matches', 'intrinsic-ratio')),
    note              TEXT NOT NULL,
    created_at        TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (draft_property, setting_property, hop)
)
"""


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB, isolation_level=None)
    try:
        row = con.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='property_equivalents'").fetchone()
        if row is None:
            print("  skipped  property_equivalents (absent; 2026-10-20-property-equivalents-table.py creates it)")
        elif "intrinsic-ratio" in row[0]:
            print("  skipped  property_equivalents (already allows intrinsic-ratio)")
        else:
            con.execute("BEGIN")
            con.execute("ALTER TABLE property_equivalents RENAME TO property_equivalents_old")
            con.execute(REBUILT_DDL)
            con.execute(f"INSERT INTO property_equivalents ({COLUMNS}) SELECT {COLUMNS} FROM property_equivalents_old")  # noqa: S608 - fixed names
            con.execute("DROP TABLE property_equivalents_old")
            con.execute("COMMIT")
            print("  REBUILT  property_equivalents (condition now allows intrinsic-ratio)")
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

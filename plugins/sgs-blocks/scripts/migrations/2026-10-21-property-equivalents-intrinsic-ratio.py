#!/usr/bin/env python3
"""2026-10-21-property-equivalents-intrinsic-ratio.py -- Spec 48 FR-48-8 step 5, the `intrinsic-ratio` condition.

WHAT AND WHY
------------
`property_equivalents.condition` is a CHECK-constrained column listing the conditions Fill evaluates. SQLite cannot
alter a CHECK, so this rebuilds the table with `intrinsic-ratio` added (an image, SVG or logo of intrinsic ratio: a
declared height is its maximum height). The rebuild creates the new table under a temporary name, copies the rows,
drops the old table, renames the new one (with `PRAGMA legacy_alter_table=ON`, so the rename neither fails on nor
rewrites a view or trigger that names `property_equivalents`) and recreates the old table's indexes and triggers. Existing rows are copied across;
`dbschema/seed_reference_data.py` then seeds the new row from `scripts/data/property-equivalents.json`.

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT. Idempotent: a table whose `condition` CHECK list
already holds `intrinsic-ratio` is reported and skipped (the list is parsed, not searched for as a substring); an absent table is left for 2026-10-20-property-equivalents-table.py.
The rebuild runs in one transaction. The DB is $SGS_FRAMEWORK_DB when set, else the shared framework DB.
"""
from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path

DB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")

COLUMNS = "draft_property, setting_property, hop, condition, note, created_at"

REBUILT_DDL = """
CREATE TABLE property_equivalents_new (
    draft_property    TEXT NOT NULL,
    setting_property  TEXT NOT NULL,
    hop               TEXT NOT NULL CHECK (hop IN ('self', 'parent')),
    condition         TEXT NOT NULL CHECK (condition IN ('every-child-same', 'render-matches', 'intrinsic-ratio')),
    note              TEXT NOT NULL,
    created_at        TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (draft_property, setting_property, hop)
)
"""


def condition_values(ddl: str) -> list[str]:
    """The values of the `condition` column's CHECK ... IN (...) list, parsed from the table definition."""
    m = re.search(r"\bcondition\s+TEXT\b[^,]*?\bCHECK\s*\(\s*condition\s+IN\s*\(([^)]*)\)", ddl, re.IGNORECASE)
    if m is None:
        raise SystemExit("FAIL-CLOSED: property_equivalents has no `condition ... CHECK (condition IN (...))` this script can read")
    return re.findall(r"'([^']*)'", m.group(1))


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB, isolation_level=None)
    try:
        row = con.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='property_equivalents'").fetchone()
        if row is None:
            print("  skipped  property_equivalents (absent; 2026-10-20-property-equivalents-table.py creates it)")
        elif "intrinsic-ratio" in condition_values(row[0]):
            print("  skipped  property_equivalents (already allows intrinsic-ratio)")
        else:
            extras = [r[0] for r in con.execute(
                "SELECT sql FROM sqlite_master WHERE tbl_name='property_equivalents' AND type IN ('index', 'trigger') AND sql IS NOT NULL"
            )]
            con.execute("PRAGMA legacy_alter_table=ON")
            con.execute("BEGIN")
            con.execute("DROP TABLE IF EXISTS property_equivalents_new")
            con.execute(REBUILT_DDL)
            con.execute(f"INSERT INTO property_equivalents_new ({COLUMNS}) SELECT {COLUMNS} FROM property_equivalents")  # noqa: S608 - fixed names
            con.execute("DROP TABLE property_equivalents")
            con.execute("ALTER TABLE property_equivalents_new RENAME TO property_equivalents")
            for sql in extras:
                con.execute(sql)
            con.execute("COMMIT")
            con.execute("PRAGMA legacy_alter_table=OFF")
            print("  REBUILT  property_equivalents (condition now allows intrinsic-ratio)")
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

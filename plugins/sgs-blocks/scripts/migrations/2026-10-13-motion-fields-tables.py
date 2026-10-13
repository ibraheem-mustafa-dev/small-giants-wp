#!/usr/bin/env python3
"""2026-10-13-motion-fields-tables.py -- Spec 38A FR-38A-3 (DB clause), decision 3 option B.

WHAT AND WHY
------------
Creates the two tables and the view that describe every motion field to the cloner, calibration and the coverage test:

  * `motion_targets`    -- one row per motion block's root plus each part it declares;
  * `motion_fields`     -- one row per schema field per panel layer;
  * `motion_field_rows` -- the view joining them: one row per block, target, field and device tier.

The statements are read from `dbschema/schema.sql` (the one place they are written), so this script and the schema file
cannot disagree. Rows are not written here: `dbschema/seed_motion_fields.py` seeds both tables from
`schemas/motion.schema.json` and the `block.json` files.

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT. Idempotent: an object already present is reported
and skipped. The DB is $SGS_FRAMEWORK_DB when set, else the shared framework DB.
"""
from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path

DB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")
SCHEMA_SQL = Path(__file__).resolve().parents[1] / "dbschema" / "schema.sql"
OBJECTS = (("table", "motion_targets"), ("table", "motion_fields"), ("view", "motion_field_rows"))


def statement(kind: str, name: str) -> str:
    """The CREATE statement for one object, taken from schema.sql between its `-- <kind>: <name>` header and the next."""
    text = SCHEMA_SQL.read_text(encoding="utf-8")
    match = re.search(rf"^-- {kind}: {name}\n(.*?)(?=^-- |\Z)", text, re.S | re.M)
    if not match:
        raise SystemExit(f"FAIL-CLOSED: schema.sql has no '-- {kind}: {name}' block")
    return match.group(1).strip()


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    try:
        for kind, name in OBJECTS:
            if con.execute("SELECT 1 FROM sqlite_master WHERE type=? AND name=?", (kind, name)).fetchone():
                print(f"  skipped  {kind} {name} (already present)")
                continue
            con.execute(statement(kind, name))
            print(f"  CREATED  {kind} {name}")
        con.commit()
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

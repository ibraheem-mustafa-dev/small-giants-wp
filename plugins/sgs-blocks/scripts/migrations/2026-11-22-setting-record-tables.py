#!/usr/bin/env python3
"""2026-11-22-setting-record-tables.py -- the setting record's three tables (plan .claude/plans/archive/2026-11-21-setting-record.md, Task 3).

WHAT AND WHY
------------
Creates the tables the setting record's data files (`scripts/data/setting-records/<block>.json`, one per block) are
seeded into by `dbschema/seed_reference_data.py::_seed_setting_records`:

  setting_placements    one row per (block, setting, part, props, state, tiers): where a setting's value paints, with
                        the kind of proof it has (`kind`), the setting values that produce it, and the selector.
  block_part_order      one row per block part in render order, with its tag, parent part and what builds it.
  setting_record_blocks one row per block: the record's schema version, stamp, the accounted lists and the whole data
                        file as `record_json`, so a field added later reaches readers without a schema change.

Rows are not written here: the seeder replaces them from the data files. Column meanings: `.claude/dev-setup.md`
"What each column means".

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT. Idempotent: an existing table or index is
reported and skipped, so a replay is safe. The DB is $SGS_FRAMEWORK_DB when set, else the shared framework DB.
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")

TABLES = {
    "setting_placements": """
CREATE TABLE setting_placements (
  block_slug     TEXT NOT NULL,
  setting        TEXT NOT NULL,
  part           TEXT NOT NULL,
  props          TEXT NOT NULL,
  state          TEXT NOT NULL DEFAULT '',
  tiers          TEXT NOT NULL,
  kind           TEXT CHECK( kind IN ( 'value', 'switched-on' ) OR kind IS NULL ),
  unproved       TEXT,
  accepted       TEXT,
  selector       TEXT,
  setting_values TEXT,
  symbolic       TEXT,
  UNIQUE ( block_slug, setting, part, props, state, tiers )
)
""",
    "block_part_order": """
CREATE TABLE block_part_order (
  block_slug  TEXT NOT NULL,
  position    INTEGER NOT NULL,
  part        TEXT NOT NULL,
  tag         TEXT,
  parent_part TEXT,
  built_by    TEXT CHECK( built_by IN ( 'php', 'script' ) OR built_by IS NULL ),
  UNIQUE ( block_slug, position )
)
""",
    "setting_record_blocks": """
CREATE TABLE setting_record_blocks (
  block_slug      TEXT PRIMARY KEY,
  schema_version  INTEGER NOT NULL,
  stamp           TEXT,
  tested_no_paint TEXT,
  replaces_block  TEXT,
  unvalued        TEXT,
  part_not_named  TEXT,
  record_json     TEXT NOT NULL
)
""",
}

INDEXES = {
    "idx_setting_placements_block": "CREATE INDEX idx_setting_placements_block ON setting_placements ( block_slug )",
    "idx_setting_placements_setting": "CREATE INDEX idx_setting_placements_setting ON setting_placements ( setting )",
}


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    try:
        for name, ddl in TABLES.items():
            if con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone():
                print(f"  skipped  {name} (already present)")
            else:
                con.execute(ddl)
                print(f"  CREATED  {name}")
        for name, ddl in INDEXES.items():
            if con.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?", (name,)).fetchone():
                print(f"  skipped  {name} (already present)")
            else:
                con.execute(ddl)
                print(f"  CREATED  {name}")
        con.commit()
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

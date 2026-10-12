#!/usr/bin/env python3
"""2026-10-13-motion-presets-and-fx-columns.py -- Spec 38A FR-38A-6 (DB clauses).

WHAT AND WHY
------------
Creates `motion_presets`, the table the cloner and the generated editor copies read presets from, and adds the two
`fx_effects` columns Spec 38A section 6.4 names:

  * `owned_properties` -- JSON of the section 10 channels, owner custom properties and paint slots an effect writes;
  * `panels`           -- JSON list of the panels (hover, entrance, effects) that may offer the effect.

Rows are not written here: `dbschema/seed_reference_data.py` seeds `motion_presets` from
`scripts/data/motion-presets.json` and `seed-motion-fx-registry.py` fills the two columns from
`schemas/motion.schema.json`. `animation_tokens` is retired separately, by `dbschema/retire_table.py`, once the
presets exist.

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT. Idempotent: an existing table or column is
reported and skipped, so a replay is safe. The DB is $SGS_FRAMEWORK_DB when set, else the shared framework DB.
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")

MOTION_PRESETS_DDL = """
CREATE TABLE motion_presets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    slug          TEXT NOT NULL UNIQUE,
    panel         TEXT NOT NULL CHECK (panel IN ('hover', 'entrance', 'effects')),
    effect        TEXT,
    family        TEXT NOT NULL,
    kind          TEXT NOT NULL CHECK (kind IN ('preset', 'intensity', 'keyframe')),
    intensity     TEXT CHECK (intensity IN ('subtle', 'standard', 'bold')),
    label         TEXT NOT NULL,
    values_json   TEXT NOT NULL,
    devices_json  TEXT NOT NULL DEFAULT '{}',
    trigger       TEXT NOT NULL,
    target_level  TEXT NOT NULL CHECK (target_level IN ('block', 'surface', 'part')),
    source        TEXT NOT NULL,
    position      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now')),
    CHECK ((kind = 'intensity') = (intensity IS NOT NULL))
)
"""

FX_COLUMNS = (
    ("owned_properties", "TEXT NOT NULL DEFAULT '{}'"),
    ("panels", "TEXT NOT NULL DEFAULT '[]'"),
)


def columns(con: sqlite3.Connection, table: str) -> set[str]:
    return {r[1] for r in con.execute(f'PRAGMA table_info("{table}")')}


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    try:
        if con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='motion_presets'").fetchone():
            print("  skipped  motion_presets (already present)")
        else:
            con.execute(MOTION_PRESETS_DDL)
            con.execute("CREATE INDEX idx_motion_presets_family ON motion_presets (family, kind)")
            print("  CREATED  motion_presets")
        existing = columns(con, "fx_effects")
        if not existing:
            raise SystemExit(f"FAIL-CLOSED: fx_effects is missing from {DB}; run seed-motion-fx-registry.py first")
        for name, decl in FX_COLUMNS:
            if name in existing:
                print(f"  skipped  fx_effects.{name} (already present)")
                continue
            con.execute(f'ALTER TABLE fx_effects ADD COLUMN "{name}" {decl}')
            print(f"  ADDED    fx_effects.{name} {decl}")
        con.commit()
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

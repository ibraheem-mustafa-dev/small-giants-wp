"""Migration: add block_composition.grid_areas — the DB reader for supports.sgs.gridAreas.

WHY
---
`sgs/hero/block.json` has declared `supports.sgs.gridAreas: ["content","media"]`
since the 2026-06-11 per-area-grid-layer commit (65a3536a). It is real,
correctly-shaped data with ZERO readers anywhere in the framework — not the
editor, not /sgs-update, not the converter (which carries a comment at
converter/services/assembly.py:250 explicitly noting the step is a no-op for
this reason). Two months of a declaration nothing reads, and nothing noticed.

Spec 35 Part N's N-2 rule names exactly this class: "a built mechanism is not a
reached one — a built-but-unreachable mechanism reads exactly like a missing
one." This column is the durable reader, so the declaration becomes queryable
data the cloning pipeline can consume instead of inert JSON in a manifest.

SHAPE — a plain JSON-array TEXT column, no CHECK constraint
-----------------------------------------------------------
The accurate sibling is `accepts_allowed_blocks` on this SAME table
(seed-composition-roles.py:334-336): an unconstrained JSON-array TEXT column.
NOT `container_kind`, which is a scalar `TEXT CHECK` enum — a closed value set
can be enumerated, a per-block list of area names cannot. Spec 35 §F.2.2 named
`container_kind` first and was corrected on 2026-08-16 after a review lens
caught the mismatch; this migration follows the corrected analogy.

NOT a new table. `variant_slots` earned its own table because it stores
genuinely relational per-variant discriminating slots; this is a flat
per-block array, which is what a column is for.

IDEMPOTENT
----------
The ALTER is guarded by a PRAGMA table_info check, so re-running is a no-op.
No data is written here: /sgs-update Stage 1 populates the column
declaratively from each block.json on every run, the same route `boxFamilies`
already uses. That keeps block.json the single source of truth and means this
migration never needs a companion data-seed (R-31-1: no hardcoded per-block
dict).

⛔ SHARED-DATABASE WARNING — READ BEFORE RUNNING
------------------------------------------------
`sgs-framework.db` is ONE file shared by every git worktree on this machine.
`dbschema/check_schema_drift.py --check` runs in every `prebuild` and compares
the LIVE database against the schema.sql in ITS OWN tree. The moment this
migration runs, any worktree whose branch does not carry the matching
schema.sql change starts failing its build.

On 2026-08-16 four colour-gaps worktrees were live against this database, so
running this was deliberately DEFERRED (Bean-ruled) until they merge — the
colour thread needs a /sgs-update reseed before its own Stage 2 anyway, and
this rides along with that. Confirm no other active worktree is mid-build
before running.

⛔ RUN THESE THREE TOGETHER, IN THIS ORDER — never one without the others
------------------------------------------------------------------------
    1. python scripts/migrations/2026-08-16-block-composition-grid-areas.py
    2. python scripts/dbschema/check_schema_drift.py --regenerate
    3. python scripts/sgs-update-v2.py --stage 1        # populates the column

Step 2 is NOT optional and is why `schema.sql` is deliberately NOT changed in
the commit that adds this file. `check_schema_drift.py --check` runs in every
`prebuild` and compares the LIVE database against the tree's own `schema.sql`,
so the two must move together:
  - schema.sql changed FIRST  -> every build fails until the migration runs.
  - migration run FIRST, schema.sql never regenerated -> every build fails
    until it is.
Both directions are red, which is the gate doing its job. Keeping schema.sql
untouched until run-time is what lets this branch build normally in the
meantime.

The Stage 1 writer (`_populate_grid_areas` in sgs-update-v2.py) is already
merged and is a deliberate no-op while the column is absent — it reports the
skip rather than failing, so nothing is waiting on this except the data.

Rule: db-changes-reproducible-via-migration-not-manual-or-moduleload
  DB structure changes go via a dated migration + schema.sql regeneration,
  never a manual sqlite3 edit or a module-load side effect. 2026-08-16.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

TABLE = "block_composition"
COLUMN = "grid_areas"


def column_exists(con: sqlite3.Connection, table: str, column: str) -> bool:
    """True when `table` already has `column`."""
    rows = con.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r[1] == column for r in rows)


def main() -> int:
    if not DB.exists():
        print(f"[grid-areas] DB not found: {DB}", file=sys.stderr)
        return 1

    con = sqlite3.connect(str(DB))
    try:
        if not column_exists(con, TABLE, COLUMN):
            con.execute(f"ALTER TABLE {TABLE} ADD COLUMN {COLUMN} TEXT")
            con.commit()
            print(f"[grid-areas] ADDED {TABLE}.{COLUMN} (TEXT, JSON array, no CHECK)")
        else:
            print(f"[grid-areas] {TABLE}.{COLUMN} already present — no-op")

        # Report, never assume: show what the column holds right now so the
        # operator can see whether /sgs-update has populated it yet.
        rows = con.execute(
            f"SELECT block_slug, {COLUMN} FROM {TABLE} "
            f"WHERE {COLUMN} IS NOT NULL AND {COLUMN} != ''"
        ).fetchall()
        print(f"[grid-areas] populated rows: {len(rows)}")
        for slug, value in rows:
            print(f"    {slug}: {value}")
        if not rows:
            print("    (none yet — run /sgs-update Stage 1 to populate from block.json)")
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

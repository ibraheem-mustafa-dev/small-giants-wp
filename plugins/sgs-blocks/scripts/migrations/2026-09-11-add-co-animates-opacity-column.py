#!/usr/bin/env python3
"""2026-09-11-add-co-animates-opacity-column.py — add
motion_shape_signatures.co_animates_opacity.

WHAT AND WHY
------------
`fade-up`/`slide-up` (and the down/left/right pairs) are true duplicates
today: identical CSS in `extensions.css`, AND a real-world magnitude-band
widening (`_REAL_WORLD_TRANSLATE_MAGNITUDE_RANGE_PX` in
`seed-motion-shape-signatures.py`) makes every translate-direction row's
band collapse to the same (20,200) range regardless of the preset's own
distance — confirmed by direct arithmetic, a magnitude-only fix is a
structural no-op. `co_animates_opacity` is a genuine second axis (does
opacity transition ALONGSIDE the transform, or does the element stay fully
visible) that AOS (github.com/michalsnik/aos) uses for exactly this
fade-vs-slide split in its own real source. Never hand-maintained beyond
this migration: `seed-motion-shape-signatures.py::_extract_entrance_rows`
derives the value from each preset's own CSS (an `opacity: 1;` override,
the same technique `reveal-up` already uses) on every re-seed.

Nullable (not a bare 0/1 CHECK) because the live classifier
(`motion_shape.py::extract_shape_from_keyframes_css`) genuinely cannot
always determine this axis from a real, un-owned website's CSS — a NULL
shape value means "this axis isn't filtered", never "assume false".

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT.
Idempotent: a column already present is reported and skipped, so a replay
is safe. Mirrors `2026-09-10-add-tier-shape-column.py`'s exact shape.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

TABLE = "motion_shape_signatures"
COLUMN = "co_animates_opacity"


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
        con.execute(
            f'ALTER TABLE "{TABLE}" ADD COLUMN "{COLUMN}" INTEGER '
            f"CHECK ({COLUMN} IN (0, 1) OR {COLUMN} IS NULL)"
        )
        con.commit()
    finally:
        con.close()
    print(f"  ADDED    {TABLE}.{COLUMN} INTEGER (nullable, 0/1 CHECK)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

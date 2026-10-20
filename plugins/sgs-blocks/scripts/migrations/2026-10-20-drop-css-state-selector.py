#!/usr/bin/env python3
"""2026-10-20-drop-css-state-selector.py -- Spec 48 FR-48-81, the states wave (plan .claude/plans/2026-10-20-states-wave.md).

WHAT AND WHY
------------
Drops `block_attributes.css_state_selector`. No script writes or reads it: calibration reaches a setting's state by
probing the `states` vocabulary on the live element (`scripts/computed-route/lib/calibrate-probe.mjs::probeState`), and
`block_attributes.css_state` holds the state word.

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT. Idempotent: an absent column is reported and
skipped, so a replay is safe. The DB is $SGS_FRAMEWORK_DB when set, else the shared framework DB.
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db")


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    try:
        cols = {r[1] for r in con.execute("PRAGMA table_info(block_attributes)")}
        if "css_state_selector" not in cols:
            print("  skipped  block_attributes.css_state_selector (absent)")
        else:
            con.execute("ALTER TABLE block_attributes DROP COLUMN css_state_selector")
            con.commit()
            print("  DROPPED  block_attributes.css_state_selector")
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

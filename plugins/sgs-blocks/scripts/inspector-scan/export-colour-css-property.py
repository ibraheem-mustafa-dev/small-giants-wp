#!/usr/bin/env python3
"""export-colour-css-property.py — DB-first mechanism source for rule 31.

Prints a JSON map of every `block_attributes` row with role IN ('color',
'colour-gradient') to stdout: { "<block_slug>": { "<attr_name>": "<css_property
or null>" } }. `css_property` is the DECLARATIVE routing column Spec 31
already requires blocks to use (R-31-1, DB-first, no hardcoded dicts) — this
script is a thin read, not a second source of truth.

A null value means the DB row exists but css_property is EMPTY — the caller
must treat that as UNRESOLVED, never guess a mechanism from the attr's name.

Used by scripts/inspector-scan/core/golden.js (getColourCssPropertyMap),
shelled out to once per run.js invocation via child_process.spawnSync — same
pattern as core/roster.js calling build-roster.py. No new npm dependency
needed to read the DB from a JS lint rule.
"""

import json
import os
import sqlite3
import sys
from pathlib import Path

DB_CANDIDATES = [
    Path(os.path.expanduser("~/.agents/skills/sgs-wp-engine/sgs-framework.db")),
    Path(__file__).resolve().parents[1] / "sgs-framework.db",
]


def find_db() -> Path:
    for p in DB_CANDIDATES:
        if p.exists() and p.stat().st_size > 0:
            return p
    raise SystemExit(f"No populated sgs-framework.db found. Tried: {DB_CANDIDATES}")


def main() -> int:
    db_path = find_db()
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute(
        "SELECT block_slug, attr_name, css_property FROM block_attributes "
        "WHERE role IN ('color', 'colour-gradient')"
    )
    out = {}
    for block_slug, attr_name, css_property in cur.fetchall():
        out.setdefault(block_slug, {})[attr_name] = css_property or None
    conn.close()
    json.dump(out, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())

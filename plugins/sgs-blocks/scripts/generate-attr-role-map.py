#!/usr/bin/env python3
"""
generate-attr-role-map.py

Spec 35 orphan-triage support. Dumps `block_attributes.role` for every
(block_slug, attr_name) pair straight from sgs-framework.db to a static JSON
file the Node linter (check-element-manifest-conformance.js) can read without
adding a new npm sqlite dependency (repo has none; see that script's header
for the "options in order of preference" note this follows).

Regenerate whenever block_attributes changes (new block/attr registered, or
after `/sgs-update`):

    python plugins/sgs-blocks/scripts/generate-attr-role-map.py

Reads the SAME db file sgs-db.py uses (sqlite3 stdlib only, no new deps).
Keyed on (block_slug, attr_name) — NOT attr name alone — because an attr name
like `iconSize` is ambiguous across blocks (per task brief).
"""

import json
import os
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
# Same DB the sgs-db.py CLI uses (verified live: DB_PATH there resolves to
# ~/.claude/skills/sgs-wp-engine/sgs-framework.db, 13MB, last written 2026-07-21).
DB_PATH = os.path.join(os.path.expanduser('~'), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db')
# Fall back to the copy vendored alongside this scripts dir, IF it is non-empty
# (the repo copy at scripts/data/sgs-framework.db is a 0-byte placeholder as of
# 2026-07-21 — a stale/empty file must not silently win over the real db).
FALLBACK_DB_PATH = os.path.join(HERE, 'data', 'sgs-framework.db')
OUT_PATH = os.path.join(HERE, 'consistency', 'attr-role-map.json')


def resolve_db_path():
    if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) > 0:
        return DB_PATH
    if os.path.exists(FALLBACK_DB_PATH) and os.path.getsize(FALLBACK_DB_PATH) > 0:
        return FALLBACK_DB_PATH
    raise SystemExit(f'sgs-framework.db not found (or empty) at {DB_PATH} or {FALLBACK_DB_PATH}')


def main():
    db_path = resolve_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    # block_attributes already carries block_slug directly (verified live schema,
    # 2026-07-21: block_attributes.block_slug TEXT NOT NULL, UNIQUE(block_slug,
    # attr_name)) — no join to blocks needed.
    rows = conn.execute(
        """
        SELECT block_slug, attr_name, role
        FROM block_attributes
        """
    ).fetchall()
    conn.close()

    role_map = {}
    for row in rows:
        key = f"{row['block_slug']}::{row['attr_name']}"
        role_map[key] = row['role']  # may be None (NO ROLE RECORDED)

    out = {
        '_meta': {
            'generated_from': os.path.relpath(db_path, HERE),
            'source_table': 'block_attributes (role) joined to blocks (block_slug)',
            'row_count': len(role_map),
            'regenerate_with': 'python plugins/sgs-blocks/scripts/generate-attr-role-map.py',
        },
        'roles': role_map,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, sort_keys=True)
        f.write('\n')

    print(f'Wrote {len(role_map)} (block_slug, attr_name) role rows to {OUT_PATH}')


if __name__ == '__main__':
    main()

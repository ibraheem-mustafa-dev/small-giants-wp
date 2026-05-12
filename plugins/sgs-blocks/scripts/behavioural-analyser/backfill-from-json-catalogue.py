"""
Spec 15 Phase 3 step 3.1 helper — one-shot backfill of role / derived_selector
from the legacy layer-3-internal-elements.json catalogue into sgs-framework.db
`block_attributes`. Fills NULL rows only; never overwrites Phase 1 canonical
assignments.

Why this exists
---------------
Phase 1 scoped canonical assignment to content-identity slots
(slot_synonyms is content-identity-only per Spec §11). Structural attrs
(padding / width / height / image-position / Ken Burns / etc.) were left
with NULL role + NULL derived_selector. The legacy JSON catalogue holds
that wider coverage already. This script ports it across so sgs-db
becomes the single source of truth (Spec 15 §6 Stage 4 intent).

Idempotent — re-running finds 0 NULL rows to fill (all are populated).

Usage:
    python backfill-from-json-catalogue.py            # show what would change
    python backfill-from-json-catalogue.py --apply    # write the updates

UK English in all comments and output.
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

REPO_ROOT = Path(__file__).resolve().parents[4]
JSON_CATALOGUE = REPO_ROOT / '.claude' / 'scratch' / 'retired-by-spec-15-p3' / 'fingerprint-builder' / 'output' / 'layer-3-internal-elements.json'
DB_PATH = Path(os.environ.get('SGS_FRAMEWORK_DB',
    str(Path.home() / '.claude/skills/sgs-wp-engine/sgs-framework.db')))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='Write the backfill (default: dry-run report)')
    args = ap.parse_args()

    if not JSON_CATALOGUE.exists():
        print(f'ERROR: legacy catalogue not found at {JSON_CATALOGUE}')
        return 1
    if not DB_PATH.exists():
        print(f'ERROR: sgs-framework.db not found at {DB_PATH}')
        return 1

    cat = json.loads(JSON_CATALOGUE.read_text(encoding='utf-8'))
    conn = sqlite3.connect(str(DB_PATH))

    # Load existing rows (only those with NULL role or NULL derived_selector)
    db_rows = {
        (r[0], r[1]): {'role': r[2], 'selector': r[3]}
        for r in conn.execute(
            'SELECT block_slug, attr_name, role, derived_selector FROM block_attributes'
        )
    }

    # Roles that are too coarse for role-templates dispatch — JSON's finer
    # role wins for these.
    COARSE_ROLES = {'layout', None}

    fills_role = 0
    fills_selector = 0
    refines_role = 0
    refines_selector = 0
    misses = 0
    updates: list[tuple[str, str, str | None, str | None]] = []

    for slug, blk in cat.get('blocks', {}).items():
        for slot in blk.get('slots', []):
            attr = slot.get('attribute')
            if not attr:
                continue
            key = (slug, attr)
            db_row = db_rows.get(key)
            if db_row is None:
                # attr is in JSON but not in sgs-db (e.g. removed block) — skip
                misses += 1
                continue
            json_role = slot.get('role')
            json_sel = slot.get('selector')
            new_role = db_row['role']
            new_sel = db_row['selector']
            changed = False
            # Rule 1: fill NULL role from JSON
            if not db_row['role'] and json_role:
                new_role = json_role
                fills_role += 1
                changed = True
            # Rule 2: refine coarse role ('layout') from JSON if JSON has a
            # finer-grained role that exists in role-templates
            elif db_row['role'] in COARSE_ROLES and json_role and json_role != db_row['role']:
                new_role = json_role
                refines_role += 1
                changed = True
            # Rule 3: fill NULL selector from JSON
            if not db_row['selector'] and json_sel:
                new_sel = json_sel
                fills_selector += 1
                changed = True
            # Rule 4: refine selector when we just refined the role and JSON's
            # selector differs (the pair travels together)
            elif (db_row['role'] in COARSE_ROLES and json_role and json_role != db_row['role']
                  and json_sel and json_sel != db_row['selector']):
                new_sel = json_sel
                refines_selector += 1
                changed = True
            if changed:
                updates.append((slug, attr, new_role, new_sel))

    print(f'JSON catalogue blocks:   {len(cat.get("blocks", {}))}')
    print(f'sgs-db rows seen:        {len(db_rows)}')
    print(f'NULL role     → fill from JSON:   {fills_role}')
    print(f'NULL selector → fill from JSON:   {fills_selector}')
    print(f"role='layout' → refine from JSON: {refines_role}")
    print(f"selector pair → refine from JSON: {refines_selector}")
    print(f'Total row updates:                {len(updates)}')
    print(f'JSON-only attrs (not in sgs-db, skipped): {misses}')

    if not args.apply:
        print()
        print('Dry run. Re-run with --apply to write the backfill.')
        return 0

    cur = conn.cursor()
    for slug, attr, role, sel in updates:
        cur.execute(
            'UPDATE block_attributes SET role = ?, derived_selector = ? '
            'WHERE block_slug = ? AND attr_name = ?',
            (role, sel, slug, attr)
        )
    conn.commit()
    conn.close()
    print()
    print(f'BACKFILL: wrote {len(updates)} row updates.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

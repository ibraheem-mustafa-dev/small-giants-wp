"""
Spec 15 Phase 3.5 — Refine Phase 1 coarse roles to role-templates taxonomy.

Phase 1 left some rows tagged with coarse roles ('color', 'typography',
'visual', 'behaviour', 'content') that do not dispatch to any
role-templates.json strategy. The legacy layer-3-internal-elements.json
catalogue already carries finer-grained roles for the same (block, attr)
pairs. This script ports those finer roles in.

A row is refined when:
  - block_attributes.role is one of the coarse set, AND
  - JSON catalogue has a role for the same (block_slug, attr_name), AND
  - The JSON role is a member of role-templates.json's taxonomy.

Idempotent — re-running finds zero refinements.

Usage:
    python backfill-coarse-roles.py           # dry-run report
    python backfill-coarse-roles.py --apply   # write the updates

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
ROLE_TEMPLATES = REPO_ROOT / 'tools' / 'recogniser-v2' / 'data' / 'role-templates.json'
DB_PATH = Path(os.environ.get(
    'SGS_FRAMEWORK_DB',
    str(Path.home() / '.claude/skills/sgs-wp-engine/sgs-framework.db'),
))

COARSE_ROLES = {'color', 'typography', 'visual', 'behaviour', 'content'}


def load_taxonomy() -> set[str]:
    rt = json.loads(ROLE_TEMPLATES.read_text(encoding='utf-8'))
    roles = rt.get('roles')
    if isinstance(roles, dict):
        return set(roles.keys())
    if isinstance(roles, list):
        return set(roles)
    return set()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='Write the refinement (default: dry-run)')
    args = ap.parse_args()

    for label, p in (('catalogue', JSON_CATALOGUE), ('role-templates', ROLE_TEMPLATES), ('db', DB_PATH)):
        if not p.exists():
            print(f'ERROR: {label} not found at {p}')
            return 1

    taxonomy = load_taxonomy()
    cat = json.loads(JSON_CATALOGUE.read_text(encoding='utf-8'))

    # Build JSON lookup
    json_roles: dict[tuple[str, str], str] = {}
    for slug, blk in cat.get('blocks', {}).items():
        for slot in blk.get('slots', []):
            attr = slot.get('attribute')
            role = slot.get('role')
            if attr and role:
                json_roles[(slug, attr)] = role

    conn = sqlite3.connect(str(DB_PATH))
    coarse_rows = list(conn.execute(
        'SELECT block_slug, attr_name, role FROM block_attributes WHERE role IN (?,?,?,?,?)',
        tuple(COARSE_ROLES),
    ))

    updates: list[tuple[str, str, str, str]] = []  # (slug, attr, old_role, new_role)
    by_new_role: dict[str, int] = {}
    skipped_no_json = 0
    skipped_json_role_not_in_taxonomy = 0

    for slug, attr, old_role in coarse_rows:
        new_role = json_roles.get((slug, attr))
        if not new_role:
            skipped_no_json += 1
            continue
        if new_role not in taxonomy:
            skipped_json_role_not_in_taxonomy += 1
            continue
        if new_role == old_role:
            continue
        updates.append((slug, attr, old_role, new_role))
        by_new_role[new_role] = by_new_role.get(new_role, 0) + 1

    print(f'Coarse rows in DB:                          {len(coarse_rows)}')
    print(f'Refinements available:                      {len(updates)}')
    print(f'Skipped (no JSON entry):                    {skipped_no_json}')
    print(f'Skipped (JSON role not in taxonomy):        {skipped_json_role_not_in_taxonomy}')
    print()
    print('Refinement distribution (old -> new):')
    for r, n in sorted(by_new_role.items(), key=lambda x: -x[1]):
        print(f'  {n:3d}  -> {r}')

    if not args.apply:
        print()
        print('Dry run. Re-run with --apply to write.')
        conn.close()
        return 0

    cur = conn.cursor()
    for slug, attr, _old, new_role in updates:
        cur.execute(
            'UPDATE block_attributes SET role = ? WHERE block_slug = ? AND attr_name = ?',
            (new_role, slug, attr),
        )
    conn.commit()
    conn.close()
    print()
    print(f'BACKFILL: wrote {len(updates)} role refinements.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

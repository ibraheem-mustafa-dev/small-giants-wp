"""Migration: register the 'core' role + seed it onto every source='native_wp' row.

Why: block_attributes.role IS NULL is supposed to mean exactly one thing -- "no
seeding mechanism reached this row" (TIER 3.5's own docstring makes this
argument for the enum backstop). WP-core reference rows (source='native_wp',
seeded by the dbschema/ WP-reference-archive tooling for
audit-feature-parity.py comparisons -- never a cloning-pipeline input) sat
outside the content/styling taxonomy every other role-detection tier reasons
about, so they were permanently NULL and indistinguishable from a genuinely
unclassified sgs/* attribute in any `role IS NULL` count. Measured 2026-08-13:
225 of 479 role-IS-NULL rows (47%) were this shape.

The durable, reseed-surviving fix is TIER 3.18 in assign-canonical.py
(behavioural-analyser/assign-canonical.py, immediately after TIER 3.17) --
this migration is the immediate-effect twin: it registers the role once and
writes the same seed to the live DB right now, without requiring a full
reseed. Mirrors the mechanism 2026-06-26-testimonial-media-role-selector.py
used for its own immediate-effect twin.

'core' is registered under the roles table's third, previously-unused
`classification` bucket, 'unclassified' (dbschema/schema.sql's own CHECK
constraint already anticipated a role that is neither content-bearing nor
styling-behaviour -- this is the first role to use it), because a native_wp
row is comparison data for audit-feature-parity.py, not something the cloning
converter ever consumes.

Idempotent: INSERT OR IGNORE for the role row; the UPDATE only ever touches
role IS NULL rows, so re-running is a no-op once applied.

Rule: db-changes-reproducible-via-migration-not-manual-or-moduleload
  DB data changes go via dated migration + full /sgs-update reseed, never
  manual sqlite3 edits; TIER 3.18 in assign-canonical.py is the
  reseed-surviving source of truth. 2026-08-13.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def main() -> int:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    cur.execute(
        "INSERT OR IGNORE INTO roles (role_name, classification, description) "
        "VALUES ('core', 'unclassified', "
        "'WP-core-block reference data (source=native_wp) -- comparison data for "
        "audit-feature-parity.py, never a cloning-pipeline input. Seeded by TIER "
        "3.18 in assign-canonical.py, D-pending 2026-08-13.')"
    )
    role_registered = cur.rowcount

    cur.execute(
        "UPDATE block_attributes SET role = 'core' "
        "WHERE role IS NULL AND source = 'native_wp'"
    )
    seeded = cur.rowcount

    conn.commit()
    conn.close()

    print(f"  roles table: 'core' row {'inserted' if role_registered else 'already present'}")
    print(f"  block_attributes: {seeded} native_wp row(s) seeded to role='core'")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

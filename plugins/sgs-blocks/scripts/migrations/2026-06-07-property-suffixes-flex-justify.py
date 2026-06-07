"""Migration: seed flex justify/direction/wrap CSS property → suffix mappings into property_suffixes.

Why: a sister process is adding justifyContent, flexDirection, flexWrap attributes to
sgs/container. The sister migration (2026-06-07-property-suffixes-flex-layout.py)
deliberately left these three CSS properties unmapped because the receiving attrs did
not yet exist on sgs/container at that time:

  - justify-content  (no justifyContent attr on sgs/container — now being added)
  - flex-direction   (no flexDirection attr on sgs/container — now being added)
  - flex-wrap        (no flexWrap attr on sgs/container — now being added)

Now that the sister process has added those attrs, this migration adds the matching
property_suffixes rows so the converter lift can transfer these CSS props from draft
sections onto the sgs/container block attributes. R-22-1 (DB-first, no hardcoded dicts).

Suffix naming follows the same camelCase convention as the existing rows:
  - JustifyContent  → matches the justifyContent attr on sgs/container
  - FlexDirection   → matches the flexDirection attr on sgs/container
  - FlexWrap        → matches the flexWrap attr on sgs/container

No UPDATE_ROWS needed: none of these suffixes pre-exist in the table (no PRIMARY KEY
collision), so all three are plain INSERTs.

This migration writes to BOTH DB copies (.claude and .agents) to keep them in sync.
This migration is idempotent: re-running it on a DB that already has these rows is a
no-op (idempotency check: skip INSERT if the suffix already exists). R-22-9 (universal).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

# Write to both copies to keep them in sync.
DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

# INSERT_ROWS: new rows where suffix does not yet exist in the table.
# Confirmed receiving attrs added by the sister process to sgs/container:
#   justifyContent (string), flexDirection (string), flexWrap (string)
#
# (suffix, role, css_property, is_token_matched, token_source, notes)
INSERT_ROWS = [
    ('JustifyContent', 'layout', 'justify-content', 0, None, 'CSS justify-content → sgs/container justifyContent attr'),
    ('FlexDirection',  'layout', 'flex-direction',  0, None, 'CSS flex-direction → sgs/container flexDirection attr'),
    ('FlexWrap',       'layout', 'flex-wrap',        0, None, 'CSS flex-wrap → sgs/container flexWrap attr'),
]


def migrate_db(db_path: Path) -> tuple[int, int]:
    """Run migration against a single DB. Returns (inserted, skipped)."""
    if not db_path.exists():
        print(f"SKIP (not found): {db_path}")
        return 0, 0

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    inserted = 0
    skipped = 0

    for row in INSERT_ROWS:
        suffix = row[0]
        exists = cur.execute(
            "SELECT 1 FROM property_suffixes WHERE suffix=?", (suffix,)
        ).fetchone()
        if exists:
            skipped += 1
            continue
        cur.execute(
            "INSERT INTO property_suffixes "
            "(suffix, role, css_property, is_token_matched, token_source, notes) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            row,
        )
        inserted += 1

    conn.commit()
    conn.close()
    return inserted, skipped


def main() -> int:
    for db_path in DBS:
        inserted, skipped = migrate_db(db_path)
        print(
            f"{db_path.name} ({db_path.parent}): "
            f"inserted {inserted}, skipped {skipped} "
            f"(idempotent: re-runs are no-ops)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Migration: seed flex/grid layout CSS property → suffix mappings into property_suffixes.

Why: a fresh clone trace shows 117 lift_gap_candidate events with reason 'no_db_suffix'.
The genuinely-meaningful missing ones are the flex/grid layout family (display ×25,
align-items ×11, justify-items, align-content). These CSS properties have receiving
block attributes on sgs/container but were never seeded into property_suffixes, so
the lifter could never transfer them.

Only CSS properties whose receiving attr is confirmed present on sgs/container
(via block_attributes WHERE block_slug='sgs/container') are added here.
Properties confirmed ABSENT on sgs/container are deliberately left unmapped:
  - justify-content  (no justifyContent attr on sgs/container)
  - flex-direction   (no flexDirection attr on sgs/container)
  - flex-wrap        (no flexWrap attr on sgs/container)
Non-attr props (cursor, transition, overflow, order, grid-template-areas) also
deliberately unmapped — they are not block attributes; flag-not-drop is correct.

Special case: the 'Layout' suffix already exists in property_suffixes with
css_property=NULL (generic suffix descriptor for class probes). The table uses
suffix as PRIMARY KEY, so a new row cannot be inserted. Instead, this migration
UPDATEs the css_property from NULL → 'display' so that css_property_suffixes()
(which filters WHERE css_property IS NOT NULL) can resolve display → Layout.
The idempotency check for 'Layout' is: skip if css_property is already 'display'.

This migration is idempotent: re-running it on a DB that already has these
rows/updates is a no-op. R-22-1 (DB-first, no hardcoded dicts). R-22-9 (universal).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Confirmed receiving attrs on sgs/container (queried 2026-06-07):
#   layout (string), verticalAlign (string), justifyItems (string), alignContent (string)
#
# INSERT_ROWS: new rows where suffix does not yet exist in the table.
INSERT_ROWS = [
    # (suffix, role, css_property, is_token_matched, token_source, notes)
    ('VerticalAlign',  'layout', 'align-items',   0, None, 'CSS align-items → sgs/container verticalAlign attr'),
    ('JustifyItems',   'layout', 'justify-items', 0, None, 'CSS justify-items → sgs/container justifyItems attr'),
    ('AlignContent',   'layout', 'align-content', 0, None, 'CSS align-content → sgs/container alignContent attr'),
]

# UPDATE_ROWS: suffix already exists (PRIMARY KEY collision) but css_property=NULL.
# Set css_property so css_property_suffixes() (WHERE css_property IS NOT NULL) picks it up.
# Format: (suffix, css_property_to_set, idempotency_guard_value)
UPDATE_ROWS = [
    # 'Layout' suffix existed with css_property=NULL — update to 'display'.
    ('Layout', 'display', 'display'),
]


def main() -> int:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    inserted = 0
    updated = 0

    for row in INSERT_ROWS:
        suffix = row[0]
        exists = cur.execute("SELECT 1 FROM property_suffixes WHERE suffix=?", (suffix,)).fetchone()
        if exists:
            continue
        cur.execute(
            "INSERT INTO property_suffixes (suffix, role, css_property, is_token_matched, token_source, notes) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            row,
        )
        inserted += 1

    for suffix, css_property_value, guard_value in UPDATE_ROWS:
        # Idempotent: skip if css_property is already the target value.
        current = cur.execute(
            "SELECT css_property FROM property_suffixes WHERE suffix=?", (suffix,)
        ).fetchone()
        if current and current[0] == guard_value:
            continue
        cur.execute(
            "UPDATE property_suffixes SET css_property=? WHERE suffix=?",
            (css_property_value, suffix),
        )
        updated += 1

    conn.commit()
    conn.close()
    print(f"Inserted {inserted} rows, updated {updated} rows (idempotent: re-runs are no-ops)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

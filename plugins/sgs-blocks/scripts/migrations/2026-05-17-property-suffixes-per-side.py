"""Migration: seed per-side padding/margin/border longhand suffixes into property_suffixes.

Why: convert.py:_CSS_PROP_TO_SUFFIX hardcoded 21 rows including per-side variants
(PaddingTop, MarginBottom, BorderTopWidth, etc.). The DB-first refactor (commit
after this migration) reads property_suffixes via db.css_property_suffixes(),
but the table only had shorthand suffixes (Padding, Margin, BorderWidth, BorderRadius)
— no per-side longhand rows. Without these, the lifter loses 8 hero attrs
(headlineMarginBottom + label*MarginBottom* + subHeadlineMarginBottom).

This migration is idempotent: re-running it on a DB that already has these
rows is a no-op. /sgs-update keeps the table in sync afterward.

Captured rule: blub.db row 260 (DB-first lookups, no hardcoded dicts).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

ROWS = [
    # (suffix, role, css_property, is_token_matched, token_source, notes)
    ('PaddingTop',    'layout', 'padding-top',    1, 'spacing', 'Per-side padding longhand'),
    ('PaddingRight',  'layout', 'padding-right',  1, 'spacing', 'Per-side padding longhand'),
    ('PaddingBottom', 'layout', 'padding-bottom', 1, 'spacing', 'Per-side padding longhand'),
    ('PaddingLeft',   'layout', 'padding-left',   1, 'spacing', 'Per-side padding longhand'),
    ('MarginTop',     'layout', 'margin-top',     1, 'spacing', 'Per-side margin longhand'),
    ('MarginRight',   'layout', 'margin-right',   1, 'spacing', 'Per-side margin longhand'),
    ('MarginBottom',  'layout', 'margin-bottom',  1, 'spacing', 'Per-side margin longhand'),
    ('MarginLeft',    'layout', 'margin-left',    1, 'spacing', 'Per-side margin longhand'),
    ('RowGap',        'layout', 'row-gap',        1, 'spacing', 'Per-axis gap longhand'),
    ('ColumnGap',     'layout', 'column-gap',     1, 'spacing', 'Per-axis gap longhand'),
    ('BorderTopWidth',    'visual', 'border-top-width',    1, 'spacing', 'Per-side border-width longhand'),
    ('BorderRightWidth',  'visual', 'border-right-width',  1, 'spacing', 'Per-side border-width longhand'),
    ('BorderBottomWidth', 'visual', 'border-bottom-width', 1, 'spacing', 'Per-side border-width longhand'),
    ('BorderLeftWidth',   'visual', 'border-left-width',   1, 'spacing', 'Per-side border-width longhand'),
    ('BorderTopLeftRadius',     'visual', 'border-top-left-radius',     1, 'spacing', 'Per-corner border-radius longhand'),
    ('BorderTopRightRadius',    'visual', 'border-top-right-radius',    1, 'spacing', 'Per-corner border-radius longhand'),
    ('BorderBottomLeftRadius',  'visual', 'border-bottom-left-radius',  1, 'spacing', 'Per-corner border-radius longhand'),
    ('BorderBottomRightRadius', 'visual', 'border-bottom-right-radius', 1, 'spacing', 'Per-corner border-radius longhand'),
]


def main() -> int:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    inserted = 0
    for row in ROWS:
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
    conn.commit()
    conn.close()
    print(f"Inserted {inserted} rows (idempotent: re-runs are no-ops)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

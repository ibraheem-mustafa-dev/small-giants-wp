#!/usr/bin/env python3
"""2026-07-05-fontstyle-role-typography.py — reclassify property_suffixes.FontStyle.

CG-11 (2026-07-05). The `FontStyle` row in `property_suffixes` was seeded with
`role='select-from-enum'` (a generic classification for any select-driven
attribute), but FontStyle is a TYPOGRAPHY property exactly like FontSize/
FontWeight/LineHeight — it participates in the shared TypographyControls /
sgs_typography_css_rule() mechanism (helpers-typography.php), not a bare
enum-select classification. The CG-11 compound fix renames sgs/testimonial's
`quoteStyle` attr to `quoteFontStyle` to match this family's naming convention;
this migration corrects the DB row backing that family so downstream
classification (assign-canonical, attribute_gap_candidates) treats FontStyle
consistently with its FontSize/FontWeight/LineHeight siblings.

Idempotent: plain UPDATE, safe to re-run. Run manually
(`/sgs-update` does NOT auto-run migrations):

    python plugins/sgs-blocks/scripts/migrations/2026-07-05-fontstyle-role-typography.py
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def main() -> int:
    if not DB_PATH.exists():
        print(f"[migration] DB not found: {DB_PATH}", file=sys.stderr)
        return 1
    con = sqlite3.connect(str(DB_PATH))
    try:
        con.execute(
            "UPDATE property_suffixes SET role = 'typography' "
            "WHERE suffix = 'FontStyle' AND role = 'select-from-enum'"
        )
        con.commit()
        row = con.execute(
            "SELECT suffix, role FROM property_suffixes WHERE suffix = 'FontStyle'"
        ).fetchone()
        print(f"[migration] FontStyle role: {row}")
        return 0 if row and row[1] == "typography" else 1
    finally:
        con.close()


if __name__ == "__main__":
    raise SystemExit(main())

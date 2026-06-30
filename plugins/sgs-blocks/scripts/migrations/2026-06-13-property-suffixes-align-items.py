"""Migration: seed the AlignItems suffix → align-items mapping into property_suffixes.

Why: the name-free A-layer-router (2026-06-13) routes a CSS grid's `align-items`
value onto the target SGS block's attr via db_lookup.attr_for_layer_property(),
which iterates ALL property_suffixes rows for a css_property and membership-gates
each candidate against the block's declared attrs (first match wins, ordered by
rowid). The table held ONE row for align-items — `VerticalAlign` (seeded in
2026-06-07-property-suffixes-flex-layout.py:40) — so the resolver returned the
correct attr for blocks that declare `verticalAlign` (container/hero/cta/trust-bar)
but None for the grid-mirror blocks that declare `alignItems` instead
(feature-grid/card-grid/gallery).

This migration adds the SIBLING row so the resolver resolves BOTH naming
conventions name-free:
  - VerticalAlign row (rowid ~118) tried first → matches blocks with verticalAlign
  - AlignItems row (this migration)         → matches blocks with alignItems

For any single block only ONE of the two candidates exists in its block_attributes,
so exactly one wins and the other is skipped — no ambiguity.

This row REPLACES the hardcoded name fork that lived at convert.py:4092-4101
(`"verticalAlign" if "verticalAlign" in _align_names else "alignItems" if ...`),
which was a Rule-3 carve-out contradicting Spec 22 line 134 (structural box CSS
must route name-free).

This migration is idempotent: re-running it on a DB that already has the row is a
no-op (existence-gated on `suffix=?`). R-31-1 (DB-first, no hardcoded dicts).
R-31-9 (universal — applies to every grid-mirror block, not a per-block carve-out).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# INSERT_ROWS: new rows where suffix does not yet exist in the table.
INSERT_ROWS = [
    # (suffix, role, css_property, is_token_matched, token_source, notes)
    ('AlignItems', 'layout', 'align-items', 0, None,
     'CSS align-items -> grid-mirror blocks alignItems attr (feature-grid/card-grid/gallery); '
     'sibling of the VerticalAlign row, for the name-free A-layer-router 2026-06-13'),
]


def main() -> int:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    inserted = 0

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

    conn.commit()
    conn.close()
    print(f"Inserted {inserted} rows (idempotent: re-runs are no-ops)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

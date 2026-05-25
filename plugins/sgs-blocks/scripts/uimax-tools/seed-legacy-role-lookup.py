#!/usr/bin/env python3
"""Seed sgs-framework.db `legacy_role_lookup` from the canonical LEGACY_ROLE_LOOKUP dict.

Migrates the 17 hardcoded kebab-role → SGS-slug entries that previously lived in
per-section-convention-voter.py into the DB so /sgs-update keeps them current.

Idempotent semantics:
- On first run: creates the table and inserts all 17 rows.
- On subsequent runs: skips rows whose kebab_role already exists (INSERT OR IGNORE).
  Reports how many rows were inserted vs already-present.

The table is seeded in BOTH sgs-framework.db instances (the ~/.claude skill DB and
the ~/.agents skill DB) because update-db.py / populate-db.py use the agents path
while the voter + db_lookup.py use the claude path. Both are kept in sync.

Run:
    python plugins/sgs-blocks/scripts/uimax-tools/seed-legacy-role-lookup.py
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Both DB locations used by different parts of the pipeline.
_CLAUDE_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_AGENTS_DB = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS legacy_role_lookup (
  kebab_role TEXT PRIMARY KEY,
  sgs_slug   TEXT NOT NULL,
  notes      TEXT,
  added_at   TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

# Canonical entries — migrated verbatim from LEGACY_ROLE_LOOKUP in
# per-section-convention-voter.py (17 entries, 2026-05-21).
# Spec 12 §8 + Spec 15 §1.1 (cross-platform output + external source ingestion).
ENTRIES: list[tuple[str, str, str]] = [
    ("hero",                   "sgs/hero",                 "Universal hero section"),
    # 2026-05-25 D72: trust-bar legacy aliases removed. Block retired in favour
    # of universal-nesting (sgs/container + sgs/icon-list for badges, or
    # sgs/card-grid + sgs/counter for counters). Section class "sgs-trust-bar"
    # now falls to normal route and emits sgs/container with className preserved.
    ("featured-product",       "sgs/featured-product",     "Featured / hero product block"),
    ("brand-story",            "sgs/info-box",             "Brand narrative section"),
    ("ingredients",            "sgs/feature-grid",         "Ingredient/feature grid"),
    ("ingredients-section",    "sgs/feature-grid",         "Alternative kebab for ingredients"),
    ("gift-section",           "sgs/feature-grid",         "Gift / product feature grid"),
    ("social-proof",           "sgs/testimonial",          "Social proof / testimonials"),
    ("site-header",            "sgs/header",               "Full-width site header"),
    ("site-footer",            "sgs/footer",               "Full-width site footer"),
    ("header",                 "sgs/header",               "Generic header section"),
    ("footer",                 "sgs/footer",               "Generic footer section"),
    ("cta",                    "sgs/cta-section",          "Call-to-action section"),
    ("cta-section",            "sgs/cta-section",          "Alternative kebab for CTA"),
    ("testimonial",            "sgs/testimonial",          "Single testimonial section"),
    ("testimonial-slider",     "sgs/testimonial-slider",   "Testimonial carousel / slider"),
]


def seed_db(db_path: Path) -> tuple[int, int]:
    """Create table + insert entries into one DB.

    Returns (inserted, skipped).
    """
    if not db_path.exists():
        print(f"  SKIP: DB not found at {db_path}", file=sys.stderr)
        return 0, 0

    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(CREATE_TABLE_SQL)
        conn.commit()

        inserted = 0
        skipped = 0
        for kebab_role, sgs_slug, notes in ENTRIES:
            cur = conn.execute(
                "INSERT OR IGNORE INTO legacy_role_lookup (kebab_role, sgs_slug, notes) VALUES (?, ?, ?)",
                (kebab_role, sgs_slug, notes),
            )
            if cur.rowcount == 1:
                inserted += 1
            else:
                skipped += 1

        conn.commit()
    finally:
        conn.close()
    return inserted, skipped


def main(argv: list[str] | None = None) -> int:
    total_inserted = 0
    total_skipped = 0

    for label, db_path in [("~/.claude DB", _CLAUDE_DB), ("~/.agents DB", _AGENTS_DB)]:
        print(f"Seeding {label}: {db_path}")
        inserted, skipped = seed_db(db_path)
        print(f"  inserted : {inserted}")
        print(f"  skipped  : {skipped}  (already present, idempotent)")
        total_inserted += inserted
        total_skipped += skipped

    print()
    print("legacy_role_lookup seed complete:")
    print(f"  total entries    : {len(ENTRIES)}")
    print(f"  total inserted   : {total_inserted}")
    print(f"  total skipped    : {total_skipped}")

    # Verify row count in both DBs
    for label, db_path in [("~/.claude DB", _CLAUDE_DB), ("~/.agents DB", _AGENTS_DB)]:
        if db_path.exists():
            conn = sqlite3.connect(str(db_path))
            count = conn.execute("SELECT COUNT(*) FROM legacy_role_lookup").fetchone()[0]
            conn.close()
            print(f"  {label} row count : {count}")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

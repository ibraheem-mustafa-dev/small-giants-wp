"""Migration: create the closed, audited `excluded_properties` table (Spec 31 §12.2.4, MF-4).

Why: F4 of the Spec-31 §12.7 clean-rebuild Tier-1 foundation. This table is the
AUDITED home for every CSS property we deliberately do NOT reproduce in the clone —
each row carries (css_property, reason, decided_by, date). It is the `excluded`
leg of the no-silent-drop equation `UNACCOUNTED = draft - (transferred ∪
excluded-with-reason ∪ gap)` (§12.2.1), which F5's pipeline-close ledger checker
JOINS to decide excluded-with-reason vs UNACCOUNTED.

SHIPS EMPTY (Bean-locked, confirmed by the code 2026-06-18): there is NO property
excluded-from-CLONE. §12.7's "seed width/max-width" is a misreading — those are
excluded-from-LIFT (a routing detail), not excluded-from-clone, and are still fully
cloned (max-width via the `maxWidth` attr; display via the `layout:grid` attr ->
wrapper CSS, verified on the F3-core live render). Excluded-from-lift ≠
excluded-from-clone (§12.2.4). Any FUTURE genuine clone-exclusion must be added by a
NEW dated migration with a reason — never an in-code literal (that ban is F5's gate,
re-scoped out of F4 per the 2026-06-18 /qc-council).

The migration is the ONLY seed path. The table being created here is empty and stays
empty until a reasoned, dated migration adds a row.

This migration is idempotent: `CREATE TABLE IF NOT EXISTS` + a no-op seed, so
re-running it on a DB that already has the table is a no-op. R-31-1 (DB-first, no
hardcoded dicts). Run manually before/independently of `/sgs-update` (which does NOT
auto-run migrations — the canonical pattern, e.g.
migrations/2026-06-13-property-suffixes-align-items.py).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# The closed EXCLUDED set seeds ZERO rows (no excluded-from-clone property exists).
# Future genuine clone-exclusions are each added by a NEW dated migration with a reason.
SEED_ROWS: list[tuple[str, str, str, str]] = [
    # (css_property, reason, decided_by, date)  -- intentionally EMPTY.
]


def main() -> int:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    # Schema (idempotent).
    cur.execute(
        "CREATE TABLE IF NOT EXISTS excluded_properties ("
        "  css_property TEXT NOT NULL,"
        "  reason       TEXT NOT NULL,"
        "  decided_by   TEXT NOT NULL,"
        "  date         TEXT NOT NULL,"
        "  UNIQUE(css_property)"
        ")"
    )

    inserted = 0
    for css_property, reason, decided_by, date in SEED_ROWS:
        exists = cur.execute(
            "SELECT 1 FROM excluded_properties WHERE css_property=?", (css_property,)
        ).fetchone()
        if exists:
            continue
        cur.execute(
            "INSERT INTO excluded_properties (css_property, reason, decided_by, date) "
            "VALUES (?, ?, ?, ?)",
            (css_property, reason, decided_by, date),
        )
        inserted += 1

    conn.commit()
    total = cur.execute("SELECT COUNT(*) FROM excluded_properties").fetchone()[0]
    conn.close()
    print(
        f"excluded_properties: table ensured; inserted {inserted} new row(s); "
        f"total rows now {total} (ships EMPTY by design — idempotent, re-runs are no-ops)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

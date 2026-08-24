#!/usr/bin/env python3
"""2026-08-24-drop-fossil-columns.py — retire three provably dead columns.

WHAT AND WHY
------------
Three columns carry no data and nothing writes them. Traced to source 2026-08-24,
not inferred from a docstring:

  block_attributes.signature_confidence  100% NULL (0 of 3,166 set). ZERO references
                                         anywhere in scripts/ outside the DDL itself.
                                         No writer, no reader, no test.
  blocks.grade                           100% NULL (0 of 205 set). No writer exists.
  blocks.grade_score                     100% NULL. No writer exists.

`grade`/`grade_score` were READ by generate-block-reference.py, which selected them and
then did `if grade:` — a branch that could never fire, exercised silently on every run.
That reader is corrected in the same commit as this migration; the SELECT would otherwise
raise OperationalError the moment the columns went.

DELIBERATELY NOT DROPPED — read this before "finishing the job"
--------------------------------------------------------------
`block_attributes.equivalent_implementations` was reported as a fossil by an audit and it
is NOT one. It has a live writer:

    uimax-tools/enrich-db.py:306  UPDATE block_attributes SET equivalent_implementations=?
    uimax-tools/enrich-db.py:298  SELECT ... WHERE equivalent_implementations IS NULL

That script is not wired into any chain, so the column is DORMANT, not dead — a distinction
that decides whether dropping it is safe. It is not. Note also that `patterns` has its own
same-named column, so a bare grep for the name conflates two tables.

SAFETY
------
The knowledge base is a gitignored SQLite file that CANNOT BE REBUILT (see dbschema/
migrate.py's header). A pre-drop backup was taken at
`~/.claude/skills/sgs-wp-engine/sgs-framework.db.bak-2026-08-24-predrop`.

This migration REFUSES to drop a column that holds any non-NULL value, re-checking at run
time rather than trusting the census above. A column that gained data between the audit and
the run is not the column that was audited.

Idempotent: a column already gone is reported and skipped, so a replay is safe.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# (table, column) — each proven to have zero writers before being listed here.
TARGETS = [
    ("block_attributes", "signature_confidence"),
    ("blocks", "grade"),
    ("blocks", "grade_score"),
]


def columns(con: sqlite3.Connection, table: str) -> set[str]:
    return {r[1] for r in con.execute(f'PRAGMA table_info("{table}")')}


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    dropped, skipped, refused = [], [], []
    try:
        for table, col in TARGETS:
            if col not in columns(con, table):
                skipped.append(f"{table}.{col} (already absent)")
                continue
            # RE-CHECK emptiness at run time. The audit said 100% NULL; a column that
            # gained a value since is not the column that was audited.
            n = con.execute(
                f'SELECT COUNT(*) FROM "{table}" WHERE "{col}" IS NOT NULL'
            ).fetchone()[0]
            if n:
                refused.append(f"{table}.{col} holds {n} non-NULL value(s)")
                continue
            con.execute(f'ALTER TABLE "{table}" DROP COLUMN "{col}"')
            dropped.append(f"{table}.{col}")
        con.commit()
    finally:
        con.close()

    for d in dropped:
        print(f"  DROPPED  {d}")
    for s in skipped:
        print(f"  skipped  {s}")
    for r in refused:
        print(f"  REFUSED  {r} — not dropped")
    print(f"\n{len(dropped)} dropped, {len(skipped)} skipped, {len(refused)} refused.")
    return 1 if refused else 0


if __name__ == "__main__":
    raise SystemExit(main())

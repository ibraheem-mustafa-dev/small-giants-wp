"""Migration: drop block_composition.has_inner_blocks — EXECUTION Step 16 (Phase 6).

Spec ref: Spec 31 §12.7 Stage-2 row ("derive at convert-time from the save.js
marker, NOT a cached column") — FR-31-2.6 already retired has_inner_blocks as
the content-dispatch SIGNAL (the per-attr block_attributes.emit_shape replaced
it for that purpose). This migration finishes the retirement by dropping the
column itself: nothing in the codebase should read or write it any more.

Why now (Step 16): the frozen orchestrator/converter_v2/ tree — the last
consumer that ever WROTE the "cached column must match the AND-rule
derivation" invariant this column existed to serve — is deleted at Step 16.
The new engine (converter.services.has_inner.derive_delegates_content) never
reads block_composition.has_inner_blocks; it derives the fact fresh from each
block's own save.js/render.php source every time. Every external reader was
migrated ahead of this migration (coverage-matrix/db_queries.py,
recogniser/leftover-bucket-router.py, db-consistency/check_composition.py's
core drift check + sgs-update-v2.py's _populate_has_inner_blocks seeder +
seed-composition-roles.py's HAS_INNER_BLOCKS_OVERRIDES step all repointed or
removed in the same EXECUTION Step 16 session) — see the Step-16 execution
summary for the per-reader migration record.

Mechanism: SQLite 3.35.0+ supports `ALTER TABLE ... DROP COLUMN` directly
(verified live: sqlite3.sqlite_version reported 3.50.4 on this checkout,
2026-07-05) — no manual table-rebuild recipe needed.

Idempotent: skips (no-op) when the column is already absent.

Applies to BOTH DB copies (.claude and .agents) — verified 2026-07-05 that
they are the SAME hard-linked physical file (identical inode), so in practice
one ALTER suffices, but both paths are migrated defensively in case that
ever changes.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

_TABLE = "block_composition"
_COLUMN = "has_inner_blocks"


def _column_exists(conn: sqlite3.Connection) -> bool:
    rows = conn.execute(f"PRAGMA table_info({_TABLE})").fetchall()
    return any(row[1] == _COLUMN for row in rows)


def migrate_db(db_path: Path) -> str:
    """Run migration against one DB. Returns a one-line status string."""
    if not db_path.exists():
        return f"SKIP (not found): {db_path}"

    conn = sqlite3.connect(db_path)
    try:
        if not _column_exists(conn):
            return f"SKIP (already dropped): {db_path}"

        major, minor, _patch = (int(p) for p in sqlite3.sqlite_version.split("."))
        if (major, minor) < (3, 35):
            raise RuntimeError(
                f"sqlite3 {sqlite3.sqlite_version} on this system does not support "
                "ALTER TABLE DROP COLUMN (requires 3.35.0+). A manual "
                "create-copy-drop-rename table-rebuild recipe is required instead — "
                "see Spec 31 §12.7 / this migration's docstring for the intended "
                "column-drop; do not silently skip."
            )

        conn.execute(f"ALTER TABLE {_TABLE} DROP COLUMN {_COLUMN}")
        conn.commit()
        return f"DROPPED {_TABLE}.{_COLUMN}: {db_path}"
    finally:
        conn.close()


def main() -> int:
    for db_path in DBS:
        print(migrate_db(db_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

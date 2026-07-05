"""Migration: delete the orphan block_composition row for sgs/announcement-bar.

Spec ref: D209 (2026-06-11) retired `sgs/announcement-bar` — the block was
absorbed into `sgs/notice-banner` as `displayMode=announcement` (see
plugins/sgs-blocks/CLAUDE.md "Retired blocks" section). `/sgs-update` Stage-10
pruned the block's own row from `blocks` + 25 orphan attrs at the time, but
left ONE `block_composition` row behind (`block_slug='sgs/announcement-bar'`,
`composition_role='content-block'`, no `wraps_block`) — verified live
2026-07-05: `blocks` has zero rows for the slug, `block_composition` still has
one. That row is a hardcoded-dict-adjacent hazard (R-31-1): any code path that
walks `block_composition` without first checking `blocks` membership would
treat a dead block as live composition data.

Idempotent: skips (no-op) when the row is already absent. Verifies-before-act
(prove-the-cause-before-fix): confirms the row exists AND that `blocks` has
no matching slug before deleting — refuses to touch a slug that somehow
re-registered between the docstring being written and the migration running.

Applies to BOTH DB copies (.claude and .agents) — same convention as the
2026-07-05-drop-has-inner-blocks-column.py migration (verified hard-linked
same physical file in practice; both paths migrated defensively).
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

_SLUG = "sgs/announcement-bar"


def migrate_db(db_path: Path) -> str:
    """Run migration against one DB. Returns a one-line status string."""
    if not db_path.exists():
        return f"SKIP (not found): {db_path}"

    conn = sqlite3.connect(db_path)
    try:
        comp_row = conn.execute(
            "SELECT block_slug FROM block_composition WHERE block_slug = ?",
            (_SLUG,),
        ).fetchone()
        if comp_row is None:
            return f"SKIP (already pruned): {db_path}"

        block_row = conn.execute(
            "SELECT slug FROM blocks WHERE slug = ?", (_SLUG,)
        ).fetchone()
        if block_row is not None:
            raise RuntimeError(
                f"{_SLUG} has re-registered in `blocks` at {db_path} — refusing "
                f"to delete its block_composition row. Re-verify the block's "
                f"retirement status before re-running this migration."
            )

        conn.execute(
            "DELETE FROM block_composition WHERE block_slug = ?", (_SLUG,)
        )
        conn.commit()
        return f"DELETED block_composition row for {_SLUG}: {db_path}"
    finally:
        conn.close()


def main() -> int:
    for db_path in DBS:
        print(migrate_db(db_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

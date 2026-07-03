#!/usr/bin/env python3
"""2026-07-03-register-icon-source-roles.py — register the 4 icon-source roles.

Spec 31 §3.B.0 icon-content lift. The named-leaf icon arm (run_mechanism_leaf)
dispatches like every sibling content arm (text/image/link): it finds the target
attr in the DB catalogue BY ROLE and writes the DB `attr_name`, never a hardcoded
attr name (R-31-1 consistency; the sibling arms already do this). `sgs/icon` has
four `iconSource` values, so it needs four content-bearing roles — one per source —
tagging the attr that HOLDS each source's value:

    icon-lucide   -> iconName      (a Lucide slug)
    icon-emoji    -> emojiChar     (a bare emoji glyph)
    icon-dashicon -> dashiconName  (a Dashicons name)
    icon-wp-icon  -> wpIconName    (a @wordpress/icons name)

The resolver kind (`resolve_icon_kind` returns lucide/emoji/dashicon/wp-icon) binds
to the role by the `icon-<kind>` naming convention, so the leaf arm needs NO
kind->attr-name map in code — it reads the attr from the DB. `iconSource` itself
stays role `identity` (the discriminator that stores the resolved kind string).

The per-attr role TAGS live in sgs-update-v2.py ATTR_CLASSIFICATION_OVERRIDES (the
reseed-durable channel — assign-canonical re-derives block_attributes.role every
reseed). These `roles`-table rows are the controlled vocabulary those tags reference
(check_orphan_roles enforces the FK), and /sgs-update does NOT rebuild `roles`, so a
one-shot migration is durable (same pattern as 2026-06-21-register-rating-role.py).

Idempotent: INSERT OR IGNORE. Re-running is a no-op. Run manually
(`/sgs-update` does NOT auto-run migrations):

    python plugins/sgs-blocks/scripts/migrations/2026-07-03-register-icon-source-roles.py
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

_ICON_SOURCE_ROLES: list[tuple[str, str, str]] = [
    ("icon-lucide", "content-bearing",
     "Icon-source value: a Lucide slug (e.g. sgs/icon.iconName). Content-bearing "
     "display value the cloning icon arm lifts by role, not a styling property."),
    ("icon-emoji", "content-bearing",
     "Icon-source value: a bare emoji glyph (e.g. sgs/icon.emojiChar)."),
    ("icon-dashicon", "content-bearing",
     "Icon-source value: a Dashicons name (e.g. sgs/icon.dashiconName)."),
    ("icon-wp-icon", "content-bearing",
     "Icon-source value: a @wordpress/icons name (e.g. sgs/icon.wpIconName)."),
]


def main() -> int:
    if not DB_PATH.exists():
        print(f"[migration] DB not found: {DB_PATH}", file=sys.stderr)
        return 1
    con = sqlite3.connect(str(DB_PATH))
    try:
        con.executemany(
            "INSERT OR IGNORE INTO roles (role_name, classification, description) "
            "VALUES (?, ?, ?)",
            _ICON_SOURCE_ROLES,
        )
        con.commit()
        rows = con.execute(
            "SELECT role_name, classification FROM roles WHERE role_name LIKE 'icon-%' "
            "ORDER BY role_name"
        ).fetchall()
        print(f"[migration] icon-source roles: {rows}")
        return 0 if len(rows) == 4 else 1
    finally:
        con.close()


if __name__ == "__main__":
    raise SystemExit(main())

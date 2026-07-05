#!/usr/bin/env python3
"""2026-07-05-register-tag-identity-role.py — register the tag-identity role.

CG-2 fix (the zero-h1 defect). Spec 31 R-31-2: the HTML tag is SHAPE — recognition
uses it to pick the block, but some blocks declare an enum attr whose VALUE is that
tag itself (sgs/heading.level h1..h6, sgs/media.mediaType image/video/svg). Nothing
wrote them, so every heading rendered h2 (live page: 0 h1 / 15 h2 — SEO + WCAG
hierarchy) and a draft <video> would emit an image-mode media block.

`role='tag-identity'` marks such an attr explicitly (an ATTR_CLASSIFICATION_OVERRIDES
declaration, FR-31-2.1a — never derived from enum-contains, which over-fires:
hero.variant contains "video", quote.attributionTag contains "div"). The assembly
step 3a2 writes the source node's tag into each tag-identity attr when the tag is an
enum member (setdefault — explicit values win).

Classification 'styling-behaviour': the tag is structural identity, NOT content —
it must never enter the FR-31-2.2 content walk (the content-bearing allowlist).

The per-attr role TAGS live in sgs-update-v2.py ATTR_CLASSIFICATION_OVERRIDES (the
reseed-durable channel). This roles-table row is the controlled vocabulary those
tags reference (check_orphan_roles enforces the FK); /sgs-update does NOT rebuild
`roles`, so a one-shot migration is durable (pattern:
2026-07-03-register-icon-source-roles.py).

Idempotent: INSERT OR IGNORE. Run manually (/sgs-update does NOT auto-run
migrations):

    python plugins/sgs-blocks/scripts/migrations/2026-07-05-register-tag-identity-role.py
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

_ROWS: list[tuple[str, str, str]] = [
    ("tag-identity", "styling-behaviour",
     "The attr stores the source element's HTML tag (sgs/heading.level, "
     "sgs/media.mediaType). R-31-2 shape fact written by assembly step 3a2, "
     "gated on enum membership. Structural identity, never content-walked."),
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
            _ROWS,
        )
        con.commit()
        rows = con.execute(
            "SELECT role_name, classification FROM roles WHERE role_name='tag-identity'"
        ).fetchall()
        print(f"[migration] tag-identity role registered: {rows}")
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    raise SystemExit(main())

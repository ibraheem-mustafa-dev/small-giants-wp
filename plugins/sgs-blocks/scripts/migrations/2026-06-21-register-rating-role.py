#!/usr/bin/env python3
"""2026-06-21-register-rating-role.py — register the orphaned `rating` role.

F6 follow-up (D237 deferred check #3, orphan-role integrity): `block_attributes`
uses role `rating` (sgs/testimonial.ratingStars) but `roles` had no matching row,
so `block_attributes.role` had a dangling reference. `rating` is a content-bearing
display value (the star/numeric rating itself), so it is classified
`content-bearing` — consistent with the other content roles (text-content,
image-object, identity, link-href, content).

Idempotent: INSERT OR IGNORE. Re-running is a no-op. Run manually
(`/sgs-update` does NOT auto-run migrations):

    python plugins/sgs-blocks/scripts/migrations/2026-06-21-register-rating-role.py
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
            "INSERT OR IGNORE INTO roles (role_name, classification, description) "
            "VALUES (?, ?, ?)",
            (
                "rating",
                "content-bearing",
                "Star/numeric rating value (e.g. sgs/testimonial.ratingStars) — "
                "a content-bearing display value, not a styling property.",
            ),
        )
        con.commit()
        row = con.execute(
            "SELECT role_name, classification FROM roles WHERE role_name = 'rating'"
        ).fetchone()
        print(f"[migration] rating role: {row}")
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    raise SystemExit(main())

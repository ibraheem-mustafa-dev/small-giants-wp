"""Migration: set role + derived_selector for sgs/testimonial object media attrs.

Why: avatarMedia, orgLogo, and workMedia are object-typed image attrs whose
role=NULL + derived_selector=NULL — the content-extraction engine
(_lift_scalar_attrs_by_selector) skips any attr with role=NULL, so these three
media fields are never lifted from the draft.

The durable, reseed-surviving fix is the ATTR_CLASSIFICATION_OVERRIDES entry
in sgs-update-v2.py (Stage 1 sub-step C runs AFTER assign-canonical.py, so the
override is the final writer on every /sgs-update). This migration is the
immediate-effect twin: it writes the same values to the live DB right now,
without requiring a full reseed.

Selectors match the BEM elements used in render.php:
  avatarMedia → <div class="sgs-testimonial__avatar">  (render.php line 249)
  orgLogo     → <div class="sgs-testimonial__logo">    (render.php line 257)
  workMedia   → <figure class="sgs-testimonial__work"> (render.php line 265)

Idempotent: re-running writes the same values — no-op in effect.

Rule: db-changes-reproducible-via-migration-not-manual-or-moduleload
  DB data changes go via dated migration + full /sgs-update reseed, never manual
  sqlite3 edits; the override in sgs-update-v2.py is the reseed-surviving source
  of truth. 2026-06-26.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# (attr_name, role, derived_selector) — must match ATTR_CLASSIFICATION_OVERRIDES
# entries in sgs-update-v2.py exactly.
UPDATES = [
    ("avatarMedia", "image-object", ".sgs-testimonial__avatar"),
    ("orgLogo",     "image-object", ".sgs-testimonial__logo"),
    ("workMedia",   "image-object", ".sgs-testimonial__work"),
]


def main() -> int:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    affected = 0

    for attr_name, role, selector in UPDATES:
        cur.execute(
            """
            UPDATE block_attributes
               SET role            = ?,
                   derived_selector = ?
             WHERE block_slug = 'sgs/testimonial'
               AND attr_name  = ?
            """,
            (role, selector, attr_name),
        )
        rows = cur.rowcount
        affected += rows
        status = "updated" if rows else "no row found"
        print(f"  {attr_name}: {status} (role={role}, derived_selector={selector})")

    conn.commit()
    conn.close()
    print(f"\nTotal rows updated: {affected}/3")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

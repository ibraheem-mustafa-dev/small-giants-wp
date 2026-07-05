#!/usr/bin/env python3
"""2026-07-05-register-image-alt-role.py — register the `image-alt` role.

CG-8 (2026-07-05). The image extractor (field_extractors.scalar_media_from_img)
builds a full ``{"url": ..., "id": 0, "alt": ...}`` dict from every ``<img>`` it
lifts, but a STRING-typed image attr (sgs/product-card.image, sgs/media.imageUrl)
downcasts that dict to the bare URL (walk.py NESTED leg 2 + extraction.py
run_mechanism_leaf) — discarding the alt text. Both blocks declare a SIBLING
``imageAlt`` string attr that render.php already reads and escapes into
``alt=""``, but its DB ``role`` was NULL, so nothing ever populated it (a11y
defect — page 8 shipped 3 images with empty alt text).

The fix (Spec 31 §3.B.0-style content lift, R-31-1 DB-driven, R-31-9 universal):
tag the alt attr with role='image-alt' (content-bearing) so the per-attr walk
recognises it, and record WHICH image attr it is the companion of via the new
``block_attributes.alt_companion_attr`` column (there is no reliable naming
convention linking an image attr to its alt attr across blocks — product-card's
is `image`, media's is `imageUrl` — so the companion is a genuine per-attr DB
fact, not a suffix-derivable name like the Unit-companion family).

This `roles` row is the controlled vocabulary the per-attr tags reference
(check_orphan_roles enforces the FK); the tags themselves live in
sgs-update-v2.py ATTR_CLASSIFICATION_OVERRIDES (the reseed-durable channel —
assign-canonical re-derives block_attributes.role every reseed). Same pattern
as 2026-07-03-register-icon-source-roles.py / 2026-06-21-register-rating-role.py.

Idempotent: INSERT OR IGNORE. Re-running is a no-op. Run manually
(`/sgs-update` does NOT auto-run migrations):

    python plugins/sgs-blocks/scripts/migrations/2026-07-05-register-image-alt-role.py
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

_IMAGE_ALT_ROLE: tuple[str, str, str] = (
    "image-alt", "content-bearing",
    "Alt text for a sibling image-object attr (e.g. sgs/product-card.imageAlt, "
    "sgs/media.imageAlt). Content-bearing display value the cloning image arm "
    "lifts alongside the image URL, not a styling property. The specific image "
    "attr it belongs to is named by block_attributes.alt_companion_attr "
    "(db_lookup.image_alt_companion_for), never guessed by name-parsing.",
)


def main() -> int:
    if not DB_PATH.exists():
        print(f"[migration] DB not found: {DB_PATH}", file=sys.stderr)
        return 1
    con = sqlite3.connect(str(DB_PATH))
    try:
        con.execute(
            "INSERT OR IGNORE INTO roles (role_name, classification, description) "
            "VALUES (?, ?, ?)",
            _IMAGE_ALT_ROLE,
        )
        con.commit()
        row = con.execute(
            "SELECT role_name, classification FROM roles WHERE role_name = 'image-alt'"
        ).fetchone()
        print(f"[migration] image-alt role: {row}")
        return 0 if row else 1
    finally:
        con.close()


if __name__ == "__main__":
    raise SystemExit(main())

"""Migration: write multi-alias derived_selector for sgs/testimonial styling attrs.

Why: assign-canonical.py only processes rows WHERE canonical_slot IS NULL.
The five styling attrs already have canonical_slot populated (from an earlier
assign-canonical run), so the fingerprint-override channel in that script
(lines 551-553) is never reached for them. The correct canonical path is a
migration that writes the selector directly — this is idempotent and
reproducible, matching the db-changes-reproducible-via-migration rule.

The fingerprints.json entries added in this session (2026-06-13) document the
intended selector for each attr; this migration writes the DB rows to match.

Scope: sgs/testimonial — 5 styling attrs only. Content attrs (quote, name,
role) are handled by their own fingerprint entries + the assign-canonical.py
gap path (they have NULL canonical_slot).

Idempotent: re-running writes the same values — no-op in effect.

Temporary unblock: superseded once a unified converter pass addresses the
CSS-class naming divergence (draft uses __text/__author; block uses
__quote/__name/__heading). At that point the block's render.php or CSS will
be updated to match, and this migration becomes historical record.

R-22-1 (DB-first, no hardcoded dicts).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# (attr_name, derived_selector)  — must match fingerprints.json entries exactly.
#
# NOTE (2026-06-14): nameFontWeight was REMOVED from this list. Its selector is
# now owned solely by ATTR_CLASSIFICATION_OVERRIDES in sgs-update-v2.py — the
# only channel that re-writes it on every reseed (assign-canonical skips
# canonical_slot-populated rows so the fingerprint channel never reaches it, and
# this migration only runs when invoked manually). Keeping a second copy here
# was part of the triple-source drift that caused the revert. Do not re-add it.
UPDATES = [
    ("quoteFontSize",   ".sgs-testimonial__quote, .sgs-testimonial__text"),
    ("quoteColour",     ".sgs-testimonial__quote, .sgs-testimonial__text"),
    ("quoteLineHeight", ".sgs-testimonial__quote, .sgs-testimonial__text"),
    ("nameColour",      ".sgs-testimonial__heading, .sgs-testimonial__author"),
]


def main() -> int:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    affected = 0

    for attr_name, selector in UPDATES:
        cur.execute(
            """
            UPDATE block_attributes
               SET derived_selector = ?
             WHERE block_slug = 'sgs/testimonial'
               AND attr_name  = ?
            """,
            (selector, attr_name),
        )
        affected += cur.rowcount

    conn.commit()
    conn.close()
    print(f"Updated derived_selector for {affected} sgs/testimonial styling attrs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

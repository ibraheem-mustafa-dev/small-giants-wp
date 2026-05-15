"""2026-05-16 — populate slot_synonyms.role for content-bearing slots.

Idempotent migration. Run once per machine; safe to re-run.

Context: the 2026-05-16 leftover-bucket-router upgrade filters
cv2_emitted_dynamic gaps by `block_attributes.role IN content-bearing
roles` to keep the signal meaningful. Today's data has 862 of ~1430 attrs
with role=NULL because `slot_synonyms.role` was always NULL — so
`resolve_canonical_slot()` in assign-canonical.py returns role=None for
every slot lookup, and the property_suffix-driven role assignment only
covers attrs whose name carries a property suffix.

This migration assigns canonical roles to the slot vocabulary itself. The
companion assign-canonical.py change adds a backfill pass that propagates
slot.role -> block_attributes.role for rows where canonical_slot is set
but role is NULL.

How to run:
  python plugins/sgs-blocks/scripts/migrations/2026-05-16-slot-synonyms-roles.py

Then re-run /sgs-update Stage 4 (or `python
plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py`) to
backfill the block_attributes table.
"""

from __future__ import annotations
import os
import sqlite3
import sys

DB_PATH = os.path.expanduser("~/.claude/skills/sgs-wp-engine/sgs-framework.db")

# canonical_slot -> role mapping.
#
# 'text-content'      = block renders the value as text inside an HTML
#                       element (heading, body copy, button label, etc.)
# 'content'           = block renders the value as an HTML attribute
#                       (href, src, alt, value) — non-text content
# 'select-from-enum'  = block consumes the value as an enum choice
#                       (variantStyle, position, size token name)
# 'image-object'      = WP attachment object {id, url, alt, width, height}
#                       — distinct from plain content/text routing
SLOT_ROLES: dict[str, str] = {
    # Text-content slots — visible text inside an element
    "heading":      "text-content",
    "subheading":   "text-content",
    "label":        "text-content",
    "text":         "text-content",
    "badge":        "text-content",
    "caption":      "text-content",
    "price":        "text-content",
    "rating":       "text-content",
    "date":         "text-content",
    "number":       "text-content",
    # Content slots — emitted as HTML attributes
    "button":           "content",   # button -> {text, url} composite; href is the content
    "buttonSecondary":  "content",
    "link":             "content",
    "alt":              "content",
    "ariaLabel":        "content",
    # Image-object slots — WP attachment compound
    "media":            "image-object",
    "avatar":           "image-object",
    "icon":             "image-object",
    "backgroundMedia":  "image-object",
    # Items / options — array slots; visible as repeating content
    "items":    "text-content",
    "options":  "text-content",
    # Separator is structural; no content lift needed but flag as visual
    "separator": "visual",
}


def main() -> int:
    if not os.path.exists(DB_PATH):
        print(f"[error] DB not found: {DB_PATH}", file=sys.stderr)
        return 1

    con = sqlite3.connect(DB_PATH)
    try:
        updated = 0
        skipped = 0
        for slot, role in SLOT_ROLES.items():
            existing = con.execute(
                "SELECT role FROM slot_synonyms WHERE canonical_slot = ?",
                (slot,),
            ).fetchone()
            if existing is None:
                print(f"[skip] {slot} not in slot_synonyms (synonym row missing)")
                skipped += 1
                continue
            current = existing[0]
            if current == role:
                continue  # already set, no-op
            con.execute(
                "UPDATE slot_synonyms SET role = ? WHERE canonical_slot = ?",
                (role, slot),
            )
            if current is None:
                print(f"[+] {slot}: role NULL -> {role}")
            else:
                print(f"[~] {slot}: role {current!r} -> {role}")
            updated += 1
        con.commit()

        # Verify
        print()
        print(f"Updated {updated}; skipped {skipped} (missing rows).")
        print("\nslot_synonyms rows with role now set:")
        for r in con.execute(
            "SELECT canonical_slot, role FROM slot_synonyms "
            "WHERE role IS NOT NULL ORDER BY role, canonical_slot"
        ).fetchall():
            print(f"  {r[0]:18} -> {r[1]}")
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())

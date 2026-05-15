"""2026-05-16 — slot_synonyms.standalone_block column + composite-element routing rows.

Idempotent migration. Run once per machine; safe to re-run.

Adds the `standalone_block` column to sgs-framework.db.slot_synonyms and
populates the three rows the converter_v2 walker depends on for composite-
element-to-standalone-block routing:

  - label → sgs/label
  - badge → sgs/label  (pill-variant of label)
  - card  → sgs/info-box  (1-to-1 structural match; canonical_slot for __card)

Why this exists:
  The 2026-05-16 walker fix (convert.py precedence swap + composite-element
  fast path) reads db.standalone_block_for(canonical_slot) at runtime. The
  hardcoded SLOT_TO_STANDALONE_BLOCK dict that previously held this routing
  was removed in the same commit per Bean's directive that fixes must be
  fully DB-driven, never section-specific. This migration ensures the DB
  state required for the fix to function survives any /sgs-update rebuild
  or DB reset.

How to run:
  python plugins/sgs-blocks/scripts/migrations/2026-05-16-slot-synonyms-standalone-block.py

Verify:
  python -c "import sqlite3, os; \
    con = sqlite3.connect(os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db')); \
    print(con.execute('SELECT canonical_slot, standalone_block FROM slot_synonyms WHERE standalone_block IS NOT NULL').fetchall())"

Future extension:
  Append rows to ROUTING below for new synonyms (tile, panel, feature,
  module, item — parking item P-PHASE8-9). Re-running the migration adds
  them idempotently.
"""

from __future__ import annotations
import os
import sqlite3
import sys

DB_PATH = os.path.expanduser("~/.claude/skills/sgs-wp-engine/sgs-framework.db")

# (canonical_slot, aliases_json, description, html_semantic_tag, standalone_block)
ROUTING: list[tuple[str, str, str, str | None, str]] = [
    (
        "card",
        '["tile", "panel"]',
        "Self-contained card composition with label/heading/body/price/cta slots — 1-to-1 structural match with sgs/info-box",
        "article",
        "sgs/info-box",
    ),
]


def main() -> int:
    if not os.path.exists(DB_PATH):
        print(f"[error] DB not found: {DB_PATH}", file=sys.stderr)
        return 1

    con = sqlite3.connect(DB_PATH)
    try:
        # 1. Add column if missing
        cols = [r[1] for r in con.execute("PRAGMA table_info(slot_synonyms)").fetchall()]
        if "standalone_block" not in cols:
            con.execute("ALTER TABLE slot_synonyms ADD COLUMN standalone_block TEXT")
            print("[+] added column slot_synonyms.standalone_block")
        else:
            print("[=] column slot_synonyms.standalone_block already present")

        # 2. Update existing label + badge rows
        before = dict(con.execute(
            "SELECT canonical_slot, standalone_block FROM slot_synonyms "
            "WHERE canonical_slot IN ('label','badge')"
        ).fetchall())
        con.execute("UPDATE slot_synonyms SET standalone_block='sgs/label' "
                    "WHERE canonical_slot IN ('label','badge')")
        after = dict(con.execute(
            "SELECT canonical_slot, standalone_block FROM slot_synonyms "
            "WHERE canonical_slot IN ('label','badge')"
        ).fetchall())
        for slot in ("label", "badge"):
            if before.get(slot) != after.get(slot):
                print(f"[+] set standalone_block='sgs/label' on {slot}")
            else:
                print(f"[=] {slot} standalone_block already 'sgs/label'")

        # 3. Insert composite-element synonyms
        for canonical, aliases_json, description, html_tag, standalone in ROUTING:
            existing = con.execute(
                "SELECT canonical_slot FROM slot_synonyms WHERE canonical_slot=?",
                (canonical,),
            ).fetchone()
            if existing:
                con.execute(
                    "UPDATE slot_synonyms SET standalone_block=? WHERE canonical_slot=?",
                    (standalone, canonical),
                )
                print(f"[=] {canonical} row present; ensured standalone_block={standalone}")
            else:
                con.execute(
                    "INSERT INTO slot_synonyms "
                    "(canonical_slot, aliases, description, html_semantic_tag, standalone_block) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (canonical, aliases_json, description, html_tag, standalone),
                )
                print(f"[+] inserted {canonical} -> {standalone}")

        con.commit()

        # Verify
        print("\nFinal state:")
        for r in con.execute(
            "SELECT canonical_slot, standalone_block, aliases FROM slot_synonyms "
            "WHERE standalone_block IS NOT NULL ORDER BY canonical_slot"
        ).fetchall():
            print(f"  {r[0]:12} -> {r[1]:15} aliases={r[2]}")
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())

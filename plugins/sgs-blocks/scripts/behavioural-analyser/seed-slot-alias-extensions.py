"""
seed-slot-alias-extensions.py
=============================
Idempotent script that appends missing slot aliases identified by
P-XS-4-SLOT-VOCAB-GAPS (2026-05-30):

  - heading slot         <- adds  productName
  - label slot           <- adds  trialTag, featuredTag
  - media slot           <- adds  splitimage (no-hyphen camelCase variant)

Direct sqlite3 (writes — sgs-db.py wrapper is read-only).
"""

import json
import sqlite3
import sys
from pathlib import Path

import os

DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
    )
)

ALIAS_ADDITIONS = {
    "heading": ["productName"],
    "label":   ["trialTag", "featuredTag"],
    # `split-image` already present; add no-hyphen camelCase variant so
    # attr-name `splitImage` (lowercase -> `splitimage`) matches via the
    # plain alias index without relying on the hyphen-strip helper.
    "media":   ["splitimage"],
}


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        results = []
        for slot_name, new_aliases in ALIAS_ADDITIONS.items():
            row = conn.execute(
                "SELECT aliases FROM slots "
                "WHERE slot_name = ? AND scope = 'element'",
                (slot_name,),
            ).fetchone()
            if row is None:
                print(f"[seed] slot {slot_name!r} not found -- skipping",
                      file=sys.stderr)
                continue
            try:
                existing = json.loads(row[0]) if row[0] else []
            except json.JSONDecodeError:
                existing = []

            added = []
            for alias in new_aliases:
                if alias not in existing:
                    existing.append(alias)
                    added.append(alias)

            if not added:
                print(f"[seed] slot {slot_name!r}: no new aliases (all present)")
                continue

            # Preserve deterministic ordering: keep insertion order in JSON.
            new_json = json.dumps(existing, ensure_ascii=False)
            conn.execute(
                "UPDATE slots SET aliases = ? "
                "WHERE slot_name = ? AND scope = 'element'",
                (new_json, slot_name),
            )
            results.append({"slot": slot_name, "aliases_added": added})
            print(f"[seed] slot {slot_name!r}: added {added}")

        conn.commit()
        print()
        print(json.dumps({"slot_aliases_extended": results}, indent=2))
    finally:
        conn.close()


if __name__ == "__main__":
    main()

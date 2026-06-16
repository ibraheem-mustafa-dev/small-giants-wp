"""Migration: remove plural group terms ("ctas", "buttons") from the `button`
slot's aliases so a button-GROUP BEM element resolves unambiguously to the
`button-group` slot (→ sgs/multi-button), not `button` (→ sgs/button).

Why: db_lookup.resolve_slug_from_bem(['sgs-hero__ctas']) walks Path 2
(element-only) → _slot_alias_to_standalone()[ 'ctas' ]. The alias map is built
first-writer-wins over `slots WHERE scope='element'` in rowid order. Both the
`button` row (lower rowid) AND the `button-group` row listed `ctas`/`buttons`,
so `button` won and `__ctas` resolved to sgs/button. The composite-interior
walker (convert.py _route_composite_interior loop) then emitted a REDUNDANT
sgs/container wrapping the sgs/multi-button for the `__ctas` div instead of
dissolving the wrapper into sgs/multi-button directly.

`ctas` (plural) and `buttons` (plural) name a button-GROUP container — a div
holding the primary + secondary buttons — not a single button. They belong
SOLELY to the `button-group` slot. Singular `cta` (if present on `button`)
correctly stays; it names a single call-to-action button.

After this migration:
  resolve_slug_from_bem(['sgs-hero__ctas'])    → 'sgs/multi-button'
  resolve_slug_from_bem(['sgs-foo__buttons'])  → 'sgs/multi-button'

The companion seed-source edit (uimax-tools/seed-slot-synonyms.py — `ctas`/
`buttons` removed from the `button` ALIAS_EXTENSIONS row) prevents a future
/sgs-update reseed from re-adding them. The seed script is purely additive
(existing | new), so it cannot REMOVE the already-present terms — this dated
migration does the removal. Run both: this migration removes the live data,
the seed edit stops re-addition.

R-22-1 (DB-first, no hardcoded dicts in the converter). R-22-9 (universal —
applies to every button-group BEM element across every composite/section, not
a per-block carve-out; no `ctas`/`hero` literals introduced in convert.py).

Idempotent: re-running on a DB whose `button` row already lacks the terms is a
no-op.

How to run:
  python plugins/sgs-blocks/scripts/migrations/2026-06-16-button-group-alias-disambiguation.py

Verify:
  python -c "import sys; sys.path.insert(0,'plugins/sgs-blocks/scripts/orchestrator/converter_v2'); \
    import db_lookup as db; print(db.resolve_slug_from_bem(['sgs-hero__ctas']))"
  -> sgs/multi-button
"""
from __future__ import annotations
import json
import sqlite3
import sys
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Plural group terms to strip from the `button` slot's aliases. These belong
# only to the `button-group` slot (→ sgs/multi-button).
TERMS_TO_REMOVE = {"ctas", "buttons"}
TARGET_SLOT = "button"


def main() -> int:
    if not DB.exists():
        print(f"[error] DB not found: {DB}", file=sys.stderr)
        return 1

    con = sqlite3.connect(str(DB))
    try:
        row = con.execute(
            "SELECT aliases FROM slots WHERE slot_name=? AND scope='element'",
            (TARGET_SLOT,),
        ).fetchone()
        if row is None:
            print(f"[warn] no element-scope slot '{TARGET_SLOT}' found — nothing to do")
            return 0

        try:
            aliases = json.loads(row[0]) if row[0] else []
        except (ValueError, TypeError):
            print(f"[error] could not parse aliases JSON for '{TARGET_SLOT}': {row[0]!r}",
                  file=sys.stderr)
            return 1

        before = list(aliases)
        cleaned = [a for a in aliases if a not in TERMS_TO_REMOVE]

        if cleaned == before:
            print(f"[=] '{TARGET_SLOT}' aliases already free of {sorted(TERMS_TO_REMOVE)} - no-op")
            print(f"    aliases = {before}")
        else:
            removed = [a for a in before if a in TERMS_TO_REMOVE]
            con.execute(
                "UPDATE slots SET aliases=? WHERE slot_name=? AND scope='element'",
                (json.dumps(cleaned, ensure_ascii=False), TARGET_SLOT),
            )
            con.commit()
            print(f"[+] removed {removed} from '{TARGET_SLOT}' aliases")
            print(f"    before = {before}")
            print(f"    after  = {cleaned}")

        # Sanity: confirm button-group still owns the terms.
        bg = con.execute(
            "SELECT aliases, standalone_block FROM slots "
            "WHERE slot_name='button-group' AND scope='element'",
        ).fetchone()
        if bg:
            print(f"[i] button-group -> {bg[1]} aliases={bg[0]}")
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())

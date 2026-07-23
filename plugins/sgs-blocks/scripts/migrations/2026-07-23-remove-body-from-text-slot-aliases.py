"""Migration: remove "body" from the `text` slot's aliases.

WHY
---
`body` names a component's CONTENT REGION, not a run of copy. That is the
universal HTML/CSS/BEM reading — `<body>` is the page's content area as opposed
to `<head>`, and every mainstream component library uses the term the same way
(Bootstrap ships `.card-body`, `.modal-body`). As a BEM ELEMENT on a card,
`__body` denotes the region that WRAPS the title/description/price — it is a
structural wrapper, never a text node.

The current row makes `body` an alias of the `text` slot, so
`canonical_slot_for('body')` returns `text` and the element would resolve to
`sgs/text`. Applied to a real draft that is simply wrong: the Mama's homepage
declares

    <div class="sgs-product-card__body">
      <h3 class="sgs-product-card__title">…</h3>
      <div class="sgs-product-card__description">…</div>
      …

— a `<div>` wrapping three other elements. Resolving that to a text block would
try to turn a wrapper into a paragraph.

THIS IS A KNOWN, ALREADY-DIAGNOSED CLASS — `body` was simply missed
--------------------------------------------------------------------
`uimax-tools/seed-slot-synonyms.py` (the seed source) carries this note dated
2026-05-24 on the very same `text` row:

    structural-wrapper terms (inner, body-row, custom-content) removed — they
    were causing wrapper divs (__inner, __content, __body-row) to wrongly
    collapse into sgs/text via the composite_element walker branch.

So the exact failure mode was found and cleaned up over a year ago; `inner`,
`body-row` and `custom-content` were removed then. Plain `body` survived in the
DB. Note `inner` and `content` now carry DELIBERATELY EMPTY alias lists
("EMPTY by design — never matched against draft wrapper classes"), which is the
settled position this migration brings `body` into line with.

RESEED-DURABLE BY CONSTRUCTION
------------------------------
Unlike the button-group precedent (2026-06-16), NO companion seed-source edit is
required: `seed-slot-synonyms.py`'s `text` row does not list `body` (verified —
its aliases are bio / excerpt / intro / review-content / consent-text /
content-preview / inner-label / label-control). The DB row is a leftover the
2026-05-24 cleanup missed, and the only other `body` occurrence in the seed
tooling is `enrich-db.py`'s `font_body` (typography, unrelated). A full
`/sgs-update` reseed therefore cannot re-add it.

SCOPE — DELIBERATELY MINIMAL
----------------------------
Removes ONE alias. It does NOT touch the CSS/area routing question that
surfaced it: `attr_for_area_property` never consults the slots table at all
(it name-builds `area + suffix`), so this alias was never a cause of the
product-card padding drop. Done on principle, per Bean 2026-07-23: remove the
wrong mapping before it can bite, and keep the routing redesign separate.

After this migration:
    canonical_slot_for('body')  -> None   (was 'text')
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
    )
)

_SLOT = "text"
_ALIAS = "body"


def main() -> int:
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute(
            "SELECT rowid, slot_name, aliases FROM slots WHERE slot_name = ?",
            (_SLOT,),
        ).fetchall()
        if not rows:
            print(f"[migration] no '{_SLOT}' slot row found — nothing to do.")
            return 0

        changed = 0
        for rowid, slot_name, aliases_json in rows:
            try:
                aliases = json.loads(aliases_json) if aliases_json else []
            except json.JSONDecodeError:
                print(f"[migration] SKIP rowid={rowid}: aliases is not valid JSON.")
                continue
            if _ALIAS not in aliases:
                continue
            new_aliases = [a for a in aliases if a != _ALIAS]
            conn.execute(
                "UPDATE slots SET aliases = ? WHERE rowid = ?",
                (json.dumps(new_aliases), rowid),
            )
            changed += 1
            print(
                f"[migration] {slot_name}: removed {_ALIAS!r} "
                f"({len(aliases)} -> {len(new_aliases)} aliases)"
            )

        conn.commit()
        if not changed:
            print(f"[migration] {_ALIAS!r} not present on '{_SLOT}' — already clean (idempotent).")

        # Verify: no slot may claim the alias any more.
        remaining = [
            r[0] for r in conn.execute("SELECT slot_name, aliases FROM slots").fetchall()
            if r[1] and _ALIAS in (json.loads(r[1]) if r[1].startswith("[") else [])
        ]
        if remaining:
            print(f"[migration] FAILED — {_ALIAS!r} still claimed by: {remaining}")
            return 1
        print(f"[migration] verified — no slot claims {_ALIAS!r}.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())

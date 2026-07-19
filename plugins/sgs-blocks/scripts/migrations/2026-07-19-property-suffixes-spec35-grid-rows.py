"""Migration: seed GridTemplateRows + GridAutoRows suffix → CSS property mappings.

Why (Spec 35 UNIT A+ gap closure, 2026-07-19): the attribute-to-setting dedup found
`gridTemplateRows` (~19 blocks) and `gridAutoRows` (17 blocks) UNRESOLVED — the
property_suffixes map had rows for GridTemplateColumns/GridAutoColumns/GridAutoFlow
but not the ROW siblings. Two consequences:
  1. The cloning converter's name-free A-layer router (db_lookup.attr_for_layer_property)
     could not route a draft's `grid-template-rows` / `grid-auto-rows` value onto these
     attrs — those draft declarations were silently dropped.
  2. The Spec 35 setting dedup keyed them by NAME (fake "unique settings") instead of
     collapsing them into their CSS-property identity.
Adding the two ROW rows fixes both, symmetric with the existing COLUMN rows.

Verified before adding (prove-before-fix): both attrs are `string`-typed grid props on
container/grid-family blocks — unambiguous. NOT added here (need own review): a hover-state
`*TextDecorationHover` suffix (state variant, not a base-property lift) and `VerticalAlignment`
(risk of colliding with the existing `VerticalAlign`→align-items row — different semantics).

Idempotent: existence-gated on `suffix=?` (INSERT only when absent). R-31-1 (DB-first).
R-31-9 (universal — applies to every grid-family block, not a per-block carve-out).
Run once: `python plugins/sgs-blocks/scripts/migrations/2026-07-19-property-suffixes-spec35-grid-rows.py`
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# (suffix, role, css_property, is_token_matched, token_source, notes)
INSERT_ROWS = [
    ("GridTemplateRows", "layout", "grid-template-rows", 0, None,
     "CSS grid-template-rows -> grid-family blocks gridTemplateRows attr (~19 blocks). "
     "Row sibling of GridTemplateColumns. Spec 35 gap closure 2026-07-19."),
    ("GridAutoRows", "layout", "grid-auto-rows", 0, None,
     "CSS grid-auto-rows -> grid-family blocks gridAutoRows attr (17 blocks). "
     "Row sibling of GridAutoColumns. Spec 35 gap closure 2026-07-19."),
]


def main() -> None:
    conn = sqlite3.connect(str(DB))
    try:
        inserted, skipped = 0, 0
        for suffix, role, css_property, is_token_matched, token_source, notes in INSERT_ROWS:
            exists = conn.execute(
                "SELECT 1 FROM property_suffixes WHERE suffix=?", (suffix,)
            ).fetchone()
            if exists:
                skipped += 1
                print(f"  [skip] {suffix} already present")
                continue
            conn.execute(
                "INSERT INTO property_suffixes "
                "(suffix, role, css_property, is_token_matched, token_source, notes) "
                "VALUES (?,?,?,?,?,?)",
                (suffix, role, css_property, is_token_matched, token_source, notes),
            )
            inserted += 1
            print(f"  [insert] {suffix} -> {css_property}")
        conn.commit()
        total = conn.execute("SELECT COUNT(*) FROM property_suffixes").fetchone()[0]
        print(f"Done: inserted={inserted} skipped={skipped}; property_suffixes now {total} rows.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

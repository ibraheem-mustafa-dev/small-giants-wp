"""Migration: add the `BgColour` → background-color CSS property → suffix mapping.

Why (2026-07-10): the styling-lift (`converter/resolvers/styling_content.py`) resolves an
attr's css_property by peeling the LONGEST matching `property_suffixes` suffix from the
attr name. The framework's established background-colour attr-naming convention uses the
`Bg` abbreviation — `*BgColour` — on SEVEN blocks (cardBgColour, panelBgColour,
captionBgColour, categoryBadgeBgColour, linkHoverBgColour, sgsHoverBgColour, and the
pill/picker pack — pillBgColour / pillSelectedBgColour / pickerPillBgColour /
pickerPillSelectedBgColour). But `property_suffixes` had only `BackgroundColour`
(full word), `Bg`, and `Colour`. `*BgColour` does NOT end with `BackgroundColour`, and
`Bg` is not a suffix of `...BgColour` (it ends in `Colour`), so the peel fell through to
the shorter `Colour` → css_property `color`. Every `*BgColour` attr therefore mis-resolved
to the element's `color:` (text) value instead of its `background`/`background-color`.

Live-proven on the Mama's page-8 clone (2026-07-10): the product-card pack pills stored
`pickerPillBgColour = "text-muted"` (the resting pill's TEXT colour) instead of the draft's
`background: var(--surface-cream)`. This is a UNIVERSAL lift bug (R-31-9) affecting every
`*BgColour` attr on every block that runs the styling-lift — not a per-block/per-clone
issue — so the fix is one DB suffix row, DB-first (R-31-1), never a code branch.

Suffix settings mirror the sibling colour rows exactly (BackgroundColour/BorderColour/
TextColour/Colour): role=color, is_token_matched=1, token_source='palette'. Idempotent;
writes both DB copies. `BgColour` (8 chars) > `Colour` (6 chars) so longest-first peeling
now selects it for `*BgColour` attrs while `*Colour`/`*TextColour`/`*BorderColour` are
unaffected.
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

# (suffix, role, css_property, is_token_matched, token_source, notes)
INSERT_ROWS = [
    ('BgColour', 'color', 'background-color', 1, 'palette',
     'CSS background-color → *BgColour attrs (framework Bg-abbrev convention, 7 blocks). '
     'Fixes the styling-lift peeling only Colour→color for *BgColour attrs.'),
]


def migrate_db(db_path: Path) -> tuple[int, int]:
    if not db_path.exists():
        print(f"SKIP (not found): {db_path}")
        return 0, 0
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    inserted = 0
    skipped = 0
    for row in INSERT_ROWS:
        suffix = row[0]
        if cur.execute("SELECT 1 FROM property_suffixes WHERE suffix=?", (suffix,)).fetchone():
            skipped += 1
            continue
        cur.execute(
            "INSERT INTO property_suffixes "
            "(suffix, role, css_property, is_token_matched, token_source, notes) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            row,
        )
        inserted += 1
    conn.commit()
    conn.close()
    return inserted, skipped


def main() -> int:
    for db_path in DBS:
        inserted, skipped = migrate_db(db_path)
        print(f"{db_path.name} ({db_path.parent}): inserted {inserted}, skipped {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

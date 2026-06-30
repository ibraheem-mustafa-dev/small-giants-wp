"""Migration: seed §5 property_suffixes rows for grid, position, overflow,
background-placement, and flex shorthand.

Spec 31 §5 (line 207) catalogues the HIGH-impact missing property_suffixes rows
the container/grid CSS-transfer system needs. This migration adds them.

Three rows were already present before this migration and are therefore SKIPPED:
  - AspectRatio  (aspect-ratio,  layout, seeded in the initial seed)
  - ObjectFit    (object-fit,    visual, seeded in the initial seed)
  - ObjectPosition (object-position, visual, seeded in the initial seed)

All other Spec-31 §5 entries are seeded here.

## Suffix conventions (mirrored from existing rows)

- camelCase, exactly matching the expected SGS block attr name (e.g. zIndex, gridRow).
- `role` values follow existing precedent:
    layout  — properties that affect box / grid / flex layout
    visual  — properties that affect visual rendering without changing layout flow
    position — NEW role for CSS-positioning properties (position/inset/top/right/
               bottom/left/z-index). Using 'position' (not 'layout') keeps the DB
               role set orthogonal: 'layout' = flow-arrangement; 'position' =
               stacking/placement. Seeded conservatively; any later query that only
               looks at 'layout' won't accidentally pick up positioning properties.
               *** AMBIGUITY NOTE: position/inset/top/right/bottom/left/z-index are
               sometimes classified under 'layout' in other frameworks. We use the
               NEW 'position' role so the DB set is unambiguous. If the LIFT path
               later needs all of 'layout+position', it queries both roles. If the
               team prefers 'layout', this migration can be updated (existing rows
               have no FK dependencies on role value). Flagged conservative. ***
- `kind_override` for string enums: 'string'
- `kind_override` for integer unitless: 'number_unitless'
- `kind_override` for unitless or unitful (CSS native, e.g. flex shorthand): None
  (the engine's existing heuristic handles numeric+string flex values; no override
  needed per the 'opacity' / 'width' / 'height' precedent).
- `is_token_matched = 0` for all rows here: none of these CSS properties resolve
  via theme.json design tokens (no spacingSizes / palette / fontSizes source).
  Exception: background-position is sometimes a spacing token in some systems, but
  NOT in SGS's current theme.json (verified: no spacing preset maps to bg-position).
- `token_source = None` for all rows.

## STOP-24 note (reseed-survival)

property_suffixes rows survive a full /sgs-update reseed because sgs-update-v2.py
does NOT truncate or re-derive this table (confirmed: only INSERT OR IGNORE and a
single UPDATE in Stage 1 sub-step C; no DELETE FROM property_suffixes). Migrations
are the ONLY write path. ATTR_CLASSIFICATION_OVERRIDES is a separate per-block-attr
channel for block_attributes (different table); it is NOT needed here.

## Idempotency

Every INSERT is suffix-existence-gated: re-running on a DB that already has the row
is a no-op. R-22-1 (DB-first, no hardcoded dicts). R-22-9 (universal).

Applies to BOTH DB copies (.claude and .agents).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

# Write to both copies to keep them in sync (pattern from 2026-06-07 migrations).
DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

# ---------------------------------------------------------------------------
# INSERT_ROWS — each tuple:
# (suffix, role, css_property, is_token_matched, token_source, notes)
# ---------------------------------------------------------------------------

INSERT_ROWS: list[tuple[str, str, str, int, object, str]] = [

    # -----------------------------------------------------------------------
    # GRID PLACEMENT PROPERTIES (role=layout, §5 family E/F)
    # -----------------------------------------------------------------------

    # CSS `order` — integer, unitless. Controls item order in flex/grid.
    # kind_override='number_unitless' mirrors line-height (also unitless integer).
    ("Order", "layout", "order", 0, None,
     "CSS order → block attr 'order'; controls flex/grid item order; §5 Spec 31"),

    # CSS `grid-row` — string shorthand (e.g. '1 / 3', 'span 2', 'auto').
    # kind_override='string': it is a CSS string shorthand, not a single number.
    ("GridRow", "layout", "grid-row", 0, None,
     "CSS grid-row shorthand → block attr 'gridRow'; grid placement; §5 Spec 31"),

    # CSS `grid-column` — string shorthand (e.g. '2 / 4', 'span 3', 'auto').
    ("GridColumn", "layout", "grid-column", 0, None,
     "CSS grid-column shorthand → block attr 'gridColumn'; grid placement; §5 Spec 31"),

    # CSS `grid-area` — string (e.g. 'header', '1 / 1 / 2 / 3').
    ("GridArea", "layout", "grid-area", 0, None,
     "CSS grid-area → block attr 'gridArea'; named or positional area; §5 Spec 31"),

    # CSS `grid-template-areas` — multi-line string (e.g. '"header header" "nav main"').
    # kind_override='string': it is always a quoted string, never numeric.
    ("GridTemplateAreas", "layout", "grid-template-areas", 0, None,
     "CSS grid-template-areas → block attr 'gridTemplateAreas'; ASCII art area map; §5 Spec 31"),

    # -----------------------------------------------------------------------
    # OVERFLOW PROPERTIES (role=visual — overflow does not rearrange flow,
    # it clips/scrolls the render surface; analogous to object-fit)
    # -----------------------------------------------------------------------

    # CSS `overflow` — string enum: visible/hidden/scroll/auto/clip.
    ("Overflow", "visual", "overflow", 0, None,
     "CSS overflow shorthand → block attr 'overflow'; clip/scroll behaviour; §5 Spec 31"),

    # CSS `overflow-x` — string enum.
    ("OverflowX", "visual", "overflow-x", 0, None,
     "CSS overflow-x → block attr 'overflowX'; horizontal overflow; §5 Spec 31"),

    # CSS `overflow-y` — string enum.
    ("OverflowY", "visual", "overflow-y", 0, None,
     "CSS overflow-y → block attr 'overflowY'; vertical overflow; §5 Spec 31"),

    # -----------------------------------------------------------------------
    # CSS POSITIONING PROPERTIES (role=position — NEW role; see note above)
    # *** CONSERVATIVE CHOICE: 'position' role rather than 'layout'. ***
    # *** If 'layout' is preferred, all 7 rows below need role updated.   ***
    # -----------------------------------------------------------------------

    # CSS `position` — string enum: static/relative/absolute/fixed/sticky.
    # NOTE: suffix 'Position' is already taken by an existing select-from-enum probe
    # row (css_property=NULL, role=select-from-enum). Using 'CssPosition' to avoid
    # the PRIMARY KEY collision while still mapping css_property='position' correctly.
    # The idempotency guard will skip this row if 'CssPosition' already exists.
    ("CssPosition", "position", "position", 0, None,
     "CSS position property → block attr 'positionType' or similar; "
     "suffix is CssPosition because 'Position' is taken by a select-from-enum probe; §5 Spec 31"),

    # CSS `inset` — string shorthand (e.g. '0', '10px 20px', 'auto').
    # kind_override=None: can be a single length, multi-length, or 'auto' (like margin).
    ("Inset", "position", "inset", 0, None,
     "CSS inset shorthand → block attr 'inset'; top/right/bottom/left combined; §5 Spec 31"),

    # CSS `top`, `right`, `bottom`, `left` — length values or 'auto'.
    # kind_override=None: mirrors margin-top/padding-top (also length or keyword).
    ("Top", "position", "top", 0, None,
     "CSS top → block attr 'top'; positioned-element offset; §5 Spec 31"),

    ("Right", "position", "right", 0, None,
     "CSS right → block attr 'right'; positioned-element offset; §5 Spec 31"),

    ("Bottom", "position", "bottom", 0, None,
     "CSS bottom → block attr 'bottom'; positioned-element offset; §5 Spec 31"),

    ("Left", "position", "left", 0, None,
     "CSS left → block attr 'left'; positioned-element offset; §5 Spec 31"),

    # CSS `z-index` — integer (unitless). Mirrors 'order' (also unitless int).
    ("ZIndex", "position", "z-index", 0, None,
     "CSS z-index → block attr 'zIndex'; stacking order integer; §5 Spec 31"),

    # -----------------------------------------------------------------------
    # BACKGROUND PLACEMENT PROPERTIES (role=visual — not flow-affecting;
    # analogous to object-fit / object-position already in the DB)
    # -----------------------------------------------------------------------

    # CSS `background-size` — string (cover/contain/auto, or '100% 100%').
    ("BackgroundSize", "visual", "background-size", 0, None,
     "CSS background-size → block attr 'backgroundSize'; cover/contain/explicit; §5 Spec 31"),

    # CSS `background-position` — string (center/top left/'50% 50%').
    ("BackgroundPosition", "visual", "background-position", 0, None,
     "CSS background-position → block attr 'backgroundPosition'; placement; §5 Spec 31"),

    # CSS `background-repeat` — string enum (no-repeat/repeat/repeat-x/repeat-y).
    ("BackgroundRepeat", "visual", "background-repeat", 0, None,
     "CSS background-repeat → block attr 'backgroundRepeat'; tiling mode; §5 Spec 31"),

    # CSS `background-attachment` — string enum (scroll/fixed/local).
    ("BackgroundAttachment", "visual", "background-attachment", 0, None,
     "CSS background-attachment → block attr 'backgroundAttachment'; parallax/fixed; §5 Spec 31"),

    # -----------------------------------------------------------------------
    # FLEX SHORTHAND (role=layout)
    # CSS `flex` shorthand — e.g. '1', '1 0 auto', '0 1 200px'.
    # kind_override=None: CSS flex is neither purely numeric-unitless nor purely
    # string — the shorthand mixes integers and lengths. The engine's existing
    # heuristic (same as width/height) handles this correctly. Flagged as a
    # conservative no-override choice; if the lifter misparses, add kind_override
    # at that point rather than pre-guessing.
    # *** CONSERVATIVE: kind_override=None. If flex always stores as a string
    # attr (e.g. flexValue='1 0 auto'), use 'string'. Flagged for LIFT stage. ***
    # -----------------------------------------------------------------------

    ("Flex", "layout", "flex", 0, None,
     "CSS flex shorthand → block attr 'flex'; flex-grow/shrink/basis combined; §5 Spec 31"),
]


def migrate_db(db_path: Path) -> tuple[int, int]:
    """Run migration against one DB. Returns (inserted, skipped)."""
    if not db_path.exists():
        print(f"SKIP (not found): {db_path}")
        return 0, 0

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    inserted = 0
    skipped = 0

    for row in INSERT_ROWS:
        suffix = row[0]
        exists = cur.execute(
            "SELECT 1 FROM property_suffixes WHERE suffix=?", (suffix,)
        ).fetchone()
        if exists:
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
        print(
            f"{db_path.name} ({db_path.parent.parent.name}/{db_path.parent.name}): "
            f"inserted {inserted}, skipped {skipped} (idempotent: re-runs are no-ops)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

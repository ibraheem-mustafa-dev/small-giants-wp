"""Migration: seed property_suffixes rows for the 3 flex ITEM properties
(flex-grow, flex-shrink, flex-basis) — EXECUTION Step 12 (Phase 5), Spec 31 §5.

These are the 3 of the "11" §5 CSS-resolver-completeness properties that did NOT
already have a property_suffixes row before this migration (verified against the
live DB 2026-07-04) — everything else (order, overflow/-x/-y, object-fit, the
position family, aspect-ratio, opacity, background-image/Gradient) was already
seeded by migrations/2026-06-30-property-suffixes-grid-position-bg-flex.py (D250).

Scope note (do NOT confuse with container-level flex): `flex-direction` and
`flex-wrap` are CONTAINER-level flex properties, already lifted via
converter/services/arrangement.py — untouched by this migration. `flex-grow`,
`flex-shrink`, and `flex-basis` are ITEM-level properties (set on a flex CHILD,
not the flex container) — a distinct CSS concern.

No block currently declares a `flexGrow`/`flexShrink`/`flexBasis` attr (verified
against the live DB 2026-07-04) — seeding these rows now is a DB-first
future-proofing seed (R-31-1): the moment any block adds one of these attrs, the
generic attr_resolve → outer_box dispatch chain picks it up with ZERO resolver
code change. Until then, every declaration honestly gaps NO_DESTINATION (see
converter/tests/test_outer_box_step12_properties.py::test_flex_item_props_are_honest_gaps).

## Suffix conventions (mirrored from the D250 migration)

- camelCase, exactly matching the expected SGS block attr name.
- `role='layout'`: these are box/flex-layout properties (same role as `order`,
  `flex` shorthand — D250 precedent).
- `kind_override=None` for flex-grow/flex-shrink (unitless numbers, but CSS
  technically allows either; mirrors the D250 'Flex' shorthand's conservative
  no-override choice) and for flex-basis (length OR keyword 'auto'/'content',
  mirrors width/height's no-override precedent).
- `is_token_matched=0`, `token_source=None` for all rows: none of these resolve
  via theme.json design tokens.

## STOP-24 note (reseed-survival)

property_suffixes rows survive a full /sgs-update reseed — confirmed (see the
D250 migration's own STOP-24 note): sgs-update-v2.py does not truncate or
re-derive this table; migrations are the ONLY write path.

## Idempotency

Every INSERT is suffix-existence-gated: re-running on a DB that already has the
row is a no-op. R-31-1 (DB-first, no hardcoded dicts). R-31-9 (universal).

Applies to BOTH DB copies (.claude and .agents).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

# ---------------------------------------------------------------------------
# INSERT_ROWS — each tuple:
# (suffix, role, css_property, is_token_matched, token_source, notes)
# ---------------------------------------------------------------------------

INSERT_ROWS: list[tuple[str, str, str, int, object, str]] = [
    ("FlexGrow", "layout", "flex-grow", 0, None,
     "CSS flex-grow → block attr 'flexGrow'; flex ITEM growth factor "
     "(not the container-level flex-direction/flex-wrap); §5 Spec 31, EXECUTION Step 12"),

    ("FlexShrink", "layout", "flex-shrink", 0, None,
     "CSS flex-shrink → block attr 'flexShrink'; flex ITEM shrink factor; "
     "§5 Spec 31, EXECUTION Step 12"),

    ("FlexBasis", "layout", "flex-basis", 0, None,
     "CSS flex-basis → block attr 'flexBasis'; flex ITEM initial main-size "
     "(length or 'auto'/'content'); §5 Spec 31, EXECUTION Step 12"),
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

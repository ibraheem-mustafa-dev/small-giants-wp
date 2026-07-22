"""Migration: EXCLUDE 14 properties with a `property_suffixes` routing row but
NO consuming block attribute — Spec 31 unit A1/A3 (2026-07-22).

Context: unit A1 (2026-07-22, read-only audit) went through every CSS property
that reaches the resolver dispatch and decided, per-property, SEED (a block
declares a consuming attr -> wire it) vs EXCLUDE-with-reason (no block declares
any consuming attr -> the property still clones via passthrough <style>
(D2/fidelity), it just has no D1 attribute LIFT destination). This migration
records the EXCLUDE decisions found by that audit for the following 14
properties, each verified against `block_attributes` on 2026-07-22:

    transform, filter, transition                         (bare shorthand;
        no consuming attr -- NOTE the already-excluded 2026-07-04 migration
        covers these three already; this migration is idempotent against
        them via the UNIQUE(css_property) guard and will just report
        "skipped" for these three, not re-decide them)
    overflow-x, overflow-y                                 (property_suffixes
        role=visual; suffix OverflowX/OverflowY; verified 0 rows in
        block_attributes for 'overflowX'/'overflowY')
    position, top, right, bottom, left, inset              (property_suffixes
        role=position; suffix CssPosition/Top/Right/Bottom/Left/Inset;
        verified 0 rows in block_attributes for
        'position'/'top'/'right'/'bottom'/'left'/'inset')
    flex-grow, flex-shrink, flex-basis                     (property_suffixes
        role=layout; suffix FlexGrow/FlexShrink/FlexBasis; verified 0 rows in
        block_attributes for 'flexGrow'/'flexShrink'/'flexBasis')

IMPORTANT — this is a completeness/hygiene recording, NOT a live-drop fix:
none of these 14 properties currently appear as UNACCOUNTED in any fixture (no
draft in the current corpus uses them), so this migration does not change the
UNACCOUNTED baseline (still 14, all pre-existing-baselined) and does not alter
any live clone output.

Explicitly NOT excluded here (has a genuine consuming attr, confirmed
2026-07-22): `z-index` -- `sgs/decorative-image` declares a `zIndex` attr
(block_attributes: attr_name='zIndex', block_slug='sgs/decorative-image').
z-index is a SEED case, handled separately (unit A2), not an EXCLUDE case.

Also explicitly NOT touched here (per the 2026-07-04 migration's own
docstring, still true): `filter: blur()` sub-case and
`transition-delay`/`transition-duration`/`transition-timing-function`
longhand sub-cases -- those ARE seeded/handled via their own
property_suffixes rows and must not be excluded by this migration. Verified
2026-07-22: no bare 'filter' or bare 'transition' property_suffixes row
exists that would be double-excluded by this file; the 3 duplicate entries
above (transform/filter/transition) are already present from 2026-07-04 and
this migration is a no-op against them.

## Idempotency

Every INSERT is css_property-existence-gated (UNIQUE(css_property)
constraint): re-running on a DB that already has any of these rows is a
no-op for that row. R-31-1 (DB-first, no hardcoded dicts). R-31-9
(universal -- decided per-property from DB evidence, no per-block
carve-out).

Applies to BOTH DB copies (.claude and .agents).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

_DECIDED_BY = "Bean/Spec31-A1"
_DATE = "2026-07-22"
_REASON = (
    "no block declares a consuming attribute — CSS passthrough only (D2); "
    "verified 2026-07-22 Spec 31 unit A1"
)

_PROPERTIES: list[str] = [
    "transform",
    "filter",
    "transition",
    "overflow-x",
    "overflow-y",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "inset",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
]

# (css_property, reason, decided_by, date)
SEED_ROWS: list[tuple[str, str, str, str]] = [
    (prop, _REASON, _DECIDED_BY, _DATE) for prop in _PROPERTIES
]


def migrate_db(db_path: Path) -> tuple[int, int]:
    """Run migration against one DB. Returns (inserted, skipped)."""
    if not db_path.exists():
        print(f"SKIP (not found): {db_path}")
        return 0, 0

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # Schema is created by migrations/2026-06-18-create-excluded-properties.py;
    # idempotent guard here in case this migration runs first on a fresh DB.
    cur.execute(
        "CREATE TABLE IF NOT EXISTS excluded_properties ("
        "  css_property TEXT NOT NULL,"
        "  reason       TEXT NOT NULL,"
        "  decided_by   TEXT NOT NULL,"
        "  date         TEXT NOT NULL,"
        "  UNIQUE(css_property)"
        ")"
    )

    inserted = 0
    skipped = 0
    for css_property, reason, decided_by, date in SEED_ROWS:
        exists = cur.execute(
            "SELECT 1 FROM excluded_properties WHERE css_property=?", (css_property,)
        ).fetchone()
        if exists:
            skipped += 1
            continue
        cur.execute(
            "INSERT INTO excluded_properties (css_property, reason, decided_by, date) "
            "VALUES (?, ?, ?, ?)",
            (css_property, reason, decided_by, date),
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

"""Migration: seed property_suffixes rows so CONTENT-band padding longhands route
to sgs/container's REAL `contentBandPadding{Side}*` attrs — EXECUTION Step 12
(Phase 5), the parked Step-7 item (test_fold_band_cascade.py's own docstring:
"the STOP-24 property_suffixes seed is EXECUTION Step 12 work").

## The bug this closes

sgs/container declares `contentBandPaddingTop`/`Right`/`Bottom`/`Left` (+ Tablet/
Mobile variants) — verified against the live DB 2026-07-04:
    python -c "from converter.db import db_lookup; \
        print([a for a in db_lookup.block_attrs('sgs/container') if 'adding' in a])"
    -> [..., 'contentBandPaddingTop', 'contentBandPaddingRight',
        'contentBandPaddingBottom', 'contentBandPaddingLeft', ...Tablet, ...Mobile]

But the EXISTING property_suffixes rows for padding-top/-right/-bottom/-left are
suffix='PaddingTop'/'PaddingRight'/'PaddingBottom'/'PaddingLeft' (role=layout,
seeded pre-D250). For the CONTENT layer, db_lookup.attr_for_layer_property derives
the candidate attr as `prefix + suffix[0].upper() + suffix[1:]` = 'content' +
'PaddingTop' = 'contentPaddingTop' — which sgs/container does NOT declare (its
naming diverges to 'contentBandPaddingTop'). So every CONTENT-band padding
declaration on sgs/container gaps NO_DESTINATION today, even though a real
destination attr exists under a different name — a pure DB-naming-routing gap,
not a resolver bug (content_band.py already tries CONTENT before falling back to
GRID/OUTER; see its `_layer_priorities`).

## The fix

Add a SECOND suffix row per side: suffix='BandPaddingTop' (etc.), css_property=
'padding-top' (etc.). For the CONTENT layer this derives candidate = 'content' +
'BandPaddingTop' = 'contentBandPaddingTop' — an EXACT match on sgs/container.
db_lookup.attr_for_layer_property collects ALL suffix rows for a css_property and
raises AmbiguousLayerAttrError (MF-4) only if ≥2 candidates BOTH exist as real
attrs on the block; since sgs/container has no 'contentPaddingTop' attr, only the
new 'BandPaddingTop' candidate matches — no ambiguity introduced. A future block
that legitimately uses BOTH naming schemes would correctly raise MF-4 (a genuine
design conflict to resolve at that point, not paper over here).

## Suffix conventions (mirrored from D250)

- `role='layout'` — same role as the existing Padding{Side} rows (box-layout
  property family).
- `kind_override=None` — length values, same as Padding{Side}.
- `is_token_matched=0`, `token_source=None` — no theme.json token source.

## Reseed-survival + idempotency

Same STOP-24 guarantee as every other property_suffixes migration: sgs-update-v2.py
does not truncate/re-derive this table; migrations are the only write path. Every
INSERT is suffix-existence-gated (idempotent re-runs). R-31-1 (DB-first).

Applies to BOTH DB copies (.claude and .agents).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

# (suffix, role, css_property, is_token_matched, token_source, notes)
INSERT_ROWS: list[tuple[str, str, str, int, object, str]] = [
    ("BandPaddingTop", "layout", "padding-top", 0, None,
     "CSS padding-top -> CONTENT-layer 'contentBandPaddingTop' (sgs/container's "
     "actual band-padding attr name, distinct from the generic contentPaddingTop "
     "candidate that the pre-existing 'PaddingTop' suffix derives); EXECUTION Step 12"),
    ("BandPaddingRight", "layout", "padding-right", 0, None,
     "CSS padding-right -> CONTENT-layer 'contentBandPaddingRight'; EXECUTION Step 12"),
    ("BandPaddingBottom", "layout", "padding-bottom", 0, None,
     "CSS padding-bottom -> CONTENT-layer 'contentBandPaddingBottom'; EXECUTION Step 12"),
    ("BandPaddingLeft", "layout", "padding-left", 0, None,
     "CSS padding-left -> CONTENT-layer 'contentBandPaddingLeft'; EXECUTION Step 12"),
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

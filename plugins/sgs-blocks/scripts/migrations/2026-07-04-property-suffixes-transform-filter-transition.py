"""Migration: decide transform / filter / transition (bare shorthand properties)
— EXECUTION Step 12 (Phase 5), Spec 31 §5.

Decision (per-property, verified against the live DB 2026-07-04):

  transform   — no block declares a 'transform' attr (checked: block_attributes
                WHERE attr_name='transform' → 0 rows). EXCLUDE from LIFT.
  filter      — no block declares a 'filter' attr (0 rows). EXCLUDE from LIFT.
  transition  — no block declares a bare 'transition' attr (0 rows). Note: MANY
                blocks declare 'transitionDuration' (a LONGHAND destination for
                CSS `transition-duration`, already served by the existing
                property_suffixes 'Duration'/motion-role row — a SEPARATE,
                pre-existing routing concern, out of this migration's scope: the
                'Duration' suffix's OUTER-layer candidate name is 'duration', which
                does not match any block's 'transitionDuration' attr either, so
                that pairing is a pre-existing gap unrelated to the bare
                `transition` shorthand decided here). The bare `transition`
                shorthand itself (e.g. `transition: all 0.3s ease`) has no block
                destination — EXCLUDE from LIFT.

These 3 rows go into `excluded_properties` (F4, Spec 31 §12.2.4) — the audited,
reasoned "excluded-from-LIFT, still cloned via passthrough" channel (dispatch_table.
resolver_id routes any property in this table to resolver_id='excluded', which
returns GAP(origin=EXCLUDED) — a tracked, non-silent sink, NOT a drop). This is
DIFFERENT from "excluded-from-CLONE" (see the 2026-06-18 migration's own docstring
for that distinction) — the raw CSS for these 3 properties still clones via the
element's passthrough `<style>` block; only the CUSTOM-ATTR lift is skipped because
no block has anywhere to put the value.

Per the 2026-06-18 migration's own instruction ("Any FUTURE genuine clone-exclusion
must be added by a NEW dated migration with a reason") — this IS that migration.

## Idempotency

Every INSERT is css_property-existence-gated (UNIQUE(css_property) constraint):
re-running on a DB that already has the row is a no-op. R-31-1 (DB-first, no
hardcoded dicts). R-31-9 (universal — decided per-property from DB evidence, no
per-block carve-out).

Applies to BOTH DB copies (.claude and .agents).
"""
from __future__ import annotations
import sqlite3
from pathlib import Path

DBS = [
    Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
    Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
]

_DECIDED_BY = "EXECUTION Step 12 (Phase 5, CSS resolver completeness)"
_DATE = "2026-07-04"

# (css_property, reason, decided_by, date)
SEED_ROWS: list[tuple[str, str, str, str]] = [
    ("transform", "no block declares a 'transform' attr (verified: block_attributes "
     "WHERE attr_name='transform' -> 0 rows, 2026-07-04); excluded from LIFT, still "
     "cloned via passthrough <style>.", _DECIDED_BY, _DATE),
    ("filter", "no block declares a 'filter' attr (verified: 0 rows, 2026-07-04); "
     "excluded from LIFT, still cloned via passthrough <style>.", _DECIDED_BY, _DATE),
    ("transition", "no block declares a bare 'transition' attr (verified: 0 rows, "
     "2026-07-04); the widespread 'transitionDuration' attr is a longhand-property "
     "destination unrelated to this shorthand (see module docstring); excluded from "
     "LIFT, still cloned via passthrough <style>.", _DECIDED_BY, _DATE),
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

"""check_css_property_reseed.py — Check #8: css_property/css_layer reseed-survival.

Spec ref: Spec 31 FR-31-5.2/5.3 (D281) — the declarative CSS-property column.

The `block_attributes.css_property` / `css_layer` columns are DERIVED — /sgs-update
rebuilds block_attributes every run, then `_apply_overrides` re-writes the corrections
from ATTR_CLASSIFICATION_OVERRIDES. That override map is the ONLY reseed-durable channel
for these columns (STOP-24): a bare SQLite UPDATE is wiped on the next reseed.

This is the "reseed diff test for the corrected subset" (council must-fix #5). It proves
three invariants against the LIVE seeded DB — cheap, no /sgs-update run needed (if the
seeder is idempotent, the DB always equals the override declarations):

  A. EVERY css_property override in ATTR_CLASSIFICATION_OVERRIDES is reflected in the DB
     row (slug, attr) with matching css_property + css_layer. A mismatch means the
     correction did NOT survive the reseed (or a bare UPDATE was used) — fail.
  B. NO DB row carries a non-NULL css_property that is NOT in the override map — proves
     no rogue seeding and that the ~650 undeclared attrs stay NULL (parity-neutral by
     construction: they never enter the column-first path).
  C. NO (block, css_property, css_layer) resolves to >=2 attrs — the runtime
     AmbiguousLayerAttrError guard, caught at gate time before it can fire mid-clone.

Empty result before any css_property is seeded (columns absent → nothing to check) and
after (the seeded subset matches). Wired into db-consistency/run.py (STOP-6).
"""
from __future__ import annotations

import importlib.util
import sqlite3
import sys
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, css_property_reseed_key

# Load ATTR_CLASSIFICATION_OVERRIDES from sgs-update-v2.py (the reseed-durable source of
# truth). Same importlib pattern as resolver_bridge — import the REAL constant so this
# check can never drift from the seeder (R-22-1). FAIL LOUD if unavailable.
_SEEDER_PATH = Path(__file__).resolve().parents[1] / "sgs-update-v2.py"

if not _SEEDER_PATH.exists():
    raise ImportError(
        f"[check_css_property_reseed] Cannot find sgs-update-v2.py at {_SEEDER_PATH}.\n"
        "This check imports ATTR_CLASSIFICATION_OVERRIDES to verify the DB against the "
        "reseed-durable source (R-22-1)."
    )

_spec = importlib.util.spec_from_file_location("sgs_update_v2_seeder", str(_SEEDER_PATH))
_seeder_mod: Any = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
try:
    _spec.loader.exec_module(_seeder_mod)  # type: ignore[union-attr]
except Exception as exc:  # noqa: BLE001
    raise ImportError(
        f"[check_css_property_reseed] Failed to load sgs-update-v2.py: {exc}"
    ) from exc

if not hasattr(_seeder_mod, "ATTR_CLASSIFICATION_OVERRIDES"):
    raise ImportError(
        "[check_css_property_reseed] sgs-update-v2.py has no ATTR_CLASSIFICATION_OVERRIDES "
        "symbol — cannot verify the css_property seeding (R-22-1)."
    )

ATTR_CLASSIFICATION_OVERRIDES: dict = _seeder_mod.ATTR_CLASSIFICATION_OVERRIDES


def _expected_declarations() -> dict[tuple[str, str], tuple[str, "str | None"]]:
    """Return {(block_slug, attr): (css_property, css_layer)} for every override that
    declares a css_property. css_layer defaults to None (self/OUTER) when unset."""
    out: dict[tuple[str, str], tuple[str, str | None]] = {}
    for (slug, attr), fields in ATTR_CLASSIFICATION_OVERRIDES.items():
        if not isinstance(fields, dict) or "css_property" not in fields:
            continue
        out[(slug, attr)] = (fields.get("css_property"), fields.get("css_layer"))
    return out


def _columns_present(conn: sqlite3.Connection) -> bool:
    cols = {r[1] for r in conn.execute("PRAGMA table_info(block_attributes)").fetchall()}
    return "css_property" in cols and "css_layer" in cols


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #8 against the live DB connection."""
    violations: list[Violation] = []
    expected = _expected_declarations()

    if not _columns_present(conn):
        # Columns not yet materialised (no css_property override reseeded). Nothing to
        # check — but if the override map DECLARES corrections, that IS a violation
        # (the seeder never ran / the column was dropped).
        if expected:
            for (slug, attr) in sorted(expected):
                violations.append(Violation(
                    check="css_property_reseed",
                    block=slug,
                    detail=(
                        f"{slug}.{attr}: ATTR_CLASSIFICATION_OVERRIDES declares css_property "
                        f"but block_attributes has no css_property column — the seeder has "
                        f"not applied the corrections."
                    ),
                    fix="Run python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1 to seed the css_property/css_layer columns.",
                    key=css_property_reseed_key(slug, attr, "no-column"),
                ))
        return violations

    # A. every declared override is reflected in the DB.
    for (slug, attr), (exp_prop, exp_layer) in sorted(expected.items()):
        row = conn.execute(
            "SELECT css_property, css_layer FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (slug, attr),
        ).fetchone()
        if row is None:
            violations.append(Violation(
                check="css_property_reseed",
                block=slug,
                detail=f"{slug}.{attr}: declared in ATTR_CLASSIFICATION_OVERRIDES but no such block_attributes row.",
                fix=f"Fix the (slug, attr) key for {slug}.{attr} in ATTR_CLASSIFICATION_OVERRIDES, or add the attr to the block.",
                key=css_property_reseed_key(slug, attr, "missing-row"),
            ))
            continue
        db_prop, db_layer = row
        if db_prop != exp_prop or db_layer != exp_layer:
            violations.append(Violation(
                check="css_property_reseed",
                block=slug,
                detail=(
                    f"{slug}.{attr}: css_property/css_layer did NOT survive reseed — "
                    f"DB has ({db_prop!r}, {db_layer!r}), override declares ({exp_prop!r}, {exp_layer!r}). "
                    f"A bare SQLite UPDATE is wiped every reseed (STOP-24)."
                ),
                fix="Declare the correction in ATTR_CLASSIFICATION_OVERRIDES + run sgs-update-v2.py --stage 1 (never a bare UPDATE).",
                key=css_property_reseed_key(slug, attr, "mismatch"),
            ))

    # B. no rogue non-NULL css_property outside the override map.
    db_declared = conn.execute(
        "SELECT block_slug, attr_name, css_property, css_layer FROM block_attributes "
        "WHERE css_property IS NOT NULL"
    ).fetchall()
    for slug, attr, db_prop, _db_layer in db_declared:
        if (slug, attr) not in expected:
            violations.append(Violation(
                check="css_property_reseed",
                block=slug,
                detail=(
                    f"{slug}.{attr}: has css_property={db_prop!r} in the DB but is NOT declared in "
                    f"ATTR_CLASSIFICATION_OVERRIDES — a rogue seed (would vanish on the next reseed)."
                ),
                fix=f"Either declare {slug}.{attr} in ATTR_CLASSIFICATION_OVERRIDES, or remove the stray css_property.",
                key=css_property_reseed_key(slug, attr, "rogue"),
            ))

    # C. no (block, css_property, css_layer) resolves to >=2 attrs (runtime-ambiguity guard).
    ambiguous = conn.execute(
        "SELECT block_slug, css_property, IFNULL(css_layer, ''), COUNT(*), GROUP_CONCAT(attr_name) "
        "FROM block_attributes WHERE css_property IS NOT NULL "
        "GROUP BY block_slug, css_property, IFNULL(css_layer, '') HAVING COUNT(*) > 1"
    ).fetchall()
    for slug, prop, layer, n, attrs in ambiguous:
        violations.append(Violation(
            check="css_property_reseed",
            block=slug,
            detail=(
                f"{slug}: ({prop}, layer={layer or 'NULL'}) declares {n} attrs [{attrs}] — the "
                f"column-first resolver raises AmbiguousLayerAttrError on this at clone time."
            ),
            fix=f"Only one attr may own ({slug}, {prop}, {layer or 'NULL'}) — remove the duplicate css_property declaration.",
            key=css_property_reseed_key(slug, f"{prop}:{layer}", "ambiguous"),
        ))

    return violations

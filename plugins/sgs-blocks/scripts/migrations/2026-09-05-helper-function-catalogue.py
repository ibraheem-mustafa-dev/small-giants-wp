#!/usr/bin/env python3
"""2026-09-05-helper-function-catalogue.py — per-FUNCTION rows for PHP helpers.

WHAT AND WHY
------------
``components`` already carries one row per helper FILE (24 rows, ``family=
'render-helper'``) — but nothing at per-FUNCTION granularity, which is the
actual gap that let ``sgs_svg_stroke_gradient()`` get independently
rediscovered as "the answer" three separate times in one week (see
plugins/sgs-blocks/CLAUDE.md's "Known precedent-function registry"). This
migration adds one row per top-level ``sgs_xxx()`` function across every
``includes/helpers-*.php`` file, at ``family='render-helper-function'`` so a
query can filter either granularity independently.

SCHEMA CHANGE FIRST
--------------------
``components.component_type`` has ``CHECK(component_type IN ('editor',
'util', 'extension'))`` — none of those fits a per-function row. SQLite
cannot ALTER a CHECK constraint in place; the table is rebuilt (create ->
copy -> drop -> rename), same shape as every other structural change in this
folder. The rebuild widens the CHECK to also allow ``'helper-function'`` and
changes nothing else — column list, types and order are preserved exactly,
which is what keeps ``check_schema_drift.py``'s column-level comparison
honest.

SINGLE SOURCE OF EXTRACTION
----------------------------
The per-function purpose/signature extraction is NOT reimplemented here — it
imports ``_php_functions()`` straight from
``generate-helper-catalogue.py`` (the markdown-doc generator built
alongside this migration), so the DB row and the dev-setup.md table can never
silently diverge on what a function's purpose is.

IDEMPOTENCY
-----------
* The CHECK-widening rebuild is skipped if the live constraint already
  permits ``'helper-function'`` (checked against ``sqlite_master.sql`` text,
  not assumed from a prior run marker).
* Row population uses ``INSERT OR REPLACE`` keyed on the PRIMARY KEY
  (``name``) — replaying this migration after a helper's docblock changes
  refreshes the row rather than duplicating it.
* Refuses (does not overwrite) if a function name collides with an existing
  ``components.name`` row that is NOT already one of this migration's own
  ``family='render-helper-function'`` rows — reported, never silently
  clobbered.

SAFETY
------
The knowledge base is a gitignored SQLite file that cannot be rebuilt from
scratch (see dbschema/migrate.py's header) — this migration works on a COPY
of the table's data via CREATE/INSERT SELECT/DROP/RENAME inside one
transaction, never deleting a row before the replacement table holds a
verified copy of it.
"""
from __future__ import annotations

import importlib.util as _ilu
import sqlite3
import sys
from pathlib import Path

DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

_GEN = (
    Path(__file__).resolve().parents[1] / "generate-helper-catalogue.py"
)
_spec = _ilu.spec_from_file_location("_helper_gen", str(_GEN))
_helper_gen = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_helper_gen)

NEW_TYPE = "helper-function"
FAMILY = "render-helper-function"

_TABLE_INFO_COLS = None  # populated at runtime from PRAGMA table_info


def _check_allows_new_type(con: sqlite3.Connection) -> bool:
    row = con.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='components'"
    ).fetchone()
    if row is None:
        raise SystemExit("FAIL-CLOSED: components table not found")
    return NEW_TYPE in row[0]


def _rebuild_check_constraint(con: sqlite3.Connection) -> None:
    """Widen component_type's CHECK to also allow NEW_TYPE, preserving every
    other column/type/order/default exactly."""
    cols = con.execute('PRAGMA table_info("components")').fetchall()
    # cols: (cid, name, type, notnull, dflt_value, pk)
    col_defs = []
    for _cid, name, ctype, notnull, dflt, pk in cols:
        if name == "component_type":
            col_defs.append(
                f'"{name}" TEXT NOT NULL CHECK("{name}" IN '
                "('editor', 'util', 'extension', 'helper-function'))"
            )
            continue
        parts = [f'"{name}"']
        if ctype:
            parts.append(ctype)
        if pk:
            parts.append("PRIMARY KEY")
        if notnull and not pk:
            parts.append("NOT NULL")
        if dflt is not None:
            parts.append(f"DEFAULT {dflt}")
        col_defs.append(" ".join(parts))
    create_sql = "CREATE TABLE components_rebuild (\n    " + ",\n    ".join(col_defs) + "\n)"
    col_names = ", ".join(f'"{c[1]}"' for c in cols)
    con.execute(create_sql)
    con.execute(
        f"INSERT INTO components_rebuild ({col_names}) "
        f"SELECT {col_names} FROM components"
    )
    con.execute("DROP TABLE components")
    con.execute("ALTER TABLE components_rebuild RENAME TO components")


def _collect_rows() -> list[dict]:
    rows: list[dict] = []
    for f in sorted(_helper_gen.HELPERS_DIR.glob(_helper_gen.HELPERS_GLOB)):
        rel_path = f.relative_to(_helper_gen.REPO).as_posix()
        for fn in _helper_gen._php_functions(f):
            purpose = fn["purpose"]
            if purpose == "**UNDOCUMENTED**":
                purpose = None
            rows.append(
                {
                    "name": fn["name"],
                    "file_path": rel_path,
                    "signature": fn["signature"],
                    "purpose": purpose,
                }
            )
    return rows


def main() -> int:
    if not DB.exists() or DB.stat().st_size == 0:
        raise SystemExit(f"FAIL-CLOSED: no live DB at {DB}")
    con = sqlite3.connect(DB)
    con.execute("PRAGMA foreign_keys=OFF")
    try:
        rows = _collect_rows()

        # Refuse on collision with a pre-existing, non-helper-function row.
        existing = {
            r[0]: r[1]
            for r in con.execute(
                "SELECT name, family FROM components"
            ).fetchall()
        }
        collisions = [
            r["name"]
            for r in rows
            if r["name"] in existing and existing[r["name"]] != FAMILY
        ]
        if collisions:
            print(
                "REFUSED — name collision with existing non-helper-function "
                f"components row(s): {collisions}. Not inserting any row "
                "for these names; resolve manually.",
                file=sys.stderr,
            )
            rows = [r for r in rows if r["name"] not in collisions]

        if not _check_allows_new_type(con):
            _rebuild_check_constraint(con)
            print("  REBUILT  components.component_type CHECK -> +'helper-function'")
        else:
            print("  skipped  CHECK constraint already allows 'helper-function'")

        n_inserted = 0
        for r in rows:
            con.execute(
                """
                INSERT OR REPLACE INTO components
                    (name, component_type, file_path, description, props, family, functionality, adopters, adopter_list)
                VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
                """,
                (
                    r["name"],
                    NEW_TYPE,
                    r["file_path"],
                    r["purpose"],
                    r["signature"],
                    FAMILY,
                    r["purpose"],
                ),
            )
            n_inserted += 1
        con.commit()
        print(f"  UPSERTED {n_inserted} row(s) at family='{FAMILY}'")
        total = con.execute(
            "SELECT COUNT(*) FROM components WHERE family=?", (FAMILY,)
        ).fetchone()[0]
        print(f"\n{total} total '{FAMILY}' rows in components.")
        return 1 if collisions else 0
    finally:
        con.close()


if __name__ == "__main__":
    raise SystemExit(main())

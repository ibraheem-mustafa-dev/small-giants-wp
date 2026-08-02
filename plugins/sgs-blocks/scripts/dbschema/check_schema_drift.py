#!/usr/bin/env python3
"""Detect drift between the committed ``schema.sql`` and the live database's DDL.

WHY THIS EXISTS
---------------
``dbschema/schema.sql`` is a point-in-time capture of the live DB's DDL,
generated 2026-08-02. It is what makes the database rebuildable: a fresh
``sqlite3 new.db < schema.sql`` is supposed to reproduce every table, column
and index the live DB has. If someone adds a table or column via a migration
(or by hand, via a stray ``ALTER TABLE``) and never regenerates ``schema.sql``,
the next rebuild silently produces a DB that is missing that structure --
and nothing notices, because the rebuild "succeeds" and nobody diffs DDL by
eye. That silent-rot class is the exact disease this whole schema-tooling
phase (sandbox.py / migrate.py / this file) exists to end.

WHAT THIS CHECKS -- SCHEMA ONLY, NEVER ROW COUNTS
--------------------------------------------------
Another agent is actively writing to the live DB while this script exists.
Row counts change under it every second; comparing them would make this gate
flap constantly on data that is working exactly as intended. So this script
compares structure only:

  * table names (excluding SQLite-internal objects)
  * per-table column name + declared type, IN ORDER (``PRAGMA table_info``)
  * index names (excluding SQLite-internal auto-indexes)

It never touches row counts and never opens the live DB in anything but
read-only mode (``file:...?mode=ro``).

THE MECHANISM
-------------
``schema.sql`` cannot be diffed against live DDL directly as text -- SQLite
normalises whitespace/formatting when it stores a table's DDL in
``sqlite_master.sql``, so a byte-diff would flag cosmetic differences that
are not drift. Instead: replay ``schema.sql`` into a throwaway on-disk SQLite
file (never touching HOME, never touching the live path -- this needs no
``sandbox.py`` redirect because it writes to an explicit throwaway path, not
to whatever ``Path.home()`` resolves to) and then compare the two databases'
own ``sqlite_master``/``PRAGMA table_info`` output against each other. That
way both sides are read through the identical SQLite introspection API, so
only real structural differences survive.

THE EXCLUSION
-------------
SQLite-internal objects (``sqlite_sequence``, ``sqlite_autoindex_*``) are
excluded on both sides via ``name NOT LIKE 'sqlite@_%' ESCAPE '@'`` -- the
same escape idiom used in ``rebuild_compare.py`` and ``sandbox.py``.
``schema.sql`` deliberately omits them because SQLite refuses an explicit
``CREATE`` for them ("object name reserved for internal use"), so comparing
them would manufacture false drift on every single run.
"""

from __future__ import annotations

import argparse
import datetime
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEMA_SQL = HERE / "schema.sql"
NOTINT = "name NOT LIKE 'sqlite@_%' ESCAPE '@'"


class DriftError(RuntimeError):
    pass


# --------------------------------------------------------------------------
# introspection
# --------------------------------------------------------------------------

def build_from_schema(schema_sql: Path, target: Path) -> None:
    """Replay schema.sql into a fresh on-disk SQLite file at ``target``."""
    if not schema_sql.exists():
        raise DriftError(f"schema file not found: {schema_sql}")
    if target.exists():
        target.unlink()
    con = sqlite3.connect(str(target))
    try:
        con.executescript(schema_sql.read_text(encoding="utf-8"))
        con.commit()
    finally:
        con.close()


def table_names(con: sqlite3.Connection) -> list[str]:
    return [
        r[0]
        for r in con.execute(
            f"SELECT name FROM sqlite_master WHERE type='table' AND {NOTINT} "
            "ORDER BY name"
        )
    ]


def index_names(con: sqlite3.Connection) -> list[str]:
    return [
        r[0]
        for r in con.execute(
            f"SELECT name FROM sqlite_master WHERE type='index' AND {NOTINT} "
            "ORDER BY name"
        )
    ]


def columns(con: sqlite3.Connection, table: str) -> list[tuple[str, str]]:
    """Ordered (name, declared type) pairs for a table, via PRAGMA table_info."""
    return [
        (row[1], (row[2] or "").upper())
        for row in con.execute(f'PRAGMA table_info("{table}")')
    ]


# --------------------------------------------------------------------------
# comparison
# --------------------------------------------------------------------------

def compare(schema_con: sqlite3.Connection, live_con: sqlite3.Connection) -> list[str]:
    """Return a list of human-readable drift findings. Empty = no drift."""
    findings: list[str] = []

    schema_tables = set(table_names(schema_con))
    live_tables = set(table_names(live_con))

    live_not_in_schema = sorted(live_tables - schema_tables)
    schema_not_in_live = sorted(schema_tables - live_tables)
    for t in live_not_in_schema:
        findings.append(f"TABLE  live-has-not-in-schema: `{t}`")
    for t in schema_not_in_live:
        findings.append(f"TABLE  schema-has-not-in-live: `{t}`")

    for table in sorted(schema_tables & live_tables):
        schema_cols = columns(schema_con, table)
        live_cols = columns(live_con, table)
        if schema_cols == live_cols:
            continue

        schema_names = {c[0] for c in schema_cols}
        live_names = {c[0] for c in live_cols}
        col_live_not_schema = sorted(live_names - schema_names)
        col_schema_not_live = sorted(schema_names - live_names)
        for c in col_live_not_schema:
            findings.append(f"COLUMN `{table}`.`{c}`  live-has-not-in-schema")
        for c in col_schema_not_live:
            findings.append(f"COLUMN `{table}`.`{c}`  schema-has-not-in-live")

        # Same column names present on both sides but type or order differs.
        common = schema_names & live_names
        if common and (col_live_not_schema or col_schema_not_live) is False:
            pass  # unreachable guard -- kept for clarity of intent below
        schema_by_name = dict(schema_cols)
        live_by_name = dict(live_cols)
        for c in sorted(common):
            if schema_by_name[c] != live_by_name[c]:
                findings.append(
                    f"COLUMN `{table}`.`{c}`  type mismatch: "
                    f"schema={schema_by_name[c]!r} live={live_by_name[c]!r}"
                )
        schema_order = [c for c, _ in schema_cols if c in common]
        live_order = [c for c, _ in live_cols if c in common]
        if schema_order != live_order:
            findings.append(
                f"COLUMN `{table}`  column order differs: "
                f"schema={schema_order} live={live_order}"
            )

    schema_idx = set(index_names(schema_con))
    live_idx = set(index_names(live_con))
    for i in sorted(live_idx - schema_idx):
        findings.append(f"INDEX  live-has-not-in-schema: `{i}`")
    for i in sorted(schema_idx - live_idx):
        findings.append(f"INDEX  schema-has-not-in-live: `{i}`")

    return findings


# --------------------------------------------------------------------------
# commands
# --------------------------------------------------------------------------

def cmd_check(schema_sql: Path, live_db: Path) -> int:
    if not live_db.exists():
        print(
            f"SKIPPED — DB not found: {live_db}\n"
            "  This is expected on a machine without the local dev DB (it is "
            "unversioned by design). The build proceeds; run "
            "`python plugins/sgs-blocks/scripts/sgs-update-v2.py` to (re)create "
            "it if you need this check to run."
        )
        return 0

    tmp = Path(tempfile.mkdtemp(prefix="sgs-schema-drift-")) / "from-schema.db"
    try:
        build_from_schema(schema_sql, tmp)
        schema_con = sqlite3.connect(str(tmp))
        # Read-only URI connection -- this script must never write to the live DB.
        live_con = sqlite3.connect(f"file:{live_db}?mode=ro", uri=True)
        try:
            findings = compare(schema_con, live_con)
        finally:
            schema_con.close()
            live_con.close()
    finally:
        shutil.rmtree(tmp.parent, ignore_errors=True)

    if findings:
        print(f"SCHEMA DRIFT DETECTED ({len(findings)} finding(s)):")
        for f in findings:
            print(f"  - {f}")
        print(f"\nschema.sql : {schema_sql}")
        print(f"live db    : {live_db}")
        print(
            "\nRegenerate schema.sql from the live DDL once this drift is understood "
            "(do not chase this drift by hand-patching schema.sql without knowing why "
            "it happened)."
        )
        return 1

    print(f"CLEAN -- no schema drift ({schema_sql.name} vs {live_db.name}).")
    return 0


# --------------------------------------------------------------------------
# self-test -- prove the gate can FAIL
# --------------------------------------------------------------------------

def _self_test() -> int:
    """A gate that has never been shown to fail is decoration. Prove this one fails."""
    failures: list[str] = []
    tmp = Path(tempfile.mkdtemp(prefix="sgs-schema-drift-selftest-"))

    # Build the "live" side straight from the real committed schema.sql, then
    # deliberately mutate it, so the self-test exercises the real schema shape
    # rather than a toy fixture.
    baseline = tmp / "baseline.db"
    build_from_schema(SCHEMA_SQL, baseline)

    def run_check(live_path: Path) -> tuple[int, list[str]]:
        schema_tmp = Path(tempfile.mkdtemp(prefix="sgs-schema-drift-check-")) / "s.db"
        try:
            build_from_schema(SCHEMA_SQL, schema_tmp)
            schema_con = sqlite3.connect(str(schema_tmp))
            live_con = sqlite3.connect(f"file:{live_path}?mode=ro", uri=True)
            try:
                findings = compare(schema_con, live_con)
            finally:
                schema_con.close()
                live_con.close()
            return (1 if findings else 0), findings
        finally:
            shutil.rmtree(schema_tmp.parent, ignore_errors=True)

    # POSITIVE CONTROL: unmodified copy must compare clean.
    print("positive control -- an unmodified copy must compare clean:")
    clean_copy = tmp / "clean-copy.db"
    shutil.copy2(baseline, clean_copy)
    rc, findings = run_check(clean_copy)
    if rc != 0 or findings:
        failures.append(f"clean copy reported drift: {findings}")
        print(f"  FAIL  reported {len(findings)} finding(s) on an unmodified copy")
    else:
        print("  PASS  clean copy reports no drift")

    # NEGATIVE CONTROL 1: add a column to an existing table.
    print("\nnegative control -- an added COLUMN must be detected:")
    mutated_col = tmp / "mutated-column.db"
    shutil.copy2(baseline, mutated_col)
    con = sqlite3.connect(str(mutated_col))
    first_table = table_names(con)[0]
    con.execute(f'ALTER TABLE "{first_table}" ADD COLUMN sgs_selftest_probe TEXT')
    con.commit()
    con.close()
    rc, findings = run_check(mutated_col)
    hit = any(
        "sgs_selftest_probe" in f and "live-has-not-in-schema" in f for f in findings
    )
    if rc == 0 or not hit:
        failures.append("added column was NOT detected")
        print(f"  FAIL  rc={rc}, findings={findings}")
    else:
        print(f"  PASS  detected: {[f for f in findings if 'sgs_selftest_probe' in f][0]}")

    # NEGATIVE CONTROL 2: add a whole new table.
    print("\nnegative control -- an added TABLE must be detected:")
    mutated_tbl = tmp / "mutated-table.db"
    shutil.copy2(baseline, mutated_tbl)
    con = sqlite3.connect(str(mutated_tbl))
    con.execute("CREATE TABLE sgs_selftest_new_table (id INTEGER PRIMARY KEY)")
    con.commit()
    con.close()
    rc, findings = run_check(mutated_tbl)
    hit = any(
        "sgs_selftest_new_table" in f and "live-has-not-in-schema" in f for f in findings
    )
    if rc == 0 or not hit:
        failures.append("added table was NOT detected")
        print(f"  FAIL  rc={rc}, findings={findings}")
    else:
        print(f"  PASS  detected: {[f for f in findings if 'sgs_selftest_new_table' in f][0]}")

    # NEGATIVE CONTROL 3: both mutations together must both surface in one run.
    print("\nnegative control -- COLUMN + TABLE together must BOTH surface:")
    mutated_both = tmp / "mutated-both.db"
    shutil.copy2(baseline, mutated_both)
    con = sqlite3.connect(str(mutated_both))
    con.execute(f'ALTER TABLE "{first_table}" ADD COLUMN sgs_selftest_probe2 TEXT')
    con.execute("CREATE TABLE sgs_selftest_new_table2 (id INTEGER PRIMARY KEY)")
    con.commit()
    con.close()
    rc, findings = run_check(mutated_both)
    col_hit = any("sgs_selftest_probe2" in f for f in findings)
    tbl_hit = any("sgs_selftest_new_table2" in f for f in findings)
    if rc == 0 or not (col_hit and tbl_hit):
        failures.append("combined column+table mutation was not fully detected")
        print(f"  FAIL  col_hit={col_hit} tbl_hit={tbl_hit} findings={findings}")
    else:
        print("  PASS  both the added column and the added table were detected")

    shutil.rmtree(tmp, ignore_errors=True)

    print()
    if failures:
        print(f"SELF-TEST FAILED ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("SELF-TEST PASSED -- the gate was shown to FAIL, not merely to exist.")
    return 0


def cmd_regenerate(schema_sql: Path, live_db: Path) -> int:
    """Rewrite ``schema.sql`` verbatim from the live DB's ``sqlite_master``.

    THE GENERATOR LIVES HERE ON PURPOSE. ``schema.sql`` had been regenerated by
    hand three times (D464 capture, D469 `variations` drop, D472 the
    `_meta_schema_version` + `block_styles` drops) with no script — and a
    generator kept anywhere else would have to re-implement this module's
    exclusion rule for SQLite-internal objects. If the two implementations ever
    disagreed, the gate would report drift that is not real, forever, and the
    honest response to a permanently-red gate is to stop believing it. Writer
    and comparer therefore share one definition of what belongs in the file.

    This is deliberately a SEPARATE, explicit command — never something
    ``--check`` does on its own. A gate that silently repairs the thing it is
    measuring cannot fail, and a gate that cannot fail reads green forever.
    Regenerate only once you understand WHY the schema changed.
    """
    con = sqlite3.connect(f"file:{live_db}?mode=ro", uri=True)
    try:
        internals = [
            r[0] for r in con.execute(
                "SELECT name FROM sqlite_master WHERE name LIKE 'sqlite@_%' ESCAPE '@' "
                "ORDER BY rowid"
            )
        ]
        objects = con.execute(
            f"SELECT type, name, sql FROM sqlite_master "  # noqa: S608 — fixed fragment
            f"WHERE sql IS NOT NULL AND {NOTINT} "
            f"ORDER BY (type='index'), name"
        ).fetchall()
    finally:
        con.close()

    today = datetime.date.today().isoformat()
    lines = [
        "-- SGS framework knowledge-base schema",
        f"-- GENERATED VERBATIM from the live DB's sqlite_master. Regenerated {today}",
        "-- by: python dbschema/check_schema_drift.py --regenerate",
        "-- Do NOT hand-edit: byte-fidelity to the live schema is the entire point.",
        "-- Regenerate rather than patch, then run: python dbschema/check_schema_drift.py --check",
        "--",
        "-- EXCLUDED: SQLite-internal objects (sqlite_*) — SQLite creates these itself and",
        "-- REFUSES an explicit CREATE ('object name reserved for internal use').",
        f"-- Present in the live DB: {', '.join(internals)}",
        "",
    ]
    for obj_type, name, sql in objects:
        lines += [f"-- {obj_type}: {name}", f"{sql.rstrip().rstrip(';')};", ""]

    schema_sql.write_text("\n".join(lines), encoding="utf-8")
    tables = sum(1 for t, _, _ in objects if t == "table")
    indexes = sum(1 for t, _, _ in objects if t == "index")
    print(f"regenerated {schema_sql}")
    print(f"  {tables} table(s) + {indexes} index(es) captured from {live_db.name}")
    print("\nNow run --check to confirm the committed file matches live.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--schema", type=Path, default=SCHEMA_SQL,
                    help="committed schema.sql to compare against (default: sibling file)")
    ap.add_argument(
        "--live-db", type=Path,
        default=Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db",
        help="live database, opened READ-ONLY (default: the real knowledge base)",
    )
    ap.add_argument("--check", action="store_true",
                    help="compare schema.sql vs the live DB's DDL; exit 1 on drift")
    ap.add_argument("--self-test", action="store_true",
                    help="prove the comparison can detect real drift")
    ap.add_argument("--regenerate", action="store_true",
                    help="rewrite schema.sql verbatim from the live DDL (explicit, never automatic)")
    args = ap.parse_args()

    try:
        if args.self_test:
            return _self_test()
        if args.regenerate:
            return cmd_regenerate(args.schema, args.live_db)
        if args.check:
            return cmd_check(args.schema, args.live_db)
    except DriftError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

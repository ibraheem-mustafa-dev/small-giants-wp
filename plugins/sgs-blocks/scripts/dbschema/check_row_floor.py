#!/usr/bin/env python3
"""Detect DATA LOSS in the live database -- a row-count floor, growth-tolerant.

WHY THIS EXISTS
---------------
``dbschema/check_schema_drift.py`` gates SCHEMA only (table/column/index
structure). Nothing gates DATA. A seeded column can lose every row it held
while the schema stays byte-identical -- the column is still there, it is
just empty -- and the schema-drift gate has nothing to say about that. This
has happened FOUR times on this project, each one only noticed once a clone
came out wrong weeks later:

  * ``block_composition.has_inner_blocks`` went stale/empty after a block
    rebuild (D212, 2026-06-11)
  * the ``scalar-media`` role row went missing from ``roles``
  * ``block_attributes.emit_shape`` lost its populated rows
  * ``block_composition.container_kind`` sat unpopulated after a schema
    change (D152 lineage)

This script closes that gap: it compares CURRENT row/column-population
counts against a committed FLOOR and fails when a count DROPS below it.

THE CRITICAL CONSTRAINT -- TOLERATE GROWTH, ONLY FAIL ON DROPS
----------------------------------------------------------------
This database gains rows constantly and legitimately: clone runs append to
``attribute_gap_candidates``, ``/sgs-update`` adds new blocks and
attributes. A gate that fires on growth is a gate that gets switched off
within a week -- so this script NEVER fails when a count goes up or stays
the same. It fails ONLY when a count falls below the last committed floor.
(``check_schema_drift.py`` avoids this problem entirely by comparing
structure, which does not grow under normal use, and explicitly refuses to
look at row counts at all -- see that file's docstring. This script is the
row-count-aware sibling that fills the gap it deliberately leaves open.)

WHAT THIS CHECKS -- TWO GRANULARITIES
--------------------------------------
  * per-TABLE row count (``SELECT COUNT(*) FROM table``)
  * per-seeded-COLUMN populated count
    (``SELECT COUNT(*) FROM table WHERE col IS NOT NULL AND col != ''``)

All four historical losses were COLUMN-level drops on tables whose overall
ROW count never changed (the row was still there -- one of its columns went
blank). A table-row-count-only gate would have caught none of them. The
column set tracked is curated and lives in ``row-floor.json`` under
``"columns"`` so it stays reviewable, rather than being every column of
every table (most columns are free-text/descriptive and populate
opportunistically -- tracking those would just be noise).

THE FLOOR FILE
---------------
``row-floor.json`` (committed, sibling of this script) holds the last
deliberately-approved baseline: ``{"tables": {...}, "columns": {...}}``.
Baselining is NEVER automatic -- ``--check`` only ever reads the floor file,
it never writes it. The floor moves forward only via an explicit
``--update`` run, which is a deliberate human/agent act, not something a
CI gate does on your behalf (that would let a real data-loss regression
quietly become the new floor).

READ-ONLY BY DEFAULT
---------------------
``--check`` opens the live DB via ``file:...?mode=ro`` (uri=True) and never
writes to it. Only ``--update`` reads the live DB (still read-only) and
writes to the LOCAL ``row-floor.json`` file -- never to the database itself.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROW_FLOOR_JSON = HERE / "row-floor.json"
NOTINT = "name NOT LIKE 'sqlite@_%' ESCAPE '@'"
LIVE_DB_DEFAULT = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# --------------------------------------------------------------------------
# The curated seeded-column roster.
#
# Every entry here is a column that is known to hold structurally load-bearing
# data (not free-text commentary) -- populated columns the converter/pipeline
# actually reads. This is the reviewable list; extend it deliberately when a
# new column earns the same status, never by mechanically adding every
# nullable column in the schema.
#
# NOTE (verified 2026-08-02): ``block_composition.has_inner_blocks`` -- one of
# the four historical column-level data losses named when this gate was
# commissioned -- no longer exists as a column anywhere in the live schema or
# in the committed ``schema.sql``, so it is deliberately absent from the roster.
#
# WHY it is gone matters, because the obvious guess is wrong: it was NOT
# superseded by ``composition_role``/``container_kind``. FR-31-2.6 RETIRED it as
# a cached column on purpose -- ``block_attributes.emit_shape`` took over the
# content-dispatch signal, and the surviving block-level fact is now DERIVED
# FRESH at convert time by ``converter/services/has_inner.py`` (renamed
# ``delegates_content``) from save.js + render.php, precisely because a stale
# cached column mis-routes SILENTLY. In other words the D212 loss class was
# closed by deleting the cache, not by moving it.
#
# The lesson for this roster: a column-population floor is the right gate for a
# CACHED fact, and the wrong gate for a DERIVED one. Before adding an entry
# here, check the value is genuinely stored rather than computed --
# ``collect_counts`` skips any (table, column) pair absent from the live schema,
# so a retired column listed here would sit silently inert and read as covered.
SEEDED_COLUMNS: list[tuple[str, str]] = [
    ("block_composition", "container_kind"),
    ("block_composition", "wraps_block"),
    ("block_attributes", "emit_shape"),
    ("block_attributes", "css_property"),
    ("block_attributes", "box_family"),
    ("block_attributes", "canonical_slot"),
    ("block_attributes", "role"),
    ("blocks", "variant_attr"),
    ("blocks", "tier"),
    ("roles", "classification"),
]


# --------------------------------------------------------------------------
# VALUE-IDENTITY assertions — the blind spot a population floor cannot cover.
#
# A floor counts how many rows hold SOME value. It is structurally incapable of
# noticing a row whose value CHANGED from the right one to a wrong-but-plausible
# one, because the count does not move. That is not a hypothetical: this file's
# own docstring names "the `scalar-media` role row went missing" as a founding
# incident, and when that happened the roles flipped from 'scalar-media' to
# 'image-object' — three rows, non-null both before and after, count unchanged
# at 1000. The gate built to catch it read green straight through it. Measured
# 2026-08-02.
#
# So: named rows, named column, exact expected value. Small and deliberately
# hand-curated — this is for facts that are load-bearing, easily reclassified by
# an automated pass, and impossible to notice by eye.
#
# ⚠ WHY THIS LIVES HERE AND NOT IN A TEST. `converter/db/db_lookup.py` re-asserts
# these roles at MODULE LOAD, so anything that imports it silently repairs the
# drift before it can be observed — a pytest regression test for this is
# VACUOUS, which was proven by negative control rather than assumed. This script
# imports sqlite3 only, never db_lookup, so it observes the true stored state.
# Keep it that way: importing db_lookup here would blind this check completely.
VALUE_ASSERTIONS: list[dict] = [
    {
        "table": "block_attributes",
        "key": {"block_slug": "sgs/hero", "attr_name": "splitImage"},
        "column": "role",
        "expected": "scalar-media",
        "why": "Opens run_mechanism_b branch A, the only path that reads an image's "
               "--mobile/--desktop modifier. Lost once already: a hero clone put the "
               "MOBILE crop in the DESKTOP attribute. Source of truth: "
               "scripts/data/scalar-media-roles.json.",
    },
    {
        "table": "block_attributes",
        "key": {"block_slug": "sgs/hero", "attr_name": "splitImageMobile"},
        "column": "role",
        "expected": "scalar-media",
        "why": "Destination for the --mobile image. Same incident.",
    },
    {
        "table": "block_attributes",
        "key": {"block_slug": "sgs/testimonial-slider", "attr_name": "sideImage"},
        "column": "role",
        "expected": "scalar-media",
        "why": "Third member of D128's original roster; lost in the same event.",
    },
]


def check_value_assertions(con: sqlite3.Connection) -> list[str]:
    """Return a finding per VALUE_ASSERTIONS entry that does not hold.

    A missing table or column is reported as a finding rather than raising:
    that is schema drift, which the sibling gate owns, but staying silent here
    would let a dropped column read as a passing value check.
    """
    findings: list[str] = []
    for a in VALUE_ASSERTIONS:
        where = " AND ".join(f'"{k}" = ?' for k in a["key"])
        sql = f'SELECT "{a["column"]}" FROM "{a["table"]}" WHERE {where}'  # noqa: S608 — fixed identifiers
        try:
            row = con.execute(sql, list(a["key"].values())).fetchone()
        except sqlite3.OperationalError as exc:
            findings.append(
                f'VALUE  {a["table"]}.{a["column"]} for {a["key"]} — '
                f"could not be read ({exc}); treat as UNVERIFIED, not as passing."
            )
            continue
        keydesc = ", ".join(f"{k}={v!r}" for k, v in a["key"].items())
        if row is None:
            findings.append(
                f'VALUE  {a["table"]} row ({keydesc}) IS MISSING — '
                f'expected {a["column"]}={a["expected"]!r}. {a["why"]}'
            )
        elif row[0] != a["expected"]:
            findings.append(
                f'VALUE  {a["table"]}.{a["column"]} for ({keydesc}) is {row[0]!r}, '
                f'expected {a["expected"]!r}. {a["why"]}'
            )
    return findings


class RowFloorError(RuntimeError):
    pass


# --------------------------------------------------------------------------
# counting
# --------------------------------------------------------------------------

def table_names(con: sqlite3.Connection) -> list[str]:
    return [
        r[0]
        for r in con.execute(
            f"SELECT name FROM sqlite_master WHERE type='table' AND {NOTINT} "
            "ORDER BY name"
        )
    ]


def table_row_count(con: sqlite3.Connection, table: str) -> int:
    return con.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]


def column_populated_count(con: sqlite3.Connection, table: str, column: str) -> int:
    """Rows where ``column`` is neither NULL nor an empty string."""
    return con.execute(
        f'SELECT COUNT(*) FROM "{table}" '
        f'WHERE "{column}" IS NOT NULL AND "{column}" != \'\''
    ).fetchone()[0]


def collect_counts(
    con: sqlite3.Connection, seeded_columns: list[tuple[str, str]]
) -> dict[str, dict[str, int]]:
    """Return ``{"tables": {name: count}, "columns": {"table.col": count}}``.

    Tables/columns that do not exist in ``con`` are silently skipped -- that
    is schema drift, which ``check_schema_drift.py`` already gates; this
    script would otherwise raise ``sqlite3.OperationalError`` and obscure the
    real signal with a crash instead of a clean finding.
    """
    live_tables = set(table_names(con))

    tables = {t: table_row_count(con, t) for t in sorted(live_tables)}

    columns: dict[str, int] = {}
    for table, column in seeded_columns:
        if table not in live_tables:
            continue
        existing_cols = {row[1] for row in con.execute(f'PRAGMA table_info("{table}")')}
        if column not in existing_cols:
            continue
        columns[f"{table}.{column}"] = column_populated_count(con, table, column)

    return {"tables": tables, "columns": columns}


# --------------------------------------------------------------------------
# floor file I/O
# --------------------------------------------------------------------------

def load_floor(path: Path) -> dict[str, dict[str, int]]:
    if not path.exists():
        raise RowFloorError(
            f"no floor file at {path} -- run --update once to create the initial baseline"
        )
    data = json.loads(path.read_text(encoding="utf-8"))
    if "tables" not in data or "columns" not in data:
        raise RowFloorError(f"malformed floor file at {path} -- missing 'tables' or 'columns' key")
    return data


def write_floor(path: Path, counts: dict[str, dict[str, int]], generated_at: str) -> None:
    payload = {
        "generated_at": generated_at,
        "tables": dict(sorted(counts["tables"].items())),
        "columns": dict(sorted(counts["columns"].items())),
    }
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------
# comparison
# --------------------------------------------------------------------------

def compare_to_floor(
    floor: dict[str, dict[str, int]], live: dict[str, dict[str, int]]
) -> tuple[list[str], list[str]]:
    """Return ``(drops, growth_notes)``. ``drops`` non-empty = FAIL."""
    drops: list[str] = []
    growth: list[str] = []

    for kind, floor_key in (("TABLE", "tables"), ("COLUMN", "columns")):
        floor_counts = floor.get(floor_key, {})
        live_counts = live.get(floor_key, {})
        for name, floor_count in sorted(floor_counts.items()):
            if name not in live_counts:
                drops.append(
                    f"{kind}  `{name}`  MISSING from live (floor={floor_count}) -- "
                    "table or column no longer exists (schema drift, not a row-floor matter, "
                    "but a floor this script can no longer verify counts as met)"
                )
                continue
            live_count = live_counts[name]
            if live_count < floor_count:
                drops.append(
                    f"{kind}  `{name}`  DROPPED: floor={floor_count} live={live_count} "
                    f"(-{floor_count - live_count})"
                )
            elif live_count > floor_count:
                growth.append(f"{kind}  `{name}`  grew: floor={floor_count} live={live_count} (+{live_count - floor_count})")

    return drops, growth


# --------------------------------------------------------------------------
# commands
# --------------------------------------------------------------------------

def cmd_check(floor_path: Path, live_db: Path) -> int:
    if not live_db.exists():
        print(
            f"SKIPPED — DB not found: {live_db}\n"
            "  This is expected on a machine without the local dev DB (it is "
            "unversioned by design). The build proceeds; run "
            "`python plugins/sgs-blocks/scripts/sgs-update-v2.py` to (re)create "
            "it if you need this check to run."
        )
        return 0

    floor = load_floor(floor_path)

    live_con = sqlite3.connect(f"file:{live_db}?mode=ro", uri=True)
    try:
        live = collect_counts(live_con, SEEDED_COLUMNS)
        value_findings = check_value_assertions(live_con)
    finally:
        live_con.close()

    drops, growth = compare_to_floor(floor, live)

    # Value-identity findings are reported FIRST and fail independently of the
    # floor: a reclassified value never moves a count, so it would otherwise sail
    # through a clean floor comparison.
    if value_findings:
        print(f"VALUE-IDENTITY VIOLATION ({len(value_findings)} finding(s)):")
        for f in value_findings:
            print(f"  - {f}")
        print(f"\nlive db    : {live_db}")
        print(
            "\nA named row's value is not what it must be. This is NOT a row-count "
            "problem -- the row is present and populated, it simply holds the wrong "
            "value, which is why the floor comparison below reads clean. Re-assert it "
            "from its source of truth (for scalar-media: import converter.db.db_lookup, "
            "which re-applies scripts/data/scalar-media-roles.json), then find what "
            "reclassified it."
        )
        return 1

    if drops:
        print(f"ROW-FLOOR REGRESSION DETECTED ({len(drops)} finding(s)):")
        for d in drops:
            print(f"  - {d}")
        print(f"\nfloor file : {floor_path}")
        print(f"live db    : {live_db}")
        print(
            "\nA populated table or column lost rows since the floor was last committed. "
            "This is the exact failure mode gated FOUR previous times on this project "
            "(has_inner_blocks, scalar-media, emit_shape, container_kind). Find the writer "
            "that stopped populating this data before touching the floor. Only run "
            "--update once the drop is understood and either fixed or deliberately accepted."
        )
        return 1

    print(f"CLEAN -- no row-floor regression ({floor_path.name} vs {live_db.name}).")
    print(f"  {len(floor.get('tables', {}))} table(s) + {len(floor.get('columns', {}))} column(s) checked against the floor.")
    print(f"  {len(VALUE_ASSERTIONS)} value-identity assertion(s) hold.")
    if growth:
        print(f"  {len(growth)} grew since baseline (tolerated, not re-baselined automatically):")
        for g in growth:
            print(f"    - {g}")
    return 0


def cmd_update(floor_path: Path, live_db: Path) -> int:
    if not live_db.exists():
        print(f"ERROR: live DB not found at {live_db}", file=sys.stderr)
        return 2

    live_con = sqlite3.connect(f"file:{live_db}?mode=ro", uri=True)
    try:
        live = collect_counts(live_con, SEEDED_COLUMNS)
    finally:
        live_con.close()

    from datetime import datetime, timezone

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    old_floor: dict[str, dict[str, int]] | None = None
    if floor_path.exists():
        old_floor = load_floor(floor_path)

    write_floor(floor_path, live, generated_at)

    print(f"BASELINE WRITTEN: {floor_path}")
    print(f"  {len(live['tables'])} table(s) + {len(live['columns'])} column(s) recorded.")
    if old_floor is not None:
        drops, growth = compare_to_floor(old_floor, live)
        if drops:
            print(
                f"\n  WARNING: this baseline LOWERS {len(drops)} count(s) relative to the "
                "previous floor -- you are about to accept a drop as the new normal:"
            )
            for d in drops:
                print(f"    - {d}")
        if growth:
            print(f"\n  {len(growth)} count(s) grew relative to the previous floor (expected, tolerated).")
    return 0


# --------------------------------------------------------------------------
# self-test -- prove the gate can FAIL, and that growth does NOT fail it
# --------------------------------------------------------------------------

def _self_test() -> int:
    """A gate that has never been shown to fail is decoration. Prove this one
    fails on a real drop, and prove it stays green under growth -- the two
    arms this whole script exists to get right.
    """
    failures: list[str] = []
    tmp = Path(tempfile.mkdtemp(prefix="sgs-row-floor-selftest-"))

    db_path = tmp / "toy.db"
    floor_path = tmp / "toy-row-floor.json"

    con = sqlite3.connect(str(db_path))
    con.execute(
        "CREATE TABLE widgets (id INTEGER PRIMARY KEY, name TEXT, kind TEXT)"
    )
    # 5 rows, 3 of which have a populated `kind` (the seeded column under test).
    con.executemany(
        "INSERT INTO widgets (name, kind) VALUES (?, ?)",
        [
            ("a", "alpha"),
            ("b", "beta"),
            ("c", "gamma"),
            ("d", None),
            ("e", ""),
        ],
    )
    con.commit()
    con.close()

    toy_columns = [("widgets", "kind")]

    def counts_of(path: Path) -> dict[str, dict[str, int]]:
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        try:
            return collect_counts(con, toy_columns)
        finally:
            con.close()

    def check(path: Path) -> tuple[int, list[str], list[str]]:
        floor = load_floor(floor_path)
        live = counts_of(path)
        drops, growth = compare_to_floor(floor, live)
        return (1 if drops else 0), drops, growth

    # --- baseline the toy DB (this is `--update`, on the throwaway path only) ---
    from datetime import datetime, timezone

    write_floor(floor_path, counts_of(db_path), datetime.now(timezone.utc).isoformat())
    baseline = json.loads(floor_path.read_text(encoding="utf-8"))
    print(f"baselined toy DB: tables={baseline['tables']} columns={baseline['columns']}")

    # ARM 1 -- PASSING ARM: unmodified DB must compare clean against its own floor.
    print("\narm 1 (passing) -- unmodified DB vs its own floor:")
    rc, drops, growth = check(db_path)
    if rc != 0 or drops:
        failures.append(f"unmodified DB reported a drop: {drops}")
        print(f"  FAIL  rc={rc} drops={drops}")
    else:
        print("  PASS  rc=0, no drops")

    # ARM 2 -- FAILING ARM: delete rows so the seeded column's populated count
    # drops, confirm the break actually landed in the data, then confirm
    # --check FAILS.
    print("\narm 2 (failing) -- delete populated `kind` rows, confirm the gate FAILS:")
    con = sqlite3.connect(str(db_path))
    before_kind = con.execute(
        "SELECT COUNT(*) FROM widgets WHERE kind IS NOT NULL AND kind != ''"
    ).fetchone()[0]
    before_rows = con.execute("SELECT COUNT(*) FROM widgets").fetchone()[0]
    con.execute("DELETE FROM widgets WHERE name IN ('a', 'b')")
    con.commit()
    after_kind = con.execute(
        "SELECT COUNT(*) FROM widgets WHERE kind IS NOT NULL AND kind != ''"
    ).fetchone()[0]
    after_rows = con.execute("SELECT COUNT(*) FROM widgets").fetchone()[0]
    con.close()
    # Confirm the break actually landed before asserting on it (prove-the-cause
    # discipline -- do not trust that DELETE did what we intended).
    if not (after_kind < before_kind and after_rows < before_rows):
        failures.append(
            f"deletion did not land as expected: kind {before_kind}->{after_kind}, "
            f"rows {before_rows}->{after_rows}"
        )
        print(f"  FAIL  the deletion itself did not reduce the counts as expected")
    else:
        print(f"  confirmed deletion landed: widgets rows {before_rows}->{after_rows}, "
              f"populated `kind` {before_kind}->{after_kind}")
        rc, drops, growth = check(db_path)
        table_hit = any("widgets" in d and "DROPPED" in d and "TABLE" in d for d in drops)
        col_hit = any("widgets.kind" in d and "DROPPED" in d for d in drops)
        if rc == 0 or not (table_hit and col_hit):
            failures.append(f"row/column drop was NOT detected: rc={rc} drops={drops}")
            print(f"  FAIL  rc={rc} drops={drops}")
        else:
            print(f"  PASS  rc=1, both the table-row drop and the column-populated drop were detected:")
            for d in drops:
                print(f"    - {d}")

    # ARM 3 -- GROWTH-TOLERANCE ARM: re-baseline on the now-shrunk DB, then ADD
    # rows (growth beyond the floor), confirm --check still PASSES. Growth must
    # never be treated as a failure -- that is the entire point of this script
    # over a naive "counts must match exactly" gate.
    print("\narm 3 (growth-tolerance) -- re-baseline, then ADD rows, confirm the gate still PASSES:")
    write_floor(floor_path, counts_of(db_path), datetime.now(timezone.utc).isoformat())
    rebaseline = json.loads(floor_path.read_text(encoding="utf-8"))
    print(f"  re-baselined: tables={rebaseline['tables']} columns={rebaseline['columns']}")
    con = sqlite3.connect(str(db_path))
    before_rows2 = con.execute("SELECT COUNT(*) FROM widgets").fetchone()[0]
    con.executemany(
        "INSERT INTO widgets (name, kind) VALUES (?, ?)",
        [("f", "delta"), ("g", "epsilon"), ("h", None)],
    )
    con.commit()
    after_rows2 = con.execute("SELECT COUNT(*) FROM widgets").fetchone()[0]
    con.close()
    if not (after_rows2 > before_rows2):
        failures.append(f"growth insertion did not land: {before_rows2}->{after_rows2}")
        print(f"  FAIL  the insertion itself did not grow the table as expected")
    else:
        print(f"  confirmed growth landed: widgets rows {before_rows2}->{after_rows2}")
        rc, drops, growth = check(db_path)
        if rc != 0 or drops:
            failures.append(f"growth was WRONGLY treated as a failure: rc={rc} drops={drops}")
            print(f"  FAIL  rc={rc} drops={drops} (growth must never fail the gate)")
        else:
            print(f"  PASS  rc=0, no drops -- growth reported as tolerated, not a failure:")
            for g in growth:
                print(f"    - {g}")

    shutil_rmtree_safe(tmp)

    print()
    if failures:
        print(f"SELF-TEST FAILED ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("SELF-TEST PASSED -- the gate was shown to FAIL on a real drop, and to stay "
          "GREEN under legitimate growth.")
    return 0


def shutil_rmtree_safe(path: Path) -> None:
    import shutil

    shutil.rmtree(path, ignore_errors=True)


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--floor", type=Path, default=ROW_FLOOR_JSON,
                    help="committed floor file to compare against (default: sibling row-floor.json)")
    ap.add_argument(
        "--live-db", type=Path, default=LIVE_DB_DEFAULT,
        help="live database, opened READ-ONLY (default: the real knowledge base)",
    )
    ap.add_argument("--check", action="store_true",
                    help="compare live counts vs the floor; exit 1 on any drop")
    ap.add_argument("--update", "--rebaseline", dest="update", action="store_true",
                    help="write current live counts as the new floor (deliberate act only -- "
                         "never run this to silently absorb a regression)")
    ap.add_argument("--self-test", action="store_true",
                    help="prove the gate can FAIL on a real drop and stays green under growth")
    args = ap.parse_args()

    try:
        if args.self_test:
            return _self_test()
        if args.update:
            return cmd_update(args.floor, args.live_db)
        if args.check:
            return cmd_check(args.floor, args.live_db)
    except RowFloorError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

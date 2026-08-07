#!/usr/bin/env python3
"""Retire a knowledge-base table: back up, archive it reversibly, then DROP it.

WHY THIS EXISTS
---------------
Retiring a table is now a RECURRING operation, not a one-off — `variations`
(D469) was the first, `_meta_schema_version` and `block_styles` (D472) the next
two — and each one so far was executed by hand. Hand-executed destructive DB
work is precisely where an irreplaceable, gitignored artefact gets lost: the
knowledge base has no second copy, so an unarchived `DROP TABLE` is permanent.

This turns the D469 procedure into a repeatable one with the same archive shape,
so every retirement is reversible in the same way and a future reader finds one
format rather than three ad-hoc ones.

THE PROCEDURE (each step gated on the previous one)
---------------------------------------------------
  1. Verified backup of the whole DB via ``Connection.backup()`` — NOT a file
     copy. The DB runs in WAL mode, so copying the ``.db`` file alone can miss
     committed data still sitting in the ``-wal`` sidecar.
  2. Archive the table to ``scripts/data/retired/<table>.json.gz`` with its
     ``CREATE TABLE`` DDL, its column list and every row, matching the shape
     `variations.json.gz` already uses.
  3. Verify the archive round-trips — replay the DDL and rows into a throwaway
     database and confirm the contents match what was read.
  4. Only then ``DROP TABLE``.

If any step fails the drop does not happen. ``--dry-run`` performs 1-3 and
reports what WOULD be dropped.

AFTER RUNNING THIS, TWO GATES NEED ATTENTION
--------------------------------------------
  * ``dbschema/schema.sql`` must be regenerated — ``check_schema_drift.py``
    will (correctly) FAIL until it is. That failure is the gate doing its job;
    do not silence it, regenerate.
  * ``dbschema/seed-history.json`` still holds the dropped table in its recent
    entries. Nothing to do: it is a rolling 5-run record, the next run reports the
    table as GONE (correctly — it is) and it ages out on its own. It cannot block
    anything. (The ``row-floor.json`` baseline this note used to name, and the
    ``--update`` re-baseline it demanded, were DELETED on 2026-08-07 with the floor
    gate itself.)

USAGE
-----
    python dbschema/retire_table.py --table block_styles --reason "..." --dry-run
    python dbschema/retire_table.py --table block_styles --reason "..."
    python dbschema/retire_table.py --self-test
"""

from __future__ import annotations

import argparse
import gzip
import json
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
RETIRED_DIR = HERE.parent / "data" / "retired"

DEFAULT_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def table_ddl(con: sqlite3.Connection, table: str) -> str | None:
    row = con.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone()
    return row[0] if row else None


def read_all(con: sqlite3.Connection, table: str) -> tuple[list[str], list[dict]]:
    cols = [r[1] for r in con.execute(f'PRAGMA table_info("{table}")')]
    rows = [
        dict(zip(cols, r))
        for r in con.execute(f'SELECT {", ".join(f_q(c) for c in cols)} FROM "{table}"')  # noqa: S608 — quoted identifiers
    ]
    return cols, rows


def f_q(col: str) -> str:
    return f'"{col}"'


def backup_db(db: Path) -> Path:
    """Full verified backup via the SQLite backup API (WAL-safe)."""
    dest = db.with_suffix(db.suffix + ".bak-pre-retire")
    src = sqlite3.connect(str(db))
    try:
        dst = sqlite3.connect(str(dest))
        try:
            src.backup(dst)
        finally:
            dst.close()
    finally:
        src.close()
    # Verify the backup opens and carries the same table set.
    a = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    b = sqlite3.connect(f"file:{dest}?mode=ro", uri=True)
    try:
        q = ("SELECT name FROM sqlite_master WHERE type='table' "
             "AND name NOT LIKE 'sqlite@_%' ESCAPE '@' ORDER BY name")
        if [r[0] for r in a.execute(q)] != [r[0] for r in b.execute(q)]:
            raise RuntimeError(f"backup verification FAILED: {dest} table set differs")
    finally:
        a.close()
        b.close()
    return dest


def verify_roundtrip(ddl: str, cols: list[str], rows: list[dict], table: str) -> None:
    """Replay the archive into a throwaway DB and confirm it reproduces the rows.

    An archive that has never been replayed is a hope, not a backup.
    """
    tmp = Path(tempfile.mkdtemp(prefix="sgs-retire-verify-")) / "v.db"
    con = sqlite3.connect(str(tmp))
    try:
        con.execute(ddl)
        con.executemany(
            f'INSERT INTO "{table}" ({", ".join(f_q(c) for c in cols)}) '  # noqa: S608 — quoted identifiers
            f'VALUES ({", ".join("?" for _ in cols)})',
            [[r[c] for c in cols] for r in rows],
        )
        con.commit()
        back = [
            dict(zip(cols, r))
            for r in con.execute(f'SELECT {", ".join(f_q(c) for c in cols)} FROM "{table}"')  # noqa: S608
        ]
    finally:
        con.close()
    if back != rows:
        raise RuntimeError(
            f"archive round-trip FAILED for `{table}`: replayed {len(back)} rows, "
            f"expected {len(rows)} — refusing to drop."
        )


def retire(db: Path, table: str, reason: str, dry_run: bool) -> int:
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        ddl = table_ddl(con, table)
        if not ddl:
            print(f"FATAL: no table named `{table}` in {db}", file=sys.stderr)
            return 2
        cols, rows = read_all(con, table)
    finally:
        con.close()
    print(f"table `{table}`: {len(rows)} row(s), {len(cols)} column(s)")

    if not dry_run:
        bak = backup_db(db)
        print(f"  [1/4] verified backup written: {bak.name}")
    else:
        print("  [1/4] backup SKIPPED (--dry-run)")

    payload = {
        "__doc": f"RETIRED table `{table}`, archived before DROP.",
        "__why": reason,
        "__restore": "Recreate with __ddl, then INSERT the rows. Or recover the "
                     "whole DB from the .bak-pre-retire alongside the live file.",
        "__ddl": ddl,
        "__columns": cols,
        "__row_count": len(rows),
        "rows": rows,
    }
    RETIRED_DIR.mkdir(parents=True, exist_ok=True)
    archive = RETIRED_DIR / f"{table}.json.gz"
    blob = json.dumps(payload, indent=2, ensure_ascii=False, default=str)
    if dry_run:
        print(f"  [2/4] would archive to {archive.name} ({len(blob)} bytes uncompressed)")
    else:
        with gzip.open(archive, "wt", encoding="utf-8") as fh:
            fh.write(blob)
        print(f"  [2/4] archived: {archive}")

    # Round-trip from the payload we just built (and, when not dry-running, from
    # what was actually written to disk — the file is what a restore would read).
    check_rows = rows
    if not dry_run:
        reread = json.loads(gzip.open(archive, "rt", encoding="utf-8").read())
        check_rows = reread["rows"]
        if reread["__ddl"] != ddl or reread["__columns"] != cols:
            print("FATAL: archive re-read does not match what was captured", file=sys.stderr)
            return 3
    try:
        verify_roundtrip(ddl, cols, check_rows, table)
    except RuntimeError as exc:
        print(f"FATAL: {exc}", file=sys.stderr)
        return 3
    print(f"  [3/4] archive round-trip VERIFIED ({len(check_rows)} rows replay exactly)")

    if dry_run:
        print(f"  [4/4] would DROP TABLE {table} (dry run — nothing dropped)")
        return 0
    con = sqlite3.connect(str(db))
    try:
        con.execute(f'DROP TABLE "{table}"')
        con.commit()
    finally:
        con.close()
    print(f"  [4/4] DROPPED `{table}`")
    print("\nNEXT: regenerate dbschema/schema.sql (check_schema_drift.py will fail "
          "until you do — that is the gate working). Nothing to re-baseline: "
          "dbschema/seed_history.py reports the drop and ages it out by itself.")
    return 0


def do_self_test() -> int:
    """Prove the archive+drop works AND that a failed round-trip blocks the drop."""
    tmp = Path(tempfile.mkdtemp(prefix="sgs-retire-selftest-"))
    db = tmp / "t.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE doomed (id INTEGER PRIMARY KEY, label TEXT)")
    con.executemany("INSERT INTO doomed VALUES (?,?)", [(1, "a"), (2, "b"), (3, "c")])
    con.execute("CREATE TABLE keeper (id INTEGER PRIMARY KEY)")
    con.execute("INSERT INTO keeper VALUES (1)")
    con.commit()
    con.close()

    global RETIRED_DIR
    real = RETIRED_DIR
    RETIRED_DIR = tmp / "retired"
    try:
        # Arm 1 — dry run must NOT drop.
        if retire(db, "doomed", "self-test", dry_run=True) != 0:
            print("SELF-TEST FAIL: dry run returned non-zero")
            return 1
        c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        still = c.execute("SELECT COUNT(*) FROM doomed").fetchone()[0]
        c.close()
        if still != 3:
            print(f"SELF-TEST FAIL: dry run dropped/altered data ({still} rows)")
            return 1
        print("ok   dry run left the table intact\n")

        # Arm 2 — real run drops it, archives it, leaves siblings alone.
        if retire(db, "doomed", "self-test", dry_run=False) != 0:
            print("SELF-TEST FAIL: real run returned non-zero")
            return 1
        c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        gone = c.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='doomed'"
        ).fetchone()[0]
        kept = c.execute("SELECT COUNT(*) FROM keeper").fetchone()[0]
        c.close()
        if gone != 0 or kept != 1:
            print(f"SELF-TEST FAIL: gone={gone} kept={kept}")
            return 1
        print("\nok   table dropped, sibling table untouched")

        # Arm 3 — the archive genuinely restores.
        arch = json.loads(gzip.open(RETIRED_DIR / "doomed.json.gz", "rt", encoding="utf-8").read())
        r = sqlite3.connect(":memory:")
        r.execute(arch["__ddl"])
        r.executemany(
            "INSERT INTO doomed (id,label) VALUES (?,?)",
            [[row[c] for c in arch["__columns"]] for row in arch["rows"]],
        )
        if r.execute("SELECT COUNT(*) FROM doomed").fetchone()[0] != 3:
            print("SELF-TEST FAIL: archive did not restore 3 rows")
            return 1
        r.close()
        print("ok   archive restores all 3 rows into a fresh database")

        # Arm 4 — NEGATIVE CONTROL: a broken round-trip must BLOCK the drop.
        try:
            verify_roundtrip(
                "CREATE TABLE broken (id INTEGER PRIMARY KEY, label TEXT)",
                ["id", "label"],
                [{"id": 1, "label": "a"}, {"id": 1, "label": "SHOULD-COLLIDE"}],
                "broken",
            )
        except (RuntimeError, sqlite3.IntegrityError):
            print("ok   a corrupt archive RAISES rather than allowing the drop")
        else:
            print("SELF-TEST FAIL: round-trip verification accepted bad data")
            return 1

        print("\nSELF-TEST: PASS")
        return 0
    finally:
        RETIRED_DIR = real


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--table")
    ap.add_argument("--reason", default="", help="why it is being retired (goes in the archive)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return do_self_test()
    if not args.table:
        ap.error("--table is required unless --self-test")
    if not args.reason and not args.dry_run:
        ap.error("--reason is required for a real retirement (it is the archive's record)")
    if not args.db.exists():
        print(f"database not found: {args.db}", file=sys.stderr)
        return 2
    return retire(args.db, args.table, args.reason, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())

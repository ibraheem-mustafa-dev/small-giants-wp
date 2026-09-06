#!/usr/bin/env python3
"""Capture the Phase-1 Group-5 seed tables from a LIVE database into data files.

Phase 1 (parent plan `.claude/plans/2026-08-01-db-derivation-and-converter-cleanup.md`).

WHY THIS EXISTS
---------------
``property_suffixes`` / ``slots`` / ``excluded_properties`` are converter-load-bearing
and had NO WRITER ANYWHERE — a rebuild-from-empty produced 0 rows in all three, which
does not error, it just makes the converter answer wrongly. Their only historical
source was a set of one-off migrations, and **migration replay is a proven dead end**
(Phase 0 Step 0.5: three migrations reference ``slot_synonyms``, retired in favour of
``slots``, so a May migration cannot run against an August schema).

So the seed is captured from LIVE state, exactly as `roles.json`,
`modifier-suffixes.json` and `atomic-tag-map.json` were. This script makes that
capture REPEATABLE and CHECKABLE instead of hand-transcribed.

ONE WRITER PER ARTEFACT
-----------------------
- This script is the ONLY writer of ``scripts/data/{property-suffixes,slots,
  excluded-properties}.json``.
- ``converter/db/db_lookup.py`` is the ONLY writer of the three DB tables (it seeds
  FROM these files at module load).
Nothing writes in both directions, so there is no clobber loop.

USAGE
-----
    python dbschema/capture_seed_data.py --check    # exit 1 if files differ from live
    python dbschema/capture_seed_data.py --write    # refresh the files from live
    python dbschema/capture_seed_data.py --self-test

``--check`` is the drift detector: it fails when someone edits a table by hand
without back-writing the seed — the exact decay class Phase 0/1 exists to end.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"

DEFAULT_DB = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"),
    )
)

# table -> (data filename, ordered column list, json key holding the rows)
#
# Columns are named EXPLICITLY rather than `SELECT *` so a future ALTER TABLE that
# adds a column cannot silently widen the captured tuples and desync the seeder,
# which unpacks them positionally.
TABLES: dict[str, tuple[str, list[str], str]] = {
    "property_suffixes": (
        "property-suffixes.json",
        ["suffix", "role", "css_property", "is_token_matched",
         "token_source", "notes", "kind_override"],
        "rows",
    ),
    "slots": (
        "slots.json",
        ["slot_name", "scope", "aliases", "standalone_block", "notes",
         "standalone_block_default_attrs", "resolves_whole_instance"],
        "rows",
    ),
    "excluded_properties": (
        "excluded-properties.json",
        ["css_property", "reason", "decided_by", "date"],
        "rows",
    ),
}

DOCS: dict[str, dict[str, str]] = {
    "property_suffixes": {
        "__doc": "CSS-property → attribute-suffix vocabulary. THE source of truth for "
                 "the `property_suffixes` table (Spec 31 §4). "
                 "db_lookup._migrate_property_suffixes() seeds from this file at module load.",
        "__why": "Converter-load-bearing with NO writer anywhere: read by the typography "
                 "lift, the kind resolver, the attr-name proposer, the excluded-gate and "
                 "the cheat-gate. A rebuild-from-empty produced 0 rows — no error, just "
                 "wrong answers. Captured from live 2026-08-02 (Phase 1).",
        "__ORDER_IS_LOAD_BEARING": "db_lookup.py reads this table with `ORDER BY rowid` in "
                                   "several places, and `ORDER BY rowid LIMIT 1` in "
                                   "propose_attr_name() — so for a css_property with more "
                                   "than one suffix row, THE FIRST ROW WINS. `Colour` "
                                   "precedes `Color` for `color` deliberately (UK English "
                                   "is the SGS convention). NEVER alphabetise this list; "
                                   "the seeder rewrites the table in exactly this sequence.",
        "__kind_override": "Captured POST-migration: _migrate_property_suffixes_kind_override() "
                           "seeds 17 rows from _KIND_BY_SUFFIX with `WHERE kind_override IS NULL`. "
                           "Capturing the post-migration state keeps the two writers in "
                           "agreement, so neither rewrites the other on the next module load.",
    },
    "slots": {
        "__doc": "Canonical slot vocabulary (element + section scope) with aliases and "
                 "standalone-block routing. THE source of truth for the `slots` table "
                 "(Spec 31 §13.5). db_lookup._migrate_slots() seeds it at module load.",
        "__why": "Converter-load-bearing with NO writer anywhere: the walker resolves every "
                 "BEM element name through `slots.aliases` and every section through "
                 "`slots.standalone_block`. Empty ⇒ nothing resolves. Captured from live "
                 "2026-08-02 (Phase 1).",
        "__supersedes": "behavioural-analyser/seed-slot-alias-extensions.py — a 2026-05-30 "
                        "one-off whose four alias additions are BAKED INTO this capture. It became "
                        "redundant and was DELETED 2026-08-02. Extend THIS file to add an alias; "
                        "there is no script to re-run.",
        "__aliases_format": "JSON array stored as TEXT, verbatim from live.",
    },
    "excluded_properties": {
        "__doc": "F4 excluded_properties — CSS properties deliberately NOT lifted to block "
                 "attributes (still cloned via passthrough <style>). THE source of truth "
                 "for the table. db_lookup._migrate_excluded_properties() seeds it.",
        "__why": "Read as a frozenset by converter/dispatch_table.py:95 and by the "
                 "excluded-gate. Empty ⇒ every excluded property is wrongly treated as "
                 "liftable. Captured from live 2026-08-02 (Phase 1).",
        "__order": "NOT load-bearing — every reader builds a set. Captured in rowid order "
                   "anyway so the file diffs cleanly.",
        "__note": "Some `reason` strings contain U+FFFD (a replacement character from an "
                  "earlier bad write). Captured VERBATIM: byte-exact parity with live is "
                  "the goal, no reader parses these strings, and silently 'repairing' them "
                  "would make this capture disagree with the database it mirrors.",
    },
}


class DatabaseBusy(RuntimeError):
    """The DB could not be read — locked, mid-write, or malformed."""


def read_table(db: Path, table: str) -> list[list]:
    """Return every row of *table* as a list of lists, in rowid order.

    Raises ``DatabaseBusy`` rather than letting ``sqlite3.OperationalError`` escape.
    This runs inside ``npm run build`` on a worktree that two tracks share, and this
    project has already had a concurrent DB writer break both tracks' builds once. An
    unreadable database at build time is a SKIP condition, not a stack trace — the same
    contract as the absent-DB path. It must never be a silent PASS either, hence a
    distinct exception the caller reports on.
    """
    _, cols, _ = TABLES[table]
    try:
        con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    except sqlite3.Error as exc:  # OperationalError=locked, DatabaseError=corrupt
        raise DatabaseBusy(f"cannot open {db}: {exc}") from exc
    try:
        sql = f'SELECT {", ".join(cols)} FROM "{table}" ORDER BY rowid'  # noqa: S608 — fixed names
        return [list(r) for r in con.execute(sql)]
    except sqlite3.Error as exc:  # OperationalError=locked, DatabaseError=corrupt
        raise DatabaseBusy(f"cannot read `{table}` from {db}: {exc}") from exc
    finally:
        con.close()


def build_payload(db: Path, table: str) -> dict:
    _, cols, rows_key = TABLES[table]
    payload: dict = dict(DOCS[table])
    payload["__columns"] = cols
    payload[rows_key] = read_table(db, table)
    return payload


def file_for(table: str) -> Path:
    return DATA / TABLES[table][0]


def serialise(payload: dict) -> str:
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def do_write(db: Path) -> int:
    for table in TABLES:
        payload = build_payload(db, table)
        path = file_for(table)
        path.write_text(serialise(payload), encoding="utf-8")
        print(f"wrote {path.name:28} {len(payload['rows']):>4} rows")
    return 0


def do_check(db: Path) -> int:
    failures = 0
    try:
        _ = read_table(db, next(iter(TABLES)))
    except DatabaseBusy as exc:
        print(f"SKIPPED — {exc}\n"
              "  The database is present but unreadable (locked by a "
              f"concurrent writer, mid-write, or malformed). Treated as a skip so a "
              f"shared-worktree build is not broken by another track's DB activity. "
              f"Re-run when the writer finishes; this is NOT a pass.")
        return 0
    for table in TABLES:
        path = file_for(table)
        want = build_payload(db, table)
        if not path.exists():
            print(f"FAIL {table}: {path.name} does not exist")
            failures += 1
            continue
        try:
            have = json.loads(path.read_text(encoding="utf-8"))
        except ValueError as exc:
            print(f"FAIL {table}: {path.name} is not valid JSON ({exc})")
            failures += 1
            continue
        if have.get("rows") != want["rows"]:
            hn, wn = len(have.get("rows") or []), len(want["rows"])
            print(f"FAIL {table}: {path.name} has {hn} rows, live has {wn} — "
                  f"re-run with --write (and explain the change).")
            failures += 1
        elif have.get("__columns") != want["__columns"]:
            print(f"FAIL {table}: {path.name} column list differs from live schema.")
            failures += 1
        else:
            print(f"ok   {table:22} {len(want['rows']):>4} rows match live")
    print("\nCHECK:", "PASS" if not failures else f"FAIL ({failures})")
    return 0 if not failures else 1


SELF_TEST_DDL = {
    "property_suffixes":
        "CREATE TABLE property_suffixes (suffix TEXT PRIMARY KEY, role TEXT NOT NULL, "
        "css_property TEXT, is_token_matched INTEGER DEFAULT 1, token_source TEXT, "
        "notes TEXT, kind_override TEXT)",
    "slots":
        "CREATE TABLE slots (slot_name TEXT NOT NULL, scope TEXT NOT NULL, aliases TEXT, "
        "standalone_block TEXT, notes TEXT, created_at TEXT, "
        "standalone_block_default_attrs TEXT, resolves_whole_instance TEXT, "
        "PRIMARY KEY (slot_name, scope))",
    "excluded_properties":
        "CREATE TABLE excluded_properties (css_property TEXT NOT NULL, reason TEXT NOT NULL, "
        "decided_by TEXT NOT NULL, date TEXT NOT NULL, UNIQUE(css_property))",
}
SELF_TEST_ROWS = {
    "property_suffixes": ("zzzTest", "color", "zzz-prop", 1, "palette", None, None),
    "slots": ("zzz-slot", "element", '["zzz"]', "sgs/text", "n", None, None),
    "excluded_properties": ("zzz-prop", "r", "d", "2026-01-01"),
}


def do_self_test() -> int:
    """Prove --check can actually FAIL — end to end, not by asserting a tautology.

    Builds a throwaway DB, captures it with --write, confirms --check passes, then
    breaks ONE row in ONE file and confirms --check fails. A gate that cannot fail
    reads green forever, so the failing arm is the point of this test.
    """
    global DATA
    real_data = DATA
    tmp = Path(tempfile.mkdtemp(prefix="sgs-capture-selftest-"))
    try:
        db = tmp / "t.db"
        con = sqlite3.connect(db)
        for table, ddl in SELF_TEST_DDL.items():
            con.execute(ddl)
            cols = TABLES[table][1]
            # slots' captured column list omits created_at, so name columns explicitly.
            con.execute(
                f'INSERT INTO "{table}" ({", ".join(cols)}) '  # noqa: S608 — fixed names
                f'VALUES ({", ".join("?" for _ in cols)})',
                SELF_TEST_ROWS[table],
            )
        con.commit()
        con.close()

        DATA = tmp / "data"
        DATA.mkdir()

        if do_write(db) != 0:
            print("SELF-TEST FAIL: --write returned non-zero")
            return 1
        if do_check(db) != 0:
            print("SELF-TEST FAIL: --check did not pass on a freshly written capture")
            return 1
        print("ok   --check PASSES on an in-sync capture")

        # Negative control — corrupt one file and prove --check reports it.
        target = file_for("slots")
        payload = json.loads(target.read_text(encoding="utf-8"))
        before = list(payload["rows"])
        payload["rows"] = []
        target.write_text(serialise(payload), encoding="utf-8")
        if json.loads(target.read_text(encoding="utf-8"))["rows"] == before:
            print("SELF-TEST FAIL: the break did not land in the file")
            return 1
        print("ok   break landed (slots.json rows emptied)")

        if do_check(db) == 0:
            print("SELF-TEST FAIL: --check PASSED against a broken capture")
            return 1
        print("ok   --check FAILS on the broken capture")

        print("\nSELF-TEST: PASS")
        return 0
    finally:
        DATA = real_data


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB, help="source database")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--write", action="store_true", help="refresh data files from live")
    g.add_argument("--check", action="store_true", help="fail if files differ from live")
    g.add_argument("--self-test", action="store_true", help="prove --check can fail")
    args = ap.parse_args()

    if args.self_test:
        return do_self_test()
    if not args.db.exists():
        if args.check:
            print(
                f"SKIPPED — DB not found: {args.db}\n"
                "  This is expected on a machine without the local dev DB (it is "
                "unversioned by design). The build proceeds; run "
                "`python plugins/sgs-blocks/scripts/sgs-update-v2.py` to (re)create "
                "it if you need this check to run."
            )
            return 0
        print(f"database not found: {args.db}", file=sys.stderr)
        return 2
    return do_write(args.db) if args.write else do_check(args.db)


if __name__ == "__main__":
    raise SystemExit(main())

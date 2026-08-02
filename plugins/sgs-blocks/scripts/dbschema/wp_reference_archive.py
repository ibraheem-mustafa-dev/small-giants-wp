#!/usr/bin/env python3
"""Preserve the ORPHANED WordPress reference corpus (`hooks` + `docs`).

WHY THIS EXISTS
---------------
Measured 2026-08-02. The `hooks` (5,433 rows) and `docs` (1,257 rows) tables were
never generated from this repo. They were IMPORTED from the wp-devdocs MCP
server's database — `scripts/_retired/phase1-migrate-hooks.py` names it outright::

    HOOKS_DB = "C:/Users/Bean/.wp-devdocs-mcp/hooks.db"
    source_id=1 wp-core · 2 gutenberg-source · 3 gutenberg-docs ·
    4 plugin-handbook · 5 rest-api-handbook · 6 wp-cli-handbook ·
    7 admin-handbook · 8 woocommerce

**That upstream no longer exists.** `~/.wp-devdocs-mcp/` is gone, so is its sibling
`~/.wp-blockmarkup-mcp/`, no `hooks.db` survives anywhere under the home directory,
and neither MCP is configured any more. The live, gitignored `sgs-framework.db` is
therefore the ONLY surviving copy of this corpus.

That matters because the corpus is LOAD-BEARING, not decorative:

* ``sgs-update-v2.py:86``   — ``SELECT 1 FROM docs  WHERE slug=? AND source='native_wp'``
* ``sgs-update-v2.py:2846`` — ``SELECT 1 FROM hooks WHERE name=? AND source='native_wp'``
* ``~/.claude/hooks/wp-docs.py`` — the live ``/wp-docs`` developer CLI

Those existence gates silently answer "no" for every native WP hook if the rows go
missing — a failure with no error message, which is the exact silent-rot class this
phase exists to end.

Provenance-wise this is a THIRD class, distinct from the two already known:
not derivable-from-source, and not accumulated-history, but **orphaned external
import** — irreplaceable by any scan of this repo.

WHY GZIP
--------
`docs.content` alone is 6.17 MB. Committing that as raw JSON would bloat every
clone for an artefact nobody diffs line-by-line. These are preservation archives,
so they ship compressed and are verified by round-trip instead of by eyeball.

USAGE
-----
    python wp_reference_archive.py --export             # refresh the archives
    python wp_reference_archive.py --verify             # round-trip check, no writes
    python wp_reference_archive.py --restore --db PATH  # rehydrate into a DB

``--restore`` REFUSES the live database unless ``--allow-live`` is passed: this is
disaster recovery, not routine seeding.
"""

from __future__ import annotations

import argparse
import gzip
import json
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ARCHIVE_DIR = HERE.parent / "data" / "wp-reference"
TABLES = ("hooks", "docs")

sys.path.insert(0, str(HERE))
from sandbox import live_db_paths  # noqa: E402


def _connect_ro(db: Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def _columns(con: sqlite3.Connection, table: str) -> list[str]:
    return [r[1] for r in con.execute(f"PRAGMA table_info({table})")]


def _is_live(db: Path) -> bool:
    try:
        resolved = db.resolve()
    except OSError:
        resolved = db.absolute()
    for live in live_db_paths():
        try:
            if resolved == live.resolve():
                return True
        except OSError:
            pass
    return False


def export(src: Path) -> int:
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    con = _connect_ro(src)
    try:
        for table in TABLES:
            cols = _columns(con, table)
            # `id` is a local autoincrement, not identity — exclude it so a
            # restore into a fresh DB does not inherit this file's row numbering.
            keep = [c for c in cols if c != "id"]
            rows = [
                {c: r[c] for c in keep}
                for r in con.execute(f"SELECT * FROM {table}")  # noqa: S608 — fixed table names
            ]
            payload = {
                "__doc": (
                    f"Orphaned WordPress reference corpus: `{table}`. Imported from the "
                    "wp-devdocs MCP database, whose upstream no longer exists. This "
                    "archive is the only version-controlled copy."
                ),
                "__source": "~/.wp-devdocs-mcp/hooks.db (GONE — see module docstring)",
                "__captured": "2026-08-02",
                "__columns": keep,
                "rows": rows,
            }
            out = ARCHIVE_DIR / f"{table}.json.gz"
            raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            with gzip.open(out, "wb", compresslevel=9) as fh:
                fh.write(raw)
            print(f"  {table:6} {len(rows):>5} rows -> {out.name} "
                  f"({out.stat().st_size / 1024:.0f} KB gz, {len(raw) / 1024:.0f} KB raw)")
    finally:
        con.close()
    return 0


def _load(table: str) -> dict:
    path = ARCHIVE_DIR / f"{table}.json.gz"
    if not path.exists():
        raise FileNotFoundError(f"archive missing: {path}")
    with gzip.open(path, "rb") as fh:
        return json.loads(fh.read().decode("utf-8"))


def verify(src: Path) -> int:
    """Round-trip: does the archive still match the live table exactly?"""
    con = _connect_ro(src)
    failures: list[str] = []
    try:
        for table in TABLES:
            try:
                arch = _load(table)
            except FileNotFoundError as exc:
                failures.append(str(exc))
                print(f"  FAIL  {table}: {exc}")
                continue
            keep = arch["__columns"]
            live_rows = [
                tuple(r[c] for c in keep)
                for r in con.execute(f"SELECT * FROM {table}")  # noqa: S608 — fixed table names
            ]
            arch_rows = [tuple(d[c] for c in keep) for d in arch["rows"]]
            if len(live_rows) != len(arch_rows):
                failures.append(f"{table}: live {len(live_rows)} vs archive {len(arch_rows)}")
                print(f"  FAIL  {table}: live {len(live_rows)} rows, archive {len(arch_rows)}")
                continue
            if sorted(map(repr, live_rows)) != sorted(map(repr, arch_rows)):
                failures.append(f"{table}: same count, different content")
                print(f"  FAIL  {table}: {len(live_rows)} rows but content differs")
                continue
            print(f"  PASS  {table}: {len(live_rows)} rows, exact match")
    finally:
        con.close()
    if failures:
        print("\nVERIFY FAILED — the archive is stale. Re-run --export.")
        return 1
    print("\nVERIFY PASSED — archives match the live tables exactly.")
    return 0


def restore(db: Path, allow_live: bool = False) -> int:
    if _is_live(db) and not allow_live:
        print(
            f"REFUSING: {db} is the LIVE database.\n"
            "  --restore is disaster recovery, not routine seeding. It would rewrite\n"
            "  6,690 rows of irreplaceable reference data. Pass --allow-live if you\n"
            "  genuinely mean it.",
            file=sys.stderr,
        )
        return 2
    con = sqlite3.connect(str(db))
    try:
        for table in TABLES:
            arch = _load(table)
            keep = arch["__columns"]
            placeholders = ",".join("?" for _ in keep)
            collist = ",".join(f'"{c}"' for c in keep)
            n = 0
            for row in arch["rows"]:
                con.execute(
                    f"INSERT OR REPLACE INTO {table} ({collist}) VALUES ({placeholders})",  # noqa: S608 — fixed names
                    [row[c] for c in keep],
                )
                n += 1
            con.commit()
            print(f"  {table:6} restored {n} rows")
    finally:
        con.close()
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", type=Path, default=live_db_paths()[0])
    ap.add_argument("--export", action="store_true")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--restore", action="store_true")
    ap.add_argument("--allow-live", action="store_true")
    args = ap.parse_args()

    if args.export:
        print(f"exporting from {args.db}")
        return export(args.db)
    if args.verify:
        print(f"verifying archives against {args.db}")
        return verify(args.db)
    if args.restore:
        print(f"restoring into {args.db}")
        return restore(args.db, allow_live=args.allow_live)
    ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

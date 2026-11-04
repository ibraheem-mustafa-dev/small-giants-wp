#!/usr/bin/env python3
"""verify-reseed-identity.py - proves a faster reseed produces exactly what the old one did.

A reseed speed-up is only safe if it changes nothing it writes. This seeds two copies of the same starting
database, one with the baseline code and one with the candidate code, then compares everything the reseed
writes:

  1. every table of the two databases, row by row, ignoring only the columns that hold a time of writing
     (created_at, last_indexed, ...) and the schema_metadata keys that start `last_`;
  2. every file the reseed left new or changed in each repository (attr-role-map.json, roster.json,
     seed-history.json, the generated reference files), compared byte for byte after the absolute repository
     path and any clock time are replaced by a placeholder.

  python plugins/sgs-blocks/scripts/verify-reseed-identity.py --baseline E:/sgs-tmp/wt-base --candidate E:/sgs-tmp/wt-new
  python plugins/sgs-blocks/scripts/verify-reseed-identity.py --baseline A --candidate B --plant-difference
  python plugins/sgs-blocks/scripts/verify-reseed-identity.py --self-test

--stage N runs only that stage in both trees. --shared-readonly is for a report-only stage (Stage 12): a --db run
skips every child script that does not read $SGS_FRAMEWORK_DB, so the scanners never run there. This mode runs the
stage without --db, on the shared database, and compares only the repository files; it fails if the shared
database's sha256 changed during the run (a peer's reseed makes it inconclusive, so repeat it).

Both repositories must be separate worktrees (a reseed writes files into its own tree), each with node_modules
installed in plugins/sgs-blocks and scripts/computed-route. The seed database is a copy of the shared one unless
--seed-db names another; the shared database is only read.

--plant-difference is the negative control: after seeding it changes one database cell and one repository file in
the candidate, and the run passes only if the comparison reports both. Exit 0 = identical (or, with
--plant-difference, both planted differences were caught); exit 1 = a difference (or a missed planted one).
"""
from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import sqlite3
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SHARED_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
UPDATE = Path("plugins") / "sgs-blocks" / "scripts" / "sgs-update-v2.py"
# A column that records when a row was written, not what it says.
TIME_COLUMN = re.compile(r"(_at$|^last_|timestamp|^created|^updated|date$|_time$|^ts$)", re.IGNORECASE)
CLOCK = re.compile(r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?")
SHOW = 5  # differing rows printed per table


def tables(conn: sqlite3.Connection) -> list[str]:
    return [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]


def norm_cell(value: object, roots: list[str]) -> object:
    if isinstance(value, bytes):
        return value.hex()
    if not isinstance(value, str):
        return value
    for root in roots:
        value = value.replace(root, "<REPO>").replace(root.replace("\\", "/"), "<REPO>")
    return value


def table_rows(conn: sqlite3.Connection, table: str, roots: list[str]) -> tuple[list[str], set[tuple]]:
    info = list(conn.execute(f'PRAGMA table_info("{table}")'))
    keep = [r[1] for r in info if not TIME_COLUMN.search(r[1])]
    if not keep:
        return [], set()
    rows = conn.execute(f'SELECT {", ".join(chr(34) + c + chr(34) for c in keep)} FROM "{table}"').fetchall()
    if table == "schema_metadata" and "key" in keep:
        k = keep.index("key")
        rows = [r for r in rows if not str(r[k]).startswith("last_")]
    return keep, {tuple(norm_cell(v, roots) for v in r) for r in rows}


def compare_dbs(a_path: Path, b_path: Path, roots_a: list[str], roots_b: list[str]) -> list[str]:
    """Differences between two databases; empty when identical. Rows are compared as sets (sorted order is moot)."""
    out: list[str] = []
    a = sqlite3.connect(f"file:{a_path.as_posix()}?mode=ro", uri=True)
    b = sqlite3.connect(f"file:{b_path.as_posix()}?mode=ro", uri=True)
    try:
        ta, tb = tables(a), tables(b)
        for name in sorted(set(ta) ^ set(tb)):
            out.append(f"table {name}: only in {'baseline' if name in ta else 'candidate'}")
        for name in sorted(set(ta) & set(tb)):
            cols_a, rows_a = table_rows(a, name, roots_a)
            cols_b, rows_b = table_rows(b, name, roots_b)
            if cols_a != cols_b:
                out.append(f"table {name}: columns differ {cols_a} vs {cols_b}")
                continue
            if rows_a == rows_b:
                continue
            only_a, only_b = sorted(rows_a - rows_b, key=repr), sorted(rows_b - rows_a, key=repr)
            out.append(f"table {name}: {len(only_a)} row(s) only in baseline, {len(only_b)} only in candidate")
            for label, rows in (("baseline", only_a), ("candidate", only_b)):
                for row in rows[:SHOW]:
                    out.append(f"    {label}: {dict(zip(cols_a, row))}"[:300])
    finally:
        a.close()
        b.close()
    return out


REPORT_LINE = re.compile(r"^Stage 1[23]\b")


def report_lines(log: Path, root: str) -> list[str]:
    """The Stage 12 per-scanner finding lines and the Stage 13 total, repository path and clock times normalised."""
    if not log.is_file():
        return []
    out = []
    for line in log.read_text(encoding="utf-8", errors="replace").splitlines():
        if REPORT_LINE.match(line):
            out.append(CLOCK.sub("<TS>", line.replace(root, "<REPO>").replace(root.replace("\\", "/"), "<REPO>")))
    return out


def compare_logs(base_log: Path, cand_log: Path, base: Path, cand: Path) -> list[str]:
    a, b = report_lines(base_log, str(base)), report_lines(cand_log, str(cand))
    out = []
    if not a or not b:
        return ["log: no Stage 12/13 lines in " + ("baseline" if not a else "candidate") + " log, so the findings were not compared"]
    for line in sorted(set(a) ^ set(b)):
        out.append(f"log line only in {'baseline' if line in a else 'candidate'}: {line[:200]}")
    return out


def changed_files(repo: Path) -> list[str]:
    done = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=repo, capture_output=True, text=True, check=True)
    paths = []
    for line in done.stdout.splitlines():
        path = line[3:].strip().strip('"')
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        if line[:2].strip() != "D":
            paths.append(path)
    return sorted(paths)


def norm_file(path: Path, root: str) -> str:
    text = path.read_bytes().decode("utf-8", "replace")
    text = text.replace(root, "<REPO>").replace(root.replace("\\", "/"), "<REPO>")
    return CLOCK.sub("<TS>", text)


def compare_repos(base: Path, cand: Path) -> list[str]:
    out: list[str] = []
    fa, fb = changed_files(base), changed_files(cand)
    for rel in sorted(set(fa) ^ set(fb)):
        out.append(f"file {rel}: changed only in {'baseline' if rel in fa else 'candidate'}")
    for rel in sorted(set(fa) & set(fb)):
        pa, pb = base / rel, cand / rel
        if not pa.is_file() or not pb.is_file():
            continue
        if norm_file(pa, str(base)) != norm_file(pb, str(cand)):
            out.append(f"file {rel}: contents differ")
    return out


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def seed(repo: Path, db: Path | None, log: Path, stage: int | None = None) -> int:
    """Runs sgs-update-v2.py in `repo`: on the copy `db`, or on the shared database when `db` is None."""
    began = time.perf_counter()
    cmd = [sys.executable, str(repo / UPDATE), "--allow-stale-tree"]
    if db is not None:
        cmd += ["--db", str(db)]
    if stage is not None:
        cmd += ["--stage", str(stage)]
    with log.open("w", encoding="utf-8") as fh:
        code = subprocess.run(cmd, cwd=repo, stdout=fh, stderr=subprocess.STDOUT).returncode
    print(f"  seeded {repo.name}: exit {code} in {time.perf_counter() - began:.0f}s (log {log})", flush=True)
    return code


def plant(cand: Path, db: Path | None) -> list[str]:
    """One changed database cell and one changed repository file, in the candidate."""
    planted: list[str] = []
    conn = sqlite3.connect(db) if db is not None else None
    for name in (tables(conn) if conn else []):
        text_cols = [r[1] for r in conn.execute(f'PRAGMA table_info("{name}")') if "TEXT" in (r[2] or "").upper() and not TIME_COLUMN.search(r[1])]
        if text_cols and conn.execute(f'SELECT 1 FROM "{name}" WHERE "{text_cols[0]}" IS NOT NULL LIMIT 1').fetchone():
            conn.execute(f'UPDATE "{name}" SET "{text_cols[0]}" = "{text_cols[0]}" || \'-PLANTED\' WHERE rowid = (SELECT MIN(rowid) FROM "{name}" WHERE "{text_cols[0]}" IS NOT NULL)')
            planted.append(f"table {name}")
            break
    if conn:
        conn.commit()
        conn.close()
    files = [f for f in changed_files(cand) if (cand / f).is_file()]
    if files:
        with (cand / files[0]).open("ab") as fh:
            fh.write(b"\nPLANTED\n")
        planted.append(f"file {files[0]}")
    return planted


def self_test() -> int:
    import tempfile
    failures = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        dbs = []
        for name in ("a", "b"):
            path = tmp_path / f"{name}.db"
            conn = sqlite3.connect(path)
            conn.execute("CREATE TABLE t (id INTEGER, label TEXT, created_at TEXT)")
            conn.execute("CREATE TABLE schema_metadata (key TEXT, value TEXT)")
            conn.executemany("INSERT INTO t VALUES (?,?,?)", [(1, "x", "2026-01-01 00:00:00" if name == "a" else "2027-02-02 09:09:09"), (2, "y", "now")])
            conn.executemany("INSERT INTO schema_metadata VALUES (?,?)", [("version", "3"), ("last_seed", name)])
            conn.commit()
            conn.close()
            dbs.append(path)
        same = compare_dbs(dbs[0], dbs[1], [], [])
        if same:
            failures.append(f"positive control: identical data with different times/last_ keys reported {same}")
        conn = sqlite3.connect(dbs[1])
        conn.execute("UPDATE t SET label='z' WHERE id=2")
        conn.commit()
        conn.close()
        if not compare_dbs(dbs[0], dbs[1], [], []):
            failures.append("negative control: a changed cell was not reported")
        conn = sqlite3.connect(dbs[1])
        conn.execute("DELETE FROM t WHERE id=1")
        conn.commit()
        conn.close()
        if not any("only in baseline" in d for d in compare_dbs(dbs[0], dbs[1], [], [])):
            failures.append("negative control: a missing row was not reported")
        if norm_cell("C:\\r\\x\\y", ["C:\\r\\x"]) != "<REPO>\\y":
            failures.append("repository path was not normalised")
        if CLOCK.sub("<TS>", "at 2026-11-04 03:39:12.5Z ok") != "at <TS> ok":
            failures.append("clock time was not normalised")
    for line in failures:
        print("FAIL", line)
    print("self-test:", "FAIL" if failures else "ok (positive control, changed cell, missing row, path and clock normalisation)")
    return 1 if failures else 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--baseline", type=Path, help="worktree holding the old reseed code")
    ap.add_argument("--candidate", type=Path, help="worktree holding the new reseed code")
    ap.add_argument("--seed-db", type=Path, default=SHARED_DB, help="starting database; copied, never written")
    ap.add_argument("--workdir", type=Path, default=Path("E:/sgs-tmp/identity"))
    ap.add_argument("--plant-difference", action="store_true", help="negative control: plant a database and a file difference and require them to be caught")
    ap.add_argument("--stage", type=int, help="run only this stage in both trees")
    ap.add_argument("--shared-readonly", action="store_true", help="run on the shared database without --db and compare repository files only (report-only stages)")
    ap.add_argument("--reuse", action="store_true", help="compare the databases and trees already in --workdir without reseeding")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not (a.baseline and a.candidate):
        ap.error("--baseline and --candidate are required")
    work = a.workdir
    work.mkdir(parents=True, exist_ok=True)
    db_a, db_b = work / "baseline.db", work / "candidate.db"
    shared_before = sha256(a.seed_db) if a.shared_readonly else ""
    if not a.reuse:
        if a.shared_readonly:
            targets = [(a.baseline, None, work / "baseline.log", a.stage), (a.candidate, None, work / "candidate.log", a.stage)]
        else:
            for db in (db_a, db_b):
                shutil.copy2(a.seed_db, db)
            targets = [(a.baseline, db_a, work / "baseline.log", a.stage), (a.candidate, db_b, work / "candidate.log", a.stage)]
        print("Running both trees side by side...", flush=True)
        with ThreadPoolExecutor(max_workers=2) as pool:
            codes = list(pool.map(lambda args: seed(*args), targets))
        if any(codes):
            print("A reseed itself failed; no comparison is meaningful.")
            return 1
    if a.shared_readonly and sha256(a.seed_db) != shared_before:
        print("INCONCLUSIVE: the shared database changed during the run (a peer reseeded, or the stage wrote to it). Repeat the run.")
        return 1
    planted: list[str] = []
    if a.plant_difference:
        planted = plant(a.candidate, None if a.shared_readonly else db_b)
        print("Planted:", ", ".join(planted))
    db_diffs = [] if a.shared_readonly else compare_dbs(db_a, db_b, [str(a.baseline)], [str(a.candidate)])
    log_diffs = compare_logs(work / "baseline.log", work / "candidate.log", a.baseline, a.candidate) if (a.stage in (None, 12)) else []
    diffs = db_diffs + compare_repos(a.baseline, a.candidate) + log_diffs
    for line in diffs:
        print(line)
    if a.plant_difference:
        caught_table = a.shared_readonly or any(d.startswith("table ") for d in diffs)
        caught_file = any(d.startswith("file ") and "contents differ" in d for d in diffs)
        want_file = any(p.startswith("file ") for p in planted)
        ok = caught_table and (caught_file or not want_file)
        print("NEGATIVE CONTROL:", "both planted differences were caught" if ok else "a planted difference was MISSED")
        return 0 if ok else 1
    print(f"IDENTITY: {'IDENTICAL' if not diffs else str(len(diffs)) + ' difference line(s)'}")
    return 1 if diffs else 0


if __name__ == "__main__":
    sys.exit(main())

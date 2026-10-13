#!/usr/bin/env python3
"""Rebuild the knowledge base from NOTHING and report honestly what returns.

Phase 0 Step 0.5 -- THE phase gate. Creates a sandbox HOME (so every
``Path.home()``-hardcoding script resolves there instead of the live database),
runs ``sgs-update-v2.py --rebuild`` inside it, then compares the result against
live table-by-table.

A shortfall is the EXPECTED result, not a failure to hide: ``property_suffixes``,
``roles`` and ``slots`` are already known to have no
regenerative source -- that is Phase 1's work. Bean's ruling (2026-08-02):
**partial rebuild PASSES provided the shortfalls are written down and carried
forward.** This script writes them down.

The rebuild runs from a throwaway git worktree at HEAD (``--ref`` picks another
commit), never from the shared checkout: ``sgs-update-v2.py --rebuild`` regenerates
tracked files from whatever DB it sees (the property classifier
``behavioural-analyser/css-property-classifications.json``, the ``reports/phase4-*``
reports), and against the empty sandbox DB those come out empty or wrong. In the
worktree they are discarded with it. Only this script's own outputs, the dated
report under ``.claude/reports/`` and ``dbschema/rebuild-comparison.json``, are
written to the shared checkout.

The worktree gets no ``node_modules`` link (a link removed with the worktree has
deleted the shared dependency tree). CommonJS scripts resolve packages through
``NODE_PATH`` (the shared ``plugins/sgs-blocks/node_modules`` and
``scripts/computed-route/node_modules``); the ES-module preset validator ignores
``NODE_PATH``, so ``ajv`` and its dependencies are COPIED into the worktree's
``scripts/computed-route/node_modules``. Before removal the worktree is checked for
reparse points.

    python rebuild_compare.py                 # rebuild at HEAD and compare
    python rebuild_compare.py --ref <commit>  # rebuild at another commit
    python rebuild_compare.py --keep-worktree # leave the worktree for inspection
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
REPO = SCRIPTS.parent.parent.parent
sys.path.insert(0, str(HERE))
from sandbox import sandbox  # noqa: E402

# Known to have no regenerative source -- Phase 1's scope, not Phase 0's.
#
# EMPTIED 2026-08-02 (Phase 1, T1.4). All four original members now regenerate:
# `roles` and `modifier_suffixes` were wired first, then `property_suffixes`
# and `slots` gained data-file seeders in dbschema/seed_reference_data.py
# (captured from live by `dbschema/capture_seed_data.py`, which owns the JSON).
# The set stays declared, not deleted: it is the honest place to record the next
# table that turns out to have no source, and an empty set means every remaining
# empty table lands in the "NOT known" bucket where it gets explained rather than
# waved through.
KNOWN_UNREPRODUCIBLE: set[str] = set()

NOTINT = "name NOT LIKE 'sqlite@_%' ESCAPE '@'"

# The ES-module validator's packages: ajv, ajv-formats and their dependencies.
ESM_PACKAGES = ("ajv", "ajv-formats", "fast-deep-equal", "fast-uri",
                "json-schema-traverse", "require-from-string")


def _git(*args: str, cwd: Path = REPO) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=str(cwd), capture_output=True, text=True)


def _reparse_points(root: Path) -> list[Path]:
    """Every symlink or junction under root (a junction is a reparse point that is not a symlink)."""
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        for name in dirnames + filenames:
            path = Path(dirpath) / name
            if path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction()):
                found.append(path)
        dirnames[:] = [d for d in dirnames if not (Path(dirpath) / d).is_symlink()]
    return found


@contextmanager
def throwaway_worktree(ref: str, keep: bool):
    """A detached worktree at ref with ajv copied in; removed afterwards unless keep."""
    base = Path(os.environ.get("SystemDrive", "C:") + os.sep) if os.name == "nt" else Path(tempfile.gettempdir())
    tree = Path(tempfile.mkdtemp(prefix="sgsrb-", dir=str(base)))
    tree.rmdir()
    add = _git("worktree", "add", "--detach", str(tree), ref)
    if add.returncode != 0:
        raise SystemExit(f"FATAL: git worktree add failed: {add.stderr.strip()}")
    try:
        src = REPO / "scripts" / "computed-route" / "node_modules"
        dest = tree / "scripts" / "computed-route" / "node_modules"
        for pkg in ESM_PACKAGES:
            if (src / pkg).is_dir():
                shutil.copytree(src / pkg, dest / pkg)
        yield tree
    finally:
        if keep:
            print(f"worktree kept: {tree} (remove with: git worktree remove --force {tree})")
        else:
            links = _reparse_points(tree)
            if links:
                print(f"NOT removing {tree}: it holds reparse points {links[:3]}; remove them first", file=sys.stderr)
            else:
                gone = _git("worktree", "remove", "--force", str(tree))
                if gone.returncode != 0:
                    print(f"WARN: could not remove {tree}: {gone.stderr.strip()}", file=sys.stderr)


def counts(db: Path) -> dict[str, int]:
    if not db.exists() or db.stat().st_size == 0:
        return {}
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        names = [r[0] for r in con.execute(
            f"SELECT name FROM sqlite_master WHERE type='table' AND {NOTINT} ORDER BY name")]
        return {n: con.execute(f'SELECT COUNT(*) FROM "{n}"').fetchone()[0] for n in names}
    finally:
        con.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Rebuild the knowledge base from nothing in a sandbox HOME, "
                                     "from a throwaway worktree, and compare it with the live database.")
    parser.add_argument("--ref", default="HEAD", help="commit to rebuild from (default HEAD)")
    parser.add_argument("--keep-worktree", action="store_true", help="leave the throwaway worktree in place")
    opts = parser.parse_args(argv)
    today = datetime.date.today().isoformat()

    live_path = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
    live = counts(live_path)
    live_mtime = live_path.stat().st_mtime_ns
    print(f"live: {len(live)} tables, {sum(live.values())} rows total\n")

    node_path = os.pathsep.join(str(p) for p in (SCRIPTS.parent / "node_modules",
                                                 REPO / "scripts" / "computed-route" / "node_modules"))
    os.environ["NODE_PATH"] = node_path
    with throwaway_worktree(opts.ref, opts.keep_worktree) as tree, sandbox() as run:
        scripts = tree / "plugins" / "sgs-blocks" / "scripts"
        seeder = scripts / "sgs-update-v2.py"
        print(f"worktree     : {tree} ({opts.ref})")
        print(f"sandbox HOME : {run.home}")
        print(f"sandbox DB   : {run.db}")
        print(f"running {seeder.name} --rebuild ...\n")
        proc = run.run(
            [sys.executable, str(seeder), "--rebuild"],
            cwd=str(scripts), timeout=3600,
        )
        stdout, stderr, rc = proc.stdout or "", proc.stderr or "", proc.returncode
        try:
            rebuilt = counts(run.db)
        except sqlite3.DatabaseError as err:
            print(f"FATAL: the rebuilt sandbox DB cannot be read ({err}); rebuild exit code {rc}", file=sys.stderr)
            for label, text in (("stderr", stderr), ("stdout", stdout)):
                print(f"--- last {label} ---", file=sys.stderr)
                print("\n".join(text.strip().splitlines()[-40:]), file=sys.stderr)
            return 3

    if live_path.stat().st_mtime_ns != live_mtime:
        print("FATAL: the LIVE database changed during the rebuild.", file=sys.stderr)
        return 2

    print(f"rebuild exit code: {rc}")
    if rc != 0:
        print("--- last stderr ---")
        print("\n".join(stderr.strip().splitlines()[-25:]))
        print("--- last stdout ---")
        print("\n".join(stdout.strip().splitlines()[-25:]))

    live_t, rb_t = set(live), set(rebuilt)
    missing_tables = sorted(live_t - rb_t)
    extra_tables = sorted(rb_t - live_t)

    identical, short, over, empty_known, empty_unknown = [], [], [], [], []
    for t in sorted(live_t & rb_t):
        lv, rv = live[t], rebuilt[t]
        if rv == lv:
            identical.append((t, lv))
        elif rv == 0:
            (empty_known if t in KNOWN_UNREPRODUCIBLE else empty_unknown).append((t, lv))
        elif rv < lv:
            short.append((t, lv, rv))
        else:
            over.append((t, lv, rv))

    print(f"\n{'='*66}")
    print(f"  TABLE SET : live {len(live_t)} | rebuilt {len(rb_t)}")
    print(f"  missing   : {missing_tables or 'none'}")
    print(f"  extra     : {extra_tables or 'none'}")
    print(f"{'='*66}")
    print(f"  identical row counts     : {len(identical)}")
    print(f"  short of live            : {len(short)}")
    print(f"  MORE than live           : {len(over)}")
    print(f"  empty (known Phase-1)    : {len(empty_known)}")
    print(f"  empty (NOT known)        : {len(empty_unknown)}")
    print(f"{'='*66}\n")

    if empty_unknown:
        print("EMPTY BUT NOT A KNOWN GAP -- these need explaining:")
        for t, lv in empty_unknown:
            print(f"  {t:38} live={lv:>6}  rebuilt=0")
        print()
    if short:
        print("SHORT OF LIVE:")
        for t, lv, rv in short:
            print(f"  {t:38} live={lv:>6}  rebuilt={rv:>6}")
        print()

    report = REPO / ".claude" / "reports" / f"{today}-db-rebuild-comparison.md"
    report.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "---", "doc_type: report", "project: small-giants-wp",
        f"created: {today}", "phase: Phase 0 Step 0.5 — rebuild-from-empty", "---", "",
        "# Rebuild-from-empty comparison",
        "",
        f"`sgs-update-v2.py --rebuild` at `{opts.ref}`, from a throwaway worktree, run against an EMPTY database "
        "inside a sandbox HOME (so every `Path.home()`-hardcoding script resolved there, never at the live file; "
        "the live database's mtime was confirmed unchanged afterwards).",
        "",
        f"**Rebuild exit code: {rc}**",
        "",
        "## Headline",
        "",
        f"| | live | rebuilt |",
        f"|---|---|---|",
        f"| tables | {len(live_t)} | {len(rb_t)} |",
        f"| total rows | {sum(live.values())} | {sum(rebuilt.values())} |",
        "",
        f"- Missing tables: {missing_tables or '**none**'}",
        f"- Extra tables: {extra_tables or '**none**'}",
        f"- Tables with identical row counts: **{len(identical)}**",
        f"- Short of live: **{len(short)}**",
        f"- Empty, known Phase-1 gaps: **{len(empty_known)}**",
        f"- Empty, NOT a known gap: **{len(empty_unknown)}**",
        "",
    ]
    if empty_unknown:
        lines += ["## ⚠ Empty but NOT a known gap", "",
                  "These were not on the Phase-1 list and need explaining before Phase 1 starts.",
                  "", "| table | live rows |", "|---|---|"]
        lines += [f"| `{t}` | {lv} |" for t, lv in empty_unknown]
        lines.append("")
    if empty_known:
        lines += ["## Empty — known, carried to Phase 1", "",
                  "Already established as having no regenerative source. This is Phase 1's scope.",
                  "", "| table | live rows |", "|---|---|"]
        lines += [f"| `{t}` | {lv} |" for t, lv in empty_known]
        lines.append("")
    if short:
        lines += ["## Short of live", "", "| table | live | rebuilt | shortfall |", "|---|---|---|---|"]
        lines += [f"| `{t}` | {lv} | {rv} | {lv-rv} |" for t, lv, rv in short]
        lines.append("")
    if over:
        lines += ["## MORE rows than live", "",
                  "Worth a look: the rebuild produced rows live does not have.",
                  "", "| table | live | rebuilt |", "|---|---|---|"]
        lines += [f"| `{t}` | {lv} | {rv} |" for t, lv, rv in over]
        lines.append("")
    lines += ["## Identical", "",
              f"{len(identical)} tables reproduced with exactly matching row counts.", "",
              "<details><summary>Full list</summary>", "",
              "| table | rows |", "|---|---|"]
    lines += [f"| `{t}` | {lv} |" for t, lv in identical]
    lines += ["", "</details>", ""]
    report.write_text("\n".join(lines), encoding="utf-8")
    print(f"report written: {report}")

    json_out = HERE / "rebuild-comparison.json"
    json_out.write_text(json.dumps({
        "generated_at": today, "ref": opts.ref, "rebuild_exit_code": rc,
        "live_counts": live, "rebuilt_counts": rebuilt,
        "missing_tables": missing_tables, "extra_tables": extra_tables,
        "empty_unknown": [t for t, _ in empty_unknown],
        "empty_known": [t for t, _ in empty_known],
        "short": [{"table": t, "live": lv, "rebuilt": rv} for t, lv, rv in short],
    }, indent=2) + "\n", encoding="utf-8")
    print(f"json written  : {json_out}")

    # Bean's ruling: partial PASSES if written down. Table-set parity is the bar.
    ok = not missing_tables and rc == 0
    print(f"\nGATE (table-set parity + clean exit): {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

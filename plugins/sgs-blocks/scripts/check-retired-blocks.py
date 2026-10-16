#!/usr/bin/env python3
"""check-retired-blocks.py -- a block that has been removed leaves no trace in live sources or the framework DB.

A removed `sgs/<slug>` block keeps turning up as a name in comments, baselines, caches, fixtures and DB rows. Each is stale
text the next reader has to explain. This check lists every trace of a retired slug.

LIVE SOURCES scanned (the git index, i.e. what the next commit and the deploy's checkout contain): plugins/ (minus build output, dependencies, caches, dated reports and generated tool indexes), scripts/,
theme/, sites/, and the live docs under .claude/ (specs, plans, rules, the top-level docs and the generated catalogues).
NOT scanned, because they are history and git holds the rest: dated reports and backups, session memory, scratch output,
pipeline-state, worktrees, build output.
DB: any row in any table of the framework DB whose block-slug column names a retired block.

Usage:
    python scripts/check-retired-blocks.py --survey         list every trace, file:line or table.column
    python scripts/check-retired-blocks.py --check          exit 1 when a trace remains in live sources
    python scripts/check-retired-blocks.py --check --with-db   also exit 1 when a DB row remains (the seeder's stage 9 prunes them)
    python scripts/check-retired-blocks.py --self-test      exit 1 when the detector itself is wrong
"""
from __future__ import annotations

import argparse
import os
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parent.parent
REPO = PLUGIN.parent.parent

# Retired block slugs (bare, without `sgs/`), each with the date it was removed. Only ever grows.
RETIRED = {
    "adaptive-nav": "2026-07-22",
    "announcement-bar": "2026-06-11",
    "certification-bar": "2026-05-29",
    "content-collection": "2026-08-08",
    "cta-section": "2026-10-09",
    "divider": "2026-07-05",
    "mega-menu": "2026-07-22",
    "mobile-nav": "2026-07-14",
    "mobile-nav-toggle": "2026-07-14",
    "nav-menu": "2026-09-14",
    "svg-background": "2026-05-29",
    "trust-badges": "2026-06-01",
}

# Directory names never entered, anywhere.
SKIP_DIRS = {
    "node_modules", ".git", "vendor", "worktrees", "__pycache__", ".mypy_cache", ".pytest_cache", ".phpunit.cache",
    "toolindex",
}
# Paths (relative to the repo, forward slashes) that are history or generated output, so are not live sources.
SKIP_PREFIXES = (
    "plugins/sgs-blocks/reports/", "plugins/sgs-blocks/build/",
    ".claude/reports/", ".claude/backups/", ".claude/memory/", ".claude/scratch/", ".claude/archive/",
    ".claude/verify/", ".claude/plans/archive/", ".claude/specs/archive/", ".claude/catalogues/archive/",
    ".superpowers/", "pipeline-state/",
)
# A client draft lives unchanged under sites/<client>/: its export (a folder starting design_handoff), its handoff folder
# (Spec 48A) and its mockups. They are the client's input, not framework sources.
SKIP_CONTAINS = ("/design_handoff", "/handoff/", "Handoff/", "/mockups/")
LIVE_ROOTS = ("plugins", "scripts", "theme", "sites", ".claude")
TEXT_SUFFIXES = {".php", ".js", ".mjs", ".cjs", ".json", ".py", ".md", ".css", ".scss", ".html", ".txt", ".yml", ".yaml", ".sql", ".sh"}
MAX_BYTES = 3_000_000


def db_path() -> Path:
    env = os.environ.get("SGS_FRAMEWORK_DB")
    if env:
        return Path(env)
    for root in (".claude", ".agents"):
        candidate = Path.home() / root / "skills" / "sgs-wp-engine" / "sgs-framework.db"
        if candidate.exists():
            return candidate
    return Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


# Slugs distinctive enough to count without the `sgs/` or `sgs-` prefix. The others are ordinary words or names core and
# the theme also use (divider, nav-menu, mobile-nav), so only their block name `sgs/<slug>` and class root `sgs-<slug>` count.
BARE_SLUGS = {"cta-section"}


def pattern() -> re.Pattern:
    prefixed = "|".join(re.escape(n) for n in sorted(RETIRED))
    bare = "|".join(re.escape(n) for n in sorted(BARE_SLUGS))
    return re.compile(rf"(?<![A-Za-z0-9_-])(?:sgs(?:\\?/|-)(?:{prefixed})|{bare})(?![A-Za-z0-9]|-[A-Za-z0-9])")


def scan_text(text: str, rx: re.Pattern) -> list[int]:
    """1-based line numbers of every line naming a retired slug."""
    return [i for i, line in enumerate(text.splitlines(), 1) if rx.search(line)]


def tracked_files() -> list[str]:
    """Repo-relative paths git tracks under the live roots (so the answer is the same on any checkout)."""
    out = subprocess.run(["git", "ls-files", "-z", "--", *LIVE_ROOTS], cwd=REPO, capture_output=True, check=True).stdout
    return [p for p in out.decode("utf-8", errors="replace").split(chr(0)) if p]


def is_live(rel: str) -> bool:
    parts = rel.split("/")
    if any(part in SKIP_DIRS for part in parts):
        return False
    return not (any(rel.startswith(p) for p in SKIP_PREFIXES) or any(c in rel for c in SKIP_CONTAINS))


def file_traces() -> list[str]:
    """Traces in what git will commit (the index), so a local run matches the deploy's clean checkout: a tracked file that is
    deleted only in the working tree still counts until the deletion is committed."""
    rx = pattern()
    slugs = {n for n in RETIRED}
    out = []
    for rel in tracked_files():
        if is_live(rel) and rel != "plugins/sgs-blocks/scripts/check-retired-blocks.py" and slugs.intersection(rel.split("/")):
            out.append(f"{rel}  (name)")
    found = subprocess.run(
        ["git", "grep", "--cached", "-n", "-I", "-P", rx.pattern, "--", *LIVE_ROOTS],
        cwd=REPO, capture_output=True,
    )
    if found.returncode not in (0, 1):  # 1 = no match; anything else is a git failure, never a silent pass
        raise SystemExit(f"[check-retired-blocks] git grep failed: {found.stderr.decode('utf-8', errors='replace')[:300]}")
    for line in found.stdout.decode("utf-8", errors="replace").splitlines():
        rel, _, rest = line.partition(":")
        number = rest.partition(":")[0]
        if is_live(rel) and rel != "plugins/sgs-blocks/scripts/check-retired-blocks.py" and Path(rel).suffix.lower() in TEXT_SUFFIXES:
            out.append(f"{rel}:{number}")
    return out


def db_traces() -> list[str]:
    path = db_path()
    if not path.exists():
        raise SystemExit(f"[check-retired-blocks] framework DB not found: {path}")
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    out = []
    try:
        for (table,) in con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
            for _, col, ctype, *_ in con.execute(f"PRAGMA table_info({table})").fetchall():
                if not re.search(r"slug|block|parent|wraps|replaces", col):
                    continue
                for name in RETIRED:
                    try:
                        n = con.execute(f"SELECT count(*) FROM {table} WHERE {col} = ? OR {col} = ?", (f"sgs/{name}", name)).fetchone()[0]
                    except sqlite3.Error:
                        continue
                    if n:
                        out.append(f"DB {table}.{col}: {n} row(s) for {name}")
    finally:
        con.close()
    return out


def self_test() -> int:
    failures = []
    rx = pattern()
    need = lambda name, ok: None if ok else failures.append(name)  # noqa: E731
    need("matches the slug", scan_text("see sgs/cta-section here", rx) == [1])
    need("matches the bare slug", scan_text("(container, cta-section, hero)", rx) == [1])
    need("does not match a longer name", scan_text("whatsapp-cta-section-x and my-cta-section", rx) == [])
    need("does not match another slug", scan_text("sgs/cta-banner", rx) == [])
    need("matches a prefixed slug", scan_text("block sgs/divider here", rx) == [1])
    need("matches a JSON-escaped block name", scan_text(r'"name": "sgs\/divider"', rx) == [1])
    need("matches a class root with an element", scan_text(".sgs-nav-menu__link", rx) == [1])
    need("does not match a bare ordinary word", scan_text("a divider and a nav-menu and mobile-nav", rx) == [])
    need("does not match a live longer name", scan_text("sgs-nav-menu-panels and sgs/divider-x", rx) == [])
    need("reports each line", scan_text("a\ncta-section\nb\nsgs/cta-section", rx) == [2, 4])
    need("register has dates", all(RETIRED.values()))
    print('{"selfTest": true, "failures": %s}' % failures)
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--survey", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--with-db", action="store_true", help="With --check: also fail on framework DB rows of a retired block.")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    files = file_traces()
    db = db_traces() if (args.survey or args.with_db) else []
    if args.survey:
        for line in files + db:
            print(line)
        print(f"traces: {len(files)} in live sources, {len(db)} in the framework DB")
        return 0
    if files or db:
        print(f"[check-retired-blocks] FAIL: {len(files)} trace(s) in live sources, {len(db)} in the framework DB")
        for line in (files + db)[:40]:
            print("  " + line)
        if len(files) + len(db) > 40:
            print(f"  ... and {len(files) + len(db) - 40} more (run --survey)")
        return 1
    scope = "live sources and the framework DB" if args.with_db else "live sources"
    print(f"[check-retired-blocks] OK -- no trace of {len(RETIRED)} retired block(s) in {scope}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

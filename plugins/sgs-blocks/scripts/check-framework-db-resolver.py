#!/usr/bin/env python3
"""check-framework-db-resolver.py - every script a reseed runs asks lib/framework_db for its database.

`sgs-update-v2.py --db <copy>` points the whole reseed at a database copy through $SGS_FRAMEWORK_DB. A child script
that builds the shared database path by hand (`Path.home() / ".claude" / "skills" / "sgs-wp-engine" / ...`) and never
reads the variable would open the shared database instead, so the guard in sgs-update-v2.py skips it and the reseed
silently runs without it. This gate finds those scripts before they ship.

Scope: sgs-update-v2.py and every script it names, followed transitively (a script that runs sub-gates brings them
in), all under plugins/sgs-blocks/scripts/ and outside migrations/, tests/ and node_modules/. A script is in
violation when its code (comments and docstrings removed) names the shared database path and neither reads
SGS_FRAMEWORK_DB nor uses framework_db_path() / frameworkDbPath().

  python plugins/sgs-blocks/scripts/check-framework-db-resolver.py --survey
  python plugins/sgs-blocks/scripts/check-framework-db-resolver.py --check      # exit 1 on a violation
  python plugins/sgs-blocks/scripts/check-framework-db-resolver.py --self-test  # fixtures incl. negative controls
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "lib"))
from framework_db import builds_default_db_by_hand, code_of, javascript_code, python_code  # noqa: E402

ROOT_SCRIPT = "sgs-update-v2.py"
MAX_DEPTH = 2
EXCLUDED_DIRS = {"migrations", "tests", "node_modules", "__pycache__"}
SCRIPT_EXTENSIONS = (".py", ".js", ".mjs")
TOKEN = re.compile(r"""[\w./-]+\.(?:py|js|mjs)\b""")


def candidates(scripts_dir: Path) -> dict[str, list[Path]]:
    by_name: dict[str, list[Path]] = {}
    for path in scripts_dir.rglob("*"):
        if path.suffix in SCRIPT_EXTENSIONS and path.is_file() and not (EXCLUDED_DIRS & set(path.relative_to(scripts_dir).parts)):
            by_name.setdefault(path.name, []).append(path)
    return by_name


def reseed_children(scripts_dir: Path) -> list[Path]:
    """The root script, the scripts its code names, and the scripts those name in turn (two levels), in a stable order.

    Only names in code count (comments and docstrings are removed first); a script a sub-gate runner starts is a
    grandchild, which is as deep as the reseed's own sub-gates (run-consistency-gates.py, db-consistency/run.py) go."""
    by_name = candidates(scripts_dir)
    root = scripts_dir / ROOT_SCRIPT
    seen, frontier = {root}, [root]
    for _ in range(MAX_DEPTH):
        following: list[Path] = []
        for current in frontier:
            for token in TOKEN.findall(code_of(current)):
                for found in by_name.get(Path(token).name, []):
                    if found not in seen:
                        seen.add(found)
                        following.append(found)
        frontier = following
    return sorted(seen)


def violations(files: list[Path]) -> list[Path]:
    return [f for f in files if builds_default_db_by_hand(code_of(f))]


def self_test() -> int:
    blind_py = 'from pathlib import Path\nDB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"\n'
    cases = [
        ("python: path built by hand is a violation", python_code(blind_py), True),
        ("python: path only in a comment is clean", python_code('# ~/.claude/skills/sgs-wp-engine/x\nx = 1\n'), False),
        ("python: path only in a docstring is clean", python_code('"""Reads ~/.claude/skills/sgs-wp-engine/db."""\nx = 1\n'), False),
        ("python: resolver call is clean", python_code("from framework_db import framework_db_path\nDB = framework_db_path()\n"), False),
        ("python: reading the variable is clean", python_code(blind_py + 'import os\nos.environ.get("SGS_FRAMEWORK_DB")\n'), False),
        ("js: path built by hand is a violation", javascript_code("const p = path.join(os.homedir(), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db');"), True),
        ("js: path only in a comment is clean", javascript_code("// ~/.claude/skills/sgs-wp-engine\nconst x = 1;"), False),
        ("js: url with slashes does not hide a later violation", javascript_code("const u = 'http://x'; const p = '.agents/skills/sgs-wp-engine/db';"), True),
        ("js: resolver call is clean", javascript_code("const { frameworkDbPath } = require('./lib/framework-db');"), False),
    ]
    failed = 0
    for name, code, want in cases:
        got = builds_default_db_by_hand(code)
        failed += got != want
        print(f"  {'ok  ' if got == want else 'FAIL'} {name}")
    children = reseed_children(HERE)
    in_scope = ROOT_SCRIPT in {c.name for c in children} and len(children) > 5
    failed += not in_scope
    print(f"  {'ok  ' if in_scope else 'FAIL'} the closure from {ROOT_SCRIPT} finds {len(children)} scripts")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    children = reseed_children(HERE)
    bad = violations(children)
    print(f"{len(children)} script(s) in the reseed's closure; {len(bad)} build the shared database path by hand")
    for path in bad:
        print(f"  {path.relative_to(HERE).as_posix()}")
    if a.check and bad:
        print("FAIL: use lib/framework_db.py framework_db_path() (Python) or lib/framework-db.js frameworkDbPath() (JavaScript).")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

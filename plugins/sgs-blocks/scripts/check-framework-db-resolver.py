#!/usr/bin/env python3
"""check-framework-db-resolver.py - every script a reseed runs asks lib/framework_db for its database.

`sgs-update-v2.py --db <copy>` points the whole reseed at a database copy through $SGS_FRAMEWORK_DB. A child script
that builds the shared database path by hand (`Path.home() / ".claude" / "skills" / "sgs-wp-engine" / ...`) and never
reads the variable would open the shared database instead, so the guard in sgs-update-v2.py skips it and the reseed
silently runs without it. This gate finds those scripts before they ship.

Scope: every live script under plugins/sgs-blocks/scripts/ and the repository's scripts/ folder, outside migrations/,
tests/, fixtures/ and node_modules/ (dated migrations run once and tests build their own databases). The reseed
closure (sgs-update-v2.py and every script it names, followed transitively, a script that runs sub-gates bringing them
in) is part of that scope and is reported separately, because a closure script a `--db` run would otherwise skip is the
costlier failure. A script is in violation when its code (comments and docstrings removed) names the shared database
path and neither reads SGS_FRAMEWORK_DB nor uses framework_db_path() / frameworkDbPath(), or when it builds a path to
the shared database, a skill folder or the `db data` folder under a hard-coded ~/.claude or ~/.agents root even though it
reads SGS_FRAMEWORK_DB (ask framework_db_path(), skill_dir(), skills_root() or shared_csv_dir() in lib/framework_db.py,
or the twins in lib/framework-db.js, so a folder move is a one-file change).

  python plugins/sgs-blocks/scripts/check-framework-db-resolver.py --survey
  python plugins/sgs-blocks/scripts/check-framework-db-resolver.py --survey-all  # every script under scripts/, reseed or not
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
from framework_db import RESOLVER_FILES, builds_default_db_by_hand, builds_skill_path_by_hand, code_of, hand_built_skill_lines, javascript_code, python_code  # noqa: E402

ROOT_SCRIPT = "sgs-update-v2.py"
MAX_DEPTH = 2
EXCLUDED_DIRS = {"migrations", "tests", "node_modules", "__pycache__"}
LIVE_EXCLUDED_DIRS = EXCLUDED_DIRS | {"fixtures"}
REPO_SCRIPTS = HERE.parents[2] / "scripts"
SCRIPT_EXTENSIONS = (".py", ".js", ".mjs")
TOKEN = re.compile(r"""[\w./-]+\.(?:py|js|mjs)\b""")


def candidates(scripts_dir: Path) -> dict[str, list[Path]]:
    by_name: dict[str, list[Path]] = {}
    for path in scripts_dir.rglob("*"):
        if path.suffix in SCRIPT_EXTENSIONS and path.is_file() and not (EXCLUDED_DIRS & set(path.relative_to(scripts_dir).parts)):
            by_name.setdefault(path.name, []).append(path)
    return by_name


PY_IMPORT = re.compile(r"^\s*(?:from\s+([\w.]+)\s+import\s+([\w, *]+)|import\s+([\w., ]+))", re.MULTILINE)
JS_IMPORT = re.compile(r"""(?:require\(\s*|from\s+|import\s*\(\s*)['"](\.[^'"]+)['"]""")


def imported_files(path: Path, by_name: dict[str, list[Path]]) -> list[Path]:
    """Local scripts that `path` imports: `import helper` / `from lib.helper import x` (a module name matches helper.py or
    helper-with-hyphens.py by stem) and `require('./helper')` / `from './helper.js'`."""
    code = code_of(path)
    stems: set[str] = set()
    if path.suffix == ".py":
        for match in PY_IMPORT.finditer(code):
            for module in ([match.group(1)] if match.group(1) else []) + (match.group(2) or "").split(",") + (match.group(3) or "").split(","):
                module = module.strip().split(" as ")[0].strip()
                if module and module != "*":
                    stems.update({part for part in module.split(".") if part})
    else:
        for match in JS_IMPORT.finditer(code):
            stems.add(Path(match.group(1)).stem)
    found: list[Path] = []
    for name, paths in by_name.items():
        stem = Path(name).stem
        if stem in stems or stem.replace("-", "_") in stems:
            found.extend(paths)
    return found


def reseed_children(scripts_dir: Path) -> list[Path]:
    """The root script, the scripts its code names, the scripts those name in turn (two levels) and every module any of
    them imports, in a stable order.

    Only names in code count (comments and docstrings are removed first); a script a sub-gate runner starts is a
    grandchild, which is as deep as the reseed's own sub-gates (run-consistency-gates.py, db-consistency/run.py) go."""
    by_name = candidates(scripts_dir)
    root = scripts_dir / ROOT_SCRIPT
    seen, frontier = {root}, [root]

    def add_imports(files: list[Path]) -> None:
        """Every module a reached script imports is reached too, however deep: an imported helper opens the same database."""
        pending = list(files)
        while pending:
            for found in imported_files(pending.pop(), by_name):
                if found not in seen:
                    seen.add(found)
                    pending.append(found)

    add_imports([root])
    for _ in range(MAX_DEPTH):
        following: list[Path] = []
        for current in frontier:
            for token in TOKEN.findall(code_of(current)):
                for found in by_name.get(Path(token).name, []):
                    if found not in seen:
                        seen.add(found)
                        following.append(found)
        add_imports(following)
        frontier = following
    return sorted(seen)


def live_scripts(roots: list[Path]) -> list[Path]:
    """Every live script under the roots: no dated migrations, tests, fixtures or installed packages."""
    found: set[Path] = set()
    for root in roots:
        if root.is_dir():
            found.update(p for p in root.rglob("*") if p.suffix in SCRIPT_EXTENSIONS and p.is_file() and not (LIVE_EXCLUDED_DIRS & set(p.relative_to(root).parts)))
    return sorted(found)


def violations(files: list[Path]) -> list[Path]:
    return [f for f in files if f.name not in RESOLVER_FILES and f.resolve() != Path(__file__).resolve() and (builds_default_db_by_hand(code_of(f)) or builds_skill_path_by_hand(code_of(f)))]


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
        ("python: a message that only names the file is clean", python_code("print('sgs-framework.db - refusing to continue')\n"), False),
        ("python: a bare import of the resolver without a call is still a violation", python_code("from framework_db import framework_db_path\nDB = '.claude/skills/sgs-wp-engine/sgs-framework.db'\n"), True),
        ("python: a path ending in the database file is a violation", python_code("DB = 'x/sgs-framework.db'\n"), True),
    ]
    hand = [
        ("python: home / .claude / skills built by hand is a violation even when it reads the variable", python_code('import os\nDB = Path(os.environ.get("SGS_FRAMEWORK_DB") or Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "x.db")\n'), True),
        ("python: a root loop over .claude and .agents is a violation", python_code('for root in (".claude", ".agents"):\n    candidate = Path.home() / root / "skills"\n'), True),
        ("python: a db data folder under home is a violation", python_code('CSV = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "db data"\n'), True),
        ("python: a path split over two lines is a violation", python_code('P = Path.home() / ".claude" / (\n    "skills")\n'), True),
        ("python: expanduser of a ~/.claude/skills string is a violation", python_code('os.path.expanduser("~/.claude/skills/a")\n'), True),
        ("js: homedir join of .claude and skills is a violation", javascript_code("path.join(os.homedir(), '.claude', 'skills', 'x')"), True),
        ("python: the repository's own .claude/skills is clean", python_code('P = REPO / ".claude" / "skills" / "migration-method"\n'), False),
        ("python: a home .claude secrets file is clean", python_code('P = Path.home() / ".claude/secrets/api-keys.env"\n'), False),
        ("python: a skill_dir() call is clean", python_code('from framework_db import skill_dir\nP = skill_dir("x") / "data"\n'), False),
        ("python: a comment naming the old path is clean", python_code('# ~/.agents/skills/x\nx = 1\n'), False),
    ]
    failed = 0
    for name, code, want in hand:
        got = builds_skill_path_by_hand(code)
        failed += got != want
        print(f"  {'ok  ' if got == want else 'FAIL'} {name}")
    for name, code, want in cases:
        got = builds_default_db_by_hand(code)
        failed += got != want
        print(f"  {'ok  ' if got == want else 'FAIL'} {name}")
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        scripts = Path(tmp)
        (scripts / ROOT_SCRIPT).write_text("import helper_mod\nfrom pathlib import Path\n", encoding="utf-8")
        (scripts / "helper_mod.py").write_text("DB = '.claude/skills/sgs-wp-engine/sgs-framework.db'\n", encoding="utf-8")
        (scripts / "unrelated.py").write_text("DB = '.claude/skills/sgs-wp-engine/sgs-framework.db'\n", encoding="utf-8")
        reached = {c.name for c in reseed_children(scripts)}
        followed = reached == {ROOT_SCRIPT, "helper_mod.py"}
        flagged = {v.name for v in violations(reseed_children(scripts))} == {"helper_mod.py"}
        for label, ok in (("an imported helper is in the closure and an unrelated script is not", followed), ("an imported helper that builds the path by hand is flagged", flagged)):
            failed += not ok
            print(f"  {'ok  ' if ok else 'FAIL'} {label}")
        (scripts / "tests").mkdir()
        (scripts / "tests" / "test_x.py").write_text("DB = '.claude/skills/sgs-wp-engine/sgs-framework.db'\n", encoding="utf-8")
        (scripts / "clean.py").write_text("from framework_db import framework_db_path\nDB = framework_db_path()\n", encoding="utf-8")
        planted = {v.name for v in violations(live_scripts([scripts]))} == {"helper_mod.py", "unrelated.py"}
        clean = "clean.py" not in {v.name for v in violations(live_scripts([scripts]))}
        for label, ok in (("a live script outside the closure that builds the path by hand is flagged (a test is not)", planted), ("a live script that uses the resolver is clean", clean)):
            failed += not ok
            print(f"  {'ok  ' if ok else 'FAIL'} {label}")
    children = reseed_children(HERE)
    in_scope = ROOT_SCRIPT in {c.name for c in children} and len(children) > 5
    failed += not in_scope
    print(f"  {'ok  ' if in_scope else 'FAIL'} the closure from {ROOT_SCRIPT} finds {len(children)} scripts")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", action="store_true")
    mode.add_argument("--survey-all", action="store_true", help="the worklist for widening the gate: every script under scripts/ that builds the path by hand")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    children = reseed_children(HERE)
    if a.survey_all:
        in_closure = set(children)
        everywhere = sorted(p for p in HERE.rglob("*") if p.suffix in SCRIPT_EXTENSIONS and p.is_file() and not ({"node_modules", "__pycache__"} & set(p.relative_to(HERE).parts)))
        rows = violations(everywhere)
        groups = {
            "reseed closure": [p for p in rows if p in in_closure],
            "dated migrations (run once, leave as they are)": [p for p in rows if p not in in_closure and "migrations" in p.relative_to(HERE).parts],
            "tests": [p for p in rows if p not in in_closure and "tests" in p.relative_to(HERE).parts],
        }
        grouped = {p for paths in groups.values() for p in paths}
        groups["live scripts outside the closure (the worklist)"] = [p for p in rows if p not in grouped]
        for label, paths in groups.items():
            print(f"{label}: {len(paths)}")
            for path in paths:
                print(f"  {path.relative_to(HERE).as_posix()}")
        return 0
    scope = sorted(set(children) | set(live_scripts([HERE, REPO_SCRIPTS])))
    bad = violations(scope)
    print(f"{len(children)} script(s) in the reseed's closure, {len(scope)} in scope; {len(bad)} build a shared database or skill path by hand")
    for path in bad:
        print(f"  {path.relative_to(HERE).as_posix() if HERE in path.parents else path.relative_to(HERE.parents[2]).as_posix()}")
    if a.check and bad:
        print("FAIL: use lib/framework_db.py framework_db_path() (Python) or lib/framework-db.js frameworkDbPath() (JavaScript).")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

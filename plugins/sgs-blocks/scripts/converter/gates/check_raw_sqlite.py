"""check_raw_sqlite.py — AST gate: no converter/ file opens sqlite3 directly.

Design ref: FR-31-8 (DB accessor layer, R-31-1 extension) — every DB read in
converter/ goes through the named, cached accessors in ``converter/db/db_lookup.py``
(or ``db_lookup.get_connection()`` for the rare call site that needs an open
connection object to pass across the resolver dispatch call graph — see
``converter/services/css_pass.py`` / ``converter/services/fold_helpers.py``).
A raw ``sqlite3.connect(...)`` call anywhere else under ``converter/`` is a
bypass of that layer: it re-introduces a second, un-cached, un-named DB-access
path this gate exists to close (mirrors the ``import_ban.py`` freeze-callback
closure — same shape, different backdoor).

WHAT IT REJECTS
    Any call whose callee resolves to ``sqlite3.connect`` — as a direct
    attribute call (``sqlite3.connect(...)``) or via an aliased import
    (``import sqlite3 as db; db.connect(...)`` / ``from sqlite3 import connect;
    connect(...)``) — anywhere under ``converter/`` EXCEPT the one file that
    IS the accessor layer (``converter/db/db_lookup.py``) and test files
    (which may legitimately open throwaway connections to seed fixtures).

SCOPE
    All of converter/ recursively, EXCLUDING:
      - this gates/ dir (gate scripts may name sqlite3 in docstrings/checks)
      - converter/db/db_lookup.py (the accessor layer itself)
      - test files (``test_*.py`` or anything under a ``tests/`` dir)

CLI (run from plugins/sgs-blocks/scripts):
    python converter/gates/check_raw_sqlite.py --report          # list, exit 0
    python converter/gates/check_raw_sqlite.py --check            # exit 2 on NEW (not in baseline)
    python converter/gates/check_raw_sqlite.py --update-baseline  # rewrite baseline

Violation identity key = (relpath, sha256(file-source)) — same convention as
``import_ban.py`` (STOP-19: never key a baseline on a line number).
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_HERE = Path(__file__).resolve().parent       # scripts/converter/gates/
_CONVERTER = _HERE.parent                      # scripts/converter/
_BASELINE = _HERE / "raw-sqlite-baseline.json"

# The one file that IS the accessor layer — permitted to call sqlite3.connect
# directly (everything else must call through it).
_ACCESSOR_LAYER_RELPATH = str(Path("db") / "db_lookup.py")


def _is_test_file(path: Path) -> bool:
    return path.name.startswith("test_") or "tests" in {p.name for p in path.parents}


def _violation_key(rel: str, src: str) -> str:
    h = hashlib.sha256(src.encode("utf-8")).hexdigest()[:16]
    return f"{rel}::{h}"


class _SqliteImportTracker(ast.NodeVisitor):
    """Track which local names refer to the ``sqlite3`` module or its
    ``connect`` function, including aliased imports, so ``db.connect(...)``
    and ``from sqlite3 import connect as c; c(...)`` are both caught."""

    def __init__(self) -> None:
        self.module_names: set[str] = set()   # names bound to the sqlite3 module
        self.connect_names: set[str] = set()  # names bound directly to sqlite3.connect

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            if alias.name == "sqlite3":
                self.module_names.add(alias.asname or alias.name)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.module == "sqlite3":
            for alias in node.names:
                if alias.name == "connect":
                    self.connect_names.add(alias.asname or alias.name)
        self.generic_visit(node)


def _find_violations_in_tree(tree: ast.AST) -> list[dict]:
    tracker = _SqliteImportTracker()
    tracker.visit(tree)
    findings: list[dict] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        fn = node.func
        is_raw_connect = False
        if isinstance(fn, ast.Attribute) and fn.attr == "connect":
            if isinstance(fn.value, ast.Name) and fn.value.id in tracker.module_names:
                is_raw_connect = True
        elif isinstance(fn, ast.Name) and fn.id in tracker.connect_names:
            is_raw_connect = True
        if is_raw_connect:
            findings.append({
                "line": getattr(node, "lineno", 0),
                "src": ast.unparse(node),
            })
    return findings


def run(converter_dir: Path | None = None) -> list[dict]:
    root = converter_dir if converter_dir is not None else _CONVERTER
    violations: list[dict] = []
    for py in sorted(root.rglob("*.py")):
        if py.parent.name == "gates" or _is_test_file(py):
            continue
        rel = str(py.relative_to(root))
        if rel == _ACCESSOR_LAYER_RELPATH:
            continue
        try:
            tree = ast.parse(py.read_text(encoding="utf-8", errors="replace"), filename=str(py))
        except SyntaxError:
            continue
        for f in _find_violations_in_tree(tree):
            violations.append({
                "key": _violation_key(rel, f["src"]),
                "file": rel,
                "line": f["line"],
                "src": f["src"],
                "detail": (
                    f"converter/{rel}:{f['line']} opens sqlite3 directly — "
                    f"`{f['src']}`. Every DB access under converter/ routes through "
                    f"converter.db.db_lookup — use an existing accessor, add a new "
                    f"named/cached one, or (only if an open connection object must be "
                    f"passed across the resolver dispatch call graph) "
                    f"db_lookup.get_connection() (FR-31-8)."
                ),
            })
    return violations


def _load_baseline() -> set[str]:
    if not _BASELINE.exists():
        return set()
    try:
        return set(json.loads(_BASELINE.read_text(encoding="utf-8")).get("keys", []))
    except Exception:
        return set()


def _save_baseline(keys: set[str]) -> None:
    _BASELINE.write_text(
        json.dumps({"keys": sorted(keys)}, indent=2) + "\n", encoding="utf-8"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    g = parser.add_mutually_exclusive_group()
    g.add_argument("--report", action="store_true")
    g.add_argument("--check", action="store_true")
    g.add_argument("--update-baseline", action="store_true")
    args = parser.parse_args(argv)

    violations = run()

    if args.update_baseline:
        _save_baseline({v["key"] for v in violations})
        print(f"[check-raw-sqlite] baseline updated — {len(violations)} key(s).")
        return 0

    if args.check:
        baseline = _load_baseline()
        new = [v for v in violations if v["key"] not in baseline]
        if new:
            print(f"[check-raw-sqlite] {len(new)} NEW raw sqlite3.connect() call(s):")
            for v in new:
                print(f"  • {v['file']}:{v['line']} — {v['src']}")
            return 2
        print("[check-raw-sqlite] OK — no new raw sqlite3.connect() calls.")
        return 0

    if not violations:
        print("[check-raw-sqlite] All clear — no converter/ file opens sqlite3 directly.")
        return 0
    print(f"[check-raw-sqlite] {len(violations)} raw sqlite3.connect() call(s):")
    for v in violations:
        print(f"  • {v['file']}:{v['line']} — {v['src']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

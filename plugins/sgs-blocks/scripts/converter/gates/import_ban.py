"""import_ban.py — AST gate: no converter/ file may import the frozen engine.

Design ref: `.claude/plans/2026-06-23-modular-scaffold-design.md` §4.1.

WHAT IT REJECTS
    Any import, anywhere under converter/, of the frozen converter_v2 engine —
    `convert`, `convert_page`, or any `orchestrator.converter_v2.*` symbol —
    with TWO exceptions:
      1. `db_lookup`     — the vetted attr-NAME resolver the services legitimately wrap.
      2. `icon_resolver` — the vetted shared icon-recognition primitive (path-data
                           fingerprint + structural heuristics against lucide-icons.json).
                           Permitted per D248 / Spec 31 §3.B.0; equivalent in role to
                           db_lookup (both are shared recognition primitives, not the
                           frozen engine logic).

    This closes the freeze-callback backdoor: convert_page.py:114 calls v3.walk;
    if a rebuilt resolver imported back into convert.py, "old engine is never an
    oracle" (D-B) would be silently violated and the slice would lean on the very
    code it replaces.

    Banned:   import convert / from convert import x
              import convert_page / from convert_page import x
              from orchestrator.converter_v2 import convert
              from orchestrator.converter_v2.convert import x
              import orchestrator.converter_v2.convert
    Allowed:  from orchestrator.converter_v2 import db_lookup
              from orchestrator.converter_v2.db_lookup import x
              import orchestrator.converter_v2.db_lookup
              from orchestrator.converter_v2 import icon_resolver
              from orchestrator.converter_v2.icon_resolver import resolve_icon
              import orchestrator.converter_v2.icon_resolver

SCOPE
    All of converter/ recursively, EXCLUDING this gates/ dir and test files
    (which may legitimately name the frozen modules in assertions/docstrings).

CLI (run from plugins/sgs-blocks/scripts):
    python converter/gates/import_ban.py --report | --check | --update-baseline
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
_BASELINE = _HERE / "import-ban-baseline.json"

# Bare module names that ARE the frozen engine.
_FROZEN_BARE = frozenset({"convert", "convert_page"})
_FROZEN_PKG_SEGMENT = "converter_v2"
# Vetted shared primitives that MAY be imported from orchestrator.converter_v2.
# db_lookup     — attr-name resolver / DB accessor (original allowance).
# icon_resolver — path-data fingerprint + structural heuristic icon recogniser;
#                 permitted per D248 / Spec 31 §3.B.0 (same class as db_lookup:
#                 a shared recognition primitive, NOT the frozen engine logic).
_ALLOWED_LEAVES = frozenset({"db_lookup", "icon_resolver"})


def _module_is_frozen(module: str | None, imported_name: str | None) -> bool:
    """Decide whether an import target is the banned frozen engine.

    `module` is the ImportFrom module (or the Import alias name); `imported_name`
    is the specific symbol for an ImportFrom (None for a plain Import).
    """
    if not module:
        return False
    parts = module.split(".")
    # Bare frozen module (`import convert`, `from convert import x`).
    if module in _FROZEN_BARE or parts[-1] in _FROZEN_BARE:
        return True
    # Anything inside the converter_v2 package.
    if _FROZEN_PKG_SEGMENT in parts:
        # Allowed when the leaf module is a permitted shared primitive …
        if parts[-1] in _ALLOWED_LEAVES:
            return False
        # … or `from orchestrator.converter_v2 import <leaf>` (module ends at
        #    the package, the imported symbol is a permitted shared primitive).
        if parts[-1] == _FROZEN_PKG_SEGMENT and imported_name in _ALLOWED_LEAVES:
            return False
        return True
    return False


def _is_test_file(path: Path) -> bool:
    return path.name.startswith("test_") or "tests" in {p.name for p in path.parents}


def _violation_key(rel: str, src: str) -> str:
    h = hashlib.sha256(src.encode("utf-8")).hexdigest()[:16]
    return f"{rel}::{h}"


def run(converter_dir: Path | None = None) -> list[dict]:
    root = converter_dir if converter_dir is not None else _CONVERTER
    violations: list[dict] = []
    for py in sorted(root.rglob("*.py")):
        # Don't scan the gates themselves (they name frozen modules in strings)
        # nor test files.
        if py.parent.name == "gates" or _is_test_file(py):
            continue
        try:
            tree = ast.parse(py.read_text(encoding="utf-8", errors="replace"),
                             filename=str(py))
        except SyntaxError:
            continue
        rel = str(py.relative_to(root))
        for node in ast.walk(tree):
            banned_src: str | None = None
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if _module_is_frozen(alias.name, None):
                        banned_src = f"import {alias.name}"
                        break
            elif isinstance(node, ast.ImportFrom):
                mod = node.module
                # Reject if the module itself is frozen, or any imported symbol
                # from the converter_v2 package is not db_lookup.
                for alias in node.names:
                    if _module_is_frozen(mod, alias.name):
                        banned_src = f"from {mod or '.'} import {alias.name}"
                        break
            elif isinstance(node, ast.Call):
                # Dynamic-import dodge: importlib.import_module("...convert"),
                # __import__("orchestrator.converter_v2.convert").
                fn = node.func
                is_dyn = (
                    (isinstance(fn, ast.Name) and fn.id == "__import__")
                    or (isinstance(fn, ast.Attribute) and fn.attr == "import_module")
                )
                if is_dyn and node.args and isinstance(node.args[0], ast.Constant) \
                        and isinstance(node.args[0].value, str):
                    target = node.args[0].value
                    if _module_is_frozen(target, None):
                        banned_src = f"{ast.unparse(fn)}({target!r})"
            if banned_src:
                violations.append({
                    "key": _violation_key(rel, banned_src),
                    "file": rel,
                    "line": getattr(node, "lineno", 0),
                    "src": banned_src,
                    "detail": (
                        f"converter/{rel}:{getattr(node, 'lineno', 0)} imports the "
                        f"frozen engine — `{banned_src}`. Only `db_lookup` may be "
                        f"imported from orchestrator.converter_v2 (D-B: the old engine "
                        f"is never an oracle). Rebuild the logic fresh in the resolver."
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
        print(f"[import-ban] baseline updated — {len(violations)} key(s).")
        return 0

    if args.check:
        baseline = _load_baseline()
        new = [v for v in violations if v["key"] not in baseline]
        if new:
            print(f"[import-ban] {len(new)} NEW frozen-engine import(s):")
            for v in new:
                print(f"  • {v['file']}:{v['line']} — {v['src']}")
            return 1
        print("[import-ban] OK — no new frozen-engine imports.")
        return 0

    if not violations:
        print("[import-ban] All clear — no converter/ file imports the frozen engine "
              "(db_lookup excepted).")
        return 0
    print(f"[import-ban] {len(violations)} frozen-engine import(s):")
    for v in violations:
        print(f"  • {v['file']}:{v['line']} — {v['src']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

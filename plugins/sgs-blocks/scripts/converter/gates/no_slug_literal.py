"""no_slug_literal.py — AST gate: no block-slug / variant carve-outs in resolver bodies.

Design ref: `.claude/plans/2026-06-23-modular-scaffold-design.md` §4.1 + §10 A7.

WHAT IT REJECTS
    Any comparison whose operand chain touches one of the carve-out identifiers
    (`block_slug`, `variant_value`, `variant_attr` — as an attribute, a bare name,
    or a local alias assigned from one) AGAINST a string literal or a literal
    string-collection. This enforces "the resolver bodies name no block" (R-22-1 /
    R-22-9) — per-block behaviour must come from the DB, never an `if slug ==` branch.

    Caught forms (the planted-carve-out positives in the test suite):
        ctx.block_slug == "sgs/hero"
        block_slug in ("sgs/hero", "sgs/cta")
        ctx.block_slug.split("/")[1] == "hero"          # namespace-stripped carve-out
        slug = ctx.block_slug; slug == "hero"           # aliased
        _SPECIAL = {"hero"}; ctx.variant_value in _SPECIAL   # smuggled-set membership

    This is COMPLEMENTARY to cheat-gate/check_slug_literals.py: that gate matches
    `"sgs/..."` string literals anywhere in orchestrator/; THIS gate matches the
    carve-out VARIABLE compared to ANY literal (incl. namespace-stripped "hero"),
    scoped to converter/resolvers + converter/services.

SCOPE
    converter/resolvers/*.py + converter/services/*.py (recursive), excluding
    test files. dispatch_table.py / orchestrator.py are intentionally out of scope
    (the dispatch table routes by db_lookup; it is separately covered by review).

CLI (matches the f5-commit-gate convention — run from plugins/sgs-blocks/scripts):
    python converter/gates/no_slug_literal.py --report          # list, exit 0
    python converter/gates/no_slug_literal.py --check            # exit 1 on NEW (not in baseline)
    python converter/gates/no_slug_literal.py --update-baseline  # rewrite baseline

Violation identity key = (relpath, normalised-node-source) — line-independent
(STOP-19: never key a baseline on a line number).
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent              # scripts/converter/gates/
_CONVERTER = _HERE.parent                            # scripts/converter/
_SCAN_DIRS = [_CONVERTER / "resolvers", _CONVERTER / "services"]
_BASELINE = _HERE / "no-slug-literal-baseline.json"

# The carve-out identifiers the gate guards.
_TARGET_IDENTS = frozenset({"block_slug", "variant_value", "variant_attr"})


# ---------------------------------------------------------------------------
# AST helpers
# ---------------------------------------------------------------------------

def _is_string_constant(node: ast.AST) -> bool:
    return isinstance(node, ast.Constant) and isinstance(node.value, str)


def _is_string_collection_literal(node: ast.AST) -> bool:
    """True for a Set/List/Tuple of (at least one) string constant, or a Dict with
    string-constant keys — i.e. the 'smuggled set/dict' carve-out shape."""
    if isinstance(node, (ast.Set, ast.List, ast.Tuple)):
        return any(_is_string_constant(e) for e in node.elts)
    if isinstance(node, ast.Dict):
        return any(_is_string_constant(k) for k in node.keys if k is not None)
    # frozenset({...}) / set([...]) / tuple((...))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and \
            node.func.id in ("frozenset", "set", "list", "tuple"):
        return any(_is_string_collection_literal(a) or _is_string_constant(a)
                   for a in node.args)
    return False


def _subtree_touches_target(node: ast.AST, tainted: set[str]) -> bool:
    """True if any node in the subtree references a target identifier:
    an Attribute named block_slug/variant_value/variant_attr, or a Name whose id
    is a target OR a tainted local alias."""
    for sub in ast.walk(node):
        if isinstance(sub, ast.Attribute) and sub.attr in _TARGET_IDENTS:
            return True
        if isinstance(sub, ast.Name) and (sub.id in _TARGET_IDENTS or sub.id in tainted):
            return True
        # getattr(ctx, "block_slug") — string-named attribute dodge.
        if (
            isinstance(sub, ast.Call)
            and isinstance(sub.func, ast.Name)
            and sub.func.id == "getattr"
            and len(sub.args) >= 2
            and _is_string_constant(sub.args[1])
            and sub.args[1].value in _TARGET_IDENTS
        ):
            return True
    return False


class _CarveOutVisitor(ast.NodeVisitor):
    """Collect string-literal comparisons against a carve-out identifier."""

    def __init__(self) -> None:
        self.findings: list[dict] = []
        # Names bound to a string-collection literal at module/function scope —
        # used to catch `x in _SPECIAL` where _SPECIAL = {"hero"}.
        self.str_collection_names: set[str] = set()
        # Names aliased from a target-touching expression (`slug = ctx.block_slug`).
        self.tainted: set[str] = set()

    # -- first pass: collect aliases + string-collection names ----------------
    def _collect_assignments(self, tree: ast.AST) -> None:
        # Iterate to a fixed point so chained aliases (a=slug; b=a) all taint.
        changed = True
        while changed:
            changed = False
            for node in ast.walk(tree):
                if not isinstance(node, ast.Assign):
                    continue
                for tgt in node.targets:
                    if not isinstance(tgt, ast.Name):
                        continue
                    if _is_string_collection_literal(node.value):
                        if tgt.id not in self.str_collection_names:
                            self.str_collection_names.add(tgt.id)
                            changed = True
                    if _subtree_touches_target(node.value, self.tainted):
                        if tgt.id not in self.tainted:
                            self.tainted.add(tgt.id)
                            changed = True

    def _literalish(self, node: ast.AST) -> bool:
        if _is_string_constant(node) or _is_string_collection_literal(node):
            return True
        if isinstance(node, ast.Name) and node.id in self.str_collection_names:
            return True
        return False

    def visit_Compare(self, node: ast.Compare) -> None:
        operands = [node.left, *node.comparators]
        touches = any(_subtree_touches_target(o, self.tainted) for o in operands)
        literalish = any(self._literalish(o) for o in operands)
        if touches and literalish:
            self._record(node)
        self.generic_visit(node)

    def visit_Match(self, node: ast.Match) -> None:
        # match ctx.block_slug: case "sgs/hero": ...  — the match-statement carve-out.
        if _subtree_touches_target(node.subject, self.tainted):
            for case in node.cases:
                if self._pattern_has_string_literal(case.pattern):
                    self._record(case.pattern, fallback=f"match {ast.unparse(node.subject)} / case")
                    break
        self.generic_visit(node)

    @staticmethod
    def _pattern_has_string_literal(pat: ast.AST) -> bool:
        for sub in ast.walk(pat):
            if isinstance(sub, ast.MatchValue) and _is_string_constant(sub.value):
                return True
            if isinstance(sub, ast.MatchSingleton):  # case None etc. — ignore
                continue
        return False

    def _record(self, node: ast.AST, fallback: str | None = None) -> None:
        try:
            src = ast.unparse(node)
        except Exception:
            src = fallback or f"<node@line{getattr(node, 'lineno', 0)}>"
        self.findings.append({"line": getattr(node, "lineno", 0), "src": src})


# ---------------------------------------------------------------------------
# Scan
# ---------------------------------------------------------------------------

def _is_test_file(path: Path) -> bool:
    return path.name.startswith("test_") or "tests" in {p.name for p in path.parents}


def _violation_key(rel: str, src: str) -> str:
    h = hashlib.sha256(src.encode("utf-8")).hexdigest()[:16]
    return f"{rel}::{h}"


def _rel_path(py: Path, scan_dir: Path) -> str:
    """Path label for a scanned file: relative to converter/ for production files,
    relative to the scan dir's parent for out-of-tree (test) dirs."""
    for base in (_CONVERTER, scan_dir.parent):
        try:
            return str(py.relative_to(base))
        except ValueError:
            continue
    return py.name


def run(scan_dirs: list[Path] | None = None) -> list[dict]:
    """Return a list of violation dicts {key, file, line, src, detail}."""
    dirs = scan_dirs if scan_dirs is not None else _SCAN_DIRS
    violations: list[dict] = []
    for scan_dir in dirs:
        if not scan_dir.exists():
            continue
        for py in sorted(scan_dir.rglob("*.py")):
            if _is_test_file(py):
                continue
            try:
                tree = ast.parse(py.read_text(encoding="utf-8", errors="replace"),
                                 filename=str(py))
            except SyntaxError:
                continue
            visitor = _CarveOutVisitor()
            visitor._collect_assignments(tree)
            visitor.visit(tree)
            rel = _rel_path(py, scan_dir)
            for f in visitor.findings:
                violations.append({
                    "key": _violation_key(rel, f["src"]),
                    "file": rel,
                    "line": f["line"],
                    "src": f["src"],
                    "detail": (
                        f"Carve-out: a block-slug/variant identifier is compared to a "
                        f"string literal in converter/{rel}:{f['line']} — `{f['src']}`. "
                        f"Resolver bodies must name no block (R-22-1/R-22-9); route via "
                        f"the DB (db_lookup / property_suffixes / variant_slots), not an "
                        f"`if slug ==` branch."
                    ),
                })
    return violations


# ---------------------------------------------------------------------------
# Baseline + CLI
# ---------------------------------------------------------------------------

def _load_baseline() -> set[str]:
    if not _BASELINE.exists():
        return set()
    try:
        data = json.loads(_BASELINE.read_text(encoding="utf-8"))
        return set(data.get("keys", []))
    except Exception:
        return set()


def _save_baseline(keys: set[str]) -> None:
    _BASELINE.write_text(
        json.dumps({"keys": sorted(keys)}, indent=2) + "\n", encoding="utf-8"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    g = parser.add_mutually_exclusive_group()
    g.add_argument("--report", action="store_true", help="List all violations, exit 0.")
    g.add_argument("--check", action="store_true",
                   help="Exit 1 if any violation key is NOT in the baseline.")
    g.add_argument("--update-baseline", action="store_true",
                   help="Write current violation keys to the baseline, exit 0.")
    args = parser.parse_args(argv)

    violations = run()

    if args.update_baseline:
        _save_baseline({v["key"] for v in violations})
        print(f"[no-slug-literal] baseline updated — {len(violations)} key(s).")
        return 0

    if args.check:
        baseline = _load_baseline()
        new = [v for v in violations if v["key"] not in baseline]
        if new:
            print(f"[no-slug-literal] {len(new)} NEW carve-out violation(s):")
            for v in new:
                print(f"  • {v['file']}:{v['line']} — {v['src']}")
            return 1
        print("[no-slug-literal] OK — no new carve-out comparisons.")
        return 0

    # default / --report
    if not violations:
        print("[no-slug-literal] All clear — 0 carve-out comparisons in "
              "converter/resolvers + converter/services.")
        return 0
    print(f"[no-slug-literal] {len(violations)} carve-out comparison(s):")
    for v in violations:
        print(f"  • {v['file']}:{v['line']} — {v['src']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

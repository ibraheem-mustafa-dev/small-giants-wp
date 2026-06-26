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
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent              # scripts/converter/gates/
_CONVERTER = _HERE.parent                            # scripts/converter/
_SCAN_DIRS = [_CONVERTER / "resolvers", _CONVERTER / "services"]
# Individual converter-root files in scope (Stage-2 recognition lives at the root, not
# under resolvers/services — design §9-fold-G / cheat MF-2 closed the scope gap).
_SCAN_FILES = [_CONVERTER / "recognition.py"]
_BASELINE = _HERE / "no-slug-literal-baseline.json"

# The carve-out identifiers the gate guards.
_TARGET_IDENTS = frozenset({"block_slug", "variant_value", "variant_attr"})


# ---------------------------------------------------------------------------
# AST helpers
# ---------------------------------------------------------------------------

# A bare SGS slug literal, e.g. "sgs/hero". Comparing ANY variable to one of these in a
# converter body is a per-block carve-out (R-22-9) regardless of the variable's name —
# closes the gap where a local `slug` (built via prefix-strip, not from ctx.block_slug)
# is compared to a slug literal and the identifier-tracking misses it.
_SLUG_LITERAL_RE = re.compile(r"^sgs/[a-z0-9-]+$")


def _is_string_constant(node: ast.AST) -> bool:
    return isinstance(node, ast.Constant) and isinstance(node.value, str)


def _is_slug_literal(node: ast.AST) -> bool:
    return (isinstance(node, ast.Constant) and isinstance(node.value, str)
            and bool(_SLUG_LITERAL_RE.match(node.value)))


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
                # Assign has many targets; AnnAssign (`x: T = v`) has one. Treat both
                # (cheat Gap B: an annotated alias `slug: str = ctx.block_slug` was
                # untracked). NamedExpr/walrus operands are caught at the Compare site
                # because ast.walk descends into them.
                if isinstance(node, ast.Assign):
                    targets = node.targets
                    value = node.value
                elif isinstance(node, ast.AnnAssign) and node.value is not None:
                    targets = [node.target]
                    value = node.value
                else:
                    continue
                for tgt in targets:
                    if not isinstance(tgt, ast.Name):
                        continue
                    if _is_string_collection_literal(value):
                        if tgt.id not in self.str_collection_names:
                            self.str_collection_names.add(tgt.id)
                            changed = True
                    if _subtree_touches_target(value, self.tainted):
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
        # A slug literal as ANY operand is a carve-out regardless of the other operand's
        # identifier (catches a local `slug == "sgs/hero"` the target-tracking misses).
        slug_lit = any(_is_slug_literal(o) for o in operands)
        if (touches and literalish) or slug_lit:
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


def _is_variant_file(name: str) -> bool:
    """A variant-detection module — its returns/assigns must carry NO bare string (any
    value, not just slugs). Matched by name so a NEW services/variant_*.py is covered too
    (cheat Gap C: `return "split"` in a new helper bypassed an exact-filename check)."""
    return "variant" in name


def _contains_string_shallow(node: ast.AST) -> bool:
    """True if node is a non-empty str Constant, or a tuple/list DIRECTLY containing one
    — the returned (variant_attr, variant_value) shape. Deliberately shallow: it does NOT
    descend into a BinOp like `\"sgs-\" + slug`, so the legitimate Spec-00 prefix
    construction in variant_detect._bem_prefix is not a false-positive."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str) and node.value:
        return True
    if isinstance(node, (ast.Tuple, ast.List)):
        return any(_contains_string_shallow(e) for e in node.elts)
    return False


def _value_of(node: ast.AST) -> ast.AST | None:
    """The assigned/returned value of a Return/Assign/AnnAssign, else None."""
    if isinstance(node, ast.Return):
        return node.value
    if isinstance(node, (ast.Assign, ast.AnnAssign)):
        return node.value
    return None


def _slug_literal_outside_compare(val: ast.AST) -> bool:
    """A slug literal in `val`'s subtree, EXCLUDING any inside a Compare node (those are
    already reported by visit_Compare — don't double-count). Catches a slug as a call arg
    / bare return; ignores `block_slug == \"sgs/hero\"`."""
    stack = [val]
    while stack:
        n = stack.pop()
        if isinstance(n, ast.Compare):
            continue  # handled by visit_Compare
        if _is_slug_literal(n):
            return True
        stack.extend(ast.iter_child_nodes(n))
    return False


def _scan_slug_literal_values(tree: ast.AST) -> list[dict]:
    """Findings for a slug literal ("sgs/...") in a Return/Assign/AnnAssign value subtree
    that is NOT part of a comparison — incl. as a call argument
    (`return Recognition(\"named\", \"sgs/hero\", ...)`). A slug is never legitimate as a
    literal in converter code (DB-resolved via block_exists); the \"sgs-\" prefix is not a
    slug literal so it never matches."""
    findings: list[dict] = []
    for node in ast.walk(tree):
        val = _value_of(node)
        if val is None:
            continue
        if _slug_literal_outside_compare(val):
            try:
                src = ast.unparse(node)
            except Exception:
                src = f"<slug-literal@line{getattr(node, 'lineno', 0)}>"
            findings.append({"line": getattr(node, "lineno", 0), "src": src})
    return findings


def _scan_variant_bare_strings(tree: ast.AST) -> list[dict]:
    """Findings for a bare string Constant returned/assigned in a variant file (the
    `return \"split\"` cheat). Shallow (see _contains_string_shallow) to avoid the
    \"sgs-\"-prefix false positive. Covers Return/Assign/AnnAssign."""
    findings: list[dict] = []
    for node in ast.walk(tree):
        val = _value_of(node)
        if val is not None and _contains_string_shallow(val):
            try:
                src = ast.unparse(node)
            except Exception:
                src = f"<bare-string@line{getattr(node, 'lineno', 0)}>"
            findings.append({"line": getattr(node, "lineno", 0), "src": src})
    return findings


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


def _process_file(py: Path, scan_dir: Path, violations: list[dict]) -> None:
    if _is_test_file(py):
        return
    try:
        tree = ast.parse(py.read_text(encoding="utf-8", errors="replace"), filename=str(py))
    except SyntaxError:
        return
    rel = _rel_path(py, scan_dir)
    visitor = _CarveOutVisitor()
    visitor._collect_assignments(tree)
    visitor.visit(tree)
    for f in visitor.findings:
        violations.append({
            "key": _violation_key(rel, f["src"]),
            "file": rel,
            "line": f["line"],
            "src": f["src"],
            "detail": (
                f"Carve-out: a block-slug/variant identifier is compared to a "
                f"string literal in converter/{rel}:{f['line']} — `{f['src']}`. "
                f"Bodies must name no block (R-22-1/R-22-9); route via the DB "
                f"(db_lookup / property_suffixes / variant_slots), not an `if slug ==` branch."
            ),
        })
    # Slug-literal in ANY scanned file's Return/Assign value subtree (cheat Gap A — a
    # hardcoded `return Recognition("named", "sgs/hero", ...)` with no comparison).
    seen_keys = {v["key"] for v in violations if v["file"] == rel}
    for f in _scan_slug_literal_values(tree):
        key = _violation_key(rel, f["src"])
        if key in seen_keys:
            continue
        seen_keys.add(key)
        violations.append({
            "key": key, "file": rel, "line": f["line"], "src": f["src"],
            "detail": (
                f"Bare slug literal in converter/{rel}:{f['line']} — `{f['src']}`. "
                f"A block slug must be DB-resolved (db_lookup.block_exists), never a "
                f"hardcoded `\"sgs/...\"` return/assign/arg (R-22-1; cheat Gap A)."
            ),
        })
    # variant files: a bare string Constant return/assign (cheat Gap C — `return "split"`).
    if _is_variant_file(py.name):
        for f in _scan_variant_bare_strings(tree):
            key = _violation_key(rel, f["src"])
            if key in seen_keys:
                continue
            seen_keys.add(key)
            violations.append({
                "key": key, "file": rel, "line": f["line"], "src": f["src"],
                "detail": (
                    f"Bare variant string in converter/{rel}:{f['line']} — `{f['src']}`. "
                    f"The variant value/attr must come from the DB (variant_slots / "
                    f"db_lookup) or the node, never a literal — a `return \"split\"` "
                    f"bypasses the comparison gate (cheat MF-1 / Gap C)."
                ),
            })


def run(scan_dirs: list[Path] | None = None) -> list[dict]:
    """Return a list of violation dicts {key, file, line, src, detail}."""
    dirs = scan_dirs if scan_dirs is not None else _SCAN_DIRS
    violations: list[dict] = []
    for scan_dir in dirs:
        if not scan_dir.exists():
            continue
        for py in sorted(scan_dir.rglob("*.py")):
            _process_file(py, scan_dir, violations)
    # Individual converter-root files (recognition.py) — only when scanning defaults.
    if scan_dirs is None:
        for py in _SCAN_FILES:
            if py.exists():
                _process_file(py, _CONVERTER, violations)
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

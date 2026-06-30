"""check_slug_literals.py — Check #1: per-block slug literals (whole-tree + indirect forms).

Spec 31 §7a check 1:
  Scan every .py under orchestrator/ (recursively) for:
    - slug == 'sgs/foo'  /  slug == 'sgs/foo'  (comparison forms)
    - slug in (…)  /  slug in {…}  /  slug in […]
    - slug.startswith('sgs/…')
    - .get(slug) with a slug-keyed dict
    - dict/frozenset/set/list literals whose keys/members match "sgs/[a-z-]+"

  Allowlist: function-scoped ('iconCircleBackground' legitimate only in
  _atomic_attrs_for of converter_v2/convert.py; check-atomic-slug-literals.py
  covers the _atomic_attrs_for scope for convert.py).

  This check supersedes check-atomic-slug-literals.py by scanning the WHOLE
  orchestrator tree, not just _atomic_attrs_for.  check-atomic-slug-literals.py
  is a narrower complement; it is NOT retired by this gate.

UK English throughout.
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Import models via the cheat_gate package alias (registered by run.py).
from cheat_gate.models import Violation, slug_literal_key  # type: ignore[import]

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent           # scripts/cheat-gate/
_SCRIPTS_DIR = _HERE.parent                        # scripts/
_ORCHESTRATOR = _SCRIPTS_DIR / "orchestrator"

# SGS block slug pattern
_SLUG_RE = re.compile(r'"(sgs/[a-z0-9-]+)"')

# ---------------------------------------------------------------------------
# Allowlist: (file_rel, scope_label) → frozenset of allowed slug literals.
#
# scope_label is the FUNCTION NAME in which the literal is permitted.
# An entry here means: the literal is expected inside that function scope;
# flag it if it appears OUTSIDE that function scope in that file.
#
# check-atomic-slug-literals.py covers _atomic_attrs_for in convert.py
# (the inner allow-list used there).  We delegate that function scope here
# too — any slug inside _atomic_attrs_for in converter_v2/convert.py is
# expected and allowed.
# ---------------------------------------------------------------------------

# relative to _ORCHESTRATOR
_ATOMIC_FILE_REL = "converter_v2/convert.py"
_ATOMIC_FUNC = "_atomic_attrs_for"

# The 'iconCircleBackground' note in Spec 31 refers to a slug used inside
# _atomic_attrs_for that is legitimate.  We allow ALL slugs inside
# _atomic_attrs_for because check-atomic-slug-literals.py separately gates
# which specific slugs are allowed there.
_FUNC_SCOPED_ALLOWLIST: dict[str, str] = {
    # file_rel: function_name  (slug literals inside this function are OK)
    _ATOMIC_FILE_REL: _ATOMIC_FUNC,
}


def _rel(path: Path) -> str:
    """Return a path relative to _ORCHESTRATOR (or absolute if outside)."""
    try:
        return str(path.relative_to(_ORCHESTRATOR))
    except ValueError:
        return str(path)


# ---------------------------------------------------------------------------
# AST-based slug-literal detector
# ---------------------------------------------------------------------------

class _SlugLiteralVisitor(ast.NodeVisitor):
    """Walk an AST and collect sgs/slug string literals with context."""

    def __init__(self, filename: str) -> None:
        self.filename = filename
        self.findings: list[dict] = []
        self._func_stack: list[str] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._func_stack.append(node.name)
        self.generic_visit(node)
        self._func_stack.pop()

    visit_AsyncFunctionDef = visit_FunctionDef

    def _current_func(self) -> str:
        return self._func_stack[-1] if self._func_stack else "<module>"

    def _record(self, slug: str, node: ast.AST, form: str) -> None:
        self.findings.append({
            "slug": slug,
            "func": self._current_func(),
            "line": getattr(node, "lineno", 0),
            "form": form,
        })

    def _extract_slugs_from_node(self, node: ast.AST) -> list[str]:
        """Return sgs/ slug literals found in a node (Constant or collection)."""
        slugs: list[str] = []
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            if node.value.startswith("sgs/"):
                slugs.append(node.value)
        elif isinstance(node, (ast.Tuple, ast.List, ast.Set)):
            for elt in node.elts:
                slugs.extend(self._extract_slugs_from_node(elt))
        elif isinstance(node, ast.Dict):
            for k in node.keys:
                if k is not None:
                    slugs.extend(self._extract_slugs_from_node(k))
        return slugs

    # ------------------------------------------------------------------
    # Visit comparison: slug == 'sgs/foo' / 'sgs/foo' == slug
    # ------------------------------------------------------------------
    def visit_Compare(self, node: ast.Compare) -> None:
        for op, comp in zip(node.ops, node.comparators):
            if isinstance(op, ast.Eq):
                # left == right
                left_slugs = self._extract_slugs_from_node(node.left)
                right_slugs = self._extract_slugs_from_node(comp)
                for s in left_slugs + right_slugs:
                    self._record(s, node, "slug == literal")
            elif isinstance(op, ast.In):
                # slug in collection / 'sgs/foo' in collection
                coll_slugs = self._extract_slugs_from_node(comp)
                left_slugs = self._extract_slugs_from_node(node.left)
                for s in coll_slugs + left_slugs:
                    self._record(s, node, "slug in collection")
        self.generic_visit(node)

    # ------------------------------------------------------------------
    # Visit dict/frozenset/set/list literals whose keys/members contain slugs
    # ------------------------------------------------------------------
    def visit_Dict(self, node: ast.Dict) -> None:
        for k in node.keys:
            if k is None:
                continue
            for s in self._extract_slugs_from_node(k):
                self._record(s, node, "dict key literal")
        # Values are fine to contain slugs (they are attr names, not per-block dispatch)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        # frozenset([...]) / set([...]) / list([...]) with sgs/ members
        if isinstance(node.func, ast.Name) and node.func.id in ("frozenset", "set", "list"):
            for arg in node.args:
                if isinstance(arg, (ast.List, ast.Set, ast.Tuple)):
                    for elt in arg.elts:
                        for s in self._extract_slugs_from_node(elt):
                            self._record(s, node, f"{node.func.id}() member literal")

        # .startswith('sgs/...')
        if (
            isinstance(node.func, ast.Attribute)
            and node.func.attr == "startswith"
        ):
            for arg in node.args:
                for s in self._extract_slugs_from_node(arg):
                    self._record(s, node, "slug.startswith() literal")

        # .get(slug_var_or_literal) — only flag if arg is a sgs/ literal
        if (
            isinstance(node.func, ast.Attribute)
            and node.func.attr == "get"
        ):
            for arg in node.args:
                for s in self._extract_slugs_from_node(arg):
                    self._record(s, node, ".get() with slug literal")

        self.generic_visit(node)


def _collect_slug_literals_in_file(path: Path) -> list[dict]:
    """Parse a .py file and return all sgs/ slug literal usages."""
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(path))
    except SyntaxError:
        return []
    visitor = _SlugLiteralVisitor(filename=str(path))
    visitor.visit(tree)
    return visitor.findings


# ---------------------------------------------------------------------------
# Allowlist filtering
# ---------------------------------------------------------------------------

def _is_allowed(file_rel: str, func_name: str, slug: str) -> bool:
    """Return True if this slug literal in this function scope is allowlisted."""
    allowed_func = _FUNC_SCOPED_ALLOWLIST.get(file_rel)
    if allowed_func and func_name == allowed_func:
        return True
    return False


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run(orchestrator_dir: Path | None = None) -> list[Violation]:
    """Scan the orchestrator tree for per-block slug literals.

    Returns a list of Violation objects.
    """
    scan_dir = orchestrator_dir or _ORCHESTRATOR
    violations: list[Violation] = []

    if not scan_dir.exists():
        return violations

    for py_path in sorted(scan_dir.rglob("*.py")):
        # Skip test files — they intentionally use slug literals in fixtures.
        # Only skip files whose NAME starts with 'test_' or that live inside a
        # directory named 'tests' or '_tests'.  Do NOT skip on substring match
        # to avoid accidentally skipping non-test files that contain 'test' in
        # their name (e.g. a production script with 'test' in its slug).
        if (
            py_path.name.startswith("test_")
            or "_tests" in [p.name for p in py_path.parents]
            or "tests" in [p.name for p in py_path.parents]
        ):
            continue

        file_rel = _rel(py_path)
        findings = _collect_slug_literals_in_file(py_path)

        for f in findings:
            slug = f["slug"]
            func = f["func"]
            form = f["form"]

            if _is_allowed(file_rel, func, slug):
                continue

            key = slug_literal_key(file_rel, slug, func)
            detail = (
                f"Per-block slug literal '{slug}' in {file_rel} "
                f"(function: {func}, form: {form}). "
                f"Per-block code branches violate R-31-1 — behaviour must come from the DB."
            )
            fix = (
                f"Replace the per-block branch for '{slug}' in {file_rel}::{func} "
                f"with a DB-driven lookup. "
                f"Query property_suffixes or block_attributes for the correct attr name. "
                f"If this is a LEGACY violation in convert.py (the frozen file), "
                f"it is baselined and should shrink as the modular rebuild progresses."
            )
            violations.append(Violation(
                check="slug_literal",
                file=file_rel,
                detail=detail,
                fix=fix,
                key=key,
            ))

    return violations

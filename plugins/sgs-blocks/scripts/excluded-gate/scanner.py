"""scanner.py — import-graph-wide scan for CSS-property exclusion literals.

Spec ref: .claude/plans/2026-06-18-f4-excluded-properties-design.md §3

WHAT THIS DETECTS
-----------------
Four forms of in-code CSS-property exclusion:

1. Inline equality drop
   ``if css_prop == "max-width": continue``
   The TRUE branch of the if must directly contain a ``continue`` statement
   (not in a nested sub-if, not in an else).

2. Membership drop — inline literal container
   ``if css_prop in ("max-width", "width"): continue``
   Same rule: true branch must directly continue.

3. Membership drop — named variable reference (anonymous local set)
   ``if css_prop in _area_excluded: ...``
   ``if css_prop in _CROSS_NODE_EXCLUDED_PROPS: continue``
   True branch directly continues AND the right-hand side is a Name or
   Attribute (not a literal container).

4. .startswith("--") guard
   ``if css_prop.startswith("--"): continue``
   Blanket custom-property skip.  True branch directly continues.

5. Named denylist set construction at module scope or local scope
   ``_LIFT_EXCLUDED_PROPS = frozenset({"max-width", "width"})``
   ``_CROSS_NODE_EXCLUDED_PROPS = frozenset({...})``
   Detected via assignment targets whose name matches the exclusion-set
   pattern: ends with ``EXCLUDED_PROPS``, ``_EXCLUDED``, ``excluded_props``,
   or ``_excluded``.  Boolean local variables like ``_is_excluded`` do NOT
   match (they lack the ``PROPS``/``set`` suffix pattern).

WHAT THIS DOES NOT DETECT (DELEGATED — stated honestly in --report)
--------------------------------------------------------------------
- Value-transform drops (lift functions returning "" / None) → F3 oracle.
- DB-lookup-None / no property_suffixes row → F2 ledger (UNACCOUNTED set).
- Broad-except fail-silent swallowing of declarations → bare-except lint.

These are not gaps in this gate; they are each covered by a dedicated gate.
The gate MUST NOT overclaim coverage of these classes.

SCAN SCOPE
----------
Walk ALL .py files under ``scripts/orchestrator/`` recursively, excluding:
- ``test_*.py`` and ``tests/`` / ``_tests/`` subdirectories
- ``_retired/`` subdirectory
- The ``excluded-gate/`` directory itself (avoids self-scan of test fixtures)

Rationale for walking the whole orchestrator tree: the live exclusion surface
has always been wider than just ``converter_v2/*.py``.  Active patterns exist in
``converter_v2/convert.py``, ``css_router.py``, and any newly added modular
files.  Walking the whole tree means fresh modular files auto-cover without
updating an allowlist.

``SKIP_TOP_LEVEL_TAGS`` (header/footer/nav tag-skip) is OUT of scope: those are
HTML tag constants, not CSS properties.
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from .models import ExclusionSignature, signature_key

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Orchestrator root — the root of the scan tree.
_ORCHESTRATOR_ROOT = (
    Path(__file__).resolve().parent.parent / "orchestrator"
)

# Names that indicate an exclusion SET (frozenset/set of CSS properties).
# Must end in one of these patterns to count as a named denylist.
# NOTE: does NOT match "_is_excluded" (a boolean) — requires PROPS or _excluded
#       at the END to avoid false positives on single booleans.
_EXCLUDED_SET_NAME_RE = re.compile(
    r"(?:EXCLUDED_PROPS|excluded_props|_EXCLUDED_PROPS)$",
    re.IGNORECASE,
)

# Regex: .startswith("--") in source
_STARTSWITH_DASHDASH_RE = re.compile(
    r'\.startswith\s*\(\s*["\']--["\']',
)

# CSS-property-looking strings: lowercase letters and hyphens, not Python idents.
_CSS_PROP_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$")  # must have at least one hyphen
# Also accept single-word standard CSS properties.
_CSS_PROP_SINGLEWORD_WHITELIST = frozenset({
    "display", "width", "height", "color", "opacity", "overflow",
    "position", "float", "visibility", "cursor", "content",
    "transform", "transition", "animation", "zoom", "gap",
    "margin", "padding", "outline", "border",
})

# Python variable names that, when used as the left operand of an ``in`` membership
# check, indicate a CSS-property iteration (as opposed to attr names, keys, etc.).
# Only membership checks where the loop variable matches one of these names are
# reported.  This prevents false positives from patterns like ``if key in seen:``
# or ``if attr_name in attrs:``.
_CSS_VAR_NAMES = frozenset({
    "css_prop", "prop", "css_property", "property", "css_p", "p",
})

# Variable names that are EXPLICITLY out of scope for this gate even if a CSS-property
# variable checks membership in them.  ``SKIP_TOP_LEVEL_TAGS`` is the canonical
# example: it holds HTML tag names (header/footer/nav), not CSS properties.
# The F4 spec §3 explicitly calls this out: "SKIP_TOP_LEVEL_TAGS is OUT of scope".
_EXCLUDED_VAR_ALLOWLIST = frozenset({
    "SKIP_TOP_LEVEL_TAGS",
    "skip_top_level_tags",
})


def _is_css_property_string(s: str) -> bool:
    """Return True if ``s`` looks like a CSS property name.

    CSS properties are all lowercase and hyphen-separated (multi-word) or
    common single-word properties (from our whitelist).
    """
    if not s or s.startswith("--"):
        return False  # Custom properties handled separately via startswith guard.
    if bool(_CSS_PROP_RE.match(s)):
        return True
    return s in _CSS_PROP_SINGLEWORD_WHITELIST


def _skip_file(path: Path) -> bool:
    """Return True if this file should be excluded from scanning."""
    parts = path.parts
    name = path.name
    # Skip test files.
    if name.startswith("test_") or name.endswith("_test.py"):
        return True
    # Skip anything in a tests/ or _tests/ or _retired/ sub-directory.
    for part in parts:
        if part in ("tests", "_tests", "_retired"):
            return True
    # Skip the excluded-gate directory itself (self-scan).
    excluded_gate_root = Path(__file__).resolve().parent
    try:
        path.relative_to(excluded_gate_root)
        return True
    except ValueError:
        pass
    return False


# ---------------------------------------------------------------------------
# AST helpers
# ---------------------------------------------------------------------------

def _extract_string_literals(node: ast.expr) -> list[str]:
    """Recursively collect string literals from an AST expression."""
    results: list[str] = []
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        results.append(node.value)
    elif isinstance(node, (ast.Tuple, ast.List, ast.Set)):
        for elt in node.elts:
            results.extend(_extract_string_literals(elt))
    elif isinstance(node, ast.Call):
        for arg in node.args:
            results.extend(_extract_string_literals(arg))
    return results


def _true_branch_directly_continues(node: ast.If) -> bool:
    """Return True if the TRUE branch of an if-statement directly contains
    a Continue statement (not buried inside a nested if or loop).

    This prevents false positives where a ``continue`` lives in the else branch
    or a deeply nested inner if.
    """
    for stmt in node.body:
        if isinstance(stmt, ast.Continue):
            return True
        # Allow a short guard: if <cond>: continue  inside the body.
        if isinstance(stmt, ast.If):
            for inner in stmt.body:
                if isinstance(inner, ast.Continue):
                    return True
    return False


# ---------------------------------------------------------------------------
# Per-file scan
# ---------------------------------------------------------------------------

def _scan_file(path: Path, rel_path: str) -> list[ExclusionSignature]:
    """Scan a single Python file and return detected exclusion signatures."""
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []

    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError:
        return []

    lines = source.splitlines()

    def _snippet(lineno: int) -> str:
        if 1 <= lineno <= len(lines):
            return lines[lineno - 1].strip()
        return ""

    sigs: list[ExclusionSignature] = []
    seen_keys: set[str] = set()

    def _add(sig: ExclusionSignature) -> None:
        if sig.key not in seen_keys:
            seen_keys.add(sig.key)
            sigs.append(sig)

    # ------------------------------------------------------------------
    # Walk the AST.
    # ------------------------------------------------------------------
    for node in ast.walk(tree):

        # FORM 5 — Named denylist set construction.
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and _EXCLUDED_SET_NAME_RE.search(target.id):
                    inline_lits = _extract_string_literals(node.value)
                    css_lits = [s for s in inline_lits if _is_css_property_string(s)]
                    lineno = getattr(node, "lineno", 0)
                    if css_lits:
                        for prop_val in css_lits:
                            key = signature_key(rel_path, lineno, "named_set", prop_val)
                            _add(ExclusionSignature(
                                file=rel_path,
                                line=lineno,
                                form="named_set",
                                prop=prop_val,
                                snippet=_snippet(lineno),
                                key=key,
                            ))
                    else:
                        # Empty or unresolvable set literal.
                        key = signature_key(rel_path, lineno, "named_set", target.id)
                        _add(ExclusionSignature(
                            file=rel_path,
                            line=lineno,
                            form="named_set",
                            prop=target.id,
                            snippet=_snippet(lineno),
                            key=key,
                        ))

        if not isinstance(node, ast.If):
            continue

        # All remaining forms require an If node.
        lineno = getattr(node, "lineno", 0)
        snippet = _snippet(lineno)
        test = node.test

        # Collect comparisons from the test (handles 'if A and B and ...:').
        comparisons: list[ast.Compare] = []
        if isinstance(test, ast.Compare):
            comparisons.append(test)
        elif isinstance(test, ast.BoolOp):
            for value in test.values:
                if isinstance(value, ast.Compare):
                    comparisons.append(value)

        for cmp in comparisons:
            if len(cmp.ops) != 1:
                continue
            op = cmp.ops[0]
            left = cmp.left
            right = cmp.comparators[0]

            # FORM 1 — Inline equality drop: if prop == "css-property": continue
            # Only fire when one side is a known CSS-property variable name.
            if isinstance(op, ast.Eq):
                prop_val: str | None = None
                if (isinstance(left, ast.Name) and left.id in _CSS_VAR_NAMES
                        and isinstance(right, ast.Constant) and isinstance(right.value, str)):
                    prop_val = right.value
                elif (isinstance(right, ast.Name) and right.id in _CSS_VAR_NAMES
                        and isinstance(left, ast.Constant) and isinstance(left.value, str)):
                    prop_val = left.value
                if prop_val and _is_css_property_string(prop_val) and _true_branch_directly_continues(node):
                    key = signature_key(rel_path, lineno, "inline_equality", prop_val)
                    _add(ExclusionSignature(
                        file=rel_path,
                        line=lineno,
                        form="inline_equality",
                        prop=prop_val,
                        snippet=snippet,
                        key=key,
                    ))

            # FORMS 2 + 3 — Membership drop: if prop in (...): continue
            # Only fire when the left operand is a known CSS-property variable name
            # (e.g. css_prop, prop).  This filters out patterns like
            # ``if attr_name in attrs:`` or ``if key in seen:`` which are not
            # CSS-property exclusions.
            if isinstance(op, ast.In) and isinstance(left, ast.Name) and left.id in _CSS_VAR_NAMES:
                if _true_branch_directly_continues(node):
                    inline_lits = _extract_string_literals(right)
                    css_lits = [s for s in inline_lits if _is_css_property_string(s)]
                    if css_lits:
                        # FORM 2 — inline literal container.
                        for prop_val in css_lits:
                            key = signature_key(rel_path, lineno, "membership", prop_val)
                            _add(ExclusionSignature(
                                file=rel_path,
                                line=lineno,
                                form="membership",
                                prop=prop_val,
                                snippet=snippet,
                                key=key,
                            ))
                    else:
                        # FORM 3 — named variable reference (anonymous local set).
                        if isinstance(right, ast.Name):
                            var_name = right.id
                            # Skip variables that are explicitly out of scope.
                            # SKIP_TOP_LEVEL_TAGS holds HTML tag names, not CSS props.
                            if var_name in _EXCLUDED_VAR_ALLOWLIST:
                                pass
                            else:
                                key = signature_key(rel_path, lineno, "membership", var_name)
                                _add(ExclusionSignature(
                                    file=rel_path,
                                    line=lineno,
                                    form="membership",
                                    prop=var_name,
                                    snippet=snippet,
                                    key=key,
                                ))
                        elif isinstance(right, ast.Attribute):
                            var_name = ast.unparse(right)
                            key = signature_key(rel_path, lineno, "membership", var_name)
                            _add(ExclusionSignature(
                                file=rel_path,
                                line=lineno,
                                form="membership",
                                prop=var_name,
                                snippet=snippet,
                                key=key,
                            ))

        # FORM 4 — .startswith("--") guard: if ..startswith("--"): continue
        # The CSS variable name must appear in the snippet to avoid false positives.
        _snippet_has_css_var = any(v in snippet for v in _CSS_VAR_NAMES)
        if _true_branch_directly_continues(node) and _STARTSWITH_DASHDASH_RE.search(snippet) and _snippet_has_css_var:
            key = signature_key(rel_path, lineno, "startswith_dashdash", "--*")
            _add(ExclusionSignature(
                file=rel_path,
                line=lineno,
                form="startswith_dashdash",
                prop="--*",
                snippet=snippet,
                key=key,
            ))

    return sigs


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def scan_orchestrator(root: Path | None = None) -> list[ExclusionSignature]:
    """Walk all .py files under ``root`` (default: orchestrator/) and return
    every detected exclusion signature.

    Files matching _skip_file() are excluded from scanning.
    ``SKIP_TOP_LEVEL_TAGS`` (header/footer/nav) is NOT in scope — those are
    tag constants, not CSS properties.
    """
    root = root or _ORCHESTRATOR_ROOT
    sigs: list[ExclusionSignature] = []
    for py_file in sorted(root.rglob("*.py")):
        if _skip_file(py_file):
            continue
        try:
            rel = str(py_file.relative_to(root.parent))
        except ValueError:
            rel = str(py_file)
        file_sigs = _scan_file(py_file, rel)
        sigs.extend(file_sigs)
    return sigs

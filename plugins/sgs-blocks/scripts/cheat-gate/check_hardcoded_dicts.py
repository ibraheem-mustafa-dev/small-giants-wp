"""check_hardcoded_dicts.py — Check #2: hardcoded property→attr dict literals (R-31-1).

Spec 31 §7a check 2:
  Flag dict literals with CSS-property string keys → attr-name string values
  in any orchestrator/*.py AND converter/*.py (the new modular tree — added so
  a cheat written into converter/ is no longer invisible to this gate).

  Known legacy violations (convert.py FROZEN — D-MODULAR):
    - _SUFFIX_ATTR_OVERRIDES at convert.py:972
    - prop_map at convert.py:1519  (inline local dict)
    - _BP_SUFFIX_MAP at convert.py:980 (breakpoint; also caught by check #4)

  These are BASELINED, not removed — they vanish when the modular rebuild
  replaces those code paths.

UK English throughout.
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")

from cheat_gate.models import Violation, hardcoded_dict_key  # type: ignore[import]

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent           # scripts/cheat-gate/
_SCRIPTS_DIR = _HERE.parent                        # scripts/
_ORCHESTRATOR = _SCRIPTS_DIR / "orchestrator"
_CONVERTER = _SCRIPTS_DIR / "converter"            # NEW modular converter tree (D249+)

# ---------------------------------------------------------------------------
# converter/ tree — legitimate DB-access modules allowlisted whole-file.
#
# Mirrors the frozen tree's db_lookup.py / icon_resolver.py exemption: these
# modules exist SPECIFICALLY to hold DB-resolved property/attr or icon-identity
# lookup tables, so a dict literal there that superficially resembles a
# css-prop→attr map is expected.
#
# EXECUTION Step 9 (Phase 3, 2026-07-04) moved db_lookup.py's canonical
# implementation to converter/db/db_lookup.py (NOT converter/services/ —
# corrected here in Step 10 after the path drifted: the allowlist said
# "services/db_lookup.py" while the real file landed at "db/db_lookup.py",
# so 2 of its dict literals (_ATTR_NAME_OVERRIDES, _TYPO_CSS_SUFFIX_SELECTION)
# were silently scanned as ordinary converter/ code and baselined as
# individual violations instead of being whole-file exempt like icon_resolver.
# icon_resolver.py's path was already correct (converter/services/icon_resolver.py).
# ---------------------------------------------------------------------------
_CONVERTER_WHOLE_FILE_ALLOWLIST: frozenset[str] = frozenset({
    "db/db_lookup.py",
    "services/icon_resolver.py",
})

# ---------------------------------------------------------------------------
# CSS-property authority — DB-first (R-31-1).
#
# A dict key counts as a CSS property ONLY if it is a real CSS property. The
# authoritative source is property_suffixes.css_property in the framework DB;
# we fall back to a curated set of standard CSS property names when the DB is
# unavailable. We deliberately do NOT treat "any hyphenated lowercase string"
# as a CSS property — block-name fragments like "cta-section"/"product-card"
# are hyphenated lowercase but are NOT CSS properties, and the old loose rule
# false-flagged ordinary dicts (e.g. BLOCK_ICONS = {'cta-section': 'megaphone'}).
# ---------------------------------------------------------------------------

_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Standard CSS properties used as the fallback authority when the DB is absent.
# These are genuine CSS property names, not heuristics.
_STANDARD_CSS_PROPS: frozenset[str] = frozenset({
    "color", "background", "background-color", "background-image",
    "background-size", "background-position", "background-repeat",
    "display", "gap", "column-gap", "row-gap", "padding", "padding-top",
    "padding-right", "padding-bottom", "padding-left", "margin", "margin-top",
    "margin-right", "margin-bottom", "margin-left", "width", "max-width",
    "min-width", "height", "max-height", "min-height", "flex", "flex-direction",
    "flex-wrap", "grid", "grid-template-columns", "grid-template-rows",
    "grid-template-areas", "grid-column", "grid-row", "grid-area", "order",
    "position", "top", "right", "bottom", "left", "inset", "z-index",
    "overflow", "overflow-x", "overflow-y", "opacity", "transform", "border",
    "border-color", "border-radius", "border-width", "border-style", "outline",
    "cursor", "visibility", "content", "float", "clear", "font", "font-size",
    "font-weight", "font-style", "font-family", "line-height", "letter-spacing",
    "text-align", "text-decoration", "text-transform", "vertical-align",
    "align-items", "align-self", "align-content", "justify-content",
    "justify-self", "justify-items", "animation", "transition",
    "transition-duration", "box-shadow", "clip-path", "filter", "resize",
    "aspect-ratio", "object-fit", "object-position",
})

_CSS_PROP_SET_CACHE: frozenset[str] | None = None


def _css_property_authority() -> frozenset[str]:
    """Return the authoritative CSS-property set: DB ∪ standard fallback.

    Cached for the process. Reading the DB makes the gate DB-first (R-31-1):
    a dict key is only a CSS property if it is one the framework actually knows.
    """
    global _CSS_PROP_SET_CACHE
    if _CSS_PROP_SET_CACHE is not None:
        return _CSS_PROP_SET_CACHE
    props: set[str] = set(_STANDARD_CSS_PROPS)
    try:
        import sqlite3
        if _DB_PATH.exists():
            conn = sqlite3.connect(str(_DB_PATH))
            try:
                rows = conn.execute(
                    "SELECT DISTINCT css_property FROM property_suffixes "
                    "WHERE css_property IS NOT NULL"
                ).fetchall()
            finally:
                conn.close()
            props.update(r[0] for r in rows if r[0])
    except Exception:  # noqa: BLE001 — DB optional; fall back to standard set
        pass
    _CSS_PROP_SET_CACHE = frozenset(props)
    return _CSS_PROP_SET_CACHE


def _looks_like_css_prop(s: str) -> bool:
    """True iff s is a real CSS property (DB authority ∪ standard set).

    No loose 'any hyphenated lowercase' rule — that false-flagged block names.
    """
    return s in _css_property_authority()


def _is_css_prop_to_attr_dict(node: ast.Dict) -> bool:
    """Heuristic: at least half the key→value pairs are css-prop → attr-name.

    Keys may be:
    - ast.Constant str  — simple string key e.g. 'grid-template-columns'
    - ast.Tuple         — composite key e.g. ("grid-template-columns", "Columns")
                          whose FIRST element is a CSS-property string.  This is the
                          shape used by _SUFFIX_ATTR_OVERRIDES and _ATTR_NAME_OVERRIDES.
    """
    if not node.keys:
        return False
    total = 0
    matches = 0
    for k, v in zip(node.keys, node.values):
        if k is None:
            continue

        # --- determine the candidate CSS-property string from the key ---
        css_candidate: str | None = None

        if isinstance(k, ast.Constant) and isinstance(k.value, str):
            # Simple string key.
            css_candidate = k.value

        elif isinstance(k, ast.Tuple) and k.elts:
            # Tuple key: treat the first element as the CSS property if it is a
            # string constant.  Handles (_SUFFIX_ATTR_OVERRIDES / _ATTR_NAME_OVERRIDES
            # whose keys are ("grid-template-columns", "Columns") etc.)
            first = k.elts[0]
            if isinstance(first, ast.Constant) and isinstance(first.value, str):
                css_candidate = first.value

        if css_candidate is None:
            continue

        if not isinstance(v, ast.Constant) or not isinstance(v.value, str):
            # Allow tuple values (like prop_map's (top, sub, kind))
            if isinstance(v, ast.Tuple):
                if all(isinstance(e, ast.Constant) for e in v.elts):
                    total += 1
                    if _looks_like_css_prop(css_candidate):
                        matches += 1
            continue

        total += 1
        if _looks_like_css_prop(css_candidate):
            matches += 1

    if total == 0:
        return False
    return matches >= max(1, total // 2)


class _DictLiteralVisitor(ast.NodeVisitor):
    """Walk AST and find named or inline css-prop→attr dict literals."""

    def __init__(self) -> None:
        self.findings: list[dict] = []
        self._assignment_target: str | None = None
        self._func_stack: list[str] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._func_stack.append(node.name)
        self.generic_visit(node)
        self._func_stack.pop()

    visit_AsyncFunctionDef = visit_FunctionDef

    def _current_func(self) -> str:
        return self._func_stack[-1] if self._func_stack else "<module>"

    def visit_Assign(self, node: ast.Assign) -> None:
        # Capture name for named dicts like _SUFFIX_ATTR_OVERRIDES = {...}
        name = None
        if node.targets and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
        if isinstance(node.value, ast.Dict):
            if _is_css_prop_to_attr_dict(node.value):
                self.findings.append({
                    "name": name or "<anonymous>",
                    "func": self._current_func(),
                    "line": node.lineno,
                })
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        # Typed assignment: _SUFFIX_ATTR_OVERRIDES: dict[…] = {…}
        name = None
        if isinstance(node.target, ast.Name):
            name = node.target.id
        if node.value and isinstance(node.value, ast.Dict):
            if _is_css_prop_to_attr_dict(node.value):
                self.findings.append({
                    "name": name or "<anonymous>",
                    "func": self._current_func(),
                    "line": node.lineno,
                })
        self.generic_visit(node)


def _collect_hardcoded_dicts_in_file(path: Path) -> list[dict]:
    """Return list of {'name', 'func', 'line'} for each suspicious dict in path."""
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(path))
    except SyntaxError:
        return []
    visitor = _DictLiteralVisitor()
    visitor.visit(tree)
    return visitor.findings


def _rel(path: Path, base: Path = _ORCHESTRATOR) -> str:
    try:
        return str(path.relative_to(base))
    except ValueError:
        return str(path)


def _scan_tree(
    scan_dir: Path,
    base: Path,
    whole_file_allowlist: frozenset[str] = frozenset(),
) -> list[Violation]:
    """Scan one directory tree for hardcoded CSS-property→attr dicts. Returns Violations.

    file_rel keys (for allowlist lookups + reporting) are relative to `base`.
    """
    violations: list[Violation] = []

    if not scan_dir.exists():
        return violations

    for py_path in sorted(scan_dir.rglob("*.py")):
        # Skip test files
        if (
            py_path.name.startswith("test_")
            or "_tests" in [p.name for p in py_path.parents]
            or "tests" in [p.name for p in py_path.parents]
        ):
            continue

        file_rel = _rel(py_path, base)

        # Normalise to forward-slash for the allowlist comparison — file_rel is
        # OS-native (backslash on Windows), allowlist entries are written
        # forward-slash-style. Without this, the allowlist silently never
        # matches on Windows.
        if file_rel.replace("\\", "/") in whole_file_allowlist:
            continue

        findings = _collect_hardcoded_dicts_in_file(py_path)

        for f in findings:
            name = f["name"]
            key = hardcoded_dict_key(file_rel, name)
            detail = (
                f"Hardcoded CSS-property → attr-name dict '{name}' in {file_rel} "
                f"(function: {f['func']}, approx. line {f['line']}). "
                f"R-31-1: all property→attr lookups must come from property_suffixes in the DB, "
                f"not a hardcoded dict."
            )
            fix = (
                f"Replace '{name}' in {file_rel} with a live DB query: "
                f"SELECT suffix FROM property_suffixes WHERE css_property = '<prop>'. "
                f"If this is a LEGACY dict in the frozen convert.py, it is baselined — "
                f"it vanishes when the modular rebuild replaces those code paths."
            )
            violations.append(Violation(
                check="hardcoded_dict",
                file=file_rel,
                detail=detail,
                fix=fix,
                key=key,
            ))

    return violations


_UNSET = object()  # sentinel — distinguishes "not passed" from an explicit None/path


def run(
    orchestrator_dir: Path | None = None,
    converter_dir: Path | None | object = _UNSET,
) -> list[Violation]:
    """Scan the orchestrator tree AND the converter/ tree for hardcoded dicts.

    orchestrator_dir / converter_dir let tests override either scan root
    independently. Test isolation: a caller that supplies orchestrator_dir but
    leaves converter_dir unset (the existing test-suite calling convention,
    e.g. `run(orchestrator_dir=tmp_path)`) scans ONLY the supplied orchestrator
    tree — it must not also sweep in findings from the real converter/ tree.
    A bare `run()` call (both left at default — the real production/--check
    invocation from run.py) scans BOTH real project trees.
    """
    violations: list[Violation] = []
    resolved_orchestrator_dir = orchestrator_dir or _ORCHESTRATOR
    # `base` tracks whichever dir was actually scanned (real or test-supplied) so
    # _rel() can compute a proper relative path instead of falling through to an
    # absolute path when a test overrides the scan root.
    violations.extend(_scan_tree(resolved_orchestrator_dir, resolved_orchestrator_dir))

    if converter_dir is _UNSET:
        if orchestrator_dir is None:
            # Bare run() — real production scan of both trees.
            resolved_converter_dir: Path | None = _CONVERTER
        else:
            # orchestrator_dir was explicitly overridden (test isolation) and
            # converter_dir was not supplied — do not scan the real tree.
            resolved_converter_dir = None
    else:
        resolved_converter_dir = converter_dir  # type: ignore[assignment]

    if resolved_converter_dir is not None:
        violations.extend(_scan_tree(
            resolved_converter_dir, resolved_converter_dir, _CONVERTER_WHOLE_FILE_ALLOWLIST
        ))
    return violations

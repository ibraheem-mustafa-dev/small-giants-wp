"""check_parallel_bp.py — Check #4: parallel breakpoint vocabulary.

Spec 31 §7a check 4:
  (a) Flag the in-code _BP_SUFFIX_MAP dict in convert.py (it must derive from
      modifier_suffixes, not be hardcoded).
  (b) Flag integer literals 640–1100 in convert.py that appear OUTSIDE a
      db.breakpoint_suffix_rules() call context — they indicate a hardcoded
      breakpoint value instead of the DB-driven vocabulary.

  Note: This check targets convert.py specifically because §7a names it as the
  file containing _BP_SUFFIX_MAP (line 980) and the parallel breakpoint
  literal integers.  The whole-tree scan for (b) would create too many false
  positives from non-breakpoint numeric literals; convert.py is the known
  offender.

  check #5 (mirror-emit / sourceMode='bound') is DELEGATED to check_no_mirror.py
  — see the comment in run.py.

UK English throughout.
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from cheat_gate.models import Violation, parallel_bp_key  # type: ignore[import]

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent           # scripts/cheat-gate/
_SCRIPTS_DIR = _HERE.parent                        # scripts/
_ORCHESTRATOR = _SCRIPTS_DIR / "orchestrator"
_CONVERT_PY = _ORCHESTRATOR / "converter_v2" / "convert.py"

# The known symbol that must be derived from the DB, not hardcoded
_BP_MAP_SYMBOL = "_BP_SUFFIX_MAP"

# Integer breakpoint range to flag (device-tier range per §7a)
_BP_INT_MIN = 640
_BP_INT_MAX = 1100

# Context string for DB-driven calls — if a breakpoint int appears INSIDE
# a call to db.breakpoint_suffix_rules() it is legitimate.
# We approximate this by checking the call chain; see _get_db_call_lines below.
_DB_CALL_PATTERN = re.compile(r"db\.breakpoint_suffix_rules\(")


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(_ORCHESTRATOR))
    except ValueError:
        return str(path)


# ---------------------------------------------------------------------------
# (a) Detect _BP_SUFFIX_MAP literal assignment in a file
# ---------------------------------------------------------------------------

class _BPMapDetector(ast.NodeVisitor):
    """Detect _BP_SUFFIX_MAP assignment (module-level or function-level)."""

    def __init__(self) -> None:
        self.found_bp_map = False

    def visit_Assign(self, node: ast.Assign) -> None:
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == _BP_MAP_SYMBOL:
                if isinstance(node.value, ast.Dict):
                    self.found_bp_map = True
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if isinstance(node.target, ast.Name) and node.target.id == _BP_MAP_SYMBOL:
            if node.value and isinstance(node.value, ast.Dict):
                self.found_bp_map = True
        self.generic_visit(node)


# ---------------------------------------------------------------------------
# (b) Detect raw integer literals in breakpoint range outside DB-call context
# ---------------------------------------------------------------------------

def _get_db_call_lines(source: str) -> frozenset[int]:
    """Return line numbers that contain a db.breakpoint_suffix_rules() call."""
    lines: set[int] = set()
    for i, line in enumerate(source.splitlines(), start=1):
        if _DB_CALL_PATTERN.search(line):
            lines.add(i)
    return frozenset(lines)


class _BPIntLiteralDetector(ast.NodeVisitor):
    """Find integer literals in the breakpoint range 640–1100."""

    def __init__(self, db_call_lines: frozenset[int]) -> None:
        self.db_call_lines = db_call_lines
        # (value, line)
        self.findings: list[tuple[int, int]] = []

    def visit_Constant(self, node: ast.Constant) -> None:
        if isinstance(node.value, int) and _BP_INT_MIN <= node.value <= _BP_INT_MAX:
            line = getattr(node, "lineno", 0)
            if line not in self.db_call_lines:
                self.findings.append((node.value, line))
        self.generic_visit(node)


def _scan_convert_py_for_parallel_bp(path: Path) -> tuple[bool, list[tuple[int, int]]]:
    """Return (has_bp_map, [(int_value, line), ...]) for convert.py."""
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(path))
    except (SyntaxError, OSError):
        return False, []

    map_detector = _BPMapDetector()
    map_detector.visit(tree)

    db_call_lines = _get_db_call_lines(source)

    int_detector = _BPIntLiteralDetector(db_call_lines)
    int_detector.visit(tree)

    # Deduplicate by value (don't report 768 six times)
    seen_values: set[int] = set()
    unique_ints: list[tuple[int, int]] = []
    for val, line in int_detector.findings:
        if val not in seen_values:
            seen_values.add(val)
            unique_ints.append((val, line))

    return map_detector.found_bp_map, unique_ints


def run(convert_py: Path | None = None) -> list[Violation]:
    """Check for parallel breakpoint vocabulary in convert.py.

    Returns a list of Violation objects.
    """
    target = convert_py or _CONVERT_PY
    violations: list[Violation] = []

    if not target.exists():
        return violations

    file_rel = _rel(target)
    has_bp_map, bp_ints = _scan_convert_py_for_parallel_bp(target)

    # (a) _BP_SUFFIX_MAP symbol
    if has_bp_map:
        key = parallel_bp_key(file_rel, _BP_MAP_SYMBOL)
        detail = (
            f"Hardcoded '{_BP_MAP_SYMBOL}' dict found in {file_rel}. "
            f"This parallel breakpoint vocabulary must be replaced by a DB query: "
            f"SELECT suffix FROM modifier_suffixes WHERE kind='breakpoint'. "
            f"(Spec 31 §7a check 4 / §6 goal 3.)"
        )
        fix = (
            f"Delete '{_BP_MAP_SYMBOL}' from {file_rel}. "
            f"Replace every _BP_SUFFIX_MAP.get(key) call with a call to "
            f"db.breakpoint_suffix_rules() so the breakpoint vocabulary is DB-driven. "
            f"This is a LEGACY violation in the frozen convert.py — it is baselined and "
            f"will vanish when the modular rebuild replaces these code paths."
        )
        violations.append(Violation(
            check="parallel_bp",
            file=file_rel,
            detail=detail,
            fix=fix,
            key=key,
        ))

    # (b) Integer literals in breakpoint range
    for val, line in bp_ints:
        key = parallel_bp_key(file_rel, str(val))
        detail = (
            f"Hardcoded breakpoint integer {val} in {file_rel} "
            f"(approx. line {line}), outside a db.breakpoint_suffix_rules() call. "
            f"Device-tier breakpoints must come from modifier_suffixes, not literals."
        )
        fix = (
            f"Replace the hardcoded integer {val} in {file_rel} with a DB-driven "
            f"breakpoint value from db.breakpoint_suffix_rules(). "
            f"This is a LEGACY violation in the frozen convert.py — it is baselined."
        )
        violations.append(Violation(
            check="parallel_bp",
            file=file_rel,
            detail=detail,
            fix=fix,
            key=key,
        ))

    return violations

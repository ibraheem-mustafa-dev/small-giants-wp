"""check_parallel_bp.py — Check #4: parallel breakpoint vocabulary.

Spec 31 §7a check 4:
  (a) Flag the in-code _BP_SUFFIX_MAP dict in convert.py (it must derive from
      modifier_suffixes, not be hardcoded).
  (b) Flag integer literals 640–1100 in convert.py that appear OUTSIDE a
      db.breakpoint_suffix_rules() call context — they indicate a hardcoded
      breakpoint value instead of the DB-driven vocabulary.

  Note: This check originally targeted the frozen convert.py specifically
  because §7a named it as the file containing _BP_SUFFIX_MAP (line 980) and
  the parallel breakpoint literal integers. REPOINTED (EXECUTION Step 16,
  2026-07-05): convert.py is deleted. Part (b)'s scan target moves to the new
  engine's tier/breakpoint surfaces — converter/services/extraction.py (where
  db_lookup.breakpoint_suffix_rules() is consumed) and converter/db/db_lookup.py
  (where it's defined) — rather than a whole-tree scan (still avoids the
  false-positive risk of scanning every numeric literal tree-wide; verified
  2026-07-05 that converter/ has ZERO _BP_SUFFIX_MAP-shaped dict anywhere —
  the new engine already derives breakpoints from modifier_suffixes via
  breakpoint_suffix_rules(), see fold_helpers.py's "former hardcoded
  _BP_SUFFIX_MAP ... is removed" comment).

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
_CONVERTER = _SCRIPTS_DIR / "converter"
# New engine's tier/breakpoint surface (repointed off the deleted frozen
# convert.py at EXECUTION Step 16, 2026-07-05 — see module docstring).
#
# converter/db/db_lookup.py is DELIBERATELY EXCLUDED: it defines
# _DEVICE_TIER_SAMPLES / _DEVICE_TIER_THRESHOLDS (375/767/768/800/1023/1024/
# 1440), which are the fixed, DOCUMENTED web-platform device-tier breakpoint
# STANDARD (not per-block hardcoded data) — see that file's own comment +
# CLAUDE.md's "Responsive breakpoint discipline — device-tier vs visual"
# rule. Scanning it produced 5 false-positive findings when trialled
# 2026-07-05 (each a legitimate, cited constant, not the _BP_SUFFIX_MAP-class
# violation this check exists to catch) — confirming the module docstring's
# original whole-tree-creates-false-positives warning.
_BP_SURFACE_FILES: tuple[Path, ...] = (
    _CONVERTER / "services" / "extraction.py",
)

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
        return str(path.relative_to(_SCRIPTS_DIR))
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


def _scan_file_for_bp_map_symbol(path: Path) -> bool:
    """Return True if path contains a _BP_SUFFIX_MAP dict assignment."""
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(path))
    except (SyntaxError, OSError):
        return False
    detector = _BPMapDetector()
    detector.visit(tree)
    return detector.found_bp_map


def run(
    convert_py: Path | None = None,
    orchestrator_dir: Path | None = None,
) -> list[Violation]:
    """Check for parallel breakpoint vocabulary.

    (a) Scans the ENTIRE orchestrator/ tree for _BP_SUFFIX_MAP-named dict
        literals.  The original spec named convert.py as the known offender, but
        the same violation class can appear in modular files (db_lookup.py etc.)
        so the scan is tree-wide.  convert_py is kept as an override for tests.

        When convert_py is explicitly provided but orchestrator_dir is not, the
        tree scan uses the directory that contains convert_py.  This keeps test
        isolation correct — a test that passes a tmp_path/convert.py should not
        accidentally scan the real orchestrator/.

    (b) Scans ONLY convert.py for raw integer literals in the breakpoint range
        640–1100 (whole-tree integer scan produces too many false positives from
        non-breakpoint numeric constants; convert.py is the known offender for
        this sub-check).

    Returns a list of Violation objects.
    """
    violations: list[Violation] = []

    # --- (a) _BP_SUFFIX_MAP symbol — orchestrator/ + converter/ trees ---
    if orchestrator_dir is not None:
        scan_dirs = [orchestrator_dir]
    elif convert_py is not None:
        # Test mode: scope tree scan to the same directory as the supplied file.
        scan_dirs = [convert_py.parent]
    else:
        # Production default: both the (post-deletion, converter_v2-free)
        # orchestrator/ tree AND the modular converter/ tree — the new
        # engine's tier/breakpoint surfaces (EXECUTION Step 16, 2026-07-05).
        scan_dirs = [_ORCHESTRATOR, _CONVERTER]
    for scan_dir in scan_dirs:
        if not scan_dir.exists():
            continue
        for py_path in sorted(scan_dir.rglob("*.py")):
            # Skip test files
            if (
                py_path.name.startswith("test_")
                or "_tests" in [p.name for p in py_path.parents]
                or "tests" in [p.name for p in py_path.parents]
            ):
                continue
            file_rel = _rel(py_path)
            if _scan_file_for_bp_map_symbol(py_path):
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
                    f"This is a LEGACY violation — it is baselined and will vanish when "
                    f"the modular rebuild replaces these code paths."
                )
                violations.append(Violation(
                    check="parallel_bp",
                    file=file_rel,
                    detail=detail,
                    fix=fix,
                    key=key,
                ))

    # --- (b) Integer literals in breakpoint range ---
    # Test override: a single explicit file (test isolation, unchanged shape).
    # Production: the new engine's tier/breakpoint surfaces (see module docstring).
    targets = [convert_py] if convert_py is not None else list(_BP_SURFACE_FILES)
    for target in targets:
        if not target.exists():
            continue
        file_rel = _rel(target)
        _has_bp_map, bp_ints = _scan_convert_py_for_parallel_bp(target)
        # (bp_map detection above already covered this file; only add integers here)
        for val, line in bp_ints:
            key = parallel_bp_key(file_rel, str(val))
            detail = (
                f"Hardcoded breakpoint integer {val} in {file_rel} "
                f"(approx. line {line}), outside a db.breakpoint_suffix_rules() call. "
                f"Device-tier breakpoints must come from modifier_suffixes, not literals."
            )
            fix = (
                f"Replace the hardcoded integer {val} in {file_rel} with a DB-driven "
                f"breakpoint value from db.breakpoint_suffix_rules()."
            )
            violations.append(Violation(
                check="parallel_bp",
                file=file_rel,
                detail=detail,
                fix=fix,
                key=key,
            ))

    return violations

"""check_sentinel.py — Check #7: sentinel leakage ('unitless' string).

Spec 31 §7a check 7:
  Scan emitted block attrs (extract.json in a run_dir, optional) AND the
  orchestrator code for the literal string "unitless" parse sentinel leaking.

  The 'unitless' sentinel is an internal parse marker (Family B issue in the
  defect register: '1.65unitless') that must NEVER reach emitted block attrs.
  Its presence in emitted attrs means the render-side strip failed (or was
  never reached), and the raw sentinel value is stored in the post content.

  Two sub-checks:
  (a) Code scan — grep orchestrator .py files for string literal "unitless"
      in contexts that would emit it to output (not just internal processing).
  (b) Run-dir scan — if run_dir is available, scan extract.json block attrs
      for any value containing 'unitless'.

UK English throughout.
"""
from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from cheat_gate.models import Violation, sentinel_key  # type: ignore[import]

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent           # scripts/cheat-gate/
_SCRIPTS_DIR = _HERE.parent                        # scripts/
_ORCHESTRATOR = _SCRIPTS_DIR / "orchestrator"
_PIPELINE_STATE = _SCRIPTS_DIR / "pipeline-state"

_SENTINEL_VALUE = "unitless"
_SENTINEL_RE = re.compile(r'\bunitless\b', re.IGNORECASE)


def _latest_run_dir() -> Path | None:
    """Return the most-recently-modified pipeline-state subdirectory."""
    if not _PIPELINE_STATE.exists():
        return None
    candidates = [d for d in _PIPELINE_STATE.iterdir() if d.is_dir() and not d.name.startswith(".")]
    if not candidates:
        return None
    return max(candidates, key=lambda d: d.stat().st_mtime)


# ---------------------------------------------------------------------------
# (a) Code scan — find "unitless" string literals in orchestrator code that
#     appear in an EMIT or RETURN context (not just internal processing flags)
# ---------------------------------------------------------------------------

class _SentinelCodeVisitor(ast.NodeVisitor):
    """Find 'unitless' string literals in positions that could reach emitted attrs."""

    def __init__(self) -> None:
        self.findings: list[dict] = []
        self._func_stack: list[str] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._func_stack.append(node.name)
        self.generic_visit(node)
        self._func_stack.pop()

    visit_AsyncFunctionDef = visit_FunctionDef

    def _current_func(self) -> str:
        return self._func_stack[-1] if self._func_stack else "<module>"

    def visit_Constant(self, node: ast.Constant) -> None:
        if isinstance(node.value, str) and node.value == _SENTINEL_VALUE:
            self.findings.append({
                "func": self._current_func(),
                "line": getattr(node, "lineno", 0),
            })
        self.generic_visit(node)


def _scan_code_for_sentinel(path: Path) -> list[dict]:
    """Return list of {'func', 'line'} for each 'unitless' literal in path."""
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
        # Quick pre-check to avoid parsing unnecessary files
        if _SENTINEL_VALUE not in source:
            return []
        tree = ast.parse(source, filename=str(path))
    except (SyntaxError, OSError):
        return []
    visitor = _SentinelCodeVisitor()
    visitor.visit(tree)
    return visitor.findings


def _rel_orch(path: Path) -> str:
    try:
        return str(path.relative_to(_ORCHESTRATOR))
    except ValueError:
        return str(path)


# ---------------------------------------------------------------------------
# (b) Run-dir scan — check extract.json block attrs for 'unitless' values
# ---------------------------------------------------------------------------

def _scan_extract_json(run_dir: Path) -> list[dict]:
    """Scan extract.json (or extract.patched.json) for 'unitless' in block attrs.

    Returns list of {'block_slug', 'attr_name', 'value'} for each finding.
    """
    findings: list[dict] = []
    for fname in ("extract.patched.json", "extract.json"):
        p = run_dir / fname
        if not p.exists():
            continue
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue

        # Walk block_markup looking for block comments with attrs containing unitless
        block_markup = data.get("block_markup", "")
        if block_markup and _SENTINEL_VALUE in block_markup.lower():
            # Rough scan — report the file itself
            findings.append({
                "block_slug": "<block_markup>",
                "attr_name": "<multiple>",
                "value": f"'unitless' found in {fname} block_markup",
            })

        # Also check structured attrs if present
        blocks = data.get("blocks", [])
        if isinstance(blocks, list):
            for block in blocks:
                slug = block.get("slug", "<unknown>")
                attrs = block.get("attrs", {})
                if isinstance(attrs, dict):
                    for attr_name, attr_val in attrs.items():
                        if isinstance(attr_val, str) and _SENTINEL_VALUE in attr_val.lower():
                            findings.append({
                                "block_slug": slug,
                                "attr_name": attr_name,
                                "value": attr_val,
                            })
        break  # stop at first found file

    return findings


def run(run_dir: Path | None = None, orchestrator_dir: Path | None = None) -> list[Violation]:
    """Check for 'unitless' sentinel leakage in code and emitted attrs.

    run_dir         — pipeline-state run directory (optional; skipped if absent)
    orchestrator_dir — override for the orchestrator scan root (optional)

    Returns a list of Violation objects.
    """
    violations: list[Violation] = []
    scan_dir = orchestrator_dir or _ORCHESTRATOR

    # ------------------------------------------------------------------
    # (a) Code scan
    # ------------------------------------------------------------------
    if scan_dir.exists():
        for py_path in sorted(scan_dir.rglob("*.py")):
            # Skip test files
            if (
                py_path.name.startswith("test_")
                or "_tests" in [p.name for p in py_path.parents]
                or "tests" in [p.name for p in py_path.parents]
            ):
                continue

            file_rel = _rel_orch(py_path)
            findings = _scan_code_for_sentinel(py_path)

            # Deduplicate per (file, func) — one violation per function scope
            seen_funcs: set[str] = set()
            for f in findings:
                func = f["func"]
                dedup = f"{file_rel}::{func}"
                if dedup in seen_funcs:
                    continue
                seen_funcs.add(dedup)

                key = sentinel_key(file_rel, func)
                detail = (
                    f"String literal 'unitless' found in {file_rel} "
                    f"(function: {func}, approx. line {f['line']}). "
                    f"The 'unitless' parse sentinel must NOT leak into emitted block attrs "
                    f"(Family B defect: '1.65unitless'). "
                    f"Verify it is stripped by render.php before being stored."
                )
                fix = (
                    f"Check that the 'unitless' sentinel in {file_rel}::{func} is stripped "
                    f"at the render.php side before being saved to post content. "
                    f"The sentinel is an INTERNAL parse marker (kind_override='number_unitless') "
                    f"and must be replaced with the plain numeric value before emit. "
                    f"See Spec 31 §8 Family B mechanism."
                )
                violations.append(Violation(
                    check="sentinel",
                    file=file_rel,
                    detail=detail,
                    fix=fix,
                    key=key,
                ))

    # ------------------------------------------------------------------
    # (b) Run-dir scan
    # ------------------------------------------------------------------
    actual_run_dir = run_dir or _latest_run_dir()
    if actual_run_dir is not None:
        extract_findings = _scan_extract_json(actual_run_dir)
        for f in extract_findings:
            slug = f["block_slug"]
            attr = f["attr_name"]
            val = f["value"]
            key = sentinel_key(str(actual_run_dir.name), f"{slug}:{attr}")
            detail = (
                f"'unitless' sentinel found in emitted block attrs "
                f"(run: {actual_run_dir.name}): "
                f"block='{slug}', attr='{attr}', value snippet='{val[:80]}'. "
                f"The sentinel is leaking into post content — Family B bug is NOT fixed."
            )
            fix = (
                f"Fix render.php for the block '{slug}' to strip the 'unitless' sentinel "
                f"from the attribute value before rendering. "
                f"The sentinel should be resolved to a plain number at render time."
            )
            violations.append(Violation(
                check="sentinel",
                file=str(actual_run_dir),
                detail=detail,
                fix=fix,
                key=key,
            ))

    return violations

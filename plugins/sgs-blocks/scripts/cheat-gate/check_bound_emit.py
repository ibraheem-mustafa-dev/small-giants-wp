"""check_bound_emit.py — Check #8: static sourceMode='bound' EMIT in converter source.

Spec 31 §7a check 5 (the mirror/bound cheat) is delegated to check_no_mirror.py,
which inspects clone OUTPUT (extract.json block_markup) and runs POST-CLONE via
pipeline-stage-gate.py. That leaves a commit-time gap: a future session can COMMIT
converter code that emits `sourceMode='bound'` (the echo-$content passthrough cheat,
purged D182) without ever running a clone — nothing catches it until a clone runs.

This check closes that gap with a STATIC scan of the CONVERTER source tree
(``converter/`` — the modular converter; the frozen ``orchestrator/converter_v2/``
package was deleted at EXECUTION Step 16, 2026-07-05). It is AST-based so comments
and docstrings that merely DESCRIBE the cheat (as this file and check_no_mirror.py
do) are never matched — only real code that BUILDS a sourceMode value:

    {"sourceMode": "bound"}        ast.Dict   key 'sourceMode' → value not in legit set
    foo(sourceMode="bound")        ast.keyword sourceMode=...
    sourceMode = "bound"           ast.Assign / AnnAssign to a name 'sourceMode'

Legitimate live-data modes (wc-product / sgs-cpt / typed) are allowed. Today the
converter emits NO sourceMode literal, so this baseline ships EMPTY — a tripwire for a
FUTURE re-introduction, complementary to check_no_mirror's output-side check.

UK English throughout.
"""
from __future__ import annotations

import ast
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from cheat_gate.models import Violation, bound_emit_key  # type: ignore[import]

_HERE = Path(__file__).resolve().parent           # scripts/cheat-gate/
_SCRIPTS_DIR = _HERE.parent                        # scripts/
# Scan the modular converter itself, NOT the gate infrastructure in orchestrator/
# (check_no_mirror.py / pipeline-stage-gate.py legitimately describe 'bound'). The
# frozen orchestrator/converter_v2/ package was deleted at EXECUTION Step 16
# (2026-07-05) — converter/ is the only converter source tree left to scan.
_CONVERTER_DIR = _SCRIPTS_DIR / "converter"

# Legitimate live-data source modes — mirrors check_no_mirror.LEGIT_SOURCE_MODES.
_LEGIT_MODES = frozenset({"wc-product", "sgs-cpt", "typed"})


def _illegit(value: object) -> bool:
    """True iff value is a string sourceMode that is NOT a legitimate live-data mode."""
    return isinstance(value, str) and value.lower() not in _LEGIT_MODES


class _SourceModeVisitor(ast.NodeVisitor):
    """Flag real code that builds sourceMode = an illegitimate (e.g. 'bound') value."""

    def __init__(self) -> None:
        self.hits: list[tuple[int, str]] = []  # (lineno, value)

    def visit_Dict(self, node: ast.Dict) -> None:
        for k, v in zip(node.keys, node.values):
            if (
                isinstance(k, ast.Constant) and k.value == "sourceMode"
                and isinstance(v, ast.Constant) and _illegit(v.value)
            ):
                self.hits.append((node.lineno, str(v.value)))
        self.generic_visit(node)

    def visit_keyword(self, node: ast.keyword) -> None:
        if (
            node.arg == "sourceMode"
            and isinstance(node.value, ast.Constant) and _illegit(node.value.value)
        ):
            self.hits.append((node.value.lineno, str(node.value.value)))
        self.generic_visit(node)

    def _check_assign_target(self, targets: list[ast.expr], value: ast.expr) -> None:
        if not (isinstance(value, ast.Constant) and _illegit(value.value)):
            return
        for t in targets:
            name = getattr(t, "id", None) or getattr(t, "attr", None)
            if name == "sourceMode":
                self.hits.append((value.lineno, str(value.value)))

    def visit_Assign(self, node: ast.Assign) -> None:
        self._check_assign_target(node.targets, node.value)
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if node.value is not None:
            self._check_assign_target([node.target], node.value)
        self.generic_visit(node)


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(_SCRIPTS_DIR))
    except ValueError:
        return str(path)


def run(converter_dir: Path | None = None) -> list[Violation]:
    """Scan the converter tree for an illegitimate sourceMode emit. Empty when clean."""
    scan_dir = converter_dir or _CONVERTER_DIR
    violations: list[Violation] = []
    if not scan_dir.exists():
        return violations

    for py_path in sorted(scan_dir.rglob("*.py")):
        if py_path.name.startswith("test_") or "tests" in {p.name for p in py_path.parents}:
            continue
        try:
            tree = ast.parse(py_path.read_text(encoding="utf-8", errors="replace"), filename=str(py_path))
        except SyntaxError:
            continue
        visitor = _SourceModeVisitor()
        visitor.visit(tree)
        file_rel = _rel(py_path)
        for lineno, mode in visitor.hits:
            detail = (
                f"Converter source builds sourceMode='{mode}' in {file_rel}:{lineno}. "
                f"'bound' is the echo-$content mirror cheat (purged D182); only "
                f"{sorted(_LEGIT_MODES)} are legitimate live-data modes. A static emit here "
                f"ships the cheat at commit time, before any clone runs check_no_mirror."
            )
            fix = (
                f"Remove the sourceMode='{mode}' emit in {file_rel}:{lineno}. Cloned blocks "
                f"must convert to native typed attrs (sourceMode='typed' via the icon-identity "
                f"resolver), not mirror the draft via a bound passthrough. If this is a NEW "
                f"legitimate live-data mode, add it to _LEGIT_MODES here AND in "
                f"check_no_mirror.LEGIT_SOURCE_MODES, with a design-gate."
            )
            violations.append(Violation(
                check="bound_emit",
                file=file_rel,
                detail=detail,
                fix=fix,
                key=bound_emit_key(file_rel, lineno),
            ))
    return violations

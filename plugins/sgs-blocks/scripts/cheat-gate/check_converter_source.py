"""check_converter_source.py — Check #9: static source cheats in the new converter/ tree.

Spec ref: Spec 31 §7a checks 4 + 5, applied SOURCE-side to the fresh modular converter
(plugins/sgs-blocks/scripts/converter/). The existing gates miss this tree:

  - check_no_mirror.py validates clone OUTPUT (extract.json block_markup) and runs
    POST-CLONE. The new engine is INERT (no production caller), so it never produces a
    clone output — a source-level className-mirror in converter/ is invisible to it.
  - check_parallel_bp.py scans orchestrator/ and keys on the literal symbol name
    _BP_SUFFIX_MAP, so a differently-named suffix-identity dict (e.g. the old
    _TIER_SUFFIX, tier_suffix.py) in converter/ slips straight through.

This AST gate closes both, statically, at commit time. Three sub-checks, scoped to the
converter/ tree (calibrated D249 — after the purge it ships an EMPTY baseline: a pure
tripwire for re-introduction, including when Task-3 wires the interior walker):

  (a) className WRITE   attrs["className"]=…  /  className=…  /  {"className": …}
        → 7-rules #1 CONVERT-don't-mirror / R-22-15. A native block carries identity via
          its block NAME; re-emitting draft BEM classes onto className is the mirror cheat.
          Reading className (node.get("className")) is NOT a write — never flagged.
  (b) suffix-vocab dict  {"Mobile":"Mobile", …}  (≥2 string values, ALL in the DB suffix
        vocabulary) → R-22-1 / Spec 31 §7a.4: the suffix grammar is DB-owned.
  (c) side-suffix regex  re.sub(r"(Top|Right|Bottom|Left)…", …)  (≥2 DB side words
        pipe-joined in a string that is an ARGUMENT to an re.* call) → R-22-1: the side
        vocabulary is DB-owned. Scoped to re.* call args (not all string literals) so a
        docstring/comment that merely QUOTES the pattern is never matched.

The suffix vocabulary for (b)/(c) is read from the DB (modifier_suffixes), so the gate
itself carries NO hardcoded suffix list. AST-only — comments/docstrings are never matched.

UK English throughout.
"""
from __future__ import annotations

import ast
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from cheat_gate.models import Violation, converter_source_key  # type: ignore[import]

_HERE = Path(__file__).resolve().parent           # scripts/cheat-gate/
_SCRIPTS_DIR = _HERE.parent                        # scripts/
_CONVERTER_DIR = _SCRIPTS_DIR / "converter"        # the NEW modular converter tree
_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Structural suffix kinds whose vocabulary, if hardcoded as an identity dict, is the
# R-22-1 violation. state/variant excluded (not the box/grid suffix grammar).
_STRUCTURAL_KINDS = ("breakpoint", "side", "corner", "unit")


def _suffix_vocab() -> tuple[frozenset[str], tuple[str, ...]]:
    """Return (all_structural_suffixes_lowercased, side_suffixes) from the DB.

    Degrades to empty on a missing DB — (b)/(c) then detect nothing (the className
    check (a) is DB-independent and still fires)."""
    try:
        conn = sqlite3.connect(str(_DB_PATH))
        try:
            rows = conn.execute(
                "SELECT suffix, kind FROM modifier_suffixes WHERE kind IN "
                "('breakpoint','side','corner','unit')"
            ).fetchall()
        finally:
            conn.close()
    except sqlite3.Error:
        return frozenset(), ()
    allv = frozenset(str(s).lower() for s, _k in rows if s)
    sides = tuple(str(s) for s, k in rows if k == "side" and s)
    return allv, sides


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(_SCRIPTS_DIR))
    except ValueError:
        return str(path)


def _is_empty_const(value: ast.expr) -> bool:
    """True for an empty-string / None constant — a legitimate className clear, not a mirror."""
    return isinstance(value, ast.Constant) and (value.value == "" or value.value is None)


class _SourceVisitor(ast.NodeVisitor):
    """Flag className writes, suffix-identity dicts, and side-suffix regex literals."""

    # re module functions whose string args are regex patterns.
    _RE_FUNCS = frozenset({"sub", "compile", "match", "search", "fullmatch", "findall", "finditer", "split"})

    def __init__(self, suffix_vocab: frozenset[str], side_vocab: tuple[str, ...]) -> None:
        self.suffix_vocab = suffix_vocab
        # ≥2 DB side words pipe-joined in a regex pattern (the (Top|Right|Bottom|Left) form).
        side_alt = "|".join(re.escape(s) for s in side_vocab) if side_vocab else None
        self._side_re = (
            re.compile(rf"({side_alt})\s*\|\s*({side_alt})") if side_alt else None
        )
        self.hits: list[tuple[str, int, str]] = []  # (kind, lineno, symbol)

    # (a) className writes -----------------------------------------------------
    def visit_Assign(self, node: ast.Assign) -> None:
        for t in node.targets:
            if isinstance(t, ast.Subscript):
                key = t.slice
                if (
                    isinstance(key, ast.Constant) and key.value == "className"
                    and not _is_empty_const(node.value)
                ):
                    self.hits.append(("classname", node.lineno, "className"))
            elif (isinstance(t, ast.Name) and t.id == "className") or (
                isinstance(t, ast.Attribute) and t.attr == "className"
            ):
                if not _is_empty_const(node.value):
                    self.hits.append(("classname", node.lineno, "className"))
        self.generic_visit(node)

    def visit_keyword(self, node: ast.keyword) -> None:
        if node.arg == "className" and not _is_empty_const(node.value):
            self.hits.append(("classname", getattr(node.value, "lineno", 0), "className"))
        self.generic_visit(node)

    # (b) suffix-identity dict + className dict-key ----------------------------
    def visit_Dict(self, node: ast.Dict) -> None:
        for k, v in zip(node.keys, node.values):
            if isinstance(k, ast.Constant) and k.value == "className" and not _is_empty_const(v):
                self.hits.append(("classname", node.lineno, "className"))
        str_vals = [
            v.value for v in node.values
            if isinstance(v, ast.Constant) and isinstance(v.value, str) and v.value
        ]
        if (
            self.suffix_vocab and len(str_vals) >= 2
            and all(s.lower() in self.suffix_vocab for s in str_vals)
        ):
            symbol = ",".join(sorted(set(str_vals)))[:48]
            self.hits.append(("suffix_dict", node.lineno, symbol))
        self.generic_visit(node)

    # (c) side-suffix regex in an re.* call argument ---------------------------
    def _is_re_call(self, node: ast.Call) -> bool:
        f = node.func
        return (
            isinstance(f, ast.Attribute) and f.attr in self._RE_FUNCS
            and isinstance(f.value, ast.Name) and f.value.id == "re"
        )

    def visit_Call(self, node: ast.Call) -> None:
        if self._side_re is not None and self._is_re_call(node):
            for arg in node.args:
                if (
                    isinstance(arg, ast.Constant) and isinstance(arg.value, str)
                    and self._side_re.search(arg.value)
                ):
                    self.hits.append(("side_regex", node.lineno, arg.value[:48]))
        self.generic_visit(node)


_DETAIL = {
    "classname": (
        "Converter source WRITES a block className in {file}:{line}. A native converted "
        "block carries its identity via its block NAME — re-emitting draft BEM classes "
        "onto className is the mirror cheat (7-rules #1 CONVERT-don't-mirror / R-22-15)."
    ),
    "suffix_dict": (
        "Hardcoded suffix-vocabulary dict in {file}:{line} (values: {sym}). The "
        "breakpoint/side/unit suffix grammar is DB-OWNED — read it from "
        "db_lookup.modifier_suffixes, never a literal dict (R-22-1 / Spec 31 §7a.4)."
    ),
    "side_regex": (
        "Hardcoded side-suffix regex literal in {file}:{line} (`{sym}`). The side "
        "vocabulary (Top/Right/Bottom/Left) is DB-OWNED — build the strip from "
        "db_lookup.modifier_suffixes('side'), never a literal alternation (R-22-1)."
    ),
}
_FIX = {
    "classname": (
        "Remove the className write in {file}:{line}. Emit native typed attrs only; the "
        "block name is the identity. (Reading className from the draft node is fine — only "
        "WRITING it onto the output is the cheat.)"
    ),
    "suffix_dict": (
        "Delete the suffix dict in {file}:{line}; resolve the suffix via "
        "db_lookup.modifier_suffixes('breakpoint'|'side'|…). See tier_suffix.py / "
        "fold_helpers._strip_side_suffix for the DB-sourced pattern (D249)."
    ),
    "side_regex": (
        "Replace the literal alternation in {file}:{line} with a regex built from "
        "db_lookup.modifier_suffixes('side') (see fold_helpers._strip_side_suffix, D249)."
    ),
}


def run(converter_dir: Path | None = None) -> list[Violation]:
    """Scan the converter/ tree for the three source cheats. Empty when clean."""
    scan_dir = converter_dir or _CONVERTER_DIR
    violations: list[Violation] = []
    if not scan_dir.exists():
        return violations

    suffix_vocab, side_vocab = _suffix_vocab()

    for py_path in sorted(scan_dir.rglob("*.py")):
        if py_path.name.startswith("test_") or "tests" in {p.name for p in py_path.parents}:
            continue
        try:
            tree = ast.parse(py_path.read_text(encoding="utf-8", errors="replace"), filename=str(py_path))
        except SyntaxError:
            continue
        visitor = _SourceVisitor(suffix_vocab, side_vocab)
        visitor.visit(tree)
        file_rel = _rel(py_path)
        for kind, lineno, symbol in visitor.hits:
            violations.append(Violation(
                check="converter_source",
                file=file_rel,
                detail=_DETAIL[kind].format(file=file_rel, line=lineno, sym=symbol),
                fix=_FIX[kind].format(file=file_rel, line=lineno),
                key=converter_source_key(kind, file_rel, symbol),
            ))
    return violations

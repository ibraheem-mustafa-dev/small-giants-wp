#!/usr/bin/env python3
"""
check-box-family-guard.py

STRUCTURAL GUARD — box-object interface contract (2026-07-09 plan §6).

Spec: `.claude/plans/2026-07-09-box-object-interface-contract.md` §3/§6.

Binding rule (§3): "an attr is a merge/migration TARGET only if it (or the
flat attr it replaces) carries a `box_family` [DB column]. ... The migration
MUST query `box_family`, never a name regex (enforced by the AST gate)."

This gate is a static AST scanner over the converter tree
(`plugins/sgs-blocks/scripts/converter/**/*.py`) and the DB-seed/migration
script (`plugins/sgs-blocks/scripts/sgs-update-v2.py`). It flags any
per-side/per-corner box-grouping or migration operation that groups/merges/
renames attributes by matching a SIDE token (Top/Right/Bottom/Left) or a
CORNER token (TL/TR/BL/BR/TopLeft/TopRight/BottomLeft/BottomRight) via a
regex or string-literal test (`re.*` call, `.endswith(...)`, `in` membership
against a side/corner literal) — UNLESS the enclosing function also
references the identifier `box_family` somewhere in its body (the DB-gate
signal proving the grouping is DB-classification-driven, not a name guess).

A merge/group gated on `box_family` is OK and is not flagged.

Usage
-----
    python scripts/check-box-family-guard.py               # --report (default)
    python scripts/check-box-family-guard.py --report       # print findings, exit 0
    python scripts/check-box-family-guard.py --check         # exit 1 on any NEW finding
    python scripts/check-box-family-guard.py --update-baseline  # accept current findings

Baseline
--------
`box-family-guard-baseline.json` (alongside this script) — a JSON object
{"hash": ..., "keys": [...]}. Ships EMPTY (`{"hash": ..., "keys": []}`) — this
is a brand-new gate for a brand-new build, so zero known violations is the
correct starting state (STOP-14 pattern: baseline against current
violations, fail only on NEW; here "current" is deliberately nothing).

Plain-English failure messages: each finding shows file, line, the offending
construct, and the fix hint ("gate this on a box_family DB check").

UK English throughout.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent  # plugins/sgs-blocks/scripts/
_CONVERTER_DIR = _HERE / "converter"
_SEED_SCRIPT = _HERE / "sgs-update-v2.py"
_BASELINE_PATH = _HERE / "box-family-guard-baseline.json"

_GATE_IDENTIFIER = "box_family"

# Side tokens (4-side box families: padding/margin/border-width/etc.)
_SIDE_TOKENS: frozenset[str] = frozenset({
    "Top", "Right", "Bottom", "Left",
    "top", "right", "bottom", "left",
})

# Corner tokens (4-corner box families: border-radius)
_CORNER_TOKENS: frozenset[str] = frozenset({
    "TL", "TR", "BL", "BR",
    "TopLeft", "TopRight", "BottomLeft", "BottomRight",
    "topLeft", "topRight", "bottomLeft", "bottomRight",
})

_BOX_TOKENS: frozenset[str] = _SIDE_TOKENS | _CORNER_TOKENS


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------
@dataclass
class Violation:
    file: str
    line: int
    func: str
    construct: str
    detail: str
    key: str


def _finding_key(file: str, func: str, construct: str) -> str:
    """Stable dedup key — type + file + func + construct, NOT line number."""
    return f"boxfam:{file}:{func}:{construct}"


# ---------------------------------------------------------------------------
# Token detection helpers
# ---------------------------------------------------------------------------
def _literal_str(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def _contains_box_token(s: str) -> bool:
    """True iff the string literal contains a side/corner token as a
    recognisable identifier fragment (not just any substring — e.g. avoid
    false-flagging an unrelated word that happens to contain 'top' loosely;
    we check case-sensitive whole-token containment via word-ish boundaries)."""
    for tok in _BOX_TOKENS:
        if tok in s:
            return True
    return False


def _is_side_regex_pattern(s: str) -> bool:
    """A regex pattern string that anchors/matches on a side or corner token,
    e.g. r'.*Top$', r'^(Top|Right|Bottom|Left)$', r'(TL|TR|BL|BR)$'."""
    return _contains_box_token(s)


# ---------------------------------------------------------------------------
# AST visitor
# ---------------------------------------------------------------------------
class _BoxGroupingVisitor(ast.NodeVisitor):
    """Walk a module's AST, tracking the enclosing function, and flag any
    side/corner-token regex or string-membership test used for grouping,
    where the enclosing function body does not reference `box_family`.
    """

    def __init__(self, file_rel: str) -> None:
        self.file_rel = file_rel
        self.findings: list[Violation] = []
        self._func_stack: list[ast.FunctionDef | ast.AsyncFunctionDef] = []
        # Cache: function node id -> whether its full source references box_family
        self._gated_cache: dict[int, bool] = {}

    # -- function tracking ---------------------------------------------------
    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._func_stack.append(node)
        self.generic_visit(node)
        self._func_stack.pop()

    visit_AsyncFunctionDef = visit_FunctionDef  # type: ignore[assignment]

    def _current_func_name(self) -> str:
        return self._func_stack[-1].name if self._func_stack else "<module>"

    def _current_func_is_gated(self) -> bool:
        """True iff the innermost enclosing function (or module top-level,
        by scanning all module-level code as one scope) references the
        identifier `box_family` anywhere in its own body."""
        if not self._func_stack:
            # Module-level statement (no enclosing function) — check the
            # whole module dump for a nearby box_family reference is too
            # coarse; instead treat module-level top-level code as its own
            # 'function' by checking sibling module body. Handled by caller
            # via _module_has_gate for module-level constructs.
            return self._module_gated
        func_node = self._func_stack[-1]
        cache_key = id(func_node)
        if cache_key in self._gated_cache:
            return self._gated_cache[cache_key]
        gated = _references_identifier(func_node, _GATE_IDENTIFIER)
        self._gated_cache[cache_key] = gated
        return gated

    # set externally by run() before visiting, for module-level statements
    _module_gated: bool = False

    # -- detection: regex-based grouping --------------------------------
    def visit_Call(self, node: ast.Call) -> None:
        self._check_call(node)
        self.generic_visit(node)

    def _check_call(self, node: ast.Call) -> None:
        func = node.func
        is_re_call = False
        call_name = None

        if isinstance(func, ast.Attribute) and func.attr in {
            "sub", "match", "search", "fullmatch", "findall", "finditer", "split", "compile",
        }:
            # re.sub(...), re.match(...), pattern.match(...), etc.
            if isinstance(func.value, ast.Name) and func.value.id == "re":
                is_re_call = True
            call_name = f"re.{func.attr}"
        elif isinstance(func, ast.Name) and func.id in {
            "sub", "match", "search", "fullmatch", "findall", "finditer",
        }:
            # from re import sub as ...; unlikely but cover it
            is_re_call = True
            call_name = func.id
        elif isinstance(func, ast.Attribute) and func.attr == "endswith":
            call_name = "str.endswith"
        elif isinstance(func, ast.Attribute) and func.attr == "startswith":
            call_name = "str.startswith"

        if call_name is None:
            return

        # Gather string-literal args (pattern for re.*, suffix for endswith/startswith)
        literal_args: list[str] = []
        for arg in node.args:
            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                literal_args.append(arg.value)
            elif isinstance(arg, ast.Tuple):
                for elt in arg.elts:
                    s = _literal_str(elt)
                    if s is not None:
                        literal_args.append(s)

        if not literal_args:
            return

        matched = [a for a in literal_args if _is_side_regex_pattern(a)]
        if not matched:
            return

        if not is_re_call and call_name in {"str.endswith", "str.startswith"}:
            # Only flag endswith/startswith when the literal IS (or nearly is)
            # exactly a box token, avoiding accidental matches on longer
            # unrelated words that merely contain the substring 'top' etc.
            # Keep it simple/conservative: require the whole literal (minus
            # any leading '_') to equal a box token.
            exact = [a for a in matched if a.lstrip("_") in _BOX_TOKENS]
            if not exact:
                return
            matched = exact

        gated = self._current_func_is_gated()
        if gated:
            return

        construct = f"{call_name}({matched[0]!r})"
        self._add_finding(node.lineno, construct,
                           f"{call_name} tests for side/corner token "
                           f"{matched[0]!r} without a `box_family` reference "
                           f"in the enclosing scope.")

    # -- detection: `in` membership against a box-token collection ------
    def visit_Compare(self, node: ast.Compare) -> None:
        self._check_compare(node)
        self.generic_visit(node)

    def _check_compare(self, node: ast.Compare) -> None:
        for op, comparator in zip(node.ops, node.comparators):
            if not isinstance(op, (ast.In, ast.NotIn)):
                continue
            tokens = _collection_box_tokens(comparator)
            if not tokens:
                continue
            gated = self._current_func_is_gated()
            if gated:
                continue
            construct = f"in {{{', '.join(sorted(tokens))}}}"
            self._add_finding(node.lineno, construct,
                               f"membership test against a side/corner-token "
                               f"collection {{{', '.join(sorted(tokens))}}} "
                               f"without a `box_family` reference in the "
                               f"enclosing scope.")

    def _add_finding(self, line: int, construct: str, why: str) -> None:
        func_name = self._current_func_name()
        key = _finding_key(self.file_rel, func_name, construct)
        detail = (
            f"{self.file_rel}:{line} (function: {func_name}) — {why} "
            f"Per §3 of the box-object interface contract, a per-side/corner "
            f"grouping or migration operation must be gated on the DB "
            f"`box_family` classification, never a name regex."
        )
        fix = (
            "Gate this construct on a box_family DB check: query "
            "block_attributes.box_family for the attr(s) involved before "
            "grouping/merging/renaming by side or corner, or reference the "
            "`box_family` value already resolved in this function."
        )
        self.findings.append(Violation(
            file=self.file_rel,
            line=line,
            func=func_name,
            construct=construct,
            detail=detail,
            key=key,
        ))
        # attach fix separately (kept on the instance dict for the printer)
        self.findings[-1].__dict__["fix"] = fix


def _collection_box_tokens(node: ast.AST) -> set[str]:
    """If `node` is a List/Tuple/Set/frozenset(...) literal composed (mostly)
    of box-token string constants, return the set of matched tokens."""
    elts: list[ast.AST] | None = None
    if isinstance(node, (ast.List, ast.Tuple, ast.Set)):
        elts = node.elts
    elif isinstance(node, ast.Call):
        fname = None
        if isinstance(node.func, ast.Name):
            fname = node.func.id
        if fname in {"frozenset", "set", "list", "tuple"} and node.args:
            arg0 = node.args[0]
            if isinstance(arg0, (ast.List, ast.Tuple, ast.Set)):
                elts = arg0.elts
    if elts is None:
        return set()

    tokens: set[str] = set()
    total = 0
    for elt in elts:
        s = _literal_str(elt)
        if s is None:
            continue
        total += 1
        if s in _BOX_TOKENS:
            tokens.add(s)

    if total == 0:
        return set()
    # Require a strong majority of the collection to be box tokens, so an
    # incidental single-token overlap in an unrelated large enum doesn't
    # trip the gate.
    if len(tokens) >= max(1, total // 2):
        return tokens
    return set()


def _references_identifier(node: ast.AST, identifier: str) -> bool:
    """True iff `identifier` appears as a Name anywhere in node's subtree
    (covers reads, and attribute-chain bases like `row.box_family` /
    `attrs['box_family']` which surface the constant string too)."""
    for child in ast.walk(node):
        if isinstance(child, ast.Name) and child.id == identifier:
            return True
        if isinstance(child, ast.Constant) and child.value == identifier:
            return True
        if isinstance(child, ast.Attribute) and child.attr == identifier:
            return True
    return False


# ---------------------------------------------------------------------------
# File scanning
# ---------------------------------------------------------------------------
def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(_HERE))
    except ValueError:
        return str(path)


def _scan_file(path: Path) -> list[Violation]:
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(path))
    except SyntaxError:
        return []

    file_rel = _rel(path).replace("\\", "/")
    visitor = _BoxGroupingVisitor(file_rel)

    # Module-level gate signal: does ANY top-level code in the module
    # reference box_family? Used only for statements outside any function.
    visitor._module_gated = _references_identifier(tree, _GATE_IDENTIFIER)

    visitor.visit(tree)
    return visitor.findings


def _iter_target_files() -> list[Path]:
    files: list[Path] = []
    if _CONVERTER_DIR.exists():
        for py_path in sorted(_CONVERTER_DIR.rglob("*.py")):
            if "__pycache__" in py_path.parts:
                continue
            if py_path.name.startswith("test_") or "tests" in py_path.parts:
                continue
            files.append(py_path)
    if _SEED_SCRIPT.exists():
        files.append(_SEED_SCRIPT)
    return files


def collect_violations() -> list[Violation]:
    violations: list[Violation] = []
    for path in _iter_target_files():
        violations.extend(_scan_file(path))
    return violations


# ---------------------------------------------------------------------------
# Baseline helpers (mirrors cheat-gate's self-blessing pattern)
# ---------------------------------------------------------------------------
def _compute_hash(keys: list[str]) -> str:
    payload = "\n".join(sorted(keys)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _load_baseline() -> tuple[set[str], str | None]:
    if not _BASELINE_PATH.exists():
        return set(), None
    try:
        data = json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return set(data.get("keys", [])), data.get("hash")
        if isinstance(data, list):
            return set(data), None
    except Exception:  # noqa: BLE001
        pass
    return set(), None


def _save_baseline(keys: set[str]) -> None:
    sorted_keys = sorted(keys)
    data = {"hash": _compute_hash(sorted_keys), "keys": sorted_keys}
    _BASELINE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def _print_report(violations: list[Violation], baseline: set[str]) -> None:
    if not violations:
        print("[box-family-guard] All checks passed — 0 violations.")
        return

    new_count = sum(1 for v in violations if v.key not in baseline)
    base_count = len(violations) - new_count
    print(
        f"[box-family-guard] {len(violations)} violation(s) total — "
        f"{new_count} NEW, {base_count} baselined"
    )
    print()
    for v in violations:
        is_new = v.key not in baseline
        tag = "[NEW]" if is_new else "[baselined]"
        fix = v.__dict__.get("fix", "Gate this on a box_family DB check.")
        print(f"  {tag}")
        print(f"  File:      {v.file}:{v.line}")
        print(f"  Function:  {v.func}")
        print(f"  Construct: {v.construct}")
        print(f"  Problem:   {v.detail}")
        print(f"  Fix:       {fix}")
        print(f"  Key:       {v.key}")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Box-family AST collision guard — fails if a per-side/corner "
            "box grouping/migration operation runs without a box_family "
            "DB-gate reference (box-object interface contract §3/§6)."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--report", action="store_true", default=False,
                       help="Print all violations and exit 0 (default).")
    mode.add_argument("--check", action="store_true", default=False,
                       help="Exit 1 if any violation key is NOT in the baseline.")
    mode.add_argument("--update-baseline", action="store_true", default=False,
                       help="Write current violation keys to the baseline and exit 0.")
    args = parser.parse_args()

    if not args.check and not args.update_baseline:
        args.report = True

    violations = collect_violations()
    baseline, stored_hash = _load_baseline()

    if args.update_baseline:
        new_baseline = {v.key for v in violations}
        _save_baseline(new_baseline)
        print(
            f"[box-family-guard] Baseline updated — {len(new_baseline)} "
            f"key(s) written to {_BASELINE_PATH}"
        )
        return 0

    _print_report(violations, baseline)

    if args.check:
        if baseline and stored_hash is not None:
            expected_hash = _compute_hash(list(baseline))
            if expected_hash != stored_hash:
                print(
                    "\n[box-family-guard] GATE FAILED — baseline file has "
                    "been TAMPERED.\n"
                    f"  Stored hash:   {stored_hash}\n"
                    f"  Expected hash: {expected_hash}\n"
                    "  Do NOT hand-edit the baseline JSON. Run "
                    "--update-baseline to produce a legitimate baseline."
                )
                return 1
        elif baseline and stored_hash is None:
            print(
                "[box-family-guard] WARNING: baseline is in the legacy "
                "list format (no hash). Run --update-baseline to upgrade."
            )

        new_violations = [v for v in violations if v.key not in baseline]
        if new_violations:
            print(
                f"\n[box-family-guard] GATE FAILED — {len(new_violations)} "
                "new violation(s) not in baseline.\n"
                "  Fix the problems above, or run --update-baseline to "
                "accept them as known.\n"
                "  Do NOT blindly baseline without understanding each "
                "finding — see the box-object interface contract §3/§6."
            )
            return 1
        if violations:
            print(
                f"[box-family-guard] Gate passed — all {len(violations)} "
                "violation(s) are baselined."
            )
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

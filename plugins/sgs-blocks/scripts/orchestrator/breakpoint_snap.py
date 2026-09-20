"""breakpoint_snap: round a draft script's width thresholds to our device edges (Bean's rule, D1129/D1132).

A Claude Design draft's script decides its layout with width flags such as ``mobile = effW < 760`` or
``lensStack = effW < 700``. Our device tiers end at 768 (mobile | tablet) and 1024 (tablet | desktop).
This module rewrites the numbers in those comparisons BEFORE the expressions are evaluated, so the
per-device values the converter receives are for OUR tiers:

* a threshold within ``SNAP_TOLERANCE_PX`` of a device edge moves to that edge (760 -> 768, 1023 -> 1024);
* a threshold in a DECLARED width flag (a declaration that is nothing but width comparisons) that lies
  between ``BELOW_TABLET_FLOOR_PX`` and the tablet edge moves up to the tablet edge (700 -> 768): it is
  where that draft's mobile layout ends, and no common device sits between it and 768;
* every other threshold (1060, 1280, a phone-sized 400) is left alone; it stays a draft breakpoint
  inside a device tier and is reported by the evaluator as such.

Every rewrite is returned as a row (draft value, snapped value, the widths where the clone will differ
from the draft) so nothing is hidden: Stage 11.6 and the run report show exactly what moved.

The two tolerances are permitted constants of the same class as the 768/1024 edges themselves
(Spec 31 FR-31-5.2, R-31-1); the edges are passed in by the caller so both sides agree.
"""
from __future__ import annotations

import re
from typing import Any

SNAP_TOLERANCE_PX = 10
BELOW_TABLET_FLOOR_PX = 640
DEFAULT_EDGES: tuple[int, int] = (768, 1024)

_WIDTH_READ_RE = re.compile(r"(?<![\w$.])(?:const|let|var)\s+(?:[\w$]+\s*=[^;\n]*,\s*)*([A-Za-z_$][\w$]*)\s*=[^;\n]*(?<![\w$])[A-Za-z_$][\w$]*\.w(?![\w$])")


def find_width_read(script_masked: str) -> tuple[str, int] | None:
    """``(name, position)`` of the declaration that reads the viewport width from the draft's state
    (``const effW = ... S.w``): the name a script gives its width, whatever it is called.

    A script can read ``.w`` of other objects too (``const g = grid.w * 2``), so the first candidate that is
    also compared with a number (``name < 760``) wins; with none compared, the first candidate."""
    candidates = [(m.group(1), m.start()) for m in _WIDTH_READ_RE.finditer(script_masked)]
    for name, position in candidates:
        if _comparison_re(name).search(script_masked):
            return name, position
    return candidates[0] if candidates else None


def _comparison_re(width_var: str) -> re.Pattern[str]:
    return re.compile(r"(?<![\w$.])" + re.escape(width_var) + r"\s*(<=|>=|<|>)\s*(\d+)(?![\d.\w$])")


def is_declared_flag(expr: str, width_var: str) -> bool:
    """True when ``expr`` is nothing but width comparisons joined by ``&&`` / ``||`` (a width flag)."""
    rest = _comparison_re(width_var).sub("", expr)
    if rest == expr:
        return False                       # no width comparison at all
    return re.fullmatch(r"[\s()&|]*", rest) is not None


def declared_flags(declarations: list[tuple[str, str, int]], width_var: str) -> dict[str, str]:
    """Every declaration that is a pure width flag, ``{name: expression}``, in source order."""
    return {name: expr for name, expr, _ in declarations if is_declared_flag(expr, width_var)}


def snap_threshold(value: int, declared: bool, edges: tuple[int, int] = DEFAULT_EDGES) -> tuple[int, str]:
    """``(snapped value, reason)``; the reason is '' when the value is left alone.

    ``value`` is the width where a comparison FLIPS (first width of the upper side): the number in
    ``effW < 760`` or ``effW >= 760``. ``flip_point`` converts the other two operators to it."""
    for edge in edges:
        if 0 < abs(value - edge) <= SNAP_TOLERANCE_PX:
            return edge, "within %dpx of the %d device edge" % (SNAP_TOLERANCE_PX, edge)
    if declared and BELOW_TABLET_FLOOR_PX <= value < edges[0]:
        return edges[0], "declared width flag below the %d tablet edge" % edges[0]
    return value, ""


def flip_point(op: str, number: int) -> int:
    """The first integer width on the upper side of ``width <op> number``.

    ``< n`` and ``>= n`` flip at n; ``<= n`` and ``> n`` flip at n + 1. Device edges are flip points
    (mobile ends at 767, tablet starts at 768), so a threshold is snapped as a flip point and written
    back in the operator's own terms: ``effW <= 767`` already sits on the 768 edge and must stay put."""
    return number + 1 if op in ("<=", ">") else number


def snap_expression(expr: str, width_var: str, declared: bool, edges: tuple[int, int] = DEFAULT_EDGES) -> tuple[str, list[dict[str, Any]]]:
    """Rewrite the thresholds in one expression. Returns the new expression and one row per change."""
    rows: list[dict[str, Any]] = []

    def repl(m: re.Match[str]) -> str:
        op, old = m.group(1), int(m.group(2))
        old_flip = flip_point(op, old)
        new_flip, why = snap_threshold(old_flip, declared, edges)
        if not why:
            return m.group(0)
        new = new_flip - (old_flip - old)          # back into this operator's own number
        rows.append({"comparison": m.group(0), "operator": op, "draft": old, "snapped": new, "reason": why,
                     "differs_from_draft_between": [min(old_flip, new_flip), max(old_flip, new_flip) - 1]})
        return "%s %s %d" % (width_var, op, new)

    return _comparison_re(width_var).sub(repl, expr), rows


def snap_scope(declarations: list[tuple[str, str, int]], bindings: dict[str, str], width_var: str | None,
               edges: tuple[int, int] = DEFAULT_EDGES) -> tuple[list[tuple[str, str, int]], dict[str, str], list[dict[str, Any]]]:
    """Snap every declaration and binding expression. Returns the new declarations, the new bindings and
    the change rows (each tagged with where it was found). With no width variable nothing changes."""
    if not width_var:
        return declarations, bindings, []
    flags = declared_flags(declarations, width_var)
    rows: list[dict[str, Any]] = []
    new_decls: list[tuple[str, str, int]] = []
    for name, expr, pos in declarations:
        new_expr, r = snap_expression(expr, width_var, name in flags, edges)
        rows.extend({**x, "in": name} for x in r)
        new_decls.append((name, new_expr, pos))
    new_bindings: dict[str, str] = {}
    for name, expr in bindings.items():
        new_expr, r = snap_expression(expr, width_var, False, edges)
        rows.extend({**x, "in": name} for x in r)
        new_bindings[name] = new_expr
    return new_decls, new_bindings, rows

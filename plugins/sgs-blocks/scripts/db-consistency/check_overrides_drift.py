"""check_overrides_drift.py — Check #4: override-dict drift.

Spec ref: F6 deferred follow-up (D237)

The converter has TWO hand-maintained constants that MUST mirror each other or
the lift and the resolver disagree on attr ownership:
  - _SUFFIX_ATTR_OVERRIDES in scripts/orchestrator/converter_v2/convert.py
  - _ATTR_NAME_OVERRIDES   in scripts/orchestrator/converter_v2/db_lookup.py

Check: assert the two dicts are EQUAL.  Flag a Violation if they differ.

Implementation note: convert.py is 6000+ lines and importing it executes module
-level code.  We extract _SUFFIX_ATTR_OVERRIDES via AST (ast.literal_eval on the
assignment node's value) — NO module execution.  _ATTR_NAME_OVERRIDES comes from
the resolver_bridge import (already loaded, single source of truth — R-22-1).

Today both = {("grid-template-columns","Columns"):"gridTemplateColumns"} → passes.
"""
from __future__ import annotations

import ast
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation
from .resolver_bridge import _ATTR_NAME_OVERRIDES

_CONVERT_PY_PATH = (
    Path(__file__).resolve().parents[1]  # scripts/
    / "orchestrator"
    / "converter_v2"
    / "convert.py"
)

_DRIFT_KEY = "drift:_SUFFIX_ATTR_OVERRIDES-vs-_ATTR_NAME_OVERRIDES"


def _extract_suffix_attr_overrides() -> dict[tuple[str, str], str]:
    """Extract _SUFFIX_ATTR_OVERRIDES from convert.py via AST — no execution.

    Raises ImportError if the symbol cannot be found (fail-LOUD per R-22-1:
    a missing symbol is a real structural change that must be surfaced, not
    silently treated as an empty dict).
    """
    if not _CONVERT_PY_PATH.exists():
        raise ImportError(
            f"[check_overrides_drift] convert.py not found at {_CONVERT_PY_PATH} — "
            "cannot extract _SUFFIX_ATTR_OVERRIDES for drift check."
        )

    src = _CONVERT_PY_PATH.read_text(encoding="utf-8")
    tree = ast.parse(src)

    for node in ast.walk(tree):
        # Annotated assignment:  _SUFFIX_ATTR_OVERRIDES: dict[...] = {...}
        if (
            isinstance(node, ast.AnnAssign)
            and isinstance(node.target, ast.Name)
            and node.target.id == "_SUFFIX_ATTR_OVERRIDES"
            and node.value is not None
        ):
            return ast.literal_eval(node.value)
        # Plain assignment:  _SUFFIX_ATTR_OVERRIDES = {...}
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "_SUFFIX_ATTR_OVERRIDES":
                    return ast.literal_eval(node.value)

    raise ImportError(
        "[check_overrides_drift] _SUFFIX_ATTR_OVERRIDES not found in convert.py.\n"
        "The F6 drift check requires this symbol to compare against _ATTR_NAME_OVERRIDES.\n"
        "If it was renamed, update check_overrides_drift.py to match."
    )


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #4.  The conn arg is accepted for a uniform check signature but unused.

    Returns
    -------
    list[Violation]  — empty when the two override dicts are identical (expected today).
    """
    del conn  # not needed — this check compares two code constants.

    suffix_overrides = _extract_suffix_attr_overrides()
    attr_overrides = dict(_ATTR_NAME_OVERRIDES)

    if suffix_overrides == attr_overrides:
        return []

    # Compute the diff for a precise message.
    suffix_keys = set(suffix_overrides)
    attr_keys = set(attr_overrides)
    only_in_convert = suffix_keys - attr_keys
    only_in_db_lookup = attr_keys - suffix_keys
    differing_values = {
        k for k in (suffix_keys & attr_keys)
        if suffix_overrides[k] != attr_overrides[k]
    }

    diff_parts: list[str] = []
    if only_in_convert:
        diff_parts.append(f"only in convert.py: {sorted(only_in_convert)}")
    if only_in_db_lookup:
        diff_parts.append(f"only in db_lookup.py: {sorted(only_in_db_lookup)}")
    if differing_values:
        diff_parts.append(
            "different values: "
            + ", ".join(
                f"{k} (convert.py={suffix_overrides[k]!r}, db_lookup.py={attr_overrides[k]!r})"
                for k in sorted(differing_values)
            )
        )

    detail = (
        "_SUFFIX_ATTR_OVERRIDES (convert.py) and _ATTR_NAME_OVERRIDES (db_lookup.py) "
        "have drifted — " + "; ".join(diff_parts)
    )

    return [Violation(
        check="overrides_drift",
        block="(converter constants)",
        detail=detail,
        fix=(
            "_SUFFIX_ATTR_OVERRIDES (in scripts/orchestrator/converter_v2/convert.py) and "
            "_ATTR_NAME_OVERRIDES (in scripts/orchestrator/converter_v2/db_lookup.py) have drifted — "
            "make them identical (they must be the same dict so the lift and the resolver agree on "
            "which attribute receives each CSS property)."
        ),
        key=_DRIFT_KEY,
    )]

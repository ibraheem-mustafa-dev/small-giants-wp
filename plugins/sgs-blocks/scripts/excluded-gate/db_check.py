"""db_check.py — cross-reference detected signatures against excluded_properties DB table.

Spec ref: .claude/plans/2026-06-18-f4-excluded-properties-design.md §3

WHAT THIS DOES
--------------
Takes the list of ExclusionSignature objects from scanner.py and queries
the ``excluded_properties`` DB table for each CSS property literal found.

A signature is a VIOLATION if:
  - Its ``prop`` is a concrete CSS property name (e.g. "max-width")
  - That property is NOT in ``excluded_properties.css_property``

Named-set signatures whose ``prop`` is a variable name (e.g. "_LIFT_EXCLUDED_PROPS")
are checked differently: we know the scanner extracted individual property literals
from the set definition as separate 'named_set' signatures.  When the set was
empty or non-literal, the variable-name signature is treated as an in-code
exclusion that needs a DB entry.

DELEGATED CLASSES (stated honestly in reports and module docstring)
-------------------------------------------------------------------
This check does NOT cover:
- Value-transform drops (return "" / None from lift functions) → F3 oracle.
- DB-lookup-None / no property_suffixes row → F2 ledger (UNACCOUNTED set).
- Broad-except fail-silent swallowing of CSS declarations → bare-except lint.

These are not architectural gaps; they are each covered by a dedicated gate.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from .models import ExclusionSignature, GateViolation

_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# Regex to detect variable names (not CSS property names).
# CSS properties are all lowercase-hyphenated; variable names have uppercase or underscores.
import re as _re
_VAR_NAME_RE = _re.compile(r"[A-Z_]")


def _is_variable_name(prop: str) -> bool:
    """Return True if ``prop`` looks like a Python variable name rather than a CSS property."""
    return bool(_VAR_NAME_RE.search(prop)) or prop.startswith("--")


def load_excluded_properties(conn: sqlite3.Connection) -> set[str]:
    """Return the set of css_property values from the excluded_properties table."""
    rows = conn.execute("SELECT css_property FROM excluded_properties").fetchall()
    return {r[0] for r in rows}


def check_signatures(
    signatures: list[ExclusionSignature],
    excluded_props: set[str],
) -> list[GateViolation]:
    """Cross-reference signatures against the DB excluded set.

    Returns a list of GateViolation for each signature whose property is not
    in the excluded_properties table.

    Variable-name props (Python identifiers) that refer to sets whose CONTENTS
    are already flagged as individual 'named_set' signatures are NOT double-flagged
    here — the individual property literals from the set are the ones that need DB
    entries.  However, if a 'membership' signature references an anonymous variable
    that has no individual-property breakdown, we flag it as an unknown exclusion.
    """
    violations: list[GateViolation] = []
    seen_keys: set[str] = set()

    for sig in signatures:
        prop = sig.prop
        key = sig.key

        if key in seen_keys:
            continue
        seen_keys.add(key)

        # Skip the .startswith("--") guard form — it blanket-skips custom properties.
        # Custom properties (CSS variables) are not CSS standard properties and are
        # not tracked in excluded_properties.  This form is therefore not a violation.
        if sig.form == "startswith_dashdash":
            continue

        # If prop looks like a CSS property name, check the DB.
        if not _is_variable_name(prop):
            if prop not in excluded_props:
                violations.append(GateViolation(
                    sig=sig,
                    detail=(
                        f"In-code exclusion of CSS property '{prop}' "
                        f"found at {sig.file}:{sig.line} ({sig.form}) "
                        f"but '{prop}' is NOT in the excluded_properties DB table. "
                        f"  Source: {sig.snippet!r}"
                    ),
                    fix=(
                        f"Either remove this exclusion (let the property go through the "
                        f"lift/router), OR add it to excluded_properties via a new dated "
                        f"migration: "
                        f"migrations/YYYY-MM-DD-exclude-{prop}.py with a reason, "
                        f"decided_by, and date.  Do NOT add a row manually — "
                        f"use a migration (R-22-1)."
                    ),
                    key=key,
                ))
        else:
            # Variable-name prop: the individual properties are enumerated as
            # separate 'named_set' signatures.  Flag the variable-name signature
            # only for 'membership' forms where no individual breakdown was possible.
            if sig.form == "membership":
                violations.append(GateViolation(
                    sig=sig,
                    detail=(
                        f"In-code membership exclusion references variable '{prop}' "
                        f"at {sig.file}:{sig.line}.  The variable contents were not "
                        f"enumerable at parse time — ensure every CSS property in '{prop}' "
                        f"has a corresponding row in excluded_properties, or inline the "
                        f"literals so the gate can verify them.  "
                        f"  Source: {sig.snippet!r}"
                    ),
                    fix=(
                        f"Replace '{prop}' membership checks with inline literals, OR "
                        f"ensure every property in the set is in excluded_properties."
                    ),
                    key=key,
                ))

    return violations

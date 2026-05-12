"""
Spec 15 §6 Stage 9 — Drift Validator
====================================
Validates that every canonical value stored on `block_attributes` decomposes
into known vocabulary (slot_synonyms.canonical_slot, property_suffixes.role,
modifier_suffixes.suffix). Surfaces violations where the data layer has
drifted away from the canonical vocabulary.

A violation is one of:
  - canonical_slot is set but is not in slot_synonyms.canonical_slot
  - role is set but is not in property_suffixes.role
  - derived_selector is set but does not start with `.sgs-` (BEM root)

Reads only — never writes. Idempotent.

Usage:
    python validate.py                # report only; always exit 0
    python validate.py --strict       # exit 1 if any violations found

Output:
    Stdout — line per violation with block_slug.attr_name and reason.
    Final line is one of:
      "DRIFT-VALIDATOR: PASS (0 violations across N attrs)"
      "DRIFT-VALIDATOR: FAIL (V violations across N attrs)"

UK English in all comments and output.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(
    os.environ.get(
        "SGS_FRAMEWORK_DB",
        str(Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
    )
)


def load_vocabulary(conn: sqlite3.Connection) -> tuple[set[str], set[str]]:
    slot_set = {r[0] for r in conn.execute("SELECT canonical_slot FROM slot_synonyms")}
    role_set = {r[0] for r in conn.execute("SELECT DISTINCT role FROM property_suffixes WHERE role IS NOT NULL")}
    return slot_set, role_set


def validate(conn: sqlite3.Connection) -> list[tuple[str, str, str]]:
    slot_set, role_set = load_vocabulary(conn)
    violations: list[tuple[str, str, str]] = []

    rows = conn.execute(
        """
        SELECT block_slug, attr_name, canonical_slot, role, derived_selector
        FROM block_attributes
        WHERE canonical_slot IS NOT NULL
           OR role IS NOT NULL
           OR derived_selector IS NOT NULL
        """
    ).fetchall()

    for block_slug, attr_name, canonical_slot, role, derived_selector in rows:
        if canonical_slot is not None and canonical_slot not in slot_set:
            violations.append((block_slug, attr_name, f"unknown canonical_slot '{canonical_slot}'"))
        if role is not None and role not in role_set:
            violations.append((block_slug, attr_name, f"unknown role '{role}'"))
        if derived_selector is not None and not derived_selector.startswith(".sgs-"):
            violations.append((block_slug, attr_name, f"derived_selector '{derived_selector}' does not start with .sgs-"))

    return violations


def main() -> int:
    parser = argparse.ArgumentParser(description="Spec 15 §6 Stage 9 drift validator")
    parser.add_argument("--strict", action="store_true", help="Exit 1 if any violations found")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"ERROR: DB not found at {DB_PATH}")
        return 2

    conn = sqlite3.connect(str(DB_PATH))
    try:
        violations = validate(conn)
        total = conn.execute("SELECT COUNT(*) FROM block_attributes").fetchone()[0]
    finally:
        conn.close()

    for block_slug, attr_name, reason in violations:
        print(f"  VIOLATION  {block_slug}.{attr_name}  —  {reason}")

    if violations:
        print(f"\nDRIFT-VALIDATOR: FAIL ({len(violations)} violations across {total} attrs)")
        return 1 if args.strict else 0
    print(f"\nDRIFT-VALIDATOR: PASS (0 violations across {total} attrs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

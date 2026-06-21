"""check_tier_composition.py — Check #7: tier ↔ composition_role/container_kind.

Spec ref: F6 deferred follow-up (D237)

Every blocks.tier='class-section' block (a composite with a built-in wrapper)
MUST have:
  - block_composition.composition_role IN ('section-root', 'content-block'), AND
  - block_composition.container_kind IS NOT NULL

else the converter's container-mirror logic can't route it through the shared
3-layer model.  NOTE: 'content-block' IS allowed (trust-bar uses it) — do NOT
require 'section-root'.

Today: all 3 class-section blocks (cta-section, hero, trust-bar) pass.
"""
from __future__ import annotations

import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, tier_composition_key

_VALID_COMPOSITION_ROLES = ("section-root", "content-block")


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #7 against the live DB connection.

    Returns
    -------
    list[Violation]  — empty when all class-section blocks are correctly composed.
    """
    violations: list[Violation] = []

    rows = conn.execute(
        "SELECT b.slug, bc.composition_role, bc.container_kind "
        "FROM blocks b "
        "LEFT JOIN block_composition bc ON bc.block_slug = b.slug "
        "WHERE b.tier = 'class-section' "
        "ORDER BY b.slug"
    ).fetchall()

    for slug, composition_role, container_kind in rows:
        problems: list[str] = []

        if composition_role not in _VALID_COMPOSITION_ROLES:
            problems.append(
                f"composition_role={composition_role!r} "
                f"(must be one of {_VALID_COMPOSITION_ROLES})"
            )
        if container_kind is None or container_kind == "":
            problems.append("container_kind is missing (must be non-NULL)")

        if not problems:
            continue

        violations.append(Violation(
            check="tier_composition",
            block=slug,
            detail=(
                f"{slug}: tier='class-section' but " + "; ".join(problems) + "."
            ),
            fix=(
                f"{slug} is tier=class-section but its composition_role/container_kind is "
                "missing or invalid — fix block_composition via /sgs-update "
                "(python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1) or a dated migration."
            ),
            key=tier_composition_key(slug),
        ))

    return violations

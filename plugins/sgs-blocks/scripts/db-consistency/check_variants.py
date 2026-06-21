"""check_variants.py — Check #3: variant discriminator collision on the lift surface.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md §1 (check #3)

Rule: no variant_slots.unique_slot discriminator may be lift-producible for its
block.  A lift-producible discriminator gets spuriously populated by generic draft
CSS → mis-scores detect_variant.

Implementation (R-22-1 reuse):
- Iterates every block WHERE variant_attr IS NOT NULL AND variant_attr != ''
  (hero + testimonial today; any future block auto-included — zero hardcoding).
- For each block, computes lift_producible_attrs via resolver_bridge (real resolver
  derivation rule).
- Flags any variant_slots.unique_slot in that set.

Post-hero-fix expectation: ZERO violations on the live DB.
"""
from __future__ import annotations

import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, variant_key
from .resolver_bridge import lift_producible_attrs


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #3 against the live DB connection.

    Parameters
    ----------
    conn : open sqlite3.Connection to sgs-framework.db

    Returns
    -------
    list[Violation]  — empty when all discriminators are safe (expected post-hero-fix).
    """
    violations: list[Violation] = []

    # All blocks with a variant_attr column populated (universal — no hardcoding).
    variant_blocks = conn.execute(
        "SELECT slug, variant_attr "
        "FROM blocks "
        "WHERE variant_attr IS NOT NULL AND variant_attr != '' "
        "ORDER BY slug"
    ).fetchall()

    for block_slug, variant_attr_col in variant_blocks:
        # Compute the CSS lift's reach for this block.
        producible = lift_producible_attrs(block_slug, conn)

        # All discriminating slots for this block across all variants.
        slot_rows = conn.execute(
            "SELECT variant_value, unique_slot "
            "FROM variant_slots "
            "WHERE block_slug = ? "
            "ORDER BY variant_value, unique_slot",
            (block_slug,),
        ).fetchall()

        for variant_value, unique_slot in slot_rows:
            if unique_slot not in producible:
                continue  # safe — the lift cannot touch this discriminator

            violations.append(Violation(
                check="variants",
                block=block_slug,
                detail=(
                    f"{block_slug}: variant '{variant_value}' discriminator '{unique_slot}' "
                    f"is lift-producible — the CSS lift can spuriously populate it, "
                    f"causing detect_variant to mis-score this block's variant."
                ),
                fix=(
                    f"Remove '{unique_slot}' from supports.sgs.variants.{variant_value} "
                    f"in src/blocks/{block_slug.replace('sgs/', '')}/block.json "
                    f"(keep it as a normal attr — just not a discriminator). "
                    f"Then run: python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
                ),
                key=variant_key(block_slug, unique_slot),
            ))

    return violations

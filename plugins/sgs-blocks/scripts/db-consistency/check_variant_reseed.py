"""check_variant_reseed.py — Check #5: variant_slots ↔ block.json determinism.

Spec ref: F6 deferred follow-up (D237) — the most valuable new check.

variant_slots is reseeded from each block's block.json supports.sgs.variants by
set-difference: a variant's discriminating slots = its slots MINUS the union of
all sibling variants' slots (sgs-update-v2.py lines 397-417).  A stale
variant_slots (block.json edited without reseed) silently mis-routes variant
detection — the exact stale-data class F6 exists to catch.

Check: for every variant_attr-populated block, recompute the set-difference from
its src/blocks/<slug>/block.json supports.sgs.variants, and assert it EQUALS the
DB variant_slots rows for that block (as a set of (variant_value, unique_slot)).
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, variant_reseed_key

_BLOCKS_DIR = Path(__file__).resolve().parents[1].parent / "src" / "blocks"  # plugins/sgs-blocks/src/blocks/


def recompute_discriminators(variants_map: dict) -> set[tuple[str, str]]:
    """Recompute the (variant_value, unique_slot) set from a variants map.

    Mirrors sgs-update-v2.py lines 402-417 exactly: a variant's discriminating
    slots = its slots minus the union of every sibling variant's slots.

    Parameters
    ----------
    variants_map : dict[variant_value -> list[slot_name]]

    Returns
    -------
    set[(variant_value, unique_slot)]
    """
    result: set[tuple[str, str]] = set()
    if not isinstance(variants_map, dict):
        return result

    for v_value, v_slots in variants_map.items():
        if not isinstance(v_slots, list):
            continue
        sibling_slots: set = set()
        for other_value, other_slots in variants_map.items():
            if other_value == v_value or not isinstance(other_slots, list):
                continue
            sibling_slots.update(other_slots)
        for slot in v_slots:
            if slot not in sibling_slots:
                result.add((v_value, slot))
    return result


def _read_variants_map(block_slug: str) -> dict | None:
    """Read supports.sgs.variants from src/blocks/<slug>/block.json.

    Returns the variants dict, or None when block.json is missing/unparseable
    (caller treats None as a fail-CLOSED condition).
    """
    block_name = block_slug.replace("sgs/", "")
    bj_path = _BLOCKS_DIR / block_name / "block.json"
    if not bj_path.exists():
        return None
    try:
        meta = json.loads(bj_path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return None
    supports = meta.get("supports", {}) if isinstance(meta, dict) else {}
    sgs = supports.get("sgs", {}) if isinstance(supports, dict) else {}
    if not isinstance(sgs, dict):
        return {}
    variants = sgs.get("variants", {})
    return variants if isinstance(variants, dict) else {}


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #5 against the live DB connection.

    Returns
    -------
    list[Violation]  — empty when every block's variant_slots matches its
                       block.json recompute (expected post-reseed).
    """
    violations: list[Violation] = []

    variant_blocks = [
        row[0]
        for row in conn.execute(
            "SELECT slug FROM blocks "
            "WHERE variant_attr IS NOT NULL AND variant_attr != '' "
            "ORDER BY slug"
        ).fetchall()
    ]

    for block_slug in variant_blocks:
        variants_map = _read_variants_map(block_slug)

        if variants_map is None:
            # fail-CLOSED: cannot read block.json to verify the DB.
            violations.append(Violation(
                check="variant_reseed",
                block=block_slug,
                detail=(
                    f"{block_slug}: block.json not found or unparseable — "
                    "cannot verify variant_slots against source (fail-CLOSED)."
                ),
                fix=(
                    f"Ensure src/blocks/{block_slug.replace('sgs/', '')}/block.json exists and is valid JSON, "
                    f"then run python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
                ),
                key=variant_reseed_key(block_slug, "(no-block-json)"),
            ))
            continue

        recomputed = recompute_discriminators(variants_map)

        db_rows = conn.execute(
            "SELECT variant_value, unique_slot FROM variant_slots WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
        db_set: set[tuple[str, str]] = {(r[0], r[1]) for r in db_rows}

        if db_set == recomputed:
            continue

        missing = recomputed - db_set   # should be in DB but isn't
        extra = db_set - recomputed     # in DB but block.json says it shouldn't be

        # One violation per differing slot, keyed by (block, slot) for stable dedup.
        for variant_value, slot in sorted(missing | extra):
            in_db = (variant_value, slot) in db_set
            kind = "extra in DB (block.json no longer lists it)" if in_db else "missing from DB (block.json adds it)"
            violations.append(Violation(
                check="variant_reseed",
                block=block_slug,
                detail=(
                    f"{block_slug}: variant_slots is stale — variant '{variant_value}' "
                    f"discriminator '{slot}' is {kind}."
                ),
                fix=(
                    f"variant_slots for {block_slug} is stale vs block.json — "
                    f"run python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
                ),
                key=variant_reseed_key(block_slug, slot),
            ))

    return violations

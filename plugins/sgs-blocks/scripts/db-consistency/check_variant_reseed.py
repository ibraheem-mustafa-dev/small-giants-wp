"""check_variant_reseed.py — Check #5: variant_slots ↔ block.json determinism.

Spec ref: F6 deferred follow-up (D237) — the most valuable new check.

variant_slots is reseeded from each block's block.json supports.sgs.variants by
set-difference: a variant's discriminating slots = its slots MINUS the union of
all sibling variants' slots (sgs-update-v2.py lines 397-417).  A stale
variant_slots (block.json edited without reseed) silently mis-routes variant
detection — the exact stale-data class F6 exists to catch.

Check: for every variant_attr-populated block, recompute the set-difference from
its source of truth, and assert it EQUALS the DB variant_slots rows for that
block (as a set of (variant_value, unique_slot, slot_value)).

ADDITIVE (2026-09-05, VALUE-aware variant discrimination). Two DISTINCT source
shapes now exist, mirroring `sgs-update-v2.py`'s own two-path seeding exactly
(independent reimplementation is the POINT of this check — it exists to catch
DB drift from source, not to trust the seeder's own math):

  - NAME-ONLY (a block with no `variations.js` — hero/trust-bar/testimonial/
    product-card): source is block.json `supports.sgs.variants`
    (name -> list[slot names]); recompute is the pre-existing name
    set-difference; `slot_value` is always NULL.
  - VALUE-AWARE (a block WITH `variations.js` — sgs/nav-drawer): source is
    `variations.js` itself (never block.json, which only carries names for
    this kind of block); recompute is a (name, canonical value) PAIR
    set-difference via the same `extract-variation-values.js` AST tool the
    seeder uses; `slot_value` is the canonical JSON string of the value.

Both paths exclude the block's own `variant_attr` name from candidacy — that
attribute is what detection exists to DERIVE, so it can never legitimately be
a stored discriminator (mirrors `sgs-update-v2.py`'s UNIVERSAL EXCLUSION,
2026-09-05).
"""
from __future__ import annotations

import json
import subprocess
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, variant_reseed_key

_BLOCKS_DIR = Path(__file__).resolve().parents[1].parent / "src" / "blocks"  # plugins/sgs-blocks/src/blocks/
_VARIATIONS_VALUE_EXTRACTOR = (
    Path(__file__).resolve().parents[1] / "variant-value-extractor" / "extract-variation-values.js"
)


def _canon_slot_value(value) -> str:
    """MUST match `converter/db/db_lookup.py::_canon_slot_value` and
    `sgs-update-v2.py::_canon_slot_value` exactly — all three write/read/
    re-derive the same canonical form independently."""
    try:
        return json.dumps(value, sort_keys=True, separators=(",", ":"))
    except (TypeError, ValueError):
        return repr(value)


def _run_variation_value_extractor(variations_path: Path) -> "dict | None":
    """Re-run the same AST extractor the seeder uses, independently, so this
    check verifies the DB against SOURCE — not against the seeder's own
    output. Returns `{variant_name: {attr: value}}` or None on any failure
    (missing node, parse error) — a None here fails this block's check
    CLOSED (see caller), never silently skips it.
    """
    if not variations_path.exists() or not _VARIATIONS_VALUE_EXTRACTOR.exists():
        return None
    try:
        proc = subprocess.run(
            ["node", str(_VARIATIONS_VALUE_EXTRACTOR), str(variations_path)],
            capture_output=True, text=True, timeout=30, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if proc.returncode != 0:
        return None
    try:
        payload = json.loads(proc.stdout)
    except (json.JSONDecodeError, ValueError):
        return None
    variants = payload.get("variants") if isinstance(payload, dict) else None
    if not isinstance(variants, dict):
        return None
    return {
        v_name: v_data.get("attributes", {})
        for v_name, v_data in variants.items()
        if isinstance(v_data, dict)
    }


def recompute_discriminators(variants_map: dict, variant_attr_name: "str | None" = None) -> set[tuple[str, str, None]]:
    """Recompute the (variant_value, unique_slot, None) set from a NAME-only
    variants map (capability variants — no `variations.js`).

    Mirrors sgs-update-v2.py's name-only path exactly: a variant's
    discriminating slots = its slots minus the union of every sibling
    variant's slots, both sides excluding the block's own variant-selector
    attribute name.

    Parameters
    ----------
    variants_map : dict[variant_value -> list[slot_name]]
    variant_attr_name : the block's own variant-selector attr, excluded from
        candidacy on both sides of the set-difference.

    Returns
    -------
    set[(variant_value, unique_slot, None)] — None keeps the tuple shape
    aligned with the value-aware recompute below, so callers can union/compare
    uniformly against `(variant_value, unique_slot, slot_value)` DB rows.
    """
    result: set[tuple[str, str, None]] = set()
    if not isinstance(variants_map, dict):
        return result

    for v_value, v_slots in variants_map.items():
        if not isinstance(v_slots, list):
            continue
        own_slots = [s for s in v_slots if s != variant_attr_name]
        sibling_slots: set = set()
        for other_value, other_slots in variants_map.items():
            if other_value == v_value or not isinstance(other_slots, list):
                continue
            sibling_slots.update(s for s in other_slots if s != variant_attr_name)
        for slot in own_slots:
            if slot not in sibling_slots:
                result.add((v_value, slot, None))
    return result


def recompute_discriminators_value_aware(
    value_aware_variants: dict, variant_attr_name: "str | None"
) -> set[tuple[str, str, str]]:
    """Recompute the (variant_value, unique_slot, slot_value) set for a
    PRESET variant block (has `variations.js`) via (name, value) PAIR
    set-difference — mirrors sgs-update-v2.py's value-aware path exactly.

    Parameters
    ----------
    value_aware_variants : dict[variant_name -> {attr_name: value}]
        (from `_run_variation_value_extractor`, already excluding any
        non-literal attribute the extractor could not statically evaluate)
    variant_attr_name : excluded from candidacy on both sides (see module
        docstring — the block's own selector attr can never be a stored
        discriminator).

    Returns
    -------
    set[(variant_value, unique_slot, canonical_slot_value)]
    """
    per_variant_pairs: dict[str, set[tuple[str, str]]] = {}
    for v_name, v_attrs in value_aware_variants.items():
        if not isinstance(v_attrs, dict):
            continue
        per_variant_pairs[v_name] = {
            (attr, _canon_slot_value(val))
            for attr, val in v_attrs.items()
            if attr != variant_attr_name
        }
    result: set[tuple[str, str, str]] = set()
    for v_name, own_pairs in per_variant_pairs.items():
        sibling_pairs: set = set()
        for other_name, other_pairs in per_variant_pairs.items():
            if other_name != v_name:
                sibling_pairs.update(other_pairs)
        for attr, canon_val in own_pairs - sibling_pairs:
            result.add((v_name, attr, canon_val))
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
        block_name = block_slug.replace("sgs/", "")
        variations_path = _BLOCKS_DIR / block_name / "variations.js"
        variant_attr_row = conn.execute(
            "SELECT variant_attr FROM blocks WHERE slug = ?", (block_slug,)
        ).fetchone()
        variant_attr_name = variant_attr_row[0] if variant_attr_row else None

        if variations_path.exists():
            # VALUE-AWARE source: variations.js, never block.json (D — 2026-09-05).
            value_aware_variants = _run_variation_value_extractor(variations_path)
            if value_aware_variants is None:
                violations.append(Violation(
                    check="variant_reseed",
                    block=block_slug,
                    detail=(
                        f"{block_slug}: variations.js exists but could not be parsed "
                        "by extract-variation-values.js (missing node, parse error, or "
                        "non-JSON output) — cannot verify variant_slots against source "
                        "(fail-CLOSED)."
                    ),
                    fix=(
                        f"Run: node plugins/sgs-blocks/scripts/variant-value-extractor/"
                        f"extract-variation-values.js src/blocks/{block_name}/variations.js "
                        f"and fix whatever error it reports."
                    ),
                    key=variant_reseed_key(block_slug, "(variations-js-unparseable)"),
                ))
                continue
            recomputed = recompute_discriminators_value_aware(value_aware_variants, variant_attr_name)
        else:
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
                        f"Ensure src/blocks/{block_name}/block.json exists and is valid JSON, "
                        f"then run python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
                    ),
                    key=variant_reseed_key(block_slug, "(no-block-json)"),
                ))
                continue
            recomputed = recompute_discriminators(variants_map, variant_attr_name)

        db_rows = conn.execute(
            "SELECT variant_value, unique_slot, slot_value FROM variant_slots WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
        db_set: set[tuple[str, str, "str | None"]] = {(r[0], r[1], r[2]) for r in db_rows}

        if db_set == recomputed:
            continue

        missing = recomputed - db_set   # should be in DB but isn't
        extra = db_set - recomputed     # in DB but source says it shouldn't be

        # One violation per differing slot, keyed by (block, slot) for stable dedup.
        for variant_value, slot, slot_value in sorted(missing | extra, key=lambda t: (t[0], t[1])):
            in_db = (variant_value, slot, slot_value) in db_set
            kind = "extra in DB (source no longer lists it)" if in_db else "missing from DB (source adds it)"
            violations.append(Violation(
                check="variant_reseed",
                block=block_slug,
                detail=(
                    f"{block_slug}: variant_slots is stale — variant '{variant_value}' "
                    f"discriminator '{slot}'"
                    + (f" (value {slot_value})" if slot_value is not None else "")
                    + f" is {kind}."
                ),
                fix=(
                    f"variant_slots for {block_slug} is stale vs source — "
                    f"run python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
                ),
                key=variant_reseed_key(block_slug, slot),
            ))

    return violations

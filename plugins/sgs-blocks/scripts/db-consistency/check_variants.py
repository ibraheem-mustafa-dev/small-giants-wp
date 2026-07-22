"""check_variants.py — Check #3: variant discriminator AMBIGUITY on the lift surface.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md §1 (check #3)
Rule superseded 2026-07-22 (Bean-confirmed) — see below.

ORIGINAL RULE (retired): "no variant_slots.unique_slot discriminator may be
lift-producible for its block." This condemned the css-marker method every
variant of every variant block legitimately uses to be recognised from a
draft's extracted CSS — it is the WRONG rule. A discriminator is *supposed*
to be a real styling attribute the CSS lift can populate; that's how
detect_variant tells variants apart from the draft's rendered styles.

CURRENT RULE: AMBIGUITY. detect_variant can only distinguish two variants if
their discriminator signatures differ. A violation is raised when TWO OR MORE
distinct variants of the same block share the SAME discriminator signature —
including the case where both signatures are EMPTY (no discriminating slots
at all). A SINGLE empty-signature variant is fine and expected — it is the
intentional no-unique-feature fallback (e.g. sgs/trust-bar's 'text-only').
Only when a SECOND variant also has an empty (or identical non-empty)
signature does detection become genuinely ambiguous.

Implementation (R-22-1 reuse, R-31-1 DB-first, R-31-9 universal):
- Iterates every block WHERE variant_attr IS NOT NULL AND variant_attr != ''
  (any future block auto-included — zero hardcoding).
- The full variant-name roster for a block comes from the variant-attr's own
  block_attributes.enum_values (populated by /sgs-update from the block.json
  enum) — NOT from variant_slots alone, because a zero-discriminator variant
  (e.g. 'text-only') never gets a variant_slots row and would otherwise be
  invisible to this check.
- Builds each variant's discriminator signature (a frozenset of unique_slot,
  empty when the variant has no variant_slots rows) and groups variants by
  identical signature. Any group of size >= 2 is a violation.

Post-image-badge-fix expectation (2026-07-22, D3xx): sgs/trust-bar drops from
5 violations (old rule) to 0 (new rule) — image-badge gained its own 4
discriminators (badgeImageBorderRadius/Size/Shadow/ObjectFit), leaving
text-only as the sole empty-signature fallback.
"""
from __future__ import annotations

import json
import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, variant_key


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #3 (ambiguity) against the live DB connection.

    Parameters
    ----------
    conn : open sqlite3.Connection to sgs-framework.db

    Returns
    -------
    list[Violation]  — empty when every block's variants are distinguishable.
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
        # Full variant-name roster from the variant-attr's own enum. This is the
        # ONLY reliable source for zero-discriminator variants (they never get a
        # variant_slots row), so we must not derive the roster from variant_slots.
        enum_row = conn.execute(
            "SELECT enum_values FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, variant_attr_col),
        ).fetchone()
        if not enum_row or not enum_row[0]:
            # A variant_attr block with NO enum recorded is not "nothing to
            # compare" — it means detect_variant has no roster to discriminate
            # against at all. Silently skipping this made the gate pass with
            # 0 violations for a block whose variant enum is simply missing
            # (negative-control-or-the-test-is-vacuous class). Surface it.
            violations.append(Violation(
                check="variants",
                block=block_slug,
                detail=(
                    f"{block_slug}: variant_attr '{variant_attr_col}' has no "
                    f"enum_values recorded in block_attributes — detect_variant "
                    f"has no variant roster to discriminate against for this block."
                ),
                fix=(
                    f"Declare an 'enum' for '{variant_attr_col}' on "
                    f"src/blocks/{block_slug.replace('sgs/', '')}/block.json, then run: "
                    f"python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
                ),
                key=variant_key(block_slug, "__missing_enum__"),
            ))
            continue

        try:
            raw_variant_names = json.loads(enum_row[0])
        except (TypeError, ValueError):
            violations.append(Violation(
                check="variants",
                block=block_slug,
                detail=(
                    f"{block_slug}: variant_attr '{variant_attr_col}' has a "
                    f"malformed enum_values value in block_attributes (not valid "
                    f"JSON) — detect_variant cannot read a variant roster for "
                    f"this block."
                ),
                fix=(
                    f"Re-run: python plugins/sgs-blocks/scripts/sgs-update-v2.py "
                    f"--stage 1 to reseed enum_values for '{block_slug}' from its "
                    f"block.json 'enum'. If the reseed does not fix it, the "
                    f"block.json 'enum' itself is malformed and needs correcting."
                ),
                key=variant_key(block_slug, "__malformed_enum__"),
            ))
            continue
        if not isinstance(raw_variant_names, list):
            violations.append(Violation(
                check="variants",
                block=block_slug,
                detail=(
                    f"{block_slug}: variant_attr '{variant_attr_col}' enum_values "
                    f"decodes to a {type(raw_variant_names).__name__}, not a list — "
                    f"detect_variant cannot read a variant roster for this block."
                ),
                fix=(
                    f"Check the 'enum' declared for '{variant_attr_col}' on "
                    f"src/blocks/{block_slug.replace('sgs/', '')}/block.json is a "
                    f"JSON array, then run: python plugins/sgs-blocks/scripts/"
                    f"sgs-update-v2.py --stage 1"
                ),
                key=variant_key(block_slug, "__non_list_enum__"),
            ))
            continue

        # '' in a variant enum is the universal "no variant chosen yet" sentinel
        # (e.g. sgs/testimonial's default is '', distinct from its 7 named
        # variants) — it is not itself a nameable variant, so it can never
        # collide with a real variant's signature.
        variant_names = [v for v in raw_variant_names if v != ""]
        if len(variant_names) < 2:
            continue  # a single-variant "roster" can never be ambiguous

        # Discriminator signature per variant — empty frozenset when the variant
        # has zero rows in variant_slots (the intentional fallback shape).
        slot_rows = conn.execute(
            "SELECT variant_value, unique_slot FROM variant_slots WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()

        signature: dict[str, set] = {name: set() for name in variant_names}
        for variant_value, unique_slot in slot_rows:
            if variant_value in signature:
                signature[variant_value].add(unique_slot)

        # Group variants by identical signature. A group of size 1 is safe
        # (including the single allowed empty-signature fallback); size >= 2
        # means detect_variant cannot tell those variants apart.
        by_signature: dict[frozenset, list[str]] = {}
        for name, slots in signature.items():
            by_signature.setdefault(frozenset(slots), []).append(name)

        for sig, names in by_signature.items():
            if len(names) < 2:
                continue

            names_sorted = sorted(names)
            label = "empty (no discriminating attrs at all)" if not sig else ", ".join(sorted(sig))

            violations.append(Violation(
                check="variants",
                block=block_slug,
                detail=(
                    f"{block_slug}: variants {names_sorted} share the same discriminator "
                    f"signature — {label}. detect_variant cannot tell them apart from the "
                    f"draft's extracted CSS."
                ),
                fix=(
                    f"Give each variant in {names_sorted} its own distinguishing styling "
                    f"attr(s) under supports.sgs.variants in "
                    f"src/blocks/{block_slug.replace('sgs/', '')}/block.json — only ONE "
                    f"variant per block may keep an empty/no-op discriminator set (the "
                    f"intentional no-unique-feature fallback). Then run: "
                    f"python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
                ),
                key=variant_key(block_slug, "|".join(names_sorted)),
            ))

    return violations

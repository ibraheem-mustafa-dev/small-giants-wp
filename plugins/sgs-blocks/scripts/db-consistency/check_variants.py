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

FULL SIGNATURE = (attribute_slots, composition_slots, composition_attr_slots)
— 2026-09-06 update; the two-half version is described immediately below and
still applies to the first two halves.

THIRD HALF (2026-09-06): detect_variant() can also tell two variants apart by a
nested CHILD's own attribute value (`variant_composition_attr_slots`). That is
the only signal left when two variants nest the IDENTICAL set of child block
slugs — their composition halves are then equal by construction, so a check
that stopped at two halves would report a genuinely discriminable pair as
ambiguous. sgs/nav-drawer's 'two-column-editorial' vs 'floating-capped-card' is
that case: both nest {sgs/nav-menu, sgs/button}, and only the former's nav-menu
sets `listColumns`. Two variants now collide only when ALL THREE halves match.

The two-half rule (2026-09-05), unchanged for those halves:
detect_variant() can now also tell two variants apart via InnerBlocks
composition fingerprinting (variant_composition_slots — see Spec-plan
"variant-composition-fingerprinting", Task 2/4). A variant's full
discriminator signature is therefore a TUPLE of two frozensets: its
variant_slots-derived attribute signature, and its variant_composition_slots-
derived composition signature (unique_child_slug values). Two variants only
collide when BOTH halves are identical — a variant with an empty attribute
signature but a real, unique composition signature (e.g. sgs/nav-drawer's
'split-zone-serif', discriminated by its unique 'sgs/card-grid' child) is
correctly NOT flagged, even though another variant shares its empty
attribute half.

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

        attr_signature: dict[str, set] = {name: set() for name in variant_names}
        for variant_value, unique_slot in slot_rows:
            if variant_value in attr_signature:
                attr_signature[variant_value].add(unique_slot)

        # Composition discriminator per variant — InnerBlocks-composition
        # fingerprinting (2026-09-05). A variant can ALSO be distinguished by
        # which child block slug(s) uniquely appear in its composition (e.g.
        # sgs/nav-drawer's 'split-zone-serif' is the only variant that nests
        # a sgs/card-grid child). Empty frozenset when the variant has zero
        # rows in variant_composition_slots.
        composition_rows = conn.execute(
            "SELECT variant_value, unique_child_slug FROM variant_composition_slots "
            "WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()

        composition_signature: dict[str, set] = {name: set() for name in variant_names}
        for variant_value, unique_child_slug in composition_rows:
            if variant_value in composition_signature:
                composition_signature[variant_value].add(unique_child_slug)

        # THIRD half — child-ATTRIBUTE-VALUE composition (2026-09-06).
        # detect_variant() can now ALSO tell two variants apart by a nested
        # child's own attribute value (variant_composition_attr_slots), which
        # is the only signal available when two variants nest the IDENTICAL
        # set of child block slugs and so have identical composition halves
        # (sgs/nav-drawer's 'two-column-editorial' vs 'floating-capped-card',
        # both {sgs/nav-menu, sgs/button}). Without this half, a variant that
        # IS discriminable would still be reported ambiguous here — a check
        # blind to a signal the detector actually uses.
        #
        # Soft-fails to an empty signature when the table is absent
        # (pre-migration DB), which reproduces this check's exact
        # pre-2026-09-06 behaviour rather than erroring.
        try:
            composition_attr_rows = conn.execute(
                "SELECT variant_value, child_slug, child_attr_name, child_attr_value "
                "FROM variant_composition_attr_slots WHERE block_slug = ?",
                (block_slug,),
            ).fetchall()
        except sqlite3.OperationalError:
            composition_attr_rows = []

        composition_attr_signature: dict[str, set] = {name: set() for name in variant_names}
        for variant_value, child_slug, attr_name, attr_value in composition_attr_rows:
            if variant_value in composition_attr_signature:
                composition_attr_signature[variant_value].add(
                    (child_slug, attr_name, attr_value)
                )

        # FULL signature = (attribute_slots, composition_slots,
        # composition_attr_slots) as a tuple of three frozensets. Two variants
        # only collide when ALL THREE halves match — a variant with empty
        # attribute AND composition halves but a real, unique child-attribute
        # half is correctly distinguishable.
        full_signature: dict[str, tuple[frozenset, frozenset, frozenset]] = {
            name: (
                frozenset(attr_signature[name]),
                frozenset(composition_signature[name]),
                frozenset(composition_attr_signature[name]),
            )
            for name in variant_names
        }

        # Group variants by identical FULL signature. A group of size 1 is
        # safe (including the single allowed empty-signature fallback);
        # size >= 2 means detect_variant cannot tell those variants apart —
        # neither their attributes, nor their composition, nor their
        # children's own attribute values differ.
        by_signature: dict[tuple[frozenset, frozenset, frozenset], list[str]] = {}
        for name, sig in full_signature.items():
            by_signature.setdefault(sig, []).append(name)

        for sig, names in by_signature.items():
            if len(names) < 2:
                continue

            names_sorted = sorted(names)
            attr_sig, composition_sig, composition_attr_sig = sig
            attr_label = (
                "empty (no discriminating attrs)" if not attr_sig
                else ", ".join(sorted(attr_sig))
            )
            composition_label = (
                "empty (no discriminating InnerBlocks composition)" if not composition_sig
                else ", ".join(sorted(composition_sig))
            )
            composition_attr_label = (
                "empty (no discriminating child attribute values)"
                if not composition_attr_sig
                else ", ".join(
                    f"{child}.{attr}={value}"
                    for child, attr, value in sorted(composition_attr_sig)
                )
            )
            label = (
                f"attrs: {attr_label} / composition: {composition_label} / "
                f"child attrs: {composition_attr_label}"
            )

            violations.append(Violation(
                check="variants",
                block=block_slug,
                detail=(
                    f"{block_slug}: variants {names_sorted} share the same discriminator "
                    f"signature — {label}. detect_variant cannot tell them apart from the "
                    f"draft's extracted CSS, its InnerBlocks composition, or its children's "
                    f"own attribute values."
                ),
                fix=(
                    f"Give each variant in {names_sorted} its own distinguishing signal — "
                    f"a styling attr under supports.sgs.variants, a unique InnerBlocks "
                    f"child fingerprint via variant_composition_slots, or a distinct "
                    f"attribute value on one of its nested children (seeded into "
                    f"variant_composition_attr_slots from that block's variations.js) — in "
                    f"src/blocks/{block_slug.replace('sgs/', '')}/block.json — only ONE "
                    f"variant per block may keep an empty/no-op discriminator set on ALL "
                    f"THREE halves (the intentional no-unique-feature fallback). Then run: "
                    f"python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
                ),
                key=variant_key(block_slug, "|".join(names_sorted)),
            ))

    return violations

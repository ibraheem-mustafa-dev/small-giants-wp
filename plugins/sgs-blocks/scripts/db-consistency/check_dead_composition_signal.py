"""check_dead_composition_signal.py — Check #10: dead composition discriminator.

Spec ref: variant-composition-fingerprinting plan (2026-09-05), Task 7 — "protect
the future" structural guard.

WHY THIS EXISTS
----------------------------------------------------------------------------
Tasks 1-6 of this plan found and fixed a real bug: `sgs/nav-drawer`'s
'split-zone-serif' variant had a real, seeded row in `variant_composition_slots`
(its InnerBlocks-composition discriminator — the unique child block slug that
distinguishes it from every other variant) while the block had NO content-
extraction path that could ever surface that composition data to
`detect_variant()` at convert-time. The discriminator existed in the DB and was
completely inert. This was only caught because a human traced it by hand during
a live end-to-end proof — the exact failure mode this check exists to make
impossible to miss again, for ANY block, now or in the future.

THE RULE
----------------------------------------------------------------------------
For every `block_slug` with at least one row in `variant_composition_slots` OR
in `variant_composition_attr_slots` (extended 2026-09-06 — the child-ATTRIBUTE-
VALUE composition signal is dead in exactly the same way, and by exactly the
same mechanism, if the converter can never see the block's composed children)
— i.e. a real, non-empty InnerBlocks-composition discriminator exists for at
least one of its variants — that block MUST have at least ONE of three content-
extraction paths — the mechanisms by which the converter can ever see the
block's actual composed children at convert-time and therefore ever populate
`variant_composition_slots`-shaped signal for `detect_variant()` to read:

  (a) `derive_delegates_content(block_slug) == 1`
      (`converter/services/has_inner.py` — save.js emits <InnerBlocks.Content>
      AND render.php consumes $content non-trivially, or a block.json
      `hasInnerBlocks` override says so explicitly)
  (b) an `array-content-lift` row in `block_capabilities` for the block
  (c) a `block_attributes` row for the block with `emit_shape = 'child'`

If NONE of the three are present, the discriminator can never reach
`detect_variant()` — it is dead data, indistinguishable from a discriminator
that was never seeded at all, except that it silently gives a false sense
that the variant IS discriminable.

WHY THESE THREE AND ONLY THESE THREE
----------------------------------------------------------------------------
All three are content-extraction paths already recognised elsewhere in this
codebase as the ways a block's composed-children content can reach the
converter's recognition/emission layer (see `check_composition.py`'s AND-rule
docstring for (a); `block_capabilities.capability='array-content-lift'` and
`block_attributes.emit_shape='child'` are the two DB-declared routes — see
FR-31-2/FR-31-3 in Spec 31 §13.2/§13.6). A block with none of the three has no
route by which its InnerBlocks composition is ever read by the pipeline, so a
`variant_composition_slots` row for it can never do anything.

FIX command for all violations points at the same three places this check
tests — add a real content-extraction path, or remove the dead discriminator
row if the variant should be distinguished a different way (attribute
discriminator instead, per check_variants.py Check #3).
"""
from __future__ import annotations

import importlib.util
import sqlite3
import sys
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, dead_composition_signal_key

# ---------------------------------------------------------------------------
# Import the REAL derive_delegates_content — never a hand-rolled second copy
# of the AND-rule (R-22-1 reuse; same pattern as resolver_bridge.py /
# check_fx_qualifying_blocks_stale.py loading a sibling module by file path,
# since `scripts/` sits above a hyphenated directory and cannot always be
# imported as a normal dotted package from here).
# ---------------------------------------------------------------------------

_HAS_INNER_PATH = (
    Path(__file__).resolve().parents[1]  # scripts/db-consistency/../ = scripts/
    / "converter"
    / "services"
    / "has_inner.py"
)

if not _HAS_INNER_PATH.exists():
    raise ImportError(
        f"[check_dead_composition_signal] Cannot find has_inner.py at {_HAS_INNER_PATH}.\n"
        "This check requires the real derive_delegates_content() to avoid a second, "
        "driftable copy of the AND-rule. Ensure "
        "plugins/sgs-blocks/scripts/converter/services/has_inner.py exists."
    )

_spec = importlib.util.spec_from_file_location("has_inner_real", str(_HAS_INNER_PATH))
_has_inner_mod: Any = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
try:
    _spec.loader.exec_module(_has_inner_mod)  # type: ignore[union-attr]
except Exception as exc:  # noqa: BLE001
    raise ImportError(
        f"[check_dead_composition_signal] Failed to load has_inner.py: {exc}\n"
        "Cannot continue — this check requires the live derive_delegates_content()."
    ) from exc

if not hasattr(_has_inner_mod, "derive_delegates_content"):
    raise ImportError(
        "[check_dead_composition_signal] has_inner.py has no derive_delegates_content "
        "symbol.\nIf the function was renamed, update check_dead_composition_signal.py "
        "to match."
    )

derive_delegates_content = _has_inner_mod.derive_delegates_content


def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #10 (dead composition discriminator) against the live DB.

    Parameters
    ----------
    conn : open sqlite3.Connection to sgs-framework.db

    Returns
    -------
    list[Violation]  — empty when every block with a variant_composition_slots
    row has at least one real content-extraction path.
    """
    violations: list[Violation] = []

    # Every block with at least one composition discriminator, plus the
    # distinct variant values that carry one — so a violation can name exactly
    # which variant(s) are affected, not just the block.
    #
    # BOTH composition tables (2026-09-06). `variant_composition_attr_slots`
    # (a nested CHILD's own attribute value) reaches detect_variant() by the
    # very same route as `variant_composition_slots` (the child's slug) — the
    # converter must be able to see the block's composed children at
    # convert-time, or neither signal can ever fire. A row in the newer table
    # on a block with no content-extraction path is dead in exactly the way
    # this check exists to catch, so it is UNIONed in rather than left
    # invisible. The check's rule, remedy and output are otherwise unchanged.
    rows = conn.execute(
        "SELECT block_slug, variant_value FROM ("
        "  SELECT block_slug, variant_value FROM variant_composition_slots"
        "  UNION"
        "  SELECT block_slug, variant_value FROM variant_composition_attr_slots"
        ") "
        "GROUP BY block_slug, variant_value "
        "ORDER BY block_slug, variant_value"
    ).fetchall()

    variants_by_block: dict[str, list[str]] = {}
    for block_slug, variant_value in rows:
        variants_by_block.setdefault(block_slug, []).append(variant_value)

    for block_slug, variant_values in variants_by_block.items():
        has_delegates_content = derive_delegates_content(block_slug) == 1

        has_array_content_lift = conn.execute(
            "SELECT 1 FROM block_capabilities "
            "WHERE block_slug = ? AND capability = 'array-content-lift' LIMIT 1",
            (block_slug,),
        ).fetchone() is not None

        has_emit_shape_child = conn.execute(
            "SELECT 1 FROM block_attributes "
            "WHERE block_slug = ? AND emit_shape = 'child' LIMIT 1",
            (block_slug,),
        ).fetchone() is not None

        if has_delegates_content or has_array_content_lift or has_emit_shape_child:
            continue  # at least one real content-extraction path exists — safe

        variants_sorted = sorted(variant_values)
        block_file_slug = block_slug.replace("sgs/", "")
        violations.append(Violation(
            check="dead_composition_signal",
            block=block_slug,
            detail=(
                f"{block_slug}: variant(s) {variants_sorted} have a real "
                f"InnerBlocks-composition discriminator seeded in "
                f"variant_composition_slots, but {block_slug} has NONE of the three "
                f"content-extraction paths (derive_delegates_content()==1, an "
                f"'array-content-lift' block_capabilities row, or a block_attributes "
                f"row with emit_shape='child') that would let the converter ever "
                f"read that composition at convert-time. This discriminator can "
                f"NEVER reach detect_variant() — it is dead data indistinguishable "
                f"from a discriminator that was never seeded, except that it "
                f"falsely implies {variants_sorted} is/are already discriminable."
            ),
            fix=(
                f"Give {block_slug} a real content-extraction path before relying on "
                f"a composition discriminator for {variants_sorted}: either (a) make "
                f"save.js emit <InnerBlocks.Content> AND render.php consume $content "
                f"non-trivially (see plugins/sgs-blocks/scripts/converter/services/"
                f"has_inner.py), (b) add an 'array-content-lift' row to "
                f"block_capabilities for {block_slug}, or (c) declare an attribute "
                f"with emit_shape='child' in block_attributes for {block_slug}. If "
                f"none of these is appropriate, remove the dead row(s) from "
                f"variant_composition_slots and discriminate {variants_sorted} via a "
                f"styling attribute instead (supports.sgs.variants in "
                f"src/blocks/{block_file_slug}/block.json), then run: "
                f"python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1"
            ),
            key=dead_composition_signal_key(block_slug),
        ))

    return violations

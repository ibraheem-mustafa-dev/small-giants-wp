"""classifier.py — assigns a CellState to each (block, column) pair.

Spec ref: .claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §5

HONEST STATE ASSIGNMENT FOR THE CURRENT BUILD PHASE (Phase F, pre-F3):
  The matrix can classify N/A, GAP, BLOCKED, and UNVERIFIED without the F3
  render-diff oracle.  COVERED and CHEAT CANNOT be assigned yet:

  • COVERED  requires live computed-style verification that the value LANDED
    on a non-default-value fixture (Spec 31 §7b false-win guard).  This needs
    the F3 runtime oracle, which is DEFERRED (Phase F3 is not yet built).

  • CHEAT    must be classified from the §7a gate output (check-converter-cheats.py),
    not from human/LLM judgment (MF-7).  That gate is also not yet fully armed.

  State mapping (current phase):
    N/A        → KIND does not expose this layer (Spec 31 §2 Axis 2)
    BLOCKED    → layer = L4_GRID_AREA (MF-5: no converter call-site yet); OR
                 family = background on a non-section block
    GAP        → no destination attr found for (block, family, tier) in block_attributes
    UNVERIFIED → destination attr exists; not yet live-probed
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Make sibling modules importable by bare name regardless of how this file is
# loaded (direct run, entrypoint importlib, or pytest importlib from scripts/).
sys.path.insert(0, str(Path(__file__).resolve().parent))

from typing import Optional

from models import (
    Block,
    CapabilityColumn,
    CapabilityFamily,
    CellState,
    Kind,
    Layer,
    MatrixCell,
)
from db_queries import _column_id, _kind_allows_layer, _family_allowed_for_kind_and_layer


# ---------------------------------------------------------------------------
# Attr-name patterns per (capability_family, layer, tier)
# ---------------------------------------------------------------------------
# These patterns let us check whether a block has a relevant destination attr
# without hardcoding per-block lists.  They match against block_attributes.attr_name.

_FAMILY_ATTR_PATTERNS: dict[tuple[str, str], list[str]] = {
    # L1 OUTER box
    (CapabilityFamily.BOX_LAYOUT,   Layer.L1_OUTER): [
        "padding", "margin", "width", "height",
        "minHeight", "maxWidth", "minWidth", "maxHeight", "aspectRatio",
    ],
    (CapabilityFamily.ALIGN,        Layer.L1_OUTER): [
        "verticalAlign", "alignContent", "justifyContent",
        "alignItems", "justifyItems",
    ],
    (CapabilityFamily.BACKGROUND,   Layer.L1_OUTER): [
        "backgroundImage", "backgroundColour", "backgroundOverlayColour",
        "bgKenBurns", "bgParallax",
    ],
    (CapabilityFamily.COLOUR,       Layer.L1_OUTER): [
        "colour", "color", "textColour", "borderColour", "shadow",
    ],
    (CapabilityFamily.VISUAL,       Layer.L1_OUTER): [
        "borderRadius", "borderWidth", "borderStyle", "shadow",
        "opacity", "boxShadow",
    ],
    (CapabilityFamily.TYPOGRAPHY,   Layer.L1_OUTER): [
        "fontSize", "fontWeight", "fontFamily", "lineHeight",
        "letterSpacing", "textTransform", "textDecoration", "textAlign",
    ],
    # L2 CONTENT band
    (CapabilityFamily.CONTENT_BAND, Layer.L2_CONTENT): [
        "contentWidth", "contentBandPadding",
    ],
    # L3 GRID
    (CapabilityFamily.GRID,         Layer.L3_GRID): [
        "gridTemplateColumns", "gap", "columns", "layout",
        "flexDirection", "flexWrap", "columnGap", "rowGap",
    ],
    (CapabilityFamily.ALIGN,        Layer.L3_GRID): [
        "alignItems", "alignContent", "justifyContent", "justifyItems",
    ],
    # L4 GRID AREA — blocked (MF-5), no pattern needed but kept for completeness
    (CapabilityFamily.CONTENT_BAND, Layer.L4_GRID_AREA): [],
    # Motion (always L1 OUTER for now)
    (CapabilityFamily.MOTION,       Layer.L1_OUTER): [
        "delay", "duration", "easing", "animation",
    ],
    # Media (L1 OUTER for image blocks)
    (CapabilityFamily.MEDIA,        Layer.L1_OUTER): [
        "objectFit", "objectPosition",
    ],
}

# Tier-suffix patterns — we append Mobile/Tablet/Desktop to the base pattern
_TIER_SUFFIXES: dict[Optional[str], str] = {
    None:       "",          # base (desktop default, no suffix)
    "Mobile":   "Mobile",
    "Tablet":   "Tablet",
    "Desktop":  "Desktop",
}


def _block_has_attr_for(block: Block, family: str, layer: str, tier: Optional[str]) -> bool:
    """
    Return True if the block has at least one destination attr for
    (family, layer, tier) — using substring/suffix matching against
    block_attributes.attr_name values (already fetched into block.attr_names).
    """
    patterns = _FAMILY_ATTR_PATTERNS.get((family, layer), [])
    if not patterns:
        return False

    tier_suffix = _TIER_SUFFIXES.get(tier, "")
    attr_names_lower = [a.lower() for a in block.attr_names]

    for pattern in patterns:
        # Build the expected attr name fragment
        base_pattern = pattern.lower()
        if tier_suffix:
            expected = (base_pattern + tier_suffix.lower())
        else:
            expected = base_pattern

        # Check for substring match in any attr_name
        for attr_lower in attr_names_lower:
            if expected in attr_lower or base_pattern in attr_lower:
                return True

    return False


def classify_cell(
    block: Block,
    column: CapabilityColumn,
) -> MatrixCell:
    """
    Assign a CellState to the (block, column) pair.

    See module docstring for the honest state mapping.
    """
    kind = block.container_kind or "section"  # sgs/container added with 'section'
    family = column.capability_family
    layer = column.layer
    tier = column.tier
    col_id = _column_id(family, layer, tier)

    # ── N/A ─────────────────────────────────────────────────────────────────
    # KIND does not expose this layer (Spec 31 §2 Axis 2)
    if not _kind_allows_layer(kind, layer):
        return MatrixCell(
            block_slug=block.slug,
            column_id=col_id,
            layer=layer,
            capability_family=family,
            tier=tier,
            state=CellState.NA,
            reason=f"KIND '{kind}' does not expose {layer}",
        )

    # KIND gates the background family to section only
    if not _family_allowed_for_kind_and_layer(family, kind, layer):
        return MatrixCell(
            block_slug=block.slug,
            column_id=col_id,
            layer=layer,
            capability_family=family,
            tier=tier,
            state=CellState.NA,
            reason=f"Background capability not available for KIND '{kind}'",
        )

    # ── BLOCKED ──────────────────────────────────────────────────────────────
    # L4 GRID_AREA: MF-5 — attr_for_area_property has no converter call-site;
    # all L4 cells are BLOCKED until the wiring is built (Spec 31 §9 Q2).
    if layer == Layer.L4_GRID_AREA:
        return MatrixCell(
            block_slug=block.slug,
            column_id=col_id,
            layer=layer,
            capability_family=family,
            tier=tier,
            state=CellState.BLOCKED,
            reason=(
                "L4 GRID_AREA: attr_for_area_property() has no converter call-site "
                "(MF-5, Spec 31 §9 Q2). Unreachable until Method-2 composite routing "
                "lands at Stage 2."
            ),
        )

    # ── GAP ──────────────────────────────────────────────────────────────────
    # No destination attr found for this (block, family, layer, tier) combination.
    has_dest = _block_has_attr_for(block, family, layer, tier)
    if not has_dest:
        return MatrixCell(
            block_slug=block.slug,
            column_id=col_id,
            layer=layer,
            capability_family=family,
            tier=tier,
            state=CellState.GAP,
            reason=(
                f"No destination attr found in block_attributes for "
                f"(block={block.slug!r}, family={family!r}, "
                f"layer={layer!r}, tier={tier!r}). "
                "Either seed the attr via block.json + /sgs-update, or add a "
                "property_suffixes row with a migration (never a code branch)."
            ),
        )

    # ── UNVERIFIED ────────────────────────────────────────────────────────────
    # Destination attr exists but not yet live-probed.
    # COVERED requires F3 runtime oracle (deferred).
    # CHEAT requires §7a gate output (deferred).
    return MatrixCell(
        block_slug=block.slug,
        column_id=col_id,
        layer=layer,
        capability_family=family,
        tier=tier,
        state=CellState.UNVERIFIED,
        reason=(
            "Destination attr exists in block_attributes. "
            "COVERED classification deferred until F3 render-diff oracle is built "
            "(Spec 31 §12.2.2 — LANDED = live computed-style on a non-default-value "
            "fixture). CHEAT classification deferred until §7a check-converter-cheats.py "
            "gate output is available (MF-7)."
        ),
    )


def classify_all(
    blocks: list[Block],
    columns: list[CapabilityColumn],
) -> list[MatrixCell]:
    """Produce the full cell list — one MatrixCell per (block, column) pair."""
    cells: list[MatrixCell] = []
    for block in blocks:
        for column in columns:
            cells.append(classify_cell(block, column))
    return cells

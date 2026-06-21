"""models.py — shared data types for the coverage-matrix module.

Spec ref: .claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §5 + MF-7
"""
from __future__ import annotations

import sys

sys.stdout.reconfigure(encoding="utf-8")

from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Cell state constants
# ---------------------------------------------------------------------------

class CellState:
    """The six possible states for a coverage-matrix cell (Spec 31 §5)."""
    COVERED     = "COVERED"      # Live-verified; destination attr exists + LANDED
    GAP         = "GAP"          # No destination attr OR no property_suffixes row
    BLOCKED     = "BLOCKED"      # Dest attr exists but unreachable until a sibling phase lands
    UNVERIFIED  = "UNVERIFIED"   # Destination attr exists but not live-probed
    CHEAT       = "CHEAT"        # Only passes via a forbidden mechanism (classified from gate output)
    NA          = "N/A"          # KIND does not expose this layer


# ---------------------------------------------------------------------------
# Layer constants (Spec 31 §2 Axis 1)
# ---------------------------------------------------------------------------

class Layer:
    L1_OUTER        = "L1_OUTER"         # Section-root box: align, maxWidth, padding, background, min-height
    L2_CONTENT      = "L2_CONTENT"       # Content-width inner band: contentWidth, contentBandPadding*
    L3_GRID         = "L3_GRID"          # Grid: gridTemplateColumns, gap, gridItem*
    L4_GRID_AREA    = "L4_GRID_AREA"     # Named grid areas: per-area content*, media* (Spec 31 §2 Axis 1, MF-5: BLOCKED until wired)

    ALL = [L1_OUTER, L2_CONTENT, L3_GRID, L4_GRID_AREA]


# ---------------------------------------------------------------------------
# KIND constants (Spec 31 §2 Axis 2)
# ---------------------------------------------------------------------------

class Kind:
    SECTION = "section"    # All layers + background/overlay/SVG/shape
    LAYOUT  = "layout"     # L1–L4 width+grid, no background layer
    CONTENT = "content"    # L1+L2 width+padding only, no grid, no background


# ---------------------------------------------------------------------------
# Capability family constants (derived from property_suffixes.role groupings)
# ---------------------------------------------------------------------------

class CapabilityFamily:
    """High-level capability family grouping for the matrix columns."""
    BOX_LAYOUT   = "box_layout"    # padding, margin, width, height, min/max-height/width, aspect-ratio
    GRID         = "grid"          # display, grid-template-columns, gap, row-gap, column-gap, flex-*
    ALIGN        = "align"         # align-items, align-content, justify-content, justify-items
    BACKGROUND   = "background"    # background-color, background-image (gradient)
    TYPOGRAPHY   = "typography"    # font-*, line-height, letter-spacing, text-*
    COLOUR       = "colour"        # color, border-color, stroke
    VISUAL       = "visual"        # border-radius, border-width, border-style, box-shadow, opacity
    MEDIA        = "media"         # object-fit, object-position
    MOTION       = "motion"        # transition-duration, transition-delay, transition-timing-function
    CONTENT_BAND = "content_band"  # L2-specific: contentWidth + contentBandPadding*


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class Block:
    """One row in the coverage matrix."""
    slug: str
    container_kind: str          # 'section' | 'layout' | 'content' | None (for sgs/container, sgs/media)
    has_inner_blocks: bool
    is_extra: bool = False       # True for sgs/container + sgs/media (added explicitly per Spec 31 §5)
    attr_names: list[str] = field(default_factory=list)  # block_attribute names for this block


@dataclass
class CapabilityColumn:
    """One column definition in the coverage matrix.

    A column = (capability_family, layer, tier).
    child_shape is recorded at the block (row) level from has_inner_blocks.
    """
    capability_family: str   # CapabilityFamily constant
    layer: str               # Layer constant
    tier: Optional[str]      # 'Desktop' | 'Tablet' | 'Mobile' | None (base / non-responsive)
    css_properties: list[str] = field(default_factory=list)   # CSS properties that feed this column


@dataclass
class MatrixCell:
    """One cell: (block_slug, column_id) → state."""
    block_slug: str
    column_id: str           # stable identifier string for the column
    layer: str
    capability_family: str
    tier: Optional[str]
    state: str               # CellState constant
    reason: str              # plain-English explanation of the state classification


@dataclass
class CoverageMatrix:
    """The full generated matrix."""
    blocks: list[Block]
    columns: list[CapabilityColumn]
    cells: list[MatrixCell]

    def summary(self) -> dict[str, int]:
        """Return per-state counts."""
        counts: dict[str, int] = {}
        for cell in self.cells:
            counts[cell.state] = counts.get(cell.state, 0) + 1
        return counts

    def summary_by_kind(self) -> dict[str, dict[str, int]]:
        """Return per-state counts broken down by block KIND."""
        by_kind: dict[str, dict[str, int]] = {}
        block_kind = {b.slug: (b.container_kind or "base") for b in self.blocks}
        for cell in self.cells:
            kind = block_kind.get(cell.block_slug, "unknown")
            by_kind.setdefault(kind, {})
            by_kind[kind][cell.state] = by_kind[kind].get(cell.state, 0) + 1
        return by_kind

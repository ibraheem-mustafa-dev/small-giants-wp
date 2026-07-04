"""db_queries.py — all DB reads for the coverage-matrix module.

Spec ref: .claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §4 + §5

Every list is derived from the DB — nothing is hardcoded (MF-7).
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Make sibling modules importable by bare name regardless of how this file is
# loaded (direct run, entrypoint importlib, or pytest importlib from scripts/).
sys.path.insert(0, str(Path(__file__).resolve().parent))
# scripts/ root — so `converter.services.has_inner` resolves regardless of cwd.
_SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from models import (
    Block,
    CapabilityColumn,
    CapabilityFamily,
    Layer,
    Kind,
)

# ---------------------------------------------------------------------------
# DB path (mirrors the F6 db-consistency module convention)
# ---------------------------------------------------------------------------
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


# ---------------------------------------------------------------------------
# Layer → capability_family mapping
# ---------------------------------------------------------------------------

# Which capability families apply per layer (Spec 31 §2 Axis 2)?
#
# L1 OUTER: box layout + align + background (section only) + colour + visual + grid (layout/section only)
# L2 CONTENT: content_band only
# L3 GRID: grid only
# L4 GRID_AREA: blocked (MF-5 — no converter call-site yet)
#
# These rules are applied per-KIND later in _kind_allows_layer().

_LAYER_FAMILIES: dict[str, list[str]] = {
    Layer.L1_OUTER: [
        CapabilityFamily.BOX_LAYOUT,
        CapabilityFamily.ALIGN,
        CapabilityFamily.BACKGROUND,   # gated: section + layout only
        CapabilityFamily.COLOUR,
        CapabilityFamily.VISUAL,
        CapabilityFamily.TYPOGRAPHY,
    ],
    Layer.L2_CONTENT: [
        CapabilityFamily.CONTENT_BAND,
    ],
    Layer.L3_GRID: [
        CapabilityFamily.GRID,
    ],
    Layer.L4_GRID_AREA: [
        # MF-5: L4 attr_for_area_property has no converter call-site — all BLOCKED
        # We still enumerate the family so the matrix can show BLOCKED cells.
        CapabilityFamily.CONTENT_BAND,  # per-area content*, media*
    ],
}


def _kind_allows_layer(kind: str, layer: str) -> bool:
    """
    Spec 31 §2 Axis 2 — KIND gates which layers exist as a destination.

    section : all layers (L1–L4) + background/overlay/SVG/shape
    layout  : L1–L4 width+grid, no background layer
    content : L1+L2 width+padding only, no grid, no background
    """
    if layer == Layer.L1_OUTER:
        return True                           # every KIND has an outer box
    if layer == Layer.L2_CONTENT:
        return True                           # every KIND has a content-width band
    if layer == Layer.L3_GRID:
        # grid only for section + layout; content = "no grid"
        return kind in (Kind.SECTION, Kind.LAYOUT)
    if layer == Layer.L4_GRID_AREA:
        # per-area attrs exist only for section (mixed = hero/cta-section)
        return kind == Kind.SECTION
    return False


def _family_allowed_for_kind_and_layer(family: str, kind: str, layer: str) -> bool:
    """Return False when KIND excludes a family at a given layer."""
    if family == CapabilityFamily.BACKGROUND:
        # Background layer only for section KIND (Spec 31 §2 Axis 2)
        return kind == Kind.SECTION
    return True


# ---------------------------------------------------------------------------
# CSS property → capability_family mapping
# (derived from property_suffixes.role groupings — see DB query output)
# ---------------------------------------------------------------------------

_ROLE_TO_FAMILY: dict[str, str] = {
    "layout":           CapabilityFamily.BOX_LAYOUT,    # overridden per-property below
    "color":            CapabilityFamily.COLOUR,
    "colour-text":      CapabilityFamily.COLOUR,
    "colour-gradient":  CapabilityFamily.BACKGROUND,
    "typography":       CapabilityFamily.TYPOGRAPHY,
    "visual":           CapabilityFamily.VISUAL,
    "motion":           CapabilityFamily.MOTION,
    "spacing-token":    CapabilityFamily.BOX_LAYOUT,
    "number-css-px":    CapabilityFamily.BOX_LAYOUT,
    "number-css-percent": CapabilityFamily.BOX_LAYOUT,
    "select-from-enum": CapabilityFamily.VISUAL,
}

# Fine-grained overrides for layout-role properties that belong to grid or align
_GRID_PROPERTIES = frozenset([
    "display", "grid-template-columns", "gap", "row-gap", "column-gap",
    "flex-direction", "flex-wrap",
])
_ALIGN_PROPERTIES = frozenset([
    "align-items", "align-content", "justify-content", "justify-items",
])


def _css_property_to_family(css_property: str, role: str) -> str:
    if css_property in _GRID_PROPERTIES:
        return CapabilityFamily.GRID
    if css_property in _ALIGN_PROPERTIES:
        return CapabilityFamily.ALIGN
    if css_property in ("object-fit", "object-position"):
        return CapabilityFamily.MEDIA
    return _ROLE_TO_FAMILY.get(role, CapabilityFamily.BOX_LAYOUT)


# ---------------------------------------------------------------------------
# Public DB query functions
# ---------------------------------------------------------------------------

def fetch_blocks(conn: sqlite3.Connection) -> list[Block]:
    """
    Enumerate every container-bearing block from the DB (Spec 31 §5 ROWS).

    Sources (per spec):
      • block_composition WHERE container_kind IS NOT NULL  (~31 blocks)
      • + sgs/container   (added explicitly — the canonical wrapper-shell)
      • + sgs/media       (added explicitly — the scalar-media leaf)

    Never hardcodes the roster — the count is derived every run.
    """
    # --- Base roster: block_composition with container_kind populated ---
    # has_inner_blocks (the CACHED column) was dropped at EXECUTION Step 16
    # (2026-07-05, FR-31-2.6) — it is now derived FRESH per block from the
    # block's own save.js/render.php source via
    # converter.services.has_inner.derive_delegates_content, never a stale
    # cached column (Spec 31 §12.7 Stage-2 row).
    from converter.services.has_inner import derive_delegates_content

    cursor = conn.execute(
        """
        SELECT bc.block_slug, bc.container_kind
        FROM block_composition bc
        WHERE bc.container_kind IS NOT NULL
        ORDER BY bc.block_slug
        """
    )
    rows = cursor.fetchall()

    blocks: list[Block] = []
    slugs_seen: set[str] = set()

    for row in rows:
        slug, kind = row
        slugs_seen.add(slug)
        attrs = _fetch_attr_names(conn, slug)
        blocks.append(Block(
            slug=slug,
            container_kind=kind,
            has_inner_blocks=bool(derive_delegates_content(slug)),
            is_extra=False,
            attr_names=attrs,
        ))

    # --- Extra entries: sgs/container + sgs/media ---
    # sgs/container: wrapper-shell; container_kind is NULL in the DB because it IS
    # the universal wrapper.  We add it with kind='section' for completeness since
    # it supports all layers.
    # sgs/media: leaf image block; added per Spec 31 §5 (the spec names it explicitly).
    extras = [
        ("sgs/container", "section", True),
        ("sgs/media",     "content", False),
    ]
    for slug, kind, ihb in extras:
        if slug not in slugs_seen:
            attrs = _fetch_attr_names(conn, slug)
            blocks.append(Block(
                slug=slug,
                container_kind=kind,
                has_inner_blocks=ihb,
                is_extra=True,
                attr_names=attrs,
            ))

    return blocks


def _fetch_attr_names(conn: sqlite3.Connection, block_slug: str) -> list[str]:
    """Fetch all attr_name values for a block from block_attributes."""
    cursor = conn.execute(
        "SELECT attr_name FROM block_attributes WHERE block_slug = ? ORDER BY attr_name",
        (block_slug,),
    )
    return [row[0] for row in cursor.fetchall()]


def fetch_columns(conn: sqlite3.Connection) -> list[CapabilityColumn]:
    """
    Enumerate capability × layer × tier columns from the DB (Spec 31 §5 COLUMNS).

    Sources:
      • property_suffixes  — which css_properties are known liftable
      • modifier_suffixes WHERE kind='breakpoint'  — the tier suffixes (Mobile/Tablet/Desktop)
    """
    # --- Breakpoint tiers from modifier_suffixes ---
    cursor = conn.execute(
        "SELECT suffix FROM modifier_suffixes WHERE kind = 'breakpoint' ORDER BY suffix"
    )
    tiers: list[str] = [row[0] for row in cursor.fetchall()]
    # We also have a "base" tier (no suffix — the default desktop value)
    tiers_with_base: list[Optional[str]] = [None] + tiers  # type: ignore[list-item]

    # --- CSS properties from property_suffixes (with a real css_property) ---
    cursor = conn.execute(
        """
        SELECT DISTINCT css_property, role
        FROM property_suffixes
        WHERE css_property IS NOT NULL
        ORDER BY css_property
        """
    )
    prop_role_pairs = cursor.fetchall()

    # Build a (family, layer) → [css_properties] mapping first
    # Then cross with tiers to produce columns.
    # Each (family, layer) pair → one column definition per tier.

    # Determine which (family, layer) pairs exist
    family_layer_props: dict[tuple[str, str], list[str]] = {}

    for css_property, role in prop_role_pairs:
        family = _css_property_to_family(css_property, role)

        # Assign the layer this property belongs to:
        # Layout/box/colour/visual/typography/media → L1 OUTER (they style the wrapper)
        # Grid/align → L3 GRID
        # Content-band → L2 CONTENT
        if family in (CapabilityFamily.GRID, CapabilityFamily.ALIGN):
            layer = Layer.L3_GRID
        elif family == CapabilityFamily.CONTENT_BAND:
            layer = Layer.L2_CONTENT
        else:
            layer = Layer.L1_OUTER

        key = (family, layer)
        family_layer_props.setdefault(key, [])
        if css_property not in family_layer_props[key]:
            family_layer_props[key].append(css_property)

    # Add content_band explicitly for L2 (covers contentWidth + contentBandPadding*)
    # These don't have a css_property in property_suffixes (they're structural attrs)
    # but they ARE a real capability column the matrix must track.
    l2_key = (CapabilityFamily.CONTENT_BAND, Layer.L2_CONTENT)
    if l2_key not in family_layer_props:
        family_layer_props[l2_key] = ["max-width (L2 band)", "padding (L2 band)"]

    # Add L4 GRID_AREA (BLOCKED — MF-5) so it appears in the matrix
    l4_key = (CapabilityFamily.CONTENT_BAND, Layer.L4_GRID_AREA)
    family_layer_props[l4_key] = ["per-area css (L4, BLOCKED: MF-5)"]

    # --- Cross (family, layer) × tier to produce columns ---
    columns: list[CapabilityColumn] = []
    seen_ids: set[str] = set()

    for (family, layer), props in sorted(family_layer_props.items()):
        for tier in tiers_with_base:
            col_id = _column_id(family, layer, tier)
            if col_id in seen_ids:
                continue
            seen_ids.add(col_id)
            columns.append(CapabilityColumn(
                capability_family=family,
                layer=layer,
                tier=tier,
                css_properties=props,
            ))

    return columns


def _column_id(family: str, layer: str, tier: Optional[str]) -> str:  # type: ignore[name-defined]
    """Stable string identifier for a column."""
    tier_part = tier if tier else "base"
    return f"{family}::{layer}::{tier_part}"


def fetch_breakpoint_tiers(conn: sqlite3.Connection) -> list[str]:
    """Return the breakpoint tier suffixes from modifier_suffixes."""
    cursor = conn.execute(
        "SELECT suffix FROM modifier_suffixes WHERE kind = 'breakpoint' ORDER BY suffix"
    )
    return [row[0] for row in cursor.fetchall()]

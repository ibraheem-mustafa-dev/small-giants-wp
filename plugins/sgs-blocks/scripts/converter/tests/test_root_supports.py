"""test_root_supports.py — unit tests for converter.services.root_supports.

Tests prove:
  1. padding-top: 60px  → attrs["style"]["spacing"]["padding"]["top"] == "60px"
  2. background-color: #FF5733 → attrs["style"]["color"]["background"] == "#FF5733"
  3. border-radius: 12px → attrs["style"]["border"]["radius"] == "12px"
  4. Responsive: paddingTopTablet lands when @media rule is present
  5. A block that does NOT support padding → padding NOT in output (supports gate)
  6. Gradient background → dropped (no style.color.gradient in output, gap logged)

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_root_supports.py -q --import-mode=importlib

Port source: convert.py:514-547 + 774-956 (_root_lift_rules + _lift_root_supports_to_style).
"""
from __future__ import annotations

import sqlite3
from unittest.mock import patch, MagicMock

import pytest
from bs4 import BeautifulSoup

from converter.orchestrator import ConservationError
from converter.services.root_supports import (
    _write_responsive_attr,
    lift_root_supports_to_style,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _node(html: str):
    """Return a BeautifulSoup Tag from a minimal HTML fragment."""
    return BeautifulSoup(html, "html.parser").find(True)


def _css(selector: str, props: dict[str, str]) -> dict:
    """Build a minimal css_rules dict: {selector: {prop: val}}."""
    return {selector: props}


# ---------------------------------------------------------------------------
# Fake DB connection helpers
# ---------------------------------------------------------------------------
# These tests mock db_lookup.block_supports_for and db_lookup.block_attrs so
# the real sgs-framework.db is not required, making the suite fully portable.

def _patch_supports(supports_dict: dict, block_attrs_dict: dict | None = None):
    """Return a context manager that patches block_supports_for and block_attrs."""
    import converter.services.root_supports as _mod
    return (
        patch.object(_mod.db_lookup, "block_supports_for", return_value=supports_dict),
        patch.object(_mod.db_lookup, "block_attrs", return_value=block_attrs_dict or {}),
        patch.object(_mod.db_lookup, "breakpoint_suffix_rules", return_value=[
            ("max-width: 767", ["Mobile"]),
            ("max-width: 1023", ["Tablet"]),
            ("min-width: 1024", ["Desktop"]),
        ]),
    )


# Supports dicts that mirror real sgs/container block_supports rows.
_FULL_SUPPORTS = {
    "spacing":               {"padding": True, "margin": True, "blockGap": True},
    "color":                 {"background": True, "text": True},
    "__experimentalBorder":  {"radius": True, "width": True, "style": True, "color": True},
}

# A minimal block that supports nothing (e.g. a leaf text block).
_NO_SUPPORTS: dict = {}


# ---------------------------------------------------------------------------
# Test 1 — padding-top: 60px → style.spacing.padding.top
# ---------------------------------------------------------------------------

def test_padding_top_lifts_to_style():
    """padding-top on a container node must land in style.spacing.padding.top."""
    node = _node('<div class="sgs-container"></div>')
    css_rules = {".sgs-container": {"padding-top": "60px"}}
    conn = MagicMock(spec=sqlite3.Connection)

    sp, sa, sb = _patch_supports(_FULL_SUPPORTS)
    with sp, sa, sb:
        attrs, _consumed = lift_root_supports_to_style(node, "sgs/container", css_rules, conn)

    assert "style" in attrs, f"Expected 'style' key in attrs, got: {attrs}"
    padding = attrs["style"].get("spacing", {}).get("padding", {})
    assert padding.get("top") == "60px", (
        f"Expected style.spacing.padding.top == '60px', got padding={padding}"
    )


# ---------------------------------------------------------------------------
# Test 2 — background-color: #FF5733 → style.color.background
# ---------------------------------------------------------------------------

def test_background_color_lifts_to_style():
    """background-color on a container node must land in style.color.background."""
    node = _node('<div class="sgs-container"></div>')
    css_rules = {".sgs-container": {"background-color": "#FF5733"}}
    conn = MagicMock(spec=sqlite3.Connection)

    sp, sa, sb = _patch_supports(_FULL_SUPPORTS)
    with sp, sa, sb:
        attrs, _consumed = lift_root_supports_to_style(node, "sgs/container", css_rules, conn)

    assert "style" in attrs, f"Expected 'style' key in attrs, got: {attrs}"
    colour = attrs["style"].get("color", {}).get("background")
    assert colour == "#FF5733", (
        f"Expected style.color.background == '#FF5733', got: {colour}"
    )


# ---------------------------------------------------------------------------
# Test 3 — border-radius: 12px → style.border.radius
# ---------------------------------------------------------------------------

def test_border_radius_lifts_to_style():
    """border-radius on a container node must land in style.border.radius."""
    node = _node('<div class="sgs-container"></div>')
    css_rules = {".sgs-container": {"border-radius": "12px"}}
    conn = MagicMock(spec=sqlite3.Connection)

    sp, sa, sb = _patch_supports(_FULL_SUPPORTS)
    with sp, sa, sb:
        attrs, _consumed = lift_root_supports_to_style(node, "sgs/container", css_rules, conn)

    assert "style" in attrs, f"Expected 'style' key in attrs, got: {attrs}"
    radius = attrs["style"].get("border", {}).get("radius")
    assert radius == "12px", (
        f"Expected style.border.radius == '12px', got: {radius}"
    )


# ---------------------------------------------------------------------------
# Test 4 — responsive: paddingTopTablet lands for @media rule
# ---------------------------------------------------------------------------

def test_responsive_padding_top_tablet():
    """A @media (max-width: 1023px) padding-top rule must emit paddingTopTablet
    when the block schema declares that attr."""
    node = _node('<div class="sgs-container"></div>')
    # collect_css_decls_for_element recognises the @media sentinel '::' notation.
    css_rules = {
        # Non-media base rule (no tablet padding here)
        ".sgs-container": {"margin": "0"},
        # Tablet @media rule encoded with the internal ' :: ' sentinel.
        "max-width: 1023 :: .sgs-container": {"padding-top": "40px"},
    }
    conn = MagicMock(spec=sqlite3.Connection)

    # Block schema must include paddingTopTablet for the lift to emit it.
    block_schema_with_tablet = {
        "paddingTopTablet": {"attr_type": "string", "role": "layout",
                             "canonical_slot": None, "derived_selector": None},
    }
    sp, sa, sb = _patch_supports(_FULL_SUPPORTS, block_schema_with_tablet)
    with sp, sa, sb:
        attrs, _consumed = lift_root_supports_to_style(node, "sgs/container", css_rules, conn)

    assert "paddingTopTablet" in attrs, (
        f"Expected paddingTopTablet in attrs, got keys: {list(attrs.keys())}"
    )
    assert attrs["paddingTopTablet"] == "40px", (
        f"Expected paddingTopTablet == '40px', got: {attrs.get('paddingTopTablet')}"
    )


# ---------------------------------------------------------------------------
# Test 5 — block with no padding support → padding NOT in output
# ---------------------------------------------------------------------------

def test_no_supports_means_no_lift():
    """A block with empty supports must produce no style attrs — the supports
    gate (db_lookup.block_supports_for returns {}) causes an early return {}."""
    node = _node('<div class="sgs-heading"></div>')
    css_rules = {".sgs-heading": {"padding-top": "20px", "background-color": "#fff"}}
    conn = MagicMock(spec=sqlite3.Connection)

    sp, sa, sb = _patch_supports(_NO_SUPPORTS)
    with sp, sa, sb:
        attrs, consumed = lift_root_supports_to_style(node, "sgs/heading", css_rules, conn)

    assert attrs == {}, (
        f"Block with empty supports must produce no attrs, got: {attrs}"
    )
    assert consumed == {}, (
        f"Block with empty supports must report no consumed properties, got: {consumed}"
    )


def test_block_without_padding_support_drops_padding():
    """A block that has color support but NOT spacing must NOT emit padding."""
    node = _node('<div class="sgs-label"></div>')
    css_rules = {".sgs-label": {"padding-top": "8px", "color": "#333"}}
    conn = MagicMock(spec=sqlite3.Connection)

    color_only_supports = {
        "color": {"background": True, "text": True},
        # No "spacing" key — padding must be suppressed.
    }
    sp, sa, sb = _patch_supports(color_only_supports)
    with sp, sa, sb:
        attrs, _consumed = lift_root_supports_to_style(node, "sgs/label", css_rules, conn)

    # padding-top must NOT appear anywhere in the output.
    if "style" in attrs:
        spacing = attrs["style"].get("spacing", {})
        assert "padding" not in spacing, (
            f"padding must be suppressed for a block without spacing support, "
            f"got spacing={spacing}"
        )
    # text color IS supported → may appear.
    # The important assertion is the padding absence above.


# ---------------------------------------------------------------------------
# Test 6 — gradient background → dropped, no style.color.gradient emitted
# ---------------------------------------------------------------------------

def test_gradient_background_is_dropped():
    """A CSS linear-gradient background must be silently dropped (gap-noted via
    logging) with NO style.color.gradient key in the output.

    Rationale (convert.py:825-844): WP's gradient slot requires a preset-slug
    lookup that is not available at clone time. The drop is intentional until a
    gradient resolver is wired in.
    """
    node = _node('<div class="sgs-hero"></div>')
    css_rules = {
        ".sgs-hero": {
            "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }
    }
    conn = MagicMock(spec=sqlite3.Connection)

    sp, sa, sb = _patch_supports(_FULL_SUPPORTS)
    with sp, sa, sb:
        attrs, _consumed = lift_root_supports_to_style(node, "sgs/hero", css_rules, conn)

    # Must NOT have style.color.gradient.
    if "style" in attrs:
        colour = attrs["style"].get("color", {})
        assert "gradient" not in colour, (
            f"Gradient must be dropped (no destination), got color={colour}"
        )
        assert "background" not in colour, (
            f"Gradient must not be mis-converted to background, got color={colour}"
        )


# ---------------------------------------------------------------------------
# Test — L3 gap-gate bug (QC #1 container gaps, 2026-07-06)
# ---------------------------------------------------------------------------
# The REAL sgs/container declares spacing supports {"padding": True, "margin": True}
# — NO "blockGap". So a draft `gap` must NOT be consumed by the native-supports lift
# into style.spacing.blockGap (a dead leaf the wrapper never reads); it must fall
# THROUGH to the grid resolver's `gap` string attr (L3). The bug: root_supports'
# gate `_support_allows(supports, sup_top, sup_sub if sup_sub != style_path[-1] else
# None)` collapses to None for the gap rule (sup_sub=='blockGap'==style_path[-1]),
# so it checks "any spacing feature" — padding/margin being True wrongly passes it.

# Mirrors the REAL sgs/container block_supports row (NO blockGap).
_CONTAINER_SUPPORTS_NO_BLOCKGAP = {
    "spacing": {"padding": True, "margin": True},
    "color": {"background": True, "text": True},
    "__experimentalBorder": {"radius": True, "width": True},
}


def test_gap_not_consumed_without_blockgap_support():
    """A block that supports spacing.padding/margin but NOT spacing.blockGap must
    NOT consume `gap` into style.spacing.blockGap — gap must fall through to the
    grid resolver's `gap` attr (L3). This is the QC #1 container-gap root cause."""
    node = _node('<div class="sgs-container"></div>')
    css_rules = {".sgs-container": {"gap": "16px"}}
    conn = MagicMock(spec=sqlite3.Connection)

    sp, sa, sb = _patch_supports(_CONTAINER_SUPPORTS_NO_BLOCKGAP)
    with sp, sa, sb:
        attrs, consumed = lift_root_supports_to_style(node, "sgs/container", css_rules, conn)

    base_consumed = consumed.get("Base", frozenset())
    assert "gap" not in base_consumed, (
        f"gap wrongly consumed by root_supports without blockGap support — it will "
        f"never reach the grid resolver's `gap` attr. consumed={consumed}"
    )
    spacing = attrs.get("style", {}).get("spacing", {})
    assert "blockGap" not in spacing, (
        f"gap wrongly written to a dead style.spacing.blockGap leaf (block has no "
        f"blockGap support; wrapper reads `gap`). spacing={spacing}"
    )


def test_gap_consumed_when_blockgap_supported():
    """Guard the legitimate native path: a block that DOES support spacing.blockGap
    consumes gap into style.spacing.blockGap. The fix must not break this."""
    node = _node('<div class="sgs-container"></div>')
    css_rules = {".sgs-container": {"gap": "16px"}}
    conn = MagicMock(spec=sqlite3.Connection)

    sp, sa, sb = _patch_supports(_FULL_SUPPORTS)  # includes blockGap: True
    with sp, sa, sb:
        attrs, consumed = lift_root_supports_to_style(node, "sgs/container", css_rules, conn)

    assert attrs.get("style", {}).get("spacing", {}).get("blockGap") == "16px", (
        f"gap must lift to style.spacing.blockGap when the block supports blockGap — "
        f"style={attrs.get('style')}"
    )


# ---------------------------------------------------------------------------
# Test 7 — non-SGS slug → early return {}
# ---------------------------------------------------------------------------

def test_non_sgs_slug_returns_empty():
    """A slug that does not start with 'sgs/' must return {} immediately."""
    node = _node('<div class="wp-block-group"></div>')
    css_rules = {".wp-block-group": {"padding-top": "20px"}}
    conn = MagicMock(spec=sqlite3.Connection)

    attrs, consumed = lift_root_supports_to_style(node, "core/group", css_rules, conn)
    assert attrs == {}, f"Non-SGS slug must return {{}}, got: {attrs}"
    assert consumed == {}, f"Non-SGS slug must report no consumed properties, got: {consumed}"


# ---------------------------------------------------------------------------
# Test 8 — combined: padding-top + background-color together
# ---------------------------------------------------------------------------

def test_padding_and_background_combined():
    """Both padding-top and background-color on the same node must both land
    in the style dict (the worked example from the task spec)."""
    node = _node('<div class="sgs-container"></div>')
    css_rules = {
        ".sgs-container": {
            "padding-top": "60px",
            "background-color": "#FF5733",
        }
    }
    conn = MagicMock(spec=sqlite3.Connection)

    sp, sa, sb = _patch_supports(_FULL_SUPPORTS)
    with sp, sa, sb:
        attrs, consumed = lift_root_supports_to_style(node, "sgs/container", css_rules, conn)

    assert "style" in attrs, f"Expected 'style' in attrs, got: {attrs}"
    assert consumed.get("Base") == frozenset({"padding-top", "background-color"}), (
        f"Expected both padding-top and background-color consumed at Base, got: {consumed}"
    )
    assert attrs["style"].get("spacing", {}).get("padding", {}).get("top") == "60px", (
        f"padding.top missing — style={attrs['style']}"
    )
    assert attrs["style"].get("color", {}).get("background") == "#FF5733", (
        f"color.background missing — style={attrs['style']}"
    )


# ---------------------------------------------------------------------------
# FIX 1 regression — `_write_responsive_attr` box-object collision guard
# (council finding, box-object interface contract §3/§4, 2026-07-09).
# ---------------------------------------------------------------------------
# `_write_responsive_attr` mirrors the self-merge box-object semantics that
# `orchestrator._check_conservation` already enforces: two DIFFERENT values
# claiming the same side of the same merged object attr is a real collision
# and must raise, never silently overwrite (the pre-fix `box[side] = value`
# behaviour) nor silently keep-first (a bare `setdefault`).

def _fixed_box_family(monkeypatch, family_map: dict[str, str]):
    """Patch db_lookup.box_family_for used inside root_supports to a fixed map."""
    import converter.services.root_supports as _mod
    monkeypatch.setattr(
        _mod.db_lookup, "box_family_for",
        lambda slug, object_attr: family_map.get(object_attr),
    )


def test_write_responsive_attr_same_tier_same_side_different_value_raises(monkeypatch):
    """padding-top:24px AND padding-shorthand-derived top:5px for the SAME tier
    both targeting side='top' of paddingTablet with DIFFERENT values must raise
    ConservationError — the shared-key collision `_check_conservation` already
    hard-fails on the self-merge path."""
    _fixed_box_family(monkeypatch, {"paddingTablet": "padding"})
    result_attrs: dict = {}
    block_schema = {"paddingTablet": {}}

    _write_responsive_attr(
        result_attrs, block_schema, "sgs/container",
        ["padding", "top"], "Tablet", "24px", "paddingTop",
    )
    with pytest.raises(ConservationError, match="COLLISION"):
        _write_responsive_attr(
            result_attrs, block_schema, "sgs/container",
            ["padding", "top"], "Tablet", "5px", "paddingTop",
        )


def test_write_responsive_attr_same_tier_same_side_same_value_is_noop(monkeypatch):
    """Re-writing the SAME value for the same side is idempotent, not a collision."""
    _fixed_box_family(monkeypatch, {"paddingTablet": "padding"})
    result_attrs: dict = {}
    block_schema = {"paddingTablet": {}}

    _write_responsive_attr(
        result_attrs, block_schema, "sgs/container",
        ["padding", "top"], "Tablet", "24px", "paddingTop",
    )
    # Second call, same side + same value: must NOT raise.
    attr = _write_responsive_attr(
        result_attrs, block_schema, "sgs/container",
        ["padding", "top"], "Tablet", "24px", "paddingTop",
    )
    assert attr == "paddingTablet"
    assert result_attrs["paddingTablet"] == {"top": "24px"}


def test_write_responsive_attr_distinct_sides_accumulate(monkeypatch):
    """Distinct sides of the same object attr accumulate cleanly (unchanged
    legitimate merge behaviour)."""
    _fixed_box_family(monkeypatch, {"paddingTablet": "padding"})
    result_attrs: dict = {}
    block_schema = {"paddingTablet": {}}

    _write_responsive_attr(
        result_attrs, block_schema, "sgs/container",
        ["padding", "top"], "Tablet", "24px", "paddingTop",
    )
    _write_responsive_attr(
        result_attrs, block_schema, "sgs/container",
        ["padding", "right"], "Tablet", "16px", "paddingRight",
    )
    assert result_attrs["paddingTablet"] == {"top": "24px", "right": "16px"}

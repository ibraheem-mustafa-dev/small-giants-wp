"""test_uniform_grid_item_css_lift.py — Lock-in tests for FR-22-21 §step 4 /
SDD Task 1: uniform grid-item box CSS lift onto gridItem* attrs.

Two cases:

CASE 1 — UNIFORM: all N items share the same padding/border-radius/box-shadow.
  → gridItemPadding + gridItemBorderRadius + gridItemShadow MUST be set on
    the emitted sgs/container.

CASE 2 — NON-UNIFORM: one item has a different padding.
  → gridItemPadding must NOT be lifted (property is non-uniform).
  → gridItemBorderRadius CAN still be lifted if it is uniform across all items.

Both tests drive the REAL converter function ``_lift_uniform_grid_item_css``
directly (mirroring the pattern of test_per_slot_maxwidth_and_var_resolution.py).
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

_SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from bs4 import BeautifulSoup, Tag  # noqa: E402
from orchestrator.converter_v2 import convert  # noqa: E402
from orchestrator.converter_v2 import db_lookup as db  # noqa: E402


# ---------------------------------------------------------------------------
# Preconditions — confirm DB resolves the attrs we assert on
# ---------------------------------------------------------------------------

def test_precondition_grid_layer_resolves_griditem_padding():
    """DB must resolve gridItemPadding for sgs/container GRID+padding."""
    attr = db.attr_for_layer_property("sgs/container", "GRID", "padding")
    assert attr == "gridItemPadding", (
        f"PRECONDITION: attr_for_layer_property('sgs/container','GRID','padding') "
        f"returned {attr!r} — expected 'gridItemPadding'. The lift cannot fire "
        "without this DB mapping."
    )


def test_precondition_grid_layer_resolves_griditem_border_radius():
    """DB must resolve gridItemBorderRadius for sgs/container GRID+border-radius."""
    attr = db.attr_for_layer_property("sgs/container", "GRID", "border-radius")
    assert attr == "gridItemBorderRadius", (
        f"PRECONDITION: attr_for_layer_property('sgs/container','GRID','border-radius') "
        f"returned {attr!r} — expected 'gridItemBorderRadius'."
    )


def test_precondition_grid_layer_resolves_griditem_shadow():
    """DB must resolve gridItemShadow for sgs/container GRID+box-shadow."""
    attr = db.attr_for_layer_property("sgs/container", "GRID", "box-shadow")
    assert attr == "gridItemShadow", (
        f"PRECONDITION: attr_for_layer_property('sgs/container','GRID','box-shadow') "
        f"returned {attr!r} — expected 'gridItemShadow'."
    )


# ---------------------------------------------------------------------------
# CASE 1 — Uniform box CSS across all N items → lift to gridItem* attrs
# ---------------------------------------------------------------------------

def test_uniform_box_css_lifted_to_griditem_attrs():
    """3-card grid where all cards share padding/border-radius/box-shadow.

    Expected: gridItemPadding, gridItemBorderRadius, gridItemShadow set on
    container_attrs.  gridItemBackground should also be set if background-color
    is uniform.

    This is the canonical SDD Task 1 case: the converter must lift these attrs
    instead of silently dropping them.
    """
    html = (
        '<section class="sgs-cards">'
        '  <div class="sgs-card-grid__item">Card A</div>'
        '  <div class="sgs-card-grid__item">Card B</div>'
        '  <div class="sgs-card-grid__item">Card C</div>'
        '</section>'
    )
    soup = BeautifulSoup(html, "html.parser")
    section_node = soup.find("section")
    assert isinstance(section_node, Tag)

    css_rules = {
        ".sgs-card-grid__item": {
            "padding": "20px",
            "border-radius": "8px",
            "box-shadow": "0 2px 8px rgba(0,0,0,0.1)",
            "background-color": "#ffffff",
        },
    }

    container_attrs: dict = {}
    convert._lift_uniform_grid_item_css(section_node, css_rules, container_attrs)

    assert container_attrs.get("gridItemPadding") == "20px", (
        "CASE 1: uniform padding NOT lifted to gridItemPadding. "
        f"container_attrs={container_attrs!r}"
    )
    assert container_attrs.get("gridItemBorderRadius") == "8px", (
        "CASE 1: uniform border-radius NOT lifted to gridItemBorderRadius. "
        f"container_attrs={container_attrs!r}"
    )
    assert container_attrs.get("gridItemShadow") == "0 2px 8px rgba(0,0,0,0.1)", (
        "CASE 1: uniform box-shadow NOT lifted to gridItemShadow. "
        f"container_attrs={container_attrs!r}"
    )
    # gridItemBackground should also lift (background-color is uniform).
    assert container_attrs.get("gridItemBackground") == "#ffffff", (
        "CASE 1: uniform background-color NOT lifted to gridItemBackground. "
        f"container_attrs={container_attrs!r}"
    )


# ---------------------------------------------------------------------------
# CASE 2 — Non-uniform padding: one item differs → do NOT lift padding
# ---------------------------------------------------------------------------

def test_non_uniform_padding_not_lifted():
    """3-card grid where one card has padding:40px while the others have 20px.

    Expected: gridItemPadding must NOT be set (non-uniform value).
    Expected: gridItemBorderRadius CAN still be lifted (border-radius IS uniform).
    """
    html = (
        '<section class="sgs-cards">'
        '  <div class="sgs-card-grid__item sgs-card-grid__item--featured">Card A</div>'
        '  <div class="sgs-card-grid__item">Card B</div>'
        '  <div class="sgs-card-grid__item">Card C</div>'
        '</section>'
    )
    soup = BeautifulSoup(html, "html.parser")
    section_node = soup.find("section")
    assert isinstance(section_node, Tag)

    css_rules = {
        ".sgs-card-grid__item": {
            "padding": "20px",
            "border-radius": "8px",
        },
        ".sgs-card-grid__item--featured": {
            "padding": "40px",  # differs from the others → non-uniform
        },
    }

    container_attrs: dict = {}
    convert._lift_uniform_grid_item_css(section_node, css_rules, container_attrs)

    assert "gridItemPadding" not in container_attrs, (
        "CASE 2: non-uniform padding was incorrectly lifted to gridItemPadding. "
        f"container_attrs={container_attrs!r}"
    )
    # border-radius IS uniform (same for all items via the base rule).
    assert container_attrs.get("gridItemBorderRadius") == "8px", (
        "CASE 2: uniform border-radius NOT lifted despite being uniform across all items. "
        f"container_attrs={container_attrs!r}"
    )


# ---------------------------------------------------------------------------
# EDGE CASE — single child → no lift (nothing to compare for uniformity)
# ---------------------------------------------------------------------------

def test_single_child_no_lift():
    """A section with exactly 1 direct element child must NOT trigger the lift.

    The lift requires N≥2 to have anything to compare (uniformity of 1 is trivial
    and would incorrectly mark single-block sections' CSS as 'uniform grid-item'
    CSS, which it isn't).
    """
    html = (
        '<section class="sgs-hero">'
        '  <div class="sgs-hero__content">Hello</div>'
        '</section>'
    )
    soup = BeautifulSoup(html, "html.parser")
    section_node = soup.find("section")
    assert isinstance(section_node, Tag)

    css_rules = {
        ".sgs-hero__content": {
            "padding": "40px",
            "border-radius": "4px",
        },
    }

    container_attrs: dict = {}
    convert._lift_uniform_grid_item_css(section_node, css_rules, container_attrs)

    assert "gridItemPadding" not in container_attrs, (
        "EDGE: single-child section incorrectly triggered gridItemPadding lift. "
        f"container_attrs={container_attrs!r}"
    )
    assert "gridItemBorderRadius" not in container_attrs, (
        "EDGE: single-child section incorrectly triggered gridItemBorderRadius lift. "
        f"container_attrs={container_attrs!r}"
    )


# ---------------------------------------------------------------------------
# SETDEFAULT — existing attr is not overwritten
# ---------------------------------------------------------------------------

def test_setdefault_does_not_overwrite_existing_attr():
    """If gridItemPadding is already set (by an earlier path), the lift must not
    overwrite it (setdefault semantics — earlier paths win)."""
    html = (
        '<section class="sgs-cards">'
        '  <div class="sgs-card-grid__item">A</div>'
        '  <div class="sgs-card-grid__item">B</div>'
        '</section>'
    )
    soup = BeautifulSoup(html, "html.parser")
    section_node = soup.find("section")

    css_rules = {
        ".sgs-card-grid__item": {"padding": "20px"},
    }

    container_attrs: dict = {"gridItemPadding": "EARLIER_VALUE"}
    convert._lift_uniform_grid_item_css(section_node, css_rules, container_attrs)

    assert container_attrs["gridItemPadding"] == "EARLIER_VALUE", (
        "SETDEFAULT: _lift_uniform_grid_item_css overwrote an existing gridItemPadding. "
        f"container_attrs={container_attrs!r}"
    )


# ---------------------------------------------------------------------------
# NESTED GRID — universality (R-22-9 / FR-22-21 "at every nesting depth")
# ---------------------------------------------------------------------------

def test_nested_wrapper_grid_gets_griditem_lift():
    """A NESTED slug-None grid wrapper (NOT a top-level section) must ALSO get the
    uniform grid-item lift — proving the lift is not a top-level-only carve-out.

    Drives the REAL `_emit_wrapper_container` — the actual emit site for a nested
    slug-None sgs-classed wrapper (convert.py path: `slug is None and not is_top_level`).
    The `.sgs-products` grid sits under a `__inner` shell (the FR-22-4.1 featured-
    product worked example); its three product cards share uniform box CSS.

    If the nested wiring is reverted, gridItem* attrs never appear in the emitted
    nested sgs/container and these assertions fail.
    """
    html = (
        '<div class="sgs-products">'
        '  <div class="sgs-products__item">Product A</div>'
        '  <div class="sgs-products__item">Product B</div>'
        '  <div class="sgs-products__item">Product C</div>'
        '</div>'
    )
    soup = BeautifulSoup(html, "html.parser")
    node = soup.find("div", class_="sgs-products")
    assert isinstance(node, Tag)

    css_rules = {
        ".sgs-products": {
            "display": "grid",
            "grid-template-columns": "repeat(3, 1fr)",
            "gap": "24px",
        },
        ".sgs-products__item": {
            "padding": "16px",
            "border-radius": "12px",
            "box-shadow": "0 1px 4px rgba(0,0,0,0.08)",
        },
    }
    classes = node.get("class", []) or []
    sgs_classes = [c for c in classes if c.startswith("sgs-")]

    out = convert._emit_wrapper_container(
        node=node,
        classes=classes,
        sgs_classes=sgs_classes,
        css_rules=css_rules,
        depth=1,
        variation_buf=[],
        parent_block=None,
    )

    # The emitted nested sgs/container must carry the lifted gridItem* attrs.
    assert '"gridItemPadding":"16px"' in out, (
        "NESTED: uniform padding NOT lifted to gridItemPadding in the nested "
        f"wrapper container emit. Got:\n{out}"
    )
    assert '"gridItemBorderRadius":"12px"' in out, (
        "NESTED: uniform border-radius NOT lifted to gridItemBorderRadius in the "
        f"nested wrapper container emit. Got:\n{out}"
    )
    assert '"gridItemShadow":"0 1px 4px rgba(0,0,0,0.08)"' in out, (
        "NESTED: uniform box-shadow NOT lifted to gridItemShadow in the nested "
        f"wrapper container emit. Got:\n{out}"
    )

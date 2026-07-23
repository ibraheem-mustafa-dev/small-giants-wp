"""test_border_side.py — per-side border-width longhand → merged borderWidth object.

Proves the FR-31-22 box-object accumulator carries a draft's per-side border
longhands (border-{top,right,bottom,left}-width) into the block's SGS-custom
`borderWidth` object attr {top,right,bottom,left}, closing the NO_DESTINATION gap
those longhands previously fell into (they have property_suffixes rows —
BorderTopWidth… — routing to a per-side attr NO block declares).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_border_side.py

Uses the REAL framework DB (sgs/text declares borderWidth as attr_type='object',
box_family='borderWidth', base-only). Covers BOTH resolver routes (CONTENT leaf →
content_band; OUTER → outer_box) since the border self-merge is duplicated in both
(ONE mechanism, R-31-9) and the shared helper must fire from either.
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.models import GapOrigin
from converter.orchestrator import process_element
from converter.services.border_side import border_side_write
from converter.db.db_lookup import SGS_DB


def _ctx(conn: sqlite3.Connection, *, block_slug: str = "sgs/text",
         base_layer: str = "CONTENT") -> Ctx:
    return Ctx(
        block_slug=block_slug,
        container_kind="content",
        delegates_content=0,
        variant_value=None,
        variant_attr=None,
        node=None,
        is_root=False,
        base_layer=base_layer,
        conn=conn,
    )


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


# ---------------------------------------------------------------------------
# The slice proof: border-bottom-width:3px → borderWidth={bottom:'3px'}
# ---------------------------------------------------------------------------

def test_border_bottom_width_lands_on_borderWidth_bottom_side(conn):
    """A single per-side longhand accumulates ONE side into the object attr."""
    result = process_element(_ctx(conn), [Decl("border-bottom-width", "3px", "Base")])
    assert result.attrs().get("borderWidth") == {"bottom": "3px"}
    # No leaked declaration (conservation): the decl produced a routed Write.
    assert result.decl_results == result.decl_count


def test_four_sides_accumulate_into_one_object(conn):
    """4 separate side longhands merge (per-key, first-write-wins) into ONE object."""
    decls = [
        Decl("border-top-width", "1px", "Base"),
        Decl("border-right-width", "2px", "Base"),
        Decl("border-bottom-width", "3px", "Base"),
        Decl("border-left-width", "4px", "Base"),
    ]
    result = process_element(_ctx(conn), decls)
    assert result.attrs().get("borderWidth") == {
        "top": "1px", "right": "2px", "bottom": "3px", "left": "4px",
    }
    assert result.decl_results == result.decl_count
    assert not result.gaps  # every side transferred, none gapped


def test_border_side_routes_via_outer_box_too(conn):
    """Same result when the node's base layer is OUTER (outer_box path)."""
    result = process_element(
        _ctx(conn, base_layer="OUTER"),
        [Decl("border-bottom-width", "3px", "Base")],
    )
    assert result.attrs().get("borderWidth") == {"bottom": "3px"}


def test_helper_returns_write_for_border_carrying_block(conn):
    """Direct helper unit: returns a partial-side Write for a borderWidth block."""
    w = border_side_write(Decl("border-left-width", "5px", "Base"), _ctx(conn))
    assert w is not None
    assert w.attr == "borderWidth"
    assert w.value == {"left": "5px"}


def test_important_is_stripped(conn):
    """`!important` is stripped from the stored side value."""
    w = border_side_write(Decl("border-top-width", "2px !important", "Base"), _ctx(conn))
    assert w is not None and w.value == {"top": "2px"}


# ---------------------------------------------------------------------------
# Negative controls — the helper must NOT fire where it should not
# ---------------------------------------------------------------------------

def test_block_without_borderWidth_family_falls_through(conn):
    """A block with no borderWidth box-object family (sgs/container) → helper None,
    the decl gaps honestly through the ordinary chain (never a phantom object)."""
    w = border_side_write(
        Decl("border-bottom-width", "3px", "Base"),
        _ctx(conn, block_slug="sgs/container", base_layer="OUTER"),
    )
    assert w is None
    result = process_element(
        _ctx(conn, block_slug="sgs/container", base_layer="OUTER"),
        [Decl("border-bottom-width", "3px", "Base")],
    )
    assert "borderWidth" not in result.attrs()
    assert result.gaps and result.gaps[0].origin is GapOrigin.NO_DESTINATION


def test_tablet_per_side_is_base_only_gap(conn):
    """borderWidth is base-only (no borderWidthTablet): a Tablet per-side longhand
    falls through the helper (returns None) to an honest gap — the SAME base-only
    contract the shorthand self-merge has, via the shared tier mechanism."""
    w = border_side_write(Decl("border-bottom-width", "3px", "Tablet"), _ctx(conn))
    assert w is None
    result = process_element(_ctx(conn), [Decl("border-bottom-width", "3px", "Tablet")])
    assert "borderWidth" not in result.attrs()
    assert result.gaps and result.gaps[0].origin is GapOrigin.NO_DESTINATION


def test_non_border_property_falls_through(conn):
    """A non-border property is not intercepted by the helper (returns None)."""
    assert border_side_write(Decl("max-width", "600px", "Base"), _ctx(conn)) is None
    # border-width SHORTHAND (not a per-side longhand) is left to the self-merge branch.
    assert border_side_write(Decl("border-width", "1px", "Base"), _ctx(conn)) is None

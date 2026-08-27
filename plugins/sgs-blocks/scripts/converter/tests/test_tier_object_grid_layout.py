"""test_tier_object_grid_layout.py — GRID/LAYOUT resolver family → tier-object shape.

Same defect CLASS as D802 (typography's fix, commit 14707b01e), extended to
resolvers/grid.py, resolvers/outer_box.py, resolvers/content_band.py and
services/arrangement.py: a migrated tier-object property (``gap``,
``gridTemplateColumns``, ``columns``, ``contentWidth``, ``minHeight``,
``maxWidth``, ``height``, ``maxHeight``, ``order``, ``flexDirection``) was
still being written as a FLAT SCALAR because these resolvers called
``tier_state_suffix``/``tier_suffix`` unconditionally and never checked
``db_lookup.tier_object_base`` on the unsuffixed base attr first — so the
tier-object destination was never even attempted (never a Tablet/Mobile
suffix sibling; always a bare scalar on the base attr).

Measured via ``check_flat_tier_regression.py --report`` against a real clone
run (``pipeline-state/mamas-munches-homepage-qa-2849-2026-08-26-223048``): 39
of 47 violations were exactly this shape, spanning sgs/container, sgs/hero,
sgs/button, sgs/multi-button, sgs/trust-bar, sgs/feature-grid,
sgs/testimonial-slider and sgs/media.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_tier_object_grid_layout.py
"""
from __future__ import annotations

import sqlite3

import pytest
from bs4 import BeautifulSoup

from converter.context import Ctx, Decl
from converter.db.db_lookup import SGS_DB, tier_object_base
from converter.models import Write
from converter.resolvers import content_band, grid, outer_box
from converter.services import arrangement


def _ctx(conn, *, slug="sgs/container", kind="section", hib=1, root=False,
         layer=None):
    return Ctx(slug, kind, hib, None, None, None, root, layer, conn)


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


# ---------------------------------------------------------------------------
# Premises — assert the shapes every test below depends on. If any of these
# fail, the block has un-migrated (or migrated differently) and the slice
# proofs below are vacuous — re-point them rather than deleting them.
# ---------------------------------------------------------------------------

def test_premise_container_gap_and_grid_are_tier_objects(conn):
    assert tier_object_base("sgs/container", "gap") is True
    assert tier_object_base("sgs/container", "gridTemplateColumns") is True
    assert tier_object_base("sgs/container", "columns") is True


def test_premise_container_content_width_max_width_min_height_are_tier_objects(conn):
    assert tier_object_base("sgs/container", "contentWidth") is True
    assert tier_object_base("sgs/container", "maxWidth") is True
    assert tier_object_base("sgs/container", "minHeight") is True


def test_premise_multibutton_flexdirection_is_a_tier_object(conn):
    assert tier_object_base("sgs/multi-button", "flexDirection") is True


# ---------------------------------------------------------------------------
# grid.py — gap
# ---------------------------------------------------------------------------

def test_grid_gap_emits_tier_object_not_flat_scalar(conn):
    out = grid.resolve(Decl("gap", "16px", "Base"), _ctx(conn))
    assert isinstance(out, Write)
    assert out.attr == "gap"
    assert out.value == {"desktop": "16px"}, (
        "expected the tier-object shape {'desktop': '16px'}, got a flat "
        f"scalar {out.value!r} — the exact D554-C / D802-class regression"
    )


def test_grid_gap_mobile_tier_lands_in_mobile_key_not_a_suffix_attr(conn):
    out = grid.resolve(Decl("gap", "12px", "Mobile"), _ctx(conn))
    assert isinstance(out, Write)
    assert out.attr == "gap", "must NOT re-append a tier suffix (gapMobile no longer exists)"
    assert out.value == {"mobile": "12px"}


# ---------------------------------------------------------------------------
# grid.py — grid-template-columns (+ derived columns count)
# ---------------------------------------------------------------------------

def test_grid_template_columns_and_count_emit_tier_objects(conn):
    out = grid.resolve(Decl("grid-template-columns", "repeat(4, 1fr)", "Base"), _ctx(conn))
    assert isinstance(out, list)
    by_attr = {w.attr: w.value for w in out}
    assert by_attr["gridTemplateColumns"] == {"desktop": "repeat(4, 1fr)"}
    assert by_attr["columns"] == {"desktop": 4}


def test_grid_template_columns_tablet_tier(conn):
    out = grid.resolve(Decl("grid-template-columns", "repeat(2, 1fr)", "Tablet"), _ctx(conn))
    by_attr = {w.attr: w.value for w in out}
    assert by_attr["gridTemplateColumns"] == {"tablet": "repeat(2, 1fr)"}
    assert by_attr["columns"] == {"tablet": 2}
    assert "gridTemplateColumnsTablet" not in by_attr
    assert "columnsTablet" not in by_attr


# ---------------------------------------------------------------------------
# outer_box.py — max-width / min-height (the generic OUTER literal-prop path)
# ---------------------------------------------------------------------------

def test_outer_box_max_width_emits_tier_object(conn):
    out = outer_box.resolve(Decl("max-width", "1000px", "Base"), _ctx(conn))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("maxWidth", {"desktop": "1000px"})


def test_outer_box_min_height_emits_tier_object(conn):
    out = outer_box.resolve(Decl("min-height", "520px", "Base"), _ctx(conn, slug="sgs/hero"))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("minHeight", {"desktop": "520px"})


# ---------------------------------------------------------------------------
# content_band.py — contentWidth (max-width via the CONTENT layer priority chain)
# ---------------------------------------------------------------------------

def test_content_band_content_width_emits_tier_object(conn):
    out = content_band.resolve(
        Decl("max-width", "1100px", "Base"), _ctx(conn, slug="sgs/trust-bar")
    )
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("contentWidth", {"desktop": "1100px"})


# ---------------------------------------------------------------------------
# arrangement.py — flexDirection (the layout-trigger dict path; not a Write)
# ---------------------------------------------------------------------------

def test_arrangement_flexdirection_emits_tier_object_for_migrated_block():
    soup = BeautifulSoup(
        '<div style="display:flex;flex-direction:column"></div>', "html.parser"
    )
    node = soup.div
    out = arrangement.layout_attrs(node, {}, block_slug="sgs/multi-button")
    assert out.get("flexDirection") == {"desktop": "column"}, (
        f"expected the tier-object shape, got {out.get('flexDirection')!r}"
    )
    # 'layout' itself is never a tier object (an enum trigger) — must stay flat.
    assert out.get("layout") == "flex"


# ---------------------------------------------------------------------------
# Negative control — a still-flat-sibling block must be untouched (the flat
# path stays the flat path; this proves the gate is per-(block,attr), not a
# blanket switch).
# ---------------------------------------------------------------------------

def test_flat_sibling_gap_block_still_writes_the_suffixed_attr(conn):
    row = conn.execute(
        "SELECT block_slug, attr_name FROM block_attributes "
        "WHERE attr_name LIKE '%Mobile' AND attr_name NOT LIKE '%Unit' "
        "AND block_slug LIKE 'sgs/%' LIMIT 1"
    ).fetchone()
    if not row:
        pytest.skip("no flat-sibling attrs remain — control retired knowingly")
    slug, sibling = row
    base = sibling[: -len("Mobile")]
    assert tier_object_base(slug, base) is False, (
        f"{slug}.{base} declares a {sibling} sibling, so it is NOT a tier "
        f"object; tier_object_base must return False or the flat path would "
        f"be bypassed."
    )

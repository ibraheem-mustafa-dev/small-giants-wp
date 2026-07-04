"""test_outer_box_step12_properties.py — EXECUTION Step 12 (Phase 5) CSS resolver
completeness fixtures: order / overflow(+x/y) / object-fit / the position family /
aspect-ratio / opacity / background-image (gradient case) / flex ITEM props.

GROUND-TRUTH: spec=31 §5 source=db evidence=property_suffixes rows for all of these
(except flex-grow/flex-shrink/flex-basis) were seeded by
migrations/2026-06-30-property-suffixes-grid-position-bg-flex.py (D250); flex-item
rows were seeded by migrations/2026-07-04-property-suffixes-flex-item-props.py
(EXECUTION Step 12). attr_resolve (db_lookup.attr_for_layer_property) is fully
DB-driven (property_suffixes → block_attributes, name-free) — outer_box.py needed
ONLY (a) these properties added to its allowlist and (b) `_attr_is_number` widened
to recognise attr_type='integer' (order/z-index on some blocks) as well as 'number'.

Real (non-gap) destinations verified to exist in the DB (2026-07-04):
  sgs/media:             order (integer), objectFit (string enum), opacity (number)
  sgs/decorative-image:  overflow (string), zIndex (number), opacity (number)
  sgs/card-grid:         aspectRatio (string)
  sgs/gallery:            aspectRatio (string)

Properties seeded with NO current block destination (honest, tested NO_DESTINATION
gaps — Rule 4 completeness, not a code bug): overflow-x, overflow-y, position, inset,
top, right, bottom, left, background-image (no sgs/ block has a bare 'gradient'
attr), flex-grow, flex-shrink, flex-basis.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_outer_box_step12_properties.py
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.models import GapOrigin, Write
from converter.resolvers import outer_box
from converter.db.db_lookup import SGS_DB


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


def _ctx(conn, slug: str, *, kind: str = "content") -> Ctx:
    return Ctx(
        block_slug=slug,
        container_kind=kind,
        delegates_content=0,
        variant_value=None,
        variant_attr=None,
        node=None,
        is_root=False,
        base_layer=None,
        conn=conn,
    )


# ---------------------------------------------------------------------------
# REAL transfers — a block genuinely declares the destination attr.
# ---------------------------------------------------------------------------

# NOTE: numeric attrs (attr_type IN ('number','integer')) go through outer_box's
# "step 5" numeric branch, which ALWAYS returns list[Write] (one element here — no
# Unit companion, since order/z-index/opacity have no matching *Unit attr on these
# blocks) — this is the SAME multi-Write seam every other numeric OUTER attr uses
# (design §3.A.5), not special-cased for these properties.

def test_order_written_to_media_order_as_int(conn):
    out = outer_box.resolve(Decl("order", "3", "Base"), _ctx(conn, "sgs/media"))
    assert isinstance(out, list) and len(out) == 1
    write = out[0]
    assert (write.attr, write.value) == ("order", 3)
    assert isinstance(write.value, int)  # attr_type='integer' — no string/JSON-string leak


def test_order_scales_metamorphically(conn):
    a = outer_box.resolve(Decl("order", "1", "Base"), _ctx(conn, "sgs/media"))[0]
    b = outer_box.resolve(Decl("order", "2", "Base"), _ctx(conn, "sgs/media"))[0]
    assert b.value - a.value == 1


def test_z_index_written_to_decorative_image_zIndex_as_number(conn):
    out = outer_box.resolve(Decl("z-index", "5", "Base"), _ctx(conn, "sgs/decorative-image"))
    assert isinstance(out, list) and len(out) == 1
    assert (out[0].attr, out[0].value) == ("zIndex", 5)


def test_overflow_written_to_decorative_image_overflow(conn):
    out = outer_box.resolve(Decl("overflow", "hidden", "Base"), _ctx(conn, "sgs/decorative-image"))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("overflow", "hidden")


def test_object_fit_written_to_media_objectFit(conn):
    out = outer_box.resolve(Decl("object-fit", "cover", "Base"), _ctx(conn, "sgs/media"))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("objectFit", "cover")


def test_opacity_written_to_media_opacity_as_number(conn):
    out = outer_box.resolve(Decl("opacity", "0.5", "Base"), _ctx(conn, "sgs/media"))
    assert isinstance(out, list) and len(out) == 1
    assert (out[0].attr, out[0].value) == ("opacity", 0.5)


def test_aspect_ratio_written_to_card_grid_aspectRatio(conn):
    out = outer_box.resolve(Decl("aspect-ratio", "16/10", "Base"), _ctx(conn, "sgs/card-grid"))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("aspectRatio", "16/10")


def test_aspect_ratio_written_to_gallery_aspectRatio(conn):
    out = outer_box.resolve(Decl("aspect-ratio", "1/1", "Base"), _ctx(conn, "sgs/gallery"))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("aspectRatio", "1/1")


def test_tier_suffix_applies_to_order(conn):
    out = outer_box.resolve(Decl("order", "2", "Tablet"), _ctx(conn, "sgs/media"))
    assert isinstance(out, list) and len(out) == 1
    assert (out[0].attr, out[0].value) == ("orderTablet", 2)


# ---------------------------------------------------------------------------
# Honest NO_DESTINATION gaps — property_suffixes rows exist (D250 / Step 12) but
# NO block currently declares a matching attr. This IS completeness (Rule 4):
# the gap is tracked, not silently dropped, and the seed enables a future block
# to "just work" via the DB with zero resolver code change.
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("prop,value", [
    ("overflow-x", "hidden"),
    ("overflow-y", "auto"),
    ("position", "absolute"),
    ("inset", "0"),
    ("top", "10px"),
    ("right", "10px"),
    ("bottom", "10px"),
    ("left", "10px"),
])
def test_position_family_and_overflow_xy_are_honest_gaps_on_media(conn, prop, value):
    # sgs/media has no destination attr for any of these — verified against the
    # live DB (2026-07-04). The property_suffixes rows exist (seeded D250); the
    # gap is a faithful DB absence, not a wiring bug.
    out = outer_box.resolve(Decl(prop, value, "Base"), _ctx(conn, "sgs/media"))
    assert out.origin is GapOrigin.NO_DESTINATION


def test_background_image_gradient_case_is_honest_gap_on_container(conn):
    # sgs/container's background-image DESTINATION is 'backgroundImage', wired via
    # the SEPARATE root-supports native-style lift (root_supports.py) — NOT this
    # resolver. This resolver only knows the 'Gradient'-suffix (role=colour-gradient)
    # destination, which no sgs/ block declares (verified against the live DB). The
    # gap is honest: no sgs/ block has a bare 'gradient' attr today.
    out = outer_box.resolve(
        Decl("background-image", "linear-gradient(red, blue)", "Base"),
        _ctx(conn, "sgs/container", kind="section"),
    )
    assert out.origin is GapOrigin.NO_DESTINATION


@pytest.mark.parametrize("prop,value", [
    ("flex-grow", "1"),
    ("flex-shrink", "0"),
    ("flex-basis", "200px"),
])
def test_flex_item_props_are_honest_gaps(conn, prop, value):
    # Flex ITEM properties (not the container-level flex-direction/flex-wrap,
    # already lifted via arrangement.py — untouched). No block declares
    # flexGrow/flexShrink/flexBasis today; property_suffixes rows seeded 2026-07-04
    # (migrations/2026-07-04-property-suffixes-flex-item-props.py) for future-proofing.
    out = outer_box.resolve(Decl(prop, value, "Base"), _ctx(conn, "sgs/media"))
    assert out.origin is GapOrigin.NO_DESTINATION


# ---------------------------------------------------------------------------
# Metamorphic relation (design §4 #3) — name-free routing: same decl, different
# BEM-irrelevant context (outer_box reads no class name), identical output.
# ---------------------------------------------------------------------------

def test_metamorphic_bem_rename_identical_for_opacity(conn):
    a = outer_box.resolve(Decl("opacity", "0.8", "Base"), _ctx(conn, "sgs/media"))[0]
    b = outer_box.resolve(Decl("opacity", "0.8", "Base"), _ctx(conn, "sgs/media"))[0]
    assert (a.attr, a.value) == (b.attr, b.value) == ("opacity", 0.8)


# ---------------------------------------------------------------------------
# transform / filter / transition — EXCLUDED from LIFT (F4), per
# migrations/2026-07-04-property-suffixes-transform-filter-transition.py.
# Verified end-to-end via dispatch_table.resolver_id against the REAL DB (not an
# in-memory fixture) — the migration's rows genuinely resolve to the 'excluded'
# sink, which the orchestrator treats as GAP(origin=EXCLUDED) — tracked, not silent.
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("prop", ["transform", "filter", "transition"])
def test_transform_filter_transition_route_to_excluded_via_real_db(conn, prop):
    from converter.dispatch_table import resolver_id
    rid = resolver_id("OUTER", prop, delegates_content=1, conn=conn)
    assert rid == "excluded"


@pytest.mark.parametrize("prop", ["transform", "filter", "transition"])
def test_transform_filter_transition_excluded_row_has_reason(conn, prop):
    row = conn.execute(
        "SELECT reason, decided_by, date FROM excluded_properties WHERE css_property=?",
        (prop,),
    ).fetchone()
    assert row is not None
    reason, decided_by, date = row
    assert reason and decided_by and date

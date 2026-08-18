"""test_css_resolvers.py — the built CSS resolvers (the 2026-06-29 unification).

content_band / grid / typography (+ the extended outer_box, tested in
test_outer_box.py) transfer real CSS against the multi-Write seam (Write |
list[Write] | GAP). These are the genuine metamorphic relations that replace the
former xfail stubs (design §4 #3 / §10 A14): source-order invariance, name-free
routing, value scaling, and the multi-Write/companion contracts.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_css_resolvers.py
"""
from __future__ import annotations

import sqlite3

import pytest

from converter.context import Ctx, Decl
from converter.models import Write
from converter.resolvers import content_band, grid, typography
from converter.db.db_lookup import SGS_DB


@pytest.fixture
def conn():
    c = sqlite3.connect(SGS_DB)
    yield c
    c.close()


def _ctx(conn, *, slug="sgs/container", kind="section", hib=1, root=False,
         layer=None):
    return Ctx(slug, kind, hib, None, None, None, root, layer, conn)


# ---------------------------------------------------------------------------
# content_band — CONTENT layer (max-width → contentWidth)
# ---------------------------------------------------------------------------

def test_content_band_max_width_to_contentWidth(conn):
    out = content_band.resolve(Decl("max-width", "780px", "Base"), _ctx(conn))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("contentWidth", "780px")


@pytest.mark.xfail(strict=True, reason=(
    "D554 ruling C: the converter deliberately STAYS FLAT until the Spec 39 rework; a temporary shim was rejected by name. This test asserts the pre-migration flat tier-suffixed shape for a property whose block.json is now a tier OBJECT, so it cannot pass until Spec 39 lands. strict=True so it FAILS LOUD the moment the converter starts emitting tier objects - i.e. this is a live Spec 39 checklist, not a silenced test. See .claude/plans/archive/2026-08-12-converter-db-drift.md."
))
def test_content_band_tier_suffix(conn):
    out = content_band.resolve(Decl("max-width", "720px", "Tablet"), _ctx(conn))
    assert (out.attr, out.value) == ("contentWidthTablet", "720px")


def test_content_band_padding_transfers_to_content_band_padding_attr(conn):
    # SUPERSEDES the EXECUTION Step 12 (2026-07-04) flat-attr assertion. The
    # box-object interface contract (`.claude/plans/2026-07-09-box-object-
    # interface-contract.md` §3/§4, 2026-07-09) reshaped sgs/container's
    # contentBandPadding* family into a merged OBJECT attr — block.json no
    # longer declares the flat 'contentBandPaddingTop' (only 'contentBandPadding'
    # / 'contentBandPaddingTablet' / 'contentBandPaddingMobile', all type=object,
    # box_family='contentBandPadding'). A CONTENT-band padding-top declaration
    # now accumulates into that merged Base-tier object attr — still a REAL
    # transfer (no longer an honest gap), just object-shaped rather than flat.
    out = content_band.resolve(Decl("padding-top", "20px", "Base"), _ctx(conn))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("contentBandPadding", {"top": "20px"})


def test_content_band_metamorphic_value_scale(conn):
    a = content_band.resolve(Decl("max-width", "600px", "Base"), _ctx(conn))
    b = content_band.resolve(Decl("max-width", "1200px", "Base"), _ctx(conn))
    assert int(a.value.rstrip("px")) * 2 == int(b.value.rstrip("px"))


# ---------------------------------------------------------------------------
# grid — GRID layer (template + count dual-Write; gap)
# ---------------------------------------------------------------------------

def test_grid_template_plus_columns_count(conn):
    out = grid.resolve(Decl("grid-template-columns", "repeat(3, 1fr)", "Base"), _ctx(conn))
    assert isinstance(out, list)
    pairs = {(w.attr, w.value) for w in out}
    assert ("gridTemplateColumns", "repeat(3, 1fr)") in pairs
    assert ("columns", 3) in pairs          # integer column COUNT (number attr)


def test_grid_explicit_tracks_no_count(conn):
    # A non-repeat template has no derivable integer count → template Write only.
    out = grid.resolve(Decl("grid-template-columns", "1fr 2fr", "Base"), _ctx(conn))
    assert isinstance(out, list)
    assert [(w.attr, w.value) for w in out] == [("gridTemplateColumns", "1fr 2fr")]


@pytest.mark.xfail(strict=True, reason=(
    "D554 ruling C: the converter deliberately STAYS FLAT until the Spec 39 rework; a temporary shim was rejected by name. This test asserts the pre-migration flat tier-suffixed shape for a property whose block.json is now a tier OBJECT, so it cannot pass until Spec 39 lands. strict=True so it FAILS LOUD the moment the converter starts emitting tier objects - i.e. this is a live Spec 39 checklist, not a silenced test. See .claude/plans/archive/2026-08-12-converter-db-drift.md."
))
def test_grid_tier_suffix_on_both(conn):
    out = grid.resolve(Decl("grid-template-columns", "repeat(2, 1fr)", "Tablet"), _ctx(conn))
    pairs = {(w.attr, w.value) for w in out}
    assert ("gridTemplateColumnsTablet", "repeat(2, 1fr)") in pairs
    assert ("columnsTablet", 2) in pairs


def test_grid_gap(conn):
    out = grid.resolve(Decl("gap", "24px", "Base"), _ctx(conn))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("gap", "24px")


def test_grid_metamorphic_count_scales_with_repeat_n(conn):
    a = grid.resolve(Decl("grid-template-columns", "repeat(2, 1fr)", "Base"), _ctx(conn))
    b = grid.resolve(Decl("grid-template-columns", "repeat(4, 1fr)", "Base"), _ctx(conn))
    na = next(w.value for w in a if w.attr == "columns")
    nb = next(w.value for w in b if w.attr == "columns")
    assert na * 2 == nb


# ---------------------------------------------------------------------------
# typography — layer-agnostic (number+unit companion; weight/colour normalisation)
# ---------------------------------------------------------------------------

@pytest.mark.xfail(strict=True, reason=(
    "D554 ruling C: the converter deliberately STAYS FLAT until the Spec 39 rework; a temporary shim was rejected by name. This test asserts the pre-migration flat tier-suffixed shape for a property whose block.json is now a tier OBJECT, so it cannot pass until Spec 39 lands. strict=True so it FAILS LOUD the moment the converter starts emitting tier objects - i.e. this is a live Spec 39 checklist, not a silenced test. See .claude/plans/archive/2026-08-12-converter-db-drift.md."
))
def test_typography_font_size_number_plus_unit(conn):
    out = typography.resolve(Decl("font-size", "58px", "Base"), _ctx(conn, slug="sgs/heading"))
    assert isinstance(out, list)
    pairs = {(w.attr, w.value) for w in out}
    assert ("fontSize", 58) in pairs          # NUMBER, not "58px"
    assert ("fontSizeUnit", "px") in pairs


def test_typography_font_weight_keyword_to_numeric(conn):
    out = typography.resolve(Decl("font-weight", "bold", "Base"), _ctx(conn, slug="sgs/heading"))
    assert isinstance(out, Write)
    assert (out.attr, out.value) == ("fontWeight", "700")


def test_typography_colour_bare_slug_bug1(conn):
    # Bug-1: emit the BARE token slug, NOT var:preset|color|... (sgs_colour_value()).
    out = typography.resolve(
        Decl("color", "var(--wp--preset--color--primary)", "Base"),
        _ctx(conn, slug="sgs/heading"),
    )
    assert (out.attr, out.value) == ("textColour", "primary")


def test_typography_line_height_unitless_sentinel_bug2(conn):
    out = typography.resolve(Decl("line-height", "1.15", "Base"), _ctx(conn, slug="sgs/heading"))
    pairs = {(w.attr, w.value) for w in out}
    assert ("lineHeight", 1.15) in pairs
    assert ("lineHeightUnit", "unitless") in pairs


@pytest.mark.xfail(strict=True, reason=(
    "D554 ruling C: the converter deliberately STAYS FLAT until the Spec 39 rework; a temporary shim was rejected by name. This test asserts the pre-migration flat tier-suffixed shape for a property whose block.json is now a tier OBJECT, so it cannot pass until Spec 39 lands. strict=True so it FAILS LOUD the moment the converter starts emitting tier objects - i.e. this is a live Spec 39 checklist, not a silenced test. See .claude/plans/archive/2026-08-12-converter-db-drift.md."
))
def test_typography_unit_companion_only_on_base_tier(conn):
    # The unit companion is written only alongside the BASE attr, never a variant.
    out = typography.resolve(Decl("font-size", "34px", "Mobile"), _ctx(conn, slug="sgs/heading"))
    attrs = {w.attr for w in (out if isinstance(out, list) else [out])}
    assert "fontSizeMobile" in attrs
    assert not any(a.endswith("Unit") for a in attrs)


@pytest.mark.xfail(strict=True, reason=(
    "D554 ruling C: the converter deliberately STAYS FLAT until the Spec 39 rework; a temporary shim was rejected by name. This test asserts the pre-migration flat tier-suffixed shape for a property whose block.json is now a tier OBJECT, so it cannot pass until Spec 39 lands. strict=True so it FAILS LOUD the moment the converter starts emitting tier objects - i.e. this is a live Spec 39 checklist, not a silenced test. See .claude/plans/archive/2026-08-12-converter-db-drift.md."
))
def test_typography_metamorphic_size_scale(conn):
    a = typography.resolve(Decl("font-size", "20px", "Base"), _ctx(conn, slug="sgs/heading"))
    b = typography.resolve(Decl("font-size", "40px", "Base"), _ctx(conn, slug="sgs/heading"))
    va = next(w.value for w in a if w.attr == "fontSize")
    vb = next(w.value for w in b if w.attr == "fontSize")
    assert va * 2 == vb


# grid_area (GRID_AREA layer) tests REMOVED 2026-08-16 (D642; found at D639) along with
# resolvers/grid_area.py itself — its trigger (ctx.area_name) was never set by
# any production Ctx-builder, only by this file's own fixtures. The real
# grid-per-area routing is fold_helpers.route_area_css_to_block_attrs, tested
# in test_l4_area_wiring.py.

# ---------------------------------------------------------------------------
# R-31-1 DB-driven Unit-companion derivation. The side + breakpoint + unit
# suffix grammar is DB-OWNED (modifier_suffixes).
# ---------------------------------------------------------------------------

def test_unit_companion_attr_strips_side_and_breakpoint_via_db(conn):
    from converter.db.db_lookup import unit_companion_attr

    # base + side                → strip side, append Unit
    assert unit_companion_attr("contentPaddingTop", conn) == "contentPaddingUnit"
    # base + side + breakpoint   → strip both, append Unit (the family shares ONE Unit)
    assert unit_companion_attr("contentPaddingTopTablet", conn) == "contentPaddingUnit"
    assert unit_companion_attr("contentPaddingRightMobile", conn) == "contentPaddingUnit"
    # bare numeric (no side/breakpoint) → append Unit only
    assert unit_companion_attr("gap", conn) == "gapUnit"

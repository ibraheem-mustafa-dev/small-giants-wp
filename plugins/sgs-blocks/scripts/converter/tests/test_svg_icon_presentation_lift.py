"""test_svg_icon_presentation_lift.py -- an item icon's <svg> size, stroke width and stroke colour reach block attributes.

Measured on the Eye Care ticker: each item's icon was
``<svg width="15" height="15" stroke="var(--acc,#9C8B78)" stroke-width="1.6">``. The raw-svg strip DROPPED
``width`` / ``height``; ``stroke`` / ``stroke-width`` stay in the stored markup but the block's stylesheet
overrides them, so they reach the page only as block attributes. Nothing lifted them, so the clone drew 44px
disc badges instead of bare 15px icons: ``detect_variant`` scored the variant slots against attributes
POPULATED this run, nothing populated ``iconBareSize``, every variant scored 0 and the block kept its default.

What is pinned here (draft-agnostic: synthetic HTML, no run artefacts):
  * the presentation is read off the outer <svg> before the strip and routed by DECLARED css_property and icon
    element (``db_lookup.svg_glyph_destinations``), never by attribute name;
  * a value is written only when every item agrees and the block declares exactly one destination; anything
    else writes nothing and is REPORTED, and a missing attribute is never filled with a default;
  * the lifted size then selects the bare-icon variant, and the draft's own declarations (a disc's
    background / radius / shadow on the icon holder) outvote it when the draft is a disc.

Every behaviour has a negative control: the same input with just the fix switched off must give the OLD result.
Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_svg_icon_presentation_lift.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re

import pytest

from converter.db import db_lookup
from converter.entry import convert_section
from converter.resolvers import array_content
from converter.services import content_gap_collector as gap_collector
from converter.services import icon_resolver as ir
from converter.services import styling_helpers

OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round"{extra}><path d="M2 3h19v18H2z"/><path d="M7 12h9"/></svg>'
FULL = ' width="15" height="15" stroke="var(--acc,#9C8B78)" stroke-width="1.6"'


def _svg(extra: str = FULL) -> str:
    return OPEN.format(extra=extra)


def _ticker(svgs: list[str], holder_class: str | None = None) -> str:
    def _icon(svg: str) -> str:
        return f'<span class="{holder_class}">{svg}</span>' if holder_class else svg

    items = "".join(
        f'<span class="sgs-trust-bar__item">{_icon(svg)}<span class="sgs-trust-bar__label">Claim {n}</span></span>'
        for n, svg in enumerate(svgs)
    )
    return f'<div class="sgs-trust-bar"><div class="sgs-trust-bar__track">{items}</div></div>'


def _convert(html: str, css: str = "") -> tuple[dict, list[dict]]:
    res = convert_section(html=html, css=css, media_map={}, boundary_id="b1", section_id="s1")
    m = re.search(r"<!-- wp:sgs/trust-bar (\{.*?\}) /?-->", res["block_markup"], re.S)
    assert m, res["block_markup"][:200]
    return json.loads(m.group(1)), res["content_gaps"]


def _gaps(gaps: list[dict], kind: str) -> list[str]:
    return [g["detail"] for g in gaps if g.get("where") == f"items[*].iconSvg.{kind}"]


@pytest.fixture(autouse=True)
def _isolated(tmp_path, monkeypatch):
    monkeypatch.delenv(ir.PROPOSALS_ENV, raising=False)
    monkeypatch.setattr(ir, "_PROPOSALS_DEFAULT", str(tmp_path / "default-proposals.jsonl"))
    ir._reset_caches()
    gap_collector.clear()
    yield
    ir._reset_caches()
    gap_collector.clear()
    styling_helpers.reset_colour_resolution()


# ---- the strip returns what it drops -----------------------------------------------------------------

def test_the_strip_returns_the_presentation_it_drops():
    stripped, pres = ir.strip_svg_wrapper_attrs_with_presentation(_svg())
    assert pres == {"width": "15", "height": "15", "stroke": "var(--acc,#9C8B78)", "stroke-width": "1.6"}
    assert ' width="' not in stripped and ' height="' not in stripped      # the stored markup is unchanged
    assert ir._strip_svg_wrapper_attrs(_svg()) == stripped                 # the string-only wrapper agrees


def test_an_svg_with_no_presentation_returns_an_empty_dict_and_invents_nothing():
    assert ir.strip_svg_wrapper_attrs_with_presentation(_svg(""))[1] == {}


def test_a_child_elements_width_is_not_the_glyph_size():
    _s, pres = ir.strip_svg_wrapper_attrs_with_presentation('<svg viewBox="0 0 24 24"><rect width="15" height="13"/></svg>')
    assert pres == {}


# ---- destinations are declared by the DB, not guessed from names ------------------------------------

def test_the_destination_lookup_finds_the_glyph_size_and_drops_the_disc_size():
    dests = db_lookup.svg_glyph_destinations("sgs/trust-bar", "icon")
    # iconCircleSize is ALSO height,width on an icon element, but it is the size of a decorated disc (its
    # variant discriminates on four slots), so only the bare glyph size is a destination for an svg size.
    assert dests == {"size": ("iconBareSize",), "stroke-width": ("iconStrokeWidth",), "colour": ("iconColour",)}


def test_a_block_without_such_attributes_has_no_destination():
    assert db_lookup.svg_glyph_destinations("sgs/hero", "icon") == {"size": (), "stroke-width": (), "colour": ()}


# ---- (a) unanimous sizes lift; differing sizes are reported and write nothing ------------------------

def test_unanimous_svg_presentation_lifts_to_the_block_attributes():
    attrs, gaps = _convert(_ticker([_svg()] * 3))
    assert (attrs["iconBareSize"], attrs["iconStrokeWidth"], attrs["iconColour"]) == (15, 1.6, "#9C8B78")
    assert _gaps(gaps, "size") == [] and _gaps(gaps, "stroke-width") == []


def test_negative_control_with_the_router_off_nothing_is_lifted(monkeypatch):
    monkeypatch.setattr(ir, "route_svg_presentation", lambda *_a, **_k: ({}, []))
    attrs, _ = _convert(_ticker([_svg()] * 3))
    assert "iconBareSize" not in attrs and "iconStrokeWidth" not in attrs and "iconColour" not in attrs


def test_items_that_disagree_on_size_write_nothing_and_are_reported():
    attrs, gaps = _convert(_ticker([_svg(' width="15" height="15"'), _svg(' width="15" height="15"'),
                                    _svg(' width="20" height="20"')]))
    assert "iconBareSize" not in attrs
    assert any("icons differ" in d for d in _gaps(gaps, "size"))


def test_one_item_without_a_size_counts_as_disagreement_not_as_a_default():
    attrs, gaps = _convert(_ticker([_svg(' width="15" height="15"'), _svg(""), _svg(' width="15" height="15"')]))
    assert "iconBareSize" not in attrs
    assert any("icons differ" in d for d in _gaps(gaps, "size"))


def test_a_non_square_icon_uses_the_width_and_is_reported():
    attrs, gaps = _convert(_ticker([_svg(' width="15" height="12"')] * 3))
    assert attrs["iconBareSize"] == 15
    assert any("non-square icon" in d for d in _gaps(gaps, "size"))


def test_a_size_that_is_not_a_px_length_writes_nothing_and_is_reported():
    attrs, gaps = _convert(_ticker([_svg(' width="1em" height="1em"')] * 3))
    assert "iconBareSize" not in attrs
    assert any("not a px length" in d for d in _gaps(gaps, "size"))


# ---- (b) a stroke with a var() fallback --------------------------------------------------------------

def test_a_var_stroke_with_an_unknown_property_uses_its_fallback_hex():
    attrs, _ = _convert(_ticker([_svg(' stroke="var(--acc,#9C8B78)"')] * 3))
    assert attrs["iconColour"] == "#9C8B78"


def test_a_plain_hex_stroke_is_the_colour():
    attrs, _ = _convert(_ticker([_svg(' stroke="#123456"')] * 3))
    assert attrs["iconColour"] == "#123456"


def test_a_var_stroke_naming_a_palette_colour_snaps_to_the_theme_slug_not_the_fallback():
    styling_helpers.configure_colour_resolution({"brand": "#112233"}, {"#112233": "primary"})
    assert ir._svg_stroke_colour("var(--brand, #ffffff)") == "primary"
    assert ir._svg_stroke_colour("var(--unknown, #ffffff)") == "#ffffff"


def test_negative_control_the_fallback_is_not_taken_when_the_custom_property_resolves():
    styling_helpers.configure_colour_resolution({}, {})
    assert ir._svg_stroke_colour("var(--brand, #ffffff)") == "#ffffff"      # nothing resolves --brand: fallback
    styling_helpers.configure_colour_resolution({"brand": "#112233"}, {"#112233": "primary"})
    assert ir._svg_stroke_colour("var(--brand, #ffffff)") != "#ffffff"      # resolves: the fallback is ignored


def test_a_stroke_that_inherits_is_not_a_colour_and_is_not_reported():
    attrs, gaps = _convert(_ticker([_svg(' stroke="currentColor"')] * 3))
    assert "iconColour" not in attrs and _gaps(gaps, "colour") == []


def test_a_stroke_that_resolves_to_no_colour_is_reported():
    attrs, gaps = _convert(_ticker([_svg(' stroke="var(--nothing)"')] * 3))
    assert "iconColour" not in attrs and _gaps(gaps, "colour")


# ---- (c) an svg with no width / height writes nothing -----------------------------------------------

def test_an_svg_with_no_size_or_stroke_width_writes_nothing_and_does_not_change_the_variant():
    attrs, gaps = _convert(_ticker([_svg("")] * 3))
    assert not {"iconBareSize", "iconStrokeWidth", "iconColour", "badgeStyle"} & set(attrs)
    assert not [g for g in gaps if str(g.get("where", "")).startswith("items[*].iconSvg")]


# ---- (d) a block whose items have no raw-svg field is untouched --------------------------------------

def test_an_item_schema_without_a_raw_svg_field_is_not_touched():
    trust_bar = array_content._item_field_schema("sgs/trust-bar", "items")
    assert array_content._icon_slot_of(trust_bar) == "icon"
    assert array_content._icon_slot_of([f for f in trust_bar if "svg" not in f[0].lower()]) is None
    assert array_content._icon_slot_of(array_content._item_field_schema("sgs/icon-list", "items")) is None


def test_a_block_with_no_svg_companion_field_gives_the_same_attrs_with_or_without_svg_presentation():
    def _list(extra: str) -> dict:
        items = "".join(
            f'<li class="sgs-icon-list__item"><svg viewBox="0 0 24 24"{extra}><path d="M2 3h19v18H2z"/></svg>'
            f'<span class="sgs-icon-list__text">Point {n}</span></li>' for n in range(3)
        )
        res = convert_section(html=f'<ul class="sgs-icon-list">{items}</ul>', css="", media_map={},
                              boundary_id="b1", section_id="s1")
        return res["block_markup"]

    assert _list("") == _list(FULL)


# ---- (e) variant: the lifted size selects the bare icon, the draft's own declarations correct it ------

def test_a_bare_icon_with_no_disc_selects_icon_bare():
    attrs, _ = _convert(_ticker([_svg()] * 3))
    assert attrs["badgeStyle"] == "icon-bare"


def test_negative_control_without_the_lift_the_variant_is_not_detected(monkeypatch):
    monkeypatch.setattr(ir, "route_svg_presentation", lambda *_a, **_k: ({}, []))
    attrs, _ = _convert(_ticker([_svg()] * 3))
    assert "badgeStyle" not in attrs


DISC_CSS = (".sgs-trust-bar__icon{width:44px;height:44px;border-radius:50%;background:white;"
            "box-shadow:0 1px 2px rgba(0,0,0,.06)}")


def test_a_draft_with_a_disc_keeps_the_disc_variant_although_its_svg_is_sized():
    attrs, _ = _convert(_ticker([_svg()] * 3, holder_class="sgs-trust-bar__icon"), DISC_CSS)
    assert attrs.get("badgeStyle") == "icon-circle"


def test_a_disc_draft_without_a_sized_svg_still_leaves_the_variant_to_the_default():
    attrs, _ = _convert(_ticker([_svg("")] * 3, holder_class="sgs-trust-bar__icon"), DISC_CSS)
    assert "badgeStyle" not in attrs


def test_negative_control_without_the_declaration_probe_a_sized_svg_in_a_disc_reads_as_bare(monkeypatch):
    real = db_lookup.detect_variant
    monkeypatch.setattr(db_lookup, "detect_variant", lambda *a, **k: real(*a, **{**k, "draft_declares": None}))
    attrs, _ = _convert(_ticker([_svg()] * 3, holder_class="sgs-trust-bar__icon"), DISC_CSS)
    assert attrs["badgeStyle"] == "icon-bare"          # the wrong answer the probe exists to prevent


BARE_POPULATED = {"iconBareSize": 15}
DISC_PROPS = {"background-color", "border-radius", "box-shadow"}


def _probe(*props: str):
    return lambda css_property, css_element: any(p in css_property.split(",") for p in props) and "icon" in css_element


def test_detect_variant_bare_icon_and_no_disc_properties_is_bare():
    assert db_lookup.detect_variant("sgs/trust-bar", dict(BARE_POPULATED), draft_declares=_probe()) == "icon-bare"


def test_detect_variant_disc_properties_outvote_a_populated_bare_size():
    got = db_lookup.detect_variant("sgs/trust-bar", dict(BARE_POPULATED), draft_declares=_probe(*DISC_PROPS))
    assert got == "icon-circle"


def test_negative_control_detect_variant_without_the_probe_takes_the_populated_bare_size():
    assert db_lookup.detect_variant("sgs/trust-bar", dict(BARE_POPULATED)) == "icon-bare"


def test_detect_variant_a_draft_that_populated_nothing_returns_none_whatever_it_declares():
    assert db_lookup.detect_variant("sgs/trust-bar", {}, draft_declares=_probe(*DISC_PROPS)) is None


def test_negative_control_detect_variant_declared_props_do_score_when_something_is_populated():
    assert db_lookup.detect_variant("sgs/trust-bar", {"iconBareSize": 15}, draft_declares=_probe(*DISC_PROPS)) == "icon-circle"


def test_detect_variant_a_tie_returns_none():
    # one disc property (1) against the populated bare size (1)
    assert db_lookup.detect_variant("sgs/trust-bar", dict(BARE_POPULATED), draft_declares=_probe("background-color")) is None


def test_negative_control_detect_variant_a_second_disc_property_breaks_the_tie():
    got = db_lookup.detect_variant("sgs/trust-bar", dict(BARE_POPULATED), draft_declares=_probe("background-color", "border-radius"))
    assert got == "icon-circle"


def test_detect_variant_a_probe_that_declares_nothing_changes_nothing():
    assert db_lookup.detect_variant("sgs/trust-bar", {}, draft_declares=_probe()) is None
    assert db_lookup.detect_variant("sgs/trust-bar", {}) is None

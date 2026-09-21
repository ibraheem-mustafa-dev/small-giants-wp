"""test_icon_presentation_followups.py -- the QC-council follow-ups to the item-icon presentation lift.

  * Finding 5 (DB-first companion): the raw-svg companion of an item schema's icon field is the field the schema
    DECLARES with the ``roles`` raw-svg role, whatever it is called; the name-based match (``iconSvg``) is only a
    documented fallback, and a companion neither declared nor named is REPORTED instead of silently lifting
    nothing.
  * Finding 7: ``route_svg_presentation`` no longer adds the non-square note when nothing took the value (one loss,
    one gap row).
  * Finding 8: once a presentation value is carried by the block attribute for every item, the same value is
    stripped from each item's stored ``<svg>`` (a draft custom property such as ``var(--acc,#9C8B78)`` is dead and
    draft-coupled on the clone); a value that was NOT lifted stays in the markup.

Synthetic, draft-agnostic HTML; the real Eye Care ticker is at the bottom (skips without the local run artefacts).
Every behaviour carries a negative control. Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_icon_presentation_followups.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter.entry import convert_section
from converter.resolvers import array_content
from converter.services import content_gap_collector as gap_collector
from converter.services import icon_resolver as ir
from converter.services import styling_helpers

OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round"{extra}><path d="M2 3h19v18H2z"/><path d="M7 12h9"/></svg>'
FULL = ' width="15" height="15" stroke="var(--acc,#9C8B78)" stroke-width="1.6"'


def _svg(extra: str = FULL) -> str:
    return OPEN.format(extra=extra)


def _ticker(svgs: list[str]) -> str:
    items = "".join(
        f'<span class="sgs-trust-bar__item">{svg}<span class="sgs-trust-bar__label">Claim {n}</span></span>'
        for n, svg in enumerate(svgs)
    )
    return f'<div class="sgs-trust-bar"><div class="sgs-trust-bar__track">{items}</div></div>'


def _convert(html: str) -> tuple[dict, list[dict]]:
    res = convert_section(html=html, css="", media_map={}, boundary_id="b1", section_id="s1")
    m = re.search(r"<!-- wp:sgs/trust-bar (\{.*?\}) /?-->", res["block_markup"], re.S)
    assert m, res["block_markup"][:200]
    return json.loads(m.group(1)), res["content_gaps"]


def _gaps(gaps: list[dict], kind: str) -> list[str]:
    return [g["detail"] for g in gaps if g.get("where") == f"items[*].iconSvg.{kind}"]


def _outer_tag(svg: str) -> str:
    return re.search(r"<svg\b[^>]*>", svg).group(0)


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


# ---------------------------------------------------------------------------
# Finding 5 -- the raw-svg companion is found by declared role first, by name only as a documented fallback
# ---------------------------------------------------------------------------

ICON = ("icon", "icon", "icon")


@pytest.mark.parametrize("schema, keys", [
    ([ICON, ("rawGlyph", None, "svg")], ["rawGlyph"]),                        # declared: any name
    ([ICON, ("iconSvg", None, None)], ["iconSvg"]),                           # fallback: named for an svg
    ([ICON, ("iconSvg", None, None), ("other", None, "svg")], ["other"]),     # a declaration beats the name
    ([ICON, ("rawGlyph", None, None)], []),                                   # neither: no companion
    ([ICON, ("label", None, "text-content")], []),
])
def test_the_raw_svg_companion_is_the_declared_role_first_and_the_name_only_as_a_fallback(schema, keys):
    assert array_content._raw_svg_field_keys(schema) == keys


def test_the_icon_slot_gate_follows_the_companion():
    assert array_content._icon_slot_of([ICON, ("rawGlyph", None, "svg")]) == "icon"
    assert array_content._icon_slot_of([ICON, ("rawGlyph", None, None)]) is None


def _with_companion(monkeypatch, field: tuple[str, "str | None", "str | None"]) -> None:
    """sgs/trust-bar's real schema with its ``iconSvg`` field replaced by ``field``."""
    real = array_content._item_field_schema

    def patched(slug: str, attr: str):
        schema = real(slug, attr)
        return [field if fk == "iconSvg" else (fk, s, r) for fk, s, r in schema]

    monkeypatch.setattr(array_content, "_item_field_schema", patched)


def test_a_companion_declared_with_the_svg_role_lifts_whatever_it_is_called(monkeypatch):
    _with_companion(monkeypatch, ("rawGlyph", None, "svg"))
    attrs, gaps = _convert(_ticker([_svg()] * 3))
    assert (attrs["iconBareSize"], attrs["iconStrokeWidth"], attrs["iconColour"]) == (15, 1.6, "#9C8B78")
    assert all("rawGlyph" in item and "iconSvg" not in item for item in attrs["items"])
    assert _gaps(gaps, "companion") == []


def test_a_companion_that_is_neither_declared_nor_named_is_reported_not_silently_ignored(monkeypatch):
    _with_companion(monkeypatch, ("rawGlyph", None, None))
    attrs, gaps = _convert(_ticker([_svg()] * 3))
    assert "iconBareSize" not in attrs and "iconStrokeWidth" not in attrs
    rows = _gaps(gaps, "companion")
    assert len(rows) == 1 and "raw-svg field" in rows[0]


def test_negative_control_the_name_only_match_ignores_a_declared_companion(monkeypatch):
    """The previous rule (role-less field whose NAME names an svg) restored: the declared ``rawGlyph`` is missed and
    nothing lifts (the companion report is the safety net that makes the miss visible)."""
    _with_companion(monkeypatch, ("rawGlyph", None, "svg"))
    monkeypatch.setattr(array_content, "_raw_svg_field_keys",
                        lambda schema: [fk for fk, _s, r in schema if r is None and "svg" in fk.lower()])
    attrs, gaps = _convert(_ticker([_svg()] * 3))
    assert "iconBareSize" not in attrs and "iconStrokeWidth" not in attrs
    assert len(_gaps(gaps, "companion")) == 1


def test_a_block_whose_icon_field_has_no_destinations_is_not_reported():
    """No noise where nothing could have been lifted: sgs/icon-list has an icon field, no svg glyph attributes."""
    items = "".join(
        f'<li class="sgs-icon-list__item">{_svg()}<span class="sgs-icon-list__text">Point {n}</span></li>'
        for n in range(3))
    res = convert_section(html=f'<ul class="sgs-icon-list">{items}</ul>', css="", media_map={},
                          boundary_id="b1", section_id="s1")
    assert not [g for g in res["content_gaps"] if "iconSvg" in str(g.get("where", ""))]


# ---------------------------------------------------------------------------
# Finding 7 -- one loss, one gap row
# ---------------------------------------------------------------------------

def _route(per_item, destinations, types):
    return ir.route_svg_presentation(per_item, destinations, types)


NON_SQUARE = [{"width": "15", "height": "12"}] * 2


def test_a_non_square_icon_with_no_destination_gives_one_gap_not_two():
    _attrs, gaps = _route(NON_SQUARE, {"size": (), "stroke-width": (), "colour": ()}, {})
    size = [g for g in gaps if g[0] == "size"]
    assert len(size) == 1 and "declares no attribute" in size[0][1]


@pytest.mark.parametrize("destinations, types", [
    ({"size": ("a", "b")}, {"a": "number", "b": "number"}),   # ambiguous destination
    ({"size": ("a",)}, {"a": "string"}),                       # wrong destination type
])
def test_a_non_square_icon_nothing_took_gives_one_gap_for_every_reason_it_was_not_written(destinations, types):
    attrs, gaps = _route(NON_SQUARE, destinations, types)
    assert attrs == {} and len([g for g in gaps if g[0] == "size"]) == 1


def test_negative_control_a_non_square_icon_that_is_written_still_carries_its_note():
    attrs, gaps = _route(NON_SQUARE, {"size": ("a",)}, {"a": "number"})
    assert attrs == {"a": 15}
    assert [g[1] for g in gaps if g[0] == "size"] == ["non-square icon: width and height differ, the width is used"]


# ---------------------------------------------------------------------------
# Finding 8 -- a lifted presentation value leaves the stored svg
# ---------------------------------------------------------------------------

def test_strip_svg_open_tag_attrs_removes_only_the_named_attributes_of_the_outer_tag():
    svg = '<svg viewBox="0 0 24 24" stroke="var(--acc,#9C8B78)" stroke-width="1.6" stroke-linecap="round">' \
          '<path stroke="red" stroke-width="2" d="M1 1"/></svg>'
    out = ir.strip_svg_open_tag_attrs(svg, ("stroke", "stroke-width"))
    assert out == '<svg viewBox="0 0 24 24" stroke-linecap="round"><path stroke="red" stroke-width="2" d="M1 1"/></svg>'
    assert ir.strip_svg_open_tag_attrs(svg, ()) == svg
    assert ir.strip_svg_open_tag_attrs('<svg viewBox="0 0 1 1"></svg>', ("stroke",)) == '<svg viewBox="0 0 1 1"></svg>'


def test_unanimous_presentation_is_removed_from_every_stored_svg_and_the_glyph_still_draws():
    attrs, _ = _convert(_ticker([_svg()] * 3))
    assert (attrs["iconStrokeWidth"], attrs["iconColour"]) == (1.6, "#9C8B78")
    for item in attrs["items"]:
        tag = _outer_tag(item["iconSvg"])
        assert "stroke=" not in tag.replace("stroke-linecap=", "") and "stroke-width" not in tag
        assert "var(--acc" not in item["iconSvg"]
        # (html.parser lower-cases the attribute name, as it always has: compare case-insensitively)
        assert 'viewbox="0 0 24 24"' in tag.lower() and 'stroke-linecap="round"' in tag and 'fill="none"' in tag
        assert item["iconSvg"].count("<path") == 2 and 'd="M2 3h19v18H2z"' in item["iconSvg"]


def test_negative_control_without_the_strip_the_dead_attributes_stay(monkeypatch):
    monkeypatch.setattr(ir, "SVG_LIFTED_KIND_TO_ATTRS", {})
    attrs, _ = _convert(_ticker([_svg()] * 3))
    assert all('stroke="var(--acc,#9C8B78)"' in i["iconSvg"] and 'stroke-width="1.6"' in i["iconSvg"]
               for i in attrs["items"])


def test_items_that_differ_keep_the_attribute_that_was_not_lifted_and_lose_only_the_one_that_was():
    """Stroke widths differ (nothing lifted, so every svg keeps its own); the colour agrees (lifted, stripped)."""
    svgs = [_svg(' width="15" height="15" stroke="#123456" stroke-width="1.6"'),
            _svg(' width="15" height="15" stroke="#123456" stroke-width="2"'),
            _svg(' width="15" height="15" stroke="#123456" stroke-width="1.6"')]
    attrs, gaps = _convert(_ticker(svgs))
    assert "iconStrokeWidth" not in attrs and attrs["iconColour"] == "#123456"
    assert any("icons differ" in d for d in _gaps(gaps, "stroke-width"))
    widths = [re.search(r'stroke-width="([^"]+)"', _outer_tag(i["iconSvg"])).group(1) for i in attrs["items"]]
    assert widths == ["1.6", "2", "1.6"]
    assert all('stroke="' not in _outer_tag(i["iconSvg"]).replace("stroke-linecap", "").replace("stroke-width", "")
               for i in attrs["items"])


def test_differing_colours_keep_every_stroke_and_lift_nothing():
    svgs = [_svg(' width="15" height="15" stroke="#123456" stroke-width="1.6"'),
            _svg(' width="15" height="15" stroke="#654321" stroke-width="1.6"')]
    attrs, _ = _convert(_ticker(svgs))
    assert "iconColour" not in attrs and attrs["iconStrokeWidth"] == 1.6
    assert [re.search(r' stroke="([^"]+)"', i["iconSvg"]).group(1) for i in attrs["items"]] == ["#123456", "#654321"]
    assert all("stroke-width" not in _outer_tag(i["iconSvg"]) for i in attrs["items"])


def test_a_stroke_that_inherits_is_left_alone():
    attrs, _ = _convert(_ticker([_svg(' width="15" height="15" stroke="currentColor"')] * 3))
    assert "iconColour" not in attrs
    assert all('stroke="currentColor"' in i["iconSvg"] for i in attrs["items"])


# ---------------------------------------------------------------------------
# The real Eye Care ticker (skips when the local run artefacts are absent)
# ---------------------------------------------------------------------------

REPO = Path(__file__).resolve().parents[5]
RUN = REPO / "pipeline-state" / "eye-care-ward-end-eye-care-birmingham-2026-09-21-175447"
needs_run = pytest.mark.skipif(
    not (RUN / "tagged-mockup.html").exists() or not (RUN / "script-bindings.json").exists(),
    reason="needs the local Eye Care run artefacts in pipeline-state",
)


@needs_run
def test_the_real_ticker_keeps_every_lifted_attribute_and_its_svgs_lose_the_dead_stroke_attributes():
    soup = BeautifulSoup((RUN / "tagged-mockup.html").read_text(encoding="utf-8"), "html.parser")
    css = "\n\n".join(t.get_text() for t in soup.find_all("style"))
    variation = RUN / "variation-d0-d2.css"
    if variation.exists() and variation.read_text(encoding="utf-8").strip():
        css += "\n\n" + variation.read_text(encoding="utf-8")
    bindings = json.loads((RUN / "script-bindings.json").read_text(encoding="utf-8"))["resolved"]
    el = BeautifulSoup(str(soup.find(class_="sgs-trust-bar")), "html.parser").find()
    del el["data-sgs-boundary-id"]
    res = convert_section(html=str(el), css=css, media_map={}, boundary_id="b1", section_id="s1", tier_bindings=bindings)
    t = json.loads(re.search(r"<!-- wp:sgs/trust-bar (\{.*?\}) /?-->", res["block_markup"], re.S).group(1))
    assert t["badgeStyle"] == "icon-bare" and t["iconBareSize"] == 15
    assert t["iconStrokeWidth"] == 1.6 and t["iconColour"] == "#9C8B78"
    assert t["labelFontSize"] == {"desktop": 12.5} and t["labelFontSizeUnit"] == "px"
    assert t["labelLetterSpacing"] == {"desktop": 0.04} and t["labelLetterSpacingUnit"] == "em"
    assert len(t["items"]) == 4
    for item in t["items"]:
        tag = _outer_tag(item["iconSvg"])
        assert "var(--acc" not in item["iconSvg"] and "stroke-width" not in tag
        assert " stroke=" not in tag
        assert "viewbox" in tag.lower() and "<path" in item["iconSvg"]

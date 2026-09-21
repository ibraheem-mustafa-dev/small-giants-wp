"""test_bare_svg_icon_lift.py -- an icon drawn as a bare inline <svg> inside a repeated item is not lost.

Measured on the Eye Care ticker: each item was ``<span class="__item"><svg>..</svg><span class="__label">..``.
The ``<svg>`` carries no BEM class, so no match tier bound it to the item's ``icon`` field and the item
lifted its label only. Now (array_content L3b) an icon-role field binds a bare ``<svg>`` child; when the
icon library does not know the drawing (``resolve_icon`` confidence 'none') the raw markup is carried into
the item's ``iconSvg`` companion, and the unknown icon is recorded as a library proposal (opt-in).

Also here: the trust-bar item-level routing that shipped with it (the badge's own gap and padding go to
``itemGap`` / ``itemPadding``; the band's items gap stays in ``gap``).

Negative controls sit beside each behaviour. Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_bare_svg_icon_lift.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import os
import re

import pytest
from bs4 import BeautifulSoup

from converter.entry import convert_section
from converter.resolvers import array_content
from converter.services import content_gap_collector as gap_collector
from converter.services import icon_resolver as ir

UNKNOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="var(--acc,#9C8B78)" stroke-width="1.6"><path d="M2 3h19v18H2z"/><path d="M7 12h9"/></svg>'
KNOWN_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5"/></svg>'


def _ticker(svg: str, *, wrap_icon: bool = False) -> str:
    icon = f'<span class="sgs-trust-bar__icon">{svg}</span>' if wrap_icon else svg
    items = "".join(
        f'<span class="sgs-trust-bar__item">{icon}<span class="sgs-trust-bar__label">Claim {n}</span></span>'
        for n in range(3)
    )
    return f'<div class="sgs-trust-bar"><div class="sgs-trust-bar__track">{items}</div></div>'


def _attrs(html: str, css: str = "") -> dict:
    res = convert_section(html=html, css=css, media_map={}, boundary_id="b1", section_id="s1")
    m = re.search(r"<!-- wp:sgs/trust-bar (\{.*?\}) /?-->", res["block_markup"], re.S)
    assert m, res["block_markup"][:200]
    return json.loads(m.group(1))


@pytest.fixture(autouse=True)
def _isolated(tmp_path, monkeypatch):
    monkeypatch.delenv(ir.PROPOSALS_ENV, raising=False)
    monkeypatch.delenv("SGS_ICON_SOURCE_DRAFT", raising=False)
    monkeypatch.delenv("SGS_RUN_LABEL", raising=False)
    monkeypatch.setattr(ir, "_PROPOSALS_DEFAULT", str(tmp_path / "default-proposals.jsonl"))
    ir._reset_caches()
    gap_collector.clear()
    yield
    ir._reset_caches()
    gap_collector.clear()


def test_fixture_svgs_are_what_the_tests_claim():
    assert ir.resolve_icon(BeautifulSoup(UNKNOWN, "html.parser").find("svg"))["confidence"] == "none"
    assert ir.resolve_icon(BeautifulSoup(KNOWN_CHECK, "html.parser").find("svg"))["slug"] == "check"


# ---- F1: the bare <svg> is bound, and unknown drawings are carried raw --------------------------------

def test_an_unknown_bare_svg_is_carried_into_iconSvg_and_the_label_still_lifts():
    items = _attrs(_ticker(UNKNOWN))["items"]
    assert [i["label"] for i in items] == ["Claim 0", "Claim 1", "Claim 2"]
    for item in items:
        assert item["iconSvg"].startswith("<svg") and 'd="M2 3h19v18H2z"' in item["iconSvg"] and "icon" not in item


def test_a_library_svg_becomes_a_slug_not_a_raw_copy():
    for item in _attrs(_ticker(KNOWN_CHECK))["items"]:
        assert item["icon"] == "check" and "iconSvg" not in item


def test_the_wrapped_icon_shape_is_unchanged():
    """`<span class=__icon><svg/></span>` already worked (L1 slot match); it must keep working, same value."""
    item = _attrs(_ticker(UNKNOWN, wrap_icon=True))["items"][0]
    assert item["iconSvg"].startswith("<svg") and "icon" not in item


def test_NEGATIVE_CONTROL_without_the_l3b_tier_the_bare_svg_is_lost(monkeypatch):
    """Break just the new tier: the item lifts its label only, exactly the measured defect."""
    monkeypatch.setattr(array_content, "_ICON_FIELD_ROLES", frozenset())
    assert _attrs(_ticker(UNKNOWN))["items"][0] == {"label": "Claim 0"}


def test_a_bare_svg_is_never_put_into_a_text_field():
    for item in _attrs(_ticker(UNKNOWN))["items"]:
        assert "<svg" not in item["label"]


# ---- F1: the unknown icon is recorded as a proposal (opt-in, env-driven) ------------------------------

def _rows(path) -> list[dict]:
    with open(path, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh.read().splitlines() if line.strip()]


def test_an_unknown_icon_is_recorded_with_the_env_supplied_draft_and_run_label(tmp_path, monkeypatch):
    log = tmp_path / "proposals.jsonl"
    monkeypatch.setenv(ir.PROPOSALS_ENV, str(log))
    monkeypatch.setenv("SGS_ICON_SOURCE_DRAFT", "sites/demo/draft.html")
    monkeypatch.setenv("SGS_RUN_LABEL", "demo-run-1")
    _attrs(_ticker(UNKNOWN))
    rows = _rows(log)
    assert len(rows) == 1                                   # three identical items, one fingerprint, one row
    assert rows[0]["source_draft"] == "sites/demo/draft.html" and rows[0]["seen_in"] == ["demo-run-1"]
    assert rows[0]["status"] == "pending" and rows[0]["raw_svg"].startswith("<svg")


def test_the_env_defaults_to_unknown(tmp_path, monkeypatch):
    log = tmp_path / "proposals.jsonl"
    monkeypatch.setenv(ir.PROPOSALS_ENV, str(log))
    _attrs(_ticker(UNKNOWN))
    assert _rows(log)[0]["source_draft"] == "unknown" and _rows(log)[0]["seen_in"] == ["unknown"]


def test_nothing_is_written_when_the_opt_in_env_is_unset(tmp_path):
    _attrs(_ticker(UNKNOWN))
    assert not os.path.exists(tmp_path / "default-proposals.jsonl")


def test_a_library_icon_is_never_recorded(tmp_path, monkeypatch):
    log = tmp_path / "proposals.jsonl"
    monkeypatch.setenv(ir.PROPOSALS_ENV, str(log))
    _attrs(_ticker(KNOWN_CHECK))
    assert not log.exists()


# ---- F4: item-level routing (badge gap / padding) and the band's own gap ------------------------------

ITEM_CSS = (
    ".sgs-trust-bar__track{display:flex;gap:6px 32px}"
    "@media (max-width:767px){.sgs-trust-bar__track{gap:0}}"
    ".sgs-trust-bar__item{display:flex;gap:9px;padding:0 4px}"
    "@media (max-width:767px){.sgs-trust-bar__item{padding:0 20px}}"
)


def test_the_badges_own_gap_and_padding_go_to_the_item_attrs():
    a = _attrs(_ticker(UNKNOWN), ITEM_CSS)
    assert a["itemGap"]["desktop"] == "9px"
    assert a["itemPadding"]["desktop"] == {"top": "0", "right": "4px", "bottom": "0", "left": "4px"}
    assert a["itemPadding"]["mobile"] == {"top": "0", "right": "20px", "bottom": "0", "left": "20px"}


def test_the_bands_items_gap_stays_in_gap_and_does_not_leak_into_itemGap():
    """The regression this guards: itemGap was classified layer GRID by the arrangement fallback, so the
    band's `gap: 6px 32px` (between badges) landed in itemGap (icon to label) and `gap` was empty."""
    a = _attrs(_ticker(UNKNOWN), ITEM_CSS)
    assert a["gap"] == {"desktop": "6px 32px", "mobile": "0"}
    assert a["itemGap"]["desktop"] == "9px"


# ---- R-31-15: the carried raw svg never brings the draft's own classes or fixed dimensions ------------

BEM_SVG = (
    '<svg class="sgs-trust-bar__icon extra-class" id="i-1" data-x="1" width="15" height="15" '
    'style="color:red" viewBox="0 0 24 24" fill="none" stroke="currentColor">'
    '<path class="sgs-trust-bar__glyph keep-me" d="M2 3h19v18H2z"/></svg>'
)


@pytest.mark.parametrize("wrap_icon", [False, True], ids=["bare-svg-l3b", "wrapped-svg"])
def test_a_bem_classed_svg_carries_no_draft_class_or_fixed_size_into_iconSvg(wrap_icon):
    for item in _attrs(_ticker(BEM_SVG, wrap_icon=wrap_icon))["items"]:
        svg = item["iconSvg"]
        assert "sgs-" not in svg, svg
        for gone in ('width="', 'height="', "style=", "id=", "data-"):
            assert gone not in svg, (gone, svg)
        assert 'd="M2 3h19v18H2z"' in svg and 'fill="none"' in svg and 'stroke="currentColor"' in svg
        assert "viewbox" in svg.lower()
        assert 'class="keep-me"' in svg, "a non-draft class on a child is not the draft's BEM and is kept"


def test_NEGATIVE_CONTROL_without_the_strip_the_draft_bem_class_reaches_the_block(monkeypatch):
    monkeypatch.setattr(ir, "_strip_svg_wrapper_attrs", lambda s: s.strip())
    svg = _attrs(_ticker(BEM_SVG))["items"][0]["iconSvg"]
    assert "sgs-trust-bar__icon" in svg and 'width="15"' in svg      # the measured defect, reproduced


def test_strip_svg_wrapper_attrs_drops_only_wrapper_wiring_and_draft_classes():
    out = ir._strip_svg_wrapper_attrs(BEM_SVG)
    assert out.startswith("<svg viewBox=") or out.startswith("<svg fill=") or out.startswith("<svg stroke=")
    assert "sgs-" not in out and "keep-me" in out and out.count("<path") == 1

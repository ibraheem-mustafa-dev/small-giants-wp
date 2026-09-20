"""test_tier_bindings.py -- a template binding the draft's own script can resolve is turned into per-device
block values instead of being dropped (plan step A1, D1132).

The orchestrator evaluates the draft script (``orchestrator/script_bindings.py``) and hands the converter
``{binding name: {mobile, tablet, desktop, intra_tier}}``. ``template_binding.resolve_binding_declarations``
substitutes it at the converter's single inline-style reader and ``collect_css_decls_for_element`` applies the
per-device text AFTER its ``@media`` fold (the draft's inline style outranks a stylesheet rule).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_tier_bindings.py -q -p no:cacheprovider
"""
from __future__ import annotations

import pytest
from bs4 import BeautifulSoup

from converter.entry import convert_section
from converter.services import content_gap_collector as gap_collector
from converter.services import template_binding
from converter.services.styling_helpers import collect_css_decls_for_element

SEC_PAD = {"mobile": "56px 20px", "tablet": "104px 52px", "desktop": "104px 52px"}
COLS = {"mobile": "minmax(0,1fr)", "tablet": "minmax(0,1fr)", "desktop": "minmax(0,1.1fr) minmax(0,1fr)"}


@pytest.fixture(autouse=True)
def _clean_state():
    template_binding.reset_tier_bindings()
    gap_collector.clear()
    yield
    template_binding.reset_tier_bindings()
    gap_collector.clear()


def _node(html: str, tag: str):
    return BeautifulSoup(html, "html.parser").find(tag)


def _gaps(reason_prefix: str) -> list[dict]:
    return [g for g in gap_collector.flush() if str(g.get("reason", "")).startswith(reason_prefix)]


# ---- resolve_binding_declarations ---------------------------------------------------------------------

def test_a_mapped_binding_resolves_to_desktop_as_the_value_and_every_tier_as_an_override() -> None:
    template_binding.configure_tier_bindings({"secPad": SEC_PAD})
    out, ov = template_binding.resolve_binding_declarations({"padding": "{{ secPad }}", "color": "red"}, _node("<p></p>", "p"))
    assert out == {"padding": "104px 52px", "color": "red"}
    assert ov["mobile"] == {"padding": "56px 20px"}
    assert ov["tablet"] == {"padding": "104px 52px"} and ov["desktop"] == {"padding": "104px 52px"}
    assert _gaps("") == []


def test_no_map_means_the_guard_alone_and_no_overrides() -> None:
    decls = {"padding": "{{ secPad }}", "color": "red"}
    out, ov = template_binding.resolve_binding_declarations(decls, _node("<p></p>", "p"))
    assert out == {"color": "red"} and ov == {}
    assert [g["property"] for g in _gaps(template_binding.GAP_REASON)] == ["padding"]


def test_a_name_missing_from_the_map_is_still_dropped_and_gapped() -> None:
    template_binding.configure_tier_bindings({"secPad": SEC_PAD})
    out, ov = template_binding.resolve_binding_declarations({"padding": "{{ secPad }}", "gap": "{{ unknownGap }}"}, _node("<p></p>", "p"))
    assert out == {"padding": "104px 52px"}
    assert set(ov["mobile"]) == {"padding"}
    assert [(g["property"], g["value"]) for g in _gaps(template_binding.GAP_REASON)] == [("gap", "{{ unknownGap }}")]


def test_a_declaration_with_one_mapped_and_one_unmapped_name_is_dropped_whole() -> None:
    template_binding.configure_tier_bindings({"a": {"mobile": "1px", "tablet": "1px", "desktop": "1px"}})
    out, ov = template_binding.resolve_binding_declarations({"padding": "{{ a }} {{ nope }}"}, _node("<p></p>", "p"))
    assert out == {} and ov == {}
    assert len(_gaps(template_binding.GAP_REASON)) == 1


def test_an_embedded_binding_is_substituted_inside_the_larger_value() -> None:
    template_binding.configure_tier_bindings({"cardMin": {"mobile": "140px", "tablet": "180px", "desktop": "220px"}})
    out, ov = template_binding.resolve_binding_declarations(
        {"grid-template-columns": "repeat(auto-fill,minmax(min(100%,{{ cardMin }}),1fr))"}, _node("<p></p>", "p"))
    assert out["grid-template-columns"] == "repeat(auto-fill,minmax(min(100%,220px),1fr))"
    assert ov["mobile"]["grid-template-columns"] == "repeat(auto-fill,minmax(min(100%,140px),1fr))"


def test_a_number_value_becomes_css_text_and_a_boolean_is_refused() -> None:
    template_binding.configure_tier_bindings({"z": {"mobile": 1, "tablet": 2.5, "desktop": 3}, "b": {"mobile": True, "tablet": True, "desktop": True}})
    out, ov = template_binding.resolve_binding_declarations({"z-index": "{{ z }}", "order": "{{ b }}"}, _node("<p></p>", "p"))
    assert out == {"z-index": "3"} and ov["tablet"] == {"z-index": "2.5"}
    assert [g["property"] for g in _gaps(template_binding.GAP_REASON)] == ["order"]


def test_a_binding_whose_breakpoint_is_still_inside_a_tier_is_resolved_and_the_sliver_is_gapped() -> None:
    template_binding.configure_tier_bindings({"prodCols": {
        "mobile": "repeat(2,1fr)", "tablet": "repeat(2,1fr)", "desktop": "repeat(3,1fr)",
        "intra_tier": {"desktop": [{"from": 1024, "to": 1279, "value": "repeat(3,1fr)"}, {"from": 1280, "to": 2560, "value": "repeat(4,1fr)"}]}}})
    out, _ = template_binding.resolve_binding_declarations({"grid-template-columns": "{{ prodCols }}"}, _node("<p></p>", "p"))
    assert out == {"grid-template-columns": "repeat(3,1fr)"}
    gaps = _gaps(template_binding.INTRA_TIER_GAP_REASON)
    assert len(gaps) == 1 and "desktop from 1280" in gaps[0]["reason"] and "repeat(4,1fr)" in gaps[0]["reason"]


# ---- collect_css_decls_for_element --------------------------------------------------------------------

def test_the_reader_returns_desktop_as_base_and_the_differing_tiers_as_overrides() -> None:
    template_binding.configure_tier_bindings({"secPad": SEC_PAD})
    base, bp = collect_css_decls_for_element(_node('<section style="padding: {{ secPad }}"></section>', "section"), {})
    assert base == {"padding": "104px 52px"}
    assert bp == {"Mobile": {"padding": "56px 20px"}}            # tablet equals desktop: no redundant tablet value


def test_a_uniform_binding_writes_no_tier_override() -> None:
    template_binding.configure_tier_bindings({"g": {"mobile": "10px", "tablet": "10px", "desktop": "10px"}})
    base, bp = collect_css_decls_for_element(_node('<div style="gap: {{ g }}"></div>', "div"), {})
    assert base == {"gap": "10px"} and bp == {}


def test_the_draft_inline_value_beats_a_stylesheet_media_rule_at_every_tier() -> None:
    """The overlay is applied after the @media fold. A stylesheet rule that sets padding on the same element for
    tablet must NOT win over the draft's own inline binding."""
    template_binding.configure_tier_bindings({"secPad": SEC_PAD})
    node = BeautifulSoup('<section class="s" style="padding: {{ secPad }}"></section>', "html.parser").find("section")
    rules = {"@media (min-width: 768px) :: .s": {"padding": "9px"}}
    base, bp = collect_css_decls_for_element(node, rules)
    assert base == {"padding": "104px 52px"}                      # desktop: the inline value, not the media rule's 9px
    assert "Tablet" not in bp or "padding" not in bp["Tablet"]
    assert bp["Mobile"] == {"padding": "56px 20px"}


def test_a_state_probe_with_include_inline_false_gets_nothing() -> None:
    template_binding.configure_tier_bindings({"secPad": SEC_PAD})
    base, bp = collect_css_decls_for_element(_node('<section style="padding: {{ secPad }}"></section>', "section"), {}, include_inline=False)
    assert base == {} and bp == {}


def test_a_node_without_bindings_is_byte_identical_with_and_without_a_map() -> None:
    node = _node('<h2 style="font-size:46px;margin:0">Hi</h2>', "h2")
    without = collect_css_decls_for_element(node, {})
    template_binding.configure_tier_bindings({"secPad": SEC_PAD})
    assert collect_css_decls_for_element(node, {}) == without


# ---- convert_section, end to end ----------------------------------------------------------------------

HTML = ('<section style="padding: {{ secPad }};background:#fff"><div style="display:grid;'
        'grid-template-columns: {{ twoColWide }};gap:16px"><p>a</p><p>b</p></div></section>')


def test_convert_section_writes_the_per_device_values_and_no_raw_binding() -> None:
    r = convert_section(html=HTML, css="", media_map={}, tier_bindings={"secPad": SEC_PAD, "twoColWide": COLS})
    markup = r["block_markup"]
    assert r["status"] == "complete"
    assert "{{" not in markup and "secPad" not in markup and "twoColWide" not in markup
    assert "104px" in markup and "56px" in markup                  # desktop/tablet value and the mobile value both landed
    assert "minmax(0,1.1fr) minmax(0,1fr)" in markup               # the authored ratio survives untouched
    assert [g for g in r["content_gaps"] if g.get("reason") == template_binding.GAP_REASON] == []
    assert " style=" not in markup.replace("<style", "")           # rule 6: no inline responsive value


def test_convert_section_without_a_map_still_drops_and_gaps_as_before() -> None:
    r = convert_section(html=HTML, css="", media_map={})
    assert "{{" not in r["block_markup"] and "104px" not in r["block_markup"]
    assert {g["property"] for g in r["content_gaps"] if g.get("reason") == template_binding.GAP_REASON} == {"padding", "grid-template-columns"}


def test_one_sections_map_never_leaks_into_the_next() -> None:
    convert_section(html=HTML, css="", media_map={}, tier_bindings={"secPad": SEC_PAD, "twoColWide": COLS})
    assert template_binding._TIER_BINDINGS == {}
    r = convert_section(html=HTML, css="", media_map={})
    assert "104px" not in r["block_markup"]


def test_negative_control_without_the_overlay_the_stylesheet_rule_would_win(monkeypatch) -> None:
    """Prove the media-rule test can fail: neutralise the overlay and the 9px stylesheet value wins at desktop."""
    template_binding.configure_tier_bindings({"secPad": SEC_PAD})
    monkeypatch.setattr(template_binding, "resolve_binding_declarations",
                        lambda decls, node: (template_binding.drop_unresolved_bindings(decls, node), {}))
    from converter.services import styling_helpers
    monkeypatch.setattr(styling_helpers, "resolve_binding_declarations", template_binding.resolve_binding_declarations)
    node = BeautifulSoup('<section class="s" style="padding: {{ secPad }}"></section>', "html.parser").find("section")
    base, _bp = collect_css_decls_for_element(node, {"@media (min-width: 768px) :: .s": {"padding": "9px"}})
    assert base.get("padding") != "104px 52px"

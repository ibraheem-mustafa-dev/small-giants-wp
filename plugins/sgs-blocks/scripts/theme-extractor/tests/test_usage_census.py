"""Usage census + promotion tests (Spec 33 palette overlay).

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_usage_census.py -q
"""
from __future__ import annotations

import pathlib
import re
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))

import declared_sources as ds  # noqa: E402
import usage_census as uc  # noqa: E402

DRAFT = REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care" / "Eye Care Birmingham.dc.html"


def _spans(colour: str, n: int, prop: str = "color") -> str:
    return "".join(f'<span style="{prop}:{colour}">x</span>' for _ in range(n))


def test_hex_forms_normalise_and_families_split():
    census = uc.census_colours(
        '<p style="color:#abc; background:rgb(17,34,51); border:1px solid #AABBCC;'
        'outline:2px solid #aabbcc; fill:#123456">x</p>'
    )
    assert census["#AABBCC"]["by_family"] == {"text": 1, "background": 0, "border": 1, "fill": 0, "outline": 1}
    assert census["#112233"]["by_family"]["background"] == 1
    assert census["#123456"]["by_family"]["fill"] == 1
    assert census["#AABBCC"]["sources"] == {"html": 3, "style_block": 0, "js_bound": 0}


def test_style_hover_counts_as_hover_and_style_block_is_read():
    html = ('<style>.a{color:#111111} .a:hover{color:#222222}</style>'
            '<a style="color:#333333" style-hover="color:#444444">x</a>')
    census = uc.census_colours(html)
    assert census["#444444"]["by_state"] == {"rest": 0, "hover": 1}
    assert census["#333333"]["by_state"] == {"rest": 1, "hover": 0}
    assert census["#111111"]["sources"]["style_block"] == 1
    assert census["#222222"]["by_state"]["hover"] == 1


def test_label_like_and_body_like():
    html = ('<p style="color:#111111;text-transform:uppercase">a</p>'
            '<p style="color:#111111;letter-spacing:.1em">b</p>'
            '<p style="color:#111111;letter-spacing:.02em">c</p>')
    entry = uc.census_colours(html)["#111111"]
    assert (entry["label_like"], entry["body_like"]) == (2, 1)


def test_data_image_payload_is_stripped():
    html = '<div style="background:url(data:image/png;base64,AAAA#FF0000BBBB) #123456"></div>'
    assert list(uc.census_colours(html)) == ["#123456"]


def test_translucent_counted_under_rgba_string_and_never_promoted():
    census = uc.census_colours(_spans("rgba(0,0,0,.5)", 40))
    assert "rgba(0,0,0,0.5)" in census
    assert uc.promote(census, {"rgba(0,0,0,0.5)"}) == {}
    assert uc.explain_rejections(census, set())["rgba(0,0,0,0.5)"] == "translucent"


def test_declared_colour_with_two_uses_is_promoted():
    census = uc.census_colours(_spans("#9c8b78", 2, "background"))
    promoted = uc.promote(census, {"#9C8B78"})
    assert promoted["#9C8B78"] == {"colour": "#9C8B78", "family": "background", "basis": "declared+used",
                                   "uses": 2, "share": 1.0}


def test_declared_but_unused_is_rejected_with_reason():
    reasons = uc.explain_rejections(uc.census_colours(_spans("#111111", 1)), {"#999999"})
    assert reasons["#999999"] == "declared but never used in its claimed family"


def test_undeclared_threshold_24_rejected_25_promoted():
    below = uc.census_colours(_spans("#5E584F", 24))
    at = uc.census_colours(_spans("#5E584F", 25))
    assert uc.promote(below, set()) == {}
    assert uc.explain_rejections(below, set())["#5E584F"] == "undeclared, 24 uses below 25"
    assert uc.promote(at, set())["#5E584F"]["basis"] == "undeclared-consistent"


def test_undeclared_split_across_families_is_rejected():
    census = uc.census_colours(_spans("#5E584F", 30) + _spans("#5E584F", 20, "border-color"))
    assert uc.promote(census, set()) == {}
    assert uc.explain_rejections(census, set())["#5E584F"] == "used across families: text 60% / border 40%"


def test_js_bound_ternary_counted_and_lookup_table_ignored():
    html = ('<div><p style="color: {{ r.colour }}; letter-spacing:.1em">x</p></div>'
            '<script type="text/x-dc">'
            "const COLS = {blk:['Black','#1b1b1b'], gld:['Gold','#C6A469']};"
            "rows = data.map(r => ({colour: cond ? '#111111' : '#666666', name: 'x'}));"
            "</script>")
    census = uc.census_colours(html)
    assert census["#111111"]["sources"]["js_bound"] == 1
    assert census["#666666"]["by_family"]["text"] == 1
    assert census["#666666"]["label_like"] == 1
    assert "#1B1B1B" not in census and "#C6A469" not in census


def test_js_colour_not_bound_to_any_style_is_content():
    html = ('<p style="color:#123456">x</p><script type="text/x-dc">'
            "const s = {colour: '#ABCDEF', accent: '#FEDCBA'};</script>")
    assert list(uc.census_colours(html)) == ["#123456"]


def test_same_key_name_under_two_bindings_is_disambiguated_by_sibling_keys():
    html = ('<i style="background: {{ r.colour }}">a</i>'
            '<b style="border-bottom: 2px solid {{ t.line }}; color: {{ t.colour }}">b</b>'
            '<script type="text/x-dc">tabs = [{line: on ? "#141414" : "transparent", '
            'colour: on ? "#141414" : "#8B8478"}];</script>')
    census = uc.census_colours(html)
    assert census["#8B8478"]["by_family"] == {"text": 1, "background": 0, "border": 0, "fill": 0, "outline": 0}
    assert census["#141414"]["by_family"]["background"] == 0


def test_non_dc_document_ignores_all_script_text():
    html = '<p style="color:#123456">x</p><script>var s = {colour: "#ABCDEF"};</script>'
    assert list(uc.census_colours(html)) == ["#123456"]


def test_determinism_and_ordering():
    html = _spans("#222222", 3) + _spans("#111111", 3) + _spans("#333333", 5)
    first, second = uc.census_colours(html), uc.census_colours(html)
    assert first == second and list(first) == list(second) == ["#333333", "#111111", "#222222"]
    decl = {"#111111", "#222222"}
    assert list(uc.promote(first, decl)) == list(uc.promote(second, decl)) == ["#111111", "#222222"]


# A template object whose `note` string holds a brace, then a sibling that decides which of two bound
# objects (`t.tone` beside `t.edge`, `r.tone` beside `r.rim`) a colour belongs to.
_TWO_OBJECTS = (
    '<p style="color:{{ t.tone }};border-color:{{ t.edge }}"></p>'
    '<p style="background:{{ r.tone }};border-color:{{ r.rim }}"></p>'
    """<script type="text/x-dc">const rows = [{ rim:'x', %s, tone:'#AA0000' }];</script>""")


@pytest.mark.parametrize("note", ["note:'use the { sign'", 'note:"a } here"', "note:`open ( [`",
                                  "note:'it\\'s { odd'"])
def test_a_bracket_inside_a_string_does_not_change_which_object_a_colour_belongs_to(note):
    entry = uc.census_colours(_TWO_OBJECTS % note)["#AA0000"]
    assert (entry["by_family"]["background"], entry["by_family"]["text"]) == (1, 0)   # r.tone, not t.tone


def test_a_brace_in_a_comment_is_not_structure_either():
    html = _TWO_OBJECTS % "note:1 /* { */"
    assert uc.census_colours(html)["#AA0000"]["by_family"]["text"] == 0
    assert uc.census_colours(_TWO_OBJECTS % ("note:2 // {" + chr(10)))["#AA0000"]["by_family"]["text"] == 0


def test_out_of_range_rgb_channels_clamp_and_never_yield_a_malformed_hex():
    census = uc.census_colours('<p style="color:rgb(999,300,0);background:rgba(0,0,999,0.5);'
                               'border-color:rgb(1,2,3,.)">x</p>')
    assert "#FFFF00" in census and "rgba(0,0,255,0.5)" in census and "#010203" in census
    assert all(re.fullmatch(r"#[0-9A-F]{6}|rgba\(\d{1,3},\d{1,3},\d{1,3},[\d.]+\)", key) for key in census)
    assert uc._normalise(uc.COLOUR_RE.fullmatch("rgb(999,999,999)")) == "#FFFFFF"


def test_only_a_whole_rrggbb_is_promotable():
    census = uc.census_colours(_spans("rgba(1,2,3,0.5)", 30))
    census["#12345"] = dict(census["rgba(1,2,3,0.5)"])     # a malformed key can never be promoted
    census["#12345"]["uses"] = 40
    promoted = uc.promote(census, {"#12345"})
    assert promoted == {}
    assert uc.explain_rejections(census, {"#12345"})["#12345"] == "not an opaque #RRGGBB colour"


@pytest.mark.skipif(not DRAFT.exists(), reason="Eye Care draft not present")
class TestRealDraft:
    @pytest.fixture(scope="class")
    def census(self):
        return uc.census_colours(DRAFT.read_text(encoding="utf-8"))

    def test_body_grey_is_text_and_frequent(self, census):
        assert census["#5E584F"]["by_family"]["text"] >= 50

    def test_meta_grey_promotes_only_when_declared(self, census):
        assert "#6B655E" not in uc.promote(census, set())
        assert "#6B655E" in uc.promote(census, {"#6B655E"})

    def test_placeholder_grey_is_all_text(self, census):
        entry = census["#8B8478"]
        assert entry["uses"] == entry["by_family"]["text"] > 0

    def test_script_only_swatch_colours_are_absent(self, census):
        assert "#C6A469" not in census and "#7D5030" not in census

    def test_repeat_run_identical(self, census):
        assert census == uc.census_colours(DRAFT.read_text(encoding="utf-8"))

    def test_bound_product_swatch_gradients_are_counted_but_never_promoted(self, census):
        """The module docstring's claim: a swatch bound into `background:{{ o.swatch }}` IS a content
        colour in the census (7 of them, all background), and only the undeclared 25-use floor plus the
        declared-colour requirement keep them out of the palette."""
        swatches = ["#2F2F2F", "#3F3F3F", "#4A4A4A", "#5F5F5F", "#7A7A7A", "#F4F4F4"]
        assert all(census[c]["sources"]["js_bound"] == 1 and census[c]["by_family"]["background"] == 1
                   for c in swatches)
        assert not set(swatches) & set(uc.promote(census, set()))
        readme_hexes = {h for row in ds.read_readme_tokens(DRAFT.parent)["colours"] for h in row["hexes"]}
        assert not set(swatches) & set(uc.promote(census, readme_hexes))

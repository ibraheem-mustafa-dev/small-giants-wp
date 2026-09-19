"""Spec 33 declared-source readers: README design tokens + script variant sets.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_declared_sources.py -q
"""
from __future__ import annotations

import pathlib
import shutil
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))

import declared_sources as ds  # noqa: E402
import variant_sets as vs  # noqa: E402

FIXTURES = HERE / "fixtures"
EYE_CARE = REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care"
MAMAS = REPO / "sites" / "mamas-munches" / "mockups" / "homepage"


@pytest.fixture()
def readme_folder(tmp_path: pathlib.Path) -> pathlib.Path:
    # Mixed-case name proves the lookup is case-insensitive.
    shutil.copy(FIXTURES / "declared-readme.md", tmp_path / "ReadMe.MD")
    return tmp_path


# ---- (a) README, synthetic fixture -------------------------------------------------------------

def test_readme_missing_returns_not_found(tmp_path):
    assert ds.read_readme_tokens(tmp_path) == {"found": False}


def test_readme_colour_table(readme_folder):
    out = ds.read_readme_tokens(readme_folder)
    assert out["found"] is True and out["path"].lower().endswith("readme.md")
    by_name = {r["name"]: r for r in out["colours"]}
    assert by_name["Page background"]["hexes"] == ["#FAF8F5"]  # normalised uppercase
    assert by_name["Page background"]["use"] == "Body, header"
    assert by_name["Short hex"]["hexes"] == ["#FFFFFF"]        # 3-digit expanded
    # Several hexes plus prose: every hex kept, in order, first is primary.
    assert by_name["Messaging"]["hexes"] == ["#25D366", "#0B2B17", "#E9F9EF", "#B7E5C7"]
    assert "on `#0B2B17` text" in by_name["Messaging"]["value_raw"]
    # A row with no hex is kept (it may be a font or size).
    assert by_name["Display face"]["hexes"] == []
    # A table with no token/value columns is not a colour table.
    assert "/" not in by_name and "Home" not in {r["use"] for r in out["colours"]}


def test_readme_fonts(readme_folder):
    fonts = {f["family"]: f for f in ds.read_readme_tokens(readme_folder)["fonts"]}
    assert fonts["Serif Display"] == {
        "role": "display", "family": "Serif Display", "weights": [500, 600, 700], "scoped": False}
    assert fonts["Sans Body"]["role"] == "body"
    assert fonts["Sans Body"]["weights"] == [300, 400, 500, 600]  # range expanded
    assert fonts["Roboto"]["scoped"] is True
    assert fonts["Roboto"]["weights"] == [400, 500]
    assert len(fonts) == 3  # the "Scale:" bullet is not a font


def test_readme_layout(readme_folder):
    layout = ds.read_readme_tokens(readme_folder)["layout"]
    assert layout["max_content_width"] == "1440px"
    assert layout["border_radius"].startswith("`0` almost everywhere")
    assert layout["shadows"] == ["0 30px 70px rgba(0,0,0,.18)"]
    assert layout["spacing"]["Section padding"] == "`104px 52px` desktop / `56px 20px` mobile."
    assert "Grid gaps" in layout["spacing"]
    assert "Max content width" not in layout["spacing"]


def test_readme_absent_facts_are_absent(tmp_path):
    (tmp_path / "README.md").write_text("# Only prose\n\nNothing declared.\n", encoding="utf-8")
    out = ds.read_readme_tokens(tmp_path)
    assert out == {"found": True, "path": str(tmp_path / "README.md"), "colours": [], "fonts": [], "layout": {}}


def test_readme_output_is_json_serialisable(readme_folder):
    import json
    out = ds.read_readme_tokens(readme_folder)
    assert out["found"] and out["colours"]          # a real table was read, not an empty shell
    assert json.loads(json.dumps(out)) == out       # survives a JSON round trip unchanged


# ---- (b) variant sets, inline HTML -------------------------------------------------------------

_PROPS = ('data-props="{&quot;accent&quot;:{&quot;editor&quot;:&quot;enum&quot;,&quot;default&quot;:'
          '&quot;taupe&quot;,&quot;options&quot;:[&quot;taupe&quot;,&quot;sage&quot;,&quot;navy&quot;],'
          '&quot;tsType&quot;:&quot;\'taupe\'|\'sage\'|\'navy\'&quot;},'
          '&quot;reduceMotion&quot;:{&quot;editor&quot;:&quot;boolean&quot;,&quot;default&quot;:false}}"')
_EXPECTED = {
    "accent": {
        "default": "taupe",
        "options": ["taupe", "sage", "navy"],
        "sets": {
            "taupe": {"acc": "#9C8B78", "ink": "#6F6152", "soft": "#EFEAE2"},
            "sage": {"acc": "#8A9A86", "ink": "#55654F", "soft": "#E8ECE6"},
            "navy": {"acc": "#3A4A6B", "ink": "#2B3A55", "soft": "#E4E7EE"},
        },
    }
}


def test_variant_sets_single_quotes_trailing_comma():
    html = (f'<div {_PROPS}></div><script type="text/x-dc">class A {{ static ACC = {{\n'
            "  taupe:{acc:'#9C8B78',ink:'#6F6152',soft:'#EFEAE2'},\n"
            "  sage:{acc:'#8A9A86',ink:'#55654F',soft:'#E8ECE6'},\n"
            "  navy:{acc:'#3A4A6B',ink:'#2B3A55',soft:'#E4E7EE'},\n"
            "}; }</script>")
    assert vs.read_script_variant_sets(html) == _EXPECTED


def test_variant_sets_double_quotes_whitespace_lowercase_hex():
    html = (f'<div {_PROPS}></div><script>const ACC = {{ "taupe" : {{ "acc" : "#9c8b78", "ink":"#6f6152", '
            '"soft": "#efeae2" }, "sage": { "acc": "#8a9a86", "ink": "#55654f", "soft": "#e8ece6" },\n'
            '"navy": { "acc": "#3a4a6b", "ink": "#2b3a55", "soft": "#e4e7ee", }, };</script>')
    assert vs.read_script_variant_sets(html) == _EXPECTED


def test_variant_sets_ignores_decoy_literal_and_strings_with_braces():
    html = (f'<div {_PROPS}></div><script>var decoy = {{taupe:{{note:"no hex"}}}};'
            "var s = 'a } brace';"
            "var ACC = {taupe:{acc:'#9C8B78',ink:'#6F6152',soft:'#EFEAE2'},"
            "sage:{acc:'#8A9A86',ink:'#55654F',soft:'#E8ECE6'},"
            "navy:{acc:'#3A4A6B',ink:'#2B3A55',soft:'#E4E7EE'}};</script>")
    assert vs.read_script_variant_sets(html) == _EXPECTED


def test_variant_sets_option_names_match_no_object():
    html = (f'<div {_PROPS}></div><script>var X = {{red:{{a:"#FF0000"}}, green:{{a:"#00FF00"}}}};</script>')
    assert vs.read_script_variant_sets(html) == {}


def test_variant_sets_partial_match_is_rejected():
    html = (f'<div {_PROPS}></div><script>var X = {{taupe:{{a:"#9C8B78"}}, sage:{{a:"#8A9A86"}}}};</script>')
    assert vs.read_script_variant_sets(html) == {}


def test_variant_sets_no_enum_prop_or_bad_json():
    assert vs.read_script_variant_sets("<html><script>var a = {taupe:{a:'#FFFFFF'}};</script></html>") == {}
    assert vs.read_script_variant_sets('<div data-props="{not json"></div>') == {}


# ---- (c) real Eye Care draft -------------------------------------------------------------------

_SKIP_EYE = pytest.mark.skipif(not EYE_CARE.is_dir(), reason=f"Eye Care draft folder absent: {EYE_CARE}")


@_SKIP_EYE
def test_eye_care_readme():
    out = ds.read_readme_tokens(EYE_CARE)
    assert out["found"] is True
    hexes = {h for row in out["colours"] for h in row["hexes"]}
    assert {"#FAF8F5", "#9C8B78", "#6F6152", "#EFEAE2", "#25D366"} <= hexes
    fonts = {f["family"]: f for f in out["fonts"]}
    assert fonts["Playfair Display"]["role"] == "display"
    assert fonts["Roboto"]["scoped"] is True
    assert out["layout"]["max_content_width"] == "1440px"


@_SKIP_EYE
def test_eye_care_variant_sets():
    html = (EYE_CARE / "Eye Care Birmingham.dc.html").read_text(encoding="utf-8")
    accent = vs.read_script_variant_sets(html)["accent"]
    assert accent["default"] == "taupe"
    assert accent["options"] == ["taupe", "sage", "navy"]
    assert accent["sets"]["navy"]["acc"] == "#3A4A6B"
    assert accent["sets"]["taupe"] == {"acc": "#9C8B78", "ink": "#6F6152", "soft": "#EFEAE2"}


# ---- (d) static-draft client (Mama's) ----------------------------------------------------------

@pytest.mark.skipif(not MAMAS.is_dir(), reason=f"Mama's mockup folder absent: {MAMAS}")
def test_static_draft_declares_nothing():
    assert ds.read_readme_tokens(MAMAS) == {"found": False}
    html = (MAMAS / "index.html").read_text(encoding="utf-8")
    assert vs.read_script_variant_sets(html) == {}

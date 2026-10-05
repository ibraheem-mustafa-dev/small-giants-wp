"""
test_seeder_routing.py
======================
The css_property seeder (`behavioural-analyser/extract-signatures.py`) must route
every setting that paints. One test per routing gap the 2026-10-04 route-data audit
measured (.claude/reports/2026-10-04-route-data-audit/README.md §2), each on a
minimal PHP fixture run through the seeder's own functions:

  A   helper suffixes are derived from the helper source, not a hand list
  B   PHP files beside render.php in the block folder are read
  C1  callees of a function the block hands $attributes to are followed
  C2  includes/ emitters, including a loop over a literal prefix map
  D1  value-helper arguments are derived from the helper source
  D2  a config map passed by variable is read
  D3  a custom property set by one block and read by another block's CSS
  D5  interpolated strings and composite `transition` values
  G   box-shaped per-device settings declare supports.sgs.boxFamilies
      statement splitting: a selector variable after a `}` is still traced
      overrides: the three corrected routes, no entries for missing rows
      DB path: $SGS_FRAMEWORK_DB, and sgs-update-v2.py --db skips children
      that would write the default DB

SEEDER_ROOT (optional) points the suite at another checkout's plugins/sgs-blocks,
which is how the "fails without the fix" run is made against HEAD.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_seeder_routing.py -v
"""

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

PLUGIN_ROOT = Path(os.environ.get("SEEDER_ROOT") or Path(__file__).resolve().parents[2])
ANALYSER = PLUGIN_ROOT / "scripts" / "behavioural-analyser"
sys.path.insert(0, str(ANALYSER))


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, str(path))
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


es = _load("extract_signatures_under_test", ANALYSER / "extract-signatures.py")


def _extended(php: str, attrs: set[str], slug: str, tmp_path: Path, includes: str = "", siblings: "dict[str, str] | None" = None) -> dict:
    """Run the supplementary pass on a fixture block folder and fixture includes."""
    import php_include_graph
    import php_source_index
    import seeder_shapes

    block_dir = tmp_path / slug
    block_dir.mkdir()
    (block_dir / "render.php").write_text(php, encoding="utf-8")
    for name, text in (siblings or {}).items():
        (block_dir / name).write_text(text, encoding="utf-8")
    contracts = es._helper_contracts()
    index = dict(contracts["index"])
    for fn in php_source_index.parse_functions(es._strip_php_comments(includes), tmp_path / "fixture.php"):
        index[fn.name] = fn
    own = es._strip_php_comments(php)
    ext, ext_own = php_include_graph.extended_source(
        own, own, block_dir, index,
        set(contracts["prefix_helpers"]) | set(contracts["composers"]),
        set(contracts["prefix_helpers"]), set(es._CONFIG_MAP_BASE_HOVER_PROPS),
        es._strip_php_comments,
    )
    return seeder_shapes.gather_php_evidence(es, ext, ext_own, slug, attrs, contracts["vocab"], extended=True)


# ── A: helper suffix maps derived from the helper source ──────────────────────

def test_a_typography_helper_suffixes_come_from_the_helper_body():
    php = "$css = sgs_typography_css_rule( $attributes, 'attribution', '.u .sgs-quote__attribution' );"
    attrs = {"attributionFontFamily", "attributionTextAlign", "attributionTextWrap",
             "attributionTextColumns", "attributionWritingMode", "attributionFontSize"}
    props, elements = es._attrs_from_helper_calls(php, attrs, "quote")
    assert props["attributionFontFamily"] == {"font-family"}
    assert props["attributionTextAlign"] == {"text-align"}
    assert props["attributionTextWrap"] == {"text-wrap"}
    assert props["attributionTextColumns"] == {"column-count"}
    assert props["attributionWritingMode"] == {"writing-mode"}
    assert props["attributionFontSize"] == {"font-size"}
    assert elements["attributionFontFamily"] == {"attribution"}


def test_a_derived_contracts_cover_every_former_hand_entry():
    former = {
        "sgs_button_element_style_css": {
            "ColourBackground": "background-color", "ColourText": "color", "ColourBorder": "border-color",
            "ColourBackgroundHover": "background-color", "ColourTextHover": "color",
            "ColourBorderHover": "border-color", "BorderStyle": "border-style", "BorderWidth": "border-width",
            "BorderRadius": "border-radius", "FontWeight": "font-weight", "FontSize": "font-size",
            "Padding": "padding", "WidthType": "width",
        },
        "sgs_typography_css_rule": {
            "FontSize": "font-size", "FontSizeTablet": "font-size", "FontSizeMobile": "font-size",
            "LineHeight": "line-height", "LineHeightTablet": "line-height", "LineHeightMobile": "line-height",
            "LetterSpacing": "letter-spacing", "LetterSpacingTablet": "letter-spacing",
            "LetterSpacingMobile": "letter-spacing", "FontWeight": "font-weight", "FontStyle": "font-style",
            "TextTransform": "text-transform", "TextDecoration": "text-decoration",
        },
    }
    helpers = es._helper_contracts()["prefix_helpers"]
    for helper, suffixes in former.items():
        for suffix, prop in suffixes.items():
            assert helpers[helper].suffix_props.get(suffix) == {prop}, (helper, suffix)
    composers = es._helper_contracts()["composers"]
    assert composers["sgs_overlay_decls"] == {
        0: {"background-color"}, 1: {"background-image"}, 2: {"opacity"}, 3: {"mix-blend-mode"},
    }


# ── D1: value helpers derived from the helper source ──────────────────────────

def test_d1_value_helper_arguments_route():
    php = "$decl = sgs_background_paint_decl( $attributes['fillColour'], $attributes['fillGradient'] );"
    props = es._attrs_from_value_composer_calls(php, {})
    assert props["fillColour"] == {"background-color"}
    assert props["fillGradient"] == {"background-image"}


# ── statement splitting: a selector variable after a closing brace ────────────

def test_selector_variable_after_a_closing_brace_is_traced():
    php = (
        "if ( $x ) {\n\t$y = 1;\n}\n"
        "$label_selector = '.' . $uid . ' .sgs-whatsapp-cta__label';\n"
        "$css = sgs_typography_css_rule( $attributes, 'label', $label_selector );\n"
    )
    elements, _states = es._build_php_selector_var_map(php, "whatsapp-cta")
    assert elements.get("label_selector") == "label"
    _props, helper_elements = es._attrs_from_helper_calls(php, {"labelFontSize"}, "whatsapp-cta")
    assert helper_elements["labelFontSize"] == {"label"}


# ── B: sibling PHP files ──────────────────────────────────────────────────────

def test_b_sibling_php_file_is_read(tmp_path):
    variant = "<?php\n$css .= sgs_typography_css_rule( $attributes, 'cardTitle', '.u .sgs-whatsapp-cta__card-title' );\n"
    ev = _extended("<?php\ninclude __DIR__ . '/variant-render.php';\n", {"cardTitleFontSize"},
                   "whatsapp-cta", tmp_path, siblings={"variant-render.php": variant})
    assert ev["raw"]["cardTitleFontSize"] == {"font-size"}


# ── C1/C2: includes callees, fixed and loop prefixes ──────────────────────────

_INCLUDES = """<?php
function sgs_fixture_panel_css( array $attrs, string $uid ): array {
	$css   = array();
	$css[] = sgs_fixture_inner_css( $attrs, $uid );
	$typography = array(
		'panelTitle' => '.sgs-cart__panel-heading',
		'itemName'   => '.sgs-cart__item-name',
	);
	foreach ( $typography as $prefix => $sel ) {
		$css[] = sgs_typography_css_rule( $attrs, $prefix, '.' . $uid . ' ' . $sel );
	}
	$paints = array(
		'panelCountColour' => array( '.sgs-cart__panel-count', 'color' ),
	);
	return $css;
}
function sgs_fixture_inner_css( array $attributes, string $uid ): string {
	return '.' . $uid . ' .sgs-cart__panel{border-top-width:' . absint( $attributes['panelRuleWidth'] ?? 0 ) . 'px;}';
}
"""


def test_c_includes_callees_and_prefix_loops_route(tmp_path):
    php = "<?php\n$rules = sgs_fixture_panel_css( $attributes, $uid );\n"
    attrs = {"panelTitleFontSize", "itemNameFontFamily", "panelCountColour", "panelRuleWidth"}
    ev = _extended(php, attrs, "cart", tmp_path, includes=_INCLUDES)
    assert ev["raw"]["panelTitleFontSize"] == {"font-size"}
    assert ev["raw"]["itemNameFontFamily"] == {"font-family"}
    assert ev["raw"]["panelCountColour"] == {"color"}
    assert ev["raw"]["panelRuleWidth"] == {"border-top-width"}
    assert ev["helper_elements"]["panelTitleFontSize"] == {"panel-heading"}


# ── D2: config map passed by variable ─────────────────────────────────────────

def test_d2_config_map_held_in_a_variable(tmp_path):
    php = (
        "<?php\n$map = array(\n\t'base' => 'backgroundColour',\n\t'hover' => 'backgroundColourHover',\n);\n"
        "$decls = sgs_fill_decls( $attributes, $map );\n"
    )
    ev = _extended(php, {"backgroundColour", "backgroundColourHover"}, "feature-grid", tmp_path)
    assert ev["config_map_props"]["backgroundColourHover"] == {"background-color"}
    assert ev["config_map_states"]["backgroundColourHover"] == {"hover"}


# ── D5: interpolated strings and composite transition ─────────────────────────

def test_d5_double_quoted_composite_transition(tmp_path):
    php = (
        "<?php\n$transition_duration = absint( $attributes['transitionDuration'] ?? 300 );\n"
        "$transition_easing = (string) ( $attributes['transitionEasing'] ?? 'ease' );\n"
        "$css[] = \".{$uid}.sgs-button{transition:all {$transition_duration}ms {$transition_easing};}\";\n"
    )
    ev = _extended(php, {"transitionDuration", "transitionEasing"}, "button", tmp_path)
    assert ev["raw"]["transitionDuration"] == {"transition-duration"}
    assert ev["raw"]["transitionEasing"] == {"transition-timing-function"}


# ── D3: custom property read by another block's stylesheet ────────────────────

def test_d3_custom_property_read_by_another_block(tmp_path):
    import seeder_shapes

    for slug, css in (("parent", ".sgs-parent{display:flex}"),
                      ("child", ".sgs-child{border-color:var(--sgs-parent-child-border)}")):
        (tmp_path / slug).mkdir()
        (tmp_path / slug / "style.css").write_text(css, encoding="utf-8")
    cross = seeder_shapes.CrossBlockCss(es, tmp_path)
    assert cross.resolve("--sgs-parent-child-border", "parent") == {"border-color"}


# ── G: box families declared ──────────────────────────────────────────────────

def test_g_box_shaped_tiers_declare_box_families():
    result = subprocess.run(
        ["node", str(PLUGIN_ROOT / "scripts" / "codemods" / "add-box-families.js"), "--check"],
        capture_output=True, text=True, encoding="utf-8",
    )
    assert result.returncode == 0, result.stdout + result.stderr
    cart = json.loads((PLUGIN_ROOT / "src" / "blocks" / "cart" / "block.json").read_text(encoding="utf-8"))
    assert cart["supports"]["sgs"]["boxFamilies"]["panelHeadPadding"] == ["panelHeadPadding"]


# ── overrides ────────────────────────────────────────

def _overrides() -> dict:
    data = json.loads((PLUGIN_ROOT / "scripts" / "attr-classification-overrides.json").read_text(encoding="utf-8"))
    return {(e["slug"], e["attr"]): e["fields"] for e in data["entries"]}


def test_wrong_routes_are_corrected():
    ov = _overrides()
    assert ov[("sgs/testimonial", "ratingSize")]["css_property"] == "height,width"
    assert ov[("sgs/nav-bar-menu", "collapsePoint")]["css_property"] is None
    assert ov[("sgs/nav-drawer", "modality")]["css_property"] is None


def test_every_override_points_at_a_declared_attribute():
    declared = set()
    for bj in (PLUGIN_ROOT / "src" / "blocks").glob("*/block.json"):
        j = json.loads(bj.read_text(encoding="utf-8"))
        declared |= {(j["name"], a) for a in (j.get("attributes") or {})}
    roster = json.loads((PLUGIN_ROOT / "src" / "blocks" / "extensions" / "extension-roster.json").read_text(encoding="utf-8"))
    ext_attrs = {a for ext in roster["extensions"] for a in ext["attributes"]}
    # core/* rows come from WordPress's own block.json files, outside this repo.
    stale = [
        k for k in _overrides()
        if k[0].startswith("sgs/") and k not in declared and k[1] not in ext_attrs
    ]
    assert stale == []


# ── DB path ───────────────────────────────────────────────────────────────────

def test_seeder_reads_sgs_framework_db_env(tmp_path, monkeypatch):
    monkeypatch.setenv("SGS_FRAMEWORK_DB", str(tmp_path / "copy.db"))
    module = _load("extract_signatures_env_under_test", ANALYSER / "extract-signatures.py")
    assert module.DB_PATH == tmp_path / "copy.db"


def test_update_db_flag_skips_children_that_ignore_the_env(tmp_path, monkeypatch):
    update = _load("sgs_update_v2_db_under_test", PLUGIN_ROOT / "scripts" / "sgs-update-v2.py")
    marker = tmp_path / "ran.txt"
    blind = tmp_path / "blind_child.py"
    blind.write_text(f"open(r'{marker}', 'w').write('x')\n", encoding="utf-8")
    aware = tmp_path / "aware_child.py"
    aware.write_text(f"import os\nos.environ.get('SGS_FRAMEWORK_DB')\nopen(r'{marker}', 'w').write('y')\n", encoding="utf-8")
    monkeypatch.setattr(subprocess, "run", subprocess.run)
    update._guard_children_for_db_override()
    subprocess.run([sys.executable, str(blind)], check=True)
    assert not marker.exists()
    subprocess.run([sys.executable, str(aware)], check=True)
    assert marker.read_text() == "y"

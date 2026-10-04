"""Scanner blind spots from the Task 2 review (one test per mechanism; each turns
red when its mechanism is removed, which prove_rules_can_fail.py checks).

Front end: loop-variable prefixes, options arrays and constructor arrays keyed
by their pair, ternary class groups, concatenated class prefixes, PHP selectors
and `var()` reads built by concatenation, custom properties a front-end script
reads by name, block-context tokens, selector variables, raw stylesheet text,
value lists that are not declarations, and B1 counting only a context value
the CSS carries. Links and population: the C1 `allowedBlocks` exemption,
show/hide toggles, extension attributes in the population."""
from __future__ import annotations

import re
from pathlib import Path

from wf_testkit import record

from wf_bugs import child_conditional, scope_hash_bug
from wf_channel import ChannelAnalyser, attr_seeds
from wf_css import CssIndex, build_css_index, dynamic_var_reads, js_cp_reads
from wf_editor import BlockEditor
from wf_frontend import FrontEnd, prefix_helpers
from wf_links import LinkEnv, assess
from wf_paint import PaintClassifier
from wf_php import PhpIndex, loop_literals
from wf_tokens import Channel, has_decl


def _index(tmp_path: Path, php: str, name: str = "render.php") -> tuple[PhpIndex, object]:
    f = tmp_path / name
    f.write_text("<?php\n" + php, encoding="utf-8")
    index = PhpIndex([f])
    return index, index.files[f.as_posix()]


def channel(tmp_path: Path, php: str, attr: str, slugs=("card", "grid")) -> Channel:
    index, text = _index(tmp_path, php)
    ch = Channel()
    ChannelAnalyser(index, set(slugs)).flow(text, attr_seeds(text, attr), attr, ch)
    return ch


# ---- 1. cart typography: a loop-variable prefix resolves to the loop's literals

def test_loop_variable_resolves_to_array_literal_keys_values_and_tuples(tmp_path):
    php = ("$typography = array( 'panelTitle' => '.h', 'itemName' => '.n' );\n"
           "foreach ( $typography as $prefix => $sel ) { f( $attributes, $prefix, $sel ); }\n"
           "foreach ( array( 'a', 'b' ) as $p ) { f( $attributes, $p ); }\n"
           "foreach ( array( array( 'rowOne', 'x' ), array( 'rowTwo', 'y' ) ) as $row ) { f( $attributes, $row ); }\n")
    _i, t = _index(tmp_path, php)
    assert loop_literals(t.src, t.mask, t.src.index("f( $attributes, $prefix"), "prefix") == ["panelTitle", "itemName"]
    assert loop_literals(t.src, t.mask, t.src.index("f( $attributes, $p )"), "p") == ["a", "b"]
    assert loop_literals(t.src, t.mask, t.src.index("f( $attributes, $row"), "row") == ["rowOne", "rowTwo"]


def test_prefix_helper_called_with_a_loop_variable_derives_every_prefix(tmp_path):
    inc = tmp_path / "includes"
    blk = tmp_path / "blocks" / "cart"
    inc.mkdir()
    blk.mkdir(parents=True)
    (inc / "typo.php").write_text("<?php\nfunction sgs_typography_css_rule( array $attributes, $prefix, $sel ) {\n"
                                  "\treturn $sel . '{font-size:' . $attributes[ $prefix . 'FontSize' ] . '}';\n}\n", encoding="utf-8")
    (blk / "render.php").write_text("<?php\n$typography = array( 'panelTitle' => '.h', 'checkout' => '.c' );\n"
                                    "foreach ( $typography as $prefix => $sel ) {\n\t$css[] = sgs_typography_css_rule( $attributes, $prefix, $sel );\n}\n",
                                    encoding="utf-8")
    index = PhpIndex(sorted(inc.glob("*.php")) + sorted(blk.glob("*.php")))
    fe = FrontEnd(index, ChannelAnalyser(index, {"cart"}), prefix_helpers(index, tmp_path / "none.js"), inc)
    _texts, derived = fe.block_texts(blk)
    assert {"panelTitleFontSize", "checkoutFontSize"} <= set(derived)


# ---- 2a. an attribute's tokens come only through its own value flow

def test_value_in_an_array_argument_reaches_the_callee_under_its_key_only(tmp_path):
    php = ("function nav( array $args ) {\n\t$arrows = ! empty( $args['show_arrows'] );\n\t$classes = array();\n"
           "\tif ( ! $arrows ) {\n\t\t$classes[] = 'sgs-nav--no-arrows';\n\t}\n\treturn implode( ' ', $classes );\n}\n"
           "echo nav( array( 'count' => count( $attributes['maxReviews'] ), 'show_arrows' => $attributes['showArrows'] ) );\n")
    assert "sgs-nav--no-arrows" not in channel(tmp_path, php, "maxReviews").classes
    assert "sgs-nav--no-arrows" in channel(tmp_path, php, "showArrows").classes


def test_constructor_array_taints_the_object_under_its_pair_key(tmp_path):
    php = ("function items( $submenu ) {\n\treturn '<span class=\"sgs-roll--' . esc_attr( $submenu['label_roll'] ) . '\"></span>';\n}\n"
           "$r = new Renderer( array( 'align' => $attributes['submenuAlign'], 'label_roll' => $attributes['labelRoll'] ) );\n"
           "echo items( $r->get_submenu() );\n")
    assert "sgs-roll--" not in channel(tmp_path, php, "submenuAlign").classes
    assert "sgs-roll--" in channel(tmp_path, php, "labelRoll").classes


def test_a_ternary_class_group_belongs_to_its_own_test(tmp_path):
    php = ("$f = in_array( $id, $attributes['featuredIds'], true );\n$d = in_array( $id, $disabled, true );\n"
           "$li_class = 'sgs-i' . ( $f ? ' sgs-i--featured' : '' ) . ( $d ? ' sgs-i--disabled' : '' );\n")
    classes = channel(tmp_path, php, "featuredIds").classes
    assert "sgs-i--featured" in classes and "sgs-i--disabled" not in classes


def test_block_context_tokens_do_not_make_l6_when_the_block_paints_itself():
    css = CssIndex()
    css.class_tokens.update({"sgs-acc--bordered"})
    env = LinkEnv(css=css, js="", root_class_re=re.compile(r"\.sgs-(acc)(?![\w-])"))
    be = BlockEditor(control={"accordionStyle": "x"}, canvas={"accordionStyle": {"whole": True, "tiers": set(), "flag": False}})
    ch = Channel(read=True, classes={"sgs-acc--", "sgs-acc-item--"}, ctx_tokens={"sgs-acc-item--"})
    row = {"attr_name": "accordionStyle", "role": "styling"}
    assert "L6" not in assess(row, "css", ch, {}, be, False, set(), env)["missing"]
    ch.classes.discard("sgs-acc--")
    assert "L6" in assess(row, "css", ch, {}, be, False, set(), env)["missing"]


# ---- 2b-d. consumers built by concatenation, read by scripts, matched by prefix

def test_php_selector_and_var_read_built_by_concatenation_are_consumers(tmp_path):
    php = ("$sel = '.' . $uid . '.sgs-card__tag--trial';\n"
           "$consume = static function ( array $decls, string $var_name ): string {\n"
           "\treturn 'background-color:var(--' . $var_name . ');background-image:var(--' . $var_name . '-gradient);';\n};\n"
           "$out = $consume( $vars, 'sgs-mm-card-bg' );\n")
    index, _t = _index(tmp_path, php)
    assert {"--sgs-mm-card-bg", "--sgs-mm-card-bg-gradient"} <= dynamic_var_reads(list(index.files.values()))
    css = build_css_index(tmp_path / "none", tmp_path / "none", list(index.files.values()))
    assert css.has_class("sgs-card__tag--trial")
    assert css.cp_read("--sgs-mm-card-bg")


def test_front_end_script_reading_a_custom_property_by_name_is_a_consumer():
    js = ("const c = resolveColour( root, '--sgs-audio-spectrum' );\n"
          "getComputedStyle( d ).getPropertyValue( '--sgs-nd-grow' );\nel.style.setProperty( '--sgs-written', v );\n")
    assert js_cp_reads(js) == {"--sgs-audio-spectrum", "--sgs-nd-grow"}


def test_a_class_the_string_concatenates_onto_matches_by_prefix(tmp_path):
    php = "echo '<h3 class=\"sgs-q__title sgs-q__title--w' . esc_attr( $attributes['weight'] ) . '\">';\n"
    ch = channel(tmp_path, php, "weight")
    assert "sgs-q__title--w*" in ch.classes
    css = CssIndex()
    css.class_tokens.add("sgs-q__title--w400")
    assert css.has_class("sgs-q__title--w*") and not css.has_class("sgs-q__title--w")


# ---- 3. a selector held in a variable reaches C1/B3

def test_selector_variable_feeds_the_child_selector_rules(tmp_path):
    php = ("function render( $attributes, $uid ) {\n"
           "\t$sel = '.' . $uid . '.sgs-grid--on > .sgs-card';\n"
           "\t$decl = sgs_text_colour_decl( $attributes['cellTextHover'] );\n"
           "\t$css .= sgs_hover_state_rules( $sel, $decl . ';' );\n\treturn $css;\n}\n")
    assert channel(tmp_path, php, "cellTextHover").child_sel == {"card"}


# ---- 4. C1 exemption: the parent admits only the reader's block

def test_c1_is_exempt_when_allowed_blocks_are_the_readers_blocks():
    css = CssIndex()
    css.cp_readers["--sgs-mb-border"].append(("style.css", ":where(.sgs-multi) .sgs-button"))
    root = re.compile(r"\.sgs-(multi|button|heading)(?![\w-])")
    assert child_conditional({"--sgs-mb-border"}, css, root)
    assert not child_conditional({"--sgs-mb-border"}, css, root, allowed={"sgs/button"})
    assert child_conditional({"--sgs-mb-border"}, css, root, allowed={"sgs/button", "sgs/heading"})


# ---- 5. B1 counts a context value written into the CSS, never one that only gates a rule

def test_b1_needs_the_context_value_inside_the_scoped_css(tmp_path):
    head = "$uid = 'sgs-i-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );\n"
    gate = head + "$ctx = $block->context['sgs/hidden'] ?? false;\nif ( ! $ctx ) {\n\t$css .= '.' . $uid . '{color:red}';\n}\n"
    value = head + "$ctx = $block->context['sgs/colour'] ?? '';\n$css .= '.' . $uid . '{color:' . $ctx . '}';\n"
    for php, want in ((gate, []), (value, ["sgs/colour"])):
        index, t = _index(tmp_path, php)
        assert scope_hash_bug([t], ChannelAnalyser(index, set())) == want


# ---- raw stylesheet text and value lists

def test_raw_style_element_carries_the_value_only_inside_the_element(tmp_path):
    assert channel(tmp_path, "$s = '<style>' . $attributes['customCss'] . '</style>';\n", "customCss").decl
    assert not channel(tmp_path, "$o = '<style>' . $x . '</style>' . $attributes['customCss'];\n", "customCss").decl


def test_a_value_list_is_not_a_declaration():
    assert not has_decl("if ( in_array( $v, array( 'phone', 'email', 'top' ), true ) ) {")
    assert has_decl("$css[] = $tier( $p, 'k', array( 'padding' ), true );")
    assert has_decl("array( ' .sgs-cart__items', 'panelBodyPadding', 'padding' ),")


# ---- 7-8. population: extension attributes and show/hide toggles

def test_extension_attributes_enter_the_paint_population(report):
    rec = record(report, "ext/hover-opacity.js", "sgsHoverOpacity")
    assert rec["category"] == "css"
    assert report["summary"]["attributes"] == len(report["records"])


def test_show_hide_toggle_paints_only_through_a_class_rule_or_custom_property():
    pc = PaintClassifier([])
    row = {"attr_name": "showLabel", "role": "boolean-visibility", "css_property": None}
    assert pc.classify(row, {"decl_channel": True})[0] == "not"
    assert pc.classify(row, {"data_consumed": True})[0] == "not"
    assert pc.classify(row, {"class_rule": True})[0] == "css"
    assert pc.classify(row, {"utility_class_rule": True})[0] == "css"
    effect = {"attr_name": "shadowLiftOnHover", "role": "boolean-visibility", "css_property": None}
    assert pc.classify(effect, {"decl_channel": True}) == ("css", "effect-toggle-decl")
    runtime = {"attr_name": "bgLottieLoop", "role": "boolean-visibility", "css_property": None}
    assert pc.classify(runtime, {"fx_data_consumed": True})[0] == "js"
    mode = {"attr_name": "mediaSizing", "role": "enum-mode", "css_property": None}
    assert pc.classify(mode, {"decl_channel": True})[0] == "css"

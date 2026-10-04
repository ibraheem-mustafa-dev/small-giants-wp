"""Front-end channel mechanisms (blind spots 3-10, 19), each on a minimal PHP or
CSS text, with a control that must stay negative."""
from __future__ import annotations

from pathlib import Path

from wf_channel import ChannelAnalyser, attr_seeds
from wf_css import css_rules
from wf_php import PhpIndex
from wf_tokens import Channel


def channel(tmp_path: Path, php: str, attr: str) -> Channel:
    f = tmp_path / "render.php"
    f.write_text("<?php\n" + php, encoding="utf-8")
    index = PhpIndex([f])
    text = index.files[f.as_posix()]
    an = ChannelAnalyser(index, {"card", "grid"})
    ch = Channel()
    an.flow(text, attr_seeds(text, attr), attr, ch)
    return ch


def test_follows_variables_past_two_hops(tmp_path):
    ch = channel(tmp_path, "$a = $attributes['gap'];\n$b = $a;\n$c = $b;\n$d = $c;\n$css = '.x{row-gap:' . $d . '}';\n", "gap")
    assert ch.decl


def test_follows_helper_return_values(tmp_path):
    php = ("function px( $v ) { return $v . 'px'; }\n"
           "$w = px( $attributes['ringWidth'] );\n$css = '.x{outline-width:' . $w . '}';\n")
    assert channel(tmp_path, php, "ringWidth").decl


def test_custom_property_anywhere_in_a_string(tmp_path):
    ch = channel(tmp_path, "$o = $attributes['ringOpacity'];\n$s = 'a:b;--sgs-ring-opacity:' . $o;\n", "ringOpacity")
    assert ch.cps == {"--sgs-ring-opacity"}
    ch = channel(tmp_path, "$l = $attributes['lines'];\n$css = '.x{--sgs-lines:' . $l . '}';\n", "lines")
    assert ch.cps == {"--sgs-lines"}


def test_unrelated_custom_properties_in_one_statement_are_not_linked(tmp_path):
    php = "$a = $attributes['gap'];\n$s = '--sgs-other:' . $other . ';--sgs-gap:' . $a;\n"
    assert channel(tmp_path, php, "gap").cps == {"--sgs-gap"}


def test_bem_modifier_classes_and_array_appends(tmp_path):
    php = "$classes = array();\n$classes[] = 'sgs-modal__dialog--' . $attributes['maxWidth'];\n"
    assert "sgs-modal__dialog--" in channel(tmp_path, php, "maxWidth").classes


def test_data_attribute_channel(tmp_path):
    php = "$d = $attributes['dragToScroll'];\necho '<div data-sgs-fx-drag=\"' . esc_attr( $d ) . '\"></div>';\n"
    ch = channel(tmp_path, php, "dragToScroll")
    assert ch.data == {"data-sgs-fx-drag"} and ch.fx_data == {"data-sgs-fx-drag"}


def test_value_forwarded_into_a_nested_block(tmp_path):
    php = "$html = render_block( array( 'blockName' => 'sgs/option-picker', 'attrs' => array( 'pillBg' => $attributes['pickerPillBg'] ) ) );\n"
    assert channel(tmp_path, php, "pickerPillBg").fwd


def test_value_used_only_as_a_gate_condition(tmp_path):
    php = "if ( 'brand' === $attributes['colourMode'] ) {\n\t$css .= '.x{color:red}';\n}\n"
    ch = channel(tmp_path, php, "colourMode")
    assert ch.read and ch.gate and "DECL" in ch.kinds()


def test_the_attribute_name_is_never_its_own_declaration(tmp_path):
    php = "$m = sgs_spacing( 'margin', $attributes );\n"
    assert not channel(tmp_path, php, "margin").decl


def test_options_array_taint_stays_on_its_key(tmp_path):
    php = ("$params = array( 'showTitle' => $attributes['showTitle'], 'colour' => $attributes['colour'] );\n"
           "$css = '.x{color:' . $params['colour'] . '}';\n"
           "if ( $params['showTitle'] ) { echo '<h3>t</h3>'; }\n")
    assert not channel(tmp_path, php, "showTitle").decl
    assert channel(tmp_path, php, "colour").decl


def test_dynamic_key_read_with_its_prefix_literal(tmp_path):
    php = ("foreach ( array( 'drawerLinkDesc', 'drawerLink' ) as $k ) {\n"
           "\t$g = $attributes[ $k . 'ColourGradient' ] ?? '';\n\t$css .= '.x{background-image:' . $g . '}';\n}\n")
    assert channel(tmp_path, php, "drawerLinkDescColourGradient").decl


def test_scss_comments_nesting_and_declarations_before_a_nested_rule():
    rules = dict(css_rules(".t { margin: 0; // a note: not a rule\n &--wide { gap: var(--sgs-gap); }\n color: red; }", scss=True))
    assert "margin: 0" in rules[".t"] and "color: red" in rules[".t"]
    assert "var(--sgs-gap)" in rules[".t--wide"]


def test_shared_text_seeds_one_word_names_only_from_attribute_reads(tmp_path):
    f = tmp_path / "helper.php"
    f.write_text("<?php\n$css = array( 'width' => $w );\n$v = $attributes['width'];\n"
                 "$map = array( 'panelFooterBorderColour' => array( '.x', 'border-top-color' ) );\n", encoding="utf-8")
    text = PhpIndex([f]).files[f.as_posix()]
    shared = attr_seeds(text, "width", own=False)
    assert len(shared) == 1 and text.src[shared[0] - 12:shared[0]].endswith("$attributes[")
    assert len(attr_seeds(text, "width", own=True)) == 2
    assert attr_seeds(text, "panelFooterBorderColour", own=False)

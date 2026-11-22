"""Regression tests for behavioural-analyser/extract-signatures.py parsing helpers.

Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_extract_signatures_regressions.py -q
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_DIR = Path(__file__).resolve().parent.parent / "behavioural-analyser"
sys.path.insert(0, str(_DIR))
_spec = importlib.util.spec_from_file_location("extract_signatures_under_test", _DIR / "extract-signatures.py")
es = importlib.util.module_from_spec(_spec)
sys.modules["extract_signatures_under_test"] = es
_spec.loader.exec_module(es)


def test_top_level_vars_inside_calc():
    assert es._top_level_vars("calc(var(--sgs-x) * 2)") == {"--sgs-x"}


def test_top_level_vars_still_skips_nested_fallback():
    assert es._top_level_vars("var(--sgs-a, var(--sgs-b, red))") == {"--sgs-a"}


def test_php_open_tag_is_not_a_ternary():
    assert es._detect_conditional_gates_php(["<a href=\"<?php echo esc_url('https://x'); ?>\">"], 0) == []


def test_real_ternary_still_detected():
    assert "ternary" in es._detect_conditional_gates_php(["$a = $b ? 'x' : 'y';"], 0)


def test_comparison_and_foreach_key_are_not_assignments():
    src = "if ($mode === $attributes['layout']) {}\nforeach ($items as $k => $v) { echo $attributes['a']; }"
    assert es._build_php_var_attr_map(src) == {}


def test_real_assignment_still_mapped():
    assert es._build_php_var_attr_map("$mode = $attributes['layout'];") == {"mode": "layout"}


def test_nested_fallback_does_not_take_border_slot():
    slots = es._custom_props_consumed(
        ".sgs-x{border:var(--sgs-w,0) solid var(--sgs-c, var(--sgs-fb, red))}"
    )[2]
    assert slots[("--sgs-w", "border")] == "width"
    assert slots[("--sgs-c", "border")] == "colour"


def test_rules_after_charset_are_kept():
    assert es._iter_rule_blocks('@charset "UTF-8";\n.sgs-hero{a:b}') == [(".sgs-hero", "a:b")]


def test_nested_attribute_reference_excluded():
    assert es._attrs_referenced("attributes.tabs.length", {}, {"tab", "tabs"}) == set()


def test_line_comment_ends_at_the_closing_tag():
    src = '<div <?php echo $attrs; // phpcs:ignore Escape ?> data-layout="<?php echo esc_attr( $attributes[\'layout\'] ); ?>">\n'
    assert es._strip_php_comments(src) == (
        '<div <?php echo $attrs; ?> data-layout="<?php echo esc_attr( $attributes[\'layout\'] ); ?>">\n'
    )
    assert es._strip_php_comments("<?php # note ?><p class=\"a\">\n") == "<?php ?><p class=\"a\">\n"


def test_line_comment_without_a_closing_tag_still_ends_at_the_newline():
    assert es._strip_php_comments("$a = 1; // note\n$b = 2; # note\n$c = 3;") == "$a = 1; \n$b = 2; \n$c = 3;"
    assert es._strip_php_comments("$u = 'https://x.test/?>'; // gone\n") == "$u = 'https://x.test/?>'; \n"
    assert es._strip_php_comments("$a = 1; // one\n?>\n<p>") == "$a = 1; \n?>\n<p>"


def test_member_access_is_not_a_bare_identifier():
    assert es._attrs_referenced("value={ link.url }", {"url": "url"}, {"url"}) == set()
    assert es._attrs_referenced("value={ url }", {"url": "url"}, {"url"}) == {"url"}


# ---- ambiguity net: the manifest's element tells attrs apart (shop pages F-37) ----------------------------------------------


def _hit(element, source="prefix", prefix="x"):
    hit = {"css_element": element, "source": source}
    if source == "prefix":
        hit["prefix"] = prefix
    return hit


def _slot(props, element_hit=None, bem=None, state=None, tier=None):
    return es._ambiguity_slot(set(props), state, tier, bem, element_hit)


def test_type_families_on_different_manifest_elements_are_not_ambiguous():
    # sgs/account: addressTitleFontSize and authHeadingFontSize both paint font-size, on two elements the manifest names.
    candidates = {
        "addressTitleFontSize": _slot({"font-size"}, _hit("addressTitle")),
        "authHeadingFontSize": _slot({"font-size"}, _hit("authHeading")),
        "loginLinkFontSize": _slot({"font-size"}, _hit("loginLink")),
    }
    assert es._ambiguous_slot_members(candidates, set(), set()) == {}


def test_two_attrs_on_the_same_manifest_element_and_property_are_still_refused():
    candidates = {
        "aFontSize": _slot({"font-size"}, _hit("title")),
        "bFontSize": _slot({"font-size"}, _hit("title")),
    }
    assert set(es._ambiguous_slot_members(candidates, set(), set())) == {"aFontSize", "bFontSize"}


def test_attrs_with_no_element_are_refused_as_before():
    candidates = {"aFontSize": _slot({"font-size"}), "bFontSize": _slot({"font-size"})}
    assert set(es._ambiguous_slot_members(candidates, set(), set())) == {"aFontSize", "bFontSize"}


def test_an_unelemented_attr_is_refused_beside_an_elemented_one_and_the_elemented_one_is_kept():
    candidates = {"aFontSize": _slot({"font-size"}), "bFontSize": _slot({"font-size"}, _hit("title"))}
    assert set(es._ambiguous_slot_members(candidates, set(), set())) == {"aFontSize"}


def test_a_bare_prefix_element_is_not_an_element():
    # trust-bar's `badge-label` (prefix "") claims `textColourGradient` by a case-insensitive suffix coincidence.
    bare = _hit("badge-label", prefix="")
    assert _slot({"color"}, bare)[3] is None
    assert _slot({"color"}, _hit("title", source="attrMap"))[3] == "title"
    candidates = {"aColour": _slot({"color"}, bare), "bColour": _slot({"color"})}
    assert set(es._ambiguous_slot_members(candidates, set(), set())) == {"aColour", "bColour"}


def test_a_bem_observed_element_is_never_refused():
    assert _slot({"font-size"}, None, bem="title") is None
    candidates = {"aFontSize": _slot({"font-size"}, None, bem="title"), "bFontSize": _slot({"font-size"}, None, bem="title")}
    assert es._ambiguous_slot_members(candidates, set(), set()) == {}


def test_an_established_slot_on_the_same_element_still_refuses_a_new_route():
    new = {"bFontSize": _slot({"font-size"}, _hit("title"))}
    assert set(es._ambiguous_slot_members(new, set(), {_slot({"font-size"}, _hit("title"))})) == {"bFontSize"}
    assert es._ambiguous_slot_members(new, set(), {_slot({"font-size"}, _hit("other"))}) == {}


def test_family_route_refused_only_on_the_same_element_or_no_element():
    held = {_slot({"padding"}, _hit("card"))}
    assert es._family_route_refused(_slot({"padding"}), held) is True
    assert es._family_route_refused(_slot({"padding"}, _hit("card")), held) is True
    assert es._family_route_refused(_slot({"padding"}, _hit("icon")), held) is False
    assert es._family_route_refused(_slot({"margin"}), held) is False
    assert es._family_route_refused(None, held) is False


def test_prefix_convention_hit_carries_the_element_and_prefix_for_the_account_title_family():
    block_dir = es.BLOCKS_DIR / "account"
    attrs = {"addressTitleFontSize", "addressTitleColour", "authHeadingFontSize", "authHeadingColour"}
    reverse = es._load_element_manifest_reverse(block_dir, attrs)
    assert reverse["addressTitleFontSize"]["css_element"] == "addressTitle"
    assert reverse["addressTitleFontSize"]["source"] == "prefix"
    assert reverse["addressTitleFontSize"]["prefix"] == "addressTitle"
    assert reverse["authHeadingFontSize"]["css_element"] == "authHeading"

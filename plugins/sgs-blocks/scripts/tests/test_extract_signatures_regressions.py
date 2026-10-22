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


def test_member_access_is_not_a_bare_identifier():
    assert es._attrs_referenced("value={ link.url }", {"url": "url"}, {"url"}) == set()
    assert es._attrs_referenced("value={ url }", {"url": "url"}, {"url"}) == {"url"}

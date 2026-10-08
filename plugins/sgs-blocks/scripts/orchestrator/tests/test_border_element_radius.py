"""A block that builds its border through sgs_border_element_decls keeps its radius tier evidence.

The helper unpacks `{prefix}BorderRadius` per tier inside itself, so the call site never names a tier; without this
evidence the seeder flips the block's borderRadius from tier_object to box_only and wp-build-page.js refuses a
tiered value for it.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from object_attr_shape import tier_object_attrs_from_php  # noqa: E402


def _attrs(tmp_path: Path, body: str) -> set:
    path = tmp_path / "render.php"
    path.write_text("<?php\n" + body, encoding="utf-8")
    return tier_object_attrs_from_php(path)


def test_empty_prefix_reads_border_radius(tmp_path):
    assert "borderRadius" in _attrs(tmp_path, "$b = sgs_border_element_decls( $attributes, '', $sel, array( 'colour' => array() ) );")


def test_prefix_names_its_own_radius(tmp_path):
    assert "cardBorderRadius" in _attrs(tmp_path, "$b = sgs_border_element_decls( $attributes, 'card', $sel );")


def test_literal_radius_option_names_the_attribute(tmp_path):
    attrs = _attrs(tmp_path, "$b = sgs_border_element_decls( $attributes, 'aside', $sel, array( 'radius' => 'asideRadius' ) );")
    assert "asideRadius" in attrs
    assert "asideBorderRadius" not in attrs


def test_negative_control_radius_false_is_no_evidence(tmp_path):
    attrs = _attrs(tmp_path, "$b = sgs_border_element_decls( $attributes, '', $sel, array( 'radius' => false ) );")
    assert "borderRadius" not in attrs


def test_negative_control_other_call_or_variable_prefix_is_no_evidence(tmp_path):
    assert "borderRadius" not in _attrs(tmp_path, "$b = sgs_border_box_decls( $attributes, '', $sel );")
    assert "borderRadius" not in _attrs(tmp_path, "$b = sgs_border_element_decls( $attributes, $prefix, $sel );")

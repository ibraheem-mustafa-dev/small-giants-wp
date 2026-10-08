"""Per-device evidence through a normalising closure, and a tiered width read by sgs_border_element_decls.

sgs/google-reviews prints its card, header, rail and button boxes through `$gr_box_rule`, a closure that unpacks
whatever value it is handed with `sgs_responsive_normalise_object()`; its card border width goes through
`sgs_border_element_decls`, which prints a width per tier only when the block stores it as a tier object. Without
this evidence the seeder marks those attributes box_only and wp-build-page.js refuses a tiered value for them.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from object_attr_shape import tier_object_attrs_from_php  # noqa: E402

CLOSURE = """
$box_rule = static function ( string $selector, $raw, string $prop ): string {
	$obj = sgs_responsive_normalise_object( $raw, true );
	return '';
};
"""


def _attrs(tmp_path: Path, body: str, attributes: dict | None = None) -> set:
    (tmp_path / "render.php").write_text("<?php\n" + body, encoding="utf-8")
    if attributes is not None:
        (tmp_path / "block.json").write_text(json.dumps({"attributes": attributes}), encoding="utf-8")
    return tier_object_attrs_from_php(tmp_path / "render.php")


def test_a_literal_attribute_handed_to_a_normalising_closure(tmp_path):
    attrs = _attrs(tmp_path, CLOSURE + "$css = $box_rule( $sel, $attributes['cardPadding'] ?? null, 'padding' );")
    assert "cardPadding" in attrs


def test_a_prefixed_attribute_inside_a_closure_called_with_a_literal_prefix(tmp_path):
    body = CLOSURE + """
$button_box = static function ( string $selector, string $prefix ) use ( $attributes, $box_rule ): string {
	return $box_rule( $selector, $attributes[ $prefix . 'BorderWidth' ] ?? null, 'border-width' );
};
$a = $button_box( $sel, 'writeReview' );
"""
    assert "writeReviewBorderWidth" in _attrs(tmp_path, body)


def test_negative_control_a_closure_that_does_not_normalise(tmp_path):
    body = """
$plain = static function ( string $selector, $raw ): string {
	return $selector . '{padding:' . $raw . '}';
};
$css = $plain( $sel, $attributes['cardPadding'] ?? null );
"""
    assert "cardPadding" not in _attrs(tmp_path, body)


def test_a_tiered_width_default_is_evidence_for_the_border_helper(tmp_path):
    attrs = _attrs(
        tmp_path,
        "$b = sgs_border_element_decls( $attributes, 'card', $sel );",
        {"cardBorderWidth": {"type": "object", "default": {"desktop": {}}}},
    )
    assert "cardBorderWidth" in attrs


def test_negative_control_a_flat_width_default_is_no_evidence(tmp_path):
    attrs = _attrs(
        tmp_path,
        "$b = sgs_border_element_decls( $attributes, '', $sel );",
        {"borderWidth": {"type": "object", "default": {}}},
    )
    assert "borderWidth" not in attrs

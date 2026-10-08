"""ChannelAnalyser.emits_css: a helper that joins a caller-supplied name into a declaration (`$prefix . $side . ':' .
$value`, includes/helpers-box.php's sgs_box_object_property_list() and sgs_corner_object_property_list()) emits CSS.
Negative control: a function that joins the same parameter into a label, with no `:` declaration join, emits nothing."""
from __future__ import annotations

from pathlib import Path

from wf_channel import ChannelAnalyser
from wf_php import PhpIndex

PROPERTY_HELPER = """
function sgs_side_props( $box, string $prefix ) {
	$decls = array();
	foreach ( array( 'top', 'left' ) as $side ) {
		$decls[] = $prefix . $side . ':' . $box[ $side ];
	}
	return $decls;
}
function sgs_side_label( $box, string $prefix ) {
	$labels = array();
	foreach ( array( 'top', 'left' ) as $side ) {
		$labels[] = $prefix . $side . ' is ' . $box[ $side ];
	}
	return $labels;
}
"""


def analyser(tmp_path: Path, php: str) -> ChannelAnalyser:
    f = tmp_path / "render.php"
    f.write_text("<?php\n" + php, encoding="utf-8")
    return ChannelAnalyser(PhpIndex([f]), set())


def test_a_helper_joining_its_name_parameter_into_a_declaration_emits_css(tmp_path: Path) -> None:
    assert analyser(tmp_path, PROPERTY_HELPER).emits_css("sgs_side_props")


def test_joining_the_parameter_into_a_label_emits_nothing(tmp_path: Path) -> None:
    assert not analyser(tmp_path, PROPERTY_HELPER).emits_css("sgs_side_label")

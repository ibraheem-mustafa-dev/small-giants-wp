"""ChannelAnalyser.emits_css: a helper that builds declarations from a map of CSS property names emits CSS, and so does
a thin wrapper that hands its own first argument to such a helper (sgs_corner_object_longhand_list() and
sgs_corner_object_longhands(), helpers-box.php). Negative controls: a map whose values only look like CSS words, and a
function that calls a CSS helper for something other than its own argument, emit nothing."""
from __future__ import annotations

from pathlib import Path

from wf_channel import ChannelAnalyser
from wf_php import PhpIndex

CORNER_HELPERS = """
function sgs_corner_list( $box ) {
	$corners = array( 'topLeft' => 'border-top-left-radius', 'bottomLeft' => 'border-bottom-left-radius' );
	$decls   = array();
	foreach ( $corners as $key => $property ) {
		$decls[] = $property . ':' . $box[ $key ];
	}
	return $decls;
}
function sgs_corner_wrap( $box ) {
	return implode( ';', sgs_corner_list( $box ) );
}
"""

LOOKALIKES = """
function sgs_link_kinds( $kind ) {
	$labels = array( 'top' => 'margin', 'phone' => 'color' );
	return $labels[ $kind ] ?? '';
}
function sgs_link_href( $source, $url ) {
	$note = sgs_corner_wrap( array() );
	return 'url' === $source ? $url : '#';
}
"""


def analyser(tmp_path: Path, php: str) -> ChannelAnalyser:
    f = tmp_path / "render.php"
    f.write_text("<?php\n" + php, encoding="utf-8")
    return ChannelAnalyser(PhpIndex([f]), set())


def test_a_property_map_builder_and_its_thin_wrapper_emit_css(tmp_path: Path) -> None:
    an = analyser(tmp_path, CORNER_HELPERS)
    assert an.emits_css("sgs_corner_list")
    assert an.emits_css("sgs_corner_wrap")


def test_lookalike_maps_and_unrelated_calls_emit_nothing(tmp_path: Path) -> None:
    an = analyser(tmp_path, CORNER_HELPERS + LOOKALIKES)
    # A map onto CSS-looking words with no `. ':' .` join builds no declaration.
    assert not an.emits_css("sgs_link_kinds")
    # Calls a CSS helper, but not with its own first argument: its reads are not painted.
    assert not an.emits_css("sgs_link_href")

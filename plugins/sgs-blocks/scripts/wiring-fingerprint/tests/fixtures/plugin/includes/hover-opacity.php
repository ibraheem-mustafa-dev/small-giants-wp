<?php
function sgs_fixture_hover_opacity( $block_content, $block ) {
	$o = $block['attrs']['sgsHoverOpacity'] ?? 0;
	if ( ! $o ) {
		return $block_content;
	}
	return '<style>.x:hover{opacity:' . (float) $o . '}</style>' . $block_content;
}
add_filter( 'render_block', 'sgs_fixture_hover_opacity', 10, 2 );

<?php
function sgs_typography_css_rule( array $attributes, $prefix, $selector ) {
	$size   = $attributes[ $prefix . 'FontSize' ] ?? '';
	$weight = $attributes[ $prefix . 'FontWeight' ] ?? '';
	$decls  = array();
	if ( '' !== $size ) {
		$decls[] = 'font-size:' . $size;
	}
	if ( '' !== $weight ) {
		$decls[] = 'font-weight:' . $weight;
	}
	return $decls ? $selector . '{' . implode( ';', $decls ) . '}' : '';
}

<?php
/**
 * Identical render surface shape to `extension-owned-attr`. The ONLY difference
 * between the two fixtures is whether an extension actually registers these
 * attribute names, so both of these must FLAG here and all three of that
 * fixture's extension attributes must NOT flag there.
 */

$one = isset( $attributes['fxNotARegisteredAttr'] ) ? $attributes['fxNotARegisteredAttr'] : '';
$two = isset( $attributes['sgsNotARegisteredAttr'] ) ? $attributes['sgsNotARegisteredAttr'] : '';

printf(
	'<div data-one="%s" data-two="%s"></div>',
	esc_attr( $one ),
	esc_attr( $two )
);

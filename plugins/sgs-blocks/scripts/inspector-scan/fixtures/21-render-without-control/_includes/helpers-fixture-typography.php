<?php
/**
 * Fixture shared include — reproduces TRAP A verbatim in shape.
 *
 * Mirrors includes/helpers-typography.php:44-46 and :90,91,98,99: the
 * attribute key is assembled from a VARIABLE prefix and a LITERAL PascalCase
 * suffix, so the full attribute name (`titleLineHeightTablet`) never appears
 * anywhere in source. A literal-name render check scores it "not rendered" and
 * skips it — losing a real finding. Rule 21 must still resolve it.
 */

function sgs_fixture_typography_attr( $prefix, $base ) {
	return '' !== $prefix ? $prefix . $base : lcfirst( $base );
}

function sgs_fixture_typography_css( $attributes, $prefix ) {
	$tablet_key = sgs_fixture_typography_attr( $prefix, 'LineHeightTablet' );
	$value      = isset( $attributes[ $tablet_key ] ) ? $attributes[ $tablet_key ] : '';
	return '' !== $value ? '@media(max-width:1023px){.fixture{line-height:' . $value . ';}}' : '';
}

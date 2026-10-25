<?php
/**
 * Text shadow and number style values for the shared typography rule.
 *
 * `sgs_typography_css_rule()` (helpers-typography.php) prints `text-shadow` and `font-variant-numeric` from the
 * `{prefix}TextShadow`, `{prefix}TextShadowColour` and `{prefix}FontVariantNumeric` attributes. The shadow reuses
 * the layered box-shadow parser and colour resolver (helpers-shadow-layers.php): a layer is `X Y BLUR`, with an
 * optional colour of its own, and `src/utils/typography-preview.js` is the canvas twin.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-shadow-layers.php';

if ( ! function_exists( 'sgs_text_shadow_value' ) ) {
	/**
	 * Compose a stored text shadow (shape text + colour text) into a CSS `text-shadow` value.
	 *
	 * A layer takes an X offset, a Y offset and a blur, never a spread or `inset` (box-shadow words): a layer that
	 * carries `inset`, or whose colour is not understood, is dropped, and a spread is ignored. A layer with no
	 * colour of its own takes the sibling colour (one entry for all layers, or a list matching the layers); with
	 * none at all it prints no colour and the browser uses the text colour.
	 *
	 * @param string|null $shape  Layers, or `none`.
	 * @param string|null $colour One colour entry for all layers, or a list matching the layers.
	 * @return string CSS value, or '' when there is nothing to draw.
	 */
	function sgs_text_shadow_value( ?string $shape, ?string $colour ): string {
		$shape = trim( (string) $shape );
		if ( '' === $shape || strlen( $shape ) > SGS_SHADOW_MAX_BYTES ) {
			return '';
		}
		if ( 'none' === strtolower( $shape ) ) {
			return 'none';
		}
		$layers = sgs_shadow_split_top( $shape, ',' );
		if ( count( $layers ) > SGS_SHADOW_MAX_LAYERS ) {
			return '';
		}
		$list = '' === trim( (string) $colour ) ? array() : array_slice( sgs_shadow_split_top( (string) $colour, ',' ), 0, SGS_SHADOW_MAX_COLOURS );
		$out  = array();
		$last = '';
		foreach ( $layers as $index => $text ) {
			$entry = $list[ $index ] ?? '';
			if ( '' !== $entry ) {
				$last = $entry;
			}
			$fields = sgs_shadow_parse_layer( $text );
			if ( null === $fields || $fields['inset'] ) {
				continue;
			}
			$css   = '';
			$given = null !== $fields['colour'] ? $fields['colour'] : $last;
			if ( '' !== $given ) {
				$css = (string) sgs_shadow_resolve_colour( $given );
				if ( '' === $css ) {
					continue;
				}
			}
			$out[] = sgs_shadow_format_length( $fields['x'] ) . ' '
				. sgs_shadow_format_length( $fields['y'] ) . ' '
				. sgs_shadow_format_length( $fields['blur'] ) . ( '' !== $css ? ' ' . $css : '' );
		}
		return implode( ', ', $out );
	}
}

if ( ! function_exists( 'sgs_font_variant_numeric_value' ) ) {
	/**
	 * Validate a stored number style against the allowlist the editor offers.
	 *
	 * @param mixed $raw Stored value: one keyword, or several separated by spaces.
	 * @return string The keywords in the order given, deduplicated, or '' when any is off the list.
	 */
	function sgs_font_variant_numeric_value( $raw ): string {
		if ( ! is_string( $raw ) || '' === trim( $raw ) ) {
			return '';
		}
		$allowed = array( 'normal', 'tabular-nums', 'proportional-nums', 'lining-nums', 'oldstyle-nums' );
		$tokens  = array_values( array_unique( preg_split( '/\s+/', strtolower( trim( $raw ) ) ) ?: array() ) );
		if ( count( $tokens ) > count( $allowed ) || array_diff( $tokens, $allowed ) ) {
			return '';
		}
		return implode( ' ', $tokens );
	}
}

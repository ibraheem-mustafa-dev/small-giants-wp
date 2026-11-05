<?php
/**
 * Signed-in dot of sgs/icon: a small dot on the icon's shape that shows only for a signed-in visitor.
 *
 * Page caches serve one logged-out HTML to everyone, so the dot element is ALWAYS printed while the setting is on and
 * style.css shows it only under `body.logged-in`. Colour, size, position and ring are settings; unset they print
 * nothing and the stylesheet's token defaults apply. The ring is a border, so it needs no shadow fallback.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-colour-variants.php';

if ( ! function_exists( 'sgs_icon_signed_in_dot_html' ) ) {
	/**
	 * The dot element, or '' when the setting is off.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	function sgs_icon_signed_in_dot_html( array $attributes ): string {
		return ! empty( $attributes['showSignedInDot'] ) ? '<span class="sgs-icon__dot" aria-hidden="true"></span>' : '';
	}
}

if ( ! function_exists( 'sgs_icon_signed_in_dot_css' ) ) {
	/**
	 * Scoped CSS for the dot: fill, size, offsets and ring.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $shape_sel  The icon's scoped shape selector (`.{uid}.wp-block-sgs-icon .sgs-icon__shape`).
	 * @return string CSS text (may be '').
	 */
	function sgs_icon_signed_in_dot_css( array $attributes, string $shape_sel ): string {
		if ( empty( $attributes['showSignedInDot'] ) ) {
			return '';
		}
		$sel   = $shape_sel . ' .sgs-icon__dot';
		$len   = static function ( $raw ): string {
			return is_numeric( $raw ) ? (string) (float) $raw . 'px' : sgs_css_single_length_value( $raw );
		};
		$css   = array();
		$css[] = sgs_fill_states_css( $sel, $attributes, array( 'base' => 'signedInDotColour' ) );
		$specs = array(
			array( 'signedInDotSize', 'width' ),
			array( 'signedInDotSize', 'height' ),
			array( 'signedInDotTop', 'top' ),
			array( 'signedInDotRight', 'margin-inline-end' ),
		);
		foreach ( $specs as $spec ) {
			if ( ! empty( $attributes[ $spec[0] ] ) && is_array( $attributes[ $spec[0] ] ) ) {
				$css[] = sgs_emit_responsive_css(
					$sel,
					array(
						array(
							'value'     => $attributes[ $spec[0] ],
							'css'       => $spec[1],
							'transform' => $len,
						),
					)
				);
			}
		}
		$ring = sgs_colour_value( (string) ( $attributes['signedInDotRingColour'] ?? '' ) );
		if ( '' !== $ring ) {
			$width = $len( $attributes['signedInDotRingWidth'] ?? '' );
			$css[] = $sel . '{box-sizing:content-box;border:' . ( '' !== $width ? $width : '2px' ) . ' solid ' . $ring . ';}';
		}
		return implode( '', array_filter( $css ) );
	}
}

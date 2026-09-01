<?php
/**
 * `media-padding` atom — PHP value-setter twin of
 * `src/components/media/atoms/media-padding.js`.
 *
 * BRAND NEW capability, not a retrofit — `sgs/media` never declared a
 * padding attribute before this atom. See the JS twin's module docblock for
 * why this is scoped to padding alone rather than reintroducing
 * border/radius, which `box-shape` already owns.
 *
 * `sgs_media_atom_media_padding_css()` must emit BYTE-IDENTICAL declarations
 * to the JS twin's `css()` for the same attribute set — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_media_padding_sides_to_shorthand' ) ) {
	/**
	 * Convert a 4-SIDE box object into the CSS `padding` shorthand VALUE
	 * string ("top right bottom left") — mirrors the JS twin's
	 * `sidesToShorthand()` exactly. Each side already carries its own unit
	 * (`ResponsiveBoxControl`'s own shape), so no unit-append step runs here.
	 *
	 * @param mixed $sides Raw `Padding`-shaped value.
	 * @return string "T R B L", or '' when nothing is set.
	 */
	function sgs_media_atom_media_padding_sides_to_shorthand( $sides ) {
		if ( ! is_array( $sides ) ) {
			return '';
		}
		$order   = array( 'top', 'right', 'bottom', 'left' );
		$has_any = false;
		foreach ( $order as $k ) {
			if ( isset( $sides[ $k ] ) && '' !== $sides[ $k ] ) {
				$has_any = true;
				break;
			}
		}
		if ( ! $has_any ) {
			return '';
		}
		$parts = array();
		foreach ( $order as $k ) {
			$parts[] = ( isset( $sides[ $k ] ) && '' !== $sides[ $k ] ) ? $sides[ $k ] : '0';
		}
		return implode( ' ', $parts );
	}
}

if ( ! function_exists( 'sgs_media_atom_media_padding_requires' ) ) {
	/**
	 * Unconditional — nothing gates padding off.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null}
	 */
	function sgs_media_atom_media_padding_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_media_padding_css' ) ) {
	/**
	 * Custom-property declarations for this atom. Mirrors the JS twin's
	 * `css()` exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_media_padding_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();

		$base_key   = sgs_media_element_stored_attr( $block_slug, $prefix, 'Padding' );
		$tablet_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'PaddingTablet' );
		$mobile_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'PaddingMobile' );

		$tiers = array(
			$base_key   => '',
			$tablet_key => '-tablet',
			$mobile_key => '-mobile',
		);

		foreach ( $tiers as $key => $suffix ) {
			$shorthand = sgs_media_atom_media_padding_sides_to_shorthand( $attributes[ $key ] ?? null );
			if ( '' !== $shorthand ) {
				$decls[] = '--sgs-media-padding' . $suffix . ':' . $shorthand;
			}
		}

		return $decls;
	}
}

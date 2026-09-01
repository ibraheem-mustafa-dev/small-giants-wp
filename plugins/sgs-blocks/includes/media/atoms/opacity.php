<?php
/**
 * `opacity` atom — PHP value-setter twin of
 * `src/components/media/atoms/opacity.js`.
 *
 * Replaces `sgs/media`'s old hand-rolled `opacity:` declaration
 * (`render.php`'s `$media_base_decls[] = 'opacity:' . esc_attr( $opacity )`)
 * with a single custom property, `--sgs-media-opacity`, applied on
 * `.sgs-media-el` (Wave 5c, 2026-09-01).
 *
 * `sgs_media_atom_opacity_css()` must emit BYTE-IDENTICAL declarations to the
 * JS twin's `css()` for the same attribute set — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_opacity_validate' ) ) {
	/**
	 * Clamp to the valid CSS `opacity` range, rejecting a non-numeric value to
	 * the fully-opaque default — mirrors the old hand-rolled
	 * `max( 0.0, min( 1.0, floatval( $raw ) ) )` clamp exactly.
	 *
	 * @param mixed $value Raw candidate.
	 * @return float A value in [0, 1].
	 */
	function sgs_media_atom_opacity_validate( $value ) {
		if ( ! is_numeric( $value ) ) {
			return 1.0;
		}
		return max( 0.0, min( 1.0, (float) $value ) );
	}
}

if ( ! function_exists( 'sgs_media_atom_opacity_requires' ) ) {
	/**
	 * Unconditional — nothing gates opacity off.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null}
	 */
	function sgs_media_atom_opacity_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_opacity_css' ) ) {
	/**
	 * Custom-property declaration for this atom. Mirrors the JS twin's `css()`
	 * exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_opacity_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();

		$key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Opacity' );
		$raw = $attributes[ $key ] ?? null;

		if ( is_numeric( $raw ) ) {
			$clamped = sgs_media_atom_opacity_validate( $raw );
			if ( 1.0 !== $clamped ) {
				$decls[] = '--sgs-media-opacity:' . $clamped;
			}
		}

		return $decls;
	}
}

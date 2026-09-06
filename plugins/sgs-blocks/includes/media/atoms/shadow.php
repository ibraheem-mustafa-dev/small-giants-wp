<?php
/**
 * `shadow` atom — PHP value-setter twin of
 * `src/components/media/atoms/shadow.js`.
 *
 * Replaces `sgs/media`'s old hand-rolled `sgs_shadow_value_composed()` calls
 * (`render.php`'s resting + `:hover,:focus-within` box-shadow rules built
 * directly on `$id_sel`) with two custom properties,
 * `--sgs-media-box-shadow` and `--sgs-media-box-shadow-hover`, applied on
 * `.sgs-media-el` (Wave 5c, 2026-09-01).
 *
 * `sgs_media_atom_shadow_resolve()` is this atom's OWN mirrored copy of the
 * shape-resolution rule `sgs_shadow_value_composed()`
 * (`includes/helpers-tokens.php`) already implements — mirrored, not
 * called, matching `box-shape.php`'s own documented approach, and kept
 * separate from the general helper so this atom's PHP/JS twins hold
 * byte-parity with EACH OTHER, not with a third function.
 *
 * `sgs_media_atom_shadow_css()` must emit BYTE-IDENTICAL declarations to the
 * JS twin's `css()` for the same attribute set — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';
require_once dirname( __DIR__, 2 ) . '/helpers-tokens.php';

if ( ! function_exists( 'sgs_media_atom_shadow_is_raw_shape' ) ) {
	/**
	 * Is this shape string a raw CSS shadow, rather than a bare theme preset
	 * slug? Mirrors the JS twin's `isRawShape()` exactly.
	 *
	 * @param mixed $shape Raw candidate.
	 * @return bool True when $shape is a raw CSS shadow shape.
	 */
	function sgs_media_atom_shadow_is_raw_shape( $shape ) {
		if ( ! is_string( $shape ) ) {
			return false;
		}
		return (bool) preg_match( '/^(inset\s+)?-?[\d.]+px/i', $shape ) || 0 === strpos( $shape, 'inset' );
	}
}

if ( ! function_exists( 'sgs_media_atom_shadow_resolve' ) ) {
	/**
	 * Compose a shadow SHAPE with a separate colour attribute into the final
	 * CSS `box-shadow` value. Mirrors the JS twin's `resolveShadow()` exactly.
	 *
	 * @param mixed $shape  Raw shape string, or a bare preset slug.
	 * @param mixed $colour Colour value — ignored when $shape resolves to a preset slug.
	 * @return string CSS `box-shadow` value, or '' when $shape is empty.
	 */
	function sgs_media_atom_shadow_resolve( $shape, $colour ) {
		if ( ! is_string( $shape ) || '' === $shape ) {
			return '';
		}
		$trimmed = trim( $shape );
		if ( ! sgs_media_atom_shadow_is_raw_shape( $trimmed ) ) {
			return 'var(--wp--preset--shadow--' . $trimmed . ')';
		}
		$resolved_colour = sgs_colour_value( is_string( $colour ) ? $colour : '' );
		if ( '' === $resolved_colour ) {
			$resolved_colour = 'rgba(0,0,0,0.1)';
		}
		return $trimmed . ' ' . $resolved_colour;
	}
}

if ( ! function_exists( 'sgs_media_atom_shadow_requires' ) ) {
	/**
	 * The hover colour row only means anything once a shape is set.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null|string}
	 */
	function sgs_media_atom_shadow_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		$key = sgs_media_element_stored_attr( $block_slug, $prefix, 'BoxShadow' );
		if ( empty( $attributes[ $key ] ) ) {
			return array(
				'state'        => 'disabled',
				'hiddenReason' => 'The hover colour only applies once a shadow is set.',
			);
		}
		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_shadow_css' ) ) {
	/**
	 * Custom-property declarations for this atom. Mirrors the JS twin's
	 * `css()` exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_shadow_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();

		$keys = array(
			'base'        => sgs_media_element_stored_attr( $block_slug, $prefix, 'BoxShadow' ),
			'colour'      => sgs_media_element_stored_attr( $block_slug, $prefix, 'BoxShadowColour' ),
			'hoverColour' => sgs_media_element_stored_attr( $block_slug, $prefix, 'BoxShadowColourHover' ),
		);

		$shape = $attributes[ $keys['base'] ] ?? null;
		if ( empty( $shape ) ) {
			return $decls;
		}

		$resting = sgs_media_atom_shadow_resolve( $shape, $attributes[ $keys['colour'] ] ?? null );
		if ( '' !== $resting ) {
			$decls[] = '--sgs-media-box-shadow:' . $resting;
		}

		$hover_colour = $attributes[ $keys['hoverColour'] ] ?? null;
		if ( ! empty( $hover_colour ) ) {
			$hover = sgs_media_atom_shadow_resolve( $shape, $hover_colour );
			if ( '' !== $hover ) {
				$decls[] = '--sgs-media-box-shadow-hover:' . $hover;
			}
		}

		return $decls;
	}
}

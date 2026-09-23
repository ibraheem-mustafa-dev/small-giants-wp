<?php
/**
 * `shadow` atom: PHP value-setter twin of `src/components/media/atoms/shadow.js`.
 *
 * Two custom properties, `--sgs-media-box-shadow` and `--sgs-media-box-shadow-hover`, applied
 * on `.sgs-media-el`. The shadow itself is composed by the ONE shared composer,
 * `sgs_shadow_layers()` (`includes/helpers-shadow-layers.php`), which parses every layer and
 * re-emits only what it understands, so a stored value can never carry CSS out of its
 * declaration. This atom used to keep its own mirrored copy of that rule with no sanitiser at
 * all (a stored `...;}body{display:none}` reached the page); it now has none.
 *
 * The JS twin composes with `src/utils/shadow-layers.js`. Both are pinned to
 * `tests/shared/shadow-compose-cases.json`, one input-to-output table read by the PHP test and
 * the JS test.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';
require_once dirname( __DIR__, 2 ) . '/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/helpers-shadow-hover.php';

if ( ! function_exists( 'sgs_media_atom_shadow_resolve' ) ) {
	/**
	 * Compose a shadow SHAPE with a separate colour attribute into the final CSS `box-shadow` value.
	 *
	 * @param mixed $shape  Layers, a bare preset slug, or `none`.
	 * @param mixed $colour Colour entry or list; ignored when $shape is a preset slug.
	 * @return string CSS `box-shadow` value, or '' when there is nothing to draw.
	 */
	function sgs_media_atom_shadow_resolve( $shape, $colour ) {
		return sgs_shadow_layers( is_string( $shape ) ? $shape : '', is_string( $colour ) ? $colour : '' );
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

		$colour = $attributes[ $keys['colour'] ] ?? null;

		$resting = sgs_media_atom_shadow_resolve( $shape, $colour );
		if ( '' !== $resting ) {
			$decls[] = '--sgs-media-box-shadow:' . $resting;
		}

		$hover_colour = $attributes[ $keys['hoverColour'] ] ?? null;
		if ( ! empty( $hover_colour ) ) {
			$hover = sgs_media_atom_shadow_resolve( $shape, $hover_colour );
			if ( '' !== $hover ) {
				$decls[] = '--sgs-media-box-shadow-hover:' . $hover;
			}
		} elseif ( sgs_shadow_lift_enabled( $attributes, is_string( $block_slug ) ? $block_slug : '' ) ) {
			// AUTOMATIC LIFT (design H4, task lift-2) — only when this instance has NO
			// explicit hover colour set; the explicit branch above always wins outright.
			// The shared stylesheet (assets/css/media-atoms/shadow.css) already reads
			// `--sgs-media-box-shadow-hover` on `.sgs-media-el:hover,:focus-within`, so
			// filling the SAME custom property is "make the lift use that same path" —
			// no new CSS rule, no new selector, nothing to duplicate or drift.
			$lift = sgs_shadow_hover_value( is_string( $shape ) ? $shape : '', is_string( $colour ) ? $colour : '' );
			if ( '' !== $lift ) {
				$decls[] = '--sgs-media-box-shadow-hover:' . $lift;
			}
		}

		return $decls;
	}
}

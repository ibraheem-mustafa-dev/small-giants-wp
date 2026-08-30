<?php
/**
 * `overlay` atom — PHP value-setter twin of
 * `src/components/media/atoms/overlay.js`.
 *
 * Reuses `sgs_background_paint_value()` (helpers-tokens.php) for the
 * gradient-wins-over-colour + palette-token/raw-colour resolution — the
 * SAME primitive `sgs_overlay_decls()` builds on — but re-expresses the
 * result as custom properties rather than full CSS declarations, because
 * every media atom is contracted to emit ONLY `--custom-property:value`
 * (`_base.css`'s L4 contract). See the JS twin's docblock for the full
 * "three implementations, one bypassing the shared emitter" background and
 * the inconsistent-naming note (D338, no renames either side).
 *
 * `sgs_media_atom_overlay_css()` must emit BYTE-IDENTICAL declarations to
 * the JS twin's `css()` for the same attribute set — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';
require_once dirname( __DIR__, 2 ) . '/helpers-tokens.php';

if ( ! function_exists( 'sgs_media_atom_overlay_attr_keys' ) ) {
	/**
	 * Resolve this atom's six attribute keys for a prefix/block.
	 *
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return array{colour:string,colourHover:string,gradient:string,gradientHover:string,opacity:string,blendMode:string}
	 */
	function sgs_media_atom_overlay_attr_keys( $prefix, $block_slug ) {
		return array(
			'colour'        => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayColour' ),
			'colourHover'   => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayColourHover' ),
			'gradient'      => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayGradient' ),
			'gradientHover' => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayGradientHover' ),
			'opacity'       => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayOpacity' ),
			'blendMode'     => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayBlendMode' ),
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_overlay_requires' ) ) {
	/**
	 * Opacity and blend mode are dead controls without a colour or gradient
	 * to tint (registry.js `overlay.requires`).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null|string}
	 */
	function sgs_media_atom_overlay_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		$keys  = sgs_media_atom_overlay_attr_keys( $prefix, $block_slug );
		$paint = sgs_background_paint_value( $attributes[ $keys['colour'] ] ?? null, $attributes[ $keys['gradient'] ] ?? null );

		if ( '' === $paint['property'] ) {
			return array(
				'state'        => 'disabled',
				'hiddenReason' => __( 'Opacity and blend mode only apply once an overlay colour or gradient is set.', 'sgs-blocks' ),
			);
		}

		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_overlay_css' ) ) {
	/**
	 * Custom-property declarations for this atom. Mirrors the JS twin's
	 * `css()` exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_overlay_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();
		$keys  = sgs_media_atom_overlay_attr_keys( $prefix, $block_slug );

		$paint = sgs_background_paint_value( $attributes[ $keys['colour'] ] ?? null, $attributes[ $keys['gradient'] ] ?? null );
		if ( '' === $paint['property'] ) {
			return $decls;
		}

		if ( 'background-image' === $paint['property'] ) {
			$decls[] = '--sgs-media-overlay-gradient:' . $paint['value'] . ';';
		} else {
			$decls[] = '--sgs-media-overlay-colour:' . $paint['value'] . ';';
		}

		$hover_paint = sgs_background_paint_value( $attributes[ $keys['colourHover'] ] ?? null, $attributes[ $keys['gradientHover'] ] ?? null );
		if ( 'background-image' === $hover_paint['property'] ) {
			$decls[] = '--sgs-media-overlay-gradient-hover:' . $hover_paint['value'] . ';';
		} elseif ( 'background-color' === $hover_paint['property'] ) {
			$decls[] = '--sgs-media-overlay-colour-hover:' . $hover_paint['value'] . ';';
		}

		$opacity = $attributes[ $keys['opacity'] ] ?? null;
		if ( null !== $opacity && '' !== $opacity && is_numeric( $opacity ) ) {
			$pct = max( 0.0, min( 100.0, (float) $opacity ) );
			if ( 100.0 !== $pct ) {
				$decls[] = '--sgs-media-overlay-opacity:' . rtrim( rtrim( number_format( $pct / 100, 4, '.', '' ), '0' ), '.' ) . ';';
			}
		}

		$blend_mode           = $attributes[ $keys['blendMode'] ] ?? null;
		$allowed_blend_modes  = array(
			'multiply',
			'screen',
			'overlay',
			'darken',
			'lighten',
			'color-dodge',
			'color-burn',
			'soft-light',
			'hard-light',
			'difference',
			'exclusion',
		);
		if ( $blend_mode && 'normal' !== $blend_mode && in_array( $blend_mode, $allowed_blend_modes, true ) ) {
			$decls[] = '--sgs-media-overlay-blend:' . $blend_mode . ';';
		}

		return $decls;
	}
}

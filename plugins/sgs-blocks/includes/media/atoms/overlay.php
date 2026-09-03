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
 * ── `OverlayOpacity` is TIERED (2026-09-03) — see the JS twin's docblock for
 * the full rationale. `OverlayOpacity` has been in `MEDIA_TIERED_BASES` for
 * some time already, so `media-element-attrs-register.php` already registers
 * `overlayOpacityTablet`/`overlayOpacityMobile` (and prefixed siblings) on
 * every current adopter; only this atom's own emitter was not reading them.
 * Colour/gradient/blend-mode stay untiered.
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
	 * Resolve this atom's eight attribute keys for a prefix/block.
	 *
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return array{colour:string,colourHover:string,gradient:string,gradientHover:string,opacity:string,opacityTablet:string,opacityMobile:string,blendMode:string}
	 */
	function sgs_media_atom_overlay_attr_keys( $prefix, $block_slug ) {
		return array(
			'colour'        => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayColour' ),
			'colourHover'   => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayColourHover' ),
			'gradient'      => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayGradient' ),
			'gradientHover' => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayGradientHover' ),
			'opacity'       => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayOpacity' ),
			'opacityTablet' => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayOpacityTablet' ),
			'opacityMobile' => sgs_media_element_stored_attr( $block_slug, $prefix, 'OverlayOpacityMobile' ),
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

if ( ! function_exists( 'sgs_media_atom_overlay_format_opacity_fraction' ) ) {
	/**
	 * Clamp a raw opacity candidate to 0-100 and format it as the CSS fraction
	 * string this atom stores (`0.3`, never `0.3000000000004`). Shared by the
	 * base and both tier declarations in `sgs_media_atom_overlay_css()` —
	 * mirrors the JS twin's `formatOpacityDecl()` exactly.
	 *
	 * @param mixed $raw Raw candidate.
	 * @return string|null Fraction string, or null when not numeric / clamps
	 *                      to 100 (the CSS initial/no-op — never emitted).
	 */
	function sgs_media_atom_overlay_format_opacity_fraction( $raw ) {
		if ( null === $raw || '' === $raw || ! is_numeric( $raw ) ) {
			return null;
		}
		$pct = max( 0.0, min( 100.0, (float) $raw ) );
		if ( 100.0 === $pct ) {
			return null;
		}
		return rtrim( rtrim( number_format( $pct / 100, 4, '.', '' ), '0' ), '.' );
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
			$decls[] = '--sgs-media-overlay-gradient:' . $paint['value'];
		} else {
			$decls[] = '--sgs-media-overlay-colour:' . $paint['value'];
		}

		$hover_paint = sgs_background_paint_value( $attributes[ $keys['colourHover'] ] ?? null, $attributes[ $keys['gradientHover'] ] ?? null );
		if ( 'background-image' === $hover_paint['property'] ) {
			$decls[] = '--sgs-media-overlay-gradient-hover:' . $hover_paint['value'];
		} elseif ( 'background-color' === $hover_paint['property'] ) {
			$decls[] = '--sgs-media-overlay-colour-hover:' . $hover_paint['value'];
		}

		$opacity = sgs_media_atom_overlay_format_opacity_fraction( $attributes[ $keys['opacity'] ] ?? null );
		if ( null !== $opacity ) {
			$decls[] = '--sgs-media-overlay-opacity:' . $opacity;
		}

		$opacity_tablet = sgs_media_atom_overlay_format_opacity_fraction( $attributes[ $keys['opacityTablet'] ] ?? null );
		if ( null !== $opacity_tablet ) {
			$decls[] = '--sgs-media-overlay-opacity-tablet:' . $opacity_tablet;
		}

		$opacity_mobile = sgs_media_atom_overlay_format_opacity_fraction( $attributes[ $keys['opacityMobile'] ] ?? null );
		if ( null !== $opacity_mobile ) {
			$decls[] = '--sgs-media-overlay-opacity-mobile:' . $opacity_mobile;
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
			$decls[] = '--sgs-media-overlay-blend:' . $blend_mode;
		}

		return $decls;
	}
}

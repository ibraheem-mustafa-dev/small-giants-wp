<?php
/**
 * `svg-presentation` atom — PHP value-setter twin of
 * `src/components/media/atoms/svg-presentation.js`.
 *
 * See the JS twin's docblock for the full background: vocabulary mirrors
 * `sgs/container`'s `BackgroundPanel` SVG tab, but this is a NEW parallel
 * implementation (custom properties on `.sgs-media-el`, not the BEM
 * modifier classes container's own `class-sgs-container-wrapper.php` uses),
 * and its `@keyframes`/`animation-name` rule carries its OWN
 * `prefers-reduced-motion` guard in `svg-presentation.css` — the existing
 * guards (`hero/style.css`, `container/style.css`, `parallax.js`) are scoped
 * to selectors this atom does not touch.
 *
 * `sgs_media_atom_svg_presentation_css()` must emit BYTE-IDENTICAL
 * declarations to the JS twin's `css()` for the same attribute set —
 * enforced by `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_svg_presentation_validate_position' ) ) {
	/**
	 * Reject an out-of-vocabulary `SvgPosition` value to 'background'.
	 *
	 * @param mixed $value Raw candidate.
	 * @return string
	 */
	function sgs_media_atom_svg_presentation_validate_position( $value ) {
		$allowed = array( 'background', 'foreground' );
		return is_string( $value ) && in_array( $value, $allowed, true ) ? $value : 'background';
	}
}

if ( ! function_exists( 'sgs_media_atom_svg_presentation_validate_animation' ) ) {
	/**
	 * Reject an out-of-vocabulary `SvgAnimation` value to 'none'.
	 *
	 * @param mixed $value Raw candidate.
	 * @return string
	 */
	function sgs_media_atom_svg_presentation_validate_animation( $value ) {
		$allowed = array( 'none', 'pulse', 'float', 'wave' );
		return is_string( $value ) && in_array( $value, $allowed, true ) ? $value : 'none';
	}
}

if ( ! function_exists( 'sgs_media_atom_svg_presentation_validate_speed' ) ) {
	/**
	 * Reject an out-of-vocabulary `SvgAnimationSpeed` value to 'medium'.
	 *
	 * @param mixed $value Raw candidate.
	 * @return string
	 */
	function sgs_media_atom_svg_presentation_validate_speed( $value ) {
		$allowed = array( 'slow', 'medium', 'fast' );
		return is_string( $value ) && in_array( $value, $allowed, true ) ? $value : 'medium';
	}
}

if ( ! function_exists( 'sgs_media_atom_svg_presentation_attr_keys' ) ) {
	/**
	 * Resolve this atom's six attribute keys for a prefix/block.
	 *
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return array{position:string,animation:string,speed:string,opacity:string,textShadow:string,minHeight:string}
	 */
	function sgs_media_atom_svg_presentation_attr_keys( $prefix, $block_slug ) {
		return array(
			'position'   => sgs_media_element_stored_attr( $block_slug, $prefix, 'SvgPosition' ),
			'animation'  => sgs_media_element_stored_attr( $block_slug, $prefix, 'SvgAnimation' ),
			'speed'      => sgs_media_element_stored_attr( $block_slug, $prefix, 'SvgAnimationSpeed' ),
			'opacity'    => sgs_media_element_stored_attr( $block_slug, $prefix, 'SvgOpacity' ),
			'textShadow' => sgs_media_element_stored_attr( $block_slug, $prefix, 'SvgTextShadow' ),
			'minHeight'  => sgs_media_element_stored_attr( $block_slug, $prefix, 'SvgMinHeight' ),
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_svg_presentation_requires' ) ) {
	/**
	 * Animation speed is a dead control while animation is 'none'.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null|string}
	 */
	function sgs_media_atom_svg_presentation_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		$keys      = sgs_media_atom_svg_presentation_attr_keys( $prefix, $block_slug );
		$animation = sgs_media_atom_svg_presentation_validate_animation( $attributes[ $keys['animation'] ] ?? null );

		if ( 'none' === $animation ) {
			return array(
				'state'        => 'disabled',
				'hiddenReason' => __( 'Animation speed only applies once an animation is chosen.', 'sgs-blocks' ),
			);
		}

		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_svg_presentation_css' ) ) {
	/**
	 * Custom-property declarations for this atom. Mirrors the JS twin's
	 * `css()` exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_svg_presentation_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();
		$keys  = sgs_media_atom_svg_presentation_attr_keys( $prefix, $block_slug );

		// Only emit when the client actually chose a position. Emitting a z-index
		// unconditionally means the stylesheet's own `var( …, default )` fallback
		// can never apply, so every SVG is forced behind its content even where
		// nothing was set - a value the client never picked overriding a default
		// they never saw. Mirrors the JS half exactly; the parity gate holds them
		// together.
		$raw_position = $attributes[ $keys['position'] ] ?? null;
		if ( $raw_position ) {
			$position = sgs_media_atom_svg_presentation_validate_position( $raw_position );
			$decls[]  = '--sgs-media-svg-zindex:' . ( 'foreground' === $position ? 1 : -1 );
		}

		$animation = sgs_media_atom_svg_presentation_validate_animation( $attributes[ $keys['animation'] ] ?? null );
		if ( 'none' !== $animation ) {
			$animation_names = array(
				'pulse' => 'sgs-media-svg-pulse',
				'float' => 'sgs-media-svg-float',
				'wave'  => 'sgs-media-svg-wave',
			);
			$decls[]         = '--sgs-media-svg-animation-name:' . $animation_names[ $animation ];

			$speed            = sgs_media_atom_svg_presentation_validate_speed( $attributes[ $keys['speed'] ] ?? null );
			$speed_durations  = array(
				'slow'   => '6s',
				'medium' => '3s',
				'fast'   => '1.5s',
			);
			$decls[]          = '--sgs-media-svg-animation-duration:' . $speed_durations[ $speed ];
		}

		$opacity = $attributes[ $keys['opacity'] ] ?? null;
		if ( is_numeric( $opacity ) ) {
			$pct = max( 0.0, min( 100.0, (float) $opacity ) );
			if ( 100.0 !== $pct ) {
				$decls[] = '--sgs-media-svg-opacity:' . round( $pct ) / 100;
			}
		}

		if ( ! empty( $attributes[ $keys['textShadow'] ] ) ) {
			$decls[] = '--sgs-media-svg-text-shadow:0 1px 3px rgba(0, 0, 0, 0.6)';
		}

		$min_height = $attributes[ $keys['minHeight'] ] ?? null;
		if ( is_string( $min_height ) && '' !== trim( $min_height ) ) {
			$decls[] = '--sgs-media-svg-min-height:' . trim( $min_height );
		}

		return $decls;
	}
}

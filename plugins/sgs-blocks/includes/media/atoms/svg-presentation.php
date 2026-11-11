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

require_once dirname( __DIR__ ) . '/media-values.php';

if ( ! function_exists( 'sgs_media_atom_svg_presentation_emit' ) ) {
	/**
	 * C3 emitter: `z-index` for Layer order (`behind` is -1, `front` is 1) and `text-shadow` for SvgTextShadow, on the
	 * media element. The animation and the duplicate opacity belong to Effects and the opacity atom.
	 *
	 * @param array  $slot   Slot `{prefix, kinds, context, wrapper}`.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string CSS, '' when nothing is set.
	 */
	function sgs_media_atom_svg_presentation_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		$media = sgs_media_nodes( $slot, $uid, $helper )['media'];
		$rules = array();
		$layer = sgs_media_scalar( $attrs, $slot, 'SvgLayer' );
		if ( 'behind' === $layer || 'front' === $layer ) {
			sgs_media_add( $rules, $media, 'desktop', 'z-index', 'front' === $layer ? '1' : '-1' );
		}
		if ( true === sgs_media_scalar( $attrs, $slot, 'SvgTextShadow' ) ) {
			sgs_media_add( $rules, $media, 'desktop', 'text-shadow', '0 1px 3px rgba(0,0,0,.6)' );
		}
		return sgs_media_rules_css( $rules );
	}
}

<?php
/**
 * `motion` atom — PHP value-setter twin of
 * `src/components/media/atoms/motion.js`.
 *
 * See the JS twin's docblock for the full background: a mutually-exclusive
 * ken-burns/parallax pair, already proven on `sgs/hero`'s split-media
 * (`mediaKenBurns`/`mediaParallax`/`mediaAnimationDuration`) and
 * `sgs/container`'s background (`bgKenBurns`/`bgParallax`/
 * `bgAnimationDuration`), re-expressed here as custom properties on
 * `.sgs-media-el` instead of a BEM modifier class — `svg-presentation`'s own
 * `SvgAnimation` base already solved the identical "named keyframe effect
 * via a custom property" problem and this atom follows that precedent.
 *
 * `sgs_media_atom_motion_css()` must emit BYTE-IDENTICAL declarations to the
 * JS twin's `css()` for the same attribute set — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_motion_validate_boolean' ) ) {
	/**
	 * Reject a non-boolean `KenBurns`/`Parallax` value to `false`.
	 *
	 * @param mixed $value Raw candidate.
	 * @return bool
	 */
	function sgs_media_atom_motion_validate_boolean( $value ) {
		return true === $value;
	}
}

if ( ! function_exists( 'sgs_media_atom_motion_validate_duration' ) ) {
	/**
	 * Reject an out-of-range `AnimationDuration` to the default, clamping any
	 * finite in-range number to whole seconds — mirrors the JS twin.
	 *
	 * @param mixed $value Raw candidate.
	 * @return int 5-60 inclusive.
	 */
	function sgs_media_atom_motion_validate_duration( $value ) {
		$num = is_numeric( $value ) ? (float) $value : 20;
		return (int) max( 5, min( 60, round( $num ) ) );
	}
}

if ( ! function_exists( 'sgs_media_atom_motion_attr_keys' ) ) {
	/**
	 * Resolve this atom's three attribute keys for a prefix/block.
	 *
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return array{kenBurns:string,parallax:string,duration:string}
	 */
	function sgs_media_atom_motion_attr_keys( $prefix, $block_slug ) {
		return array(
			'kenBurns' => sgs_media_element_stored_attr( $block_slug, $prefix, 'KenBurns' ),
			'parallax' => sgs_media_element_stored_attr( $block_slug, $prefix, 'Parallax' ),
			'duration' => sgs_media_element_stored_attr( $block_slug, $prefix, 'AnimationDuration' ),
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_motion_requires' ) ) {
	/**
	 * `AnimationDuration` is a dead control while `KenBurns` is off. Mirrors
	 * the JS twin's `disclosure()` map shape.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array<string,array{state:string,hiddenReason:null|string}>
	 */
	function sgs_media_atom_motion_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		$keys         = sgs_media_atom_motion_attr_keys( $prefix, $block_slug );
		$ken_burns_on = sgs_media_atom_motion_validate_boolean( $attributes[ $keys['kenBurns'] ] ?? null );

		return array(
			'KenBurns'          => array(
				'state'        => 'shown',
				'hiddenReason' => null,
			),
			'Parallax'          => array(
				'state'        => 'shown',
				'hiddenReason' => null,
			),
			'AnimationDuration' => $ken_burns_on
				? array(
					'state'        => 'shown',
					'hiddenReason' => null,
				)
				: array(
					'state'        => 'disabled',
					'hiddenReason' => __( 'Animation duration only applies once ken-burns zoom is turned on.', 'sgs-blocks' ),
				),
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_motion_css' ) ) {
	/**
	 * Custom-property declarations for this atom. Mirrors the JS twin's
	 * `css()` exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_motion_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();
		$keys  = sgs_media_atom_motion_attr_keys( $prefix, $block_slug );

		// Parallax wins if somehow both attrs are true — mirrors the reference
		// implementations' own defensive resolution (`hero/render.php`:
		// `$media_ken_burns = !empty($attributes['mediaKenBurns']) && !$media_parallax;`).
		// Mirrors the JS half exactly; the parity gate holds them together.
		$parallax_active  = sgs_media_atom_motion_validate_boolean( $attributes[ $keys['parallax'] ] ?? null );
		$ken_burns_active = sgs_media_atom_motion_validate_boolean( $attributes[ $keys['kenBurns'] ] ?? null ) && ! $parallax_active;

		if ( $ken_burns_active ) {
			$decls[]  = '--sgs-media-motion-animation-name:sgs-media-motion-ken-burns';
			$duration = sgs_media_atom_motion_validate_duration( $attributes[ $keys['duration'] ] ?? null );
			$decls[]  = '--sgs-media-motion-animation-duration:' . $duration . 's';
		} elseif ( $parallax_active ) {
			$decls[] = '--sgs-media-motion-animation-name:sgs-media-motion-parallax';
			$decls[] = '--sgs-media-motion-animation-timing-function:linear';
			$decls[] = '--sgs-media-motion-animation-iteration-count:1';
			$decls[] = '--sgs-media-motion-animation-direction:normal';
			$decls[] = '--sgs-media-motion-animation-fill-mode:both';
			$decls[] = '--sgs-media-motion-animation-timeline:scroll(root)';
		}

		return $decls;
	}
}

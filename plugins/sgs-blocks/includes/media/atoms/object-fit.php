<?php
/**
 * `object-fit` atom — PHP value-setter twin of
 * `src/components/media/atoms/object-fit.js`.
 *
 * One client-facing question backing TWO CSS properties depending on scope
 * (registry.js `vocabulary`): element scope -> `object-fit` (the `ObjectFit`
 * base), backdrop scope -> `background-size` (the `Size` base).
 *
 * ── ELEMENT scope is tiered (Bean-directed, 2026-09-01, reversing an earlier
 * documented decision) ───────────────────────────────────────────────────
 * Different media genuinely needs a different fit mode per device — a video
 * that's `cover` on desktop but `contain` on a small mobile screen, so the
 * subject isn't cropped out of frame. `MEDIA_TIERED_BASES`
 * (`MediaElementControls.js`) now carries `ObjectFit`, so this twin emits
 * `ObjectFitTablet`/`ObjectFitMobile` declarations alongside the base, for
 * the ELEMENT scope only. The BACKDROP scope's `Size` base stays untiered.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_object_fit_validate' ) ) {
	/**
	 * Reject an out-of-vocabulary fit value to '' (inherit). `$scope` selects
	 * which of the two vocabularies governs the check — an element-legal value
	 * (e.g. 'fill') is NOT automatically backdrop-legal.
	 *
	 * @param mixed  $value Raw candidate.
	 * @param string $scope 'element' | 'backdrop'.
	 * @return string A vocabulary member, or ''.
	 */
	function sgs_media_atom_object_fit_validate( $value, $scope = 'element' ) {
		$vocabulary = array(
			'element'  => array( 'cover', 'contain', 'fill', 'none', 'scale-down' ),
			'backdrop' => array( 'cover', 'contain', 'auto' ),
		);
		$allowed    = isset( $vocabulary[ $scope ] ) ? $vocabulary[ $scope ] : array();
		return is_string( $value ) && in_array( $value, $allowed, true ) ? $value : '';
	}
}

if ( ! function_exists( 'sgs_media_atom_object_fit_requires' ) ) {
	/**
	 * `object-fit` declares an empty `requires` in the registry — always
	 * visible, for both scopes.
	 *
	 * @param array  $attributes Block attributes (unused — kept for signature
	 *                           parity with every atom's `requires()`).
	 * @param string $prefix     Surface prefix (unused).
	 * @return array { state: string, hiddenReason: string|null }.
	 */
	function sgs_media_atom_object_fit_requires( array $attributes, $prefix = '' ) {
		unset( $attributes, $prefix );
		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
	}
}

require_once dirname( __DIR__ ) . '/media-values.php';

if ( ! function_exists( 'sgs_media_atom_object_fit_emit' ) ) {
	/**
	 * C3 emitter: `object-fit` on the media element once per device that sets its own Fit. Tile (backgrounds) prints
	 * `background-repeat` and `background-size` instead, and Pinned prints `background-attachment:fixed`.
	 *
	 * @param array  $slot   Slot `{prefix, kinds, context, wrapper}`.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string CSS, '' when nothing is set.
	 */
	function sgs_media_atom_object_fit_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		$media   = sgs_media_nodes( $slot, $uid, $helper )['media'];
		$fits    = array( 'cover', 'contain', 'fill', 'none', 'scale-down' );
		$repeats = array( 'repeat', 'repeat-x', 'repeat-y', 'no-repeat' );
		$rules   = array();
		foreach ( sgs_media_devices() as $device ) {
			$fit = sgs_media_own( $attrs, $slot, 'Fit', $device );
			if ( in_array( $fit, $fits, true ) ) {
				sgs_media_add( $rules, $media, $device, 'object-fit', $fit );
			} elseif ( 'tile' === $fit ) {
				$repeat = sgs_media_resolved( $attrs, $slot, 'Repeat', $device );
				$size   = sgs_media_length( sgs_media_resolved( $attrs, $slot, 'TileSize', $device ), array( 'auto' ) );
				sgs_media_add( $rules, $media, $device, 'background-repeat', in_array( $repeat, $repeats, true ) ? $repeat : 'repeat' );
				sgs_media_add( $rules, $media, $device, 'background-size', '' !== $size ? $size : 'auto' );
			}
		}
		if ( true === sgs_media_scalar( $attrs, $slot, 'Pinned' ) ) {
			sgs_media_add( $rules, $media, 'desktop', 'background-attachment', 'fixed' );
		}
		return sgs_media_rules_css( $rules );
	}
}

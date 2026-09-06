<?php
/**
 * `object-fit` atom — PHP value-setter twin of
 * `src/components/media/atoms/object-fit.js`.
 *
 * One client-facing question backing TWO CSS properties depending on scope
 * (registry.js `vocabulary`): element scope -> `object-fit` (the `ObjectFit`
 * base), backdrop scope -> `background-size` (the `Size` base).
 *
 * ⛔ `custom` is NOT a member of either vocabulary — it is a SIZING MODE read
 * by the `box-shape` atom (see `sgs/hero`'s `splitMediaObjectFit` handling in
 * `hero/render.php` around line 625, which gates object-fit off entirely for
 * `custom`). Never validate or emit it here.
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
 * `sgs_media_atom_object_fit_css()` must emit BYTE-IDENTICAL declarations to
 * the JS twin's `css()` for the same attribute set — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
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

if ( ! function_exists( 'sgs_media_atom_object_fit_css' ) ) {
	/**
	 * Custom-property declarations for this atom. Mirrors the JS twin's
	 * `css()` exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix ('' | 'sgs' | 'split' | …).
	 * @param string $block_slug Block slug, for `STORED_AS` resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_object_fit_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();

		// Element scope, tiered (MEDIA_TIERED_BASES carries `ObjectFit`).
		$fit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFit' );
		$fit     = sgs_media_atom_object_fit_validate( $attributes[ $fit_key ] ?? null, 'element' );
		if ( '' !== $fit ) {
			$decls[] = '--sgs-media-object-fit:' . $fit;
		}
		$fit_tablet_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFitTablet' );
		$fit_tablet     = sgs_media_atom_object_fit_validate( $attributes[ $fit_tablet_key ] ?? null, 'element' );
		if ( '' !== $fit_tablet ) {
			$decls[] = '--sgs-media-object-fit-tablet:' . $fit_tablet;
		}
		$fit_mobile_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFitMobile' );
		$fit_mobile     = sgs_media_atom_object_fit_validate( $attributes[ $fit_mobile_key ] ?? null, 'element' );
		if ( '' !== $fit_mobile ) {
			$decls[] = '--sgs-media-object-fit-mobile:' . $fit_mobile;
		}

		// Backdrop scope. `Size` is NOT in MEDIA_TIERED_BASES — not tiered.
		$size_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Size' );
		$size     = sgs_media_atom_object_fit_validate( $attributes[ $size_key ] ?? null, 'backdrop' );
		if ( '' !== $size ) {
			$decls[] = '--sgs-media-background-size:' . $size;
		}

		return $decls;
	}
}

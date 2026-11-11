<?php
/**
 * Atom: INTRINSIC (PHP half) — the chosen media's own pixel dimensions.
 *
 * Server twin of `src/components/media/atoms/intrinsic.js`. `ImageWidth`/
 * `ImageHeight` reach the page as HTML `width`/`height` ATTRIBUTES on the
 * rendered `<img>` (the CLS-prevention mechanism), never as CSS — so this
 * atom's `css()` export is always empty. There is no control on this side
 * either: `registry.js` declares `clientEditable: false`.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sgs_media_atom_intrinsic_requires' ) ) {
	/**
	 * Always omitted — there is no control to show, disable, or hide.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @return array { state, hiddenReason }.
	 */
	function sgs_media_atom_intrinsic_requires( array $attributes, $prefix ) {
		return array(
			'state'        => 'omitted',
			'hiddenReason' => 'Intrinsic dimensions are written from the chosen media and are never edited directly.',
		);
	}
}

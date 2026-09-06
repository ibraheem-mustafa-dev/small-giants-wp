<?php
/**
 * Atom: MEANING (PHP half) — accessibility text for the media.
 *
 * Server twin of `src/components/media/atoms/meaning.js`. `registry.js`
 * declares `requires: { ImageAlt: [ '!ImageDecorative' ] }` — alt text is
 * meaningless once the client marks the media decorative.
 *
 * ⛔ The `_requires` signature carries no `$block_slug` (contract-fixed:
 * `array $attributes, $prefix` only), so this reads the plain
 * `sgs_media_element_attr()` name rather than the STORED_AS-aware
 * `sgs_media_element_stored_attr()` — correct here because `ImageDecorative`
 * has no STORED_AS override anywhere in the census.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/../../helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_meaning_requires' ) ) {
	/**
	 * Disclosure rule for the atom's one CONDITIONAL row (alt text). The
	 * decorative toggle itself is unconditional and is not what this
	 * reports.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @return array { state, hiddenReason }.
	 */
	function sgs_media_atom_meaning_requires( array $attributes, $prefix ) {
		$key           = sgs_media_element_attr( $prefix, 'ImageDecorative' );
		$is_decorative = ! empty( $attributes[ $key ] );

		if ( $is_decorative ) {
			return array(
				'state'        => 'disabled',
				'hiddenReason' => 'Alt text is meaningless once the media is marked decorative.',
			);
		}

		return array( 'state' => 'shown' );
	}
}

if ( ! function_exists( 'sgs_media_atom_meaning_css' ) ) {
	/**
	 * No CSS. Alt text and the decorative flag are HTML attributes, never
	 * stylesheet values.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array Always empty.
	 */
	function sgs_media_atom_meaning_css( array $attributes, $prefix, $block_slug ) {
		return array();
	}
}

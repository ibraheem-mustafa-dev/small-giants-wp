<?php
/**
 * `caption` atom — PHP value-setter twin of
 * `src/components/media/atoms/caption.js`.
 *
 * NON-PAINT, EDITORIAL — see the JS twin's module docblock. `render.php`'s
 * own caption-markup builder is UNCHANGED by this atom (it already reads the
 * plain `caption`/`captionTag` attribute names, which match this atom's own
 * canonical bases exactly — zero attribute rename); this file exists purely
 * so the atom contract's PHP-twin requirement is satisfied and so
 * `sgs_media_atom_caption_requires()`/`_css()` exist for any future caller
 * that composes atoms generically (`SGS_Media_Element::requires_box()` etc.).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_caption_validate_tag' ) ) {
	/**
	 * Reject an out-of-vocabulary `CaptionTag` value to 'figcaption'.
	 *
	 * @param mixed $value Raw candidate.
	 * @return string A vocabulary member.
	 */
	function sgs_media_atom_caption_validate_tag( $value ) {
		$vocabulary = array( 'figcaption', 'div' );
		return is_string( $value ) && in_array( $value, $vocabulary, true ) ? $value : 'figcaption';
	}
}

if ( ! function_exists( 'sgs_media_atom_caption_requires' ) ) {
	/**
	 * Unconditional — nothing gates the caption fields off.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null}
	 */
	function sgs_media_atom_caption_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_caption_css' ) ) {
	/**
	 * No CSS. Caption text/tag are HTML content and structure, never
	 * stylesheet values.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array Always empty.
	 */
	function sgs_media_atom_caption_css( array $attributes, $prefix, $block_slug ) {
		return array();
	}
}

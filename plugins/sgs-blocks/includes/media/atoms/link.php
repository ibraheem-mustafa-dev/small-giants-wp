<?php
/**
 * `link` atom — PHP value-setter twin of `src/components/media/atoms/link.js`.
 *
 * NON-PAINT, EDITORIAL, IMAGE-ONLY — see the JS twin's module docblock.
 * `render.php`'s own link-wrapping logic is UNCHANGED by this atom (it
 * already reads the plain `linkUrl`/`linkOpensNewTab`/`linkRel` attribute
 * names, which match this atom's own canonical bases exactly — zero
 * attribute rename); this file exists so the atom contract's PHP-twin
 * requirement is satisfied.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_link_requires' ) ) {
	/**
	 * Unconditional — nothing gates the link fields off.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null}
	 */
	function sgs_media_atom_link_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_link_css' ) ) {
	/**
	 * No CSS. The link is an anchor wrapper, never a stylesheet value.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array Always empty.
	 */
	function sgs_media_atom_link_css( array $attributes, $prefix, $block_slug ) {
		return array();
	}
}

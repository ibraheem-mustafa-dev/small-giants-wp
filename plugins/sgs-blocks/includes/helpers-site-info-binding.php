<?php
/**
 * Which Site Info key a block attribute is bound to.
 *
 * Core resolves a binding into `$attributes` before render.php runs, but a resolved '' cannot say whether the
 * attribute was bound to an empty Site Info value or simply never set. A block that hides itself when its bound
 * value is empty (sgs/icon) asks this helper for the key, then reads the store itself.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_bound_site_info_key' ) ) {
	/**
	 * The Site Info key an attribute is bound to through the `sgs/site-info` source, or null.
	 *
	 * @param WP_Block|array $block The block being rendered (a WP_Block, or its parsed-block array).
	 * @param string         $attr  The attribute name, e.g. 'linkUrl'.
	 * @return string|null The dot-notation key ('phone', 'socials.whatsapp'), or null when not bound to Site Info.
	 */
	function sgs_bound_site_info_key( $block, string $attr ): ?string {
		$parsed  = $block instanceof WP_Block ? $block->parsed_block : $block;
		$binding = is_array( $parsed ) ? ( $parsed['attrs']['metadata']['bindings'][ $attr ] ?? null ) : null;
		if ( ! is_array( $binding ) || 'sgs/site-info' !== ( $binding['source'] ?? '' ) ) {
			return null;
		}
		$key = $binding['args']['key'] ?? '';
		return is_string( $key ) && '' !== $key ? $key : null;
	}
}

if ( ! function_exists( 'sgs_bound_site_info_is_empty' ) ) {
	/**
	 * True when an attribute is bound to Site Info and that key makes no link (a link attribute) or holds no value.
	 *
	 * @param WP_Block|array $block The block being rendered.
	 * @param string         $attr  The attribute name.
	 * @return bool False when the attribute is not bound to Site Info.
	 */
	function sgs_bound_site_info_is_empty( $block, string $attr ): bool {
		$key = sgs_bound_site_info_key( $block, $attr );
		if ( null === $key || ! class_exists( '\SGS\Blocks\Sgs_Site_Info_Binding' ) ) {
			return false;
		}
		if ( \SGS\Blocks\Sgs_Site_Info_Binding::is_link_attribute( $attr ) ) {
			return '' === \SGS\Blocks\Sgs_Site_Info_Binding::link_for_key( $key );
		}
		$raw = class_exists( '\SGS\Blocks\Sgs_Site_Info' ) ? \SGS\Blocks\Sgs_Site_Info::get( $key ) : '';
		return ! is_scalar( $raw ) || '' === trim( (string) $raw );
	}
}

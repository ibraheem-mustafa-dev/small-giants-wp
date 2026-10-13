<?php
/**
 * Business Info (map): the embed URL for each map source.
 *
 * `address` searches Google Maps for the Site Info address (a bare pin). `business` searches for the
 * business name plus its address, which Google resolves to the business's own listing card; with no
 * business name stored it falls back to the address search. A share.google or maps.app.goo.gl short
 * link cannot be embedded, so the Site Info Maps link is never used here. Both texts arrive HTML-escaped
 * (WordPress stores the site title as `Joe&#039;s Cafe`, kses stores `&` in an address as `&amp;`), so they are
 * decoded to plain text before they are URL-encoded; otherwise Google searches for the entity.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_business_info_map_url' ) ) {
	/**
	 * The iframe src for the map, or '' when there is nothing to search for.
	 *
	 * @param string $source        'address' (default) or 'business'.
	 * @param string $address       Site Info address; <br> separators are folded to commas.
	 * @param string $business_name The business name, used by the 'business' source.
	 * @return string Embed URL, unescaped.
	 */
	function sgs_business_info_map_url( string $source, string $address, string $business_name ): string {
		$query         = trim( html_entity_decode( (string) preg_replace( '/\s*<br\s*\/?>\s*/i', ', ', $address ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
		$business_name = trim( html_entity_decode( $business_name, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
		if ( 'business' === $source && '' !== $business_name ) {
			$query = '' !== $query ? $business_name . ', ' . $query : $business_name;
		}
		if ( '' === $query ) {
			return '';
		}
		return 'https://maps.google.com/maps?q=' . rawurlencode( $query ) . '&z=15&hl=en&t=m&output=embed&iwloc=near';
	}
}

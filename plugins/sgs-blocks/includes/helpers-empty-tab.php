<?php
/**
 * Empty-tab detection — shared by sgs/tabs' render.php.
 *
 * A tab whose rendered content carries no visible text and no media element
 * is treated as empty (mirrors WooCommerce's own core Product Details block,
 * which removes accordion items whose rendered content has no text, img,
 * iframe, video or meter). Kept in its own file, guarded by
 * `function_exists()`, because render.php must never declare a top-level
 * function (fatals the page on the block's second instance on a page).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_tab_content_is_empty' ) ) {
	/**
	 * Whether a rendered tab's HTML carries no visible text and no media.
	 *
	 * Empty means: stripping all tags leaves nothing but whitespace AND the
	 * markup contains none of img/iframe/video/svg/meter/picture/canvas/audio.
	 * A tab with only whitespace-producing markup (e.g. an empty paragraph)
	 * but a genuine image inside still counts as non-empty.
	 *
	 * @param string $html Rendered inner-block HTML for one sgs/tab.
	 * @return bool True when the tab has nothing to show.
	 */
	function sgs_tab_content_is_empty( string $html ): bool {
		if ( '' !== trim( wp_strip_all_tags( $html ) ) ) {
			return false;
		}

		$media_tags = array( '<img', '<iframe', '<video', '<svg', '<meter', '<picture', '<canvas', '<audio' );
		foreach ( $media_tags as $tag ) {
			if ( false !== stripos( $html, $tag ) ) {
				return false;
			}
		}

		return true;
	}
}

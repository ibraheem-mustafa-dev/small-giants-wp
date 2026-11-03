<?php
/**
 * The product an sgs/buybox shows: the one pinned in its `buyboxProductId` setting, else the post it sits on.
 *
 * Applied once in src/blocks/buybox/render.php right after context resolution, so the manifest, sticky bar, extras,
 * gallery and the pack axis meta all read the same ID. A pin is honoured only for a product the viewer may already
 * read: published (or readable by the viewer), not password-protected, and a real product (not a variation).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_pinned_product_readable' ) ) {
	/**
	 * Whether a pinned product may be shown to the current viewer.
	 *
	 * @param int $product_id The pinned product ID.
	 * @return bool
	 */
	function sgs_buybox_pinned_product_readable( int $product_id ): bool {
		if ( $product_id <= 0 || ! function_exists( 'wc_get_product' ) ) {
			return false;
		}
		$product = wc_get_product( $product_id );
		if ( ! $product instanceof \WC_Product || $product->is_type( 'variation' ) ) {
			return false;
		}
		if ( '' !== (string) get_post_field( 'post_password', $product_id ) ) {
			return false;
		}
		return 'publish' === get_post_status( $product_id ) || current_user_can( 'read_post', $product_id );
	}
}

if ( ! function_exists( 'sgs_buybox_resolve_product_id' ) ) {
	/**
	 * The product ID the buy box renders.
	 *
	 * @param int $context_id The post resolved from block context or the queried object (0 when none).
	 * @param int $pinned_id  The `buyboxProductId` setting (0 = use the context post).
	 * @return int The ID to render; 0 when a pin is set but the viewer may not read that product.
	 */
	function sgs_buybox_resolve_product_id( int $context_id, int $pinned_id ): int {
		if ( $pinned_id <= 0 ) {
			return $context_id;
		}
		return sgs_buybox_pinned_product_readable( $pinned_id ) ? $pinned_id : 0;
	}
}

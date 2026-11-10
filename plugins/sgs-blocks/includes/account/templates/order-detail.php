<?php
/**
 * SGS Account order detail: replaces WooCommerce's view-order page with the block's own order detail (back link,
 * heading and status, progress line, item rows, address / payment / total boxes, WhatsApp card). Swapped in by
 * `Account_Extras::maybe_swap_view_order_template()` only while an sgs/account block renders with `orderDetailLook` on.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$sgs_order = function_exists( 'wc_get_order' ) ? wc_get_order( (int) ( $order_id ?? 0 ) ) : null;
if ( ! $sgs_order || ! function_exists( 'sgs_account_order_detail_html' ) ) {
	return;
}
$sgs_attrs = is_array( \SGS\Blocks\Account_Endpoints::$active ) ? \SGS\Blocks\Account_Endpoints::$active : array();
echo sgs_account_order_detail_html( $sgs_order, $sgs_attrs ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in sgs_account_order_detail_html().

<?php
/**
 * SGS Account orders empty state: a card with a heading, a line of text and a button, shown instead of
 * WooCommerce's "No order has been made yet" notice when the customer has no orders (swapped in by
 * `Account_Extras::maybe_swap_orders_template()` only while an sgs/account block renders with the setting on).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$sgs_attrs   = is_array( \SGS\Blocks\Account_Endpoints::$active ) ? \SGS\Blocks\Account_Endpoints::$active : array();
$sgs_heading = trim( (string) ( $sgs_attrs['ordersEmptyHeading'] ?? '' ) );
$sgs_text    = trim( (string) ( $sgs_attrs['ordersEmptyText'] ?? '' ) );
$sgs_label   = trim( (string) ( $sgs_attrs['ordersEmptyButtonLabel'] ?? '' ) );
$sgs_url     = trim( (string) ( $sgs_attrs['ordersEmptyButtonUrl'] ?? '' ) );
if ( '' === $sgs_url && function_exists( 'wc_get_page_permalink' ) ) {
	$sgs_url = (string) wc_get_page_permalink( 'shop' );
}

// WooCommerce's own orders template fires these around its content; extensions hook them.
do_action( 'woocommerce_before_account_orders', $has_orders ?? false );
?>
<?php echo function_exists( 'sgs_account_empty_card_html' ) ? sgs_account_empty_card_html( $sgs_heading, $sgs_text, $sgs_label, $sgs_url ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in sgs_account_empty_card_html(). ?>
<?php do_action( 'woocommerce_after_account_orders', $has_orders ?? false ); ?>

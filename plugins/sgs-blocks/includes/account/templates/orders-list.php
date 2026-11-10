<?php
/**
 * SGS Account orders list: replaces WooCommerce's `myaccount/orders.php` when the customer has orders and
 * `ordersRowList` is on. One bordered row per order (id and date, items, status pill, total, chevron), each row a link
 * to the order; WooCommerce's pagination buttons and before/after hooks are printed as in its own template.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.WP.I18n.TextDomainMismatch, WordPress.NamingConventions.PrefixAllGlobals -- WooCommerce's own hooks and template variables.

$sgs_attrs  = is_array( \SGS\Blocks\Account_Endpoints::$active ) ? \SGS\Blocks\Account_Endpoints::$active : array();
$sgs_orders = array();
foreach ( (array) ( $customer_orders->orders ?? array() ) as $sgs_id ) {
	$sgs_order = function_exists( 'wc_get_order' ) ? wc_get_order( $sgs_id ) : null;
	if ( $sgs_order ) {
		$sgs_orders[] = $sgs_order;
	}
}

do_action( 'woocommerce_before_account_orders', $has_orders ?? true );

echo function_exists( 'sgs_account_orders_list_html' ) ? sgs_account_orders_list_html( $sgs_orders, $sgs_attrs ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in sgs_account_orders_list_html().

if ( 1 < (int) ( $customer_orders->max_num_pages ?? 1 ) ) :
	?>
	<div class="woocommerce-pagination woocommerce-pagination--without-numbers woocommerce-Pagination">
		<?php if ( 1 !== (int) $current_page ) : ?>
			<a class="woocommerce-button woocommerce-button--previous woocommerce-Button woocommerce-Button--previous button" href="<?php echo esc_url( wc_get_endpoint_url( 'orders', $current_page - 1 ) ); ?>"><?php esc_html_e( 'Previous', 'woocommerce' ); ?></a>
		<?php endif; ?>
		<?php if ( intval( $customer_orders->max_num_pages ) !== (int) $current_page ) : ?>
			<a class="woocommerce-button woocommerce-button--next woocommerce-Button woocommerce-Button--next button" href="<?php echo esc_url( wc_get_endpoint_url( 'orders', $current_page + 1 ) ); ?>"><?php esc_html_e( 'Next', 'woocommerce' ); ?></a>
		<?php endif; ?>
	</div>
	<?php
endif;

do_action( 'woocommerce_after_account_orders', $has_orders ?? true );

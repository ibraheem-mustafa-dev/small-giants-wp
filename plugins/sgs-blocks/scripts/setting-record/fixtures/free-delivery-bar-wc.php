<?php
// A WooCommerce basket page for the offline render of sgs/free-delivery-bar: the cart page (is_cart() true) with a basket
// of 45.00 (items) and no tax, the state src/blocks/free-delivery-bar/render.php::$state reads from WC()->cart on cart
// and checkout (get_subtotal, get_subtotal_tax, is_empty) and includes/helpers-free-delivery.php::sgs_cart_delivery_costs_nothing
// reads (needs_shipping false: delivery is not already free). No absolute path: the runner's working directory is the
// plugin folder being rendered.
if ( ! function_exists( 'WC' ) ) {
	function WC() {
		static $wc = null;
		if ( null === $wc ) {
			$wc          = new stdClass();
			$wc->session = null;
			$wc->cart    = new class() {
				public function get_subtotal() { return '45.00'; }
				public function get_subtotal_tax() { return '0.00'; }
				public function is_empty() { return false; }
				public function needs_shipping() { return false; }
			};
		}
		return $wc;
	}
}
if ( ! function_exists( 'is_cart' ) ) { function is_cart() { return true; } }
if ( ! function_exists( 'is_checkout' ) ) { function is_checkout() { return false; } }
require getcwd() . '/src/blocks/free-delivery-bar/render.php';

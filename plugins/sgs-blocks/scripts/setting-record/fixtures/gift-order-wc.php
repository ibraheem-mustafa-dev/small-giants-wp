<?php
// A single-product page with a gift already chosen, for the offline render of sgs/gift-order. render.php prints the
// block's own parts (switch, help line, note field, character count, error line) only on a single-product page
// (includes/gift-order/helpers-gift-order-product.php::sgs_gift_order_is_product_page reads is_product()); anywhere else it
// prints one empty placeholder div for the Cart and Checkout blocks' component. The real Gift_Order_Store_Api and
// Gift_Order_Session classes load (sgs-blocks.php loads includes/gift-order/load.php on a site; ensure_registered() returns
// early without WooCommerce's Store API, as on a site without it). The WooCommerce session holds the stored value
// Gift_Order_Session::get() returns, `on` true with a name and a note, so the fields print open. The two core helpers
// the markup uses and the runner's stubs lack (checked, esc_textarea) are defined here. No absolute path: the runner's
// working directory is the plugin folder being rendered.
namespace {
	if ( ! class_exists( 'WC_Session', false ) ) {
		abstract class WC_Session {
			abstract public function get( $key, $default = null );
		}
	}
	if ( ! function_exists( 'WC' ) ) {
		function WC() {
			static $wc = null;
			if ( null === $wc ) {
				$wc          = new stdClass();
				$wc->cart    = null;
				$wc->session = new class() extends WC_Session {
					public function get( $key, $default = null ) {
						return 'sgs_gift_order' === $key ? array( 'on' => true, 'to' => 'Sam', 'message' => 'Happy birthday, from all of us.' ) : $default;
					}
				};
			}
			return $wc;
		}
	}
	if ( ! function_exists( 'is_product' ) ) { function is_product() { return true; } }
	if ( ! function_exists( 'checked' ) ) {
		function checked( $checked, $current = true, $display = true ) {
			$out = (string) $checked === (string) $current ? " checked='checked'" : '';
			if ( $display ) { echo $out; }
			return $out;
		}
	}
	if ( ! function_exists( 'esc_textarea' ) ) { function esc_textarea( $text ) { return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' ); } }
	require_once getcwd() . '/includes/gift-order/class-gift-order-session.php';
	require_once getcwd() . '/includes/gift-order/class-gift-order-store-api.php';
	require getcwd() . '/src/blocks/gift-order/render.php';
}

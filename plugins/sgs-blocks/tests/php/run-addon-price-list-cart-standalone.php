<?php
/**
 * Standalone test: Addon_Price_List_Cart::calculate_totals prices a line once,
 * however many times WooCommerce totals the cart in one request.
 *
 * WooCommerce reuses the same product object across calculate_totals passes
 * (add to cart, then checkout), so reading its current price as the base
 * stacked the add-ons on every pass (live on eye-care-test 2026-09-25:
 * 257, 316, 375 for a 139 frame + 59 lens).
 *
 * Run: php tests/php/run-addon-price-list-cart-standalone.php
 * Exit 0 all pass, 1 any failure.
 */

namespace {
	define( 'ABSPATH', __DIR__ . '/' );

	// Minimal WooCommerce stand-ins: a product whose price persists on the object.
	class WC_Product {
		private $price;
		public function __construct( $price ) {
			$this->price = $price;
		}
		public function get_price( $context = 'view' ) {
			return $this->price;
		}
		public function set_price( $price ) {
			$this->price = $price;
		}
	}
	class WC_Cart {
		public $items = array();
		public function get_cart() {
			return $this->items;
		}
	}
	function add_filter() {}
	function add_action() {}
	function is_admin() {
		return false;
	}
	function is_wp_error( $thing ) {
		return false;
	}
}

namespace SGS\Blocks {
	// The price list's resolver: one 59.00 add-on.
	function sgs_addon_resolve( array $pairs ) {
		return array(
			'lines' => array( array( 'label' => 'Distance', 'price' => 59.0 ) ),
			'total' => 59.0,
		);
	}
}

namespace {
	require dirname( __DIR__, 2 ) . '/includes/addon-price-list/class-addon-price-list-cart.php';

	$failures = 0;
	function check( bool $cond, string $label ) {
		global $failures;
		echo ( $cond ? 'PASS  ' : 'FAIL  ' ), $label, PHP_EOL;
		if ( ! $cond ) {
			++$failures;
		}
	}

	$pairs = array( array( 'group' => 'lens-use', 'key' => 'distance' ) );

	// One line, totalled three times in one request.
	$frame     = new WC_Product( 139 );
	$cart      = new WC_Cart();
	$cart->items = array( 'a' => array( 'sgs_addon_pairs' => $pairs, 'data' => $frame ) );
	$prices    = array();
	for ( $i = 0; $i < 3; $i++ ) {
		SGS\Blocks\Addon_Price_List_Cart::calculate_totals( $cart );
		$prices[] = $frame->get_price();
	}
	check( array( 198.0, 198.0, 198.0 ) === $prices, 'three totals passes keep one line at 139 + 59 (got ' . implode( ', ', $prices ) . ')' );

	// Two lines for different frames keep their own base prices.
	$frame_b     = new WC_Product( 99 );
	$cart->items = array(
		'a' => array( 'sgs_addon_pairs' => $pairs, 'data' => $frame ),
		'b' => array( 'sgs_addon_pairs' => $pairs, 'data' => $frame_b ),
	);
	SGS\Blocks\Addon_Price_List_Cart::calculate_totals( $cart );
	SGS\Blocks\Addon_Price_List_Cart::calculate_totals( $cart );
	check( 198.0 === $frame->get_price() && 158.0 === $frame_b->get_price(), 'each line keeps its own frame price (198 and 158)' );

	// A line with no add-ons is left alone.
	$plain       = new WC_Product( 120 );
	$cart->items = array( 'c' => array( 'data' => $plain ) );
	SGS\Blocks\Addon_Price_List_Cart::calculate_totals( $cart );
	check( 120 === $plain->get_price(), 'a line with no add-ons keeps its price' );

	echo PHP_EOL, '==== ', ( 0 === $failures ? 'all passed' : "$failures failed" ), ' ====', PHP_EOL;
	exit( 0 === $failures ? 0 : 1 );
}

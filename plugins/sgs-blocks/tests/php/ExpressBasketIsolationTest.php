<?php
/**
 * Tests: a product-page wallet payment (Payment Plugins for Stripe) is isolated from the shopper's basket
 * (Spec 27 FR-27-PS7): stash on the first tap, empty on a repeat tap, restore on cancel, after the order and on the
 * next page load, cart and checkout wallet buttons untouched, picks and coupons preserved on restore.
 *
 * Run with: vendor/bin/phpunit --filter ExpressBasketIsolationTest
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Blocks\Tests {

	use PHPUnit\Framework\Attributes\PreserveGlobalState;
	use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
	use PHPUnit\Framework\TestCase;
	use SGS\Blocks\Express_Basket_Isolation as Iso;

	#[RunTestsInSeparateProcesses]
	#[PreserveGlobalState( false )]
	final class ExpressBasketIsolationTest extends TestCase {

		protected function setUp(): void {
			// Runs inside the test's own process, so these global stand-ins never reach the rest of the suite.
			require_once __DIR__ . '/support/express-basket-stubs.php';
			require_once dirname( __DIR__, 2 ) . '/includes/class-express-basket-isolation.php';
			\sgs_t_wc_reset();
			$this->cart()->lines   = array(
				'abc' => array(
					'key' => 'abc', 'product_id' => 257, 'variation_id' => 279, 'quantity' => 2,
					'variation'       => array( 'attribute_pa_pack-size' => '40' ),
					'sgs_picks'       => array( 'pa_flavour' => array( array( 'slug' => 'vanilla', 'count' => 20 ) ) ),
					'sgs_field_notes' => 'no nuts',
				),
			);
			$this->cart()->coupons = array( 'tenoff' );
		}

		private function cart(): \Sgs_T_Cart {
			return $GLOBALS['sgs_t_wc']->cart;
		}

		private function tap(): void {
			Iso::before_dispatch( null, null, new \WP_REST_Request( 'POST', Iso::ITEM_ROUTE ) );
			// What the plugin does next: add the express product.
			$this->cart()->lines = array( 'exp' => array( 'key' => 'exp', 'product_id' => 257, 'variation_id' => 279, 'quantity' => 1 ) );
		}

		public function test_first_tap_stashes_the_basket_and_empties_it(): void {
			Iso::before_dispatch( null, null, new \WP_REST_Request( 'POST', Iso::ITEM_ROUTE ) );
			$this->assertTrue( Iso::has_stash() );
			$this->assertSame( array(), $this->cart()->lines );
			$this->assertSame( array(), $this->cart()->coupons );
		}

		public function test_repeat_tap_only_empties_and_keeps_the_first_stash(): void {
			$this->tap();
			$this->tap();
			$this->assertSame( array( 'exp' ), array_keys( $this->cart()->lines ) );
			$this->assertSame( 1, $this->cart()->lines['exp']['quantity'] );
			Iso::restore();
			$this->assertSame( array( 'abc' ), array_keys( $this->cart()->lines ), 'the stash from the first tap survives a repeat tap' );
		}

		public function test_cancel_restores_the_shoppers_basket_and_clears_the_stash(): void {
			$this->tap();
			Iso::after_dispatch( new \WP_REST_Response( array(), 200 ), null, new \WP_REST_Request( 'DELETE', Iso::ITEM_ROUTE ) );
			$this->assertSame( array( 'abc' ), array_keys( $this->cart()->lines ) );
			$this->assertFalse( Iso::has_stash() );
		}

		public function test_a_failed_add_restores_at_once(): void {
			Iso::before_dispatch( null, null, new \WP_REST_Request( 'POST', Iso::ITEM_ROUTE ) );
			Iso::after_dispatch( new \WP_REST_Response( array(), 400 ), null, new \WP_REST_Request( 'POST', Iso::ITEM_ROUTE ) );
			$this->assertSame( array( 'abc' ), array_keys( $this->cart()->lines ) );
		}

		public function test_a_successful_add_keeps_the_stash(): void {
			$this->tap();
			Iso::after_dispatch( new \WP_REST_Response( array(), 200 ), null, new \WP_REST_Request( 'POST', Iso::ITEM_ROUTE ) );
			$this->assertTrue( Iso::has_stash() );
			$this->assertSame( array( 'exp' ), array_keys( $this->cart()->lines ) );
		}

		public function test_product_checkout_restores_at_shutdown_after_the_order_exists(): void {
			$this->tap();
			Iso::before_dispatch( null, null, new \WP_REST_Request( 'POST', Iso::CHECKOUT_ROUTE, array( 'context' => 'product' ) ) );
			Iso::order_created();
			$this->assertSame( array( 'exp' ), array_keys( $this->cart()->lines ), 'nothing is restored before the request ends' );
			$this->assertSame( array( array( Iso::class, 'restore' ) ), $GLOBALS['sgs_t_actions']['shutdown'] );
			$this->cart()->lines = array(); // The plugin empties the basket it just paid for.
			Iso::restore();
			$this->assertSame( array( 'abc' ), array_keys( $this->cart()->lines ) );
		}

		public function test_cart_and_checkout_page_wallets_are_untouched(): void {
			foreach ( array( 'cart', 'checkout', '' ) as $context ) {
				\sgs_t_wc_reset();
				$this->cart()->lines = array( 'abc' => array( 'key' => 'abc', 'quantity' => 3 ) );
				Iso::before_dispatch( null, null, new \WP_REST_Request( 'POST', Iso::CHECKOUT_ROUTE, array( 'context' => $context ) ) );
				Iso::order_created();
				$this->assertFalse( Iso::has_stash() );
				$this->assertSame( array( 'abc' ), array_keys( $this->cart()->lines ) );
				$this->assertArrayNotHasKey( 'shutdown', $GLOBALS['sgs_t_actions'] );
			}
		}

		public function test_next_ordinary_page_load_restores(): void {
			$this->tap();
			Iso::restore_on_page_load();
			$this->assertSame( array( 'abc' ), array_keys( $this->cart()->lines ) );
			$this->assertFalse( Iso::has_stash() );
		}

		public function test_checkout_and_order_received_pages_do_not_restore(): void {
			$this->tap();
			$GLOBALS['sgs_t_is_checkout'] = true;
			Iso::restore_on_page_load();
			$this->assertTrue( Iso::has_stash() );
			$this->assertSame( array( 'exp' ), array_keys( $this->cart()->lines ) );
		}

		public function test_wc_ajax_requests_do_not_restore(): void {
			$this->tap();
			$_GET['wc-ajax'] = 'wc_stripe_frontend_request';
			Iso::restore_on_page_load();
			unset( $_GET['wc-ajax'] );
			$this->assertTrue( Iso::has_stash() );
		}

		public function test_picks_fields_quantity_and_coupons_survive_the_round_trip(): void {
			$before = $this->cart()->lines;
			$this->tap();
			Iso::restore();
			$this->assertSame( $before, $this->cart()->lines );
			$this->assertSame( array( 'tenoff' ), $this->cart()->coupons );
			$this->assertSame( 'vanilla', $this->cart()->lines['abc']['sgs_picks']['pa_flavour'][0]['slug'] );
		}

		public function test_other_routes_and_methods_are_ignored(): void {
			Iso::before_dispatch( null, null, new \WP_REST_Request( 'POST', '/wc-stripe/v1/cart/calculation' ) );
			Iso::before_dispatch( null, null, new \WP_REST_Request( 'DELETE', Iso::ITEM_ROUTE ) );
			Iso::before_dispatch( null, null, new \WP_REST_Request( 'POST', '/wc/store/v1/cart/add-item' ) );
			$this->assertFalse( Iso::has_stash() );
			$this->assertSame( array( 'abc' ), array_keys( $this->cart()->lines ) );
		}

		public function test_hooks_only_when_the_stripe_plugin_runs(): void {
			Iso::maybe_hook();
			$this->assertArrayNotHasKey( 'rest_pre_dispatch', $GLOBALS['sgs_t_filters'] );
			require_once __DIR__ . '/support/express-basket-stripe-present.php';
			Iso::maybe_hook();
			$this->assertArrayHasKey( 'rest_pre_dispatch', $GLOBALS['sgs_t_filters'] );
			$this->assertArrayHasKey( 'rest_post_dispatch', $GLOBALS['sgs_t_filters'] );
			$this->assertArrayHasKey( 'template_redirect', $GLOBALS['sgs_t_actions'] );
			$this->assertArrayHasKey( 'woocommerce_checkout_order_processed', $GLOBALS['sgs_t_actions'] );
		}
	}
}

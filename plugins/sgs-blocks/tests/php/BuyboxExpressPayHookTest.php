<?php
/**
 * Tests: the buy box fires WooCommerce's `woocommerce_after_add_to_cart_form` after its own cart form, where payment
 * gateways print, with the global product set, once, and only on the product's own page (not when the block is pinned
 * onto another page). Payment Plugins for Stripe 4.x places its Apple Pay and Google Pay buttons on
 * `woocommerce_before_add_to_cart_form` (picks the slot) and `woocommerce_after_add_to_cart_button` (prints), so a plain
 * add flow fires those two inside `.sgs-buybox__express`, with a hidden quantity of 1; a guided flow, a modal and the
 * `sgs_buybox_express_buttons` filter switch that off.
 *
 * Run with: vendor/bin/phpunit --filter BuyboxExpressPayHookTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BuyboxSnapshotTest.php';

final class BuyboxExpressPayHookTest extends TestCase {

	private const TAG    = 'woocommerce_after_add_to_cart_form';
	private const BEFORE = 'woocommerce_before_add_to_cart_form';
	private const BUTTON = 'woocommerce_after_add_to_cart_button';

	private static function html( array $attrs, array $context, ?array $queried, bool $listener = true, string $fixture = 'standard', string $tags = '', ?bool $filter = null ): string {
		putenv( 'SGS_QA_ECHO_ACTIONS=' . ( $listener ? ( '' !== $tags ? $tags : self::TAG ) : '' ) );
		putenv( null === $filter ? 'SGS_QA_FILTER_RETURNS' : 'SGS_QA_FILTER_RETURNS=' . json_encode( array( 'sgs_buybox_express_buttons' => $filter ) ) );
		try {
			return BuyboxSnapshotTest::render_fixture( $fixture, $attrs, $context, array(), false, $queried );
		} finally {
			putenv( 'SGS_QA_ECHO_ACTIONS' );
			putenv( 'SGS_QA_FILTER_RETURNS' );
		}
	}

	private static function all_tags(): string {
		return self::TAG . ',' . self::BEFORE . ',' . self::BUTTON;
	}

	private static function product_page( array $attrs = array(), string $fixture = 'standard', ?bool $filter = null ): string {
		return self::html( $attrs, array( 'postId' => 52 ), array( 'id' => 52, 'post_type' => 'product' ), true, $fixture, self::all_tags(), $filter );
	}

	public function test_it_fires_once_after_the_form_with_the_product_set_on_the_product_page(): void {
		$html = self::html( array(), array( 'postId' => 52 ), array( 'id' => 52, 'post_type' => 'product' ) );
		$this->assertSame( 1, substr_count( $html, '<!--action:' . self::TAG . ' product=52-->' ) );
		$this->assertGreaterThan( (int) strpos( $html, '</form>' ), (int) strpos( $html, '<!--action:' ), 'it prints after the cart form' );
	}

	public function test_it_does_not_fire_when_the_block_is_pinned_on_another_page(): void {
		$html = self::html( array( 'buyboxProductId' => 52 ), array( 'postId' => 99 ), array( 'id' => 99, 'post_type' => 'page' ) );
		$this->assertStringNotContainsString( '<!--action:', $html );
	}

	public function test_it_does_not_fire_outside_a_singular_product_view_or_with_no_listener(): void {
		$this->assertStringNotContainsString( '<!--action:', self::html( array(), array( 'postId' => 52 ), null ), 'no queried product (an archive or an editor preview)' );
		$this->assertStringNotContainsString( '<!--action:', self::html( array(), array( 'postId' => 52 ), array( 'id' => 52, 'post_type' => 'product' ), false ), 'nothing attached: nothing runs' );
	}

	public function test_a_plain_add_flow_fires_the_two_payment_plugin_hooks_inside_the_express_wrapper_with_a_quantity(): void {
		$html = self::product_page();
		$this->assertSame( 1, substr_count( $html, '<!--action:' . self::BEFORE . ' product=52-->' ) );
		$this->assertSame( 1, substr_count( $html, '<!--action:' . self::BUTTON . ' product=52-->' ) );
		$this->assertSame( 1, substr_count( $html, '<!--action:' . self::TAG . ' product=52-->' ) );
		$start = (int) strpos( $html, '<div class="sgs-buybox__express"' );
		$end   = (int) strpos( $html, '</div>', $start );
		$this->assertGreaterThan( (int) strpos( $html, '</form>' ), $start, 'the wrapper prints after the cart form' );
		$this->assertLessThan( $end, (int) strpos( $html, '<!--action:' . self::BUTTON ), 'the buttons sit inside the wrapper' );
		$this->assertGreaterThan( $start, (int) strpos( $html, 'name="quantity" value="1"' ), 'the hidden quantity sits inside the wrapper' );
		$this->assertStringContainsString( ' inert>', substr( $html, $start, $end - $start + 6 ), 'inert until the store has matched the plugin to the buy box' );
		$this->assertStringContainsString( 'data-wp-watch="callbacks.syncExpress"', $html );
		$this->assertLessThan( (int) strpos( $html, '<!--action:' . self::TAG ), $end, 'the generic after-form hook still fires after the wrapper' );
	}

	public function test_it_prints_the_wrapper_when_only_the_after_button_hook_has_a_listener(): void {
		$html = self::html( array(), array( 'postId' => 52 ), array( 'id' => 52, 'post_type' => 'product' ), true, 'standard', self::BUTTON );
		$this->assertStringContainsString( 'sgs-buybox__express', $html );
	}

	public function test_a_guided_flow_and_a_modal_add_print_no_express_buttons(): void {
		$guided = self::product_page( array(), 'guided' );
		$this->assertStringNotContainsString( 'sgs-buybox__express', $guided );
		$this->assertStringNotContainsString( '<!--action:' . self::BUTTON, $guided );
		$modal = self::product_page( array( 'addToCartAction' => 'modal', 'addToCartModalId' => 'sgs-test-modal' ) );
		$this->assertStringNotContainsString( 'sgs-buybox__express', $modal );
	}

	public function test_the_filter_switches_the_express_buttons_off_or_on_per_product(): void {
		$this->assertStringNotContainsString( 'sgs-buybox__express', self::product_page( array(), 'standard', false ) );
		$this->assertSame( 1, substr_count( self::product_page( array(), 'standard', false ), '<!--action:' . self::TAG . ' product=52-->' ), 'the generic hook still fires' );
		$this->assertStringContainsString( 'sgs-buybox__express', self::product_page( array(), 'guided', true ), 'a filter returning true overrides the guided default' );
	}

	public function test_the_express_buttons_follow_the_same_page_guards_as_the_after_form_hook(): void {
		$pinned = self::html( array( 'buyboxProductId' => 52 ), array( 'postId' => 99 ), array( 'id' => 99, 'post_type' => 'page' ), true, 'standard', self::all_tags() );
		$this->assertStringNotContainsString( 'sgs-buybox__express', $pinned );
		$archive = self::html( array(), array( 'postId' => 52 ), null, true, 'standard', self::all_tags() );
		$this->assertStringNotContainsString( 'sgs-buybox__express', $archive );
		$this->assertStringNotContainsString( 'sgs-buybox__express', self::html( array(), array( 'postId' => 52 ), array( 'id' => 52, 'post_type' => 'product' ), false ), 'nothing attached: nothing prints' );
	}
}

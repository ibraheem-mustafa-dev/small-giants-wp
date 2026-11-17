<?php
/**
 * Tests: the buy box fires WooCommerce's `woocommerce_after_add_to_cart_form` after its own cart form, where payment
 * gateways (Stripe's Apple Pay and Google Pay buttons) print, with the global product set, once, and only on the
 * product's own page (not when the block is pinned onto another page).
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

	private const TAG = 'woocommerce_after_add_to_cart_form';

	private static function html( array $attrs, array $context, ?array $queried, bool $listener = true ): string {
		putenv( 'SGS_QA_ECHO_ACTIONS=' . ( $listener ? self::TAG : '' ) );
		try {
			return BuyboxSnapshotTest::render_fixture( 'standard', $attrs, $context, array(), false, $queried );
		} finally {
			putenv( 'SGS_QA_ECHO_ACTIONS' );
		}
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
}

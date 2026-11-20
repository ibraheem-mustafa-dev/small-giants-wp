<?php
/**
 * Tests: `includes/woocommerce/basket-stripe-hold.php` (Spec 27 FR-27-BASKET-STRIPE-HOLD). The hold script prints at
 * the top of the head only on the basket page with the site switch on, without its doc comment; off, or on any other
 * page, nothing prints.
 *
 * Run with:
 *   vendor/bin/phpunit --filter BasketStripeHoldTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

namespace SGS\Blocks\Tests;

use PHPUnit\Framework\TestCase;
use function SGS\Blocks\sgs_basket_stripe_hold_print;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class BasketStripeHoldTest extends TestCase {

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		if ( ! defined( 'SGS_BLOCKS_PATH' ) ) {
			define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
		}
		$stubs = array(
			'add_action'                 => 'function add_action( ...$a ) { return true; }',
			'register_setting'           => 'function register_setting( ...$a ) {}',
			'is_admin'                   => 'function is_admin() { return $GLOBALS["t_admin"] ?? false; }',
			'is_cart'                    => 'function is_cart() { return $GLOBALS["t_cart"] ?? false; }',
			'get_option'                 => 'function get_option( $k, $d = false ) { return $GLOBALS["t_options"][ $k ] ?? $d; }',
			'rest_sanitize_boolean'      => 'function rest_sanitize_boolean( $v ) { return is_string( $v ) ? ! in_array( strtolower( $v ), array( "", "0", "false" ), true ) : (bool) $v; }',
			'wp_print_inline_script_tag' => 'function wp_print_inline_script_tag( $s, $a = array() ) { echo "<script id=\"" . $a["id"] . "\">" . $s . "</script>"; }',
		);
		foreach ( $stubs as $name => $code ) {
			if ( ! function_exists( $name ) ) {
				eval( $code );
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/woocommerce/basket-stripe-hold.php';
		$GLOBALS['t_admin']   = false;
		$GLOBALS['t_cart']    = true;
		$GLOBALS['t_options'] = array( 'sgs_basket_stripe_hold' => true );
	}

	private static function printed(): string {
		ob_start();
		sgs_basket_stripe_hold_print();
		return (string) ob_get_clean();
	}

	public function test_prints_the_hold_on_the_basket_with_the_switch_on(): void {
		$out = self::printed();
		$this->assertStringStartsWith( '<script id="sgs-basket-stripe-hold">', $out );
		$this->assertStringContainsString( "'js.stripe.com'", $out );
		$this->assertStringNotContainsString( 'Spec 27', $out, 'the doc comment is left out' );
	}

	public function test_the_switch_is_off_by_default(): void {
		$GLOBALS['t_options'] = array();
		$this->assertSame( '', self::printed() );
	}

	public function test_off_prints_nothing(): void {
		$GLOBALS['t_options'] = array( 'sgs_basket_stripe_hold' => '0' );
		$this->assertSame( '', self::printed() );
	}

	public function test_any_page_but_the_basket_prints_nothing(): void {
		$GLOBALS['t_cart'] = false;
		$this->assertSame( '', self::printed() );
	}

	public function test_admin_prints_nothing(): void {
		$GLOBALS['t_admin'] = true;
		$this->assertSame( '', self::printed() );
	}
}

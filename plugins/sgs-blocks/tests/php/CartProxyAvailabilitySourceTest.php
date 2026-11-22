<?php
/**
 * Tests: the availability endpoint answers a simple product from `Product_Manifest::build_simple()` (its one combination is
 * the key the buy box holds for it), a variable product from `Product_Manifest::build()`, and refuses every other product,
 * so a simple product that sells out after its page loaded is marked out of stock instead of keeping its form on screen.
 *
 * Run with: vendor/bin/phpunit --filter CartProxyAvailabilitySourceTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use PHPUnit\Framework\TestCase;
use SGS\Blocks\Cart_Proxy;

#[RunTestsInSeparateProcesses]
#[PreserveGlobalState( false )]
final class CartProxyAvailabilitySourceTest extends TestCase {

	public static function setUpBeforeClass(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		if ( ! class_exists( 'WC_Product' ) ) {
			eval( 'class WC_Product { public $type = "simple"; public function __construct( $t = "simple" ) { $this->type = $t; } public function is_type( $t ) { return $this->type === $t; } }' );
			eval( 'class WC_Product_Variable extends WC_Product { public function __construct() { parent::__construct( "variable" ); } }' );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/class-cart-proxy.php';
	}

	public function test_a_variable_product_reads_its_variations_and_a_simple_one_its_own_manifest(): void {
		$this->assertSame( 'variable', Cart_Proxy::availability_source( new WC_Product_Variable() ) );
		$this->assertSame( 'simple', Cart_Proxy::availability_source( new WC_Product( 'simple' ) ), 'MUST FAIL: a simple product is answered' );
	}

	public function test_every_other_product_is_refused(): void {
		foreach ( array( new WC_Product( 'grouped' ), new WC_Product( 'external' ), false, null, 'product' ) as $product ) {
			$this->assertNull( Cart_Proxy::availability_source( $product ) );
		}
	}

	public function test_the_handler_builds_a_simple_products_manifest_with_build_simple(): void {
		$src = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-cart-proxy.php' );
		$this->assertStringContainsString( "\$manifest = 'simple' === \$source ? Product_Manifest::build_simple( \$product_id ) : Product_Manifest::build( \$product_id );", $src, 'MUST FAIL: a simple product builds its own manifest' );
		$this->assertStringContainsString( "if ( 'variable' === \$source && \\count( \$product->get_children() ) > 200 ) {", $src, 'the children cap applies to a variable product only' );
	}
}

<?php
/**
 * sgs/product-card price display: the "From lowest price" rule.
 *
 * Run with: vendor/bin/phpunit --filter ProductCardPriceDisplayTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ProductCardPriceDisplayTest extends TestCase {

	private static function load(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/product-card-price-display.php';
	}

	public function test_from_lowest_needs_the_mode_the_switch_and_a_real_range(): void {
		self::load();
		$on   = array( 'cardContentSource' => 'product', 'priceFromLowest' => true );
		$data = array( 'is_variable' => true, 'price_from_html' => '£9.50' );

		$this->assertTrue( sgs_product_card_from_lowest( $on, $data ) );
		$this->assertFalse( sgs_product_card_from_lowest( array( 'priceFromLowest' => true ), $data ), 'negative control: typed mode ignores it' );
		$this->assertFalse( sgs_product_card_from_lowest( array( 'cardContentSource' => 'product' ), $data ), 'negative control: switch off' );
		$this->assertFalse( sgs_product_card_from_lowest( $on, array( 'is_variable' => true, 'price_from_html' => '' ) ), 'every variation the same price: no From' );
		$this->assertFalse( sgs_product_card_from_lowest( $on, array( 'is_variable' => false, 'price_from_html' => '£9.50' ) ) );
	}
}

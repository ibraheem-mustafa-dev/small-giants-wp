<?php
/**
 * sgs/product-card price display: trailing ".00" trimming and the "From lowest price" rule.
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

	public function test_zero_decimals_go_and_real_ones_stay(): void {
		self::load();
		$this->assertSame( '£5', sgs_product_card_trim_price_zeros( '£5.00' ) );
		$this->assertSame( '£9.50', sgs_product_card_trim_price_zeros( '£9.50' ), 'negative control: 50 pence stays' );
		$this->assertSame( '£15 – £40', sgs_product_card_trim_price_zeros( '£15.00 – £40.00' ) );
		$this->assertSame( '£100', sgs_product_card_trim_price_zeros( '£100.00' ) );
		$this->assertSame( '£1.05', sgs_product_card_trim_price_zeros( '£1.05' ), 'negative control: only a run that is all zeros goes' );
		$this->assertSame( '5,00', sgs_product_card_trim_price_zeros( '5,00' ), 'negative control: another separator is left alone' );
		$this->assertSame( '5', sgs_product_card_trim_price_zeros( '5,00', ',' ), 'the shop\'s own separator is honoured' );
	}

	public function test_it_trims_inside_woocommerce_price_markup(): void {
		self::load();
		$html = '<span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&pound;</span>5.00</bdi></span>';
		$this->assertStringContainsString( '</span>5</bdi>', sgs_product_card_trim_price_zeros( $html ) );
	}

	public function test_the_card_setting_gates_it(): void {
		self::load();
		$this->assertSame( '£5.00', sgs_product_card_price_text( array(), '£5.00' ), 'negative control: off by default' );
		$this->assertSame( '£5', sgs_product_card_price_text( array( 'priceTrimZeros' => true ), '£5.00' ) );

		$data = array( 'price_html' => '£5.00', 'price_from_html' => '£9.50', 'title' => 'A.00' );
		$this->assertSame( $data, sgs_product_card_price_data_apply( $data, array() ), 'negative control: data untouched when off' );
		$out = sgs_product_card_price_data_apply( $data, array( 'priceTrimZeros' => true ) );
		$this->assertSame( '£5', $out['price_html'] );
		$this->assertSame( '£9.50', $out['price_from_html'] );
		$this->assertSame( 'A.00', $out['title'], 'only the price fields change' );
		$this->assertNull( sgs_product_card_price_data_apply( null, array( 'priceTrimZeros' => true ) ) );
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

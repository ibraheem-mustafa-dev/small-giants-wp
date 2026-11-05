<?php
/**
 * The bag's item name and item details take a per-breakpoint line height (sgs/cart itemNameLineHeight and
 * itemDetailLineHeight), printed by the panel's shared typography rule on the same classes the PHP and the client-side
 * row template (item-row-template.js) both use. Unset prints nothing, so the stylesheet's own values stand.
 *
 * Run with: vendor/bin/phpunit --filter CartItemLineHeightTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CartItemLineHeightTest extends TestCase {

	private const PANEL = '.u.sgs-cart__panel';

	protected function setUp(): void {
		if ( ! function_exists( 'sgs_typography_css_rule' ) ) {
			require_once dirname( __DIR__, 2 ) . '/includes/helpers-typography.php';
		}
	}

	private function object_keys(): array {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/cart/block.json' ), true );
		$keys = array();
		foreach ( $json['attributes'] as $key => $spec ) {
			if ( 'object' === ( $spec['type'] ?? '' ) ) {
				$keys[] = $key;
			}
		}
		return $keys;
	}

	public function test_the_two_line_heights_are_declared_as_per_breakpoint_objects_with_a_unitless_default(): void {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/cart/block.json' ), true );
		foreach ( array( 'itemName', 'itemDetail' ) as $prefix ) {
			$this->assertSame( 'object', $json['attributes'][ $prefix . 'LineHeight' ]['type'] );
			$this->assertSame( '', $json['attributes'][ $prefix . 'LineHeightUnit' ]['default'] );
		}
	}

	public function test_name_and_details_print_their_line_height_per_breakpoint(): void {
		$attributes = array(
			'itemNameLineHeight'   => array( 'desktop' => 1.2, 'mobile' => 1.1 ),
			'itemDetailLineHeight' => array( 'desktop' => 1.6 ),
		);
		$name   = sgs_typography_css_rule( $attributes, 'itemName', self::PANEL . ' .sgs-cart__item-name', '', false, false, $this->object_keys() );
		$detail = sgs_typography_css_rule( $attributes, 'itemDetail', self::PANEL . ' .sgs-cart__item-details', '', false, false, $this->object_keys() );

		$this->assertStringContainsString( self::PANEL . ' .sgs-cart__item-name{line-height:1.2;}', $name );
		$this->assertMatchesRegularExpression( '/@media[^{]*767px[^{]*\{[^{}]*\.sgs-cart__item-name\{line-height:1\.1;\}/', $name );
		$this->assertStringContainsString( self::PANEL . ' .sgs-cart__item-details{line-height:1.6;}', $detail );
	}

	public function test_negative_control_unset_prints_no_line_height(): void {
		$this->assertStringNotContainsString( 'line-height', sgs_typography_css_rule( array(), 'itemName', '.x', '', false, false, $this->object_keys() ) );
		$this->assertStringNotContainsString( 'line-height', sgs_typography_css_rule( array(), 'itemDetail', '.x', '', false, false, $this->object_keys() ) );
	}

	public function test_the_client_side_row_uses_the_same_classes(): void {
		$js = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/cart/item-row-template.js' );
		$this->assertStringContainsString( 'sgs-cart__item-name', $js );
		$this->assertStringContainsString( 'sgs-cart__item-details', $js );
		$php = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/helpers-cart-panel-css.php' );
		$this->assertStringContainsString( "'itemName'         => '.sgs-cart__item-name'", $php );
		$this->assertStringContainsString( "'itemDetail'       => '.sgs-cart__item-details'", $php );
	}
}

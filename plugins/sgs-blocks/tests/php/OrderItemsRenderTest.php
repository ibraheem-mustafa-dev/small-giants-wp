<?php
/**
 * Tests: sgs/order-items prints the viewed order's lines and totals, and nothing when the visitor may not view the order.
 *
 * Renders the REAL src/blocks/order-items/render.php in the QA harness (a child process) with WooCommerce order doubles
 * (tests/php/stubs/order-stubs.php, preloaded with auto_prepend_file and fed a scenario through the environment).
 *
 * Run with:
 *   vendor/bin/phpunit --filter OrderItemsRenderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class OrderItemsRenderTest extends TestCase {

	/** A guest order placed a minute ago: one variable-product line with options, one plain line, every totals row. */
	private static function order( array $over = array() ): array {
		return array_replace(
			array(
				'id'              => 726,
				'key'             => 'wc_order_abc',
				'created'         => time() - 60,
				'ship'            => 'Tracked <b>48</b>',
				'ship_total'      => 3.95,
				'shipping'        => array( array( 'name' => 'Tracked 48' ) ),
				'items'           => array(
					array(
						'name'  => 'Zookies <script>alert(1)</script>',
						'qty'   => 2,
						'price' => '<span class="amount">&pound;24.00</span>',
						'fmeta' => array(
							array( 'display_key' => 'Flavour', 'display_value' => '<p>Chocolate</p>' ),
							array( 'display_key' => 'Size', 'display_value' => 'Box of 6' ),
						),
					),
					array(
						'name'  => 'Plain cookie',
						'qty'   => 1,
						'price' => '<span class="amount">&pound;8.50</span>',
						'fmeta' => array(),
					),
				),
				'totals'          => array(
					'cart_subtotal' => array( 'value' => '<span class="amount">&pound;32.50</span>' ),
					'discount'      => array( 'value' => '-<span class="amount">&pound;2.00</span>' ),
					'order_total'   => array( 'value' => '<span class="amount">&pound;34.45</span>' ),
				),
			),
			$over
		);
	}

	private function render( array $attrs, array $scenario, array $options = array() ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$prepend = __DIR__ . '/stubs/order-stubs.php';
		$attrs_f = tempnam( sys_get_temp_dir(), 'sgsoi' );
		file_put_contents( $attrs_f, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		putenv( 'SGS_T_SCENARIO=' . json_encode( $scenario, JSON_THROW_ON_ERROR ) );
		if ( array() !== $options ) {
			putenv( 'SGS_QA_OPTIONS=' . json_encode( $options, JSON_THROW_ON_ERROR ) );
		}
		try {
			$cmd = escapeshellarg( PHP_BINARY ) . ' -d auto_prepend_file=' . escapeshellarg( $prepend )
				. ' ' . escapeshellarg( $harness ) . ' --slug sgs/order-items --attrs-file ' . escapeshellarg( $attrs_f ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			putenv( 'SGS_T_SCENARIO' );
			putenv( 'SGS_QA_OPTIONS' );
			@unlink( $attrs_f );
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return (string) $decoded['html'];
	}

	private function scenario( array $order = array(), array $over = array() ): array {
		return array_replace(
			array(
				'orders' => array( self::order( $order ) ),
				'query'  => array( 'order-received' => '726' ),
				'key'    => 'wc_order_abc',
				'user'   => 0,
			),
			$over
		);
	}

	public function test_a_visitor_who_may_not_view_the_order_gets_nothing(): void {
		$this->assertSame( '', trim( $this->render( array(), $this->scenario( array(), array( 'key' => 'wrong' ) ) ) ), 'wrong order key' );
		$this->assertSame( '', trim( $this->render( array(), $this->scenario( array(), array( 'query' => array() ) ) ) ), 'no order on the page' );
		$this->assertSame( '', trim( $this->render( array(), $this->scenario( array( 'created' => time() - 9000 ) ) ) ), 'a guest order past the grace period with no email check' );
		$this->assertSame( '', trim( $this->render( array(), $this->scenario( array( 'user' => 7 ), array( 'user' => 9 ) ) ) ), 'another customer' );
	}

	public function test_the_owner_sees_the_lines(): void {
		$html = $this->render( array(), $this->scenario( array( 'user' => 7 ), array( 'user' => 7 ) ) );
		$this->assertStringContainsString( 'sgs-order-items__row', $html );
	}

	public function test_a_variable_product_line_shows_its_options_quantity_name_and_price(): void {
		$html = $this->render( array(), $this->scenario() );
		$this->assertSame( 2, substr_count( $html, 'class="sgs-order-items__row"' ) );
		$this->assertStringContainsString( '<span class="sgs-order-items__meta-label">Flavour:</span> Chocolate', $html );
		$this->assertStringContainsString( '<span class="sgs-order-items__meta-label">Size:</span> Box of 6', $html );
		$this->assertStringContainsString( '2 &times;', $html );
		$this->assertStringContainsString( '&pound;24.00', $html );
		$this->assertSame( 1, substr_count( $html, 'class="sgs-order-items__meta"' ), 'a line with no options prints no options list' );
	}

	public function test_the_shop_wording_option_prints_option_values_without_their_labels(): void {
		$html = $this->render( array(), $this->scenario(), array( 'sgs_cart_line_summary' => array( 'labelFormat' => 'values' ) ) );
		$this->assertStringContainsString( '<li>Chocolate · Box of 6</li>', $html, 'values only, joined with the shop summary separator' );
		$this->assertStringNotContainsString( 'sgs-order-items__meta-label', $html );
		$this->assertStringNotContainsString( 'Flavour', $html );
		$this->assertSame( 1, substr_count( $html, 'class="sgs-order-items__meta"' ), 'a line with no options still prints no list' );
	}

	public function test_the_labelled_wording_keeps_each_label(): void {
		$html = $this->render( array(), $this->scenario(), array( 'sgs_cart_line_summary' => array( 'labelFormat' => 'labelled' ) ) );
		$this->assertStringContainsString( '<span class="sgs-order-items__meta-label">Flavour:</span> Chocolate', $html );
		$this->assertStringNotContainsString( 'Chocolate · Box of 6', $html );
	}

	public function test_the_thumbnail_height_rule_outranks_a_shop_themes_img_rule(): void {
		$order = array( 'items' => array( array( 'name' => 'Pic', 'qty' => 1, 'price' => 'x', 'image_id' => 77, 'fmeta' => array() ) ) );
		$html  = $this->render( array( 'thumbHeight' => array( 'desktop' => '6rem' ) ), $this->scenario( $order ) );
		$this->assertSame( 1, preg_match( '/\.(sgs-order-items-[0-9a-f]{8}) \.\1-thumb\{height:6rem/', $html ), 'the height rule names the block scope class and the thumbnail class (0,2,0), beating `.woocommerce img` (0,1,1)' );
		$this->assertSame( 0, preg_match( '/[>,}]\s*\.sgs-order-items-[0-9a-f]{8}-thumb\{/', $html ), 'no bare single-class thumbnail rule remains' );
	}

	public function test_a_line_with_a_picture_prints_it_through_the_media_renderer_and_the_switch_hides_it(): void {
		$order = array( 'items' => array( array( 'name' => 'Pic', 'qty' => 1, 'price' => 'x', 'image_id' => 77, 'fmeta' => array() ) ) );
		$html  = $this->render( array(), $this->scenario( $order ) );
		$this->assertStringContainsString( 'sgs-order-items__thumb', $html );
		$this->assertStringContainsString( 'sgs-media-el', $html, 'the thumbnail is the shared media renderer picture' );
		$off = $this->render( array( 'showThumbnail' => false ), $this->scenario( $order ) );
		$this->assertStringNotContainsString( 'sgs-order-items__thumb', $off );
	}

	public function test_options_can_be_switched_off(): void {
		$html = $this->render( array( 'showMeta' => false ), $this->scenario() );
		$this->assertStringNotContainsString( 'sgs-order-items__meta"', $html );
	}

	public function test_totals_rows_follow_the_switches(): void {
		$all = $this->render( array(), $this->scenario() );
		foreach ( array( 'subtotal', 'delivery', 'discount', 'total' ) as $row ) {
			$this->assertStringContainsString( 'sgs-order-items__totals-row--' . $row, $all, $row );
		}
		$this->assertStringContainsString( '>Total<', $all, 'the default total label' );
		$this->assertStringNotContainsString( 'totals-row--gift-card', $all, 'no gift card paid, so no gift card row' );

		$some = $this->render(
			array(
				'showSubtotal' => false,
				'showDelivery' => false,
				'showDiscount' => false,
				'totalLabel'   => 'Paid',
			),
			$this->scenario()
		);
		$this->assertStringNotContainsString( 'totals-row--subtotal', $some );
		$this->assertStringNotContainsString( 'totals-row--delivery', $some );
		$this->assertStringNotContainsString( 'totals-row--discount', $some );
		$this->assertStringContainsString( '>Paid<', $some );

		$none = $this->render( array( 'showSubtotal' => false, 'showDelivery' => false, 'showDiscount' => false, 'showGiftCard' => false, 'showTotal' => false ), $this->scenario() );
		$this->assertStringNotContainsString( 'sgs-order-items__totals"', $none, 'every row off prints no totals list' );
	}

	public function test_delivery_row_names_the_method_and_can_drop_it(): void {
		$with = $this->render( array(), $this->scenario() );
		$this->assertStringContainsString( '(Tracked 48)', $with );
		$without = $this->render( array( 'showDeliveryMethod' => false ), $this->scenario() );
		$this->assertStringNotContainsString( '(Tracked 48)', $without );
		$this->assertStringContainsString( 'totals-row--delivery', $without );
	}

	public function test_everything_is_escaped(): void {
		$html = $this->render( array( 'totalLabel' => '<img src=x onerror=alert(1)>' ), $this->scenario() );
		$this->assertStringNotContainsString( '<script>', $html );
		$this->assertStringNotContainsString( '<img src=x', $html );
		$this->assertStringNotContainsString( '<p>Chocolate</p>', $html, 'option values print as text' );
	}

	public function test_no_inline_style_attribute(): void {
		$html = $this->render( array( 'itemNameColour' => 'primary' ), $this->scenario() );
		$this->assertSame( 0, preg_match( '/<(?!style\b)[a-z][^>]*\sstyle="/i', $html ), 'no element carries a style attribute' );
	}
}

<?php
/**
 * The Checkout look settings for the payment option group (its outline and the gap between option cards) and the
 * coupon panel (padding and label text): each prints a real property on the row of selectors.json that names it, and
 * a block with none of them set prints none of it.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CommerceLookCheckoutPartsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CommerceLookCheckoutPartsTest extends TestCase {

	private const ATTRS = array(
		'sgsOptionGroupOutline' => array( 'desktop' => array( 'width' => '0', 'style' => 'none' ) ),
		'sgsOptionGap'          => array( 'desktop' => '8px', 'mobile' => '6px' ),
		'sgsCouponPadding'      => array( 'desktop' => array( 'top' => '14px', 'bottom' => '14px' ) ),
		'sgsCouponLabelFontSize' => 14,
		'sgsCouponLabelColour'  => '#5E584F',
	);

	private function root(): string {
		return dirname( __DIR__, 2 ) . '/';
	}

	/**
	 * The writer's CSS, run in a child process (its include files define functions the PHPUnit process must not load).
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @param string               $block 'cart' or 'checkout'.
	 */
	private function css( array $attrs, string $block ): string {
		$root   = $this->root();
		$script = tempnam( sys_get_temp_dir(), 'sgscp' );
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\n"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
			. "require ABSPATH . 'includes/woocommerce/commerce-look/writer.php';\n"
			. 'echo \\SGS\\Blocks\\sgs_commerce_look_css( json_decode( ' . var_export( json_encode( $attrs ), true ) . ', true ), '
			. var_export( $block, true ) . ", 'sgs-x' );\n"
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
	}

	public function test_each_setting_prints_its_property_on_its_row(): void {
		$css = $this->css( self::ATTRS, 'checkout' );
		$this->assertStringContainsString( '.sgs-x .wc-block-checkout__payment-method .wc-block-components-radio-control::after', $css );
		$this->assertStringContainsString( '::after{border-width:0px;border-style:none;}', $css, 'the group outline takes the tier border' );
		$this->assertStringContainsString( '.wc-block-components-radio-control-accordion-option{margin-bottom:8px;}', $css, 'option gap' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:\d+px\)\{[^{]*radio-control-accordion-option\{margin-bottom:6px;\}/', $css, 'option gap on mobile' );
		$this->assertStringContainsString( '.sgs-x .wp-block-woocommerce-checkout-order-summary-coupon-form-block{padding-top:14px;padding-bottom:14px;}', $css, 'coupon padding' );
		$this->assertStringContainsString( '.wc-block-components-totals-coupon .wc-block-components-panel__button{font-size:14px;}', $css, 'coupon label size' );
		$this->assertStringContainsString( '.wc-block-components-totals-coupon .wc-block-components-panel__button{color:#5E584F;}', $css, 'coupon label colour' );
		$cart = $this->css( self::ATTRS, 'cart' );
		$this->assertStringContainsString( '.sgs-x .wp-block-woocommerce-cart-order-summary-coupon-form-block{padding-top:14px;padding-bottom:14px;}', $cart, 'cart coupon padding' );
		$this->assertStringNotContainsString( 'radio-control-accordion-option', $cart, 'the cart has no payment options' );
	}

	public function test_a_block_with_none_of_them_prints_none_of_it(): void {
		foreach ( array( 'cart', 'checkout' ) as $block ) {
			$css = $this->css( array( 'sgsStepTitleFontSize' => 24 ), $block );
			foreach ( array( 'radio-control', 'coupon', 'panel__button', 'accordion-option' ) as $needle ) {
				$this->assertStringNotContainsString( $needle, $css, "{$block}: '{$needle}' must not print without its setting" );
			}
		}
	}

	public function test_the_settings_are_declared_and_the_rows_exist(): void {
		$js = (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/attributes.js' );
		foreach ( array( 'sgsOptionGroupOutline', 'sgsOptionGap', 'sgsCouponPadding', 'sgsCouponLabelFontSize', 'sgsCouponLabelColour', 'sgsStripeMatchFields' ) as $name ) {
			$this->assertStringContainsString( "\t{$name}:", $js, "{$name} must be declared or WordPress drops it on save" );
		}
		$rows = json_decode( (string) file_get_contents( $this->root() . 'includes/woocommerce/commerce-look/selectors.json' ), true )['rows'];
		foreach ( array( 'option_group_outline', 'payment_option', 'coupon_panel', 'coupon_label' ) as $id ) {
			$this->assertArrayHasKey( 'checkout', $rows[ $id ], $id );
		}
		$this->assertArrayHasKey( 'cart', $rows['coupon_panel'] );
		$this->assertArrayNotHasKey( 'cart', $rows['payment_option'] );
	}

	public function test_the_option_card_settings_also_paint_the_payment_option_boxes(): void {
		$attrs = array(
			'sgsOptionBackground'         => 'white',
			'sgsOptionBorderWidth'        => array( 'top' => '1px', 'right' => '1px', 'bottom' => '1px', 'left' => '1px' ),
			'sgsOptionBorderStyle'        => 'solid',
			'sgsOptionBorderColour'       => 'border',
			'sgsOptionBorderRadius'       => array( 'desktop' => array( 'topLeft' => '0px', 'topRight' => '0px', 'bottomRight' => '0px', 'bottomLeft' => '0px' ) ),
			'sgsOptionPadding'            => array( 'desktop' => array( 'top' => '18px', 'right' => '20px', 'bottom' => '18px', 'left' => '20px' ) ),
			'sgsOptionChosenBackground'   => 'surface-stage',
			'sgsOptionChosenBorderColour' => 'text',
		);
		$css    = $this->css( $attrs, 'checkout' );
		$box    = '.sgs-x .wc-block-checkout__payment-method .wc-block-components-radio-control-accordion-option';
		$rules  = array_filter( array_map( 'trim', explode( '}', $css ) ) );
		$on_box = array_values( array_filter( $rules, static fn( string $r ): bool => 0 === strpos( $r, $box . '{' ) ) );
		$text   = implode( '', $on_box );
		$this->assertStringContainsString( 'background-color:white', $text, 'the option fill reaches the payment option box' );
		$this->assertStringContainsString( 'border-top-left-radius:0px', $text, 'the option corners reach the payment option box (WooCommerce rounds the chosen one to 4px)' );
		$this->assertStringContainsString( 'border-width:1px 1px 1px 1px', $text, 'the option border reaches the payment option box' );
		$this->assertStringNotContainsString( 'padding', $text, 'the box holds an inner label that already carries the option padding' );
		$this->assertStringContainsString( $box . '--checked-option-highlighted{background-color:var(--wp--preset--color--surface-stage', $css, 'the chosen fill reaches the chosen payment option box' );
	}
}

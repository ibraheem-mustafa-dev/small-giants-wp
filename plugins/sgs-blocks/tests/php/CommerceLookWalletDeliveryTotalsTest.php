<?php
/**
 * The Checkout look settings for the wallet divider (its two lines and the gap round its text), the delivery cards (title
 * and price line, description line, space below the cards), the order summary lines (brand line, space above the text
 * and price columns, the totals block and total row padding) and the active form field's side padding: each prints a
 * real property on the row of selectors.json that names it, and a block with none of them set prints none of it.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit tests/php/CommerceLookWalletDeliveryTotalsTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CommerceLookWalletDeliveryTotalsTest extends TestCase {

	private const ATTRS = array(
		'sgsExpressRuleLine'                   => array(
			'desktop' => array( 'width' => '1px', 'style' => 'solid', 'colour' => '#E6E1DA' ),
			'mobile'  => array( 'width' => '2px' ),
		),
		'sgsExpressRuleGap'                    => array( 'desktop' => '16px', 'mobile' => '12px' ),
		'sgsDeliveryTitleLineHeight'           => 20,
		'sgsDeliveryTitleLineHeightUnit'       => 'px',
		'sgsDeliveryDescriptionLineHeight'     => 18,
		'sgsDeliveryDescriptionLineHeightUnit' => 'px',
		'sgsDeliveryGap'                       => array( 'desktop' => '4px', 'mobile' => '6px' ),
		'sgsItemBrandLineHeight'               => 16.5,
		'sgsItemBrandLineHeightUnit'           => 'px',
		'sgsItemTextTop'                       => array( 'desktop' => '0px', 'mobile' => '2px' ),
		'sgsItemTextGap'                       => array( 'desktop' => '0px', 'mobile' => '2px' ),
		'sgsSummaryRowsPadding'                => array( 'desktop' => array( 'top' => '14px', 'bottom' => '4px' ) ),
		'sgsTotalPadding'                      => array( 'desktop' => array( 'top' => '8px' ) ),
		'sgsFieldPadding'                      => array(
			'desktop' => array( 'top' => '10px', 'right' => '14px', 'left' => '14px' ),
			'mobile'  => array( 'left' => '12px', 'right' => '12px' ),
		),
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
		$script = tempnam( sys_get_temp_dir(), 'sgscw' );
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

	/**
	 * The declarations of every rule whose selector list is exactly the one given, joined.
	 *
	 * @param string $css      Writer output.
	 * @param string $selector Exact selector list.
	 */
	private function bodies( string $css, string $selector ): string {
		$out = '';
		foreach ( array_filter( array_map( 'trim', explode( '}', $css ) ) ) as $rule ) {
			$parts = explode( '{', $rule, 2 );
			if ( 2 === count( $parts ) && trim( $parts[0] ) === $selector ) {
				$out .= $parts[1] . ';';
			}
		}
		return $out;
	}

	public function test_the_wallet_divider_lines_and_gap(): void {
		$css  = $this->css( self::ATTRS, 'checkout' );
		$rule = '.sgs-x .wc-block-components-express-payment-continue-rule';
		$both = $rule . '::before,' . $rule . '::after';
		$line = $this->bodies( $css, $both );
		$this->assertStringContainsString( 'border-top-width:1px', $line, 'the line is one top edge' );
		$this->assertStringContainsString( 'border-top-style:solid', $line );
		$this->assertStringContainsString( 'border-top-color:#E6E1DA', $line );
		$this->assertStringContainsString( 'border-bottom:0', $line, 'WooCommerce draws a second, bottom line; the setting removes it' );
		$this->assertStringContainsString( 'height:0', $line );
		$this->assertStringContainsString( 'background:none', $line );
		$this->assertMatchesRegularExpression( '/@media\(max-width:\d+px\)\{[^{]*::after\{border-top-width:2px;\}/', $css, 'the line width has a phone value' );
		$this->assertStringContainsString( 'gap:16px', $this->bodies( $css, $rule ), 'the gap between the lines and the text' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:\d+px\)\{[^{]*continue-rule\{gap:12px;\}/', $css, 'the gap has a phone value' );
		$this->assertStringContainsString( 'margin-right:0', $this->bodies( $css, $rule . '::before' ), 'WooCommerce adds its own 10px margin beside the text; the gap setting replaces it' );
		$this->assertStringContainsString( 'margin-left:0', $this->bodies( $css, $rule . '::after' ) );
	}

	public function test_the_delivery_cards_text_lines_and_gap(): void {
		$css = $this->css( self::ATTRS, 'checkout' );
		$this->assertStringContainsString( 'line-height:20px', $this->bodies( $css, '.sgs-x .wc-block-checkout__shipping-method-option-title,.sgs-x .sgs-delivery-card__price' ), 'the title and the price share the top line' );
		$this->assertStringContainsString( 'line-height:18px', $this->bodies( $css, '.sgs-x .sgs-delivery-card__description' ) );
		$this->assertStringContainsString( 'margin-bottom:4px', $this->bodies( $css, '.sgs-x .wc-block-checkout__shipping-method' ), 'the space below the cards' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:\d+px\)\{[^{]*shipping-method\{margin-bottom:6px;\}/', $css, 'the space below the cards has a phone value' );
	}

	public function test_the_summary_lines(): void {
		$css = $this->css( self::ATTRS, 'checkout' );
		$this->assertStringContainsString( 'line-height:16.5px', $this->bodies( $css, '.sgs-x .sgs-checkout-item-brand' ) );
		$this->assertStringContainsString( 'padding-top:0px', $this->bodies( $css, '.sgs-x .wc-block-components-order-summary-item__description,.sgs-x .wc-block-components-order-summary-item__total-price' ), 'the space above the text and price columns' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:\d+px\)\{[^{]*__total-price\{padding-top:2px;\}/', $css, 'the space above the columns has a phone value' );
		$this->assertStringContainsString( 'gap:0px', $this->bodies( $css, '.sgs-x .wc-block-components-order-summary-item__description' ), 'the gap between the brand, name and variant lines' );
		$rows = $this->bodies( $css, '.sgs-x .wp-block-woocommerce-checkout-order-summary-totals-block' );
		$this->assertStringContainsString( 'padding-top:14px', $rows, 'the totals block padding above the first row' );
		$this->assertStringContainsString( 'padding-bottom:4px', $rows );
		$this->assertStringContainsString( 'padding-top:8px', $this->bodies( $css, '.sgs-x .wc-block-components-totals-wrapper:has(.wc-block-components-totals-footer-item)' ), 'the total row padding' );
	}

	public function test_an_active_field_takes_the_same_side_padding_and_keeps_the_label_room(): void {
		$css    = $this->css( self::ATTRS, 'checkout' );
		$active = '.sgs-x .wc-block-components-form .wc-block-components-text-input.is-active input[type],.sgs-x .wc-block-components-form .wc-block-components-text-input input:-webkit-autofill';
		$body   = $this->bodies( $css, $active );
		$this->assertStringContainsString( 'padding-right:14px', $body );
		$this->assertStringContainsString( 'padding-left:14px', $body );
		$this->assertStringNotContainsString( 'padding-top', $body, 'the top padding makes room for the floated label and stays what WooCommerce sets' );
		$focus = $this->bodies( $css, str_replace( '[type],', '[type]:focus,', str_replace( ':-webkit-autofill', ':-webkit-autofill:focus', $active ) ) );
		$this->assertStringContainsString( 'padding-left:14px', $focus, 'WooCommerce shifts the left padding while the field has focus' );
		$this->assertMatchesRegularExpression( '/@media\(max-width:\d+px\)\{[^{]*is-active input\[type\][^{]*\{padding-right:12px;padding-left:12px;\}/', $css, 'the active side padding has a phone value' );
	}

	public function test_a_block_with_none_of_them_prints_none_of_it_and_the_cart_has_no_checkout_parts(): void {
		$none = $this->css( array( 'sgsStepTitleFontSize' => 24 ), 'checkout' );
		foreach ( array( 'continue-rule', 'shipping-method', 'sgs-delivery-card', 'sgs-checkout-item-brand', 'order-summary-item__description', 'order-summary-totals-block', 'is-active' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $none, "checkout: '{$needle}' must not print without its setting" );
		}
		$cart = $this->css( self::ATTRS, 'cart' );
		foreach ( array( 'continue-rule', 'shipping-method', 'sgs-delivery-card', 'sgs-checkout-item-brand', 'order-summary-item__description', 'order-summary-totals-block' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $cart, "cart: '{$needle}' belongs to the checkout only" );
		}
	}

	public function test_the_settings_are_declared_and_their_rows_exist(): void {
		$js = (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/attributes.js' );
		foreach ( array( 'sgsExpressRuleLine', 'sgsExpressRuleGap', 'sgsDeliveryTitleLineHeight', 'sgsDeliveryDescriptionLineHeight', 'sgsDeliveryGap', 'sgsItemBrandLineHeight', 'sgsItemTextTop', 'sgsItemTextGap', 'sgsSummaryRowsPadding', 'sgsTotalPadding' ) as $name ) {
			$this->assertMatchesRegularExpression( '/^\s*' . $name . ':/m', $js, "{$name} must be declared or WordPress drops it on save" );
		}
		$rows = json_decode( (string) file_get_contents( $this->root() . 'includes/woocommerce/commerce-look/selectors.json' ), true )['rows'];
		foreach ( array( 'express_rule', 'express_rule_line', 'delivery_title', 'delivery_description', 'delivery_step', 'item_brand', 'item_text', 'item_description', 'summary_rows', 'field_text_active' ) as $id ) {
			$this->assertArrayHasKey( 'checkout', $rows[ $id ], $id );
			$this->assertArrayNotHasKey( 'cart', $rows[ $id ], $id );
		}
	}
}

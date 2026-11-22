<?php
/**
 * The Cart and Checkout look settings added for the shop pages (F-61): terms alignment, the error message under a
 * field, the basket summary title on narrow layouts, the stacking width, the totals line description and the shipping
 * method line, the checkout's quantity badge, the picture fit and the coupon panel that starts open. Each prints only
 * when set, on the row of selectors.json that names its part.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CommerceLookNewSettingsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CommerceLookNewSettingsTest extends TestCase {

	private function root(): string {
		return dirname( __DIR__, 2 ) . '/';
	}

	/**
	 * Runs PHP in a child process with the commerce look writer loaded (its include files define functions the PHPUnit
	 * process must not load).
	 *
	 * @param string $body PHP statements that echo the result.
	 */
	private function run_php( string $body ): string {
		$root   = $this->root();
		$script = tempnam( sys_get_temp_dir(), 'sgscl' );
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\n"
			. "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
			. "require ABSPATH . 'includes/woocommerce/commerce-look/writer.php';\n" . $body
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
	}

	/**
	 * The look CSS of a block with these settings, less the primary button's motion every block prints.
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @param string               $block 'cart' or 'checkout'.
	 */
	private function css( array $attrs, string $block ): string {
		$call = static fn( string $json ): string => 'echo \\SGS\\Blocks\\sgs_commerce_look_css( json_decode( ' . var_export( $json, true ) . ', true ), ' . var_export( $block, true ) . ", 'sgs-x' );\n";
		$css  = $this->run_php( $call( (string) json_encode( $attrs ) ) );
		$base = $this->run_php( $call( '{}' ) );
		return str_replace( $base, '', $css );
	}

	public function test_terms_text_align(): void {
		$css = $this->css( array( 'sgsTermsTextAlign' => 'center' ), 'checkout' );
		$this->assertStringContainsString( '.sgs-x .wc-block-checkout__terms{text-align:center;}', $css );
	}

	public function test_error_message_type_and_colour(): void {
		$css = $this->css(
			array(
				'sgsErrorFontSize'     => 14,
				'sgsErrorFontSizeUnit' => 'px',
				'sgsErrorColour'       => '#b00020',
			),
			'checkout'
		);
		$this->assertStringContainsString( '.sgs-x .wc-block-components-validation-error,.sgs-x .wc-block-components-validation-error > p{font-size:14px;}', $css );
		$this->assertStringContainsString( '.sgs-x .wc-block-components-validation-error,.sgs-x .wc-block-components-validation-error > p{color:#b00020;}', $css );
		$this->assertSame( 1, substr_count( $css, 'color:#b00020' ), 'the colour prints once, from its own column' );
	}

	public function test_summary_title_shown_on_narrow_layouts(): void {
		$css = $this->css( array( 'sgsSummaryTitleDisplay' => array( 'desktop' => 'block' ) ), 'cart' );
		$this->assertStringContainsString( '.sgs-x.sgs-x .wc-block-components-sidebar .wc-block-cart__totals-title{display:block;}', $css );
		// Negative controls: a value the column does not list prints nothing; the checkout has no such row.
		$this->assertStringNotContainsString( 'display', $this->css( array( 'sgsSummaryTitleDisplay' => array( 'desktop' => 'flex' ) ), 'cart' ) );
		$this->assertStringNotContainsString( 'totals-title', $this->css( array( 'sgsSummaryTitleDisplay' => array( 'desktop' => 'block' ) ), 'checkout' ) );
	}

	public function test_stack_below_a_width(): void {
		$css = $this->css( array( 'sgsStackBelow' => '1024px' ), 'cart' );
		$this->assertStringContainsString( '@media (width < 1024px){.sgs-x.sgs-x .wc-block-components-sidebar-layout{flex-direction:column;}', $css );
		$this->assertStringContainsString( '.sgs-x.sgs-x .wc-block-components-sidebar-layout.is-large > .wc-block-components-sidebar{width:100%;max-width:none;flex:0 0 auto;padding-left:0;padding-right:0;}}', $css );
		// Negative controls: a percentage or junk is no media width.
		$this->assertSame( '', $this->css( array( 'sgsStackBelow' => '50%' ), 'cart' ) );
		$this->assertSame( '', $this->css( array( 'sgsStackBelow' => '1024px){body{display:none' ), 'cart' ) );
	}

	public function test_totals_description_and_shipping_via_line(): void {
		$css = $this->css(
			array(
				'sgsTotalsDescriptionColour' => '#3a2a22',
				'sgsShippingViaFontSize'     => 14,
				'sgsShippingViaFontSizeUnit' => 'px',
				'sgsShippingViaColour'       => '#3a2a22',
			),
			'cart'
		);
		$this->assertStringContainsString( '.sgs-x .wc-block-components-totals-item__description{color:#3a2a22;}', $css );
		$this->assertStringContainsString( '.sgs-x.sgs-x .wc-block-components-totals-shipping .wc-block-components-totals-shipping__via{font-size:14px;}', $css );
		$this->assertStringContainsString( '.sgs-x.sgs-x .wc-block-components-totals-shipping .wc-block-components-totals-shipping__via{color:#3a2a22;}', $css );
	}

	public function test_quantity_badge(): void {
		$css = $this->css(
			array(
				'sgsItemQuantityMinWidth'   => array( 'desktop' => '24px' ),
				'sgsItemQuantityMinHeight'  => array( 'desktop' => '24px' ),
				'sgsItemQuantityTop'        => array( 'desktop' => '-8px' ),
				'sgsItemQuantityRight'      => array( 'desktop' => '-8px' ),
				'sgsItemQuantityBackground' => '#3a2a22',
				'sgsItemQuantityTextColour' => '#fbf3dc',
			),
			'checkout'
		);
		$badge = '.sgs-x .wc-block-components-order-summary .wc-block-components-order-summary-item__quantity';
		foreach ( array( '{min-width:24px;}', '{min-height:24px;}', '{top:-8px;}', '{right:-8px;}', '{background-color:#3a2a22;}' ) as $decl ) {
			$this->assertStringContainsString( $badge . $decl, $css );
		}
		$this->assertStringContainsString( '.sgs-x.sgs-x .wc-block-components-order-summary .wc-block-components-order-summary-item__quantity span{color:#fbf3dc;}', $css );
		$this->assertStringNotContainsString( 'quantity', $this->css( array( 'sgsItemQuantityBackground' => '#3a2a22' ), 'cart' ), 'the cart has no badge' );
	}

	public function test_picture_fit(): void {
		$css = $this->css( array( 'sgsItemImageObjectFit' => array( 'desktop' => 'cover' ) ), 'checkout' );
		$this->assertStringContainsString( '.sgs-x .wc-block-components-order-summary .wc-block-components-order-summary-item__image > img{object-fit:cover;}', $css );
		$this->assertStringNotContainsString( 'object-fit', $this->css( array( 'sgsItemImageObjectFit' => array( 'desktop' => 'url(x)' ) ), 'checkout' ) );
	}

	public function test_coupon_open_reaches_the_summary_script_only_when_set(): void {
		$out = $this->run_php(
			"echo json_encode( \\SGS\\Blocks\\sgs_commerce_look_summary_extras( array( 'sgsCouponOpen' => true ), '/bag/' ) ), \"\\n\";\n"
			. "echo json_encode( \\SGS\\Blocks\\sgs_commerce_look_summary_extras( array( 'sgsItemShowBrand' => true ), '/bag/' ) ), \"\\n\";\n"
			. "echo json_encode( \\SGS\\Blocks\\sgs_commerce_look_summary_extras( array(), '/bag/' ) );\n"
		);
		$lines = explode( "\n", trim( $out ) );
		$this->assertTrue( json_decode( $lines[0], true )['couponOpen'] ?? false, $out );
		$this->assertArrayNotHasKey( 'couponOpen', json_decode( $lines[1], true ), 'a block without the switch keeps its config' );
		$this->assertSame( array(), json_decode( $lines[2], true ) );
	}

	public function test_the_settings_are_declared_with_a_control(): void {
		// WordPress drops an attribute the editor does not declare, so each must be in the attribute lists and the roster.
		$js     = (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/attributes.js' )
			. (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/attributes-table.generated.js' );
		$roster = (string) file_get_contents( $this->root() . 'src/blocks/extensions/extension-roster.json' );
		$names  = array( 'sgsTermsTextAlign', 'sgsStackBelow', 'sgsCouponOpen', 'sgsErrorFontSize', 'sgsErrorColour', 'sgsSummaryTitleDisplay', 'sgsTotalsDescriptionColour', 'sgsShippingViaColour', 'sgsItemQuantityBackground', 'sgsItemQuantityTop', 'sgsItemQuantityTextColour', 'sgsItemImageObjectFit' );
		foreach ( $names as $name ) {
			$this->assertMatchesRegularExpression( '/\t' . $name . ': \{ type: /', $js, "{$name} is not declared" );
			$this->assertStringContainsString( '"' . $name . '": {', $roster, "{$name} is not in the roster" );
		}
		$panels = (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/panels.js' );
		$this->assertStringContainsString( 'prefix="sgsTerms" showTextAlign', $panels, 'the terms text offers an alignment row' );
		$this->assertStringContainsString( 'sgsStackBelow: next', $panels );
		$this->assertStringContainsString( 'sgsCouponOpen: next', $panels );
		$this->assertStringContainsString( "case 'colour':", (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/table-panels.js' ), 'a colour column draws a control' );
	}

	public function test_none_of_it_prints_unset(): void {
		foreach ( array( 'cart', 'checkout' ) as $block ) {
			$this->assertSame( '', $this->css( array( 'sgsItemHideHeader' => false ), $block ) );
		}
	}
}

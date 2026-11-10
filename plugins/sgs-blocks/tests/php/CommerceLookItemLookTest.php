<?php
/**
 * The Cart and Checkout look settings for the line-item picture look, the quantity stepper look and width, the
 * primary button border, the summary card that wraps the checkout button, and the toggle that hides WooCommerce's
 * rules inside each line item (includes/woocommerce/commerce-look/): each prints a real property on the row of
 * selectors.json that names it, and a block with none of them set prints none of it.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CommerceLookItemLookTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CommerceLookItemLookTest extends TestCase {

	private const BOX = array(
		'top'    => '2px',
		'right'  => '2px',
		'bottom' => '2px',
		'left'   => '2px',
	);

	private const ATTRS = array(
		'sgsItemImageBackground'     => '#f9d5d3',
		'sgsItemImageBorderStyle'    => 'solid',
		'sgsItemImageBorderColour'   => '#3a2a22',
		'sgsItemStepperBackground'   => '#fbf3dc',
		'sgsItemStepperBorderStyle'  => 'solid',
		'sgsItemStepperBorderColour' => '#3a2a22',
		'sgsItemStepperWidth'        => array( 'desktop' => '110px' ),
		'sgsButtonBorderStyle'       => 'solid',
		'sgsButtonBorderColour'      => '#3a2a22',
		'sgsItemHideSeparators'      => true,
		'sgsSummaryWrapsButton'      => true,
		'sgsSummaryBackground'       => '#ffffff',
	);

	/**
	 * The settings with the box-shaped attributes filled in.
	 *
	 * @return array<string, mixed>
	 */
	private function attrs(): array {
		return self::ATTRS + array(
			'sgsItemImageBorderWidth'   => array( 'desktop' => self::BOX ),
			'sgsItemImageBorderRadius'  => array(
				'desktop' => array(
					'topLeft'     => '16px',
					'topRight'    => '16px',
					'bottomLeft'  => '16px',
					'bottomRight' => '16px',
				),
			),
			'sgsItemStepperBorderWidth' => self::BOX,
			'sgsButtonBorderWidth'      => self::BOX,
		);
	}

	private function root(): string {
		return dirname( __DIR__, 2 ) . '/';
	}

	/**
	 * The writer's CSS for a block, run in a child process (its include files define functions the PHPUnit process
	 * must not load).
	 *
	 * @param array<string, mixed> $attrs Block attributes.
	 * @param string               $block 'cart' or 'checkout'.
	 */
	private function css( array $attrs, string $block ): string {
		$root   = $this->root();
		$script = tempnam( sys_get_temp_dir(), 'sgscl' );
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
		$cart = $this->css( $this->attrs(), 'cart' );
		$this->assertStringContainsString( '.sgs-x table.wc-block-cart-items .wc-block-cart-items__row .wc-block-cart-item__image img{background-color:#f9d5d3;border-style:solid;border-width:2px 2px 2px 2px;border-color:#3a2a22;border-top-left-radius:16px;', $cart, 'cart picture look' );
		$this->assertStringContainsString( '.sgs-x .wc-block-components-quantity-selector{background-color:#fbf3dc;border-style:solid;border-width:2px 2px 2px 2px;border-color:#3a2a22;}', $cart, 'stepper fill and edge' );
		$this->assertStringContainsString( '.sgs-x .wc-block-components-quantity-selector{width:110px;}', $cart, 'stepper width' );
		$this->assertStringContainsString( '.sgs-x .wp-block-woocommerce-proceed-to-checkout-block .wp-element-button{border-style:solid;border-width:2px 2px 2px 2px;border-color:#3a2a22;}', $cart, 'cart button edge' );
		$this->assertStringContainsString( '.sgs-x table.wc-block-cart-items .wc-block-cart-items__row > td{border-top-width:0;}', $cart, 'separators hidden' );
		$this->assertStringContainsString( '.sgs-x .wc-block-cart__sidebar{background-color:#ffffff;}', $cart, 'the card paints on the side column when it wraps the button' );
		$this->assertStringNotContainsString( 'cart-order-summary-block{', $cart, 'the summary block itself is not painted then' );

		$checkout = $this->css( $this->attrs(), 'checkout' );
		$this->assertStringContainsString( '.sgs-x .wc-block-components-order-summary .wc-block-components-order-summary-item__image > img{background-color:#f9d5d3;', $checkout, 'checkout picture look' );
		$this->assertStringContainsString( '.wp-block-woocommerce-checkout-actions-block .wp-element-button{border-style:solid;border-width:2px 2px 2px 2px;border-color:#3a2a22;}', $checkout, 'checkout button edge' );
		$this->assertStringContainsString( '.wc-block-checkout__sidebar .wp-block-woocommerce-checkout-order-summary-block{background-color:#ffffff;}', $checkout, 'the checkout card keeps its own target' );
		foreach ( array( 'quantity-selector', 'border-top-width:0', 'wc-block-cart__sidebar' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $checkout, "the checkout has no '{$needle}'" );
		}
	}

	/**
	 * The CSS a block prints with no setting at all: the primary button's hover lift and transition, nothing else.
	 */
	private function motion( string $block ): string {
		$css = $this->css( array(), $block );
		$this->assertStringContainsString( 'transform:var(--wp--custom--button-presets--primary--hover-lift,translateY(-3px))', $css, "{$block}: an unset block lifts its button" );
		$this->assertStringContainsString( 'hover-transition,0.25s)', $css, "{$block}: an unset block times its button" );
		$this->assertStringContainsString( '@media (prefers-reduced-motion: reduce)', $css, "{$block}: reduced motion is guarded" );
		foreach ( array( 'background:', 'border-color:', 'border-style', ';color:', '{color:', 'padding', 'min-height' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $css, "{$block}: an unset block prints no '{$needle}'" );
		}
		return $css;
	}

	public function test_the_summary_card_keeps_its_target_unless_it_wraps_the_button(): void {
		$cart = str_replace( $this->motion( 'cart' ), '', $this->css( array( 'sgsSummaryBackground' => '#ffffff' ), 'cart' ) );
		$this->assertSame( '.sgs-x .wc-block-cart__sidebar .wp-block-woocommerce-cart-order-summary-block{background-color:#ffffff;}', $cart );
	}

	public function test_a_block_without_these_settings_prints_none_of_it(): void {
		$old = array(
			'sgsItemBackground'    => 'mm-paper',
			'sgsItemStepperRadius' => '999px',
			'sgsButtonMinHeight'   => array( 'desktop' => '62px' ),
		);
		foreach ( array( 'cart', 'checkout' ) as $block ) {
			$css = str_replace( $this->motion( $block ), '', $this->css( $old, $block ) );
			$this->assertNotSame( '', $css );
			foreach ( array( 'img{', '> img', 'quantity-selector{width', 'border-style', 'border-width', 'border-top-width', 'cart__sidebar{' ) as $needle ) {
				$this->assertStringNotContainsString( $needle, $css, "{$block}: '{$needle}' must not print without its setting" );
			}
		}
		$this->motion( 'cart' );
	}

	public function test_the_settings_are_declared_and_the_row_exists(): void {
		$js = (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/attributes.js' );
		foreach ( array_keys( $this->attrs() ) as $name ) {
			$this->assertStringContainsString( "	{$name}:", $js, "{$name} must be declared or WordPress drops it on save" );
		}
		$rows = json_decode( (string) file_get_contents( $this->root() . 'includes/woocommerce/commerce-look/selectors.json' ), true )['rows'];
		$this->assertSame( '.wc-block-cart__sidebar', $rows['summary_sidebar']['cart'] );
		$this->assertArrayNotHasKey( 'checkout', $rows['summary_sidebar'] );
	}
}

<?php
/**
 * The Cart and Checkout page fixes (F-60): the item card's settings out-rank WooCommerce's narrow-block rules, its
 * narrow grid keeps the line total inside the card, the summary that wraps the button drops the theme's inner card, an
 * empty totals wrapper takes no padding, a select with its label above keeps its arrow on the select, and the gift
 * step's title is laid out inside its card (includes/woocommerce/commerce-look/, src/blocks/gift-order/style.css).
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CommerceLookPageRowsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CommerceLookPageRowsTest extends TestCase {

	private const R4 = '.sgs-x.sgs-x.sgs-x.sgs-x';

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

	/**
	 * A four-side box for every device key given.
	 *
	 * @param string $v Side value.
	 * @return array<string, array<string, string>>
	 */
	private function box( string $v ): array {
		return array(
			'desktop' => array(
				'top'    => $v,
				'right'  => $v,
				'bottom' => $v,
				'left'   => $v,
			),
		);
	}

	public function test_item_card_settings_out_rank_the_narrow_rules(): void {
		$css = $this->css(
			array(
				'sgsItemBackground' => '#ffffff',
				'sgsItemPadding'    => $this->box( '14px' ),
			),
			'cart'
		);
		// WooCommerce's narrow rule for the row's bottom line is (0,5,1); the card's rules now lead with the scope class four times and the table (0,6,1).
		$this->assertStringContainsString( self::R4 . ' table.wc-block-cart-items .wc-block-cart-items__row{background-color:#ffffff;}', $css );
		$this->assertStringContainsString( self::R4 . ' table.wc-block-cart-items .wc-block-cart-items__row{padding-top:14px;padding-right:14px', $css );
		$this->assertStringNotContainsString( '.sgs-x .wc-block-cart-items__row{', $css, 'the weak selector is gone' );
	}

	public function test_narrow_item_grid_keeps_the_total_inside_the_card(): void {
		$narrow = self::R4 . ' .wc-block-components-sidebar-layout:not(.is-large) table.wc-block-cart-items .wc-block-cart-items__row';
		$css    = $this->css( array( 'sgsItemBackground' => '#ffffff' ), 'cart' );
		$this->assertStringContainsString( $narrow . '{grid-template-columns:80px minmax(0,1fr) 0 auto;}', $css );
		$thumb = $this->css(
			array(
				'sgsItemBackground' => '#ffffff',
				'sgsItemThumbSize'  => array( 'desktop' => '72px' ),
			),
			'cart'
		);
		$this->assertStringContainsString( $narrow . '{grid-template-columns:auto minmax(0,1fr) 0 auto;}', $thumb, 'a set thumbnail size sizes the picture column' );
		// Negative controls: no card setting, and the checkout, print no grid.
		$this->assertStringNotContainsString( 'grid-template-columns', $this->css( array( 'sgsItemHideHeader' => true ), 'cart' ) );
		$this->assertStringNotContainsString( 'grid-template-columns', $this->css( array( 'sgsItemBackground' => '#ffffff' ), 'checkout' ) );
	}

	public function test_a_summary_that_wraps_the_button_drops_the_inner_card(): void {
		$inner = '.sgs-x .wc-block-cart__sidebar .wp-block-woocommerce-cart-order-summary-block{background:transparent;border-radius:0;padding:0;}';
		$this->assertStringContainsString(
			$inner,
			$this->css(
				array(
					'sgsSummaryWrapsButton' => true,
					'sgsSummaryBackground'  => '#ffffff',
				),
				'cart'
			)
		);
		// Negative controls: without the switch the summary block keeps its own card; the checkout has no switch.
		$this->assertStringNotContainsString( 'background:transparent', $this->css( array( 'sgsSummaryBackground' => '#ffffff' ), 'cart' ) );
		$this->assertStringNotContainsString(
			'background:transparent',
			$this->css(
				array(
					'sgsSummaryWrapsButton' => true,
					'sgsSummaryBackground'  => '#ffffff',
				),
				'checkout'
			)
		);
	}

	public function test_an_empty_totals_wrapper_takes_no_padding(): void {
		$css = $this->css( array( 'sgsTotalsWrapperPadding' => $this->box( '8px' ) ), 'checkout' );
		$this->assertStringContainsString( ':not(:has(.wc-block-components-totals-footer-item)):not(:empty):not(:has(> :only-child:empty)){padding-top:8px', $css );
	}

	public function test_a_select_with_its_label_above_keeps_its_arrow_on_the_select(): void {
		$css = $this->css(
			array(
				'sgsFieldLabelPosition' => 'above',
				'sgsFieldColour'        => '#222222',
			),
			'checkout'
		);
		$this->assertStringContainsString( '.sgs-x .wc-blocks-components-select .wc-blocks-components-select__container{display:grid;grid-template-columns:minmax(0,1fr);}', $css );
		$this->assertStringContainsString( '.sgs-x .wc-blocks-components-select .wc-blocks-components-select__label{grid-row:1;grid-column:1;}', $css );
		$this->assertStringContainsString( '.sgs-x .wc-blocks-components-select .wc-blocks-components-select__expand{grid-row:2;grid-column:1;}', $css );
		$this->assertStringContainsString( '.sgs-x.sgs-x.sgs-x .wc-blocks-components-select__select{padding-inline-end:40px;}', $css, 'the room out-ranks the focused select rule (0,3,0)' );
		$this->assertStringNotContainsString( ':focus', $css, 'no focus selector of its own (the focus system owns focus looks)' );
		// Negative control: the floating label (WooCommerce's own) prints none of it.
		$floating = $this->css(
			array(
				'sgsFieldLabelPosition' => 'floating',
				'sgsFieldColour'        => '#222222',
			),
			'checkout'
		);
		$this->assertStringNotContainsString( 'select__expand', $floating );
	}

	public function test_root_repeat_rows_keep_their_selectors(): void {
		// A row that already carried root_repeat prints the same selector now that the shared helper applies it.
		$css = $this->css( array( 'sgsTotalsItemPadding' => $this->box( '4px' ) ), 'checkout' );
		$this->assertStringContainsString( '.sgs-x.sgs-x.sgs-x .wc-block-components-totals-item{padding-top:4px', $css );
		$this->assertStringNotContainsString( '.sgs-x.sgs-x.sgs-x.sgs-x', $css, 'the repeat is applied once' );
	}

	public function test_the_gift_step_title_is_laid_out_inside_its_card(): void {
		$css = str_replace( "\r\n", "\n", (string) file_get_contents( $this->root() . 'src/blocks/gift-order/style.css' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-gift-order__title \{[^}]*float: left;[^}]*width: 100%;/', $css );
		$this->assertStringContainsString( ".sgs-gift-order__title + * {\n\tclear: both;", $css );
	}
}

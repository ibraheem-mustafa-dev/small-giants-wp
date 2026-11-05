<?php
/**
 * The Cart and Checkout look settings for label, summary-row, total, variant and remove-link text, the row and total
 * dividers, the per-device picture size, the cell padding, the summary column width and the column gap
 * (includes/woocommerce/commerce-look/): each prints a real property on the row of selectors.json that names it, and a
 * block with none of them set prints none of it.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CommerceLookSummaryLayoutTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CommerceLookSummaryLayoutTest extends TestCase {

	private const NEW_ATTRS = array(
		'sgsFieldLabelFontSize'      => 15,
		'sgsSummaryRowLabelFontSize' => 16,
		'sgsSummaryRowValueFontSize' => 16,
		'sgsTotalLabelFontSize'      => 17,
		'sgsTotalValueFontSize'      => 30,
		'sgsItemVariantFontSize'     => 14,
		'sgsItemRemoveFontWeight'    => '700',
		'sgsItemHideUnitPrice'       => true,
		'sgsSummaryRowDivider'       => array(
			'desktop' => array(
				'width'  => '2px',
				'style'  => 'dashed',
				'colour' => '#3a2a22',
			),
		),
		'sgsTotalDivider'            => array(
			'desktop' => array(
				'width' => '3px',
				'style' => 'dotted',
			),
		),
		'sgsItemThumbSize'           => array(
			'desktop' => '104px',
			'mobile'  => '80px',
		),
		'sgsItemCellPadding'         => array(
			'desktop' => array(
				'top'    => '0',
				'bottom' => '0',
			),
		),
		'sgsSidebarWidth'            => array(
			'desktop' => '480px',
			'tablet'  => '360px',
		),
		'sgsColumnGap'               => array( 'desktop' => '40px' ),
	);

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

	public function test_every_new_setting_prints_its_property_on_its_row(): void {
		foreach ( array( 'cart', 'checkout' ) as $block ) {
			$css = $this->css( self::NEW_ATTRS, $block );
			$this->assertStringContainsString( '.sgs-x .wc-block-components-text-input.is-active label{font-size:15px;}', $css, "{$block} field label" );
			$this->assertStringContainsString( '.wc-block-components-totals-item:not(.wc-block-components-totals-footer-item) .wc-block-components-totals-item__label{font-size:16px;}', $css, "{$block} summary row label" );
			$this->assertStringContainsString( '.wc-block-components-totals-item:not(.wc-block-components-totals-footer-item) .wc-block-components-totals-item__value{font-size:16px;}', $css, "{$block} summary row value" );
			$this->assertStringContainsString( '.wc-block-components-totals-footer-item .wc-block-components-totals-item__label{font-size:17px;}', $css, "{$block} total label" );
			$this->assertStringContainsString( '.wc-block-components-totals-footer-item .wc-block-components-totals-item__value{font-size:30px;}', $css, "{$block} total value" );
			$this->assertStringContainsString( 'wc-block-components-product-metadata__description > p', $css, "{$block} variant text" );
			$this->assertStringContainsString( ':not(:has(.wc-block-components-totals-footer-item)):not(:first-child){border-top-width:2px;border-top-style:dashed;border-top-color:#3a2a22;}', $css, "{$block} row divider" );
			$this->assertStringContainsString( '.wc-block-components-totals-wrapper:has(.wc-block-components-totals-footer-item){border-top-width:3px;border-top-style:dotted;}', $css, "{$block} total divider" );
			$this->assertStringContainsString( '.wc-block-components-sidebar-layout.is-large > .wc-block-components-sidebar{flex-basis:480px;width:480px;}', $css, "{$block} sidebar width" );
			$this->assertStringContainsString( '.wc-block-components-sidebar-layout{column-gap:40px;}', $css, "{$block} column gap" );
			$this->assertMatchesRegularExpression( '/@media\(max-width:\d+px\)\{[^{]*\.wc-block-components-sidebar-layout\.is-large > \.wc-block-components-sidebar\{flex-basis:360px;width:360px;\}/', $css, "{$block} sidebar width on tablet" );
			$this->assertMatchesRegularExpression( '/@media\(max-width:\d+px\)\{[^{]*img\{width:80px;\}/', $css, "{$block} picture width on mobile" );
		}
		$cart = $this->css( self::NEW_ATTRS, 'cart' );
		$this->assertStringContainsString( '.wc-block-cart-item__remove-link{font-weight:700;}', $cart );
		$this->assertStringContainsString( '.wc-block-cart-items__row > td{padding-top:0px;padding-bottom:0px;}', $cart );
		$this->assertStringContainsString( '.wc-block-cart-item__prices{display:none;}', $cart );
		$this->assertStringContainsString( '.wc-block-cart-item__image img{width:104px;}', $cart );
		$checkout = $this->css( self::NEW_ATTRS, 'checkout' );
		$this->assertStringContainsString( '.wc-block-components-order-summary-item__image{width:104px;}', $checkout );
		$this->assertStringContainsString( '.wc-block-components-order-summary-item__image{flex-shrink:0;}', $checkout );
		$this->assertStringNotContainsString( 'remove-link', $checkout, 'the checkout has no remove link' );
		$this->assertStringNotContainsString( '> td', $checkout, 'the checkout has no table cells' );
	}

	public function test_a_block_with_none_of_the_new_settings_prints_none_of_it(): void {
		$old = array(
			'sgsItemBackground'    => 'mm-paper',
			'sgsItemGap'           => '12px',
			'sgsStepTitleFontSize' => 24,
			'sgsFieldBackground'   => 'mm-paper',
		);
		$this->assertSame( '', $this->css( array(), 'cart' ) );
		foreach ( array( 'cart', 'checkout' ) as $block ) {
			$css = $this->css( $old, $block );
			$this->assertNotSame( '', $css );
			foreach ( array( 'border-top', 'flex-basis', '.wc-block-components-sidebar-layout{column-gap', '> td', 'flex-shrink', 'totals-item__label', 'product-metadata', 'remove-link' ) as $needle ) {
				$this->assertStringNotContainsString( $needle, $css, "{$block}: '{$needle}' must not print without its setting" );
			}
		}
	}

	public function test_the_settings_are_declared_and_the_rows_exist(): void {
		$js = (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/attributes.js' );
		foreach ( array_keys( self::NEW_ATTRS ) as $name ) {
			$this->assertStringContainsString( "\t{$name}:", $js, "{$name} must be declared or WordPress drops it on save" );
		}
		$this->assertStringContainsString( "sgsItemThumbSize: { type: 'object' }", $js );
		$this->assertStringNotContainsString( 'sgsTotalRow', $js );
		$rows = json_decode( (string) file_get_contents( $this->root() . 'includes/woocommerce/commerce-look/selectors.json' ), true )['rows'];
		foreach ( array( 'total_label', 'total_value', 'summary_row_label', 'summary_row_value', 'summary_row_divider', 'total_divider', 'item_variant', 'sidebar_wide', 'layout' ) as $id ) {
			$this->assertArrayHasKey( 'cart', $rows[ $id ], $id );
			$this->assertArrayHasKey( 'checkout', $rows[ $id ], $id );
		}
		$this->assertArrayNotHasKey( 'checkout', $rows['item_remove'] );
		$this->assertArrayNotHasKey( 'checkout', $rows['item_cell'] );
	}
}

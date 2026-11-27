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
		'sgsButtonFontSize'          => 18,
		'sgsButtonFontWeight'        => '700',
		'sgsButtonMinHeight'         => array(
			'desktop' => '62px',
			'mobile'  => '56px',
		),
		'sgsButtonPadding'           => array( 'desktop' => array( 'left' => '24px' ) ),
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
			$this->assertMatchesRegularExpression( '/@media\(max-width:[\d.]+px\)\{[^{]*\.wc-block-components-sidebar-layout\.is-large > \.wc-block-components-sidebar\{flex-basis:360px;width:360px;\}/', $css, "{$block} sidebar width on tablet" );
			$this->assertMatchesRegularExpression( '/@media\(max-width:[\d.]+px\)\{[^{]*img\{width:80px;\}/', $css, "{$block} picture width on mobile" );
		}
		$cart = $this->css( self::NEW_ATTRS, 'cart' );
		$this->assertStringContainsString( '.sgs-x .wp-block-woocommerce-proceed-to-checkout-block .wc-block-components-button,.sgs-x .wp-block-woocommerce-proceed-to-checkout-block .wp-element-button{min-height:62px;padding-left:24px;}', $cart );
		$this->assertStringContainsString( 'wp-element-button{font-size:18px;}', $cart );
		$this->assertMatchesRegularExpression( '/@media\(max-width:[\d.]+px\)\{[^{]*wp-element-button\{min-height:56px;\}/', $cart );
		$this->assertStringContainsString( '.wc-block-cart-item__remove-link{font-weight:700;}', $cart );
		$this->assertStringContainsString( '.wc-block-cart-items__row > td{padding-top:0px;padding-bottom:0px;}', $cart );
		$this->assertStringContainsString( '.wc-block-cart-item__prices{display:none;}', $cart );
		$this->assertStringContainsString( '.wc-block-cart-item__image img{width:104px;}', $cart );
		$checkout = $this->css( self::NEW_ATTRS, 'checkout' );
		$this->assertStringContainsString( '.sgs-x .wc-block-components-checkout-place-order-button.wc-block-components-button,.sgs-x .wp-block-woocommerce-checkout-actions-block .wp-element-button{min-height:62px;padding-left:24px;}', $checkout );
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
		$this->motion( 'cart' );
		foreach ( array( 'cart', 'checkout' ) as $block ) {
			$css = str_replace( $this->motion( $block ), '', $this->css( $old, $block ) );
			$this->assertNotSame( '', $css );
			foreach ( array( 'border-top', 'flex-basis', '.wc-block-components-sidebar-layout{column-gap', '> td', 'flex-shrink', 'totals-item__label', 'product-metadata', 'remove-link', 'min-height', 'proceed-to-checkout', 'place-order' ) as $needle ) {
				$this->assertStringNotContainsString( $needle, $css, "{$block}: '{$needle}' must not print without its setting" );
			}
		}
	}

	private const MAIN_WIDE = '.sgs-x .wc-block-components-sidebar-layout.is-large > .wc-block-components-main';

	/**
	 * A css() result with the main column's rule (bare or inside its media query) taken out, so it can be compared with
	 * what the same settings printed before that rule existed.
	 *
	 * @param string $css CSS text from css().
	 */
	private function without_main_rule( string $css ): string {
		$css = (string) preg_replace( '/@media\([^)]*\)\{' . preg_quote( self::MAIN_WIDE, '/' ) . '\{[^}]*\}\}/', '', $css );
		return str_replace( self::MAIN_WIDE . '{flex:1 1 0%;min-width:0;}', '', $css );
	}

	public function test_a_column_gap_comes_out_of_the_main_column_at_every_device_it_prints(): void {
		$bare = self::MAIN_WIDE . '{flex:1 1 0%;min-width:0;}';
		foreach ( array( 'cart', 'checkout' ) as $block ) {
			// A desktop gap alone: the main column fills what the 35% sidebar and the gap leave, so the row cannot wrap.
			$css = $this->css( array( 'sgsColumnGap' => array( 'desktop' => '48px' ) ), $block );
			$this->assertStringContainsString( '.sgs-x .wc-block-components-sidebar-layout{column-gap:48px;}' . $bare, $css, "{$block}: the gap and the main column's fill print together" );
			$this->assertSame( 1, substr_count( $css, 'components-main' ), "{$block}: one main rule serves every device the gap cascades to" );

			// With a sidebar width the main column still takes the rest, whatever the width is.
			$css = $this->css(
				array(
					'sgsSidebarWidth' => array( 'desktop' => '400px' ),
					'sgsColumnGap'    => array(
						'desktop' => '48px',
						'mobile'  => '8px',
					),
				),
				$block
			);
			$this->assertStringContainsString( '.wc-block-components-sidebar{flex-basis:400px;width:400px;}.sgs-x .wc-block-components-sidebar-layout{column-gap:48px;}', $css, "{$block}: sidebar width and gap" );
			$this->assertStringContainsString( $bare, $css, "{$block}: main fill" );
			$this->assertSame( 1, substr_count( $css, 'components-main' ), "{$block}: the gap on mobile needs no second main rule" );

			// A gap set only on tablet prints the main rule only on tablet: the desktop row stays what it was.
			$css = $this->css( array( 'sgsColumnGap' => array( 'tablet' => '24px' ) ), $block );
			$this->assertMatchesRegularExpression( '/@media\(max-width:[\d.]+px\)\{' . preg_quote( self::MAIN_WIDE, '/' ) . '\{flex:1 1 0%;min-width:0;\}\}/', $css, "{$block}: tablet gap, tablet main fill" );
			$this->assertDoesNotMatchRegularExpression( '/(^|\})' . preg_quote( self::MAIN_WIDE, '/' ) . '\{/', $css, "{$block}: no desktop main rule for a tablet-only gap" );

			// A gap on every device prints the main rule once, at the first device, and the later devices inherit it.
			$css = $this->css(
				array(
					'sgsColumnGap' => array(
						'desktop' => '48px',
						'tablet'  => '24px',
						'mobile'  => '12px',
					),
				),
				$block
			);
			$this->assertStringContainsString( $bare, $css );
			$this->assertSame( 1, substr_count( $css, 'components-main' ), "{$block}: not repeated per device" );
			$this->assertStringContainsString( '{column-gap:24px;}', $css, "{$block}: tablet gap value unchanged" );
			$this->assertStringContainsString( '{column-gap:12px;}', $css, "{$block}: mobile gap value unchanged" );
		}
	}

	public function test_settings_that_are_unset_or_saved_on_a_mirror_print_what_they_printed_before_the_main_column_rule(): void {
		// md5 of the output for each attribute set (cart, checkout) with the touch-hover contract (FR-38A-17: a .sgs-pressed twin on every hover rule). Removing the touch twins gives the output of main at b61afd542, captured before the main column rule existed.
		$pins = array(
			'unset'                => array( array(), '1d139af717e159939786d26a1ce5750f', '489d2ea24e661257a0c2ce32bf25604b' ),
			'a sidebar width only' => array(
				array(
					'sgsSidebarWidth' => array(
						'desktop' => '480px',
						'tablet'  => '360px',
					),
				),
				'7b110081285f1f83befd7ad31d70d879',
				'911b44c7ebe2314852f8e5ebb9709ad8',
			),
		);
		foreach ( $pins as $label => $pin ) {
			foreach ( array(
				'cart'     => $pin[1],
				'checkout' => $pin[2],
			) as $block => $md5 ) {
				$css = $this->css( $pin[0], $block );
				$this->assertSame( $md5, md5( $css ), "{$label}, {$block}: prints exactly what it did" );
				$this->assertStringNotContainsString( 'components-main', $css, "{$label}, {$block}: no main column rule without a gap" );
			}
		}
		// What the mirrors save today: Mama's Cart page and Checkout page (Indus and Eye Care save neither setting). Their
		// main column is already flexible in their own CSS (flex:1 1 0%), so the added rule changes no width there.
		$saved = array(
			'cart'     => array(
				array(
					'sgsSidebarWidth' => array( 'desktop' => 'calc((100% - 40px) * 0.4)' ),
					'sgsColumnGap'    => array( 'desktop' => '40px' ),
				),
				'7909bef372d35606e3b6959fcef66f2e',
			),
			'checkout' => array(
				array(
					'sgsSidebarWidth' => array( 'desktop' => '477px' ),
					'sgsColumnGap'    => array( 'desktop' => '40px' ),
				),
				'6d6ff22ad016b7c915dd5feb57648d39',
			),
		);
		foreach ( $saved as $block => $pin ) {
			$css = $this->css( $pin[0], $block );
			$this->assertStringContainsString( self::MAIN_WIDE . '{flex:1 1 0%;min-width:0;}', $css, "Mama's {$block}: main column rule added" );
			$this->assertSame( $pin[1], md5( $this->without_main_rule( $css ) ), "Mama's {$block}: every other rule prints exactly what it did" );
		}
	}

	public function test_a_saved_string_picture_size_prints_the_rule_it_always_printed(): void {
		$css = str_replace( $this->motion( 'cart' ), '', $this->css( array( 'sgsItemThumbSize' => '96px' ), 'cart' ) );
		// md5 of the output of 28ab49ec8 for this attribute.
		$this->assertSame( '8637bc9c27b4a43ee9e5f9c52bf56c21', md5( $css ) );
		$checkout = $this->css( array( 'sgsItemThumbSize' => '96px' ), 'checkout' );
		$this->assertStringContainsString( '{width:96px;max-width:100%;height:auto;}', $checkout, 'same declarations; the checkout selector now out-ranks WooCommerce' );
		$this->assertStringContainsString( '.wc-block-components-order-summary-item__image{width:96px;flex-shrink:0;}', $checkout, 'the picture box takes the width and stops shrinking' );
		$this->assertStringNotContainsString( 'flex-shrink', $css, 'the cart has no picture box' );
	}

	public function test_the_settings_are_declared_and_the_rows_exist(): void {
		$js = (string) file_get_contents( $this->root() . 'src/blocks/extensions/commerce-look/attributes.js' );
		foreach ( array_keys( self::NEW_ATTRS ) as $name ) {
			$this->assertStringContainsString( "\t{$name}:", $js, "{$name} must be declared or WordPress drops it on save" );
		}
		$this->assertStringContainsString( "sgsItemThumbSize: { type: [ 'string', 'object' ] }", $js );
		$this->assertStringNotContainsString( 'sgsTotalRow', $js );
		$rows = json_decode( (string) file_get_contents( $this->root() . 'includes/woocommerce/commerce-look/selectors.json' ), true )['rows'];
		foreach ( array( 'total_label', 'total_value', 'summary_row_label', 'summary_row_value', 'summary_row_divider', 'total_divider', 'item_variant', 'sidebar_wide', 'layout', 'button_primary' ) as $id ) {
			$this->assertArrayHasKey( 'cart', $rows[ $id ], $id );
			$this->assertArrayHasKey( 'checkout', $rows[ $id ], $id );
		}
		$this->assertArrayNotHasKey( 'checkout', $rows['item_remove'] );
		$this->assertArrayNotHasKey( 'checkout', $rows['item_cell'] );
	}
}

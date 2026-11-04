<?php
/**
 * Tests: the "look" extension on woocommerce/product-filter-chips and woocommerce/catalog-sorting.
 *
 * Set values print scoped rules on the chip buttons, the count and the sort select; an unset block is
 * returned byte for byte; the chips' stored colours reach the buttons only when sgsChipPaintButtons is on;
 * other blocks are ignored.
 *
 * Run with: vendor/bin/phpunit --filter ProductFilterLookTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

namespace SGS\Blocks {
	if ( ! function_exists( __NAMESPACE__ . '\add_filter' ) ) {
		/**
		 * No-op add_filter(): the extension file registers its render_block filter at load.
		 *
		 * @return bool
		 */
		function add_filter(): bool {
			return true;
		}
	}
	if ( ! function_exists( __NAMESPACE__ . '\wp_strip_all_tags' ) ) {
		/**
		 * Minimal wp_strip_all_tags().
		 *
		 * @param string $text Text.
		 * @return string
		 */
		function wp_strip_all_tags( $text ) {
			return trim( strip_tags( (string) $text ) );
		}
	}
}

namespace {
	use PHPUnit\Framework\TestCase;

	require_once dirname( __DIR__, 2 ) . '/includes/product-filter-look.php';

	/**
	 * Chips and sort look rules.
	 */
	final class ProductFilterLookTest extends TestCase {

		private const CHIPS = '<div data-block-name="woocommerce/product-filter-chips" class="sgs-look-1a2b3c4d wp-block-woocommerce-product-filter-chips"><fieldset><div class="wc-block-product-filter-chips__items"></div></fieldset></div>';
		private const SORT  = '<div data-block-name="woocommerce/catalog-sorting" class="sgs-look-5e6f7a8b woocommerce wc-block-catalog-sorting"><form><select class="orderby"></select></form></div>';

		public function test_chip_weight_and_border_width_print_on_the_buttons(): void {
			$css = \SGS\Blocks\sgs_filter_look_chips_css(
				array(
					'sgsChipFontWeight'  => '700',
					'sgsChipBorderWidth' => '2px',
				),
				'sgs-look-1a2b3c4d'
			);
			$this->assertStringContainsString( '.sgs-filter-look.sgs-look-1a2b3c4d .wc-block-product-filter-chips__item{font-weight:700;border-width:2px;}', $css );
		}

		public function test_stored_colours_reach_the_buttons_only_when_painting_is_on(): void {
			$attrs = array(
				'customChipBackground'         => '#FFFAF0',
				'customChipBorder'             => '#3A2A22',
				'customChipText'               => '#3A2A22',
				'customSelectedChipBackground' => '#F9CF6E',
			);
			$this->assertSame( '', \SGS\Blocks\sgs_filter_look_chips_css( $attrs, 'sgs-look-1a2b3c4d' ) );
			$css = \SGS\Blocks\sgs_filter_look_chips_css( $attrs + array( 'sgsChipPaintButtons' => true ), 'sgs-look-1a2b3c4d' );
			$this->assertStringContainsString( '__item{background:#FFFAF0;border-color:#3A2A22;color:#3A2A22;}', $css );
			$this->assertStringContainsString( '__item[aria-checked="true"]{background:#F9CF6E;}', $css );
		}

		public function test_count_pill_prints_on_the_count(): void {
			$css = \SGS\Blocks\sgs_filter_look_chips_css(
				array(
					'sgsChipCountPill'       => true,
					'sgsChipCountBackground' => '#F9CF6E',
					'sgsChipCountColour'     => '#3A2A22',
				),
				'sgs-look-1a2b3c4d'
			);
			$this->assertStringContainsString( '.wc-block-product-filter-chips__count{padding-inline:0.5em;min-width:1.5em;text-align:center;border-radius:999px;background-color:#F9CF6E;color:#3A2A22;}', $css );
		}

		public function test_sort_select_look(): void {
			$css = \SGS\Blocks\sgs_filter_look_sort_css(
				array(
					'sgsSortBackground'   => '#FFFAF0',
					'sgsSortBorderColour' => '#3A2A22',
					'sgsSortBorderWidth'  => '2px',
					'sgsSortBorderRadius' => '999px',
					'sgsSortFontWeight'   => '700',
				),
				'sgs-look-5e6f7a8b'
			);
			$this->assertSame( '.sgs-filter-look.sgs-look-5e6f7a8b select.orderby{background-color:#FFFAF0;border-style:solid;border-width:2px;border-color:#3A2A22;border-radius:999px;font-weight:700;}', $css );
		}

		public function test_unsafe_values_print_nothing(): void {
			$this->assertSame( '', \SGS\Blocks\sgs_filter_look_chips_css( array( 'sgsChipBorderWidth' => '2px;}body{x:y', 'sgsChipFontWeight' => 'bold;' ), 'sgs-look-1a2b3c4d' ) );
			$this->assertSame( '', \SGS\Blocks\sgs_filter_look_sort_css( array( 'sgsSortBorderRadius' => '9px;}x{y:z' ), 'sgs-look-5e6f7a8b' ) );
		}

		public function test_render_filter_scopes_the_block_and_appends_the_rule(): void {
			$out = \SGS\Blocks\sgs_inject_filter_look( self::SORT, array( 'blockName' => 'woocommerce/catalog-sorting', 'attrs' => array( 'sgsSortBorderRadius' => '999px' ) ) );
			$this->assertMatchesRegularExpression( '/class="sgs-filter-look sgs-look-5e6f7a8b woocommerce/', $out );
			$this->assertStringContainsString( '<style>.sgs-filter-look.sgs-look-5e6f7a8b select.orderby{border-radius:999px;}</style>', $out );
			$this->assertStringNotContainsString( 'style="', $out );
		}

		public function test_unset_blocks_and_other_blocks_are_returned_untouched(): void {
			$this->assertSame( self::CHIPS, \SGS\Blocks\sgs_inject_filter_look( self::CHIPS, array( 'blockName' => 'woocommerce/product-filter-chips', 'attrs' => array() ) ) );
			$this->assertSame( self::SORT, \SGS\Blocks\sgs_inject_filter_look( self::SORT, array( 'blockName' => 'woocommerce/catalog-sorting', 'attrs' => array( 'sgsSortFontWeight' => '' ) ) ) );
			$this->assertSame( self::SORT, \SGS\Blocks\sgs_inject_filter_look( self::SORT, array( 'blockName' => 'core/group', 'attrs' => array( 'sgsSortBorderRadius' => '999px' ) ) ) );
		}
	}
}

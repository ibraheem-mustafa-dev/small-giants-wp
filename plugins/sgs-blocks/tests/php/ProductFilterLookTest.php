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
	if ( ! function_exists( __NAMESPACE__ . '\wp_style_engine_get_styles' ) ) {
		/**
		 * Minimal wp_style_engine_get_styles(): the chips' padding as CSS.
		 *
		 * @param array<string, mixed> $block_styles Style data.
		 * @return array<string, string>
		 */
		function wp_style_engine_get_styles( $block_styles ) {
			return array( 'css' => isset( $block_styles['spacing']['padding'] ) ? 'padding-top:0;padding-left:18px' : '' );
		}
	}
	if ( ! function_exists( __NAMESPACE__ . '\remove_query_arg' ) ) {
		/**
		 * Minimal remove_query_arg(): returns the page path.
		 *
		 * @return string
		 */
		function remove_query_arg(): string {
			return '/gifts/';
		}
	}
	if ( ! function_exists( __NAMESPACE__ . '\add_query_arg' ) ) {
		/**
		 * Minimal add_query_arg() for one key and value.
		 *
		 * @param string $key   Key.
		 * @param string $value Value.
		 * @param string $url   URL.
		 * @return string
		 */
		function add_query_arg( $key, $value, $url ) {
			return $url . '?' . $key . '=' . $value;
		}
	}
	if ( ! function_exists( __NAMESPACE__ . '\sanitize_title' ) ) {
		/**
		 * Minimal sanitize_title().
		 *
		 * @param string $title Title.
		 * @return string
		 */
		function sanitize_title( $title ) {
			return strtolower( preg_replace( '/[^a-z0-9-]+/i', '-', trim( (string) $title ) ) );
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
			$this->assertStringContainsString( '.wc-block-product-filter-chips__count{display:inline-flex;align-items:center;justify-content:center;padding-inline:0.5em;min-width:1.5em;border-radius:999px;background-color:#F9CF6E;color:#3A2A22;}', $css );
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

		public function test_chip_least_height_prints_on_the_buttons_and_nothing_when_unset(): void {
			$css = \SGS\Blocks\sgs_filter_look_chips_css( array( 'sgsChipMinHeight' => '46px' ), 'sgs-look-1a2b3c4d' );
			$this->assertStringContainsString( '.wc-block-product-filter-chips__item{min-height:46px;}', $css );
			$this->assertSame( '', \SGS\Blocks\sgs_filter_look_chips_css( array( 'sgsChipMinHeight' => '' ), 'sgs-look-1a2b3c4d' ) );
			$this->assertSame( '', \SGS\Blocks\sgs_filter_look_chips_css( array( 'sgsChipMinHeight' => '46px;}x{y:z' ), 'sgs-look-1a2b3c4d' ) );
		}

		public function test_count_pill_size_and_text_size_print_only_with_the_pill(): void {
			$attrs = array(
				'sgsChipCountSize'     => '22px',
				'sgsChipCountFontSize' => '12px',
			);
			$this->assertSame( '', \SGS\Blocks\sgs_filter_look_chips_css( $attrs, 'sgs-look-1a2b3c4d' ) );
			$css = \SGS\Blocks\sgs_filter_look_chips_css( $attrs + array( 'sgsChipCountPill' => true ), 'sgs-look-1a2b3c4d' );
			$this->assertStringContainsString( 'min-width:22px;height:22px;font-size:12px;border-radius:999px;', $css );
		}

		private const COUNTED = '<div class="wc-block-product-filter-chips__items"><button><span class="wc-block-product-filter-chips__count">
			(<span data-wp-text="context.item.count">3</span>)
		</span></button><template><span class="wc-block-product-filter-chips__count">(<span data-wp-text="context.item.count"></span>)</span></template></div>';

		public function test_pill_drops_the_brackets_around_the_count_but_keeps_the_store_span(): void {
			$block = array( 'blockName' => 'woocommerce/product-filter-chips', 'attrs' => array( 'sgsChipCountPill' => true ) );
			$out   = \SGS\Blocks\sgs_filter_look_chips_markup( self::COUNTED, $block );
			$this->assertStringNotContainsString( '(<span', $out );
			$this->assertStringNotContainsString( '</span>)', $out );
			$this->assertSame( 2, substr_count( $out, '<span data-wp-text="context.item.count">' ) );
		}

		public function test_without_the_pill_or_the_all_label_the_markup_is_returned_untouched(): void {
			$block = array( 'blockName' => 'woocommerce/product-filter-chips', 'attrs' => array() );
			$this->assertSame( self::COUNTED, \SGS\Blocks\sgs_filter_look_chips_markup( self::COUNTED, $block ) );
			$this->assertSame( self::COUNTED, \SGS\Blocks\sgs_filter_look_chips_markup( self::COUNTED, array( 'blockName' => 'core/group', 'attrs' => array( 'sgsChipAllLabel' => 'All' ) ) ) );
		}

		public function test_all_chip_is_first_and_current_only_while_nothing_is_chosen(): void {
			$block = array( 'blockName' => 'woocommerce/product-filter-chips', 'attrs' => array( 'sgsChipAllLabel' => 'All' ) );
			$make  = static fn( bool $selected ): object => (object) array(
				'context' => array(
					'woocommerce/selectableItems' => array( 'items' => array( array( 'type' => 'taxonomy/product_cat', 'selected' => $selected ) ) ),
				),
			);
			$none   = \SGS\Blocks\sgs_filter_look_chips_markup( self::COUNTED, $block, $make( false ) );
			$chosen = \SGS\Blocks\sgs_filter_look_chips_markup( self::COUNTED, $block, $make( true ) );
			$this->assertStringContainsString( '<div class="wc-block-product-filter-chips__items"><a class="wc-block-product-filter-chips__item sgs-filter-look__all" href="', $none );
			$this->assertStringContainsString( 'aria-current="true"', $none );
			$this->assertStringNotContainsString( 'aria-current', $chosen );
			$this->assertStringContainsString( '>All</span>', $chosen );
		}

		public function test_all_chip_takes_the_chips_padding(): void {
			$css = \SGS\Blocks\sgs_filter_look_chips_css( array( 'sgsChipAllLabel' => 'All', 'style' => array( 'spacing' => array( 'padding' => array( 'left' => '18px' ) ) ) ), 'sgs-look-1a2b3c4d' );
			$this->assertStringContainsString( '.sgs-filter-look__all{display:inline-flex;align-items:center;text-decoration:none;padding-top:0;padding-left:18px;}', $css );
		}

		public function test_all_chip_css_prints_only_with_a_label(): void {
			$this->assertStringNotContainsString( 'sgs-filter-look__all', \SGS\Blocks\sgs_filter_look_chips_css( array(), 'sgs-look-1a2b3c4d' ) );
			$this->assertStringContainsString( '.sgs-filter-look__all[aria-current="true"]{', \SGS\Blocks\sgs_filter_look_chips_css( array( 'sgsChipAllLabel' => 'All' ), 'sgs-look-1a2b3c4d' ) );
		}

		public function test_group_parameters_follow_the_filter_kind(): void {
			$this->assertSame( array( 'tags' ), \SGS\Blocks\sgs_chip_group_param_keys( 'taxonomy/product_tag' ) );
			$this->assertSame( array( 'filter_pa_x' ), \SGS\Blocks\sgs_chip_group_param_keys( 'taxonomy/pa_x' ) );
			$this->assertSame( array( 'filter_colour', 'query_type_colour' ), \SGS\Blocks\sgs_chip_group_param_keys( 'attribute/colour' ) );
			$this->assertSame( array(), \SGS\Blocks\sgs_chip_group_param_keys( 'rating' ) );
		}

		public function test_start_terms_are_found_inside_their_filter_block_only(): void {
			$chips  = static fn( array $attrs ): array => array( 'blockName' => 'woocommerce/product-filter-chips', 'attrs' => $attrs, 'innerBlocks' => array() );
			$blocks = array(
				array( 'blockName' => 'woocommerce/product-filter-taxonomy', 'attrs' => array( 'taxonomy' => 'product_tag' ), 'innerBlocks' => array( $chips( array( 'sgsChipStartTerm' => 'just-had-a-baby' ) ) ) ),
				array( 'blockName' => 'woocommerce/product-filter-taxonomy', 'attrs' => array(), 'innerBlocks' => array( $chips( array() ) ) ),
				$chips( array( 'sgsChipStartTerm' => 'orphan' ) ),
			);
			$this->assertSame(
				array( array( 'type' => 'taxonomy/product_tag', 'term' => 'just-had-a-baby' ) ),
				\SGS\Blocks\sgs_chip_start_collect( $blocks )
			);
		}

		public function test_start_term_applies_only_to_a_page_with_no_filter_parameter(): void {
			$starts = array( array( 'type' => 'taxonomy/product_tag', 'term' => 'just-had-a-baby' ) );
			$keys   = array( 'tags', 'categories', 'filter_colour' );
			$this->assertSame( array( 'tags' => 'just-had-a-baby' ), \SGS\Blocks\sgs_chip_start_args( $starts, array( 'utm_source' => 'x' ), $keys ) );
			$this->assertSame( array(), \SGS\Blocks\sgs_chip_start_args( $starts, array( 'tags' => '' ), $keys ), 'an empty parameter (the All chip) is a choice' );
			$this->assertSame( array(), \SGS\Blocks\sgs_chip_start_args( $starts, array( 'categories' => 'gifts' ), $keys ) );
			$this->assertSame( array(), \SGS\Blocks\sgs_chip_start_args( array(), array(), $keys ) );
		}
	}
}

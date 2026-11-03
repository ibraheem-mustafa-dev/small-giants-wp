<?php
/**
 * Layer B of the cart line summary carries unpriced choice-flow answers.
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Blocks {
	if ( ! class_exists( __NAMESPACE__ . '\\Addon_Price_List_Cart' ) ) {
		class Addon_Price_List_Cart {
			const LINES_KEY = 'sgs_addons';
		}
	}
	if ( ! class_exists( __NAMESPACE__ . '\\Flow_Fields_Cart' ) ) {
		class Flow_Fields_Cart {
			const KEY = 'sgs_flow_fields';
		}
	}
	if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_wording' ) ) {
		function sgs_cart_line_summary_wording(): array {
			return array(
				'leadWithAddons'    => 'Prescription',
				'leadWithoutAddons' => 'Frame only',
				'labelSeparator'    => ': ',
			);
		}
	}
	if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_size_band' ) ) {
		function sgs_cart_line_summary_size_band(): array {
			return array(
				'axis'  => '',
				'scale' => '',
			);
		}
	}
	if ( ! function_exists( __NAMESPACE__ . '\\sgs_addon_short_labels' ) ) {
		function sgs_addon_short_labels( array $lines ): array {
			return array_column( $lines, 'label' );
		}
	}
}

namespace {
	// WordPress and WooCommerce stand-ins, defined only when absent.
	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', __DIR__ . '/' );
	}
	if ( ! function_exists( 'taxonomy_exists' ) ) {
		function taxonomy_exists( $taxonomy ) {
			return false;
		}
	}
	if ( ! function_exists( 'wc_attribute_label' ) ) {
		function wc_attribute_label( $name ) {
			return ucfirst( (string) $name );
		}
	}
}

namespace SGS\Blocks\Tests {

	use PHPUnit\Framework\TestCase;

	require_once dirname( __DIR__, 2 ) . '/includes/cart-line-summary/functions.php';

	final class CartLineSummaryAnswersTest extends TestCase {

		private function answers(): array {
			return array(
				array(
					'label' => 'Flavours',
					'value' => 'A, B, C',
				),
				array(
					'label' => 'Dietary',
					'value' => 'Vegan',
				),
			);
		}

		public function test_variation_attributes_plus_answers_share_one_line(): void {
			$item = array(
				'variation'       => array( 'attribute_size' => 'M' ),
				'sgs_flow_fields' => $this->answers(),
			);
			$this->assertSame(
				array( 'Frame only · Size: M · Flavours: A, B, C · Dietary: Vegan' ),
				\SGS\Blocks\sgs_cart_line_summary_for_cart_item( $item )
			);
		}

		public function test_addons_plus_answers(): void {
			$item = array(
				'sgs_addons'      => array( array( 'label' => 'Thin' ) ),
				'sgs_flow_fields' => $this->answers(),
			);
			$this->assertSame(
				array( 'Prescription · Thin', 'Flavours: A, B, C · Dietary: Vegan' ),
				\SGS\Blocks\sgs_cart_line_summary_for_cart_item( $item )
			);
		}

		public function test_answers_only_on_a_simple_product(): void {
			$item = array( 'sgs_flow_fields' => $this->answers() );
			$this->assertSame(
				array( 'Flavours: A, B, C · Dietary: Vegan' ),
				\SGS\Blocks\sgs_cart_line_summary_for_cart_item( $item )
			);
		}

		public function test_line_without_answers_is_unchanged(): void {
			$this->assertSame(
				array( 'Frame only · Size: M' ),
				\SGS\Blocks\sgs_cart_line_summary_for_cart_item( array( 'variation' => array( 'attribute_size' => 'M' ) ) )
			);
			$this->assertSame( array(), \SGS\Blocks\sgs_cart_line_summary_for_cart_item( array() ) );
		}
	}
}

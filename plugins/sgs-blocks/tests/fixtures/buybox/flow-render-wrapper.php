<?php
/**
 * Renders the buy box through scripts/qa/lib/render-css-harness.php with a product-linked flow that resolves: the harness
 * has no choice-flow CPT, so this defines the two things sgs_buybox_resolve_linked_flow() reads (the flow lookup and
 * parse_blocks) and WooCommerce's price functions a simple product's manifest reads (wc-price-stubs.php) before handing every
 * argument to the harness. Used by BuyboxKeepFlowTest and BuyboxSimpleProductTest; a product with no `_sgs_choice_flow` meta
 * links no flow.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

namespace {
	class WP_Post {
		public $post_name    = '';
		public $post_content = '';
		public $ID           = 0;
	}

	function parse_blocks( $content ) {
		return array( array( 'blockName' => 'sgs/choice-flow', 'attrs' => array( 'openerLabel' => 'Add prescription lenses' ) ) );
	}
}

namespace SGS\Blocks {
	class Sgs_Block_CPTs {
		public static function resolve_choice_flow( string $slug ) {
			$post            = new \WP_Post();
			$post->post_name = $slug;
			return $post;
		}
	}
}

namespace {
	// A simple product's manifest reads WooCommerce's price functions (wc-price-stubs.php).
	require __DIR__ . '/wc-price-stubs.php';
	$argv = array_merge( array( 'harness' ), array_slice( $_SERVER['argv'], 1 ) );
	require dirname( __DIR__, 3 ) . '/scripts/qa/lib/render-css-harness.php';
}

<?php
/**
 * Cart and Checkout look settings: the one writer.
 *
 * `woocommerce/cart` and `woocommerce/checkout` carry the `commerceLook` extension's attributes (no `default`, so an
 * unset block is WooCommerce's and the theme's look, byte for byte). `render_block` hands the set ones to the group
 * builders in this folder and prints their rules through sgs_inject_scoped_block_css(), which adds the scope class
 * to the block root only when at least one rule exists. Every rule starts with that scope class.
 *
 * The block editor draws WooCommerce's blocks in React, so `render_block` never runs there; rest.php returns the
 * same output from sgs_commerce_look_css() for the canvas.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/product-filter-look.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/selectors.php';
require_once __DIR__ . '/fields.php';
require_once __DIR__ . '/cards.php';
require_once __DIR__ . '/typography.php';
require_once __DIR__ . '/line-items.php';

const SGS_COMMERCE_LOOK_BLOCKS = array(
	'woocommerce/cart'     => 'cart',
	'woocommerce/checkout' => 'checkout',
);

add_filter( 'render_block', __NAMESPACE__ . '\sgs_inject_commerce_look', 11, 2 );

/**
 * The complete scoped CSS for one block's look settings.
 *
 * @param array<string, mixed> $attrs Stored block attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $scope Scope class name, no leading dot.
 * @return string CSS text without a <style> wrapper; '' when nothing is set.
 */
function sgs_commerce_look_css( array $attrs, string $block, string $scope ): string {
	$set = sgs_commerce_look_set_attrs( $attrs );
	if ( array() === $set || '' === $scope ) {
		return '';
	}
	$root = '.' . $scope;
	return sgs_commerce_look_fields_css( $set, $block, $root )
		. sgs_commerce_look_cards_css( $set, $block, $root )
		. sgs_commerce_look_typography_css( $set, $block, $root )
		. sgs_commerce_look_line_items_css( $set, $block, $root );
}

/**
 * Render-block filter: the look rule for the Cart and Checkout blocks.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_inject_commerce_look( $block_content, $block ) {
	if ( ! is_string( $block_content ) || '' === trim( $block_content ) || ! is_array( $block ) ) {
		return $block_content;
	}
	$which = SGS_COMMERCE_LOOK_BLOCKS[ $block['blockName'] ?? '' ] ?? '';
	if ( '' === $which ) {
		return $block_content;
	}
	$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
	if ( array() === sgs_commerce_look_set_attrs( $attrs ) ) {
		return $block_content;
	}
	return sgs_inject_scoped_block_css(
		$block_content,
		'sgs-commerce-look',
		static fn( string $scope ): string => sgs_commerce_look_css( $attrs, $which, $scope )
	);
}

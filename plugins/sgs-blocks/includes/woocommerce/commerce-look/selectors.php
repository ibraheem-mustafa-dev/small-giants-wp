<?php
/**
 * The one table of WooCommerce selectors the Cart and Checkout look settings paint (selectors.json).
 *
 * These selectors belong to a third party (WooCommerce's Cart and Checkout blocks), so they are read from the
 * DOM WooCommerce really renders, never guessed, and they live in selectors.json and nowhere else: every writer
 * file in this folder asks this table for a selector by row id, and the drift probe
 * (scripts/computed-route/lib/site-check-commerce-look.mjs) reads the same file. Each row records the WooCommerce
 * version it was read on (`wc_version`) and the state the page must be in for the selector to match (`state` in
 * words, `needs` for the probe), so a WooCommerce update that moves the markup is named by row and version.
 *
 * Row shape: `cart` / `checkout` (the selector list for that block, relative to the block root; a missing key means
 * the row does not apply to that block), `wc_version`, `state`, `needs`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * The selector table.
 *
 * @return array<string, array<string, mixed>>
 */
function sgs_commerce_look_selector_table(): array {
	static $rows = null;
	if ( null !== $rows ) {
		return $rows;
	}
	$raw  = file_get_contents( __DIR__ . '/selectors.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a plugin file read, not a remote request.
	$data = false === $raw ? null : json_decode( $raw, true );
	$rows = is_array( $data ) && is_array( $data['rows'] ?? null ) ? $data['rows'] : array();
	return $rows;
}

/**
 * A table row's selector for one block, prefixed with the scope.
 *
 * @param string $row   Row id from the table.
 * @param string $block 'cart' or 'checkout'.
 * @param string $root  Scope selector (for example `.sgs-commerce-look-1a2b3c4d`).
 * @param string $tail  Text appended to every selector in the row (a pseudo-class such as `:focus`).
 * @return string The scoped selector list, or '' when the row does not apply to the block.
 */
function sgs_commerce_look_selector( string $row, string $block, string $root, string $tail = '' ): string {
	$table = sgs_commerce_look_selector_table();
	$list  = (string) ( $table[ $row ][ $block ] ?? '' );
	if ( '' === $list ) {
		return '';
	}
	$out = array();
	foreach ( explode( ',', $list ) as $one ) {
		$out[] = $root . ' ' . trim( $one ) . $tail;
	}
	return implode( ',', $out );
}

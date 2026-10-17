<?php
/**
 * A variable product's configurator for the render harness, loaded only by `--manifest-file` (with `--product-file`
 * naming a `"type": "variable"` product): the motion part render-path gate (scripts/check-motion-part-render-paths.py)
 * renders sgs/buybox's main path and sgs/product-card's interactive configurator card with it.
 *
 * WHAT IT IS: the WordPress and WooCommerce boundaries `Product_Manifest::build()` reads on its cache-hit path, answering
 * with the manifest file. `build()` itself runs unchanged: it finds the variable product (wc-product-stub.php), checks
 * its publish status, reads its read-through transient and compares the transient's `generatedAt` with the newest
 * `post_modified_gmt` of the product and its variations; here the transient is the manifest file and the freshness
 * probe answers that same moment, so `build()` returns the manifest as a warm cache would on a real site. Nothing
 * computes commerce: every price, stock flag, axis and gallery item is the fixture's input, so the harness proves which
 * markup the render prints for a manifest, never what WooCommerce would compute for a product.
 *
 * Also defined: `WC_VERSION` at the configurator floor (`Sgs_Configurator_Compat::MIN_WC`), so the product card takes
 * its interactive branch, and the `WooCommerce` class sgs/buybox's first guard asks for.
 *
 * Manifest file: the array `Product_Manifest::build()` returns (decimals, currencySymbol, generatedAt, axes, combos,
 * defaultKey, defaultAxes), each combo carrying the keys `build()` writes.
 *
 * Test scaffolding only; nothing here is shipped.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

// phpcs:disable

if ( ! defined( 'WC_VERSION' ) ) {
	define( 'WC_VERSION', '9.8' );
}

if ( ! class_exists( 'WooCommerce', false ) ) {
	class WooCommerce {}
}

if ( ! function_exists( 'get_post_status' ) ) {
	function get_post_status( $post = null ) {
		return 'publish';
	}
}

if ( ! function_exists( 'get_transient' ) ) {
	// The manifest file for the manifest's cache key (`sgs_manifest_v<N>_<product id>_<tax fingerprint>`), else nothing.
	function get_transient( $transient ) {
		$manifest = $GLOBALS['sgs_qa_manifest'] ?? null;
		$id       = (int) ( $GLOBALS['sgs_qa_product']['id'] ?? 0 );
		if ( is_array( $manifest ) && 1 === preg_match( '/^sgs_manifest_v\d+_(\d+)_/', (string) $transient, $m ) && (int) $m[1] === $id ) {
			return $manifest;
		}
		return false;
	}
}

if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( $transient, $value, $expiration = 0 ) {
		return true;
	}
}

if ( ! isset( $GLOBALS['wpdb'] ) ) {
	/** The freshness probe `Product_Manifest::build()` runs: the newest modified time is the manifest's own. */
	class Sgs_QA_Manifest_Wpdb {
		public string $prefix = 'wp_';
		public string $posts  = 'wp_posts';
		public function prepare( $query, ...$args ) {
			return (string) $query;
		}
		public function get_var( $query = null ) {
			if ( false !== strpos( (string) $query, 'post_modified_gmt' ) ) {
				return gmdate( 'Y-m-d H:i:s', (int) ( $GLOBALS['sgs_qa_manifest']['generatedAt'] ?? 0 ) );
			}
			return null;
		}
	}
	$GLOBALS['wpdb'] = new Sgs_QA_Manifest_Wpdb();
}

<?php
/**
 * Test scaffolding: makes `WC()` answer so `src/blocks/cart/render.php` renders its panel (flyout and drawer modes) under
 * `scripts/qa/lib/render-css-harness.php`, loaded with `php -d auto_prepend_file=...`. Nothing here is shipped.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

if ( ! function_exists( 'WC' ) ) {
	function WC() {
		return new stdClass();
	}
}

if ( ! function_exists( 'wc_get_cart_url' ) ) {
	function wc_get_cart_url() {
		return 'https://example.test/cart';
	}
}

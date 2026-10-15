<?php
/**
 * Test scaffolding: declares an empty `WooCommerce` class so `src/blocks/cart/render.php` passes its availability check
 * under `scripts/qa/lib/render-css-harness.php` (loaded with `php -d auto_prepend_file=...`). The block then renders its
 * WooCommerce-inactive link trigger, which is all the count-pop and overlap checks need. Nothing here is shipped.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

if ( ! class_exists( 'WooCommerce', false ) ) {
	class WooCommerce {}
}

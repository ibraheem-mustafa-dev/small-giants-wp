<?php
/**
 * SGS Add-on price list — bootstrap (Spec 43 FR-43-17 to FR-43-20).
 *
 * Single require point from class-sgs-blocks.php. The public read/resolve
 * API (functions.php) loads unconditionally — the sgs/choice-flow block
 * reads it at render time whether or not WooCommerce happens to be active
 * on a given request. Everything that touches WooCommerce (settings page,
 * cart/order hooks, the CLI seeder) loads only when its dependency exists.
 *
 * @package SGS\Blocks
 * @since   1.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/functions.php';

// WooCommerce → Add-on prices settings page — admin only.
if ( \is_admin() ) {
	require_once __DIR__ . '/class-addon-price-list-admin.php';
	Addon_Price_List_Admin::register();
}

// Cart/order integration. Loaded the same way Cart_Proxy is (see
// class-sgs-blocks.php): required unconditionally — the class body only
// type-hints \WC_Cart/\WC_Order_Item_Product/\WC_Order, which PHP does not
// resolve until a method actually runs, and every hook it registers only
// ever FIRES from inside WooCommerce's own code, so there is nothing to run
// when WooCommerce is inactive.
require_once __DIR__ . '/class-addon-price-list-cart.php';
Addon_Price_List_Cart::register();

// The list's groups for sgs/choice-flow-question's "Price from list" control.
require_once __DIR__ . '/editor-data.php';

// `wp sgs addon-prices seed <file.json>` — CLI only.
if ( \defined( 'WP_CLI' ) && \WP_CLI ) {
	require_once __DIR__ . '/class-addon-price-list-cli.php';
	Addon_Price_List_CLI::register();
}

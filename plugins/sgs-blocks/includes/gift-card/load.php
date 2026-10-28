<?php
/**
 * SGS gift cards - bootstrap (Spec 27, FR-27-GC1 to FR-27-GC12).
 *
 * Single require point from sgs-blocks.php. Every class is loaded here, in
 * dependency order, because the plugin has no autoloader for `includes/`. The
 * WooCommerce-touching classes only register hooks, and those hooks only fire
 * from inside WooCommerce, so loading them when WooCommerce is inactive costs
 * nothing (the same approach as `includes/addon-price-list/load.php`).
 * `Gift_Card_Product` is the one exception: it extends a WooCommerce class and is
 * loaded lazily by `Gift_Card_Product_Type::product_class()`.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

// Pure domain: no WordPress calls beyond the settings option read.
require_once __DIR__ . '/class-gift-card-exception.php';
require_once __DIR__ . '/class-gift-card-settings.php';
require_once __DIR__ . '/class-gift-card-money.php';
require_once __DIR__ . '/class-gift-card-code.php';
require_once __DIR__ . '/interface-gift-card-store.php';
require_once __DIR__ . '/class-gift-card-refund-policy.php';
require_once __DIR__ . '/trait-gift-card-ledger-operations.php';
require_once __DIR__ . '/class-gift-card-ledger.php';
require_once __DIR__ . '/class-gift-card-rate-limiter.php';
require_once __DIR__ . '/class-gift-card-lookup.php';
require_once __DIR__ . '/class-gift-card-amounts.php';
require_once __DIR__ . '/class-gift-card-purchase-fields.php';

// Storage and wiring.
require_once __DIR__ . '/class-gift-card-wpdb-store.php';
require_once __DIR__ . '/class-gift-card-tables.php';
require_once __DIR__ . '/class-gift-card-services.php';

// WooCommerce edge.
require_once __DIR__ . '/class-gift-card-product-type.php';
require_once __DIR__ . '/class-gift-card-form-view.php';
require_once __DIR__ . '/class-gift-card-purchase.php';
require_once __DIR__ . '/class-gift-card-store-api.php';
require_once __DIR__ . '/class-gift-card-redemption.php';
require_once __DIR__ . '/class-gift-card-order.php';
require_once __DIR__ . '/class-gift-card-emails.php';
require_once __DIR__ . '/class-gift-card-issuer.php';
require_once __DIR__ . '/class-gift-card-catalogue.php';
require_once __DIR__ . '/class-gift-card-feed.php';
require_once __DIR__ . '/class-gift-card-schema.php';
require_once __DIR__ . '/class-gift-card-balance-form.php';
require_once __DIR__ . '/class-gift-card-csv.php';
require_once __DIR__ . '/class-gift-card-checkout-assets.php';

Gift_Card_Tables::register();
Gift_Card_Product_Type::register();
Gift_Card_Purchase::register();
Gift_Card_Redemption::register();
Gift_Card_Order::register();
Gift_Card_Issuer::register();
Gift_Card_Schema::register();
Gift_Card_Balance_Form::register();
Gift_Card_Checkout_Assets::register();

// Admin screens - admin only.
if ( \is_admin() ) {
	require_once __DIR__ . '/class-gift-card-settings-page.php';
	require_once __DIR__ . '/class-gift-card-admin-actions.php';
	require_once __DIR__ . '/class-gift-card-admin-views.php';
	require_once __DIR__ . '/class-gift-card-admin.php';
	Gift_Card_Admin::register();
}

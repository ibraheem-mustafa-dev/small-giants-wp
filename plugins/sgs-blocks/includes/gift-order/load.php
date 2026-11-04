<?php
/**
 * Gift order: bootstrap (Spec 27, FR-30-21).
 *
 * Single require point from sgs-blocks.php. Every class here only registers hooks
 * that fire from inside WooCommerce, or are called by the gift route and block,
 * so loading them when WooCommerce is inactive costs nothing.
 *
 * @package SGS\Blocks\Gift_Order
 */

namespace SGS\Blocks\Gift_Order;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-gift-order-session.php';
require_once __DIR__ . '/class-gift-order-shipping.php';
require_once __DIR__ . '/class-gift-order-rest.php';
require_once __DIR__ . '/class-gift-order-store-api.php';
require_once __DIR__ . '/class-gift-order-order.php';
require_once __DIR__ . '/class-gift-order-emails.php';
require_once __DIR__ . '/class-gift-order-privacy.php';
require_once __DIR__ . '/../commerce-blocks/class-commerce-blocks-assets.php';

Gift_Order_Store_Api::register();
Gift_Order_Order::register();
Gift_Order_Emails::register();
Gift_Order_Privacy::register();

if ( \is_admin() ) {
	require_once __DIR__ . '/class-gift-order-admin.php';
	Gift_Order_Admin::register();
}

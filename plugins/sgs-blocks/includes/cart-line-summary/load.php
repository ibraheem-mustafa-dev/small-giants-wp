<?php
/**
 * Cart line summary — bootstrap.
 *
 * Single require point from class-sgs-blocks.php, beside the add-on price
 * list and the flow fields whose rows this feature replaces.
 *
 * The wording reader and the builder load unconditionally: the builder is a
 * pure function and the wording is a plain option read, so neither needs
 * WooCommerce, and the Store API extension data (includes/cart-item-extensions.php)
 * calls the builder directly.
 *
 * The cart/order/email hooks and the response reshaping load the same way
 * Addon_Price_List_Cart does (see that file's own note): required
 * unconditionally, because every hook they register only ever FIRES from
 * inside WooCommerce's or WordPress's own code, and the WooCommerce types in
 * their signatures are not resolved until a method actually runs.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/wording.php';
require_once __DIR__ . '/functions.php';

// The band-letter parser the summary and the product-page size tiles share.
require_once \dirname( __DIR__ ) . '/buybox-picker-band.php';

require_once __DIR__ . '/class-cart-line-summary-cart.php';
Cart_Line_Summary_Cart::register();

require_once __DIR__ . '/class-cart-line-summary-store-api.php';
Cart_Line_Summary_Store_API::register();

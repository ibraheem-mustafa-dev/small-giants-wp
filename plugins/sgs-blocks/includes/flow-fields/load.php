<?php
/**
 * Flow answers and fields carried to the cart line (Spec 43 FR-43-21).
 * Single require point from class-sgs-blocks.php.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/functions.php';

// The cart/order hooks only ever fire from inside WooCommerce, so loading them
// without WooCommerce active runs nothing (same model as the add-on price list).
require_once __DIR__ . '/class-flow-fields-cart.php';
Flow_Fields_Cart::register();

require_once __DIR__ . '/class-flow-fields-upload.php';
Flow_Fields_Upload::register();

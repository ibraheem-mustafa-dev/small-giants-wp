<?php
/**
 * Buy box "Pick a set" mode: the group resolver, the pick rules, the cart wiring and the product-screen panel.
 * Single require point from class-sgs-blocks.php, after flow-fields/load.php (the pick row is stored as a flow field row).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/class-configurator-groups.php';
require_once __DIR__ . '/class-configurator-picks.php';
require_once __DIR__ . '/class-configurator-picks-admin.php';
require_once __DIR__ . '/term-pack-units.php';

// The cart hooks only ever fire from inside WooCommerce, so loading them without WooCommerce active runs nothing.
Configurator_Picks::register();
Configurator_Picks_Admin::register();

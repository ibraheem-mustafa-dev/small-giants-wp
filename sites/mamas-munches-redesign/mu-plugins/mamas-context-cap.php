<?php
/**
 * Plugin Name: Mama's Munches: larger builder data limit for Lactation Cookies
 * Description: Raises the builder's data limit (sgs_configurator_context_cap_bytes) to 40 KB for product 257 only, so its
 * 30 pack, base and chip combinations publish and render. Every other product keeps the framework's 24 KB default.
 *
 * Copy of what runs on the live shop at wp-content/mu-plugins/mamas-context-cap.php.
 *
 * @package SGS\Sites\MamasMunches
 */

defined( 'ABSPATH' ) || exit;

add_filter(
	'sgs_configurator_context_cap_bytes',
	static function ( $cap, $product_id ) {
		return 257 === (int) $product_id ? 40960 : $cap;
	},
	10,
	2
);

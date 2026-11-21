<?php
// WooCommerce presence for the offline render: WC() non-null and the URL helpers; no basket data (the panel's items are
// drawn by script). No absolute path: the runner's working directory is the plugin folder being rendered.
if ( ! function_exists( 'WC' ) ) {
	function WC() { static $wc = null; if ( null === $wc ) { $wc = new stdClass(); $wc->cart = null; $wc->session = null; } return $wc; }
}
foreach ( array( 'wc_get_cart_url' => '/cart/', 'wc_get_checkout_url' => '/checkout/' ) as $fn => $url ) {
	if ( ! function_exists( $fn ) ) { eval( "function $fn() { return '$url'; }" ); }
}
if ( ! function_exists( 'wc_get_page_permalink' ) ) { function wc_get_page_permalink( $p ) { return '/' . $p . '/'; } }
if ( ! function_exists( 'is_cart' ) ) { function is_cart() { return false; } }
if ( ! function_exists( 'is_checkout' ) ) { function is_checkout() { return false; } }
if ( ! function_exists( 'get_template_directory' ) ) { function get_template_directory() { return dirname( getcwd(), 2 ) . '/theme/sgs-theme'; } }
if ( ! function_exists( 'get_stylesheet_directory' ) ) { function get_stylesheet_directory() { return dirname( getcwd(), 2 ) . '/theme/sgs-theme'; } }
require getcwd() . '/src/blocks/cart/render.php';

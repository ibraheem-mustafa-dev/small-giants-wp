<?php
/**
 * Plugin Name: Mama's jQuery in footer
 * Description: Prints jQuery and jQuery Migrate in the footer on Home, Shop and other pages that only need them for the Tag Manager plugin's ecommerce tracker (gtm4wp-woocommerce, a footer script), so they stop blocking the first paint. Product, basket, checkout and account pages are left alone because payment and WooCommerce scripts print in the head there.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'wp_enqueue_scripts',
	static function (): void {
		if ( is_admin() || ! function_exists( 'is_woocommerce' ) ) {
			return;
		}
		if ( is_product() || is_cart() || is_checkout() || is_account_page() ) {
			return;
		}
		$scripts = wp_scripts();
		foreach ( array( 'jquery', 'jquery-core', 'jquery-migrate' ) as $handle ) {
			if ( isset( $scripts->registered[ $handle ] ) ) {
				$scripts->add_data( $handle, 'group', 1 );
			}
		}
	},
	9999
);

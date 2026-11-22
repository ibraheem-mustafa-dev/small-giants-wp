<?php
/**
 * Puts a scratch copy's basket, checkout and account pages back to WooCommerce's own default content (MERGED S-6).
 *
 * Run only through `scratch-mirror.sh reset-shop-pages <copy>`, which refuses any site that is not a scratch copy it made with its
 * own database, then runs this file with `wp eval-file` (the copy's name as the first argument, for the messages).
 *   - basket and checkout: WooCommerce's default Cart and Checkout block content, as the installed WooCommerce writes it for a new
 *     shop (WC_Install::get_cart_block_content and ::get_checkout_block_content, read through reflection because they are
 *     protected), so the content follows the WooCommerce version the copy runs;
 *   - account: WooCommerce's default account page, its account shortcode in a shortcode block (WC_Install::create_pages).
 * Each page is the one WooCommerce's page option names. Its revision history keeps the content it held. The site build's record of
 * having built the page (`_sgs_site_build_tree`, `_sgs_site_build_content`) is deleted, so the next site build treats it as unbuilt
 * (the account page is then built from its tree) instead of stopping on a page edited after it was built. Each page is read back;
 * any page that cannot be reset stops the run with an error.
 *
 * @package SGS
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'WC_Install' ) ) {
	WP_CLI::error( 'WooCommerce is not active on this copy, so it has no default shop pages to reset to.' );
}

$sgs_copy = isset( $args[0] ) ? (string) $args[0] : 'the copy';

/**
 * WooCommerce's default content for one of its block pages.
 *
 * @param string $method WC_Install's protected content method.
 * @return string
 */
function sgs_reset_wc_default( $method ) {
	if ( ! method_exists( 'WC_Install', $method ) ) {
		WP_CLI::error( "This WooCommerce has no WC_Install::{$method}, so its default page content is unknown." );
	}
	$reflect = new ReflectionMethod( 'WC_Install', $method );
	if ( PHP_VERSION_ID < 80100 ) {
		$reflect->setAccessible( true ); // From PHP 8.1 reflection reaches protected methods without it (and 8.5 deprecates it).
	}
	return (string) $reflect->invoke( null );
}

$sgs_pages = array(
	'woocommerce_cart_page_id'      => array( 'basket', sgs_reset_wc_default( 'get_cart_block_content' ) ),
	'woocommerce_checkout_page_id'  => array( 'checkout', sgs_reset_wc_default( 'get_checkout_block_content' ) ),
	'woocommerce_myaccount_page_id' => array( 'account', '<!-- wp:shortcode -->[' . apply_filters( 'woocommerce_my_account_shortcode_tag', 'woocommerce_my_account' ) . ']<!-- /wp:shortcode -->' ),
);

// The content goes in as written: no HTML filter may strip the blocks' markup.
kses_remove_filters();

foreach ( $sgs_pages as $sgs_option => $sgs_page ) {
	list( $sgs_what, $sgs_content ) = $sgs_page;
	$sgs_id = (int) get_option( $sgs_option );
	$sgs_post = $sgs_id ? get_post( $sgs_id ) : null;
	if ( ! $sgs_post || 'page' !== $sgs_post->post_type ) {
		WP_CLI::error( "{$sgs_copy}: {$sgs_option} names no page ({$sgs_id}), so its {$sgs_what} page cannot be reset." );
	}
	$sgs_result = wp_update_post( wp_slash( array( 'ID' => $sgs_id, 'post_content' => $sgs_content ) ), true );
	if ( is_wp_error( $sgs_result ) ) {
		WP_CLI::error( "{$sgs_copy}: the {$sgs_what} page {$sgs_id} was not saved: " . $sgs_result->get_error_message() );
	}
	delete_post_meta( $sgs_id, '_sgs_site_build_tree' );
	delete_post_meta( $sgs_id, '_sgs_site_build_content' );
	clean_post_cache( $sgs_id );
	if ( get_post_field( 'post_content', $sgs_id, 'raw' ) !== $sgs_content ) {
		WP_CLI::error( "{$sgs_copy}: the {$sgs_what} page {$sgs_id} holds other content than WooCommerce's default after the save." );
	}
	WP_CLI::log( "reset {$sgs_copy}: {$sgs_what} page {$sgs_id} holds WooCommerce's default content" );
}

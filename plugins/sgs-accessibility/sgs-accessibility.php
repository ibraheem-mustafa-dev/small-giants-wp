<?php
/**
 * Plugin Name: SGS Accessibility
 * Plugin URI:  https://smallgiantsstudio.co.uk
 * Description: WCAG 2.1 AA accessibility tools for SGS client sites. Admin checker, block editor hints, and skip navigation.
 * Version:     1.0.0
 * Author:      Small Giants Studio
 * License:     GPL-2.0-or-later
 * Text Domain: sgs-accessibility
 *
 * @package SGS\Accessibility
 */

defined( 'ABSPATH' ) || exit;

define( 'SGS_A11Y_VERSION', '1.0.0' );
define( 'SGS_A11Y_DIR', plugin_dir_path( __FILE__ ) );
define( 'SGS_A11Y_URL', plugin_dir_url( __FILE__ ) );

require_once SGS_A11Y_DIR . 'includes/class-admin-checker.php';
require_once SGS_A11Y_DIR . 'includes/class-frontend.php';

/**
 * Bootstrap all plugin features.
 *
 * @return void
 */
function sgs_a11y_init(): void {
	$admin   = new \SGS\Accessibility\Admin_Checker();
	$frontend = new \SGS\Accessibility\Frontend();

	$admin->register();
	$frontend->register();
}
add_action( 'plugins_loaded', 'sgs_a11y_init' );

/**
 * Register default options on activation.
 *
 * @return void
 */
function sgs_a11y_activate(): void {
	add_option( 'sgs_a11y_skip_nav_enabled', '1' );
	add_option( 'sgs_a11y_skip_nav_target', 'main-content' );
}
register_activation_hook( __FILE__, 'sgs_a11y_activate' );

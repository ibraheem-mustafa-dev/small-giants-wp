<?php
/**
 * Plugin Name: SGS Blocks
 * Plugin URI:  https://smallgiants.studio
 * Description: Custom Gutenberg block library for Small Giants Studio client sites.
 * Version:     0.1.0
 * Author:      Small Giants Studio
 * Author URI:  https://smallgiants.studio
 * Text Domain: sgs-blocks
 * Domain Path: /languages
 * Requires at least: 6.7
 * Requires PHP: 8.0
 * License:     GPL-2.0-or-later
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// Composer autoloader — spatie/color, league/csv, nesbot/carbon.
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
	require_once __DIR__ . '/vendor/autoload.php';
}

define( 'SGS_BLOCKS_VERSION', '0.1.0' );
define( 'SGS_BLOCKS_PATH', plugin_dir_path( __FILE__ ) );
define( 'SGS_BLOCKS_URL', plugin_dir_url( __FILE__ ) );

// Composer autoloader (fallback — theme provides these when SGS theme is active).
if ( file_exists( SGS_BLOCKS_PATH . 'vendor/autoload.php' ) ) {
	require_once SGS_BLOCKS_PATH . 'vendor/autoload.php';
}

// Colour helpers — use theme's version if available, else load own copy.
if ( ! function_exists( 'SGS\Theme\sgs_generate_palette' ) ) {
	require_once SGS_BLOCKS_PATH . 'includes/colour-helpers.php';
}

require_once SGS_BLOCKS_PATH . 'includes/class-sgs-blocks.php';
require_once SGS_BLOCKS_PATH . 'includes/block-categories.php';

// Form processing classes.
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-activator.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-processor.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-upload.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-rest-api.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-admin.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-privacy.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/field-render-helpers.php';

// Schema output filters.
require_once SGS_BLOCKS_PATH . 'includes/review-schema.php';

// Heading anchor injection for Table of Contents.
require_once SGS_BLOCKS_PATH . 'includes/heading-anchors.php';

// Device visibility — server-side class injection for show/hide per device.
require_once SGS_BLOCKS_PATH . 'includes/device-visibility.php';

// Universal hover effects — server-side CSS variable injection.
require_once SGS_BLOCKS_PATH . 'includes/hover-effects.php';

// Animation attributes — server-side data-attribute injection for scroll reveals.
require_once SGS_BLOCKS_PATH . 'includes/animation-attributes.php';

// Custom CSS per block — server-side scoped <style> output.
require_once SGS_BLOCKS_PATH . 'includes/custom-css.php';

// Global block defaults — REST API for save/load per-block defaults.
require_once SGS_BLOCKS_PATH . 'includes/block-defaults.php';

// Google Reviews settings and API integration.
require_once SGS_BLOCKS_PATH . 'includes/google-reviews-settings.php';

// Stripe payment settings and PaymentIntent AJAX handler.
require_once SGS_BLOCKS_PATH . 'includes/stripe-settings.php';
Stripe_Settings::init();

// Mobile nav block patterns (6 presets).
require_once SGS_BLOCKS_PATH . 'includes/mobile-nav-patterns.php';

// Register REST API endpoints.
Forms\Form_REST_API::register();

// Register admin settings page (webhook URL + submissions viewer).
Forms\Form_Admin::register();

// Register GDPR personal data exporters and erasers.
Forms\Form_Privacy::register();

// Activation hook for database setup.
register_activation_hook( __FILE__, [ Forms\Form_Activator::class, 'activate' ] );

// Register mega menu template part area.
add_filter( 'default_wp_template_part_areas', function( $areas ) {
	$areas[] = array(
		'area'        => 'mega-menu',
		'area_tag'    => 'div',
		'label'       => __( 'Mega Menu', 'sgs-blocks' ),
		'description' => __( 'Mega menu dropdown panel content.', 'sgs-blocks' ),
		'icon'        => 'layout',
	);
	return $areas;
} );

SGS_Blocks::instance();

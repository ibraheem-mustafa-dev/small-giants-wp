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

define( 'SGS_BLOCKS_VERSION', '0.1.0' );
define( 'SGS_BLOCKS_PATH', plugin_dir_path( __FILE__ ) );
define( 'SGS_BLOCKS_URL', plugin_dir_url( __FILE__ ) );

require_once SGS_BLOCKS_PATH . 'includes/class-sgs-blocks.php';
require_once SGS_BLOCKS_PATH . 'includes/block-categories.php';

// Form processing classes.
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-activator.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-processor.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-upload.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-rest-api.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/field-render-helpers.php';

// Register REST API endpoints.
Forms\Form_REST_API::register();

// Activation hook for database setup.
register_activation_hook( __FILE__, [ Forms\Form_Activator::class, 'activate' ] );

SGS_Blocks::instance();

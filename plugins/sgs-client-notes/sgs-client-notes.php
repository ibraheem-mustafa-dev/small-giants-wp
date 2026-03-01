<?php
/**
 * Plugin Name: SGS Client Notes
 * Plugin URI: https://smallgiantsstudio.com
 * Description: Visual annotation and feedback system for client communication. Replaces Atarim/ProjectHuddle with a self-hosted solution.
 * Version: 1.0.0
 * Author: Small Giants Studio
 * Author URI: https://smallgiantsstudio.com
 * Text Domain: sgs-client-notes
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package SGS\ClientNotes
 *
 * @since 1.0.0
 */

namespace SGS\ClientNotes;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Plugin constants.
define( 'SGS_CLIENT_NOTES_VERSION', '1.0.0' );
define( 'SGS_CLIENT_NOTES_FILE', __FILE__ );
define( 'SGS_CLIENT_NOTES_PATH', plugin_dir_path( __FILE__ ) );
define( 'SGS_CLIENT_NOTES_URL', plugin_dir_url( __FILE__ ) );
define( 'SGS_CLIENT_NOTES_BASENAME', plugin_basename( __FILE__ ) );

// Autoloader.
spl_autoload_register( function ( $class ) {
	// Only autoload classes in our namespace.
	if ( 0 !== strpos( $class, 'SGS\\ClientNotes\\' ) ) {
		return;
	}

	// Convert namespace to file path.
	$class = str_replace( 'SGS\\ClientNotes\\', '', $class );
	$class = str_replace( '\\', DIRECTORY_SEPARATOR, $class );
	$file  = SGS_CLIENT_NOTES_PATH . 'includes/class-' . strtolower( str_replace( '_', '-', $class ) ) . '.php';

	if ( file_exists( $file ) ) {
		require_once $file;
	}
} );

// Require main plugin class.
require_once SGS_CLIENT_NOTES_PATH . 'includes/class-sgs-client-notes.php';

/**
 * Main plugin instance.
 *
 * @since 1.0.0
 * @return SGS_Client_Notes
 */
function sgs_client_notes() {
	return SGS_Client_Notes::instance();
}

// Initialise the plugin.
sgs_client_notes();

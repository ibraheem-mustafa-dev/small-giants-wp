<?php
/**
 * Prints the CSS sgs/account prints for its form buttons (the sign-in button, and with the all-forms scope the register button and
 * the buttons inside the account content), for the button migration's look probe (button-migration/probe.mjs).
 *
 * Usage: php button-migration-account-css.php <plugin root> '<attributes json>' '<global settings json>' (either JSON may be `@path` of a file)
 * Output: {"css": "..."}.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$root = rtrim( str_replace( '\\', '/', $argv[1] ?? '' ), '/' );
define( 'ABSPATH', $root . '/' );
define( 'SGS_BLOCKS_PATH', ABSPATH );
define( 'SGS_BLOCKS_VERSION', 't' );

require $root . '/scripts/qa/lib/wp-stubs.php';
require $root . '/scripts/qa/lib/tag-processor-stub.php';
require $root . '/includes/render-helpers.php';
require_once $root . '/includes/account/helpers-account-look-css.php';

// An argument starting with `@` names a file that holds the JSON (a shell may not pass quotes through).
$json = static fn( string $arg ): string => '@' === substr( $arg, 0, 1 ) ? (string) file_get_contents( substr( $arg, 1 ) ) : $arg;

$GLOBALS['sgs_qa_global_settings'] = json_decode( $json( $argv[3] ?? '{}' ), true );
$attributes                        = json_decode( $json( $argv[2] ?? '{}' ), true );

echo wp_json_encode( array( 'css' => sgs_account_login_look_css( $attributes, '.acc-X' ) ) );

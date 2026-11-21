<?php
/**
 * Prints one block's attributes after the built-in button migration's rename and reshape (scripts/lib/builtin-button-sweep.php), for
 * the look probe (button-migration/probe.mjs --sweep).
 *
 * Usage: php button-migration-sweep.php <plugin root> <block name> '<attributes json>'
 * Output: the swept attributes as JSON (an empty object when none remain).
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$root = rtrim( str_replace( '\\', '/', $argv[1] ?? '' ), '/' );
define( 'ABSPATH', $root . '/' );
require $root . '/scripts/lib/builtin-button-sweep.php';

$out = sgs_builtin_button_sweep_attrs( (string) ( $argv[2] ?? '' ), (array) json_decode( $argv[3] ?? '{}', true ), sgs_builtin_button_sweep_map( $root . '/scripts/data/builtin-button-renames.json' ) );
echo json_encode( array() === $out ? new stdClass() : $out );

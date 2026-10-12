<?php
/**
 * Prints what the PHP motion field types (includes/motion/class-sgs-motion-field-types.php) return for each case, for
 * tests/js/motion-field-types-parity.test.js to compare with the editor's twin (src/components/motion/field-types.js).
 * Input: a JSON list of cases read from argv[1], each `{ kind: 'css', type, value, field }`,
 * `{ kind: 'token', ref }` or `{ kind: 'range', type, field }`. The class is loaded through
 * includes/helpers-motion-easing.php, the require path every motion include and standalone test uses.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- CLI test fixture, not shipped code.

use SGS\Blocks\Motion\Sgs_Motion_Field_Types;

$sgs_plugin_dir = dirname( __DIR__, 3 );
define( 'ABSPATH', $sgs_plugin_dir . '/' );
require_once $sgs_plugin_dir . '/includes/helpers-motion-easing.php';

$cases = json_decode( (string) file_get_contents( $argv[1] ?? '' ), true );
$out   = array();
foreach ( is_array( $cases ) ? $cases : array() as $case ) {
	switch ( $case['kind'] ?? '' ) {
		case 'token':
			$out[] = array( 'css' => Sgs_Motion_Field_Types::resolve_token( $case['ref'] ?? null ) );
			break;
		case 'range':
			$out[] = Sgs_Motion_Field_Types::range( $case['type'] ?? null, $case['field'] ?? null );
			break;
		default:
			$out[] = Sgs_Motion_Field_Types::css( $case['type'] ?? null, $case['value'] ?? null, $case['field'] ?? null );
	}
}
echo json_encode( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode

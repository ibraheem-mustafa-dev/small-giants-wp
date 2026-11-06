<?php
/**
 * Standalone runner: an intrinsic size under 1px (a 0.2px SVG, a bad cached pair) is rejected, so no consumer divides by zero.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-image-dimensions-guard-standalone.php
 *
 * @package SGS\Blocks
 */

define( 'ABSPATH', __DIR__ );
$GLOBALS['t_cache'] = array();
function get_transient( $k ) {
	return $GLOBALS['t_cache'][ $k ] ?? false;
}
function set_transient( $k, $v ) {
	$GLOBALS['t_cache'][ $k ] = $v;
}
function sgs_image_url_to_path( $url ) {
	return $GLOBALS['t_path'] ?? null;
}
function wp_parse_url( $u, $c = -1 ) {
	return parse_url( $u, $c );
}
const HOUR_IN_SECONDS = 3600;
const DAY_IN_SECONDS  = 86400;
require dirname( __DIR__, 2 ) . '/includes/helpers-image-dimensions.php';

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$dir = sys_get_temp_dir();
$tiny = $dir . '/sgs-tiny-' . getmypid() . '.svg';
$ok   = $dir . '/sgs-ok-' . getmypid() . '.svg';
file_put_contents( $tiny, '<svg xmlns="http://www.w3.org/2000/svg" width="0.2" height="40"></svg>' );
file_put_contents( $ok, '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"></svg>' );

$check( null === sgs_image_svg_size( $tiny ), 'an SVG whose width rounds to 0 has no size' );
$check( array( 120, 40 ) === sgs_image_svg_size( $ok ), 'a normal SVG keeps its size' );
$GLOBALS['t_path'] = $tiny;
$check( null === sgs_image_intrinsic_size( 'https://x.test/a.svg' ), 'a fresh 0-width lookup is rejected' );
$GLOBALS['t_cache']['sgs_imgdim_' . md5( 'https://x.test/b.png' )] = array( 0, 40 );
$check( null === sgs_image_intrinsic_size( 'https://x.test/b.png' ), 'a cached 0-width pair is rejected' );
$GLOBALS['t_cache']['sgs_imgdim_' . md5( 'https://x.test/c.png' )] = array( 300, 150 );
$check( array( 300, 150 ) === sgs_image_intrinsic_size( 'https://x.test/c.png' ), 'a good cached pair is kept' );
unlink( $tiny );
unlink( $ok );
echo "{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );

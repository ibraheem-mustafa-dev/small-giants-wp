<?php
/**
 * Standalone test: the sampled GSAP eases in `Sgs_Motion_Fx_Grammar::gsap_curves()` (`bounce.out`,
 * `elastic.out(1,0.5)`) match GSAP's own functions at every one of their 41 sample points, within 1e-3.
 *
 * The expected values come from the installed GSAP itself (`node_modules/gsap`), computed by running:
 *
 *   node -e "const {gsap}=require('gsap');console.log(JSON.stringify(['bounce.out','elastic.out(1,0.5)'].map(n=>{const f=gsap.parseEase(n);return Array.from({length:41},(_,i)=>f(i/40))})))"
 *
 * from `plugins/sgs-blocks`, so the PHP twin is checked against the runtime that plays the ease, never against a
 * hand copy of its formula. Spot values: elastic.out(1,0.5) at t = 0.025 / 0.1 / 0.2 is 0.2003 / 0.8455 / 1.2023.
 *
 * Usage: php plugins/sgs-blocks/tests/php/run-motion-sampled-ease-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
define( 'SGS_BLOCKS_URL', 'https://example.test/wp-content/plugins/sgs-blocks/' );
define( 'SGS_BLOCKS_VERSION', 'test' );

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';
require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Fx_Grammar as Grammar;

$plugin = dirname( __DIR__, 2 );
$script = "const {gsap}=require('gsap');console.log(JSON.stringify(['bounce.out','elastic.out(1,0.5)'].map(n=>{const f=gsap.parseEase(n);return Array.from({length:41},(_,i)=>f(i/40))})))";
$cwd    = getcwd();
chdir( $plugin );
$raw = shell_exec( 'node -e ' . escapeshellarg( $script ) );
chdir( (string) $cwd );
$gsap = is_string( $raw ) ? json_decode( trim( $raw ), true ) : null;
if ( ! is_array( $gsap ) || 2 !== count( $gsap ) ) {
	echo "FAIL could not run the installed GSAP through node (output: " . var_export( $raw, true ) . ")\n";
	exit( 1 );
}

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$curves = Grammar::gsap_curves();
foreach ( array( 'bounce.out', 'elastic.out(1,0.5)' ) as $index => $ease ) {
	$curve = $curves[ $ease ] ?? '';
	$ok    = preg_match( '/^linear\((.*)\)$/', $curve, $m );
	$check( 1 === $ok, "{$ease} is a linear() curve" );
	$points = array_map( 'floatval', explode( ',', $m[1] ?? '' ) );
	$check( 41 === count( $points ), "{$ease} has 41 sample points (got " . count( $points ) . ')' );
	$worst   = 0.0;
	$worst_t = 0.0;
	foreach ( $gsap[ $index ] as $i => $expected ) {
		$delta = abs( ( $points[ $i ] ?? INF ) - (float) $expected );
		if ( $delta > $worst ) {
			$worst   = $delta;
			$worst_t = $i / 40;
		}
	}
	$check( $worst <= 1e-3, sprintf( '%s matches GSAP within 1e-3 at every sample (worst %.4f at t = %.3f)', $ease, $worst, $worst_t ) );
}

echo "RESULT {$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );

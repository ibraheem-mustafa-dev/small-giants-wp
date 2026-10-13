<?php
/**
 * The PHP side of the motion refusal-evaluator parity test (Spec 38A §10, FR-38A-23).
 *
 * Runs the shipped `Sgs_Motion_Layers::motion_refusals()` over every shared fixture in `tests/fixtures/motion/`
 * (the files the cloning tool's `scripts/computed-route/tests/motion-schema.test.mjs` reads).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-refusal-parity.php          checks each fixture's expected texts
 *   php plugins/sgs-blocks/tests/php/run-motion-refusal-parity.php --json   prints { file: refusals } for the JS side
 *
 * `scripts/computed-route/tests/motion-refusal-parity.test.mjs` runs the `--json` mode and compares it, fixture by
 * fixture, with the JS evaluator (`scripts/computed-route/lib/motion-refusals.mjs::motionRefusals`).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Layers;
use SGS\Blocks\Motion\Sgs_Motion_Schema_Eval;

$dir   = dirname( __DIR__ ) . '/fixtures/motion';
$files = glob( $dir . '/*.json' );
sort( $files, SORT_STRING );
$out = array();
foreach ( $files as $file ) {
	$fixture = json_decode( (string) file_get_contents( $file ), true );
	if ( ! is_array( $fixture ) || ! isset( $fixture['motion'] ) ) {
		continue;
	}
	$doc                      = Sgs_Motion_Schema_Eval::normalise( $fixture['motion'] );
	$out[ basename( $file ) ] = array(
		'expect'   => $fixture['expect']['refusals'] ?? null,
		'refusals' => is_array( $doc ) ? Sgs_Motion_Layers::motion_refusals( $doc ) : array(),
	);
}

if ( in_array( '--json', $argv, true ) ) {
	$json = array();
	foreach ( $out as $name => $row ) {
		$json[ $name ] = $row['refusals'];
	}
	echo json_encode( $json, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ), "\n";
	exit( 0 );
}

$pass = 0;
$fail = 0;
foreach ( $out as $name => $row ) {
	if ( ! preg_match( '/^(valid|refusal)-/', $name ) ) {
		continue;
	}
	$texts = array_column( $row['refusals'], 'text' );
	if ( $texts === $row['expect'] ) {
		++$pass;
		echo "PASS  $name\n";
	} else {
		++$fail;
		echo "FAIL  $name: got " . json_encode( $texts ) . ' expected ' . json_encode( $row['expect'] ) . "\n";
	}
}
echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

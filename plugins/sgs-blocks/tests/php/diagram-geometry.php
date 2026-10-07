<?php
/**
 * Measured diagram geometry: the PHP twin reproduces every shared fixture.
 *
 * Reads the same fixtures as tests/js/diagram-geometry.test.js, so the page
 * and the editor canvas draw identical lines.
 *
 * Run with: php tests/php/diagram-geometry.php
 *
 * @package SGS\Blocks\Tests
 */

define( 'ABSPATH', __DIR__ . '/' );
require_once __DIR__ . '/../../includes/helpers-diagram-geometry.php';

$cases  = json_decode( (string) file_get_contents( __DIR__ . '/../fixtures/diagram-geometry-fixtures.json' ), true );
$failed = 0;

foreach ( $cases as $case ) {
	$actual   = json_encode( sgs_diagram_dimension_paths( $case['dim'], (float) $case['width'], (float) $case['height'] ) );
	$expected = json_encode( $case['expected'] );
	if ( $actual !== $expected ) {
		++$failed;
		echo 'FAIL ' . $case['name'] . "\n  expected " . $expected . "\n  actual   " . $actual . "\n";
	}
}

// Negative control: a moved start point must change the output.
$moved_dim           = $cases[0]['dim'];
$moved_dim['startX'] = 10;
if ( json_encode( sgs_diagram_dimension_paths( $moved_dim, (float) $cases[0]['width'], (float) $cases[0]['height'] ) ) === json_encode( $cases[0]['expected'] ) ) {
	++$failed;
	echo "FAIL negative control: a moved start point produced the same paths\n";
}

echo 'diagram-geometry (php): ' . ( count( $cases ) - $failed ) . ' of ' . count( $cases ) . " fixtures match\n";
exit( $failed ? 1 : 0 );

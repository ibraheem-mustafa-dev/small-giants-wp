<?php
/**
 * Standalone test: `Sgs_Motion_Stagger` reproduces `src/components/motion/stagger-delays.js` (Spec 38A FR-38A-24).
 *
 * Every case in tests/fixtures/motion/stagger-parity-cases.json carries the delays the JS function produced; the PHP
 * mirror must return the same array. The JS side of the same check is tests/js/motion-stagger-parity.test.js. Also
 * covers `columns_for_block()` against the generated block-to-attribute map.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-motion-stagger-parity-standalone.php
 * Optional first argument: a fixture path to use instead of the committed one (used to plant a fault).
 * Exit 0 all pass, 1 any failure.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ . '/' );

$plugin = dirname( __DIR__, 2 );
require $plugin . '/includes/motion/class-sgs-motion-stagger.php';

use SGS\Blocks\Motion\Sgs_Motion_Stagger;

$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label, string $detail = '' ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}" . ( '' !== $detail ? "  => {$detail}" : '' ) . "\n";
	}
}

$path    = $argv[1] ?? $plugin . '/tests/fixtures/motion/stagger-parity-cases.json';
$fixture = json_decode( (string) file_get_contents( $path ), true );
ok( is_array( $fixture ) && ! empty( $fixture['cases'] ), 'fixture loads: ' . basename( $path ) );

foreach ( $fixture['cases'] ?? array() as $case ) {
	if ( 'close' === ( $case['kind'] ?? '' ) ) {
		$actual = isset( $case['direction'] )
			? Sgs_Motion_Stagger::compute_close_delays( $case['delays'], $case['direction'] )
			: Sgs_Motion_Stagger::compute_close_delays( $case['delays'] );
	} else {
		$actual = Sgs_Motion_Stagger::compute_delays( $case['settings'] );
	}
	ok( $actual === $case['expected'], $case['name'], 'expected ' . wp_json_encode_stub( $case['expected'] ) . ' got ' . wp_json_encode_stub( $actual ) );
}

function wp_json_encode_stub( $v ): string {
	return (string) json_encode( $v );
}

// columns_for_block: the attribute name comes from the generated map; the value is read at the device.
$tiers = array( 'columns' => array( 'desktop' => 4, 'tablet' => 3, 'mobile' => 1 ) );
ok( 4 === Sgs_Motion_Stagger::columns_for_block( 'sgs/container', $tiers, 'desktop' ), 'columns_for_block: desktop tier' );
ok( 3 === Sgs_Motion_Stagger::columns_for_block( 'sgs/container', $tiers, 'tablet' ), 'columns_for_block: tablet tier' );
ok( 1 === Sgs_Motion_Stagger::columns_for_block( 'sgs/container', $tiers, 'mobile' ), 'columns_for_block: mobile tier' );
$partial = array( 'columns' => array( 'desktop' => 5 ) );
ok( 5 === Sgs_Motion_Stagger::columns_for_block( 'sgs/card-grid', $partial, 'mobile' ), 'columns_for_block: mobile inherits tablet inherits desktop' );
ok( 2 === Sgs_Motion_Stagger::columns_for_block( 'sgs/gallery', array( 'columns' => 2 ), 'tablet' ), 'columns_for_block: a plain number is used as it stands' );
ok( 3 === Sgs_Motion_Stagger::columns_for_block( 'sgs/nav-drawer-menu', array( 'listColumns' => array( 'desktop' => 3 ) ), 'desktop' ), 'columns_for_block: a block whose attribute is not named columns' );
ok( 1 === Sgs_Motion_Stagger::columns_for_block( 'sgs/container', array(), 'desktop' ), 'columns_for_block: attribute absent gives 1' );
ok( 1 === Sgs_Motion_Stagger::columns_for_block( 'sgs/heading', array( 'columns' => 4 ), 'desktop' ), 'columns_for_block: a block with no grid-columns attribute gives 1' );
ok( 1 === Sgs_Motion_Stagger::columns_for_block( 'sgs/container', $tiers, 'watch' ), 'columns_for_block: unknown device gives 1' );
ok( 1 === Sgs_Motion_Stagger::columns_for_block( 'sgs/container', array( 'columns' => 'wide' ), 'desktop' ), 'columns_for_block: unusable value gives 1' );

echo "\n{$passes} passed, {$failures} failed\n";
exit( $failures > 0 ? 1 : 0 );

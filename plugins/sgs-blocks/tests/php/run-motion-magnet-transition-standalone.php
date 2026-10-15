<?php
/**
 * Standalone test: a magnet hover-effect layer leaves its owner properties' timing to its runtime (Spec 38A, FR-38A-40).
 *
 * `src/shared/effects/magnet.js` writes `--sgs-mag-dur` (0ms while the pointer tracks, the return duration on release)
 * and `--sgs-mag-ease`, and `assets/css/fx-magnet.css` transitions `--sgs-mag-x` / `--sgs-mag-y` on them. The scoped
 * `.sgs-m-<hash>` rule the emitter writes is injected later at the same specificity, so a fixed
 * `--sgs-mag-x 250ms <ease> 0ms` entry there would win and the element would trail the pointer by the return duration.
 * The schema marks the magnet `runtimeTiming` (the custom properties its runtime writes), and the emitter's transition
 * entries for its owner properties read those properties instead of a fixed duration, so a stack with a hover state
 * (one `transition` list on the element) keeps the magnet's runtime timing too.
 *
 * Runs the REAL `Sgs_Motion_Emitter::emit()` against the real `schemas/motion.schema.json`. The negative control is a
 * stack's hover-state entries, which keep their fixed timing.
 *
 * Usage: php plugins/sgs-blocks/tests/php/run-motion-magnet-transition-standalone.php
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

/** The theme's `settings.custom`, as WordPress merges it (the real theme.json; no client snapshot here). */
function wp_get_global_settings( $path = array() ) {
	$theme  = json_decode( (string) file_get_contents( dirname( __DIR__, 4 ) . '/theme/sgs-theme/theme.json' ), true );
	$custom = $theme['settings']['custom'] ?? array();
	return array( 'custom' ) === $path ? $custom : array( 'custom' => $custom );
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';
require_once __DIR__ . '/stubs/motion-render-stubs.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-global-settings.php';

use SGS\Blocks\Motion\Sgs_Motion_Emitter as Emitter;

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

/** Every transition entry naming a magnet owner property, across all tiers' rules. */
$magnet_entries = static function ( string $css ): array {
	preg_match_all( '/transition:\s*([^;}]*)/', $css, $m );
	$out = array();
	foreach ( $m[1] as $list ) {
		foreach ( preg_split( '/,\s*(?=--|[a-z-]+\s)/', $list ) as $entry ) {
			if ( preg_match( '/^\s*--sgs-mag-[xy]\b/', $entry ) ) {
				$out[] = trim( $entry );
			}
		}
	}
	return $out;
};

$magnet = array(
	'id'      => 'mag1',
	'effect'  => 'magnet',
	'trigger' => 'hover',
	'values'  => array(
		'engage'         => 'over',
		'maxPullX'       => 10,
		'returnDuration' => 250,
		'returnEasing'   => 'cubic-bezier(.16,.84,.32,1)',
	),
	'devices' => array( 'mobile' => array( 'returnDuration' => 400 ) ),
);

$alone   = Emitter::emit( array( 'hover' => array( 'effects' => array( $magnet ) ) ), '.sgs-m-test', array() );
$entries = $magnet_entries( $alone['css'] );
$fixed   = array_values( array_filter( $entries, static fn( $e ) => ! str_contains( $e, 'var(--sgs-mag-dur' ) ) );
$check( array() === $fixed, 'a magnet layer emits no fixed-duration transition entry for --sgs-mag-x/y (fixed: ' . implode( ' | ', $fixed ) . ')' );

$stack   = Emitter::emit(
	array(
		'hover' => array(
			'state'   => array( 'values' => array( 'scale' => 1.04 ) ),
			'effects' => array( $magnet ),
		),
	),
	'.sgs-m-test',
	array()
);
$entries = $magnet_entries( $stack['css'] );
$fixed   = array_values( array_filter( $entries, static fn( $e ) => ! str_contains( $e, 'var(--sgs-mag-dur' ) ) );
$check( array() === $fixed, 'stacked with a hover state, the magnet entries carry no fixed duration (fixed: ' . implode( ' | ', $fixed ) . ')' );
$check(
	in_array( '--sgs-mag-x var(--sgs-mag-dur, 0ms) var(--sgs-mag-ease, cubic-bezier(.16,.84,.32,1)) 0ms', $entries, true ),
	'stacked with a hover state, --sgs-mag-x stays in the one transition list on the runtime timing (got: ' . implode( ' | ', $entries ) . ')'
);
$check( str_contains( $stack['css'], '--sgs-mh-s var(--wp--custom--duration--fast)' ), 'negative control: the hover state scale entry keeps its own fixed duration' );
$check( ! str_contains( $alone['css'], '@media' ), 'a per-device return duration writes no per-device transition list (the runtime reads it from the data attribute)' );

echo "RESULT {$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );

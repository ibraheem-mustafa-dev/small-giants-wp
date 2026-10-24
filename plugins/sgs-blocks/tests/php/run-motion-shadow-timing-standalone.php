<?php
/**
 * Standalone test: the hover state's shadow can run on its own duration and easing (Track R r3-trans, item 2).
 *
 * `paintDuration` and `paintEasing` time colour, background, border colour and shadow together; `shadowDuration` and
 * `shadowEasing` time only `box-shadow`, each falling back to the colour half it replaces, so a draft whose shadow runs
 * 0.25s beside 0.2s colours is expressible. Runs the REAL `Sgs_Motion_Emitter::emit()` against the real schema; the
 * negative controls are a state with no shadow field (the shadow shares the colour timing) and no paint fields at all
 * (the client's `transition.fast`).
 *
 * Usage: php plugins/sgs-blocks/tests/php/run-motion-shadow-timing-standalone.php
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

/** The property of each entry of the first `transition:` list in a CSS string. */
$properties = static function ( string $css ): array {
	if ( ! preg_match( '/transition:\s*([^;}]*)/', $css, $m ) ) {
		return array();
	}
	$out = array();
	foreach ( preg_split( '/,\s*(?=--|[a-z-]+\s)/', $m[1] ) as $entry ) {
		$out[] = strtok( trim( $entry ), ' ' );
	}
	return $out;
};

$entry = static function ( string $css, string $prop ): string {
	preg_match( '/transition:\s*([^;}]*)/', $css, $m );
	foreach ( preg_split( '/,\s*(?=--|[a-z-]+\s)/', $m[1] ?? '' ) as $e ) {
		if ( 0 === strpos( trim( $e ), $prop . ' ' ) ) {
			return trim( $e );
		}
	}
	return '';
};
$run = static fn( array $values ): string => Emitter::emit( array( 'hover' => array( 'state' => array( 'values' => $values ) ) ), '.sgs-m-test', array() )['css'];

$both = $run( array( 'scale' => 1.04, 'paintDuration' => 200, 'shadowDuration' => 250 ) );
$check( str_contains( $entry( $both, 'box-shadow' ), '250ms' ), 'shadowDuration times box-shadow alone (got: ' . $entry( $both, 'box-shadow' ) . ')' );
$check( str_contains( $entry( $both, 'color' ), '200ms' ) && str_contains( $entry( $both, 'background-color' ), '200ms' ) && str_contains( $entry( $both, 'border-color' ), '200ms' ), 'colour, background and border stay on paintDuration' );

$ease = $run( array( 'scale' => 1.04, 'paintEasing' => 'linear', 'shadowEasing' => 'ease-in' ) );
$check( str_contains( $entry( $ease, 'box-shadow' ), 'ease-in' ) && str_contains( $entry( $ease, 'color' ), 'linear' ), 'shadowEasing times the shadow easing alone' );

$only = $run( array( 'scale' => 1.04, 'shadowDuration' => 250 ) );
$check( str_contains( $entry( $only, 'box-shadow' ), '250ms' ) && ! str_contains( $entry( $only, 'color' ), '250ms' ), 'a shadow duration with no paint fields leaves the colours on the client default (' . $entry( $only, 'color' ) . ')' );

$none = $run( array( 'scale' => 1.04 ) );
$check( $entry( $none, 'box-shadow' ) === str_replace( 'color ', 'box-shadow ', $entry( $none, 'color' ) ), 'negative control: no shadow field, the shadow shares the colour timing (' . $entry( $none, 'box-shadow' ) . ')' );

$shared = $run( array( 'scale' => 1.04, 'paintDuration' => 300 ) );
$check( str_contains( $entry( $shared, 'box-shadow' ), '300ms' ), 'negative control: paintDuration alone still times the shadow with the colours' );

echo "RESULT {$pass} passed, {$fail} failed
";
exit( $fail > 0 ? 1 : 0 );

<?php
/**
 * Standalone runner: a horizontal-panel layer's per-device parameters reach distinct device-tiered declarations
 * (Spec 38A FR-38A-38, FR-38A-39).
 *
 * `Sgs_Motion_Effect_Properties::css` writes each value field that names its own `x-sgs-field.cssProperty`: the layer's
 * `values` in the base rule, its `devices.tablet` and `devices.mobile` overrides inside the tablet and mobile media
 * queries. The runtime (`src/shared/effects/gsap/horizontal-panel-params.js`) reads the computed property first, so a
 * value set per device takes effect at that tier. Asserts:
 * - hold, smoothing, pin length and tail each write their own property at desktop, tablet and mobile, with that
 *   tier's value (a pin length in the `+=N%` form its attribute takes, a smoothing in milliseconds);
 * - the four proximity-focus inputs write their own input properties per tier, and never the outputs
 *   `--sgs-focus-s` / `--sgs-focus-op` the runtime writes on each panel;
 * - the data attributes still carry the desktop values (the attribute is the fallback when no property is set).
 * Negative controls: the tier parser finds nothing for a property the layer does not set, and a layer with no device
 * overrides writes no media query. Exits 1 on any failure.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-horizontal-panel-per-device-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Effect_Properties;
use SGS\Blocks\Motion\Sgs_Motion_Fx_Emitter;

const HP_SEL = '.sgs-m-hp';

$GLOBALS['hp_fail']  = 0;
$GLOBALS['hp_count'] = 0;

/**
 * Record one check.
 *
 * @param bool   $ok    Whether it held.
 * @param string $label What was checked.
 * @return void
 */
function hp_check( bool $ok, string $label ): void {
	++$GLOBALS['hp_count'];
	$GLOBALS['hp_fail'] += $ok ? 0 : 1;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
}

/**
 * The declarations of one tier in the scoped CSS: desktop is the bare rule, tablet and mobile the rules inside their
 * media queries.
 *
 * @param string $css  Scoped CSS from `Sgs_Motion_Effect_Properties::css`.
 * @param string $tier desktop, tablet or mobile.
 * @return array<string,string> Property => value.
 */
function hp_tier( string $css, string $tier ): array {
	$sel   = preg_quote( HP_SEL, '/' );
	$media = array(
		'tablet' => '@media (max-width:1023px){',
		'mobile' => '@media (max-width:767px){',
	);
	if ( 'desktop' === $tier ) {
		$body = preg_match( '/^' . $sel . '\{([^}]*)\}/', $css, $m ) ? $m[1] : '';
	} else {
		$at   = strpos( $css, $media[ $tier ] );
		$body = false !== $at && preg_match( '/\G' . $sel . '\{([^}]*)\}/', $css, $m, 0, $at + strlen( $media[ $tier ] ) ) ? $m[1] : '';
	}
	$out = array();
	foreach ( array_filter( explode( ';', $body ), 'strlen' ) as $decl ) {
		$pair = explode( ':', $decl, 2 );
		if ( 2 === count( $pair ) ) {
			$out[ $pair[0] ] = $pair[1];
		}
	}
	return $out;
}

$layer = array(
	'id'      => 'horizontal-panel',
	'effect'  => 'horizontal-panel',
	'values'  => array(
		'smoothing'      => 0,
		'hold'           => 0,
		'pinLength'      => '70vh',
		'pinTail'        => '40vh',
		'proximityFocus' => true,
		'focusScale'     => 1,
		'edgeScale'      => 0.94,
		'focusOpacity'   => 1,
		'edgeOpacity'    => 0.55,
	),
	'devices' => array(
		'tablet' => array(
			'smoothing'    => 300,
			'hold'         => 0.2,
			'pinLength'    => '60vh',
			'pinTail'      => '30vh',
			'focusScale'   => 0.98,
			'edgeScale'    => 0.9,
			'focusOpacity' => 0.95,
			'edgeOpacity'  => 0.5,
		),
		'mobile' => array(
			'smoothing'    => 500,
			'hold'         => 0.1,
			'pinLength'    => '50vh',
			'pinTail'      => '20vh',
			'focusScale'   => 0.97,
			'edgeScale'    => 0.85,
			'focusOpacity' => 0.9,
			'edgeOpacity'  => 0.4,
		),
	),
);

$element = array( 'effects' => array( $layer ) );
$css     = Sgs_Motion_Effect_Properties::css( $element, HP_SEL );

$expected = array(
	'desktop' => array(
		'--sgs-horizontal-panel-smoothing'     => '0ms',
		'--sgs-horizontal-panel-hold'          => '0',
		'--sgs-horizontal-panel-pin-length'    => '+=70%',
		'--sgs-horizontal-panel-pin-tail'      => '40vh',
		'--sgs-horizontal-panel-focus-scale'   => '1',
		'--sgs-horizontal-panel-edge-scale'    => '0.94',
		'--sgs-horizontal-panel-focus-opacity' => '1',
		'--sgs-horizontal-panel-edge-opacity'  => '0.55',
	),
	'tablet'  => array(
		'--sgs-horizontal-panel-smoothing'     => '300ms',
		'--sgs-horizontal-panel-hold'          => '0.2',
		'--sgs-horizontal-panel-pin-length'    => '+=60%',
		'--sgs-horizontal-panel-pin-tail'      => '30vh',
		'--sgs-horizontal-panel-focus-scale'   => '0.98',
		'--sgs-horizontal-panel-edge-scale'    => '0.9',
		'--sgs-horizontal-panel-focus-opacity' => '0.95',
		'--sgs-horizontal-panel-edge-opacity'  => '0.5',
	),
	'mobile'  => array(
		'--sgs-horizontal-panel-smoothing'     => '500ms',
		'--sgs-horizontal-panel-hold'          => '0.1',
		'--sgs-horizontal-panel-pin-length'    => '+=50%',
		'--sgs-horizontal-panel-pin-tail'      => '20vh',
		'--sgs-horizontal-panel-focus-scale'   => '0.97',
		'--sgs-horizontal-panel-edge-scale'    => '0.85',
		'--sgs-horizontal-panel-focus-opacity' => '0.9',
		'--sgs-horizontal-panel-edge-opacity'  => '0.4',
	),
);

// 1. Each parameter writes its own property at each tier, with that tier's value.
foreach ( $expected as $tier => $decls ) {
	$got = hp_tier( $css, $tier );
	foreach ( $decls as $prop => $value ) {
		hp_check( ( $got[ $prop ] ?? null ) === $value, "$tier writes $prop:$value (got " . json_encode( $got[ $prop ] ?? null ) . ')' );
	}
}

// 2. The four parameters land on four distinct properties at every tier.
$hp_props = array( '--sgs-horizontal-panel-smoothing', '--sgs-horizontal-panel-hold', '--sgs-horizontal-panel-pin-length', '--sgs-horizontal-panel-pin-tail' );
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
	$got = hp_tier( $css, $tier );
	hp_check( 4 === count( array_unique( array_map( static fn( $p ) => $p . '=' . ( $got[ $p ] ?? '' ), $hp_props ) ) ) && 4 === count( array_intersect_key( $got, array_flip( $hp_props ) ) ), "$tier holds hold, smoothing, pin length and tail as four separate declarations" );
}

// 3. The focus inputs never write the outputs the runtime owns.
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
	$got = hp_tier( $css, $tier );
	hp_check( ! isset( $got['--sgs-focus-s'] ) && ! isset( $got['--sgs-focus-op'] ), "$tier writes no --sgs-focus-s or --sgs-focus-op (the runtime's outputs)" );
}

// 4. The data attributes keep the desktop values as the fallback.
$attrs = Sgs_Motion_Fx_Emitter::attrs( $element, 'sgs/timeline', 'root' );
hp_check( '+=70%' === ( $attrs['data-sgs-fx-end'] ?? null ), 'data-sgs-fx-end keeps the desktop pin length: ' . json_encode( $attrs['data-sgs-fx-end'] ?? null ) );
hp_check( '40vh' === ( $attrs['data-sgs-fx-horizontal-panel-pin-tail'] ?? null ), 'the pin-tail attribute keeps the desktop tail: ' . json_encode( $attrs['data-sgs-fx-horizontal-panel-pin-tail'] ?? null ) );
hp_check( '0.94' === ( $attrs['data-sgs-fx-horizontal-panel-edge-scale'] ?? null ), 'the edge-scale attribute keeps the desktop value: ' . json_encode( $attrs['data-sgs-fx-horizontal-panel-edge-scale'] ?? null ) );

// 5. The legacy intensity presets land on the new fields: Standard is the reference Heritage track (70vh per panel,
// no smoothing, no hold) and the three levels rise in pin length per panel.
if ( ! class_exists( '\SGS\Blocks\Motion\Sgs_Motion_Map_Fx' ) ) {
	require_once dirname( __DIR__, 2 ) . '/includes/motion/migrate/mappers/class-sgs-motion-map-fx.php';
}
$mapper = new \SGS\Blocks\Motion\Sgs_Motion_Map_Fx();
$levels = array();
foreach ( array( 'subtle', 'standard', 'dramatic' ) as $level ) {
	$mapped           = $mapper->map( 'sgs/timeline', array( 'fx' => 'horizontal-panel', 'fxPreset' => $level ) );
	$levels[ $level ] = $mapped['motion']['elements']['root']['effects'][0]['values'] ?? null;
}
$standard = $levels['standard'] ?? array();
hp_check( '70vh' === ( $standard['pinLength'] ?? null ) && 0 === ( $standard['smoothing'] ?? null ) && empty( $standard['hold'] ), 'the Standard preset migrates to 70vh per panel, smoothing 0 and no hold: ' . json_encode( $standard ) );
$per_panel = array_map( static fn( $v ) => is_array( $v ) ? (float) ( $v['pinLength'] ?? 0 ) : 0.0, $levels );
hp_check( $per_panel['subtle'] > 0 && $per_panel['subtle'] < $per_panel['standard'] && $per_panel['standard'] < $per_panel['dramatic'], 'the presets rise in pin length per panel: ' . json_encode( $per_panel ) );
$bold = Sgs_Motion_Effect_Properties::css( array( 'effects' => array( array( 'id' => 'hp', 'effect' => 'horizontal-panel', 'values' => $levels['dramatic'] ?? array() ) ) ), HP_SEL );
hp_check( '+=100%' === ( hp_tier( $bold, 'desktop' )['--sgs-horizontal-panel-pin-length'] ?? null ), 'the migrated Bold preset writes its pin length per panel as a property: ' . $bold );

// Negative controls.
hp_check( array() === hp_tier( '', 'tablet' ), 'negative control: the tier parser finds nothing in empty CSS' );
hp_check( ! isset( hp_tier( $css, 'tablet' )['--sgs-horizontal-panel-breakpoint'] ), 'negative control: a property the layer does not own is absent' );
$flat = Sgs_Motion_Effect_Properties::css( array( 'effects' => array( array_diff_key( $layer, array( 'devices' => 1 ) ) ) ), HP_SEL );
hp_check( false === strpos( $flat, '@media' ), 'negative control: a layer with no device overrides writes no media query: ' . $flat );

echo "\n" . ( $GLOBALS['hp_fail'] ? 'FAILED' : 'OK' ) . ': ' . ( $GLOBALS['hp_count'] - $GLOBALS['hp_fail'] ) . ' of ' . $GLOBALS['hp_count'] . " checks\n";
exit( $GLOBALS['hp_fail'] ? 1 : 0 );

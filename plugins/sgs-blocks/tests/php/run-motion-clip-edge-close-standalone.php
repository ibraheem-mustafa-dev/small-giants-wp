<?php
/**
 * Standalone runner: a one-edge clip wipe on the `open` trigger closes only its own edge (Spec 38A §10 clip-path row).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-clip-edge-close-standalone.php
 *
 * The close values of an `open` entrance are written by `Sgs_Motion_Trigger_Open_State::close_rules`. A close clip amount
 * is one uniform number (`EntranceCloseTo.clip`); when the entrance insets a single edge, `Sgs_Motion_Clip_Edge::close`
 * replaces the uniform holder `--sgs-me-close-to-clip` with the four edge holders `--sgs-me-close-to-clip-<t|r|b|l>`
 * (the amount on the entrance's edge, 0% on the others), so `assets/css/motion-triggers.css` closes only that edge.
 * Runs the shipped trigger filter with the stand-ins in `stubs/motion-render-stubs.php` and asserts:
 * - a bottom wipe (from clipEdge bottom) with close clip 100 writes 0% 0% 100% 0% on the close edge holders and no
 *   uniform holder;
 * - the edge comes from the to-value when the from-value names none;
 * - regression: a uniform entrance (no clipEdge, and clipEdge all written out) keeps the single uniform close holder;
 * - a one-edge wipe with no close clip amount writes no close clip holder (the stylesheet falls back to the from edges);
 * - per device: a Mobile single edge under a Desktop uniform entrance gives Desktop four equal close holders and
 *   Mobile the amount on its edge only; a Tablet close amount under a Desktop single edge keeps the Desktop edge.
 * Negative controls: the one-edge judge runs on real uniform output and must come out red. Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Trigger_Open_State;

const SEL = '.sgs-m-test';

$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};

/** The trigger rules of an `open` entrance base layer. */
$close_css = static function ( array $from, array $to, array $close, array $devices = array() ): string {
	$base = array(
		'trigger' => 'open',
		'values'  => array(
			'from' => $from,
			'to'   => $to,
		),
		'close'   => $close,
		'devices' => $devices,
	);
	return (string) Sgs_Motion_Trigger_Open_State::css( '', $base, SEL, array( 'data-sgs-me' => 'open clip-path' ) );
};

/** The declarations of the base rule (tier desktop) or a media tier, as prop => value. */
$tier_decls = static function ( string $css, string $tier ): array {
	$px = array( 'tablet' => '1023', 'mobile' => '767' );
	if ( 'desktop' === $tier ) {
		$css  = preg_replace( '/@media \([^)]*\)\{[^{}]*\{[^{}]*\}\}/', '', $css );
		$body = preg_match( '/' . preg_quote( SEL, '/' ) . '\{([^{}]*)\}/', $css, $m ) ? $m[1] : '';
	} else {
		$body = preg_match( '/@media \(max-width:' . $px[ $tier ] . 'px\)\{' . preg_quote( SEL, '/' ) . '\{([^{}]*)\}\}/', $css, $m ) ? $m[1] : '';
	}
	$out = array();
	foreach ( array_filter( explode( ';', $body ), 'strlen' ) as $decl ) {
		$at = strpos( $decl, ':' );
		$out[ substr( $decl, 0, $at ) ] = substr( $decl, $at + 1 );
	}
	return $out;
};

/** The inset() the four close edge holders compose, or null when any is missing. */
$inset = static function ( array $decls ): ?string {
	$parts = array();
	foreach ( array( 't', 'r', 'b', 'l' ) as $e ) {
		if ( ! isset( $decls[ "--sgs-me-close-to-clip-$e" ] ) ) {
			return null;
		}
		$parts[] = $decls[ "--sgs-me-close-to-clip-$e" ];
	}
	return 'inset(' . implode( ' ', $parts ) . ')';
};

/** The one-edge judge: the close edge holders compose `$want` and the uniform holder is gone. */
$judge_edge = static function ( string $css, string $tier, string $want ) use ( $tier_decls, $inset ): bool {
	$d = $tier_decls( $css, $tier );
	return $want === $inset( $d ) && ! isset( $d['--sgs-me-close-to-clip'] );
};

// 1. A bottom wipe closing fully: the bottom edge only, no uniform holder.
$wipe = $close_css( array( 'clip' => 100, 'clipEdge' => 'bottom' ), array( 'clip' => 0 ), array( 'to' => array( 'clip' => 100 ) ) );
$check( $judge_edge( $wipe, 'desktop', 'inset(0% 0% 100% 0%)' ), 'a bottom wipe closes on the bottom edge only (0% 0% 100% 0%), no uniform holder: ' . $wipe );
$check( false === strpos( $wipe, '--sgs-me-close-to-clip:' ), 'the uniform close holder is not written anywhere: ' . $wipe );

// 2. The edge from the to-value when the from-value names none.
$to_edge = $close_css( array( 'clip' => 0 ), array( 'clip' => 0, 'clipEdge' => 'top' ), array( 'to' => array( 'clip' => 40 ) ) );
$check( $judge_edge( $to_edge, 'desktop', 'inset(40% 0% 0% 0%)' ), 'the to-value edge governs when the from-value names none: ' . $to_edge );

// 3. Regression: a uniform entrance keeps the uniform close holder.
foreach ( array( array(), array( 'clipEdge' => 'all', 'clipFromAnchor' => 'none' ) ) as $all ) {
	$uniform = $close_css( array( 'clip' => 100 ) + $all, array( 'clip' => 0 ) + $all, array( 'to' => array( 'clip' => 100 ) ) );
	$d       = $tier_decls( $uniform, 'desktop' );
	$check( '100%' === ( $d['--sgs-me-close-to-clip'] ?? null ) && null === $inset( $d ) && false === strpos( $uniform, '--sgs-me-close-to-clip-' ), 'a uniform entrance' . ( $all ? ' (clipEdge all written out)' : '' ) . ' keeps the single uniform close holder: ' . $uniform );
}

// 4. A one-edge wipe with no close clip amount writes no close clip holder.
$no_close = $close_css( array( 'clip' => 100, 'clipEdge' => 'bottom' ), array( 'clip' => 0 ), array( 'to' => array( 'opacity' => 0 ) ) );
$check( false === strpos( $no_close, 'close-to-clip' ) && false !== strpos( $no_close, '--sgs-me-close-to-op:0' ), 'no close clip amount writes no close clip holder: ' . $no_close );

// 5. Per device.
$mobile_edge = $close_css(
	array( 'clip' => 50 ),
	array(),
	array( 'to' => array( 'clip' => 80 ) ),
	array( 'mobile' => array( 'from' => array( 'clipEdge' => 'left' ) ) )
);
$check( $judge_edge( $mobile_edge, 'desktop', 'inset(80% 80% 80% 80%)' ), 'Desktop writes four equal close holders when Mobile uses one edge: ' . $mobile_edge );
$check( $judge_edge( $mobile_edge, 'mobile', 'inset(0% 0% 0% 80%)' ), 'Mobile closes only its left edge with the inherited amount' );
$check( array() === $tier_decls( $mobile_edge, 'tablet' ), 'Tablet writes nothing and inherits Desktop' );
$tablet_amount = $close_css(
	array( 'clip' => 100, 'clipEdge' => 'right' ),
	array(),
	array( 'to' => array( 'clip' => 100 ) ),
	array( 'tablet' => array( 'close' => array( 'to' => array( 'clip' => 30 ) ) ) )
);
$check( $judge_edge( $tablet_amount, 'desktop', 'inset(0% 100% 0% 0%)' ) && $judge_edge( $tablet_amount, 'tablet', 'inset(0% 30% 0% 0%)' ), 'a Tablet close amount keeps the Desktop right edge: ' . $tablet_amount );

// Negative controls: the one-edge judge on real uniform output.
$check( ! $judge_edge( $close_css( array( 'clip' => 100 ), array(), array( 'to' => array( 'clip' => 100 ) ) ), 'desktop', 'inset(0% 0% 100% 0%)' ), 'negative control: the one-edge judge rejects a uniform close' );
$check( ! $judge_edge( $wipe, 'desktop', 'inset(100% 100% 100% 100%)' ), 'negative control: the one-edge judge rejects the four-edge reading of a wipe' );

echo ( 0 === $failures ? 'PASS' : 'FAIL' ) . ": $checks checks, $failures failed\n";
exit( 0 === $failures ? 0 : 1 );

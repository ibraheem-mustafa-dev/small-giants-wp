<?php
/**
 * Standalone runner for the entrance's per-axis scale (Spec 38A §10 scale row): `scaleX` and `scaleY` on EntranceFrom,
 * EntranceTo, EntranceCloseTo and EntranceKeyframe (and the device twins), written to the owners `--sgs-me-sx` and
 * `--sgs-me-sy`, which compose with the uniform `scale` (`--sgs-me-s`) in the scale formula's x and y terms.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-motion-axis-scale-standalone.php
 * With --dump-golden it prints the uniform-scale cases' output instead (the golden's source).
 *
 * Runs the shipped emitter, keyframes writer and open-trigger close rules with the stand-ins in
 * `stubs/motion-render-stubs.php`, and asserts:
 * - regression: a document without scaleX or scaleY (a uniform scale entrance, per-device scales, scale keyframes, an
 *   open entrance with a close scale, a hover scale) emits byte for byte what the emitter emitted before the two axis
 *   owners existed (GOLDEN, captured with `--dump-golden` from the HEAD copy of the emitter and schema);
 * - expand-down: from scaleY 0.85 writes `--sgs-me-from-sy:0.85` only (no uniform or X holder) and stamps the scale
 *   channel; scaleX and scale together write both holders; a Mobile scaleY sits in the Mobile tier only; a keyframed
 *   scaleY reaches the keyframes JSON as `--sgs-me-sy`; a close scaleY writes `--sgs-me-close-to-sy`;
 * - every copy of the scale formula (motion.css, motion-triggers.css, motion-keyframes.js, the schema row) multiplies
 *   `--sgs-me-sx` into the x term only and `--sgs-me-sy` into the y term only, and each axis owner has its from and to
 *   holders in motion.css, its close and op holders in motion-triggers.css, a channel in motion-keyframes.js and a
 *   reset in the editor's final-state rule.
 * Negative controls: the formula judge on a copy that drops `--sgs-me-sx` and on one whose `--sgs-me-sx` leaks into
 * the y term, and the regression comparison on a scaleY case, each must come out red. Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Editor_Canvas;
use SGS\Blocks\Motion\Sgs_Motion_Emitter;

const SEL = '.sgs-m-test';

/** An entrance element for a from/to pair (and optional trigger, devices and extra values). */
function scale_element( array $from, array $to, array $devices = array(), array $extra = array(), string $trigger = 'scroll' ): array {
	return array(
		'entrance' => array(
			'base' => array_merge(
				array(
					'trigger' => $trigger,
					'values'  => array_merge(
						array(
							'from'     => $from,
							'to'       => $to,
							'duration' => 400,
							'easing'   => 'ease-out',
						),
						$extra
					),
					'devices' => $devices,
				),
				'open' === $trigger ? array( 'close' => array( 'to' => array( 'scale' => 0.9 ), 'closeDuration' => 200 ) ) : array()
			),
		),
	);
}

/** The cases without scaleX or scaleY the regression compares with the golden. */
function uniform_cases(): array {
	return array(
		'uniform'         => scale_element( array( 'opacity' => 0, 'scale' => 0.9 ), array( 'scale' => 1 ) ),
		'uniform-devices' => scale_element(
			array( 'scale' => 0.9 ),
			array(),
			array(
				'tablet' => array( 'from' => array( 'scale' => 0.95 ) ),
				'mobile' => array( 'from' => array( 'scale' => 0.98 ) ),
			)
		),
		'keyframes'       => scale_element(
			array( 'scale' => 0.6 ),
			array(),
			array(),
			array(
				'keyframes' => array(
					array( 'offset' => 0, 'opacity' => 0, 'scale' => 0.6 ),
					array( 'offset' => 60, 'scale' => 1.1 ),
					array( 'offset' => 100, 'opacity' => 1, 'scale' => 1 ),
				),
			)
		),
		'open-close'      => scale_element( array( 'opacity' => 0, 'scale' => 0.85 ), array(), array(), array(), 'open' ),
		'hover'           => array(
			'hover' => array(
				'state' => array(
					'values'  => array( 'scale' => 1.05, 'translateY' => -4, 'duration' => 200 ),
					'devices' => array( 'mobile' => array( 'scale' => 1.02 ) ),
				),
			),
		),
	);
}

/** The emitter's CSS and attributes (an open entrance's close rules arrive through `sgs_motion_entrance_css`). */
function emit_case( array $element ): array {
	$GLOBALS['sgs_test_actions'] = array();
	$out = Sgs_Motion_Emitter::emit( $element, SEL, array( 'block' => 'sgs/container', 'target' => 'root' ) );
	return array( 'css' => $out['css'], 'attrs' => $out['attrs'] );
}

if ( in_array( '--dump-golden', $argv, true ) ) {
	$dump = array();
	foreach ( uniform_cases() as $name => $element ) {
		$dump[ $name ] = emit_case( $element );
	}
	echo json_encode( $dump, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ), "\n";
	exit( 0 );
}

// Captured with --dump-golden from the HEAD copy of the emitter and schema (before scaleX and scaleY).
const GOLDEN = <<<'JSON'
{
	"uniform": {
		"css": ".sgs-m-test{--sgs-me-from-op:0;--sgs-me-from-s:0.9;--sgs-me-to-s:1;--sgs-me-dur:400ms;--sgs-me-ease:ease-out;}",
		"attrs": {
			"data-sgs-me": "scroll scale opacity"
		}
	},
	"uniform-devices": {
		"css": ".sgs-m-test{--sgs-me-from-s:0.9;--sgs-me-dur:400ms;--sgs-me-ease:ease-out;}@media (max-width:1023px){.sgs-m-test{--sgs-me-from-s:0.95;}}@media (max-width:767px){.sgs-m-test{--sgs-me-from-s:0.98;}}",
		"attrs": {
			"data-sgs-me": "scroll scale"
		}
	},
	"keyframes": {
		"css": ".sgs-m-test{--sgs-me-from-s:0.6;--sgs-me-dur:400ms;--sgs-me-ease:ease-out;--sgs-me-from-op:0;}",
		"attrs": {
			"data-sgs-me-keyframes": "[{\"offset\":0,\"--sgs-me-op\":\"0\",\"--sgs-me-s\":\"0.6\"},{\"offset\":0.6,\"--sgs-me-s\":\"1.1\"},{\"offset\":1,\"--sgs-me-op\":\"1\",\"--sgs-me-s\":\"1\"}]",
			"data-sgs-me": "scroll scale opacity"
		}
	},
	"open-close": {
		"css": ".sgs-m-test{--sgs-me-from-op:0;--sgs-me-from-s:0.85;--sgs-me-dur:400ms;--sgs-me-ease:ease-out;}.sgs-m-test{--sgs-me-close-to-s:0.9;--sgs-me-close-dur:200ms;}",
		"attrs": {
			"data-sgs-me": "open scale opacity"
		}
	},
	"hover": {
		"css": ".sgs-m-test{--sgs-mh-to-s:1.05;--sgs-mh-to-ty:-4px;transition:--sgs-mh-s 200ms var(--wp--custom--easing--ease-out) 0ms, --sgs-mh-ty 200ms var(--wp--custom--easing--ease-out) 0ms, color 200ms var(--wp--custom--easing--ease-out) 0ms, background-color 200ms var(--wp--custom--easing--ease-out) 0ms, border-color 200ms var(--wp--custom--easing--ease-out) 0ms, box-shadow 200ms var(--wp--custom--easing--ease-out) 0ms;}@media (max-width:767px){.sgs-m-test{--sgs-mh-to-s:1.02;}}",
		"attrs": {
			"data-sgs-mh": "self",
			"data-sgs-mc": "translate scale"
		}
	}
}
JSON;

$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
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

/**
 * Every scale-formula copy in a text that breaks the per-axis rule, as messages: each `scale:` declaration that reads
 * --sgs-me-s must have two calc() terms, the first reading --sgs-me-sx and not --sgs-me-sy, the second the reverse.
 *
 * @return array{0:int,1:array<int,string>} Copies found and the breaches.
 */
function axis_breaches( string $text ): array {
	$found  = 0;
	$errors = array();
	preg_match_all( '/scale: (?:\[ \'scale\', \')?(calc\(.*?var\(--sgs-me-s\).*?)(?:;|\'\s*\]|")/', $text, $m );
	foreach ( $m[1] as $formula ) {
		++$found;
		if ( ! preg_match( '/^(calc\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)) (calc\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))$/', $formula, $terms ) ) {
			$errors[] = "not two per-axis terms: $formula";
			continue;
		}
		$x = $terms[1];
		$y = $terms[2];
		if ( false === strpos( $x, 'var(--sgs-me-sx)' ) || false !== strpos( $x, 'var(--sgs-me-sy)' ) ) {
			$errors[] = "x term does not read --sgs-me-sx alone: $x";
		}
		if ( false === strpos( $y, 'var(--sgs-me-sy)' ) || false !== strpos( $y, 'var(--sgs-me-sx)' ) ) {
			$errors[] = "y term does not read --sgs-me-sy alone: $y";
		}
	}
	return array( $found, $errors );
}

$plugin   = dirname( __DIR__, 2 );
$sources  = array(
	'motion.css'          => (string) file_get_contents( $plugin . '/assets/css/motion.css' ),
	'motion-triggers.css' => (string) file_get_contents( $plugin . '/assets/css/motion-triggers.css' ),
	'motion-keyframes.js' => (string) file_get_contents( $plugin . '/assets/js/motion-keyframes.js' ),
	'motion.schema.json'  => (string) file_get_contents( $plugin . '/schemas/motion.schema.json' ),
);
$expected = array(
	'motion.css'          => 4,
	'motion-triggers.css' => 3,
	'motion-keyframes.js' => 1,
	'motion.schema.json'  => 1,
);

// 1. Regression: a document without scaleX or scaleY emits the bytes it emitted before the axis owners.
$golden = json_decode( GOLDEN, true );
$check( is_array( $golden ) && count( uniform_cases() ) === count( $golden ), 'the golden parses and holds every uniform case' );
foreach ( uniform_cases() as $name => $element ) {
	$got = emit_case( $element );
	$check( ( $golden[ $name ] ?? null ) === $got, "regression: $name emits the pre-axis bytes: " . json_encode( $got ) );
}
$check( false !== strpos( $golden['uniform']['css'] ?? '', '--sgs-me-from-s:0.9' ), 'the golden carries the uniform scale holder (sanity)' );
$check( false !== strpos( $golden['open-close']['css'] ?? '', '--sgs-me-close-to-s:0.9' ), 'the golden carries the close scale holder (sanity)' );

// 2. Expand-down: from scaleY 0.85 writes the Y holder alone and stamps the scale channel.
$down = emit_case( scale_element( array( 'opacity' => 0, 'scaleY' => 0.85 ), array() ) );
$d    = $tier_decls( $down['css'], 'desktop' );
$check( '0.85' === ( $d['--sgs-me-from-sy'] ?? null ) && ! isset( $d['--sgs-me-from-s'] ) && ! isset( $d['--sgs-me-from-sx'] ), 'scaleY 0.85 writes --sgs-me-from-sy alone: ' . $down['css'] );
$check( in_array( 'scale', explode( ' ', $down['attrs']['data-sgs-me'] ?? '' ), true ), 'scaleY stamps the scale channel: ' . json_encode( $down['attrs'] ) );

// scaleX composes with scale: both holders, and the to end too.
$both = emit_case( scale_element( array( 'scale' => 0.9, 'scaleX' => 0.5 ), array( 'scaleX' => 1.2 ) ) );
$d    = $tier_decls( $both['css'], 'desktop' );
$check( '0.9' === ( $d['--sgs-me-from-s'] ?? null ) && '0.5' === ( $d['--sgs-me-from-sx'] ?? null ) && '1.2' === ( $d['--sgs-me-to-sx'] ?? null ), 'scale and scaleX write their own holders: ' . $both['css'] );

// Per device: a Mobile scaleY sits in the Mobile tier only.
$dev = emit_case( scale_element( array( 'scaleY' => 0.85 ), array(), array( 'mobile' => array( 'from' => array( 'scaleY' => 0.95 ) ) ) ) );
$check( '0.95' === ( $tier_decls( $dev['css'], 'mobile' )['--sgs-me-from-sy'] ?? null ) && '0.85' === ( $tier_decls( $dev['css'], 'desktop' )['--sgs-me-from-sy'] ?? null ) && array() === $tier_decls( $dev['css'], 'tablet' ), 'a Mobile scaleY is written to the Mobile tier only: ' . $dev['css'] );

// Keyframes: a keyframed scaleY reaches the JSON as its owner, and its first frame is the hidden start.
$kf   = emit_case(
	scale_element(
		array(),
		array(),
		array(),
		array(
			'keyframes' => array(
				array( 'offset' => 0, 'scaleY' => 0.85 ),
				array( 'offset' => 100, 'scaleY' => 1 ),
			),
		)
	)
);
$json = json_decode( $kf['attrs']['data-sgs-me-keyframes'] ?? '', true );
$check( '0.85' === ( $json[0]['--sgs-me-sy'] ?? null ) && '0.85' === ( $tier_decls( $kf['css'], 'desktop' )['--sgs-me-from-sy'] ?? null ), 'a keyframed scaleY reaches the JSON and the hidden start: ' . json_encode( $kf ) );

// Close: a close scaleY writes the close-to holder.
$open                                         = scale_element( array( 'scaleY' => 0.85 ), array(), array(), array(), 'open' );
$open['entrance']['base']['close']['to']      = array( 'scaleY' => 0.9 );
$closed                                       = emit_case( $open );
$check( false !== strpos( $closed['css'], '--sgs-me-close-to-sy:0.9' ), 'a close scaleY writes --sgs-me-close-to-sy: ' . $closed['css'] );

// 3. Every formula copy keeps the axes apart.
foreach ( $sources as $file => $text ) {
	list( $found, $errors ) = axis_breaches( $text );
	$check( $expected[ $file ] === $found, "$file holds {$expected[ $file ]} scale formula copies (found $found)" );
	$check( array() === $errors, "$file keeps --sgs-me-sx in the x term and --sgs-me-sy in the y term: " . implode( ' | ', $errors ) );
}

// Every holder the axis owners need.
$css      = $sources['motion.css'];
$triggers = $sources['motion-triggers.css'];
foreach ( array( 'sx', 'sy' ) as $axis ) {
	$check( 1 === preg_match( "/@property --sgs-me-$axis \\{ syntax: '<number>'; inherits: false; initial-value: 1; \\}/", $css ), "--sgs-me-$axis is registered as <number>, initial 1" );
	$check( 2 === substr_count( $css, "--sgs-me-$axis: var(--sgs-me-from-$axis, 1);" ) && 1 === substr_count( $css, "--sgs-me-$axis: var(--sgs-me-to-$axis, 1);" ), "motion.css sets --sgs-me-$axis from its from holder (keyframe and hidden start) and its to holder" );
	foreach ( array(
		"--sgs-me-$axis: var(--sgs-me-to-$axis, 1);",
		"--sgs-me-$axis: var(--sgs-me-close-to-$axis, var(--sgs-me-from-$axis, 1));",
		"--sgs-mt-op-$axis: var(--sgs-me-to-$axis, 1);",
		"--sgs-mt-op-$axis: var(--sgs-me-close-to-$axis, var(--sgs-me-from-$axis, 1));",
		"--sgs-mt-op-$axis: calc(1 + (var(--sgs-me-to-$axis, 1) - 1) * var(--sgs-mt-on, 0));",
		"--sgs-me-$axis: var(--sgs-mt-op-$axis, 1);",
	) as $needle ) {
		$check( false !== strpos( $triggers, $needle ), "motion-triggers.css holds $needle" );
	}
	$check( false !== strpos( $sources['motion-keyframes.js'], "'--sgs-me-$axis': 'scale'," ), "motion-keyframes.js maps --sgs-me-$axis to the scale channel" );
	$check( false !== strpos( Sgs_Motion_Editor_Canvas::final_state_css(), "--sgs-me-from-$axis:1 !important;" ), "the editor's final-state rule resets --sgs-me-from-$axis" );
}

// Negative controls.
list( , $dropped ) = axis_breaches( str_replace( ' * var(--sgs-me-sx))', ')', $sources['motion-keyframes.js'] ) );
$check( array() !== $dropped, 'negative control: a formula copy without --sgs-me-sx is caught' );
list( , $leak ) = axis_breaches( preg_replace( '/\* var\(--sgs-me-sy\)\)/', '* var(--sgs-me-sx))', $sources['motion.schema.json'], 1 ) );
$check( array() !== $leak, 'negative control: a --sgs-me-sx that leaks into the y term is caught' );
$check( $golden['uniform'] !== emit_case( scale_element( array( 'opacity' => 0, 'scale' => 0.9, 'scaleY' => 0.85 ), array( 'scale' => 1 ) ) ), 'negative control: the regression comparison sees a scaleY' );

echo ( 0 === $failures ? 'PASS' : 'FAIL' ) . ": $checks checks, $failures failed\n";
exit( 0 === $failures ? 0 : 1 );

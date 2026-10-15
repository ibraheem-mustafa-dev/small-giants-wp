<?php
/**
 * Standalone runner for the drawer entrances on the motion model (Spec 38A §10 clip-path row, M5.D): the one-edge clip
 * with its opener-row anchor (`Sgs_Motion_Clip_Edge`) and the curtain effect's layer, attributes and properties.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-motion-clip-edge-standalone.php
 * With --dump-golden it prints the uniform cases' output instead (the golden's source).
 *
 * Runs the shipped emitter, fx emitter, effect-property writer, layer drops and document sanitiser with the stand-ins in
 * `stubs/motion-render-stubs.php`, and asserts:
 * - regression: a uniform clip entrance (no clipEdge, and clipEdge `all` written out) emits byte for byte what the
 *   single-owner emitter emitted before the four edge owners (GOLDEN, captured with `--dump-golden` from the HEAD copy
 *   of the emitter and schema), keyframes JSON included;
 * - clipEdge top from 100 writes the four from holders as inset(100% 0% 0% 0%) and the to holders as inset(0) with no
 *   uniform holder left, and stamps the clip-path channel;
 * - an anchor writes `var(--sgs-drawer-opener-row-bottom, …)` on a top edge and `calc(100% - var(…))` on a bottom edge
 *   (reveal-from-bar), and an anchor on a left edge is not written and is reported;
 * - per device: a Mobile single edge under a Desktop uniform amount gives Desktop four equal holders, so nothing leaks;
 * - the schema's clipFromAnchor options are `none` plus the x-sgs-clip-anchors rows, and clipEdge's are the four edges
 *   plus `all`;
 * - curtain: an Entrance-panel layer claims an injected layer, stamps `data-sgs-fx~="curtain"` and its direction,
 *   writes its custom properties, and the sanitiser keeps it on `open` and refuses any other trigger.
 * Negative controls: each judge is also run on real emitter output that breaks it (the edge or the anchor left out, a
 * single-edge case compared with the golden) and must come out red. Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Emitter;
use SGS\Blocks\Motion\Sgs_Motion_Field_Types;

const SEL = '.sgs-m-test';

/** The entrance element for a from/to pair (and optional devices and keyframes). */
function clip_element( array $from, array $to, array $devices = array(), array $extra = array() ): array {
	return array(
		'entrance' => array(
			'base' => array(
				'trigger' => 'scroll',
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
		),
	);
}

/** The uniform cases the regression compares with the golden. */
function uniform_cases( bool $explicit_all ): array {
	$all = $explicit_all ? array( 'clipEdge' => 'all', 'clipFromAnchor' => 'none' ) : array();
	return array(
		'uniform'           => clip_element( array( 'opacity' => 0, 'clip' => 40 ) + $all, array( 'clip' => 0 ) + $all ),
		'uniform-devices'   => clip_element(
			array( 'clip' => 40 ) + $all,
			array(),
			array(
				'tablet' => array( 'from' => array( 'clip' => 20 ) + $all ),
				'mobile' => array( 'from' => array( 'clip' => 10 ) ),
			)
		),
		'uniform-keyframes' => clip_element(
			array( 'clip' => 50 ) + $all,
			array(),
			array(),
			array(
				'keyframes' => array(
					array( 'offset' => 0, 'clip' => 50 ),
					array( 'offset' => 60, 'clip' => 10 ),
					array( 'offset' => 100, 'clip' => 0 ),
				),
			)
		),
	);
}

function emit_case( array $element ): array {
	$GLOBALS['sgs_test_actions'] = array();
	$out = Sgs_Motion_Emitter::emit( $element, SEL, array( 'block' => 'sgs/container', 'target' => 'root' ) );
	return array( 'css' => $out['css'], 'attrs' => $out['attrs'] );
}

// --dump-harness: the fixture page's motion elements (tests/fixtures/motion/pages/drawer-entrances.json) through the
// sanitiser and the shipped emitters, as the probe's offline harness markup contract (scripts/motion-qa/probe-drawer-entrances.mjs).
if ( in_array( '--dump-harness', $argv, true ) ) {
	$tree  = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/fixtures/motion/pages/drawer-entrances.json' ), true );
	$found = array();
	$walk  = static function ( array $blocks ) use ( &$walk, &$found ): void {
		foreach ( $blocks as $block ) {
			if ( isset( $block['attributes']['className'] ) && 0 === strpos( (string) $block['attributes']['className'], 'm5d-' ) && 'm5d-panels' !== $block['attributes']['className'] ) {
				$found[ $block['attributes']['className'] ] = $block['attributes']['sgsMotion'] ?? null;
			}
			$walk( $block['innerBlocks'] ?? array() );
		}
	};
	$walk( $tree );
	$out = array();
	foreach ( $found as $class => $motion ) {
		$element = is_array( $motion ) ? ( \SGS\Blocks\Motion\Sgs_Motion_Document::sanitise( $motion )['elements']['root'] ?? array() ) : array();
		$sel     = '.' . $class;
		$emitted = Sgs_Motion_Emitter::emit( $element, $sel, array( 'block' => 'sgs/container', 'target' => 'root' ) );
		$out[]   = array(
			'className' => $class,
			'css'       => $emitted['css'] . \SGS\Blocks\Motion\Sgs_Motion_Effect_Properties::css( $element, $sel ),
			'attrs'     => array_merge( $emitted['attrs'], \SGS\Blocks\Motion\Sgs_Motion_Fx_Emitter::attrs( $element, 'sgs/container', 'root' ) ),
			'layers'    => \SGS\Blocks\Motion\Sgs_Motion_Layer_Drops::injected_layers( $element ),
		);
	}
	echo json_encode( $out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ), "\n";
	exit( 0 );
}

if ( in_array( '--dump-golden', $argv, true ) ) {
	$dump = array();
	foreach ( uniform_cases( false ) as $name => $element ) {
		$dump[ $name ] = emit_case( $element );
	}
	echo json_encode( $dump, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ), "\n";
	exit( 0 );
}

// Captured with --dump-golden from the HEAD copy of the single-owner emitter and schema (before M5.D).
const GOLDEN = <<<'JSON'
{
	"uniform": {
		"css": ".sgs-m-test{--sgs-me-from-op:0;--sgs-me-from-clip:40%;--sgs-me-to-clip:0%;--sgs-me-dur:400ms;--sgs-me-ease:ease-out;}",
		"attrs": {
			"data-sgs-me": "scroll opacity clip-path"
		}
	},
	"uniform-devices": {
		"css": ".sgs-m-test{--sgs-me-from-clip:40%;--sgs-me-dur:400ms;--sgs-me-ease:ease-out;}@media (max-width:1023px){.sgs-m-test{--sgs-me-from-clip:20%;}}@media (max-width:767px){.sgs-m-test{--sgs-me-from-clip:10%;}}",
		"attrs": {
			"data-sgs-me": "scroll clip-path"
		}
	},
	"uniform-keyframes": {
		"css": ".sgs-m-test{--sgs-me-from-clip:50%;--sgs-me-dur:400ms;--sgs-me-ease:ease-out;}",
		"attrs": {
			"data-sgs-me-keyframes": "[{\"offset\":0,\"--sgs-me-clip\":\"50%\"},{\"offset\":0.6,\"--sgs-me-clip\":\"10%\"},{\"offset\":1,\"--sgs-me-clip\":\"0%\"}]",
			"data-sgs-me": "scroll clip-path"
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

/** The inset() an end's four holders compose, or null when any is missing. */
$inset = static function ( array $decls, string $end ): ?string {
	$parts = array();
	foreach ( array( 't', 'r', 'b', 'l' ) as $e ) {
		if ( ! isset( $decls[ "--sgs-me-$end-clip-$e" ] ) ) {
			return null;
		}
		$parts[] = $decls[ "--sgs-me-$end-clip-$e" ];
	}
	return 'inset(' . implode( ' ', $parts ) . ')';
};

// Judges, reused by the negative controls.
$judge_top    = static function ( array $out ) use ( $tier_decls, $inset ): bool {
	$d = $tier_decls( $out['css'], 'desktop' );
	return 'inset(100% 0% 0% 0%)' === $inset( $d, 'from' ) && 'inset(0% 0% 0% 0%)' === $inset( $d, 'to' )
		&& ! isset( $d['--sgs-me-from-clip'] ) && ! isset( $d['--sgs-me-to-clip'] )
		&& in_array( 'clip-path', explode( ' ', $out['attrs']['data-sgs-me'] ?? '' ), true );
};
$judge_anchor = static function ( array $out, string $suffix, string $want ) use ( $tier_decls ): bool {
	return $want === ( $tier_decls( $out['css'], 'desktop' )[ '--sgs-me-from-clip-' . $suffix ] ?? null );
};

// 1. Regression: the uniform clip emits the single-owner bytes, with or without an explicit `all`.
$golden = json_decode( GOLDEN, true );
$check( is_array( $golden ) && 3 === count( $golden ), 'the golden parses and holds the three uniform cases' );
foreach ( array( false, true ) as $explicit ) {
	foreach ( uniform_cases( $explicit ) as $name => $element ) {
		$got = emit_case( $element );
		$check( ( $golden[ $name ] ?? null ) === $got, "regression: $name" . ( $explicit ? ' (clipEdge all written out)' : '' ) . ' emits the single-owner bytes: ' . json_encode( $got ) );
	}
}
$check( false !== strpos( $golden['uniform']['css'] ?? '', '--sgs-me-from-clip:40%' ), 'the golden carries the uniform holder (sanity)' );
$check( false !== strpos( $golden['uniform-keyframes']['attrs']['data-sgs-me-keyframes'] ?? '', '"--sgs-me-clip":"10%"' ), 'the golden keyframes carry the uniform clip amount (sanity)' );

// 2. clipEdge top from 100 to 0: inset(100% 0 0 0) to inset(0), no uniform holder, the clip-path channel stamped.
$top = emit_case( clip_element( array( 'clip' => 100, 'clipEdge' => 'top' ), array( 'clip' => 0, 'clipEdge' => 'top' ) ) );
$check( $judge_top( $top ), 'clipEdge top writes inset(100% 0% 0% 0%) to inset(0% 0% 0% 0%) on the edge holders: ' . $top['css'] );

// Wipe down: a bottom edge from 100 (inset(0 0 100% 0)), the to-value left at the identity.
$wipe = emit_case( clip_element( array( 'clip' => 100, 'clipEdge' => 'bottom' ), array() ) );
$check( 'inset(0% 0% 100% 0%)' === $inset( $tier_decls( $wipe['css'], 'desktop' ), 'from' ), 'wipe down starts at inset(0% 0% 100% 0%): ' . $wipe['css'] );
$check( ! isset( $tier_decls( $wipe['css'], 'desktop' )['--sgs-me-to-clip-b'] ), 'an end with no single edge keeps its uniform fallback (the to identity)' );

// 3. Anchors.
$bar = emit_case( clip_element( array( 'clip' => 100, 'clipEdge' => 'bottom', 'clipFromAnchor' => 'opener-row' ), array() ) );
$check( $judge_anchor( $bar, 'b', 'calc(100% - var(--sgs-drawer-opener-row-bottom, 0%))' ), 'reveal from bar: the bottom edge starts at 100% minus the opener row: ' . $bar['css'] );
$check( 'inset(0% 0% calc(100% - var(--sgs-drawer-opener-row-bottom, 0%)) 0%)' === $inset( $tier_decls( $bar['css'], 'desktop' ), 'from' ), 'reveal from bar is the old inset(0 0 calc(100% - row) 0)' );
$top_anchor = emit_case( clip_element( array( 'clip' => 30, 'clipEdge' => 'top', 'clipFromAnchor' => 'opener-row' ), array() ) );
$check( $judge_anchor( $top_anchor, 't', 'var(--sgs-drawer-opener-row-bottom, 30%)' ), 'a top edge reads var(--sgs-drawer-opener-row-bottom, <amount>): ' . $top_anchor['css'] );
$bar_part = emit_case( clip_element( array( 'clip' => 75, 'clipEdge' => 'bottom', 'clipFromAnchor' => 'opener-row' ), array() ) );
$check( $judge_anchor( $bar_part, 'b', 'calc(100% - var(--sgs-drawer-opener-row-bottom, 25%))' ), 'the bottom-edge fallback is 100% minus the amount (75 gives 25%)' );
$left = emit_case( clip_element( array( 'clip' => 100, 'clipEdge' => 'left', 'clipFromAnchor' => 'opener-row' ), array() ) );
$dropped = array_values( array_filter( $GLOBALS['sgs_test_actions'], static fn( $a ) => 'sgs_motion_layer_dropped' === $a[0] && 'clip-anchor-edge' === ( $a[1][2]['id'] ?? '' ) ) );
$check( 'inset(0% 0% 0% 100%)' === $inset( $tier_decls( $left['css'], 'desktop' ), 'from' ) && 1 === count( $dropped ), 'an anchor on a left edge is not written and is reported once' );

// 4. Per device: Desktop uniform 50, Mobile a single left edge.
$dev = emit_case( clip_element( array( 'clip' => 50 ), array(), array( 'mobile' => array( 'from' => array( 'clipEdge' => 'left' ) ) ) ) );
$check( 'inset(50% 50% 50% 50%)' === $inset( $tier_decls( $dev['css'], 'desktop' ), 'from' ), 'Desktop writes four equal holders when another tier uses one edge: ' . $dev['css'] );
$check( 'inset(0% 0% 0% 50%)' === $inset( $tier_decls( $dev['css'], 'mobile' ), 'from' ), 'Mobile inherits the amount and insets only the left edge' );
$check( array() === $tier_decls( $dev['css'], 'tablet' ), 'Tablet writes nothing and inherits Desktop' );

// 5. The schema's option lists.
$defs    = Sgs_Motion_Field_Types::defs();
$anchors = array_keys( Sgs_Motion_Field_Types::schema()['x-sgs-clip-anchors'] ?? array() );
foreach ( array( 'EntranceFrom', 'EntranceTo', 'EntranceFromDevice', 'EntranceToDevice' ) as $def ) {
	$check( array_merge( array( 'none' ), $anchors ) === ( $defs[ $def ]['properties']['clipFromAnchor']['enum'] ?? null ), "$def clipFromAnchor lists none plus every x-sgs-clip-anchors row" );
	$check( array( 'all', 'top', 'right', 'bottom', 'left' ) === ( $defs[ $def ]['properties']['clipEdge']['enum'] ?? null ), "$def clipEdge lists all and the four edges" );
}
$clip_row = array_values( array_filter( Sgs_Motion_Field_Types::schema()['x-sgs-channels'], static fn( $r ) => 'clip-path' === $r['channel'] ) )[0];
$check( array( '--sgs-me-clip-t', '--sgs-me-clip-r', '--sgs-me-clip-b', '--sgs-me-clip-l' ) === array_column( $clip_row['owners'][0]['properties'], 'name' ), 'the clip-path channel has the four edge owners in inset() order' );
$check( 'clip-path' === ( Sgs_Motion_Emitter::property_channels()['--sgs-me-clip'] ?? null ), 'the uniform input still maps to the clip-path channel' );

// 6. Curtain.
$curtain = array(
	'id'      => 'c1',
	'effect'  => 'curtain',
	'trigger' => 'open',
	'values'  => array(
		'colour'    => '#112233',
		'direction' => 'down',
		'duration'  => 500,
		'easing'    => 'linear',
	),
	'devices' => array( 'mobile' => array( 'duration' => 300 ) ),
);
$el    = array( 'entrance' => array( 'text' => array( $curtain ) ) );
$attrs = \SGS\Blocks\Motion\Sgs_Motion_Fx_Emitter::attrs( $el, 'sgs/container', 'root' );
$check( 'curtain' === ( $attrs['data-sgs-fx'] ?? null ) && 'down' === ( $attrs['data-sgs-fx-curtain-direction'] ?? null ), 'curtain stamps data-sgs-fx and its direction: ' . json_encode( $attrs ) );
$props = \SGS\Blocks\Motion\Sgs_Motion_Effect_Properties::css( $el, SEL );
foreach ( array( '--sgs-curtain-colour:#112233', '--sgs-curtain-duration:500ms', '--sgs-curtain-easing:linear', '@media (max-width:767px){' . SEL . '{--sgs-curtain-duration:300ms;}}' ) as $needle ) {
	$check( false !== strpos( $props, $needle ), "curtain writes $needle: $props" );
}
$check( array( 'curtain' ) === \SGS\Blocks\Motion\Sgs_Motion_Layer_Drops::injected_layers( $el ), 'curtain claims one injected layer' );
$emitted = Sgs_Motion_Emitter::emit( $el, SEL, array() );
$check( in_array( 'injected', explode( ' ', $emitted['attrs']['data-sgs-mc'] ?? '' ), true ), 'curtain stamps the injected channel on data-sgs-mc' );
$doc = static fn( array $layer ): array => array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'text' => array( $layer ) ) ) ) );
$kept = \SGS\Blocks\Motion\Sgs_Motion_Document::sanitise( $doc( $curtain ) );
$check( 'open' === ( $kept['elements']['root']['entrance']['text'][0]['trigger'] ?? null ), 'the sanitiser keeps a curtain on open: ' . json_encode( $kept ) );
$scroll = \SGS\Blocks\Motion\Sgs_Motion_Document::sanitise( $doc( array( 'trigger' => 'scroll' ) + $curtain ) );
$check( 'scroll' !== ( $scroll['elements']['root']['entrance']['text'][0]['trigger'] ?? null ), 'the sanitiser refuses a curtain on any trigger but open: ' . json_encode( $scroll ) );

// Negative controls: each judge on real output that breaks it.
$no_edge = emit_case( clip_element( array( 'clip' => 100 ), array( 'clip' => 0 ) ) );
$check( ! $judge_top( $no_edge ), 'negative control: the top-edge judge rejects a uniform clip (the edge left out)' );
$check( ! $judge_anchor( $wipe, 'b', 'calc(100% - var(--sgs-drawer-opener-row-bottom, 0%))' ), 'negative control: the anchor judge rejects a wipe without the anchor' );
$check( $golden['uniform'] !== emit_case( clip_element( array( 'opacity' => 0, 'clip' => 40, 'clipEdge' => 'top' ), array( 'clip' => 0 ) ) ), 'negative control: the regression comparison sees a single-edge change' );
$check( null === $inset( $tier_decls( $golden['uniform']['css'] ?? '', 'desktop' ), 'from' ), 'negative control: the uniform golden has no edge holders' );

echo ( 0 === $failures ? 'PASS' : 'FAIL' ) . ": $checks checks, $failures failed\n";
exit( 0 === $failures ? 0 : 1 );

<?php
/**
 * Standalone runner for the state trigger's close values and the entrance's colour `to` values (Spec 38A FR-38A-53,
 * plan Track S S4 items 5 and 6, build unit M6.7 schema batch).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-motion-state-close-colour-standalone.php
 *
 * Reads the REAL schema, block.json files and motion classes (through `stubs/motion-render-stubs.php`) and asserts:
 * - close on `state`: a `state` entrance may store `close` (the close side the `open` trigger already has: closeDuration,
 *   closeEasing, closeDelay and the close `to` values); the renderer writes `--sgs-me-close-*` for it and one rule keyed to
 *   `<state>-out` that plays the close (`--sgs-mt-out`); a layer with no close prints no out rule; `close` on a `scroll`
 *   entrance is still refused (the negative control);
 * - no animation on first paint: every non-keyframe state entrance prints one rule keyed to `<state>-rest` that gives the entrance
 *   a zero duration and delay (it jumps to the held values), which `@sgs/motion-state` `restMotionState` arms at start-up;
 * - the stylesheet plays the close on a state target: the close keyframe names are chosen for `state` targets as for
 *   `open` ones;
 * - colour `to` values: `backgroundColour`, `textColour` and `borderColour` take a palette slug or a hex, print as the
 *   scoped custom properties `--sgs-me-to-bg`, `-fg` and `-bd`, an invalid colour and a colour on `from` are refused, and
 *   the markup carries no `style` attribute.
 * Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Renderer;
use SGS\Blocks\Motion\Sgs_Motion_Trigger_Open_State;

$root     = dirname( __DIR__, 2 );
$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};
$has = static function ( string $haystack, string $needle ): bool {
	return false !== strpos( $haystack, $needle );
};

/** Render the accordion's turning-icon part with one entrance layer. */
$render = static function ( array $layer ): array {
	Sgs_Motion_Renderer::reset();
	Sgs_Motion_Trigger_Open_State::reset();
	$GLOBALS['sgs_collected_css']        = array();
	$GLOBALS['sgs_test_is_admin']        = false;
	$GLOBALS['sgs_test_in_loop']         = false;
	$GLOBALS['sgs_test_actions']         = array();
	$GLOBALS['sgs_test_enqueued_styles'] = array();
	$GLOBALS['sgs_test_enqueued']        = array();
	$html = '<div class="wp-block-sgs-accordion sgs-accordion"><details class="sgs-accordion-item"><summary><span class="sgs-accordion-item__icons"><span class="sgs-accordion-item__icon-open sgs-accordion-item__icon-open--rotates">+</span></span></summary></details></div>';
	$out  = sgs_test_render_motion_block(
		array(
			'blockName' => 'sgs/accordion',
			'attrs'     => array(
				'sgsMotion' => array(
					'v'        => 1,
					'elements' => array( 'turning-icon' => array( 'entrance' => array( 'base' => $layer ) ) ),
				),
			),
		),
		$html
	);
	return array( $out, implode( '', $GLOBALS['sgs_collected_css'] ) );
};
$scope_of = static function ( string $html ): string {
	return 1 === preg_match( '/\b(sgs-m-[0-9a-f]{10})\b/', $html, $m ) ? $m[1] : 'none';
};

$turn = array(
	'trigger' => 'state',
	'state'   => 'expanded',
	'values'  => array(
		'to'       => array( 'rotate' => 180 ),
		'duration' => 'token:duration.medium',
		'easing'   => 'token:easing.default',
	),
);
$part = '.sgs-accordion-item__icon-open--rotates';

// 1. Close values on a state entrance.
$closing = $turn + array(
	'close' => array(
		'closeDuration' => 'token:duration.medium',
		'closeEasing'   => 'token:easing.default',
		'closeDelay'    => 40,
	),
);
list( $html, $css ) = $render( $closing );
$scope              = $scope_of( $html );
$out_host           = '[data-sgs-motion-state~="expanded-out"]';
$check( 1 === preg_match( '/data-sgs-me="state\b/', $html ), 'close: the state entrance is kept (not refused) with close values: ' . $html );
$check( $has( $css, '--sgs-me-close-dur:var(--wp--custom--duration--medium);' ), 'close: the close duration prints its token: ' . $css );
$check( $has( $css, '--sgs-me-close-ease:var(--wp--custom--easing--default);' ), 'close: the close easing prints its token: ' . $css );
$check( $has( $css, '--sgs-me-close-delay:40ms;' ), 'close: the close delay prints: ' . $css );
$check( $has( $css, '.' . $scope . ' ' . $part . ':is(' . $out_host . ',' . $out_host . ' *){' ) && $has( $css, 'animation-name:var(--sgs-mt-out,none);' ), 'close: one rule keyed to expanded-out plays the close name list: ' . $css );
$check( $has( $css, '--sgs-me-a-dur:var(--sgs-me-close-dur,' ) && $has( $css, '--sgs-me-a-delay:var(--sgs-me-close-delay,' ), 'close: the out rule reads the close duration and delay: ' . $css );

// 1b. A close with its own to-value: the held value the icon closes to.
list( , $css ) = $render( array_replace_recursive( $closing, array( 'close' => array( 'to' => array( 'rotate' => 90 ) ) ) ) );
$check( $has( $css, '--sgs-me-close-to-rot:90deg;' ), 'close: a close to-value prints --sgs-me-close-to-rot: ' . $css );

// 1c. No close stored: no out rule (the state snaps back, as before).
list( $html, $css ) = $render( $turn );
$check( ! $has( $css, 'expanded-out' ) && ! $has( $css, '--sgs-me-close-' ), 'no close: no out rule and no close properties: ' . $css );

// 1d. NEGATIVE CONTROL: close on a scroll entrance is refused by the schema.
list( $html, $css ) = $render(
	array(
		'trigger' => 'scroll',
		'values'  => array( 'from' => array( 'opacity' => 0 ) ),
		'close'   => array( 'closeDuration' => 300 ),
	)
);
$check( ! $has( $html, 'data-sgs-me=' ) && ! $has( $css, '--sgs-me-close-dur' ), 'negative control: close on a scroll entrance is refused (no entrance, no close property): ' . $css );

// 2. No animation on first paint: the rest rule keeps the held values only.
list( $html, $css ) = $render( $turn );
$scope              = $scope_of( $html );
$rest_host          = '[data-sgs-motion-state~="expanded-rest"]';
$check( $has( $css, '.' . $scope . ' ' . $part . ':is(' . $rest_host . ',' . $rest_host . ' *){--sgs-me-a-dur:var(--sgs-mt-rest,0ms);--sgs-me-a-delay:var(--sgs-mt-rest,0ms);}' ), 'rest: a state held at rest plays its entrance on a zero duration and delay, so it jumps to the held values: ' . $css );
$state_rule_at = strpos( $css, '--sgs-mt-on:1;animation-name:var(--sgs-mt-in,none);' );
$rest_rule_at  = strpos( $css, $rest_host );
$check( false !== $state_rule_at && false !== $rest_rule_at && $rest_rule_at > $state_rule_at, 'rest: the rest rule comes after the state rule, so it wins at equal specificity' );

// 2b. A multi-keyframe state entrance (the WAAPI player) prints no rest or out rule: the player owns its animation.
list( $html, $css ) = $render(
	array(
		'trigger' => 'state',
		'state'   => 'expanded',
		'values'  => array(
			'keyframes' => array(
				array( 'offset' => 0, 'opacity' => 0 ),
				array( 'offset' => 100, 'opacity' => 1 ),
			),
			'duration'  => 300,
		),
		'close'   => array( 'closeDuration' => 200 ),
	)
);
$check( ! $has( $css, 'expanded-rest' ) && ! $has( $css, 'expanded-out' ), 'keyframes: no rest or out rule for a state the WAAPI player plays: ' . $css );

// 3. The stylesheet chooses the close keyframes for state targets as for open ones.
$triggers_css = (string) file_get_contents( $root . '/assets/css/motion-triggers.css' );
foreach ( array( 'translate', 'rotate', 'transform', 'scale', 'opacity', 'filter', 'clip-path' ) as $channel ) {
	$check( 1 === preg_match( '/:is\(\[data-sgs-me~="open"\],\s*\[data-sgs-me~="state"\]\)\[data-sgs-me~="' . preg_quote( $channel, '/' ) . '"\]\s*\{\s*--sgs-mt-c-' . preg_quote( $channel, '/' ) . ':\s*sgs-me-close-/', $triggers_css ), "stylesheet: the $channel close keyframes are chosen for open and state targets" );
}

// 4. Colour `to` values.
$coloured = $turn;
$coloured['values']['to'] += array(
	'backgroundColour' => 'primary',
	'textColour'       => '#112233',
	'borderColour'     => 'accent-dark',
);
list( $html, $css ) = $render( $coloured );
$check( 1 === preg_match( '/data-sgs-me="state\b/', $html ), 'colour: a state entrance with colour to-values is kept: ' . $html );
$check( $has( $css, '--sgs-me-to-bg:var(--wp--preset--color--primary, currentColor);' ), 'colour: the background palette slug prints as a scoped custom property: ' . $css );
$check( $has( $css, '--sgs-me-to-fg:#112233;' ), 'colour: a one-off hex prints as is: ' . $css );
$check( $has( $css, '--sgs-me-to-bd:var(--wp--preset--color--accent-dark, currentColor);' ), 'colour: the border colour prints: ' . $css );
$check( 0 === preg_match( '/\sstyle\s*=/i', $html ), 'colour: no style attribute in the markup' );
$check( 1 === preg_match( '/is\(\[data-sgs-motion-state~="expanded"\],\[data-sgs-motion-state~="expanded"\] \*\)\{[^}]*background-color:var\(--sgs-me-to-bg\);color:var\(--sgs-me-to-fg\);border-color:var\(--sgs-me-to-bd\);/', $css ), 'colour: the state rule paints the three colours from the scoped properties while the state is on: ' . $css );
$check( 1 === preg_match( "/@property --sgs-me-to-bg \{ syntax: '\*'; inherits: false; \}/", (string) file_get_contents( $root . '/assets/css/motion-triggers.css' ) ), 'colour: the sheet registers --sgs-me-to-bg non-inheriting' );

$open = array(
	'trigger' => 'open',
	'values'  => array( 'to' => array( 'backgroundColour' => 'surface' ) ),
);
list( $html, $css ) = $render( $open );
$check( $has( $css, '--sgs-me-to-bg:var(--wp--preset--color--surface, currentColor);' ), 'colour: an open entrance takes the colour to-value too: ' . $css );
$check( 1 === preg_match( '/is\(\[data-sgs-motion-state~="open"\],\[data-sgs-motion-state~="open"\] \*\):not\([^{]*\)\{background-color:var\(--sgs-me-to-bg\);\}/', $css ), 'colour: an open entrance paints while its host is open and no closed host shields it: ' . $css );
list( , $css ) = $render( $turn );
$check( ! $has( $css, 'background-color:' ) && ! $has( $css, 'border-color:' ), 'colour: no colour stored, nothing painted: ' . $css );

// 4b. NEGATIVE CONTROLS: an invalid colour and a colour on `from` are refused.
list( $html, $css ) = $render( array_replace_recursive( $turn, array( 'values' => array( 'to' => array( 'backgroundColour' => 'not a colour;}' ) ) ) ) );
$check( ! $has( $css, '--sgs-me-to-bg' ) && ! $has( $css, 'not a colour' ), 'negative control: an invalid colour is refused and never printed: ' . $css );
list( $html, $css ) = $render( array_replace_recursive( $turn, array( 'values' => array( 'from' => array( 'backgroundColour' => 'primary' ) ) ) ) );
$check( ! $has( $css, '--sgs-me-from-bg' ), 'negative control: the schema has no colour on from, so none prints: ' . $css );

echo $failures ? "FAILED: $failures of $checks checks\n" : "PASS: $checks checks\n";
exit( $failures ? 1 : 0 );

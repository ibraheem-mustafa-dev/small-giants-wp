<?php
/**
 * Standalone runner for the `open` and `state` entrance triggers (Spec 38A M4.4; FR-38A-51 and FR-38A-53 enablers).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-triggers-standalone.php
 *
 * Renders fixture layers through the shipped renderer and emitter with the stand-ins in
 * `stubs/motion-render-stubs.php` and asserts: an `open` entrance emits its open values and its own close values,
 * close duration and per-device close timing; per-item close delays are emitted as stored (the reversed-order case);
 * a `state` entrance emits a rule keyed to its named state on the host; a state the block does not declare in
 * `supports.sgs.motion.states` is refused; the stylesheet is enqueued only when such an entrance is printed; and no
 * markup carries a `style` attribute. Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Renderer;
use SGS\Blocks\Motion\Sgs_Motion_Trigger_Open_State;

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

// The fixture form block declares two named states: the real sgs/form block.json, plus supports.sgs.motion.states
// (no shipped block declares states yet; M5.17 adds them). Injected into the stub registry's cache.
$registry = WP_Block_Type_Registry::get_instance();
$form     = $registry->get_registered( 'sgs/form' );
$check( is_object( $form ), 'the sgs/form fixture block is readable' );
$form->supports['sgs']['motion'] = array( 'states' => array( 'invalid', 'step-changed', 'Bad Name' ) );
( function ( string $name, $type ): void {
	$this->types[ $name ] = $type;
} )->call( $registry, 'sgs/form', $form );

$render = static function ( string $block, array $elements, string $html ): array {
	Sgs_Motion_Renderer::reset();
	Sgs_Motion_Trigger_Open_State::reset();
	$GLOBALS['sgs_collected_css']        = array();
	$GLOBALS['sgs_test_is_admin']        = false;
	$GLOBALS['sgs_test_in_loop']         = false;
	$GLOBALS['sgs_test_actions']         = array();
	$GLOBALS['sgs_test_enqueued_styles'] = array();
	$out = sgs_test_render_motion_block(
		array(
			'blockName' => $block,
			'attrs'     => array( 'sgsMotion' => array( 'v' => 1, 'elements' => $elements ) ),
		),
		$html
	);
	return array( $out, implode( '', $GLOBALS['sgs_collected_css'] ) );
};
$scope_of = static function ( string $html ): string {
	return 1 === preg_match( '/\b(sgs-m-[0-9a-f]{10})\b/', $html, $m ) ? $m[1] : 'none';
};
$markups = array();

// 1. Open: the open values and timing, and the close values, close duration and per-device close timing.
$open = array(
	'trigger' => 'open',
	'values'  => array(
		'from'     => array( 'opacity' => 0, 'translateY' => 18 ),
		'to'       => array( 'opacity' => 1, 'translateY' => 0 ),
		'duration' => 500,
		'delay'    => 50,
		'easing'   => 'ease-out',
	),
	'close'   => array(
		'to'            => array( 'opacity' => 0, 'translateY' => -10 ),
		'closeDuration' => 250,
		'closeEasing'   => 'ease-in',
		'closeDelay'    => 150,
	),
	'devices' => array(
		'tablet' => array( 'close' => array( 'closeDuration' => 200 ) ),
		'mobile' => array( 'duration' => 400, 'close' => array( 'closeDelay' => 75, 'to' => array( 'translateY' => -6 ) ) ),
	),
);
list( $html, $css ) = $render( 'sgs/hero', array( 'root' => array( 'entrance' => array( 'base' => $open ) ) ), '<div class="wp-block-sgs-hero">Hi</div>' );
$markups[]          = $html;
$scope              = $scope_of( $html );
$check( $has( $html, 'data-sgs-me="open translate opacity"' ), 'open entrance marks the target: ' . $html );
$check( $has( $css, '.' . $scope . '{' ), 'open entrance rule is scoped: ' . $css );
foreach ( array( '--sgs-me-from-op:0;', '--sgs-me-from-ty:18px;', '--sgs-me-to-op:1;', '--sgs-me-dur:500ms;', '--sgs-me-delay:50ms;', '--sgs-me-ease:ease-out;' ) as $decl ) {
	$check( $has( $css, $decl ), "open value emitted: $decl" );
}
$desktop_close = '.' . $scope . '{--sgs-me-close-to-op:0;--sgs-me-close-to-ty:-10px;--sgs-me-close-dur:250ms;--sgs-me-close-delay:150ms;--sgs-me-close-ease:ease-in;}';
$check( $has( $css, $desktop_close ), 'open emits its own close values, duration, delay and easing: ' . $css );
$check( $has( $css, '@media (max-width:1023px){.' . $scope . '{--sgs-me-close-dur:200ms;}}' ), 'tablet close duration in the tablet media query' );
$check( $has( $css, '@media (max-width:767px){.' . $scope . '{--sgs-me-close-to-ty:-6px;--sgs-me-close-delay:75ms;}}' ), 'mobile close values in the mobile media query' );
$check( $has( $css, '@media (max-width:767px){.' . $scope . '{--sgs-me-dur:400ms;}}' ), 'mobile open duration unchanged by the close rules' );
$check( 1 === substr_count( $css, '--sgs-me-close-dur:250ms' ), 'the desktop close duration is written once' );
$check( in_array( 'sgs-motion-triggers', $GLOBALS['sgs_test_enqueued_styles'], true ), 'the trigger stylesheet is enqueued for an open entrance' );
$check( Sgs_Motion_Trigger_Open_State::used(), 'the open entrance is recorded as used' );
$check( ! $has( $css, 'data-sgs-motion-state' ), 'an open entrance emits no per-instance state rule (the stylesheet owns it)' );

// 2. Per-item close delays, stored in reverse order (the drawer's close-reversed stagger): each item keeps its own.
$items = array( array( 0, 110 ), array( 55, 55 ), array( 110, 0 ) );
$seen  = array();
foreach ( $items as $i => $pair ) {
	$item                  = $open;
	$item['values']['delay'] = $pair[0];
	$item['close']         = array( 'closeDelay' => $pair[1] );
	unset( $item['devices'] );
	list( $html, $css ) = $render( 'sgs/hero', array( 'root' => array( 'entrance' => array( 'base' => $item ) ) ), '<div class="wp-block-sgs-hero">Item ' . $i . '</div>' );
	$markups[]          = $html;
	$scope              = $scope_of( $html );
	$seen[]             = $scope;
	$check( $has( $css, '--sgs-me-delay:' . $pair[0] . 'ms;' ), "item $i keeps its open delay {$pair[0]}ms" );
	$check( $has( $css, '.' . $scope . '{--sgs-me-close-delay:' . $pair[1] . 'ms;}' ), "item $i keeps its reversed close delay {$pair[1]}ms: $css" );
	$check( ! $has( $css, '--sgs-me-close-dur' ), "item $i writes no close duration it did not store" );
}
$check( 3 === count( array_unique( $seen ) ), 'each item has its own scope' );

// 3. State: a rule keyed to the named state on the host (the target itself or an ancestor).
$state = array(
	'trigger' => 'state',
	'state'   => 'invalid',
	'values'  => array( 'from' => array( 'translateX' => -8 ), 'duration' => 320, 'easing' => 'linear' ),
);
$form_html = '<form class="wp-block-sgs-form"><div class="sgs-form__inner">Fields</div></form>';
list( $html, $css ) = $render( 'sgs/form', array( 'inner' => array( 'entrance' => array( 'base' => $state ) ) ), $form_html );
$markups[]          = $html;
$scope              = $scope_of( $html );
$check( 1 === preg_match( '/<div(?=[^>]*\bsgs-form__inner\b)(?=[^>]*data-sgs-me="state translate")[^>]*>/', $html ), 'state entrance marks the part: ' . $html );
$state_rule = '.' . $scope . ' .sgs-form__inner:is([data-sgs-motion-state~="invalid"],[data-sgs-motion-state~="invalid"] *){--sgs-mt-on:1;animation-name:var(--sgs-mt-in,none);}';
$check( $has( $css, $state_rule ), 'state rule keyed to the named state: ' . $css );
$check( $has( $css, '--sgs-me-from-tx:-8px;' ) && $has( $css, '--sgs-me-dur:320ms;' ), 'state entrance values emitted' );
$check( ! $has( $css, '--sgs-me-close-' ), 'a state entrance emits no close values' );
$check( in_array( 'sgs-motion-triggers', $GLOBALS['sgs_test_enqueued_styles'], true ), 'the trigger stylesheet is enqueued for a state entrance' );

// 3b. A multi-keyframe state entrance (the WAAPI module plays it) gets only the on flag.
$shake                        = $state;
$shake['values']['keyframes'] = array(
	array( 'offset' => 0, 'translateX' => 0 ),
	array( 'offset' => 0.33, 'translateX' => -8 ),
	array( 'offset' => 0.66, 'translateX' => 8 ),
	array( 'offset' => 1, 'translateX' => 0 ),
);
list( $html, $css ) = $render( 'sgs/form', array( 'inner' => array( 'entrance' => array( 'base' => $shake ) ) ), $form_html );
$markups[]          = $html;
if ( $has( $html, 'data-sgs-me-keyframes' ) ) {
	$check( 1 === preg_match( '/:is\(\[data-sgs-motion-state~="invalid"\],\[data-sgs-motion-state~="invalid"\] \*\)\{--sgs-mt-on:1;\}/', $css ), 'a keyframes state entrance gets only the on flag: ' . $css );
} else {
	$check( false, 'the keyframes fixture did not produce data-sgs-me-keyframes: ' . $html );
}

// 4. Refusals: a state the block does not declare, a block that declares none, and an invalid declared name.
foreach (
	array(
		'undeclared state'           => array( 'sgs/form', 'exploded', $form_html, 'inner' ),
		'block declares no states'   => array( 'sgs/hero', 'invalid', '<div class="wp-block-sgs-hero">Hi</div>', 'root' ),
		'declared name is not valid' => array( 'sgs/form', 'Bad Name', $form_html, 'inner' ),
	) as $label => $case
) {
	$layer          = $state;
	$layer['state'] = $case[1];
	list( $html, $css ) = $render( $case[0], array( $case[3] => array( 'entrance' => array( 'base' => $layer ) ) ), $case[2] );
	$markups[]          = $html;
	$check( ! $has( $html, 'data-sgs-me=' ), "$label: no entrance attribute: $html" );
	$check( ! $has( $css, 'data-sgs-motion-state' ) && ! $has( $css, '--sgs-me-' ), "$label: no entrance CSS: $css" );
	// A malformed name never reaches the trigger filter: the schema sanitiser drops the layer first.
	if ( 'declared name is not valid' !== $label ) {
		$dropped = array_values( array_filter( $GLOBALS['sgs_test_actions'], static fn( $a ) => 'sgs_motion_layer_dropped' === $a[0] ) );
		$check( isset( $dropped[0][1][2]['id'] ) && 'state-not-declared' === $dropped[0][1][2]['id'] && $case[0] === $dropped[0][1][0], "$label: refusal reported" );
	}
	$check( ! in_array( 'sgs-motion-triggers', $GLOBALS['sgs_test_enqueued_styles'], true ), "$label: no trigger stylesheet" );
}
$check( array( 'invalid', 'step-changed' ) === Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/form' ), 'declared states keep valid names only' );

// 5. Load and scroll entrances are untouched: no trigger rules, no trigger stylesheet.
$scroll = array( 'trigger' => 'scroll', 'values' => array( 'from' => array( 'opacity' => 0 ), 'duration' => 600 ) );
list( $html, $css ) = $render( 'sgs/hero', array( 'root' => array( 'entrance' => array( 'base' => $scroll ) ) ), '<div class="wp-block-sgs-hero">Hi</div>' );
$markups[]          = $html;
$check( $has( $html, 'data-sgs-me="scroll opacity"' ), 'scroll entrance still emitted' );
$check( ! $has( $css, '--sgs-me-close-' ) && ! $has( $css, 'data-sgs-motion-state' ), 'scroll entrance has no trigger rules' );
$check( ! in_array( 'sgs-motion-triggers', $GLOBALS['sgs_test_enqueued_styles'], true ), 'scroll entrance does not load the trigger stylesheet' );

// 6. No inline style anywhere.
foreach ( $markups as $i => $markup ) {
	$check( 0 === preg_match( '/\sstyle\s*=/i', $markup ), "no style attribute in markup $i" );
}

// 7. Reduced motion (FR-38A-27): the close and open name lists exist only under no-preference, so under reduce the state
// `-out` rule's `animation-name: var(--sgs-mt-out,none)` is `none` and no close keyframes play (nothing moves).
$name_list_media = static function ( string $css ): array {
	$media = array();
	$stack = array();
	$token = '';
	$len   = strlen( $css );
	for ( $i = 0; $i < $len; $i++ ) {
		$ch = $css[ $i ];
		if ( '{' === $ch ) {
			$stack[] = trim( $token );
			$token   = '';
		} elseif ( '}' === $ch ) {
			array_pop( $stack );
			$token = '';
		} elseif ( ';' === $ch ) {
			if ( 1 === preg_match( '/--sgs-mt-(?:out|in)\s*:/', $token ) ) {
				$at      = array_values( array_filter( $stack, static fn( $s ) => 0 === strpos( $s, '@media' ) ) );
				$media[] = array() === $at ? '(no media)' : $at[0];
			}
			$token = '';
		} else {
			$token .= $ch;
		}
	}
	return array_values( array_unique( $media ) );
};
$triggers_css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/css/motion-triggers.css' );
$declared_in  = $name_list_media( $triggers_css );
$check( array( '@media (prefers-reduced-motion: no-preference)' ) === $declared_in, 'the --sgs-mt-out and --sgs-mt-in name lists are declared only under no-preference: ' . json_encode( $declared_in ) );
$planted = $name_list_media( '@media (prefers-reduced-motion: reduce){ a{ --sgs-mt-out: x; } } @media (prefers-reduced-motion: no-preference){ a{ --sgs-mt-in: y; } }' );
$check( array( '@media (prefers-reduced-motion: reduce)', '@media (prefers-reduced-motion: no-preference)' ) === $planted, 'negative control: a name list planted under reduce is detected' );

echo $failures ? "FAILED: $failures of $checks checks\n" : "PASS: $checks checks\n";
exit( $failures ? 1 : 0 );

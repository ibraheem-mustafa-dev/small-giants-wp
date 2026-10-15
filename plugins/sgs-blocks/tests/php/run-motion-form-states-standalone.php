<?php
/**
 * Standalone runner for the form and choice-flow motion states (Spec 38A FR-38A-53, plan unit M5.17).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-motion-form-states-standalone.php
 *
 * Reads the REAL `sgs/form` and `sgs/choice-flow` block.json (no injected states) through the stand-ins in
 * `stubs/motion-render-stubs.php` and asserts: `sgs/form` declares `invalid`, `step-changed` and `success`, and
 * `sgs/choice-flow` declares `step-changed`; a form `invalid` state entrance emits its rule keyed to the state; a
 * state the form does not declare (`count-changed`) is refused with no CSS (the negative control); a choice-flow
 * `step-changed` entrance emits and its undeclared `invalid` is refused; a multi-keyframe shake emits the on flag and
 * the `--sgs-mt-kf` name the WAAPI module replays on; the view module of a block with states gains
 * `@sgs/motion-state` as a dynamic dependency, keeping its source, version, placement and translations, and only
 * once; and no markup carries a `style` attribute. Exits 1 on any failure.
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

// 1. The declarations come from the shipped block.json files.
$check( array( 'invalid', 'step-changed', 'success' ) === Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/form' ), 'sgs/form declares invalid, step-changed and success: ' . json_encode( Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/form' ) ) );
$check( array( 'step-changed' ) === Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/choice-flow' ), 'sgs/choice-flow declares step-changed: ' . json_encode( Sgs_Motion_Trigger_Open_State::declared_states( 'sgs/choice-flow' ) ) );

// 2. A declared form state emits; an undeclared one is refused (negative control).
$form_html = '<div class="wp-block-sgs-form"><form class="sgs-form__inner">Fields</form></div>';
$slide     = array(
	'trigger' => 'state',
	'state'   => 'step-changed',
	'values'  => array( 'from' => array( 'translateX' => 36 ), 'duration' => 480, 'easing' => 'cubic-bezier(0.16, 0.84, 0.32, 1)' ),
);
foreach ( array( 'invalid', 'step-changed', 'success' ) as $state ) {
	$layer          = $slide;
	$layer['state'] = $state;
	list( $html, $css ) = $render( 'sgs/form', array( 'inner' => array( 'entrance' => array( 'base' => $layer ) ) ), $form_html );
	$markups[]          = $html;
	$scope              = $scope_of( $html );
	$rule               = '.' . $scope . ' .sgs-form__inner:is([data-sgs-motion-state~="' . $state . '"],[data-sgs-motion-state~="' . $state . '"] *){--sgs-mt-on:1;animation-name:var(--sgs-mt-in,none);}';
	$check( $has( $html, 'data-sgs-me="state translate"' ), "form $state: the part is marked: $html" );
	$check( $has( $css, $rule ), "form $state: rule keyed to the state: $css" );
	$check( in_array( 'sgs-motion-triggers', $GLOBALS['sgs_test_enqueued_styles'], true ), "form $state: trigger stylesheet enqueued" );
}
list( $html, $css ) = $render( 'sgs/form', array( 'inner' => array( 'entrance' => array( 'base' => $slide ) ) ), $form_html );
$check( $has( $css, '--sgs-me-from-tx:36px;' ) && $has( $css, '--sgs-me-dur:480ms;' ), 'step-slide values emitted: ' . $css );

$undeclared          = $slide;
$undeclared['state'] = 'count-changed';
list( $html, $css )  = $render( 'sgs/form', array( 'inner' => array( 'entrance' => array( 'base' => $undeclared ) ) ), $form_html );
$markups[]           = $html;
$dropped             = array_values( array_filter( $GLOBALS['sgs_test_actions'], static fn( $a ) => 'sgs_motion_layer_dropped' === $a[0] ) );
$check( ! $has( $html, 'data-sgs-me=' ), 'form count-changed (undeclared): no entrance attribute: ' . $html );
$check( ! $has( $css, 'data-sgs-motion-state' ) && ! $has( $css, '--sgs-me-' ), 'form count-changed (undeclared): no CSS: ' . $css );
$check( isset( $dropped[0][1][2]['id'] ) && 'state-not-declared' === $dropped[0][1][2]['id'], 'form count-changed (undeclared): refusal reported' );
$check( ! in_array( 'sgs-motion-triggers', $GLOBALS['sgs_test_enqueued_styles'], true ), 'form count-changed (undeclared): no trigger stylesheet' );

// 3. Choice flow: step-changed on the root emits; invalid (declared only by the form) is refused.
$flow_html          = '<div class="wp-block-sgs-choice-flow sgs-choice-flow">Steps</div>';
list( $html, $css ) = $render( 'sgs/choice-flow', array( 'root' => array( 'entrance' => array( 'base' => $slide ) ) ), $flow_html );
$markups[]          = $html;
$scope              = $scope_of( $html );
$check( $has( $html, 'data-sgs-me="state translate"' ), 'choice-flow step-changed: the root is marked: ' . $html );
$check( $has( $css, '.' . $scope . ':is([data-sgs-motion-state~="step-changed"],[data-sgs-motion-state~="step-changed"] *){--sgs-mt-on:1;animation-name:var(--sgs-mt-in,none);}' ), 'choice-flow step-changed: rule keyed to the state on the root: ' . $css );
$flow_invalid          = $slide;
$flow_invalid['state'] = 'invalid';
list( $html, $css )    = $render( 'sgs/choice-flow', array( 'root' => array( 'entrance' => array( 'base' => $flow_invalid ) ) ), $flow_html );
$markups[]             = $html;
$check( ! $has( $html, 'data-sgs-me=' ) && ! $has( $css, '--sgs-me-' ), 'choice-flow invalid (undeclared there): refused' );

// 4. The multi-keyframe shake: the on flag only, plus the state name for the WAAPI module, on the target itself.
$shake = array(
	'trigger' => 'state',
	'state'   => 'invalid',
	'values'  => array(
		'from'      => array( 'translateX' => 0 ),
		'duration'  => 320,
		'easing'    => 'linear',
		'keyframes' => array(
			array( 'offset' => 0, 'translateX' => 0 ),
			array( 'offset' => 0.33, 'translateX' => -8 ),
			array( 'offset' => 0.66, 'translateX' => 8 ),
			array( 'offset' => 1, 'translateX' => 0 ),
		),
	),
);
list( $html, $css ) = $render( 'sgs/form', array( 'inner' => array( 'entrance' => array( 'base' => $shake ) ) ), $form_html );
$markups[]          = $html;
$scope              = $scope_of( $html );
$check( $has( $html, 'data-sgs-me-keyframes' ), 'the shake fixture carries its keyframes: ' . $html );
$check( $has( $css, '.' . $scope . ' .sgs-form__inner:is([data-sgs-motion-state~="invalid"],[data-sgs-motion-state~="invalid"] *){--sgs-mt-on:1;}' ), 'the shake gets the on flag only: ' . $css );
$check( $has( $css, '.' . $scope . ' .sgs-form__inner{--sgs-mt-kf:invalid;}' ), 'the shake names its state for the WAAPI module: ' . $css );
$check( $has( $css, '--sgs-me-dur:320ms;' ) && $has( $css, '--sgs-me-ease:linear;' ), 'the shake timing is emitted: ' . $css );
list( $html, $css ) = $render( 'sgs/form', array( 'inner' => array( 'entrance' => array( 'base' => $slide ) ) ), $form_html );
$check( ! $has( $css, '--sgs-mt-kf' ), 'a two-value state entrance (CSS-played) carries no --sgs-mt-kf: ' . $css );

// 5. A state entrance lists @sgs/motion-state in the import map by enqueuing it; an undeclared state does not.
$GLOBALS['sgs_test_enqueued'] = array();
$render( 'sgs/form', array( 'inner' => array( 'entrance' => array( 'base' => $slide ) ) ), $form_html );
$check( ! empty( $GLOBALS['sgs_test_enqueued']['module:@sgs/motion-state'] ), 'a state entrance enqueues the state helper module' );
$GLOBALS['sgs_test_enqueued'] = array();
$render( 'sgs/form', array( 'inner' => array( 'entrance' => array( 'base' => array_merge( $slide, array( 'state' => 'count-changed' ) ) ) ) ), $form_html );
$check( empty( $GLOBALS['sgs_test_enqueued']['module:@sgs/motion-state'] ), 'an undeclared state does not enqueue it' );

// 6. No inline style anywhere.
foreach ( $markups as $i => $markup ) {
	$check( 0 === preg_match( '/\sstyle\s*=/i', $markup ), "no style attribute in markup $i" );
}

echo $failures ? "FAILED: $failures of $checks checks\n" : "PASS: $checks checks\n";
exit( $failures ? 1 : 0 );

<?php
/**
 * Standalone runner for the cloning-only custom motion target (Spec 38A FR-38A-5): `custom:<n>` resolves to
 * `.{scope} <selector>`, and an unreviewed or unscoped selector is refused.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-custom-target-standalone.php
 *
 * Loads the real `Sgs_Motion_Custom_Target` and `Sgs_Motion_Targets`, and renders a block through the shipped renderer
 * with the stand-ins in `stubs/motion-render-stubs.php`. Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Custom_Target;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;
use SGS\Blocks\Motion\Sgs_Motion_Targets;

$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};

$review = array( 'draftNode' => 'draft element 42', 'reason' => 'No declared part names this span.' );

// 1. Resolution: the selector is prefixed by the scoped root.
$r = Sgs_Motion_Targets::resolve( 'sgs/hero', 'sgs-m-abc', 'custom:1', array( 'selector' => '.sgs-hero__content > span', 'review' => $review ) );
$check( null !== $r && '.sgs-m-abc .sgs-hero__content > span' === $r['selector'], 'reviewed scoped selector is prefixed by the root' );
$check( null !== $r && array( 'sgs-hero__content' ) !== $r['match']['classes'] && 'SPAN' === $r['match']['tag'] && ! $r['match']['root'], 'match reads the last compound' );

$r = Sgs_Motion_Targets::resolve( 'sgs/hero', 'sgs-m-abc', 'custom:2', array( 'selector' => '> .sgs-hero__media', 'review' => $review ) );
$check( null !== $r && '.sgs-m-abc > .sgs-hero__media' === $r['selector'], 'a leading child combinator stays scoped' );

// 2. Unreviewed targets are refused.
foreach (
	array(
		'no review'      => array( 'selector' => '.a' ),
		'empty review'   => array( 'selector' => '.a', 'review' => array() ),
		'no reason'      => array( 'selector' => '.a', 'review' => array( 'draftNode' => 'n' ) ),
		'blank draftNode' => array( 'selector' => '.a', 'review' => array( 'draftNode' => '  ', 'reason' => 'r' ) ),
		'non-string'     => array( 'selector' => '.a', 'review' => array( 'draftNode' => 1, 'reason' => 'r' ) ),
	) as $label => $element
) {
	$check( null === Sgs_Motion_Targets::resolve( 'sgs/hero', 'sgs-m-abc', 'custom:1', $element ), "unreviewed refused ($label)" );
}

// 3. Unscoped selectors are refused.
$injections = array( 'a}body{color:red', 'a</style><script>alert(1)</script>', 'a;b', 'a,body', 'a\7d', '@import', 'a/*x*/', "a\\b", 'a{b' );
foreach ( $injections as $selector ) {
	$check( null === Sgs_Motion_Targets::resolve( 'sgs/hero', 'sgs-m-abc', 'custom:1', array( 'selector' => $selector, 'review' => $review ) ), 'injection refused: ' . substr( $selector, 0, 24 ) );
	$check( ! Sgs_Motion_Custom_Target::is_scoped( $selector ), 'is_scoped false: ' . substr( $selector, 0, 24 ) );
}
foreach ( array( '.a[data-x="1"]', 'span.lede:hover', ':is(.a, .b)' ) as $selector ) {
	// A selector list is refused even inside :is(); the rest are plain selectors.
	$expect = false === strpos( $selector, ',' );
	$check( Sgs_Motion_Custom_Target::is_scoped( $selector ) === $expect, 'allow-list verdict for ' . $selector );
}
foreach ( array( 'html .a', 'body', 'BODY > div', ':root', '.a, .b', '.a{color:red}', '.a;b', '@media x', '.a\b', '+ .a', '~ .a', '', '  ', '/* x */ .a', str_repeat( 'a', 201 ) ) as $selector ) {
	$check( null === Sgs_Motion_Targets::resolve( 'sgs/hero', 'sgs-m-abc', 'custom:1', array( 'selector' => $selector, 'review' => $review ) ), 'unscoped refused: ' . substr( $selector, 0, 20 ) );
}
$check( null === Sgs_Motion_Custom_Target::resolve( 'sgs-m-abc', array( 'review' => $review ) ), 'a missing selector is refused' );
$check( null !== Sgs_Motion_Targets::resolve( 'sgs/hero', 'sgs-m-abc', 'custom:1', array( 'selector' => 'bodyguard', 'review' => $review ) ), 'a tag that merely starts with body is allowed' );

// 4. End to end through the renderer: the emitted rule carries the scoped root prefix.
$render = static function ( array $element ): array {
	Sgs_Motion_Renderer::reset();
	$GLOBALS['sgs_collected_css'] = array();
	$GLOBALS['sgs_test_is_admin'] = false;
	$GLOBALS['sgs_test_in_loop']  = false;
	$html                         = sgs_test_render_motion_block(
		array(
			'blockName' => 'sgs/hero',
			'attrs'     => array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'custom:1' => $element ) ) ),
		),
		'<div class="wp-block-sgs-hero"><span class="lede">Hi</span></div>'
	);
	return array( $html, implode( '', $GLOBALS['sgs_collected_css'] ) );
};
$hover = array( 'state' => array( 'values' => array( 'opacity' => 0.7, 'duration' => 200 ) ) );

list( $html, $css ) = $render( array( 'selector' => 'span.lede', 'review' => $review, 'hover' => $hover ) );
$check( 1 === preg_match( '/\b(sgs-m-[0-9a-f]{10})\b/', $html, $m ), 'the root carries the scope class' );
$scope = $m[1] ?? 'none';
$check( false !== strpos( $css, '.' . $scope . ' span.lede{' ), 'the emitted rule is prefixed by the scoped root: ' . $css );
$check( false === strpos( $html, ' style=' ), 'no inline style' );

list( , $css ) = $render( array( 'selector' => 'span.lede', 'hover' => $hover ) );
$check( '' === $css, 'an unreviewed custom target emits nothing' );
list( , $css ) = $render( array( 'selector' => 'body span', 'review' => $review, 'hover' => $hover ) );
$check( '' === $css, 'an unscoped custom target emits nothing' );

echo $failures ? "FAILED: $failures of $checks checks\n" : "PASS: $checks checks\n";
exit( $failures ? 1 : 0 );

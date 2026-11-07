<?php
/**
 * Standalone runner: the timeline's entry image and the post grid's filter buttons are motion targets.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-declared-parts-standalone.php
 *
 * Renders each block through the shipped motion renderer with the stand-ins in `stubs/motion-render-stubs.php`.
 * Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

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

$timeline = '<div class="sgs-timeline wp-block-sgs-timeline"><ol><li class="sgs-timeline__entry"><div class="sgs-timeline__media-slot"><img src="a.jpg" alt="" /></div><div class="sgs-timeline__content"></div></li></ol></div>';
$post_grid = '<div class="sgs-post-grid wp-block-sgs-post-grid"><div class="sgs-post-grid__filters"><button type="button" class="sgs-post-grid__filter">All</button></div></div>';
$hover    = array( 'hover' => array( 'state' => array( 'source' => 'self', 'values' => array( 'scale' => 1.05 ) ) ) );
$entrance = array( 'entrance' => array( 'base' => array( 'trigger' => 'scroll', 'values' => array( 'from' => array( 'opacity' => 0 ), 'duration' => 600 ) ) ) );

$render = static function ( string $block, string $markup, array $elements ): string {
	Sgs_Motion_Renderer::reset();
	$GLOBALS['sgs_collected_css'] = array();
	$GLOBALS['sgs_test_is_admin'] = false;
	$GLOBALS['sgs_test_actions']  = array();
	$html = sgs_test_render_motion_block(
		array(
			'blockName' => $block,
			'attrs'     => array( 'sgsMotion' => array( 'v' => 1, 'elements' => $elements ) ),
		),
		$markup
	);
	return implode( '', $GLOBALS['sgs_collected_css'] ) . "\n" . (string) $html;
};

// Declared parts.
$check( array_key_exists( 'image', Sgs_Motion_Targets::parts( 'sgs/timeline' ) ), 'timeline declares the image part' );
$check( array_key_exists( 'filter', Sgs_Motion_Targets::parts( 'sgs/post-grid' ) ), 'post-grid declares the filter part' );
$check( ! array_key_exists( 'connector', Sgs_Motion_Targets::parts( 'sgs/timeline' ) ), 'negative control: connector stays out' );

// Timeline entry image: hover and entrance both print on the slot.
$out = $render( 'sgs/timeline', $timeline, array( 'image' => $hover ) );
$check( 1 === preg_match( '/\.sgs-timeline__media-slot[^{]*\{[^}]*--sgs-mh-to-s:1\.05;/', $out ), 'timeline image hover prints on the media slot' );
$out = $render( 'sgs/timeline', $timeline, array( 'image' => $entrance ) );
$check( false !== strpos( $out, '.sgs-timeline__media-slot' ) && false !== strpos( $out, 'data-sgs-me' ), 'timeline image entrance prints and marks the slot' );

// Post grid filter chips.
$out = $render( 'sgs/post-grid', $post_grid, array( 'filter' => $hover ) );
$check( 1 === preg_match( '/\.sgs-post-grid__filter[^{]*\{[^}]*--sgs-mh-to-s:1\.05;/', $out ), 'post-grid filter hover prints on the chips' );
$out = $render( 'sgs/post-grid', $post_grid, array( 'filter' => $entrance ) );
$check( false !== strpos( $out, '.sgs-post-grid__filter' ), 'post-grid filter entrance prints' );

// Negative control: a part the block marks not-a-target prints nothing.
$out = $render( 'sgs/timeline', $timeline, array( 'connector' => $hover ) );
$check( false === strpos( $out, '--sgs-mh-to-s:1.05' ), 'negative control: connector hover prints nothing' );

echo $failures ? "FAILED: $failures of $checks\n" : "PASS: $checks checks\n";
exit( $failures ? 1 : 0 );

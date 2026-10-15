<?php
/**
 * Standalone runner for "Apply entrance to children" on server-rendered lists (Spec 38A §8, FR-38A-8).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-loop-inherit-standalone.php
 *
 * Runs the shipped `Sgs_Motion_Loop_Inherit`, `Sgs_Motion_Loop_Delays` and motion renderer with the stand-ins in
 * `stubs/motion-render-stubs.php`. Asserts:
 * - two grids of one block type, their inherited entrances pending at once (a grid rendered inside another's render
 *   callback), each stamp their own items with their own entrance, and a third grid takes neither;
 * - an inherited page-load entrance on a grid in the page's first section keeps its items visible (from-opacity 1,
 *   the LCP rule), and the same grid further down fades from 0;
 * - with `apply` on, the container's own entrance plays on the children only: the container root carries no entrance,
 *   the items do, and the assets the items need are enqueued; with `apply` off the container keeps its entrance;
 * - "load more": the attributes a post-grid's cards inherit are computed once on the first render, carried through the
 *   query data, validated on the way back, and stamped on the fetched cards; the REST handler and the view script are
 *   wired to them.
 * Negative controls: `apply` off inherits nothing; a forged attribute name or value is refused.
 * Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Loop_Delays;
use SGS\Blocks\Motion\Sgs_Motion_Loop_Inherit;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};
$reset = static function (): void {
	$GLOBALS['sgs_collected_css'] = array();
	$GLOBALS['sgs_test_is_admin'] = false;
	$GLOBALS['sgs_test_rest']     = false;
	$GLOBALS['sgs_test_in_loop']  = false;
	$GLOBALS['sgs_test_enqueued'] = array();
	Sgs_Motion_Renderer::reset();
};
$css = static function (): string {
	return implode( '', $GLOBALS['sgs_collected_css'] ?? array() );
};
$layer = static function ( string $trigger, array $from ): array {
	return array(
		'trigger' => $trigger,
		'values'  => array(
			'from'     => $from,
			'to'       => array(),
			'duration' => 400,
			'delay'    => 120,
		),
	);
};
$grid = static function ( ?bool $apply, array $base ): array {
	$stagger = array( 'step' => 80 );
	if ( null !== $apply ) {
		$stagger['apply'] = $apply;
	}
	return array(
		'source'    => 'manual',
		'columns'   => 3,
		'sgsMotion' => array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ),
			'stagger'  => $stagger,
		),
	);
};
$items = static function ( string $uid ): string {
	return '<div class="sgs-card-grid ' . $uid . '"><div class="sgs-card-grid__item" data-sgs-loop-i="0">A</div><div class="sgs-card-grid__item" data-sgs-loop-i="1">B</div></div>';
};
$scroll_fade = $layer( 'scroll', array( 'opacity' => 0, 'translateY' => 28 ) );
$load_fade   = $layer( 'load', array( 'opacity' => 0 ) );

// 1. Item 12: two grids of one type pending at once each stamp their own items.
$reset();
Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-a', $grid( true, $scroll_fade ), 2, '.sgs-card-grid__item' );
Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-b', $grid( true, $load_fade ), 2, '.sgs-card-grid__item' );
$out_c = Sgs_Motion_Loop_Inherit::stamp( $items( 'sgs-cg-c' ), array( 'blockName' => 'sgs/card-grid' ) );
$out_b = Sgs_Motion_Loop_Inherit::stamp( $items( 'sgs-cg-b' ), array( 'blockName' => 'sgs/card-grid' ) );
$out_a = Sgs_Motion_Loop_Inherit::stamp( $items( 'sgs-cg-a' ), array( 'blockName' => 'sgs/card-grid' ) );
$check( $items( 'sgs-cg-c' ) === $out_c, 'per instance: a grid with nothing pending takes no other grid\'s entrance' );
$check( 2 === substr_count( $out_b, 'data-sgs-me="load opacity"' ) && false === strpos( $out_b, 'scroll' ), 'per instance: the inner grid\'s items carry its own entrance, not the outer grid\'s: ' . $out_b );
$check( 2 === substr_count( $out_a, 'data-sgs-me="scroll translate opacity"' ), 'per instance: the outer grid\'s items are still stamped after the inner grid rendered: ' . $out_a );

// 2. Item 9: the LCP rule on inherited page-load entrances.
$first_section_css = static function ( bool $first ) use ( $reset, $css, $grid, $load_fade ): string {
	$reset();
	$attrs = $grid( true, $load_fade );
	$block = array( 'blockName' => 'sgs/card-grid', 'attrs' => $attrs );
	if ( $first ) {
		$GLOBALS['sgs_test_in_loop'] = true;
		Sgs_Motion_Renderer::arm_first_section( '' );
	}
	Sgs_Motion_Renderer::open_frame( $block, $block, null );
	Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-l1', $attrs, 2, '.sgs-card-grid__item' );
	Sgs_Motion_Loop_Inherit::stamp( $GLOBALS['sgs_test_items_l1'] ?? '', array( 'blockName' => 'sgs/card-grid' ) );
	Sgs_Motion_Renderer::close_frame( '', $block );
	return $css();
};
$above = $first_section_css( true );
$below = $first_section_css( false );
$check( 1 === preg_match( '/\.sgs-cg-l1 \.sgs-card-grid__item\{[^}]*--sgs-me-from-op:1[;}]/', $above ), 'LCP: an inherited load fade on a first-section grid keeps its items at opacity 1: ' . $above );
$check( 1 === preg_match( '/\.sgs-cg-l1 \.sgs-card-grid__item\{[^}]*--sgs-me-from-op:0[;}]/', $below ), 'LCP negative control: the same grid below the first section fades from 0: ' . $below );

// 3. Item 10: with apply on the container's entrance plays on the children only.
$render_container = static function ( ?bool $apply ) use ( $reset, $grid, $scroll_fade ): array {
	$reset();
	$attrs = $grid( $apply, $scroll_fade );
	$block = array( 'blockName' => 'sgs/card-grid', 'attrs' => $attrs );
	$html  = sgs_test_render_motion_block(
		$block,
		'<div class="sgs-card-grid sgs-cg-r1"><div class="sgs-card-grid__item" data-sgs-loop-i="0">A</div></div>'
	);
	return array( $html, Sgs_Motion_Renderer::used_features() );
};
list( $on_html ) = $render_container( true );
list( $off_html ) = $render_container( false );
$check( 1 === preg_match( '/^<div [^>]*class="sgs-card-grid /', $on_html ) && 1 !== preg_match( '/^<div [^>]*data-sgs-me=/', $on_html ), 'apply on: the container root plays no entrance of its own: ' . $on_html );
$check( 1 === preg_match( '/^<div [^>]*data-sgs-me="scroll translate opacity"/', $off_html ), 'apply off negative control: the container keeps its own entrance: ' . $off_html );
$reset();
Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-r2', $grid( true, $scroll_fade ), 2, '.sgs-card-grid__item' );
$used = Sgs_Motion_Renderer::used_features();
$check( ! empty( $used['reveal'] ) && ! empty( $used['css'] ), 'apply on: the items\' inherited scroll entrance enqueues the reveal script and the stylesheet itself: ' . json_encode( $used ) );
Sgs_Motion_Loop_Inherit::stamp( '', array( 'blockName' => 'sgs/card-grid' ) );

// 4. Item 8: the post-grid cards fetched by load more take the same inherited entrance.
$pg = array(
	'layout'    => 'grid',
	'columns'   => array( 'desktop' => 3 ),
	'sgsMotion' => array(
		'v'        => 1,
		'elements' => array( 'root' => array( 'entrance' => array( 'base' => $scroll_fade ) ) ),
		'stagger'  => array( 'apply' => true, 'step' => 80 ),
	),
);
$reset();
$carried = Sgs_Motion_Loop_Inherit::item_attrs( 'sgs/post-grid', $pg, '.sgs-post-grid__card' );
$check( array( 'data-sgs-me' => 'scroll translate opacity' ) === $carried, 'load more: the first render computes the cards\' inherited attributes: ' . json_encode( $carried ) );
$off = $pg;
$off['sgsMotion']['stagger']['apply'] = false;
$check( array() === Sgs_Motion_Loop_Inherit::item_attrs( 'sgs/post-grid', $off, '.sgs-post-grid__card' ), 'load more negative control: apply off carries nothing' );
$decoded = Sgs_Motion_Loop_Inherit::decode_attrs( (string) json_encode( $carried ) );
$check( $carried === $decoded, 'load more: the carried attributes survive the round trip through the query data' );
$fetched = '<article class="sgs-post-grid__card" data-sgs-loop-i="0"><h3 class="sgs-post-grid__title">One</h3></article><article class="sgs-post-grid__card" data-sgs-loop-i="1">Two</article>';
$stamped = Sgs_Motion_Loop_Inherit::stamp_class( $fetched, 'sgs-post-grid__card', $decoded );
$check( 2 === substr_count( $stamped, 'data-sgs-me="scroll translate opacity"' ), 'load more: every fetched card carries the inherited entrance: ' . $stamped );
$check( $fetched === Sgs_Motion_Loop_Inherit::stamp_class( $fetched, 'sgs-post-grid__card', array() ), 'load more: nothing carried stamps nothing' );
$kf = array( 'data-sgs-me' => 'scroll opacity', 'data-sgs-me-keyframes' => '[{"--sgs-me-op":"0"},{"offset":0.5,"--sgs-me-op":"0.4"},{"--sgs-me-op":"1"}]' );
$check( $kf === Sgs_Motion_Loop_Inherit::decode_attrs( (string) json_encode( $kf ) ), 'load more: a keyframes attribute round-trips' );
foreach ( array(
	'{"onclick":"alert(1)"}',
	'{"data-sgs-me":"scroll\" onmouseover=\"x"}',
	'{"data-sgs-me":"Scroll OPACITY"}',
	'{"data-sgs-me-keyframes":"not json"}',
	'["data-sgs-me"]',
	'not json',
) as $forged ) {
	$check( array() === Sgs_Motion_Loop_Inherit::decode_attrs( $forged ), "load more: a forged or malformed value carries nothing: $forged" );
}

// Wiring: the first render carries the attributes, the view script sends them, the REST handler stamps them.
$plugin = dirname( __DIR__, 2 );
$render = (string) file_get_contents( $plugin . '/src/blocks/post-grid/render.php' );
$rest   = (string) file_get_contents( $plugin . '/includes/class-post-grid-rest.php' );
$fetch  = (string) file_get_contents( $plugin . '/src/blocks/post-grid/view-fetch.js' );
$check( 1 === preg_match( "/'itemMotion'\s*=>[^\\n]*\\\$sgs_pg_item_motion/", $render ) && false !== strpos( $render, "Sgs_Motion_Loop_Inherit::item_attrs( 'sgs/post-grid'" ), 'wiring: render.php puts the cards\' inherited attributes in the query data' );
$check( 1 === preg_match( '/itemMotion:\s+queryData\.itemMotion/', $fetch ), 'wiring: view-fetch.js sends itemMotion to the REST route' );
$check( false !== strpos( $rest, "'itemMotion'" ) && false !== strpos( $rest, 'Sgs_Motion_Loop_Inherit::stamp_class(' ) && false !== strpos( $rest, 'Sgs_Motion_Loop_Inherit::decode_attrs(' ), 'wiring: the REST handler declares itemMotion and stamps the fetched cards' );

echo ( 0 === $failures ? 'PASS' : 'FAIL' ) . ": $checks checks, $failures failures\n";
exit( 0 === $failures ? 0 : 1 );

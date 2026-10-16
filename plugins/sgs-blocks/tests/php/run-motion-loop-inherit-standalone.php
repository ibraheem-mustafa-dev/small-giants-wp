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
 * - the container's entrance moves only when an item takes it: items with their own entrance, a grid with no items, a
 *   post grid with no posts and an inner-block container with no children keep it (council A1); an `open` entrance
 *   moves to a menu's items and plays under the drawer's state host (A2);
 * - the carried attributes' grammar is exact (no trailing newline, keyframes only as the emitter writes them), and
 *   every channel and trigger an inherited entrance can write round-trips (S1, S2, C3);
 * - a post grid whose first page is empty still emits the cards' rule for cards fetched later (C4);
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
		'<div class="sgs-card-grid sgs-cg-r1"><div class="sgs-card-grid__item" data-sgs-loop-i="0">A</div></div>',
		null,
		static function () use ( $attrs ): void {
			Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-r1', $attrs, 1, '.sgs-card-grid__item' );
		}
	);
	Sgs_Motion_Loop_Inherit::stamp( '<div class="sgs-cg-r1"></div>', $block );
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

// 5. The container's entrance moves only when an item actually takes it (council A1): the block renders its items
// inside its own frame, so the renderer reads the hand-over the render recorded.
$render_with = static function ( string $name, array $attrs, string $html, ?callable $inner, array $inner_blocks = array() ): string {
	$block = array(
		'blockName'   => $name,
		'attrs'       => $attrs,
		'innerBlocks' => $inner_blocks,
	);
	return sgs_test_render_motion_block( $block, $html, null, $inner );
};
$root_plays = static function ( string $html ): bool {
	return 1 === preg_match( '/^<div [^>]*data-sgs-me=/', $html );
};
$one_item = static function ( string $uid ): string {
	return '<div class="sgs-card-grid ' . $uid . '"><div class="sgs-card-grid__item" data-sgs-loop-i="0">A</div></div>';
};

$reset();
$own_attrs = $grid( true, $scroll_fade );
$own_attrs['sgsMotion']['elements']['item'] = array( 'entrance' => array( 'base' => $load_fade ) );
$own_html = $render_with(
	'sgs/card-grid',
	$own_attrs,
	$one_item( 'sgs-cg-o1' ),
	static function () use ( $own_attrs ): void {
		Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-o1', $own_attrs, 1, '.sgs-card-grid__item' );
	}
);
$check( $root_plays( $own_html ), 'test_container_entrance_survives_when_items_keep_their_own_entrance: the item part keeps its own entrance, so the container keeps its: ' . $own_html );

$reset();
$moved_attrs = $grid( true, $scroll_fade );
$moved_html  = $render_with(
	'sgs/card-grid',
	$moved_attrs,
	$one_item( 'sgs-cg-o2' ),
	static function () use ( $moved_attrs ): void {
		Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-o2', $moved_attrs, 1, '.sgs-card-grid__item' );
	}
);
$check( ! $root_plays( $moved_html ), 'positive control: items that take the entrance move it off the container: ' . $moved_html );
Sgs_Motion_Loop_Inherit::stamp( $one_item( 'sgs-cg-o2' ), array( 'blockName' => 'sgs/card-grid' ) );

$reset();
$empty_html = $render_with(
	'sgs/card-grid',
	$moved_attrs,
	'<div class="sgs-card-grid sgs-cg-o3"></div>',
	static function () use ( $moved_attrs ): void {
		Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-o3', $moved_attrs, 0, '.sgs-card-grid__item' );
	}
);
$check( $root_plays( $empty_html ), 'test_container_entrance_survives_with_no_items: a grid with no items keeps its entrance: ' . $empty_html );

$reset();
$zero_html = $render_with(
	'sgs/post-grid',
	$pg,
	'<div class="sgs-post-grid sgs-pg-z1"><div class="sgs-post-grid__inner"></div></div>',
	static function () use ( $pg ): void {
		Sgs_Motion_Loop_Delays::post_grid( 'sgs-pg-z1', $pg, 0 );
	}
);
$check( $root_plays( $zero_html ), 'test_container_entrance_survives_with_zero_posts: a post grid with no posts keeps its entrance: ' . $zero_html );

// Inner-block containers: the editor wrote the entrance onto the children (stagger-write.js), so the container moves it
// whenever it has children; with none it keeps it.
$container_attrs = array(
	'sgsMotion' => array(
		'v'        => 1,
		'elements' => array( 'root' => array( 'entrance' => array( 'base' => $scroll_fade ) ) ),
		'stagger'  => array( 'apply' => true, 'step' => 80 ),
	),
);
$reset();
$with_children = $render_with( 'sgs/container', $container_attrs, '<div class="sgs-container"><p>A</p></div>', null, array( array( 'blockName' => 'core/paragraph' ) ) );
$check( ! $root_plays( $with_children ), 'inner blocks: a container with children moves its entrance to them: ' . $with_children );
$reset();
$no_children = $render_with( 'sgs/container', $container_attrs, '<div class="sgs-container"></div>', null );
$check( $root_plays( $no_children ), 'inner blocks: a container with no children keeps its entrance: ' . $no_children );

// 6. Council A2: an `open` entrance moves too, because the items play it under the same state host as the container
// (the drawer dialog carries data-sgs-motion-state; the open rules match the host and every element inside it).
$reset();
$open_fade = array(
	'trigger' => 'open',
	'values'  => array(
		'from'     => array( 'opacity' => 0, 'translateX' => -16 ),
		'to'       => array(),
		'duration' => 300,
	),
);
$menu = array(
	'sgsMotion' => array(
		'v'        => 1,
		'elements' => array( 'root' => array( 'entrance' => array( 'base' => $open_fade ) ) ),
		'stagger'  => array( 'apply' => true, 'step' => 60 ),
	),
);
$menu_items = '<ul class="sgs-nav-drawer-menu sgs-nm-o1"><li class="sgs-nav-drawer-menu__item" data-sgs-loop-i="0">A</li><li class="sgs-nav-drawer-menu__item" data-sgs-loop-i="1">B</li></ul>';
$menu_html  = sgs_test_render_motion_block(
	array( 'blockName' => 'sgs/nav-drawer-menu', 'attrs' => $menu, 'innerBlocks' => array() ),
	$menu_items,
	null,
	static function () use ( $menu ): void {
		Sgs_Motion_Loop_Delays::item_array( 'sgs/nav-drawer-menu', 'sgs-nm-o1', $menu, 2, '.sgs-nav-drawer-menu__item' );
	}
);
$menu_out = Sgs_Motion_Loop_Inherit::stamp( $menu_html, array( 'blockName' => 'sgs/nav-drawer-menu' ) );
$check( 2 === substr_count( $menu_out, 'data-sgs-me="open translate opacity"' ), 'open: every menu item takes the container\'s open entrance: ' . $menu_out );
$check( 1 !== preg_match( '/^<ul [^>]*data-sgs-me=/', $menu_out ), 'open: the menu root no longer plays it: ' . $menu_out );
$check( 1 === preg_match( '/\.sgs-nm-o1 \.sgs-nav-drawer-menu__item\{[^}]*--sgs-me-from-tx:-16px/', $css() ), 'open: the items\' scoped rule carries the open entrance values' );
$triggers_css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/css/motion-triggers.css' );
$check( false !== strpos( $triggers_css, '[data-sgs-me~="open"]:not([data-sgs-me-keyframes]):is([data-sgs-motion-state~="open"], [data-sgs-motion-state~="open"] *)' ), 'open: the open rule matches an item anywhere inside the state host' );

// 7. Council S1, S2: the carried attributes' grammar is exact.
foreach ( array(
	'{"data-sgs-me":"load\n"}',
	'{"data-sgs-me":"load opacity\n"}',
	'{"data-sgs-me":"scroll opacity","data-sgs-me-keyframes":"[1,2]"}',
	'{"data-sgs-me":"scroll opacity","data-sgs-me-keyframes":"[{\"onclick\":\"x\"}]"}',
	'{"data-sgs-me":"scroll opacity","data-sgs-me-keyframes":"[{\"--sgs-me-op\":{\"a\":1}}]"}',
	'{"data-sgs-me":"scroll opacity","data-sgs-me-keyframes":"[{\"--sgs-me-op\":\"' . str_repeat( '9', 200 ) . '\"}]"}',
	'{"data-sgs-me":"scroll opacity","data-sgs-me-keyframes":"[{\"offset\":\"0.5\"}]"}',
	'{"data-sgs-me":"scroll opacity","data-sgs-me-keyframes":' . json_encode( (string) json_encode( array_fill( 0, 17, array( '--sgs-me-op' => '1' ) ) ) ) . '}',
) as $forged ) {
	$check( array() === Sgs_Motion_Loop_Inherit::decode_attrs( $forged ), "grammar: refused $forged" );
}

// 8. Council C3: every channel and trigger an inherited entrance can write survives the round trip through the query
// data (iterated from the emitter's own fields, so a channel added later is covered).
$value_for = array(
	'opacity'    => 0,
	'translateX' => 12,
	'translateY' => 12,
	'scale'      => 0.9,
	'scaleX'     => 0.9,
	'scaleY'     => 0.9,
	'rotate'     => 10,
	'rotateX'    => 10,
	'rotateY'    => 10,
	'blur'       => 4,
	'clip'       => 20,
);
foreach ( \SGS\Blocks\Motion\Sgs_Motion_Emitter::fields( 'EntranceFrom' ) as $key => $field ) {
	if ( null === ( $field['css'] ?? null ) ) {
		continue;
	}
	$check( array_key_exists( $key, $value_for ), "channels: a test value exists for the entrance field $key" );
	foreach ( array( 'load', 'scroll', 'open' ) as $trigger ) {
		$probe                                         = $pg;
		$probe['sgsMotion']['elements']['root']        = array( 'entrance' => array( 'base' => $layer( $trigger, array( $key => $value_for[ $key ] ?? 0 ) ) ) );
		$carried_probe                                 = Sgs_Motion_Loop_Inherit::item_attrs( 'sgs/post-grid', $probe, '.sgs-post-grid__card' );
		$check( isset( $carried_probe['data-sgs-me'] ) && $carried_probe === Sgs_Motion_Loop_Inherit::decode_attrs( (string) json_encode( $carried_probe ) ), "channels: $trigger $key round-trips: " . json_encode( $carried_probe ) );
	}
}
$kf_probe                                  = $pg;
$kf_probe['sgsMotion']['elements']['root'] = array(
	'entrance' => array(
		'base' => array(
			'trigger' => 'scroll',
			'values'  => array(
				'from'      => array(),
				'to'        => array(),
				'keyframes' => array(
					array( 'offset' => 0, 'opacity' => 0, 'translateY' => 20, 'scale' => 0.9, 'rotate' => 5, 'rotateX' => 5, 'blur' => 4, 'clip' => 10 ),
					array( 'offset' => 50, 'opacity' => 0.5 ),
					array( 'offset' => 100, 'opacity' => 1, 'translateY' => 0 ),
				),
			),
		),
	),
);
$kf_carried = Sgs_Motion_Loop_Inherit::item_attrs( 'sgs/post-grid', $kf_probe, '.sgs-post-grid__card' );
$check( isset( $kf_carried['data-sgs-me-keyframes'] ) && $kf_carried === Sgs_Motion_Loop_Inherit::decode_attrs( (string) json_encode( $kf_carried ) ), 'channels: a multi-keyframe entrance on every channel round-trips: ' . json_encode( $kf_carried ) );

// 9. Council C4: a post grid whose first page is empty still emits its cards' rule, so cards fetched later play.
$reset();
Sgs_Motion_Loop_Delays::post_grid( 'sgs-pg-z2', $pg, 0 );
$check( 1 === preg_match( '/\.sgs-pg-z2 \.sgs-post-grid__card\{[^}]*--sgs-me-from-op:0/', $css() ), 'empty first page: the cards\' inherited rule is emitted for cards fetched later: ' . $css() );
$check( ! empty( Sgs_Motion_Renderer::used_features()['reveal'] ), 'empty first page: the reveal script is enqueued for cards fetched later' );
Sgs_Motion_Loop_Inherit::stamp( '<div class="sgs-pg-z2"></div>', array( 'blockName' => 'sgs/post-grid' ) );
$interior = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/post-grid/render-interior.php' );
$check( false === strpos( (string) strstr( $interior, 'Sgs_Motion_Loop_Delays::post_grid(', true ), 'if ( $query->have_posts() ) {' ), 'wiring: render-interior.php calls post_grid() before its have_posts() branch, so an empty page still emits the rule' );

echo ( 0 === $failures ? 'PASS' : 'FAIL' ) . ": $checks checks, $failures failures\n";
exit( 0 === $failures ? 0 : 1 );

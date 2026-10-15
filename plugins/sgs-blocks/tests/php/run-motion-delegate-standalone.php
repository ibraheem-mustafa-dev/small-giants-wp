<?php
/**
 * Standalone runner for delegated parts and "Apply entrance to children" on server-rendered lists (Spec 38A §6.2, §8).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-delegate-standalone.php
 *
 * Runs the shipped `src/blocks/card-grid/render-delegated.php` partial (wc-product and cpt-collection modes) with the
 * shipped `Sgs_Motion_Delegate`, `Sgs_Motion_Loop_Inherit`, `Sgs_Motion_Loop_Delays` and motion renderer, and stand-ins
 * for the query, wrapper and `render_block()`. Asserts:
 * - the grid's `title` entrance and hover reach every product card's `.sgs-product-card__title`, and the grid's `item`
 *   layer reaches the card root; an unmapped grid part (`subtitle`) reaches nothing; the card's own layers win;
 * - every delegated card gets its loop index and its own `--sgs-me-delay` rule;
 * - with `apply` on, each card (delegated) and each manual item part takes the container's entrance, delays removed,
 *   the container keeps its own; with `apply` off nothing is inherited and the delays are exactly those of a stagger
 *   with no `apply` key; an item part with its own entrance inherits nothing;
 * - each item-array caller's item selector resolves to its declared part.
 * Negative controls: a grid in manual mode hands nothing to a card; a stagger with `apply` off gives cards no entrance.
 * Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

namespace SGS\Blocks {
	if ( ! class_exists( __NAMESPACE__ . '\Card_Grid_Products' ) ) {
		class Card_Grid_Products {
			public static function get_product_ids( array $attributes ): array {
				return $GLOBALS['sgs_test_product_ids'] ?? array();
			}
		}
	}
	if ( ! class_exists( __NAMESPACE__ . '\CPT_Collection_Query' ) ) {
		class CPT_Collection_Query {
			public static function get_results( array $attributes, array $args ): array {
				$posts = array();
				foreach ( $GLOBALS['sgs_test_product_ids'] ?? array() as $id ) {
					$posts[] = (object) array( 'ID' => $id, 'post_type' => 'sgs_product' );
				}
				return array( 'posts' => $posts, 'max_num_pages' => 1, 'paged' => 1 );
			}
		}
	}
	if ( ! class_exists( __NAMESPACE__ . '\Grid_Pagination' ) ) {
		class Grid_Pagination {
			const MODE_LINK = 'link';
			public static function page_var( string $uid ): string {
				return 'sgs-page-' . $uid;
			}
			public static function current_page_from_request( string $var ): int {
				return 1;
			}
			public static function render( array $args ): string {
				return '<nav class="sgs-card-grid__pagination"></nav>';
			}
		}
	}
}

namespace {
	require_once __DIR__ . '/stubs/motion-render-stubs.php';

	use SGS\Blocks\Motion\Sgs_Motion_Delegate;
	use SGS\Blocks\Motion\Sgs_Motion_Loop_Delays;
	use SGS\Blocks\Motion\Sgs_Motion_Loop_Inherit;
	use SGS\Blocks\Motion\Sgs_Motion_Renderer;

	if ( ! function_exists( 'absint' ) ) {
		function absint( $v ) {
			return abs( (int) $v );
		}
	}
	if ( ! function_exists( 'sanitize_key' ) ) {
		function sanitize_key( $v ) {
			return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $v ) );
		}
	}
	if ( ! function_exists( 'sanitize_text_field' ) ) {
		function sanitize_text_field( $v ) {
			return trim( (string) $v );
		}
	}
	if ( ! function_exists( 'wp_list_pluck' ) ) {
		function wp_list_pluck( $list, $field ) {
			return array_map( static fn( $o ) => is_object( $o ) ? $o->$field : $o[ $field ], $list );
		}
	}
	if ( ! function_exists( '__' ) ) {
		function __( $t, $d = '' ) {
			return $t;
		}
	}
	if ( ! function_exists( 'sgs_container_gap_value' ) ) {
		function sgs_container_gap_value( $gap ) {
			return '1rem';
		}
	}
	if ( ! function_exists( 'sgs_shadow_value_composed' ) ) {
		function sgs_shadow_value_composed( $a, $b ) {
			return 'none';
		}
	}
	if ( ! class_exists( 'SGS_Container_Wrapper' ) ) {
		class SGS_Container_Wrapper {
			public static function render( $attributes, $block, $inner, $kind, $opts ) {
				return '<div class="' . implode( ' ', $opts['extra_classes'] ) . '">' . $inner . '</div>';
			}
		}
	}
	if ( ! function_exists( 'render_block' ) ) {
		/** A product card through the motion renderer's hooks and the item stamping filter, in WordPress's order. */
		function render_block( array $parsed ) {
			$GLOBALS['sgs_test_card_attrs'][] = $parsed['attrs'];
			$id   = (int) ( $parsed['attrs']['productId'] ?? 0 );
			$html = '<div class="sgs-container product-card wp-block-sgs-product-card"><div class="sgs-product-card__body"><h3 class="sgs-product-card__title">Product ' . $id . '</h3></div></div>';
			$out  = sgs_test_render_motion_block( $parsed, $html );
			return Sgs_Motion_Loop_Inherit::stamp( $out, $parsed );
		}
	}

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
		$GLOBALS['sgs_collected_css']   = array();
		$GLOBALS['sgs_test_is_admin']   = false;
		$GLOBALS['sgs_test_rest']       = false;
		$GLOBALS['sgs_test_card_attrs'] = array();
		Sgs_Motion_Renderer::reset();
	};
	$css = static function (): string {
		return implode( '', $GLOBALS['sgs_collected_css'] ?? array() );
	};

	/** Render the shipped delegated partial for a card-grid with these attributes. */
	$render_grid = static function ( array $attributes, array $ids ): string {
		$GLOBALS['sgs_test_product_ids'] = $ids;
		$block                           = null;
		$source                          = (string) $attributes['source'];
		$uid                             = 'sgs-cg-test1234';
		$columns                         = 3;
		$columns_tablet                  = 2;
		$columns_mobile                  = 1;
		$gap                             = '';
		$hover_effect                    = 'none';
		$hover_scale                     = '';
		$hover_shadow                    = '';
		$hover_shadow_colour             = '';
		$transition_dur                  = 0;
		$transition_ease                 = '';
		$empty_message                   = '';
		$card_grid_native_style_tag      = '';
		$card_grid_preset_classes        = array();
		ob_start();
		require dirname( __DIR__, 2 ) . '/src/blocks/card-grid/render-delegated.php';
		return (string) ob_get_clean();
	};

	$base  = array(
		'trigger' => 'scroll',
		'values'  => array(
			'from'     => array( 'opacity' => 0, 'translateY' => 24 ),
			'to'       => array(),
			'duration' => 400,
			'delay'    => 150,
		),
	);
	$title = array(
		'entrance' => array( 'base' => array( 'trigger' => 'scroll', 'values' => array( 'from' => array( 'opacity' => 0 ), 'to' => array(), 'duration' => 300 ) ) ),
		'hover'    => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ),
	);
	$grid = static function ( string $source, ?bool $apply, array $elements ) {
		$stagger = array( 'step' => 80 );
		if ( null !== $apply ) {
			$stagger['apply'] = $apply;
		}
		return array(
			'source'    => $source,
			'columns'   => 3,
			'sgsMotion' => array( 'v' => 1, 'elements' => $elements, 'stagger' => $stagger ),
		);
	};
	$count_attr = static fn( string $html, string $needle ): int => substr_count( $html, $needle );
	$titles_with = static function ( string $html, string $attr ): int {
		return preg_match_all( '/<h3 [^>]*' . preg_quote( $attr, '/' ) . '[^>]*class="sgs-product-card__title"/', $html );
	};
	$cards_with = static function ( string $html, string $attr ): int {
		return preg_match_all( '/<div [^>]*' . preg_quote( $attr, '/' ) . '[^>]*class="sgs-container product-card wp-block-sgs-product-card[^"]*"/', $html );
	};

	// 1. wc-product: the grid's title entrance and hover land on every card's title; subtitle reaches nothing.
	foreach ( array( 'wc-product', 'cpt-collection' ) as $mode ) {
		$reset();
		$html = $render_grid( $grid( $mode, false, array( 'root' => array( 'entrance' => array( 'base' => $base ) ), 'title' => $title, 'subtitle' => $title ) ), array( 11, 12, 13 ) );
		$all  = $css();
		$check( 3 === $titles_with( $html, 'data-sgs-me="scroll opacity"' ), "$mode: every card title carries the grid title's entrance (" . $titles_with( $html, 'data-sgs-me=' ) . ')' );
		$check( 3 === $titles_with( $html, 'data-sgs-mh="self"' ), "$mode: every card title carries the grid title's hover" );
		$check( 1 === preg_match( '/\.sgs-m-[0-9a-f]{10} \.sgs-product-card__title\{[^}]*--sgs-mh-to-ty:-4px[^}]*--sgs-me-from-op:0/', $all ), "$mode: the card's scoped title rule carries the hover and entrance values" );
		$check( false === strpos( $all, 'sgs-card-grid__subtitle' ) && false === strpos( $html, 'sgs-card-grid__subtitle' ), "$mode: the unmapped subtitle part reaches nothing" );
		$attrs = $GLOBALS['sgs_test_card_attrs'][0]['sgsMotion']['elements'] ?? array();
		$check( array( 'title' ) === array_keys( $attrs ), "$mode: apply off hands over only the mapped parts that carry layers: " . json_encode( array_keys( $attrs ) ) );
		$check( 0 === $cards_with( $html, 'data-sgs-me=' ), "$mode negative control: with apply off the cards get no entrance" );

		// 2. Stagger delays per card.
		$check( 3 === $count_attr( $html, 'data-sgs-loop-i=' ), "$mode: every delegated card carries its loop index" );
		foreach ( array( 0 => 0, 1 => 80, 2 => 160 ) as $i => $ms ) {
			$check( 1 === preg_match( '/\.sgs-cg-test1234 \.wp-block-sgs-product-card\[data-sgs-loop-i="' . $i . '"\]\{--sgs-me-delay:' . $ms . 'ms;\}/', $all ), "$mode: card $i has its own delay rule ($ms ms)" );
		}
		$check( 0 === preg_match( '/\sstyle\s*=/i', $html ), "$mode: no style attribute" );
	}

	// 3. apply on: each delegated card takes the grid's entrance, delay removed; the grid keeps its own.
	$reset();
	$html  = $render_grid( $grid( 'wc-product', true, array( 'root' => array( 'entrance' => array( 'base' => $base ) ), 'title' => $title ) ), array( 21, 22 ) );
	$all   = $css();
	$root  = $GLOBALS['sgs_test_card_attrs'][0]['sgsMotion']['elements']['root']['entrance']['base'] ?? null;
	$check( 2 === $cards_with( $html, 'data-sgs-me="scroll translate opacity"' ), 'apply on: every delegated card root carries the grid entrance' );
	$check( is_array( $root ) && ! isset( $root['values']['delay'] ) && 400 === ( $root['values']['duration'] ?? null ), 'apply on: the inherited layer is the grid entrance with its delay removed' );
	$check( 1 === preg_match( '/\.sgs-cg-test1234 \.wp-block-sgs-product-card\[data-sgs-loop-i="1"\]\{--sgs-me-delay:80ms;\}/', $all ), 'apply on: the stagger delay still reaches each card' );

	// 4. The card's own layers win; the grid's item layer maps to the card root.
	$item_hover = array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -8 ) ) ) );
	$merged     = Sgs_Motion_Delegate::child_motion(
		'sgs/card-grid',
		$grid( 'wc-product', true, array( 'root' => array( 'entrance' => array( 'base' => $base ) ), 'item' => $item_hover, 'title' => $title ) ),
		array( 'elements' => array( 'title' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.1 ) ) ) ) ) )
	);
	$check( array( 'scale' => 1.1 ) === ( $merged['elements']['title']['hover']['state']['values'] ?? null ), 'merge: the card\'s own title hover wins over the grid\'s' );
	$check( 300 === ( $merged['elements']['title']['entrance']['base']['values']['duration'] ?? null ), 'merge: the grid\'s title entrance fills the card\'s missing entrance' );
	$check( array( 'translateY' => -8 ) === ( $merged['elements']['root']['hover']['state']['values'] ?? null ), 'map: the grid item layer becomes the card root layer' );

	// 5. Manual card grid, apply on: the item part takes the container entrance; apply off writes only delays.
	$items = '<div class="sgs-card-grid__item" data-sgs-loop-i="0">A</div><div class="sgs-card-grid__item" data-sgs-loop-i="1">B</div>';
	$reset();
	$manual_on = $grid( 'manual', true, array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ) );
	$tag       = Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-m1', $manual_on, 2, '.sgs-card-grid__item' );
	$on_css    = $css();
	$stamped   = Sgs_Motion_Loop_Inherit::stamp( $items, array( 'blockName' => 'sgs/card-grid' ) );
	$check( '' === $tag, 'manual apply on: the rules went to the collector' );
	$check( 1 === preg_match( '/\.sgs-cg-m1 \.sgs-card-grid__item\{--sgs-me-from-op:0;--sgs-me-from-ty:24px;--sgs-me-dur:400ms;\}/', $on_css ), 'manual apply on: one scoped entrance rule for the items, no delay in it' );
	$check( 2 === substr_count( $stamped, 'data-sgs-me="scroll translate opacity"' ), 'manual apply on: every item is stamped with the entrance' );

	$reset();
	Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-m1', $grid( 'manual', false, array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ) ), 2, '.sgs-card-grid__item' );
	$off_css = $css();
	$reset();
	Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-m1', $grid( 'manual', null, array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ) ), 2, '.sgs-card-grid__item' );
	$plain_css = $css();
	$check( '' !== $off_css && $off_css === $plain_css, 'manual apply off: exactly the delays of a stagger with no apply key' );
	$check( false === strpos( $off_css, '--sgs-me-from' ), 'manual apply off: no inherited entrance' );
	$check( $items === Sgs_Motion_Loop_Inherit::stamp( $items, array( 'blockName' => 'sgs/card-grid' ) ), 'manual apply off: the items are not stamped' );

	// 6. An item part with its own entrance inherits nothing.
	$reset();
	$own = $grid( 'manual', true, array( 'root' => array( 'entrance' => array( 'base' => $base ) ), 'item' => $title ) );
	Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-m2', $own, 2, '.sgs-card-grid__item' );
	$check( false === strpos( $css(), '--sgs-me-from' ), 'own entrance: an item part with its own entrance inherits nothing' );
	$check( $items === Sgs_Motion_Loop_Inherit::stamp( $items, array( 'blockName' => 'sgs/card-grid' ) ), 'own entrance: nothing stamped' );

	// 7. Every item-array caller's item selector is its declared part; a delegated child's root is not.
	foreach ( array(
		array( 'sgs/card-grid', '.sgs-card-grid__item', 'item' ),
		array( 'sgs/gallery', '.sgs-gallery__item', 'item' ),
		array( 'sgs/timeline', '.sgs-timeline__entry', 'entry' ),
		array( 'sgs/nav-drawer-menu', '.sgs-nav-drawer-menu__item', 'item' ),
		array( 'sgs/post-grid', '.sgs-post-grid__card', 'card' ),
		array( 'sgs/nav-bar-menu', '.sgs-nav-bar-menu__subitem', 'subitem' ),
		array( 'sgs/card-grid', '.wp-block-sgs-product-card', null ),
	) as list( $name, $selector, $want ) ) {
		$check( $want === Sgs_Motion_Loop_Inherit::item_part( $name, $selector ), "item part: $name $selector => " . var_export( $want, true ) );
	}

	// 8. Post grid, apply on: the card part takes the container entrance.
	$reset();
	$pg = array( 'layout' => 'grid', 'columns' => array( 'desktop' => 3 ), 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ), 'stagger' => array( 'apply' => true, 'step' => 80 ) ) );
	Sgs_Motion_Loop_Delays::post_grid( 'sgs-pg-1', $pg, 3 );
	$check( 1 === preg_match( '/\.sgs-pg-1 \.sgs-post-grid__card\{--sgs-me-from-op:0/', $css() ), 'post-grid apply on: the card part takes the container entrance' );
	Sgs_Motion_Loop_Inherit::stamp( '', array( 'blockName' => 'sgs/post-grid' ) );

	// 9. Negative control: a manual grid hands nothing to a child.
	$check( null === Sgs_Motion_Delegate::child_motion( 'sgs/card-grid', $grid( 'manual', true, array( 'title' => $title ) ) ), 'negative control: a manual grid hands nothing over' );

	// 10. A stagger stored with only `apply` plays the defaults the editor shows: 80ms steps.
	$reset();
	$bare = array( 'columns' => 1, 'sgsMotion' => array( 'v' => 1, 'stagger' => array( 'apply' => true ) ) );
	Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-d1', $bare, 3, '.sgs-card-grid__item' );
	$bare_css = $css();
	foreach ( array( 0 => 0, 1 => 80, 2 => 160 ) as $i => $ms ) {
		$check( false !== strpos( $bare_css, '.sgs-cg-d1 .sgs-card-grid__item[data-sgs-loop-i="' . $i . '"]{--sgs-me-delay:' . $ms . 'ms;}' ), "defaults: {apply:true} alone gives item $i {$ms}ms" );
	}
	$reset();
	Sgs_Motion_Loop_Delays::item_array( 'sgs/card-grid', 'sgs-cg-d2', array( 'columns' => 1, 'sgsMotion' => array( 'stagger' => array( 'step' => 0 ) ) ), 3, '.sgs-card-grid__item' );
	$check( '' === $css(), 'defaults negative control: a stored step of 0 still wins over the default' );

	// 11. Parity: the PHP defaults equal StaggerHelper.js::STAGGER_DEFAULTS (less apply) and the drift check's DEFAULTS.
	$plugin = dirname( __DIR__, 2 );
	$js     = (string) file_get_contents( $plugin . '/src/components/motion/StaggerHelper.js' );
	$js_def = array();
	if ( preg_match( '/STAGGER_DEFAULTS = Object\.freeze\( \{(.*?)\} \)/s', $js, $block ) ) {
		preg_match_all( "/(\w+):\s*('([^']*)'|true|false|-?\d+)/", $block[1], $pairs, PREG_SET_ORDER );
		foreach ( $pairs as $pair ) {
			$raw                 = $pair[2];
			$js_def[ $pair[1] ] = '' !== ( $pair[3] ?? '' ) || "''" === $raw ? $pair[3] : ( 'true' === $raw ? true : ( 'false' === $raw ? false : (int) $raw ) );
		}
	}
	unset( $js_def['apply'] );
	$php_def = Sgs_Motion_Loop_Delays::DEFAULTS;
	ksort( $js_def );
	ksort( $php_def );
	$check( $js_def === $php_def, 'parity: PHP DEFAULTS equal StaggerHelper.js STAGGER_DEFAULTS: ' . json_encode( $js_def ) . ' vs ' . json_encode( $php_def ) );
	$py     = (string) file_get_contents( $plugin . '/scripts/check-motion-stagger-drift.py' );
	$py_def = preg_match( '/^DEFAULTS = (\{.*\})$/m', $py, $line ) ? json_decode( str_replace( array( 'True', 'False' ), array( 'true', 'false' ), $line[1] ), true ) : null;
	$check( is_array( $py_def ), 'parity: the drift check DEFAULTS line was read' );
	foreach ( is_array( $py_def ) ? $py_def : array() as $key => $value ) {
		if ( 'apply' !== $key ) {
			$check( array_key_exists( $key, $php_def ) && $php_def[ $key ] === $value, "parity: drift check DEFAULTS[$key] equals the PHP default" );
		}
	}

	echo ( 0 === $failures ? 'PASS' : 'FAIL' ) . ": $checks checks, $failures failures\n";
	exit( 0 === $failures ? 0 : 1 );
}

<?php
/**
 * Standalone runner for the grid's hand-over to the cards it prints and "Apply entrance to children" on
 * server-rendered lists (Spec 38A §6.2, §8).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-delegate-standalone.php
 *
 * Runs the shipped `src/blocks/card-grid/render-delegated.php` partial (wc-product and cpt-collection modes) with the
 * shipped `Card_Grid_Template`, `Sgs_Motion_Delegate`, `Sgs_Motion_Loop_Inherit`, `Sgs_Motion_Loop_Delays` and motion
 * renderer, and stand-ins for the query, wrapper and `render_block()`. Asserts:
 * - the grid's own parts reach no card; every card part moves through the template card's own motion;
 * - every delegated card gets its loop index and its own `--sgs-me-delay` rule;
 * - with `apply` on, each card (delegated) and each manual item part takes the container's entrance, delays removed,
 *   beside the template's own motion, and the container's own entrance moves to them; a template card root with its
 *   own entrance takes nothing and the grid keeps its entrance, although the grid holds the template as an inner block;
 *   with `apply` off nothing is inherited and the delays are exactly those of a stagger with no `apply` key; an item
 *   part with its own entrance inherits nothing;
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
	if ( ! class_exists( __NAMESPACE__ . '\Card_Grid_Results' ) ) {
		class Card_Grid_Results {
			public static function pagination( array $attributes, string $uid, int $total_pages, int $paged, string $mode ): string {
				return Grid_Pagination::render( array() );
			}
			public static function empty_message( array $attributes, bool $frontend ): string {
				return '';
			}
		}
	}
}

namespace {
	require_once __DIR__ . '/stubs/motion-render-stubs.php';
	require_once dirname( __DIR__, 2 ) . '/includes/class-card-grid-template.php';

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
	$render_grid = static function ( array $attributes, array $ids, array $template = array() ): string {
		$GLOBALS['sgs_test_product_ids'] = $ids;
		$block                           = (object) array(
			'parsed_block' => array( 'innerBlocks' => array( array( 'blockName' => 'sgs/product-card', 'attrs' => $template ) ) ),
		);
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

	// 1. The grid's parts hand nothing to the cards: every card part moves through the template card's own motion.
	$template_title = array( 'v' => 1, 'elements' => array( 'title' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ) );
	foreach ( array( 'wc-product', 'cpt-collection' ) as $mode ) {
		$reset();
		$html  = $render_grid( $grid( $mode, false, array( 'root' => array( 'entrance' => array( 'base' => $base ) ), 'title' => $title, 'subtitle' => $title ) ), array( 11, 12, 13 ), array( 'sgsMotion' => $template_title ) );
		$all   = $css();
		$check( 0 === $titles_with( $html, 'data-sgs-me=' ), "$mode: the grid's title part reaches no card title" );
		$check( 3 === $titles_with( $html, 'data-sgs-mh="self"' ), "$mode: the template card's title hover reaches every card title" );
		$check( 1 === preg_match( '/\.sgs-m-[0-9a-f]{10} \.sgs-product-card__title\{[^}]*--sgs-mh-to-ty:-4px/', $all ), "$mode: the card's scoped title rule carries the template's hover" );
		$check( false === strpos( $all, '--sgs-me-from-op:0;--sgs-me-dur:300ms' ), "$mode: the grid title's entrance values are written nowhere" );
		$check( false === strpos( $all, 'sgs-card-grid__subtitle' ) && false === strpos( $html, 'sgs-card-grid__subtitle' ), "$mode: the grid's subtitle part reaches nothing" );
		$attrs = $GLOBALS['sgs_test_card_attrs'][0]['sgsMotion']['elements'] ?? array();
		$check( array( 'title' ) === array_keys( $attrs ), "$mode: each card's motion is the template's own: " . json_encode( array_keys( $attrs ) ) );
		$check( 0 === $cards_with( $html, 'data-sgs-me=' ), "$mode negative control: with apply off the cards get no entrance" );

		// 2. Stagger delays per card.
		$check( 3 === $count_attr( $html, 'data-sgs-loop-i=' ), "$mode: every delegated card carries its loop index" );
		foreach ( array( 0 => 0, 1 => 80, 2 => 160 ) as $i => $ms ) {
			$check( 1 === preg_match( '/\.sgs-cg-test1234 \.wp-block-sgs-product-card\[data-sgs-loop-i="' . $i . '"\]\{--sgs-me-delay:' . $ms . 'ms;--sgs-me-loop-delay:' . $ms . 'ms;\}/', $all ), "$mode: card $i has its own delay rule ($ms ms)" );
		}
		$check( 0 === preg_match( '/\sstyle\s*=/i', $html ), "$mode: no style attribute" );
	}

	// 3. apply on: each card takes the grid's entrance, delay removed, beside the template's own motion.
	$reset();
	$html  = $render_grid( $grid( 'wc-product', true, array( 'root' => array( 'entrance' => array( 'base' => $base ) ), 'title' => $title ) ), array( 21, 22 ), array( 'sgsMotion' => $template_title ) );
	$all   = $css();
	$root  = $GLOBALS['sgs_test_card_attrs'][0]['sgsMotion']['elements']['root']['entrance']['base'] ?? null;
	$check( 2 === $cards_with( $html, 'data-sgs-me="scroll translate opacity"' ), 'apply on: every delegated card root carries the grid entrance' );
	$check( is_array( $root ) && ! isset( $root['values']['delay'] ) && 400 === ( $root['values']['duration'] ?? null ), 'apply on: the inherited layer is the grid entrance with its delay removed' );
	$check( array( 'translateY' => -4 ) === ( $GLOBALS['sgs_test_card_attrs'][0]['sgsMotion']['elements']['title']['hover']['state']['values'] ?? null ), 'apply on: the template\'s own title hover stays' );
	$check( 1 === preg_match( '/\.sgs-cg-test1234 \.wp-block-sgs-product-card\[data-sgs-loop-i="1"\]\{--sgs-me-delay:80ms;--sgs-me-loop-delay:80ms;\}/', $all ), 'apply on: the stagger delay still reaches each card' );

	// 3b. Editor preview: the cards share one scope (they render the same template motion), so its style tag is printed
	// once, never once per card with the same id; each card's delay still comes from its own loop rule.
	$reset();
	$GLOBALS['sgs_test_is_admin'] = true;
	$card_entrance = array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => 'scroll', 'values' => array( 'from' => array( 'opacity' => 0 ), 'to' => array(), 'duration' => 300, 'delay' => 200 ) ) ) ) ) );
	$html = $render_grid( $grid( 'wc-product', false, array( 'title' => $title ) ), array( 31, 32, 33 ), array( 'sgsMotion' => $card_entrance ) );
	preg_match_all( '/<style id="(sgs-m-[0-9a-f]{10})">/', $html, $ids );
	$check( array() !== $ids[1] && count( $ids[1] ) === count( array_unique( $ids[1] ) ), 'editor: no two style tags share an id: ' . json_encode( array_count_values( $ids[1] ) ) );
	$check( 1 === count( array_unique( $ids[1] ) ), 'editor: the cards share one scope (identical motion): ' . json_encode( array_unique( $ids[1] ) ) );
	$check( 3 === preg_match_all( '/<div [^>]*class="[^"]*wp-block-sgs-product-card[^"]*sgs-m-[0-9a-f]{10}/', $html ), 'editor: every card carries the shared scope class' );
	foreach ( array( 0 => 0, 1 => 80, 2 => 160 ) as $i => $ms ) {
		$check( 1 === preg_match( '/\.sgs-cg-test1234 \.wp-block-sgs-product-card\[data-sgs-loop-i="' . $i . '"\]\{--sgs-me-delay:' . $ms . 'ms;--sgs-me-loop-delay:' . $ms . 'ms;\}/', $html ), "editor: card $i keeps its own stagger delay ($ms ms), never another card's" );
	}
	$GLOBALS['sgs_test_is_admin'] = false;

	// 4. child_motion hands the card only the stagger entrance; the card's own motion is otherwise untouched.
	$child  = array( 'v' => 1, 'elements' => array( 'title' => array( 'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.1 ) ) ) ) ) );
	$parts  = array( 'root' => array( 'entrance' => array( 'base' => $base ) ), 'item' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -8 ) ) ) ), 'title' => $title );
	$merged = Sgs_Motion_Delegate::child_motion( 'sgs/card-grid', $grid( 'wc-product', true, $parts ), $child );
	$merged_keys = array_keys( $merged['elements'] ?? array() );
	sort( $merged_keys );
	$check( array( 'root', 'title' ) === $merged_keys, 'hand-over: only the card root gains a layer: ' . json_encode( $merged_keys ) );
	$check( $child['elements']['title'] === ( $merged['elements']['title'] ?? null ), 'hand-over: the card\'s own title is untouched (the grid title part is not merged in)' );
	$check( array( 'entrance' ) === array_keys( $merged['elements']['root'] ?? array() ), 'hand-over: the grid item hover never reaches the card root' );
	$check( $child === Sgs_Motion_Delegate::child_motion( 'sgs/card-grid', $grid( 'wc-product', false, $parts ), $child ), 'apply off: the card motion comes back unchanged' );
	$check( null === Sgs_Motion_Delegate::child_motion( 'sgs/card-grid', $grid( 'wc-product', false, $parts ) ), 'apply off and no card motion: nothing' );
	$own_root = array( 'v' => 1, 'elements' => array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ) );
	$check( $own_root === Sgs_Motion_Delegate::child_motion( 'sgs/card-grid', $grid( 'wc-product', true, $parts ), $own_root ), 'a card root with its own entrance takes nothing' );
	$check( null === Sgs_Motion_Delegate::hands_entrance( 'sgs/card-grid', $grid( 'wc-product', true, $parts ), $own_root ), 'a card root with its own entrance: the grid keeps its entrance' );
	$check( 'root' === Sgs_Motion_Delegate::hands_entrance( 'sgs/card-grid', $grid( 'wc-product', true, $parts ), $child ), 'the grid item part no longer keeps the grid entrance (it reaches no card)' );
	$check( ! array_key_exists( 'parts', Sgs_Motion_Delegate::config( 'sgs/card-grid' ) ?? array( 'parts' => 1 ) ), 'the delegation declares no part map' );

	// 5. Manual card grid, apply on: the item part takes the container entrance; apply off writes only delays.
	$items = '<div class="sgs-card-grid sgs-cg-m1"><div class="sgs-card-grid__item" data-sgs-loop-i="0">A</div><div class="sgs-card-grid__item" data-sgs-loop-i="1">B</div></div>';
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
	// The editor canvas finds the item part from supports.sgs.motionItems: each block that inherits declares the part its
	// render.php item selector names (the nav bar's panel items only ever carry their own entrance, so it declares none).
	foreach ( array(
		'sgs/card-grid'       => 'item',
		'sgs/gallery'         => 'item',
		'sgs/timeline'        => 'entry',
		'sgs/nav-drawer-menu' => 'item',
		'sgs/post-grid'       => 'card',
		'sgs/nav-bar-menu'    => null,
	) as $name => $want ) {
		$check( $want === Sgs_Motion_Loop_Inherit::declared_item_part( $name ), "declared item part: $name => " . var_export( $want, true ) );
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
		$check( false !== strpos( $bare_css, '.sgs-cg-d1 .sgs-card-grid__item[data-sgs-loop-i="' . $i . '"]{--sgs-me-delay:' . $ms . 'ms;--sgs-me-loop-delay:' . $ms . 'ms;}' ), "defaults: {apply:true} alone gives item $i {$ms}ms" );
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

	// 12. Council A1, delegated: the grid's own entrance moves only when the cards take it. The grid renders its cards
	// inside its own frame, as WordPress does, and holds its template card as an inner block: the template is not a
	// child that stores its own delay, so the inner-block rule never decides the move in a delegating mode.
	$grid_root = static function ( array $attributes, array $ids, array $template ) use ( $render_grid ): string {
		$block = array(
			'blockName'   => 'sgs/card-grid',
			'attrs'       => $attributes,
			'innerBlocks' => array( array( 'blockName' => 'sgs/product-card', 'attrs' => $template, 'innerBlocks' => array() ) ),
		);
		$cards = '';
		$html  = sgs_test_render_motion_block(
			$block,
			'<div class="sgs-card-grid sgs-cg-test1234">X</div>',
			null,
			static function () use ( $render_grid, $attributes, $ids, $template, &$cards ): void {
				$cards = $render_grid( $attributes, $ids, $template );
			}
		);
		return $html . "\n" . $cards;
	};
	$grid_plays = static function ( string $html ): bool {
		return 1 === preg_match( '/^<div [^>]*data-sgs-me=/', $html );
	};
	$reset();
	$handed = $grid_root( $grid( 'wc-product', true, array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ) ), array( 41, 42 ), array( 'ctaColourText' => '#111111' ) );
	$check( ! $grid_plays( $handed ) && 2 === $cards_with( $handed, 'data-sgs-me="scroll translate opacity"' ), 'delegated positive control: the cards take the grid entrance, so the grid no longer plays it: ' . $handed );
	$reset();
	$kept = $grid_root( $grid( 'wc-product', true, array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ) ), array( 43, 44 ), array( 'sgsMotion' => $own_root ) );
	$check( $grid_plays( $kept ), 'test_container_entrance_survives_when_the_template_card_keeps_its_own_entrance: the template card root has its own entrance, so the grid keeps its: ' . $kept );
	$reset();
	$empty = $grid_root( $grid( 'wc-product', true, array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ) ), array(), array() );
	$check( $grid_plays( $empty ), 'an empty grid keeps its own entrance (no card took it)' );

	// 13. Council D: a regex failure in single_scope_styles keeps the cards instead of blanking them.
	$big       = '<div class="wp-block-sgs-product-card">A</div><style id="sgs-m-0123456789">' . str_repeat( 'a{b:c}', 4000 ) . '</style><div class="wp-block-sgs-product-card">B</div>';
	$limit     = ini_get( 'pcre.backtrack_limit' );
	$jit       = ini_get( 'pcre.jit' );
	ini_set( 'pcre.jit', '0' );
	ini_set( 'pcre.backtrack_limit', '10' );
	$kept_html = Sgs_Motion_Delegate::single_scope_styles( $big );
	$failed    = PREG_NO_ERROR !== preg_last_error();
	ini_set( 'pcre.backtrack_limit', (string) $limit );
	ini_set( 'pcre.jit', (string) $jit );
	$check( $failed, 'regex failure: the planted backtrack limit makes the pattern fail' );
	$check( $big === $kept_html, 'regex failure: single_scope_styles returns the cards unchanged, never an empty string (' . strlen( $kept_html ) . ' bytes)' );

	echo ( 0 === $failures ? 'PASS' : 'FAIL' ) . ": $checks checks, $failures failures\n";
	exit( 0 === $failures ? 0 : 1 );
}

<?php
/**
 * Standalone runner for the server-written loop delays (Spec 38A M4.3; FR-38A-26).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-loop-delays-standalone.php
 *
 * Runs the shipped `Sgs_Motion_Loop_Delays` (and the shipped `Sgs_Motion_Stagger`, `Sgs_Motion_Emitter` and collector)
 * with the stand-ins in `stubs/motion-render-stubs.php`, and asserts: a six-card post-grid on three columns with step
 * 80 gets one rule per card with 0, 80, 160, 0, 80, 160 on desktop and the tablet and mobile column counts' delays;
 * page 2 restarts at the offset; a core `post-template` and a WooCommerce `product-template` tag only their direct
 * `<li>` children and get the same rules; the settings come from the template, the enclosing query block, or the
 * `sgs_motion_loop_stagger` filter; no settings (or a switched-off or all-zero stagger) writes nothing; no markup
 * carries a `style` attribute; no emitted CSS carries `nth-child`. Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Loop_Delays;

$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};

$reset = static function ( bool $frontend = true ): void {
	$GLOBALS['sgs_collected_css'] = array();
	$GLOBALS['sgs_test_is_admin'] = ! $frontend;
	$GLOBALS['sgs_test_rest']     = false;
	$GLOBALS['sgs_test_filters']['sgs_motion_loop_stagger'] = array();
};
$collected = static function (): string {
	return implode( '', $GLOBALS['sgs_collected_css'] ?? array() );
};

/**
 * Effective delay per item and device from emitted CSS: a base rule is desktop, a rule inside
 * `@media (max-width:1023px)` is tablet (and below), `@media (max-width:767px)` mobile; a tier with no rule inherits
 * the tier above. Returns array<index, array{desktop:?int,tablet:?int,mobile:?int}> and the rule count per index.
 */
$parse = static function ( string $css ): array {
	$by_index = array();
	$counts   = array();
	$media    = array( 'tablet' => '1023', 'mobile' => '767' );
	foreach ( $media as $tier => $px ) {
		$pattern = '/@media \(max-width:' . $px . 'px\)\{([^{}]+)\{([^{}]*)\}\}/';
		if ( preg_match_all( $pattern, $css, $m, PREG_SET_ORDER ) ) {
			foreach ( $m as $hit ) {
				if ( preg_match( '/data-sgs-loop-i="(\d+)"/', $hit[1], $i ) && preg_match( '/--sgs-me-delay:(\d+)ms/', $hit[2], $d ) ) {
					$by_index[ (int) $i[1] ][ $tier ] = (int) $d[1];
				}
			}
		}
		$css = preg_replace( $pattern, '', $css );
	}
	if ( preg_match_all( '/([^{}]+)\{([^{}]*)\}/', $css, $m, PREG_SET_ORDER ) ) {
		foreach ( $m as $hit ) {
			if ( preg_match( '/data-sgs-loop-i="(\d+)"/', $hit[1], $i ) && preg_match( '/--sgs-me-delay:(\d+)ms/', $hit[2], $d ) ) {
				$by_index[ (int) $i[1] ]['desktop'] = (int) $d[1];
				$counts[ (int) $i[1] ]              = ( $counts[ (int) $i[1] ] ?? 0 ) + 1;
			}
		}
	}
	ksort( $by_index );
	$out = array();
	foreach ( $by_index as $index => $tiers ) {
		$desktop = $tiers['desktop'] ?? null;
		$tablet  = $tiers['tablet'] ?? $desktop;
		$mobile  = $tiers['mobile'] ?? $tablet;
		$out[ $index ] = array( 'desktop' => $desktop, 'tablet' => $tablet, 'mobile' => $mobile );
	}
	return array( $out, $counts );
};
$column = static function ( array $parsed, string $tier ): array {
	return array_values( array_map( static fn( $row ) => $row[ $tier ], $parsed ) );
};
$no_style_attr = static function ( string $html ): bool {
	return 0 === preg_match( '/\sstyle\s*=/i', $html );
};

$grid_attrs = array(
	'layout'    => 'grid',
	'columns'   => array( 'desktop' => 3, 'tablet' => 2, 'mobile' => 1 ),
	'sgsMotion' => array( 'stagger' => array( 'apply' => true, 'step' => 80 ) ),
);
$card = static fn( int $n ): string => '<article class="sgs-post-grid__card sgs-post-grid__card--card"><h3>Post ' . $n . '</h3></article>';

// 1. Post grid: six cards, three columns, step 80.
$reset();
$tag = Sgs_Motion_Loop_Delays::post_grid( 'sgs-post-grid-abc12345', $grid_attrs, 6 );
$check( '' === $tag, 'post-grid: on the front end the rules go to the collector, no inline style tag' );
$css = $collected();
list( $rows, $counts ) = $parse( $css );
$check( 6 === count( $rows ), 'post-grid: one rule target per card (' . count( $rows ) . ')' );
$check( array_fill( 0, 6, 1 ) === array_values( $counts ), 'post-grid: exactly one base rule per card' );
$check( array( 0, 80, 160, 0, 80, 160 ) === $column( $rows, 'desktop' ), 'post-grid desktop (3 columns): ' . json_encode( $column( $rows, 'desktop' ) ) );
$check( array( 0, 80, 0, 80, 0, 80 ) === $column( $rows, 'tablet' ), 'post-grid tablet (2 columns): ' . json_encode( $column( $rows, 'tablet' ) ) );
$check( array( 0, 80, 160, 240, 320, 400 ) === $column( $rows, 'mobile' ), 'post-grid mobile (1 column): ' . json_encode( $column( $rows, 'mobile' ) ) );
$check( false !== strpos( $css, '.sgs-post-grid-abc12345 .sgs-post-grid__card[data-sgs-loop-i="4"]' ), 'post-grid: rule is scoped to the block uid and the card by its index attribute' );
$check( false === stripos( $css, 'nth-child' ) && false === stripos( $css, 'nth-of-type' ), 'post-grid: no nth-child rule' );

// 2. Page 2 restarts at the offset.
$offset_attrs                                      = $grid_attrs;
$offset_attrs['sgsMotion']['stagger']['offset']    = 100;
$offset_attrs['sgsMotion']['stagger']['step']      = 50;
$reset();
Sgs_Motion_Loop_Delays::post_grid( 'sgs-post-grid-page1', $offset_attrs, 6 );
list( $page_one ) = $parse( $collected() );
$reset();
Sgs_Motion_Loop_Delays::post_grid( 'sgs-post-grid-page2', $offset_attrs, 3 );
list( $page_two ) = $parse( $collected() );
$check( array( 100, 150, 200, 100, 150, 200 ) === $column( $page_one, 'desktop' ), 'page 1 starts at the offset: ' . json_encode( $column( $page_one, 'desktop' ) ) );
$check( array( 100, 150, 200 ) === $column( $page_two, 'desktop' ), 'page 2 (three cards) restarts at the offset: ' . json_encode( $column( $page_two, 'desktop' ) ) );

// 3. Card tagging: the attribute goes on the card's first tag, never a style attribute.
$tagged = Sgs_Motion_Loop_Delays::tag_item( $card( 7 ), 4 );
$check( 0 === strpos( $tagged, '<article data-sgs-loop-i="4"' ) || false !== strpos( $tagged, 'data-sgs-loop-i="4"' ), 'tag_item writes the index on the card: ' . $tagged );
$check( $no_style_attr( $tagged ), 'tag_item writes no style attribute' );

// 4. Nothing to write.
$reset();
$none = $grid_attrs;
unset( $none['sgsMotion'] );
$check( null === Sgs_Motion_Loop_Delays::post_grid( 'sgs-post-grid-none', $none, 6 ), 'no stagger settings: nothing returned' );
$off                                = $grid_attrs;
$off['sgsMotion']['stagger']['apply'] = false;
$check( null === Sgs_Motion_Loop_Delays::post_grid( 'sgs-post-grid-off', $off, 6 ), 'stagger switched off: nothing returned' );
$zero                                 = $grid_attrs;
$zero['sgsMotion']['stagger']['step'] = 0;
$check( null === Sgs_Motion_Loop_Delays::post_grid( 'sgs-post-grid-zero', $zero, 6 ), 'all delays zero: nothing returned' );
$check( null === Sgs_Motion_Loop_Delays::post_grid( 'sgs-post-grid-empty', $grid_attrs, 0 ), 'no cards: nothing returned' );
$check( '' === $collected(), 'no settings: no rules collected' );

// 5. A list layout is one column: the delay accumulates up to the cap.
$reset();
$list                                    = $grid_attrs;
$list['layout']                          = 'list';
$list['sgsMotion']['stagger']['cap']     = 200;
Sgs_Motion_Loop_Delays::post_grid( 'sgs-post-grid-list', $list, 5 );
list( $list_rows ) = $parse( $collected() );
$check( array( 0, 80, 160, 200, 200 ) === $column( $list_rows, 'desktop' ), 'list layout: single column, capped: ' . json_encode( $column( $list_rows, 'desktop' ) ) );

// 6. The editor preview keeps the rules in an inline <style> tag, with no collector write.
$reset( false );
$editor_tag = Sgs_Motion_Loop_Delays::post_grid( 'sgs-post-grid-edit', $grid_attrs, 6 );
$check( 0 === strpos( (string) $editor_tag, '<style id="sgs-post-grid-edit-loop">' ), 'editor: rules returned as a style tag' );
$check( '' === $collected(), 'editor: the collector is not written' );

// 7. Core post-template: only direct <li> children are tagged; settings from the block.
$list_html = '<ul class="wp-block-post-template is-layout-grid">'
	. '<li class="wp-block-post">A<ul><li>nested</li></ul></li>'
	. '<li class="wp-block-post"><img src="a.jpg" alt=""><p>B</p></li>'
	. '<li class="wp-block-post">C</li><li class="wp-block-post">D</li><li class="wp-block-post">E</li><li class="wp-block-post">F</li>'
	. '</ul>';
$post_template = array(
	'blockName' => 'core/post-template',
	'attrs'     => array(
		'layout'    => array( 'type' => 'grid', 'columnCount' => 3 ),
		'sgsMotion' => array( 'stagger' => array( 'step' => 80 ) ),
	),
);
$reset();
$out = Sgs_Motion_Loop_Delays::filter( $list_html, $post_template );
list( $rows ) = $parse( $collected() );
$check( 6 === preg_match_all( '/<li class="wp-block-post"[^>]*data-sgs-loop-i="\d"/', $out ) || 6 === preg_match_all( '/data-sgs-loop-i="\d"/', $out ), 'post-template: six direct items tagged' );
$check( 6 === preg_match_all( '/data-sgs-loop-i="/', $out ) && false !== strpos( $out, '<ul><li>nested</li></ul>' ), 'post-template: the nested <li> is not tagged' );
$check( 1 === preg_match( '/^<ul class="[^"]*\bsgs-m-[0-9a-f]{10}\b/', $out ), 'post-template: the list root carries the scope class' );
$check( array( 0, 80, 160, 0, 80, 160 ) === $column( $rows, 'desktop' ), 'post-template desktop: ' . json_encode( $column( $rows, 'desktop' ) ) );
$check( array( 0, 80, 160, 0, 80, 160 ) === $column( $rows, 'mobile' ), 'post-template mobile keeps the stored column count: ' . json_encode( $column( $rows, 'mobile' ) ) );
$check( 1 === preg_match( '/\.(sgs-m-[0-9a-f]{10}) > \*\[data-sgs-loop-i="5"\]\{/', $collected() ), 'post-template: rule scoped to the list and the item index' );
$check( $no_style_attr( $out ) && false === stripos( $collected(), 'nth-child' ), 'post-template: no style attribute and no nth-child' );

// 8. WooCommerce product-template: settings and columns from the enclosing product collection.
$parent   = (object) array(
	'parsed_block' => array(
		'blockName' => 'woocommerce/product-collection',
		'attrs'     => array(
			'displayLayout' => array( 'type' => 'flex', 'columns' => 2 ),
			'sgsMotion'     => array( 'stagger' => array( 'step' => 100, 'offset' => 50 ) ),
		),
	),
);
$product_template = Sgs_Motion_Loop_Delays::capture_context( array( 'blockName' => 'woocommerce/product-template', 'attrs' => array() ), null, $parent );
$check( isset( $product_template['attrs'][ Sgs_Motion_Loop_Delays::CONTEXT_KEY ]['stagger'] ) && 2 === $product_template['attrs'][ Sgs_Motion_Loop_Delays::CONTEXT_KEY ]['columns'], 'capture_context keeps the parent stagger and columns' );
$unrelated = Sgs_Motion_Loop_Delays::capture_context( array( 'blockName' => 'core/paragraph', 'attrs' => array() ), null, $parent );
$check( ! isset( $unrelated['attrs'][ Sgs_Motion_Loop_Delays::CONTEXT_KEY ] ), 'capture_context leaves other blocks alone' );
$products = '<ul class="wc-block-product-template"><li class="wc-block-product">1</li><li class="wc-block-product">2</li><li class="wc-block-product">3</li><li class="wc-block-product">4</li></ul>';
$reset();
$out = Sgs_Motion_Loop_Delays::filter( $products, $product_template );
list( $rows ) = $parse( $collected() );
$check( array( 50, 150, 50, 150 ) === $column( $rows, 'desktop' ), 'product-template (2 columns, offset 50, step 100): ' . json_encode( $column( $rows, 'desktop' ) ) );
$check( 4 === preg_match_all( '/data-sgs-loop-i="/', $out ) && $no_style_attr( $out ), 'product-template: four items tagged, no style attribute' );

// 9. Settings from the filter; no settings anywhere writes nothing.
$reset();
$bare = array( 'blockName' => 'core/post-template', 'attrs' => array() );
$check( $products === Sgs_Motion_Loop_Delays::filter( $products, $bare ) && '' === $collected(), 'post-template with no settings: HTML unchanged, no rules' );
add_filter(
	'sgs_motion_loop_stagger',
	static function ( $value, $name ) {
		return 'core/post-template' === $name ? array( 'step' => 60 ) : $value;
	},
	10,
	2
);
$out = Sgs_Motion_Loop_Delays::filter( $products, $bare );
list( $rows ) = $parse( $collected() );
$check( array( 0, 60, 120, 180 ) === $column( $rows, 'desktop' ), 'sgs_motion_loop_stagger filter supplies the settings: ' . json_encode( $column( $rows, 'desktop' ) ) );
$reset();
$check( '<p>x</p>' === Sgs_Motion_Loop_Delays::filter( '<p>x</p>', array( 'blockName' => 'core/paragraph', 'attrs' => array() ) ), 'other blocks pass through' );

echo $failures ? "FAILED: $failures of $checks checks\n" : "PASS: $checks checks\n";
exit( $failures ? 1 : 0 );

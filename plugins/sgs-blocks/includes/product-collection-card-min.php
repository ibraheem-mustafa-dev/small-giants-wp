<?php
/**
 * WooCommerce Product Collection: "Minimum card width" (the `sgsCardMinWidth` attribute).
 *
 * `woocommerce/product-collection` lays its products out in a fixed number of columns
 * (`displayLayout.columns`), so a row holding one product draws one narrow card and a narrow
 * viewport squeezes every card. This extension adds one per-device length, `sgsCardMinWidth`
 * ({desktop,tablet,mobile}; a blank tablet/mobile tier inherits the tier above), to that block
 * only. When set, the product list becomes
 * `grid-template-columns: repeat(auto-fill, minmax(min(100%, <length>), 1fr))`: as many cards
 * as fit at that minimum width, the leftover space shared out, and no stretched last row
 * (auto-fill, never auto-fit). An unset value (the default) emits nothing, so WooCommerce's fixed
 * columns stay.
 *
 * The frontend rules are a scoped `<style>` tag, never a style="" attribute (Spec 32), scoped to
 * the block's own uid class when it has one, otherwise a freshly minted `sgs-card-min-<8hex>`.
 *
 * Specificity. WooCommerce paints the list with `.wc-block-product-template.is-flex-container`
 * (display:flex) and, inside `@media (min-width:600px)`, gives each item
 * `.wc-block-product-template.is-flex-container.is-flex-container.columns-N > li{width:calc(…)}`
 * at (0,4,1) (documented beside theme/sgs-theme/assets/css/woocommerce.css section 10a). A
 * percentage width inside a grid track resolves against the track, so the item must be reset to
 * `width:100%`. The item rule here therefore uses the marker class, the scope class, the list class
 * and `.is-flex-container` three times: (0,6,1) beats WooCommerce's (0,4,1) on specificity alone,
 * regardless of source order. The list rule uses the list class twice behind the marker and scope:
 * (0,4,0) beats WooCommerce's (0,2,0) display and (0,1,0) column rules.
 *
 * The attribute reaches the editor's server-side schema through
 * extension-attrs-rest-register.php (generated from the extension JS), the same path every
 * other `sgs*` extension attribute takes.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const SGS_CARD_MIN_BLOCK_NAME = 'woocommerce/product-collection';

add_filter( 'render_block', __NAMESPACE__ . '\sgs_inject_card_min_width', 10, 2 );

/**
 * Turn one stored tier length into the grid-template-columns value.
 *
 * Used as the responsive emitter's `transform`, so it runs per tier and returns '' (nothing
 * emitted) for anything that is not a single safe CSS length.
 *
 * @param mixed $raw Stored tier value.
 * @return string The `repeat(...)` track list, or ''.
 */
function sgs_card_min_columns_value( $raw ): string {
	require_once __DIR__ . '/render-helpers.php';

	$safe = is_scalar( $raw ) ? sgs_css_single_length_value( (string) $raw ) : '';
	if ( '' === $safe ) {
		return '';
	}
	return 'repeat(auto-fill,minmax(min(100%,' . $safe . '),1fr))';
}

/**
 * The scoped CSS for a minimum card width value.
 *
 * @param mixed  $value Stored `sgsCardMinWidth` value ({desktop,tablet,mobile}).
 * @param string $scope Scope class name, no leading dot.
 * @return string CSS text without a <style> wrapper; '' when no tier holds a safe length.
 */
function sgs_card_min_width_css( $value, string $scope ): string {
	if ( ! is_array( $value ) || '' === $scope ) {
		return '';
	}

	$tiers  = array();
	$any    = false;
	$prefix = '.sgs-card-min.' . $scope;
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
		$raw            = $value[ $tier ] ?? null;
		$safe           = '' === sgs_card_min_columns_value( $raw ) ? null : $raw;
		$tiers[ $tier ] = $safe;
		$any            = $any || null !== $safe;
	}
	if ( ! $any ) {
		return '';
	}

	$list = $prefix . ' .wc-block-product-template.wc-block-product-template';
	$item = $prefix . ' .wc-block-product-template.is-flex-container.is-flex-container.is-flex-container > li';

	$css  = $list . '{display:grid;}';
	$css .= $item . '{width:100%;max-width:100%;min-width:0;}';
	$css .= sgs_emit_responsive_css(
		$list,
		array(
			array(
				'value'     => $tiers,
				'css'       => 'grid-template-columns',
				'transform' => __NAMESPACE__ . '\sgs_card_min_columns_value',
			),
		)
	);
	return $css;
}

/**
 * Render-block filter: add the scope classes and the scoped grid rules.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_inject_card_min_width( $block_content, $block ) {
	if ( ! is_string( $block_content ) || '' === trim( $block_content ) || ! is_array( $block ) ) {
		return $block_content;
	}
	if ( SGS_CARD_MIN_BLOCK_NAME !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	$value = $block['attrs']['sgsCardMinWidth'] ?? null;
	if ( ! is_array( $value ) ) {
		return $block_content;
	}

	require_once __DIR__ . '/render-helpers.php';
	require_once __DIR__ . '/helpers-scoped-instance-vars.php';

	$root_tag = sgs_extract_root_opening_tag( ltrim( $block_content ) );
	if ( '' === $root_tag ) {
		return $block_content;
	}
	$scope = sgs_scope_class_for_root(
		$root_tag,
		'sgs-card-min',
		static fn( string $scope_class ): string => sgs_card_min_width_css( $value, $scope_class )
	);
	$css   = sgs_card_min_width_css( $value, $scope );
	if ( '' === $css ) {
		return $block_content;
	}

	// The scope reuses an existing uid class; add it only when it was freshly minted.
	$has_uid = (bool) preg_match( '/\bclass=["\'][^"\']*\b' . preg_quote( $scope, '/' ) . '\b/', $root_tag );
	$classes = $has_uid ? 'sgs-card-min' : 'sgs-card-min ' . $scope;

	if ( preg_match( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', $block_content ) ) {
		$block_content = preg_replace( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', '$1' . $classes . ' ', $block_content, 1 );
	} else {
		$block_content = preg_replace( '/^(\s*<\w+)(\b)/', '$1 class="' . $classes . '"$2', $block_content, 1 );
	}

	// The collector's lift filter takes `<style>` tags out of sgs/* blocks only, so this WooCommerce block hands its
	// rules to the collector directly on the front end; the editor and REST renders keep them beside the block.
	if ( function_exists( __NAMESPACE__ . '\sgs_is_frontend_render' ) && sgs_is_frontend_render() ) {
		sgs_collect_css( wp_strip_all_tags( $css ) );
		return $block_content;
	}
	return $block_content . '<style>' . wp_strip_all_tags( $css ) . '</style>';
}

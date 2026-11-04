<?php
/**
 * Look settings for WooCommerce's category chips and sort control.
 *
 * `woocommerce/product-filter-chips` (the chips of a category, attribute or brand filter) and
 * `woocommerce/catalog-sorting` (the "Sort by" select) have no setting for a chip's border width or font
 * weight, the count beside a chip, or the sort select's border, radius, fill and weight. This extension adds them
 * to those two blocks ONLY, each empty by default; an empty value prints nothing, so a site that sets none of them
 * keeps WooCommerce's and the theme's look byte for byte.
 *
 * Chips (`sgsChipBorderWidth`, `sgsChipFontWeight`, `sgsChipCountPill` with `sgsChipCountBackground`,
 * `sgsChipCountColour`, `sgsChipCountRadius`, and `sgsChipPaintButtons`): WooCommerce stores the colours a client
 * picks on the chips block (`customChipBackground`, `customChipBorder`, `customChipText`, the same three
 * `customSelectedChip*`, or the palette slugs `chipBackground` and the rest) and hands them to its own stylesheet
 * through `.has-chip-*-color` classes and `--wc-product-filter-chips-*` variables. The server markup carries
 * them only as `data-custom-chip-*` attributes, so the classes and variables WooCommerce's rules read never
 * exist and the chip buttons keep the unstyled default. With `sgsChipPaintButtons` on, those same stored
 * colours are printed straight onto the chip buttons, resting and chosen (`aria-checked="true"`).
 *
 * Sort (`sgsSortBackground`, `sgsSortBorderColour`, `sgsSortBorderWidth`, `sgsSortBorderRadius`,
 * `sgsSortFontWeight`): printed on `select.orderby`.
 *
 * The frontend rule is a scoped `<style>` tag, never a style="" attribute (Spec 32), on the block's own uid
 * class or a minted `sgs-filter-look-<8hex>` scope.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const SGS_FILTER_LOOK_CHIPS_BLOCK = 'woocommerce/product-filter-chips';
const SGS_FILTER_LOOK_SORT_BLOCK  = 'woocommerce/catalog-sorting';

add_filter( 'render_block', __NAMESPACE__ . '\sgs_inject_filter_look', 11, 2 );

/**
 * Add a marker + scope class to a block's root and hand its scoped rule to the page.
 *
 * Shared by every WooCommerce block extension that prints a scoped rule on a block it does not own.
 *
 * @param string   $block_content Rendered block HTML.
 * @param string   $marker        Marker class the minted scope is prefixed with (also added to the root).
 * @param callable $css_for_scope Receives the scope class (no leading dot), returns CSS text without a <style> wrapper.
 * @return string The block HTML with the classes added and the rule beside it (editor and REST) or collected (front end).
 */
function sgs_inject_scoped_block_css( string $block_content, string $marker, callable $css_for_scope ): string {
	require_once __DIR__ . '/render-helpers.php';
	require_once __DIR__ . '/helpers-scoped-instance-vars.php';

	$root_tag = sgs_extract_root_opening_tag( ltrim( $block_content ) );
	if ( '' === $root_tag ) {
		return $block_content;
	}
	$scope = sgs_scope_class_for_root( $root_tag, $marker );
	$css   = (string) $css_for_scope( $scope );
	if ( '' === $css ) {
		return $block_content;
	}

	// The scope reuses an existing uid class; add it only when it was freshly minted.
	$has_uid = (bool) preg_match( '/\bclass=["\'][^"\']*\b' . preg_quote( $scope, '/' ) . '\b/', $root_tag );
	$classes = $has_uid ? $marker : $marker . ' ' . $scope;

	if ( preg_match( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', $block_content ) ) {
		$block_content = preg_replace( '/^(\s*<\w+\b[^>]*\bclass=["\'])/', '$1' . $classes . ' ', $block_content, 1 );
	} else {
		$block_content = preg_replace( '/^(\s*<\w+)(\b)/', '$1 class="' . $classes . '"$2', $block_content, 1 );
	}

	// The collector's lift filter takes `<style>` tags out of sgs/* blocks only, so this WooCommerce block hands its
	// rule to the collector directly on the front end (one flushed stylesheet, FR-32-11); the editor and REST renders
	// keep it beside the block, as the collector does for every block there.
	if ( function_exists( __NAMESPACE__ . '\sgs_is_frontend_render' ) && sgs_is_frontend_render() ) {
		sgs_collect_css( wp_strip_all_tags( $css ) );
		return $block_content;
	}
	return $block_content . '<style>' . wp_strip_all_tags( $css ) . '</style>';
}

/**
 * The first non-empty colour among the given block attributes, resolved to a CSS value.
 *
 * @param array<string, mixed> $attrs Block attributes.
 * @param string[]             $keys  Attribute names, in order of preference.
 * @return string CSS colour, or ''.
 */
function sgs_filter_look_colour( array $attrs, array $keys ): string {
	foreach ( $keys as $key ) {
		$raw = $attrs[ $key ] ?? '';
		if ( is_string( $raw ) && '' !== $raw ) {
			$value = sgs_colour_value( $raw );
			if ( '' !== $value ) {
				return $value;
			}
		}
	}
	return '';
}

/**
 * One rule from a declaration list.
 *
 * @param string   $selector Selector.
 * @param string[] $decls    Declarations without semicolons.
 * @return string The rule, or '' when there is no declaration.
 */
function sgs_filter_look_rule( string $selector, array $decls ): string {
	return array() === $decls ? '' : $selector . '{' . implode( ';', $decls ) . ';}';
}

/**
 * The scoped CSS for a chips block's look settings.
 *
 * @param array<string, mixed> $attrs Stored block attributes.
 * @param string               $scope Scope class name, no leading dot.
 * @return string CSS text without a <style> wrapper; '' when nothing is set.
 */
function sgs_filter_look_chips_css( array $attrs, string $scope ): string {
	require_once __DIR__ . '/render-helpers.php';
	$root = '.sgs-filter-look.' . $scope;
	$item = $root . ' .wc-block-product-filter-chips__item';

	$rest = array();
	$weight = sgs_font_weight_value( $attrs['sgsChipFontWeight'] ?? '' );
	if ( '' !== $weight ) {
		$rest[] = 'font-weight:' . $weight;
	}
	$border_width = sgs_css_single_length_value( (string) ( $attrs['sgsChipBorderWidth'] ?? '' ) );
	if ( '' !== $border_width ) {
		$rest[] = 'border-width:' . $border_width;
	}

	$chosen = array();
	if ( true === ( $attrs['sgsChipPaintButtons'] ?? false ) ) {
		$fill   = sgs_filter_look_colour( $attrs, array( 'customChipBackground', 'chipBackground' ) );
		$edge   = sgs_filter_look_colour( $attrs, array( 'customChipBorder', 'chipBorder' ) );
		$text   = sgs_filter_look_colour( $attrs, array( 'customChipText', 'chipText' ) );
		$c_fill = sgs_filter_look_colour( $attrs, array( 'customSelectedChipBackground', 'selectedChipBackground' ) );
		$c_edge = sgs_filter_look_colour( $attrs, array( 'customSelectedChipBorder', 'selectedChipBorder' ) );
		$c_text = sgs_filter_look_colour( $attrs, array( 'customSelectedChipText', 'selectedChipText' ) );
		if ( '' !== $fill ) {
			$rest[] = 'background:' . $fill;
		}
		if ( '' !== $edge ) {
			$rest[] = 'border-color:' . $edge;
		}
		if ( '' !== $text ) {
			$rest[] = 'color:' . $text;
		}
		if ( '' !== $c_fill ) {
			$chosen[] = 'background:' . $c_fill;
		}
		if ( '' !== $c_edge ) {
			$chosen[] = 'border-color:' . $c_edge;
		}
		if ( '' !== $c_text ) {
			$chosen[] = 'color:' . $c_text;
		}
	}

	$count = array();
	if ( true === ( $attrs['sgsChipCountPill'] ?? false ) ) {
		$count[] = 'padding-inline:0.5em';
		$count[] = 'min-width:1.5em';
		$count[] = 'text-align:center';
		$radius  = sgs_css_single_length_value( (string) ( $attrs['sgsChipCountRadius'] ?? '' ) );
		$count[] = 'border-radius:' . ( '' !== $radius ? $radius : '999px' );
		$count_fill = sgs_filter_look_colour( $attrs, array( 'sgsChipCountBackground' ) );
		if ( '' !== $count_fill ) {
			$count[] = 'background-color:' . $count_fill;
		}
		$count_text = sgs_filter_look_colour( $attrs, array( 'sgsChipCountColour' ) );
		if ( '' !== $count_text ) {
			$count[] = 'color:' . $count_text;
		}
	}

	return sgs_filter_look_rule( $item, $rest )
		. sgs_filter_look_rule( $item . '[aria-checked="true"]', $chosen )
		. sgs_filter_look_rule( $root . ' .wc-block-product-filter-chips__count', $count );
}

/**
 * The scoped CSS for a sort block's look settings.
 *
 * @param array<string, mixed> $attrs Stored block attributes.
 * @param string               $scope Scope class name, no leading dot.
 * @return string CSS text without a <style> wrapper; '' when nothing is set.
 */
function sgs_filter_look_sort_css( array $attrs, string $scope ): string {
	require_once __DIR__ . '/render-helpers.php';
	$decls  = array();
	$fill   = sgs_filter_look_colour( $attrs, array( 'sgsSortBackground' ) );
	$edge   = sgs_filter_look_colour( $attrs, array( 'sgsSortBorderColour' ) );
	$width  = sgs_css_single_length_value( (string) ( $attrs['sgsSortBorderWidth'] ?? '' ) );
	$radius = sgs_css_single_length_value( (string) ( $attrs['sgsSortBorderRadius'] ?? '' ) );
	$weight = sgs_font_weight_value( $attrs['sgsSortFontWeight'] ?? '' );
	if ( '' !== $fill ) {
		$decls[] = 'background-color:' . $fill;
	}
	if ( '' !== $width ) {
		$decls[] = 'border-style:solid';
		$decls[] = 'border-width:' . $width;
	}
	if ( '' !== $edge ) {
		$decls[] = 'border-color:' . $edge;
	}
	if ( '' !== $radius ) {
		$decls[] = 'border-radius:' . $radius;
	}
	if ( '' !== $weight ) {
		$decls[] = 'font-weight:' . $weight;
	}
	return sgs_filter_look_rule( '.sgs-filter-look.' . $scope . ' select.orderby', $decls );
}

/**
 * Render-block filter: the look rule for the chips and sort blocks.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_inject_filter_look( $block_content, $block ) {
	if ( ! is_string( $block_content ) || '' === trim( $block_content ) || ! is_array( $block ) ) {
		return $block_content;
	}
	$name  = $block['blockName'] ?? '';
	$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
	if ( SGS_FILTER_LOOK_CHIPS_BLOCK === $name ) {
		return sgs_inject_scoped_block_css(
			$block_content,
			'sgs-filter-look',
			static fn( string $scope ): string => sgs_filter_look_chips_css( $attrs, $scope )
		);
	}
	if ( SGS_FILTER_LOOK_SORT_BLOCK === $name ) {
		return sgs_inject_scoped_block_css(
			$block_content,
			'sgs-filter-look',
			static fn( string $scope ): string => sgs_filter_look_sort_css( $attrs, $scope )
		);
	}
	return $block_content;
}

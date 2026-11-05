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
 * Chips (`sgsChipBorderWidth`, `sgsChipMinHeight`, `sgsChipFontWeight`, `sgsChipCountPill` with `sgsChipCountBackground`,
 * `sgsChipCountColour`, `sgsChipCountRadius`, and `sgsChipPaintButtons`): WooCommerce stores the colours a client
 * picks on the chips block (`customChipBackground`, `customChipBorder`, `customChipText`, the same three
 * `customSelectedChip*`, or the palette slugs `chipBackground` and the rest) and hands them to its own stylesheet
 * through `.has-chip-*-color` classes and `--wc-product-filter-chips-*` variables. The server markup carries
 * them only as `data-custom-chip-*` attributes, so the classes and variables WooCommerce's rules read never
 * exist and the chip buttons keep the unstyled default. With `sgsChipPaintButtons` on, those same stored
 * colours are printed straight onto the chip buttons, resting and chosen (`aria-checked="true"`).
 *
 * Count pill (`sgsChipCountPill`): WooCommerce prints the count as `(<span data-wp-text="context.item.count">3</span>)`
 * inside `.wc-block-product-filter-chips__count`. With the pill on, the two bracket text nodes are dropped so the pill holds
 * the bare number (the `data-wp-text` span, which the Interactivity store updates, is untouched); the pill is centred and
 * `sgsChipCountSize` / `sgsChipCountFontSize` size it.
 *
 * Chosen chip shadow and shift (`sgsChipSelected*`) and the All chip's count (`sgsChipAllCount`): product-filter-chip-chosen.php.
 *
 * All chip (`sgsChipAllLabel`): a non-empty label adds a first chip, a plain link to this page with the group's filter
 * parameters removed, marked `aria-current="true"` while nothing in the group is chosen. A group with a start term links
 * to the page with that parameter set to empty, so the start term is not applied again.
 *
 * Start term (`sgsChipStartTerm`): a term slug the group opens on. WooCommerce keeps filter state only in the URL query
 * (`tags`, `categories`, `filter_<attribute>`), read from REQUEST_URI for the chosen state and from the query vars for the
 * product list, so a page opened with none of those parameters is redirected (302) once to the same URL with the start
 * term's parameter: the chip is chosen by WooCommerce itself (`aria-checked`), the address is shareable, and clearing the
 * chip works (the Interactivity router fetches with `Sec-Fetch-Dest: empty`, which is never redirected). The page is sent
 * uncacheable while it can redirect. Only page content is searched for the setting.
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

require_once __DIR__ . '/product-filter-chip-chosen.php';

const SGS_FILTER_LOOK_CHIPS_BLOCK = 'woocommerce/product-filter-chips';
const SGS_FILTER_LOOK_SORT_BLOCK  = 'woocommerce/catalog-sorting';

add_filter( 'render_block', __NAMESPACE__ . '\sgs_inject_filter_look', 11, 2 );
add_filter( 'render_block', __NAMESPACE__ . '\sgs_filter_look_chips_markup', 9, 3 );
add_filter( 'wp', __NAMESPACE__ . '\sgs_chip_start_maybe_redirect', 1 );

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

	$rest   = array();
	$weight = sgs_font_weight_value( $attrs['sgsChipFontWeight'] ?? '' );
	if ( '' !== $weight ) {
		$rest[] = 'font-weight:' . $weight;
	}
	$min_height = sgs_css_single_length_value( (string) ( $attrs['sgsChipMinHeight'] ?? '' ) );
	if ( '' !== $min_height ) {
		$rest[] = 'min-height:' . $min_height;
	}
	$border_width = sgs_css_single_length_value( (string) ( $attrs['sgsChipBorderWidth'] ?? '' ) );
	if ( '' !== $border_width ) {
		$rest[] = 'border-width:' . $border_width;
	}

	$chosen_look = sgs_filter_look_chosen_decls( $attrs );
	$chosen      = array();
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
	$chosen = array_merge( $chosen, $chosen_look );

	$count = array();
	if ( true === ( $attrs['sgsChipCountPill'] ?? false ) ) {
		$size      = sgs_css_single_length_value( (string) ( $attrs['sgsChipCountSize'] ?? '' ) );
		$font_size = sgs_css_single_length_value( (string) ( $attrs['sgsChipCountFontSize'] ?? '' ) );
		$radius    = sgs_css_single_length_value( (string) ( $attrs['sgsChipCountRadius'] ?? '' ) );
		$count[]   = 'display:inline-flex';
		$count[]   = 'align-items:center';
		$count[]   = 'justify-content:center';
		$count[]   = 'padding-inline:0.5em';
		$count[]   = 'min-width:' . ( '' !== $size ? $size : '1.5em' );
		if ( '' !== $size ) {
			$count[] = 'height:' . $size;
		}
		if ( '' !== $font_size ) {
			$count[] = 'font-size:' . $font_size;
		}
		$count[]    = 'border-radius:' . ( '' !== $radius ? $radius : '999px' );
		$count_fill = sgs_filter_look_colour( $attrs, array( 'sgsChipCountBackground' ) );
		if ( '' !== $count_fill ) {
			$count[] = 'background-color:' . $count_fill;
		}
		$count_text = sgs_filter_look_colour( $attrs, array( 'sgsChipCountColour' ) );
		if ( '' !== $count_text ) {
			$count[] = 'color:' . $count_text;
		}
	}

	// The All chip is a link: it centres like a button and, while chosen, wears WooCommerce's own chosen-chip look.
	$has_all     = '' !== trim( (string) ( $attrs['sgsChipAllLabel'] ?? '' ) );
	$all         = $has_all ? array_merge( array( 'display:inline-flex', 'align-items:center', 'text-decoration:none' ), sgs_filter_look_item_shape_decls( $attrs ) ) : array();
	$all_current = $has_all ? array(
		'background:var(--wc-product-filter-chips-selected-background,var(--wc-product-filter-chips-text,CanvasText))',
		'border-color:var(--wc-product-filter-chips-selected-border,var(--wc-product-filter-chips-text,CanvasText))',
		'color:var(--wc-product-filter-chips-selected-text,var(--wc-product-filter-chips-background,Canvas))',
	) : array();
	if ( $has_all ) {
		$all_current = array_merge( $all_current, $chosen_look );
	}

	return sgs_filter_look_rule( $item, $rest )
		. sgs_filter_look_rule( $item . '[aria-checked="true"]', $chosen )
		. sgs_filter_look_rule( $root . ' .wc-block-product-filter-chips__count', $count )
		. sgs_filter_look_rule( $root . ' .sgs-filter-look__all', $all )
		. sgs_filter_look_rule( $root . ' .sgs-filter-look__all[aria-current="true"]', $all_current );
}

/**
 * The radius and padding WooCommerce prints as an inline style on each chip button, as declarations for the All chip.
 *
 * @param array<string, mixed> $attrs Stored block attributes.
 * @return string[] Declarations without semicolons; empty when the chips carry neither.
 */
function sgs_filter_look_item_shape_decls( array $attrs ): array {
	$styles = wp_style_engine_get_styles(
		array(
			'border'  => array( 'radius' => $attrs['style']['border']['radius'] ?? null ),
			'spacing' => array( 'padding' => $attrs['style']['spacing']['padding'] ?? null ),
		)
	);
	$css = is_string( $styles['css'] ?? null ) ? $styles['css'] : '';
	return array_values( array_filter( array_map( 'trim', explode( ';', $css ) ), 'strlen' ) );
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

/**
 * The query parameters one filter group keeps its state in.
 *
 * @param string $type Item type WooCommerce stores: `taxonomy/<taxonomy>` or `attribute/<attribute>`.
 * @return string[] Parameter names; empty for an unknown type.
 */
function sgs_chip_group_param_keys( string $type ): array {
	if ( 0 === strpos( $type, 'attribute/' ) ) {
		$name = substr( $type, 10 );
		return '' === $name ? array() : array( 'filter_' . $name, 'query_type_' . $name );
	}
	if ( 0 !== strpos( $type, 'taxonomy/' ) ) {
		return array();
	}
	$taxonomy = substr( $type, 9 );
	$map      = array();
	if ( function_exists( 'wc_get_container' ) && class_exists( '\Automattic\WooCommerce\Internal\ProductFilters\Params' ) ) {
		$params = wc_get_container()->get( \Automattic\WooCommerce\Internal\ProductFilters\Params::class )->get_param( 'taxonomy' );
		$map    = is_array( $params ) ? $params : array();
	}
	$map += array(
		'product_cat'   => 'categories',
		'product_tag'   => 'tags',
		'product_brand' => 'brands',
	);
	return array( $map[ $taxonomy ] ?? 'filter_' . $taxonomy );
}

/**
 * The All chip: a link that clears the group's filter, first in the chip list.
 *
 * @param string $label   Chip text.
 * @param string $href    Page address with the group's parameters removed.
 * @param bool   $current True while nothing in the group is chosen.
 * @param string $count   Count span markup, or '' for none.
 * @return string Markup.
 */
function sgs_chip_all_markup( string $label, string $href, bool $current, string $count = '' ): string {
	return '<a class="wc-block-product-filter-chips__item sgs-filter-look__all" href="' . esc_url( $href ) . '"'
		. ( $current ? ' aria-current="true"' : '' ) . '><span class="wc-block-product-filter-chips__label"><span class="wc-block-product-filter-chips__text">'
		. esc_html( $label ) . '</span>' . $count . '</span></a>';
}

/**
 * Render-block filter: the bare count number and the All chip.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @param mixed $instance      Block instance (holds the filter group's items in its context).
 * @return mixed
 */
function sgs_filter_look_chips_markup( $block_content, $block, $instance = null ) {
	if ( ! is_string( $block_content ) || ! is_array( $block ) || SGS_FILTER_LOOK_CHIPS_BLOCK !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();

	if ( true === ( $attrs['sgsChipCountPill'] ?? false ) ) {
		$block_content = preg_replace(
			'/\(\s*(<span data-wp-text="context\.item\.count">[^<]*<\/span>)\s*\)/',
			'$1',
			$block_content
		);
	}

	$label = trim( (string) ( $attrs['sgsChipAllLabel'] ?? '' ) );
	if ( '' === $label || ! is_object( $instance ) || ! is_array( $instance->context ?? null ) ) {
		return $block_content;
	}
	$items = $instance->context['woocommerce/selectableItems']['items'] ?? null;
	if ( ! is_array( $items ) || array() === $items ) {
		return $block_content;
	}
	$first  = reset( $items );
	$keys   = sgs_chip_group_param_keys( is_array( $first ) ? (string) ( $first['type'] ?? '' ) : '' );
	$anchor = '<div class="wc-block-product-filter-chips__items">';
	$at     = strpos( $block_content, $anchor );
	if ( array() === $keys || false === $at ) {
		return $block_content;
	}
	$current = true;
	foreach ( $items as $item ) {
		if ( is_array( $item ) && ! empty( $item['selected'] ) ) {
			$current = false;
			break;
		}
	}
	$href = remove_query_arg( array_merge( $keys, array( 'paged' ) ) );
	if ( '' !== trim( (string) ( $attrs['sgsChipStartTerm'] ?? '' ) ) ) {
		$href = add_query_arg( $keys[0], '', $href );
	}
	$count = true === ( $attrs['sgsChipAllCount'] ?? false )
		? sgs_filter_look_all_count_markup( sgs_filter_look_all_count(), true === ( $attrs['sgsChipCountPill'] ?? false ) )
		: '';
	return substr_replace( $block_content, $anchor . sgs_chip_all_markup( $label, $href, $current, $count ), $at, strlen( $anchor ) );
}

/**
 * Every start term set on a chips block, with the filter group it belongs to.
 *
 * @param array<int, array<string, mixed>> $blocks Parsed blocks.
 * @param string                           $type   Item type of the enclosing filter block ('' outside one).
 * @return array<int, array{type: string, term: string}>
 */
function sgs_chip_start_collect( array $blocks, string $type = '' ): array {
	$found = array();
	foreach ( $blocks as $block ) {
		$name  = (string) ( $block['blockName'] ?? '' );
		$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
		$here  = $type;
		if ( 'woocommerce/product-filter-taxonomy' === $name ) {
			$here = 'taxonomy/' . ( is_string( $attrs['taxonomy'] ?? null ) && '' !== $attrs['taxonomy'] ? $attrs['taxonomy'] : 'product_cat' );
		} elseif ( 'woocommerce/product-filter-attribute' === $name && function_exists( 'wc_get_attribute' ) && ! empty( $attrs['attributeId'] ) ) {
			$attribute = wc_get_attribute( (int) $attrs['attributeId'] );
			$here      = $attribute ? 'attribute/' . str_replace( 'pa_', '', (string) $attribute->slug ) : '';
		}
		if ( SGS_FILTER_LOOK_CHIPS_BLOCK === $name && '' !== $type && is_string( $attrs['sgsChipStartTerm'] ?? null ) ) {
			$term = sanitize_title( $attrs['sgsChipStartTerm'] );
			if ( '' !== $term ) {
				$found[] = array(
					'type' => $type,
					'term' => $term,
				);
			}
		}
		if ( is_array( $block['innerBlocks'] ?? null ) && array() !== $block['innerBlocks'] ) {
			$found = array_merge( $found, sgs_chip_start_collect( $block['innerBlocks'], $here ) );
		}
	}
	return $found;
}

/**
 * The query arguments to add so each group opens on its start term, or none when the page is already filtered.
 *
 * @param array<int, array{type: string, term: string}> $starts   From sgs_chip_start_collect().
 * @param array<string, mixed>                          $query    The request's query arguments.
 * @param string[]                                      $all_keys Every filter parameter name WooCommerce reads.
 * @return array<string, string> Parameter => term slug.
 */
function sgs_chip_start_args( array $starts, array $query, array $all_keys ): array {
	if ( array() !== array_intersect_key( $query, array_flip( $all_keys ) ) ) {
		return array();
	}
	$args = array();
	foreach ( $starts as $start ) {
		$keys = sgs_chip_group_param_keys( $start['type'] );
		if ( array() !== $keys && ! isset( $args[ $keys[0] ] ) ) {
			$args[ $keys[0] ] = $start['term'];
		}
	}
	return $args;
}

/**
 * `wp` action: send an unfiltered page that has a start term to the same page with the term set.
 *
 * @return void
 */
function sgs_chip_start_maybe_redirect(): void {
	if ( is_admin() || wp_doing_ajax() || ! is_singular() || 'GET' !== ( $_SERVER['REQUEST_METHOD'] ?? '' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		return;
	}
	$post = get_queried_object();
	if ( ! $post instanceof \WP_Post || ! has_block( SGS_FILTER_LOOK_CHIPS_BLOCK, $post ) ) {
		return;
	}
	$starts = array_values(
		array_filter(
			sgs_chip_start_collect( parse_blocks( $post->post_content ) ),
			static fn( array $s ): bool => 0 !== strpos( $s['type'], 'taxonomy/' ) || (bool) term_exists( $s['term'], substr( $s['type'], 9 ) )
		)
	);
	if ( array() === $starts ) {
		return;
	}
	$all_keys = array();
	foreach ( $starts as $start ) {
		$all_keys = array_merge( $all_keys, sgs_chip_group_param_keys( $start['type'] ) );
	}
	if ( function_exists( 'wc_get_container' ) && class_exists( '\Automattic\WooCommerce\Internal\ProductFilters\Params' ) ) {
		$all_keys = array_merge( $all_keys, wc_get_container()->get( \Automattic\WooCommerce\Internal\ProductFilters\Params::class )->get_param_keys() );
	}
	$args = sgs_chip_start_args( $starts, $_GET, $all_keys ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( array() === $args ) {
		return;
	}
	// This address can redirect, so no cache may keep either answer for it.
	nocache_headers();
	header( 'X-LiteSpeed-Cache-Control: no-cache' );
	do_action( 'litespeed_control_set_nocache', 'sgs chip start term' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LiteSpeed Cache's own hook.
	// The Interactivity router fetches regions with Sec-Fetch-Dest: empty; only a page load is redirected.
	$dest = isset( $_SERVER['HTTP_SEC_FETCH_DEST'] ) ? sanitize_key( wp_unslash( $_SERVER['HTTP_SEC_FETCH_DEST'] ) ) : 'document';
	if ( 'document' !== $dest ) {
		return;
	}
	wp_safe_redirect( add_query_arg( $args ), 302 );
	exit;
}

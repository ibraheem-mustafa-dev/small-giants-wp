<?php
/**
 * Shop filters in their final structure from the first frame.
 *
 * `assets/js/sgs-shop-filters.js` and its modules used to build three parts after the page loaded: the Filter
 * button, the panel header (heading and close button) and the `is-enhanced` body class the mobile layout keys
 * on. Each one moved or resized content once it ran. They are now part of the server markup, so the scripts find
 * them and only add behaviour:
 *
 * - the body class is set by a one-line script at the top of `<body>` (`wp_body_open`), before anything paints;
 * - the panel header is added to the panel's own markup when the template carries none;
 * - the Filter button is printed where the shop puts it: just before the sort menu when the Customizer's
 *   "Filter button place" is the toolbar (with the modifier class the move used to add), otherwise before the
 *   shop layout. A copy the template already carries is kept in place of a second one.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Whether this request prints the shop filter panel.
 *
 * @return bool
 */
function shop_filters_first_paint_active(): bool {
	if ( ! wp_script_is( 'sgs-shop-filters', 'enqueued' ) ) {
		return false;
	}
	$template = isset( $GLOBALS['_wp_current_template_content'] ) ? (string) $GLOBALS['_wp_current_template_content'] : '';
	return false !== strpos( $template, 'sgs-shop-filters' );
}

/**
 * Marks the body as script-enhanced before the first paint.
 *
 * @return void
 */
function print_shop_filters_enhanced_class(): void {
	if ( ! shop_filters_first_paint_active() ) {
		return;
	}
	echo "<script>document.body.classList.add('is-enhanced');</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static string.
}
add_action( 'wp_body_open', __NAMESPACE__ . '\print_shop_filters_enhanced_class', 1 );

/**
 * A stroked 24px icon, the same shape the scripts print.
 *
 * @param string $lines SVG line elements.
 * @return string
 */
function shop_filters_icon( string $lines ): string {
	return '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' . $lines . '</svg>';
}

/**
 * The Filter button markup.
 *
 * @param bool $toolbar Whether it sits in the toolbar beside the sort menu.
 * @return string
 */
function shop_filters_toggle_markup( bool $toolbar ): string {
	$class = 'sgs-shop-filters__toggle' . ( $toolbar ? ' sgs-shop-filters__toggle--toolbar' : '' );
	return '<button type="button" class="' . esc_attr( $class ) . '" aria-expanded="false" aria-controls="sgs-shop-filters">'
		. shop_filters_icon( '<line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>' )
		. '<span>' . esc_html__( 'Filter', 'sgs-theme' ) . '</span></button>';
}

/**
 * Whether the Filter button has been printed on this request.
 *
 * @param bool|null $set New value, or null to read.
 * @return bool
 */
function shop_filters_toggle_printed( ?bool $set = null ): bool {
	static $printed = false;
	if ( null !== $set ) {
		$printed = $set;
	}
	return $printed;
}

/**
 * Prints the Filter button before the sort menu when the toolbar is its place.
 *
 * @param string $content Rendered sort block.
 * @return string
 */
function place_shop_filters_toggle_in_toolbar( $content ) {
	if ( ! is_string( $content ) || '' === $content || shop_filters_toggle_printed() || ! shop_filters_first_paint_active() ) {
		return $content;
	}
	if ( 'toolbar' !== shop_controls_look_value( 'sgs_shop_toggle_place' ) ) {
		return $content;
	}
	shop_filters_toggle_printed( true );
	return shop_filters_toggle_markup( true ) . $content;
}
add_filter( 'render_block_woocommerce/catalog-sorting', __NAMESPACE__ . '\place_shop_filters_toggle_in_toolbar', 20 );

/**
 * Keeps one Filter button: a copy printed in the toolbar replaces the template's own HTML block copy.
 *
 * @param string $content Rendered Custom HTML block.
 * @return string
 */
function dedupe_shop_filters_toggle( $content ) {
	if ( ! is_string( $content ) || false === strpos( $content, 'sgs-shop-filters__toggle' ) ) {
		return $content;
	}
	if ( shop_filters_toggle_printed() ) {
		return '';
	}
	shop_filters_toggle_printed( true );
	return $content;
}
add_filter( 'render_block_core/html', __NAMESPACE__ . '\dedupe_shop_filters_toggle', 20 );

/**
 * Adds the Filter button and the panel header to the shop layout and its panel when the template has none.
 *
 * @param string               $content Rendered block.
 * @param array<string, mixed> $block   Parsed block.
 * @return string
 */
function add_shop_filters_parts( $content, $block ) {
	if ( ! is_string( $content ) || ! is_array( $block ) || 'sgs/container' !== ( $block['blockName'] ?? '' ) || ! shop_filters_first_paint_active() ) {
		return $content;
	}
	$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();

	if ( 'sgs-shop-filters' === ( $attrs['anchor'] ?? '' ) ) {
		return add_shop_filters_panel_parts( $content );
	}

	$classes = ' ' . (string) ( $attrs['className'] ?? '' ) . ' ';
	if ( false !== strpos( $classes, ' sgs-shop-layout ' ) && ! shop_filters_toggle_printed() ) {
		shop_filters_toggle_printed( true );
		return shop_filters_toggle_markup( false ) . $content;
	}
	return $content;
}
add_filter( 'render_block', __NAMESPACE__ . '\add_shop_filters_parts', 20, 2 );

/**
 * The panel header and the one-switch filter, printed in the panel's own markup.
 *
 * @param string $content Rendered panel block.
 * @return string
 */
function add_shop_filters_panel_parts( string $content ): string {
	$bool = shop_filters_boolean_markup();

	if ( false === strpos( $content, 'sgs-shop-filters__header' ) ) {
		$header  = '<div class="sgs-shop-filters__header"><h2 class="sgs-shop-filters__heading">' . esc_html__( 'Filter', 'sgs-theme' ) . '</h2>'
			. '<button type="button" class="sgs-shop-filters__close" aria-label="' . esc_attr__( 'Close filters', 'sgs-theme' ) . '">'
			. shop_filters_icon( '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' ) . '</button></div>';
		$content = shop_filters_insert_inside_panel( $content, $header, true );
	}

	if ( '' === $bool || false !== strpos( $content, 'sgs-shop-filters__bool-filter' ) ) {
		return $content;
	}
	$config = get_shop_filter_boolean_config();
	return shop_filters_insert_inside_panel( $content, $bool, 'bottom' !== ( $config['position'] ?? 'top' ) );
}

/**
 * Inserts markup at the start or end of the panel's content, inside its inner wrapper when it has one.
 *
 * @param string $content Rendered panel block.
 * @param string $html    Markup to insert.
 * @param bool   $at_start True for the start, false for the end.
 * @return string
 */
function shop_filters_insert_inside_panel( string $content, string $html, bool $at_start ): string {
	if ( $at_start ) {
		if ( 1 !== preg_match( '/<aside\b[^>]*>(?:\s*<div class="sgs-container__inner[^"]*"[^>]*>)?/', $content, $m, PREG_OFFSET_CAPTURE ) ) {
			return $content;
		}
		$at = $m[0][1] + strlen( $m[0][0] );
		return substr( $content, 0, $at ) . $html . substr( $content, $at );
	}
	if ( 1 !== preg_match( '/(?:<\/div>\s*)?<\/aside>\s*$/', $content, $m, PREG_OFFSET_CAPTURE ) ) {
		return $content;
	}
	return substr( $content, 0, $m[0][1] ) . $html . substr( $content, $m[0][1] );
}

/**
 * The one-switch filter ("Polarised only") the Customizer sets up, as the script used to build it.
 *
 * @return string Markup, or '' when no switch is configured.
 */
function shop_filters_boolean_markup(): string {
	$config = get_shop_filter_boolean_config();
	if ( null === $config ) {
		return '';
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- a public filter parameter, read only.
	$raw     = isset( $_GET[ $config['param'] ] ) ? sanitize_text_field( wp_unslash( (string) $_GET[ $config['param'] ] ) ) : '';
	$checked = in_array( $config['term'], explode( ',', $raw ), true );
	return '<div class="sgs-shop-filters__bool-filter"><label class="sgs-shop-filters__bool-filter-label">'
		. '<input type="checkbox" role="switch" class="sgs-shop-filters__bool-filter-input sgs-focus-source"' . ( $checked ? ' checked' : '' ) . ' aria-checked="' . ( $checked ? 'true' : 'false' ) . '">'
		. '<span class="sgs-shop-filters__bool-filter-switch sgs-focus-proxy" aria-hidden="true"></span>'
		. '<span class="sgs-shop-filters__bool-filter-text">' . esc_html( $config['label'] ) . '</span></label></div>';
}

/**
 * The "All" label of the segmented filter row as a CSS string, for the first segment the stylesheet draws
 * before the script builds the real row.
 *
 * @return void
 */
function add_shop_segmented_label_style(): void {
	if ( ! wp_style_is( 'sgs-woocommerce', 'enqueued' ) ) {
		return;
	}
	$label = addcslashes( wp_strip_all_tags( __( 'All', 'sgs-theme' ) ), "\"\\r\n" );
	wp_add_inline_style( 'sgs-woocommerce', ':root{--sgs-segmented-all-label:"' . $label . '";}' );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\add_shop_segmented_label_style', 21 );

/**
 * Prints each counted group's option number on its heading (`data-sgs-count`), for the stylesheet to draw
 * beside the heading before the script builds the group's own count.
 *
 * A heading with the class `sgs-filter-count` counts the chip and checkbox options in the filter blocks
 * that follow it, up to the next group heading.
 *
 * @param string $content Rendered product filters block.
 * @return string
 */
function add_shop_filter_group_counts( $content ) {
	if ( ! is_string( $content ) || false === strpos( $content, 'sgs-filter-count' ) ) {
		return $content;
	}
	$parts = preg_split( '/(<h[1-6]\b[^>]*\bsgs-shop-filters__group-heading\b[^>]*>)/', $content, -1, PREG_SPLIT_DELIM_CAPTURE );
	if ( ! is_array( $parts ) || count( $parts ) < 3 ) {
		return $content;
	}
	$out = $parts[0];
	for ( $i = 1, $n = count( $parts ); $i < $n; $i += 2 ) {
		$tag  = $parts[ $i ];
		$body = $parts[ $i + 1 ] ?? '';
		if ( 1 === preg_match( '/\bclass="[^"]*\bsgs-filter-count\b/', $tag ) && false === strpos( $tag, 'data-sgs-count' ) ) {
			$options = preg_replace( '/<template\b.*?<\/template>/s', '', $body );
			$total   = preg_match_all( '/\bclass="[^"]*\bwc-block-product-filter-(?:chips|checkbox-list)__item(?=[\s"])/', (string) $options );
			$tag     = substr( $tag, 0, -1 ) . ' data-sgs-count="' . (int) $total . '">';
		}
		$out .= $tag . $body;
	}
	return $out;
}
add_filter( 'render_block_woocommerce/product-filters', __NAMESPACE__ . '\add_shop_filter_group_counts', 20 );

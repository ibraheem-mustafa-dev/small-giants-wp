<?php
/**
 * SGS Shop filter drawer: the breakpoint rules, printed from the drawer breakpoint option.
 *
 * The Customizer's Shop Filters > Drawer breakpoint (`sgs_shop_filter_drawer_breakpoint`, default 782,
 * registered in inc/shop-filters-settings.php) sets the width below which the filter panel is a bottom
 * sheet behind a Filter button and from which it is a sidebar. sgs-shop-filters.js switches on it
 * (`sgsShopFilters.breakpoint`); the CSS that goes with each presentation lives in
 * assets/css/shop-filters-drawer.css, written at the default, and is printed here after woocommerce.css
 * with its media queries set from the same value, so the script and the CSS always switch at one width.
 * At the default the file prints unchanged.
 *
 * Required by functions.php next to the other inc/ files.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/** The width the drawer CSS is written at (assets/css/shop-filters-drawer.css) and the option's default. */
const SHOP_FILTER_DRAWER_DEFAULT_BREAKPOINT = 782;

/**
 * The drawer breakpoint in px: the saved option, or 782 when it is unset, zero or not a number.
 *
 * @return int
 */
function shop_filter_drawer_breakpoint(): int {
	$breakpoint = absint( get_theme_mod( 'sgs_shop_filter_drawer_breakpoint', SHOP_FILTER_DRAWER_DEFAULT_BREAKPOINT ) );
	return $breakpoint > 0 ? $breakpoint : SHOP_FILTER_DRAWER_DEFAULT_BREAKPOINT;
}

/**
 * The drawer CSS for a breakpoint: assets/css/shop-filters-drawer.css with each drawer query
 * (`max-width: 781.98px`) moved to just below the breakpoint and each sidebar query
 * (`min-width: 782px`) to the breakpoint. Matches the deployed, minified file too
 * (`@media (max-width:781.98px)`).
 *
 * @param int $breakpoint Drawer breakpoint in px.
 * @return string The CSS, or '' when the file cannot be read.
 */
function shop_filter_drawer_css( int $breakpoint ): string {
	static $source = null;
	if ( null === $source ) {
		$file   = get_theme_file_path( 'assets/css/shop-filters-drawer.css' );
		$source = is_readable( $file ) ? (string) file_get_contents( $file ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local theme file.
	}
	if ( SHOP_FILTER_DRAWER_DEFAULT_BREAKPOINT === $breakpoint || '' === $source ) {
		return $source;
	}
	$css = preg_replace(
		'/@media\s*\(\s*max-width:\s*781\.98px\s*\)/',
		sprintf( '@media ( max-width: %spx )', number_format( $breakpoint - 0.02, 2, '.', '' ) ),
		$source
	);
	return (string) preg_replace(
		'/@media\s*\(\s*min-width:\s*782px\s*\)/',
		sprintf( '@media ( min-width: %dpx )', $breakpoint ),
		(string) $css
	);
}

/**
 * Print the drawer CSS right after woocommerce.css, on the stylesheet's own handle, wherever that
 * stylesheet loads (the rules were part of it).
 *
 * @return void
 */
function output_shop_filter_drawer_style(): void {
	if ( ! wp_style_is( 'sgs-woocommerce', 'enqueued' ) ) {
		return;
	}
	$css = shop_filter_drawer_css( shop_filter_drawer_breakpoint() );
	if ( '' !== $css ) {
		wp_add_inline_style( 'sgs-woocommerce', $css );
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\output_shop_filter_drawer_style', 20 );

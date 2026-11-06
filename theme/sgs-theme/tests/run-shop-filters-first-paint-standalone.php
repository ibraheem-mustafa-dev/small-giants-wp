<?php
/**
 * Standalone runner: the shop filters first-paint gate follows the page type (known during template render), not the
 * script's enqueue state, and the inline script and "All" label are printed safely.
 *
 * Run: php theme/sgs-theme/tests/run-shop-filters-first-paint-standalone.php
 *
 * @package SGS\Theme
 */

namespace {
	define( 'ABSPATH', __DIR__ );
	$GLOBALS['t_shop']       = false;
	$GLOBALS['t_printed']    = '';
	$GLOBALS['t_inline_css'] = '';
	function add_action( ...$a ) {}
	function add_filter( ...$a ) {}
	function is_shop() {
		return $GLOBALS['t_shop'];
	}
	function is_post_type_archive( $t ) {
		return false;
	}
	function is_tax( $t ) {
		return false;
	}
	function wp_script_is( $h, $s ) {
		return false; // Scripts are not enqueued yet while the template renders.
	}
	function wp_style_is( $h, $s ) {
		return true;
	}
	function wp_print_inline_script_tag( $js ) {
		$GLOBALS['t_printed'] .= $js;
	}
	function wp_strip_all_tags( $s ) {
		return strip_tags( $s );
	}
	function __( $s, $d = '' ) {
		return $GLOBALS['t_label'] ?? $s;
	}
	function wp_add_inline_style( $h, $css ) {
		$GLOBALS['t_inline_css'] = $css;
	}
}

namespace SGS\Theme {
	function is_shop_filters_surface(): bool {
		return function_exists( 'is_shop' ) && ( \is_shop() || \is_post_type_archive( 'product' ) || \is_tax( 'product_cat' ) || \is_tax( 'product_tag' ) );
	}
	require dirname( __DIR__ ) . '/inc/shop-filters-first-paint.php';

	$pass  = 0;
	$fail  = 0;
	$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
		$ok ? $pass++ : $fail++;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	};

	$GLOBALS['_wp_current_template_content'] = '<!-- wp:html --><div class="sgs-shop-filters"></div>';
	$GLOBALS['t_shop']                       = true;
	$check( shop_filters_first_paint_active(), 'active on a shop page with the filter template while the script is not yet enqueued' );
	$GLOBALS['t_shop'] = false;
	$check( ! shop_filters_first_paint_active(), 'not active off the shop surface' );
	$GLOBALS['t_shop']                       = true;
	$GLOBALS['_wp_current_template_content'] = '<p>no filters</p>';
	$check( ! shop_filters_first_paint_active(), 'not active when the template has no filter panel' );
	$GLOBALS['_wp_current_template_content'] = 'sgs-shop-filters';
	print_shop_filters_enhanced_class();
	$check( false !== strpos( $GLOBALS['t_printed'], "classList.add('is-enhanced')" ), 'the body class is printed through wp_print_inline_script_tag' );

	$GLOBALS['t_label'] = "A\"l\l\r\nx";
	add_shop_segmented_label_style();
	$check( ':root{--sgs-segmented-all-label:"A\\"l\\\\l  x";}' === $GLOBALS['t_inline_css'], 'quote and backslash are escaped and CR/LF become spaces' );

	echo "{$pass} passed, {$fail} failed\n";
	exit( $fail > 0 ? 1 : 0 );
}

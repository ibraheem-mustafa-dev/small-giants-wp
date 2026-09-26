<?php
/**
 * Standalone test: theme/sgs-theme/functions.php::dark_mode_ink_css() — the
 * fill-scoped dark ink printer (settings.custom.darkInk from
 * scripts/derive-dark-palette.py).
 *
 * The real function is cut out of functions.php by its signature and evaluated
 * inside the theme's namespace, against small stand-ins for the three WordPress
 * lookups it uses (WP_Theme_JSON::ELEMENTS, the block registry and
 * sanitize_hex_color). NEGATIVE CONTROL: the same source with its hex sanitiser
 * disabled must let an injection through, turning the injection check red.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-dark-mode-ink-standalone.php
 */

// phpcs:disable

class WP_Theme_JSON {
	const ELEMENTS = array(
		'button' => '.wp-element-button, .wp-block-button__link',
		'link'   => 'a:where(:not(.wp-element-button))',
	);
}

class WP_Block_Type_Registry {
	public static function get_instance() {
		return new self();
	}
	public function get_registered( $name ) {
		return 'core/quote' === $name ? (object) array( 'name' => $name ) : null;
	}
}

function wp_get_block_css_selector( $block_type ) {
	return '.wp-block-quote';
}

function sanitize_hex_color( $color ) {
	return preg_match( '/^#([A-Fa-f0-9]{3}){1,2}$/', $color ) ? $color : null;
}

$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}\n";
	}
}

$source = file_get_contents( dirname( __DIR__, 4 ) . '/theme/sgs-theme/functions.php' );
$start  = strpos( $source, 'function dark_mode_ink_css( array $ink ): string {' );
$end    = strpos( $source, "\n}\n", $start );
ok( false !== $start && false !== $end, 'dark_mode_ink_css() is found in theme/sgs-theme/functions.php' );
$fn = substr( $source, $start, $end - $start + 2 );

/**
 * Evaluate a copy of the function under a unique namespace (so the real and the
 * negative-control copies can coexist) and return its callable name. eval()
 * runs only this repo's own theme source, cut from functions.php above, never
 * external input.
 */
function load_ink_fn( string $fn_source, string $ns ): string {
	eval( 'namespace ' . $ns . '; ' . $fn_source );
	return $ns . '\\dark_mode_ink_css';
}

$ink_css = load_ink_fn( $fn, 'SGS\\Theme' );

// Element scope: both parts of the button selector, all three dark contexts.
$css = $ink_css( array( 'element' => array( 'button' => array( 'base' => array( 'text' => '#3a2e26' ) ) ) ) );
ok( false !== strpos( $css, ':root[data-theme="dark"] .wp-element-button,' ), 'element: explicit dark mode targets .wp-element-button' );
ok( false !== strpos( $css, ':root[data-theme="dark"] .wp-block-button__link' ), 'element: every comma part of the element selector is scoped' );
ok( false !== strpos( $css, ':root[data-theme="auto"][data-prefers-dark="true"] .wp-element-button' ), 'element: follow-the-OS dark mode is covered' );
ok( false !== strpos( $css, '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]) .wp-element-button' ), 'element: the no-choice-yet media fallback is covered' );
ok( false !== strpos( $css, '{--wp--preset--color--text:#3a2e26;}' ), 'element: the ink redefines the preset custom property on the scope' );

// Pseudo-state, block and fill scopes.
$css = $ink_css(
	array(
		'element' => array( 'button' => array( 'hover' => array( 'surface' => '#171103' ) ) ),
		'block'   => array( 'core/quote' => array( 'base' => array( 'text' => '#ffffff' ) ) ),
		'fill'    => array( 'accent' => array( 'base' => array( 'text' => '#000' ) ) ),
	)
);
ok( false !== strpos( $css, '.wp-element-button:hover' ), 'state: a hover scope appends :hover to each selector part' );
ok( false !== strpos( $css, ':root[data-theme="dark"] .wp-block-quote,' ), 'block: the selector comes from wp_get_block_css_selector()' );
ok( false !== strpos( $css, ':root[data-theme="dark"] .has-accent-background-color,' ), 'fill: a markup fill scopes to .has-<slug>-background-color' );

// Unknown scopes and hostile values print nothing.
ok( '' === $ink_css( array( 'element' => array( 'nonsense' => array( 'base' => array( 'text' => '#000000' ) ) ) ) ), 'an unknown element prints nothing' );
ok( '' === $ink_css( array( 'block' => array( 'core/unregistered' => array( 'base' => array( 'text' => '#000000' ) ) ) ) ), 'an unregistered block prints nothing' );
$hostile = array( 'element' => array( 'button' => array( 'base' => array( 'text' => 'red;}body{display:none' ) ) ) );
ok( '' === $ink_css( $hostile ), 'a non-hex value is refused (no CSS injection)' );
ok( '' === $ink_css( array() ), 'no ink prints nothing' );

// NEGATIVE CONTROL: disable the sanitiser in a copy; the injection check must fail.
$broken    = str_replace( 'sanitize_hex_color( (string) $hex )', '(string) $hex', $fn );
$broken_fn = load_ink_fn( $broken, 'SGS\\ThemeBroken' );
$leak      = $broken_fn( $hostile );
ok( false !== strpos( $leak, 'body{display:none' ), 'NEGATIVE CONTROL: without sanitize_hex_color the injection gets through (so the refusal check above is load-bearing)' );

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );

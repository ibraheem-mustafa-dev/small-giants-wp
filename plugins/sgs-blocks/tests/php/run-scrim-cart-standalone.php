<?php
/**
 * Standalone runner for sgs/cart's Wave 3C U-2 scrim adoption (family M-14).
 *
 * Two things are tested against the REAL shipped text, not a copy:
 *   1. The scrim-render section of `src/blocks/cart/render.php` (extracted between its
 *      "Scrim (Wave 3C U-2" comment and the "Emit the scoped <style>" comment) — the open
 *      selector, the drawer-ref data attribute, and that it fires ONLY for the drawer
 *      display mode.
 *   2. `includes/helpers-cart-panel.php::sgs_cart_panel_wrapper_html()` — the real function,
 *      required directly (it is pure and self-contained) — carries the block's uid class on
 *      the drawer <dialog>, which the render.php open selector depends on to match.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-scrim-cart-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( $text, $domain = 'default' ): string {
		return esc_attr( $text );
	}
}
if ( ! function_exists( 'sanitize_html_class' ) ) {
	function sanitize_html_class( $class ): string {
		return (string) preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $class );
	}
}
$GLOBALS['sgs_test_actions'] = array();
if ( ! function_exists( 'add_action' ) ) {
	function add_action( $hook, $cb, $priority = 10 ): void {
		$GLOBALS['sgs_test_actions'][] = array( $hook, $cb, $priority );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-scrim.php';
require_once dirname( __DIR__, 2 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-cart-panel.php';

$pass = 0;
$fail = 0;
function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

// ── Extract the real scrim section from cart/render.php ─────────────────────────
$render_path = dirname( __DIR__, 2 ) . '/src/blocks/cart/render.php';
$source      = (string) file_get_contents( $render_path );
$start       = strpos( $source, '// ── Scrim (Wave 3C U-2' );
$end         = strpos( $source, 'Emit the scoped <style>' );
ok( false !== $start && false !== $end && $end > $start, 'the scrim section is found in the real cart/render.php' );
if ( false === $start || false === $end || $end <= $start ) {
	echo "\n==== $pass passed, $fail failed ====\n";
	exit( 1 );
}
$section = substr( $source, $start, $end - $start );
$section = substr( $section, 0, (int) strrpos( $section, "\n//" ) );

/**
 * Run the extracted section against fixture render-state and return the CSS appended.
 *
 * @param string $code         The PHP text of the scrim section.
 * @param bool   $has_panel    Whether the effective mode renders a panel at all.
 * @param string $effective_mode link | flyout | drawer.
 * @param array  $attributes   Block attributes (scrim* only, for this section).
 * @param string $uid          Block instance uid class.
 * @param string $drawer_id    Dialog id (also the drawerRef the trigger/store use).
 * @return array{0:array,1:string} [$scoped_css after running, the joined CSS].
 */
function run_cart_scrim( string $code, bool $has_panel, string $effective_mode, array $attributes, string $uid = 'sgs-cart-abcd1234', string $drawer_id = 'sgs-cart-abcd1234-drawer' ): array {
	$scoped_css = array();
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php section.
	return array( $scoped_css, implode( '', $scoped_css ) );
}

// ── Drawer-mode-only ──────────────────────────────────────────────────────────
list( $css_link_before, ) = run_cart_scrim( $section, false, 'link', array( 'scrimOpacity' => array( 'desktop' => 0.55 ) ) );
ok( array() === $css_link_before, 'link mode ($has_panel=false): nothing appended, even with a visible scrimOpacity' );

list( $css_flyout, ) = run_cart_scrim( $section, true, 'flyout', array( 'scrimOpacity' => array( 'desktop' => 0.55 ) ) );
ok( array() === $css_flyout, 'flyout mode: nothing appended — a flyout is a plain popover with no page-dimming' );

list( , $css_drawer ) = run_cart_scrim( $section, true, 'drawer', array( 'scrimOpacity' => array( 'desktop' => 0.55 ) ) );
ok( '' !== $css_drawer, 'drawer mode with a visible scrimOpacity: the scrim CSS is appended' );

// ── Open selector (in the returned CSS) + drawer-ref data attribute (in the
// separately-queued scrim HTML — sgs_scrim_render() returns CSS only) ──────────
ok( false !== strpos( $css_drawer, ':has(.sgs-cart-abcd1234.sgs-cart__panel--drawer[open])' ), 'the open selector is scoped to THIS uid + the drawer modifier + [open] (non-modal form, matching store.js resolveDrawerMode)' );
$queued_html = sgs_scrim_queue()['sgs-cart-abcd1234'] ?? '';
ok( false !== strpos( $queued_html, 'data-sgs-nav-scrim="sgs-cart-abcd1234-drawer"' ), 'the queued scrim div carries data-sgs-nav-scrim set to the SAME drawer-ref value the trigger/dialog use, so store.js resolveScrim() finds it' );

// A drawer with no visible scrim tier still emits nothing (helper's own "invisible" gate).
list( $css_invisible, ) = run_cart_scrim( $section, true, 'drawer', array() );
ok( array() === $css_invisible, 'drawer mode with no scrimOpacity/scrimBlur set: nothing appended (default block.json ships scrimOpacity.desktop=0.55, so this is the "client cleared it" case)' );

// ── Uid class on the drawer <dialog> (helpers-cart-panel.php) ───────────────────
$dialog_with_uid = sgs_cart_panel_wrapper_html(
	'drawer',
	'BODY',
	array(
		'panel_id'  => 'sgs-cart-abcd1234-panel',
		'drawer_id' => 'sgs-cart-abcd1234-drawer',
		'uid'       => 'sgs-cart-abcd1234',
	)
);
ok( false !== strpos( $dialog_with_uid, 'class="sgs-cart__panel sgs-cart__panel--drawer sgs-cart-abcd1234"' ), 'the drawer <dialog> carries the uid class alongside its existing BEM classes' );
ok( false !== strpos( $dialog_with_uid, 'data-sgs-nav-drawer' ), 'the drawer <dialog> still carries data-sgs-nav-drawer (shared store contract unchanged)' );

$dialog_without_uid = sgs_cart_panel_wrapper_html(
	'drawer',
	'BODY',
	array( 'panel_id' => 'p1', 'drawer_id' => 'd1' )
);
ok( false !== strpos( $dialog_without_uid, 'class="sgs-cart__panel sgs-cart__panel--drawer"' ), 'no uid arg: the class list has no dangling trailing space' );

$flyout_html = sgs_cart_panel_wrapper_html( 'flyout', 'BODY', array( 'panel_id' => 'p1', 'drawer_id' => 'd1', 'uid' => 'sgs-cart-abcd1234' ) );
ok( false === strpos( $flyout_html, 'sgs-cart-abcd1234' ), 'flyout mode never carries the uid class — the scrim only exists for the drawer' );

// ── Spec 32: no inline style attribute is written by the extracted section ──────
ok( false === strpos( $section, 'style="' ), 'the scrim section writes no inline style attribute (Spec 32)' );

// ── Negative controls ────────────────────────────────────────────────────────────
// A: the drawer-mode-only guard is dropped, so a flyout would ALSO get a scrim.
$bypass_guard = str_replace(
	"if ( \$has_panel && 'drawer' === \$effective_mode ) {",
	'if ( $has_panel ) {',
	$section
);
ok( $bypass_guard !== $section, 'negative control A: the drawer-mode guard was actually mutated' );
list( , $bypass_css ) = run_cart_scrim( $bypass_guard, true, 'flyout', array( 'scrimOpacity' => array( 'desktop' => 0.55 ) ) );
ok( '' !== $bypass_css, 'negative control A: with the guard bypassed, flyout mode DOES get a scrim (so the "nothing appended" test above can fail)' );

// B: the uid class is dropped from the wrapper, breaking the open selector's match target.
// Isolate just this ONE function's text (it is the last function in the file, so "to EOF"
// is exact) — evaluating the whole file would redeclare sgs_cart_trigger_html() and
// sgs_cart_panel_body_html(), which are already loaded above.
$panel_source     = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/helpers-cart-panel.php' );
$fn_start         = strpos( $panel_source, 'function sgs_cart_panel_wrapper_html(' );
ok( false !== $fn_start, 'sgs_cart_panel_wrapper_html() is found in the real helpers-cart-panel.php' );
$fn_text          = substr( $panel_source, $fn_start );
$bypass_uid_class = str_replace(
	"'<dialog id=\"%1\$s\" class=\"sgs-cart__panel sgs-cart__panel--drawer%2\$s\" data-sgs-nav-drawer data-sgs-cart-panel data-sgs-cart-mode=\"drawer\" aria-labelledby=\"%3\$s-heading\"><button type=\"button\" class=\"sgs-cart__panel-close\" data-sgs-nav-close aria-label=\"%4\$s\">%5\$s</button>%6\$s</dialog>',",
	"'<dialog id=\"%1\$s\" class=\"sgs-cart__panel sgs-cart__panel--drawer\" data-sgs-nav-drawer data-sgs-cart-panel data-sgs-cart-mode=\"drawer\" aria-labelledby=\"%3\$s-heading\"><button type=\"button\" class=\"sgs-cart__panel-close\" data-sgs-nav-close aria-label=\"%4\$s\">%5\$s</button>%6\$s</dialog>',",
	$fn_text
);
ok( $bypass_uid_class !== $fn_text, 'negative control B: the uid-class insertion was actually mutated' );
$bypass_uid_class = str_replace( 'function sgs_cart_panel_wrapper_html(', 'function sgs_cart_panel_wrapper_html_no_uid(', $bypass_uid_class );
eval( $bypass_uid_class ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness proving the negative control.
$dialog_no_uid = sgs_cart_panel_wrapper_html_no_uid(
	'drawer',
	'BODY',
	array( 'panel_id' => 'p1', 'drawer_id' => 'd1', 'uid' => 'sgs-cart-abcd1234' )
);
ok( false === strpos( $dialog_no_uid, 'sgs-cart-abcd1234' ), 'negative control B: with the uid-class insertion reverted, the dialog carries no uid class (so the class-list test above can fail)' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );

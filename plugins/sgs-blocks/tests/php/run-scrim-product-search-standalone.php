<?php
/**
 * Standalone runner for sgs/product-search's Wave 3C U-2 scrim adoption (family M-14).
 *
 * `render.php` cannot be included whole outside WordPress (dozens of helpers + REST/WC
 * calls), so this runner extracts the scrim section (between its "Scrim (Wave 3C U-2"
 * comment and the "Output — branch by display mode." comment) from the REAL shipped file
 * and evaluates that exact text against fixtures — a change to the shipped code is
 * therefore a change to what is tested.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-scrim-product-search-standalone.php
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

// ── Extract the real scrim section from product-search/render.php ───────────────
$render_path = dirname( __DIR__, 2 ) . '/src/blocks/product-search/render.php';
$source      = (string) file_get_contents( $render_path );
$start       = strpos( $source, '// Scrim (Wave 3C U-2' );
$end         = strpos( $source, 'Output — branch by display mode.' );
ok( false !== $start && false !== $end && $end > $start, 'the scrim section is found in the real product-search/render.php' );
if ( false === $start || false === $end || $end <= $start ) {
	echo "\n==== $pass passed, $fail failed ====\n";
	exit( 1 );
}
$section = substr( $source, $start, $end - $start );
$section = substr( $section, 0, (int) strrpos( $section, "\n// ---" ) );

/**
 * Run the extracted section against fixture render-state and return the CSS appended.
 *
 * @param string $code       The PHP text of the scrim section.
 * @param bool   $is_dialog  $sgs_ps_is_dialog_mode — true for full-screen-overlay/command-palette.
 * @param string $display    The resolved display mode.
 * @param array  $attributes Block attributes (scrim* only, for this section).
 * @param string $uid        The block's scoped-styling uid class ($sgs_style_uid).
 * @return array{0:array,1:string} [$sgs_scoped_css after running, the joined CSS].
 */
function run_ps_scrim( string $code, bool $is_dialog, string $display, array $attributes, string $uid = 'sgs-ps-abcd1234' ): array {
	$sgs_scoped_css        = array();
	$sgs_ps_is_dialog_mode = $is_dialog;
	$sgs_style_uid         = $uid;
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php section.
	return array( $sgs_scoped_css, implode( '', $sgs_scoped_css ) );
}

// ── Dialog-modes-only ─────────────────────────────────────────────────────────
list( $css_inline, ) = run_ps_scrim( $section, false, 'inline-bar', array( 'scrimOpacity' => array( 'desktop' => 0.9 ) ) );
ok( array() === $css_inline, 'not a dialog mode ($sgs_ps_is_dialog_mode=false): nothing appended, even with a scrimOpacity set' );

// ── Per-mode defaults fill only the settings the client left empty ───────────────
list( , $css_overlay_default ) = run_ps_scrim( $section, true, 'full-screen-overlay', array() );
ok( false !== strpos( $css_overlay_default, '--sgs-scrim-opacity:0.5' ), 'overlay mode, unset attrs: the 0.5 default opacity is applied' );
ok( false === strpos( $css_overlay_default, 'backdrop-filter' ), 'overlay mode, unset attrs: no blur default (only cmdk has one)' );

list( , $css_cmdk_default ) = run_ps_scrim( $section, true, 'command-palette', array() );
ok( false !== strpos( $css_cmdk_default, '--sgs-scrim-opacity:0.55' ), 'command-palette mode, unset attrs: the 0.55 default opacity is applied' );
ok( false !== strpos( $css_cmdk_default, 'backdrop-filter:blur(var(--sgs-scrim-blur,0px))' ) && false !== strpos( $css_cmdk_default, '--sgs-scrim-blur:6px' ), 'command-palette mode, unset attrs: the 6px default blur is applied' );

// A client value wins for its own setting; the other settings keep their mode default.
list( , $css_client_opacity ) = run_ps_scrim( $section, true, 'command-palette', array( 'scrimOpacity' => array( 'desktop' => 0.2 ) ) );
ok( false !== strpos( $css_client_opacity, '--sgs-scrim-opacity:0.2' ), 'client-set opacity wins over the mode default' );
ok( false !== strpos( $css_client_opacity, '--sgs-scrim-blur:6px' ), 'client set strength only: the cmdk 6px blur default still fills the empty blur setting' );
list( , $css_blur_off ) = run_ps_scrim( $section, true, 'command-palette', array( 'scrimBlur' => array( 'desktop' => '0px' ) ) );
ok( false !== strpos( $css_blur_off, '--sgs-scrim-blur:0px' ), 'a client can switch the default blur off with 0px' );
list( , $css_colour_only ) = run_ps_scrim( $section, true, 'full-screen-overlay', array( 'scrimColour' => '#123456' ) );
ok( false !== strpos( $css_colour_only, '--sgs-scrim-fill:#123456' ) && false !== strpos( $css_colour_only, '--sgs-scrim-opacity:0.5' ), 'a client colour alone is kept, and the 0.5 strength default still applies' );

list( , $css_client_blur ) = run_ps_scrim( $section, true, 'full-screen-overlay', array( 'scrimBlur' => array( 'desktop' => '2px' ) ) );
ok( false !== strpos( $css_client_blur, '--sgs-scrim-blur:2px' ), 'client-set blur applies even on the mode with no blur default' );
// (note: the base rule ALWAYS references `var(--sgs-scrim-opacity,0)` regardless of
// whether any tier is set — that is the fallback wiring, not an assignment. What must
// be absent here is the per-tier ASSIGNMENT, "--sgs-scrim-opacity:<value>".)
ok( false !== strpos( $css_client_blur, '--sgs-scrim-opacity:0.5' ), 'client set blur only: the overlay 0.5 strength default still fills the empty strength setting' );

// ── Open selector — the MODAL form, never [open] (server always emits a literal
// `open` attribute for the no-JS fallback, so `[open]` would match that too) ───
ok( false !== strpos( $css_overlay_default, ':has(.sgs-ps-abcd1234:modal)' ), 'the open selector is the block uid + :modal, not [open]' );
ok( false === strpos( $css_overlay_default, '[open]' ), 'the open selector never uses [open] — it would match the always-present no-JS-fallback attribute' );

// ── Spec 32: no inline style attribute is written by the extracted section ──────
ok( false === strpos( $section, 'style="' ), 'the scrim section writes no inline style attribute (Spec 32)' );

// ── Negative controls ────────────────────────────────────────────────────────────
// A: `[open]` used instead of `:modal` — proves the modal-only assertion is real.
$bypass_selector = str_replace(
	"array( 'open' => '.' . \$sgs_style_uid . ':modal' )",
	"array( 'open' => '.' . \$sgs_style_uid . '[open]' )",
	$section
);
ok( $bypass_selector !== $section, 'negative control A: the open-selector text was actually mutated' );
list( , $bypass_css ) = run_ps_scrim( $bypass_selector, true, 'full-screen-overlay', array() );
ok( false !== strpos( $bypass_css, '[open]' ), 'negative control A: with :modal swapped for [open], the CSS DOES contain [open] (so the "never uses [open]" test above can fail)' );

// B: the per-setting `empty()` check is dropped, so a mode default would ALWAYS
// override a client's own value rather than yielding to it.
$bypass_gate = str_replace(
	'if ( empty( $attributes[ $sgs_ps_key ] ) ) {',
	'if ( true ) {',
	$section
);
ok( $bypass_gate !== $section, 'negative control B: the per-setting empty() check was actually mutated' );
list( , $bypass_gate_css ) = run_ps_scrim( $bypass_gate, true, 'command-palette', array( 'scrimOpacity' => array( 'desktop' => 0.2 ) ) );
ok( false !== strpos( $bypass_gate_css, '--sgs-scrim-opacity:0.55' ) && false === strpos( $bypass_gate_css, '--sgs-scrim-opacity:0.2' ), 'negative control B: with the check bypassed, the 0.55 cmdk default clobbers the client\'s 0.2 (so the "client value wins" test above can fail)' );

echo "
==== $pass passed, $fail failed ====
";
exit( $fail > 0 ? 1 : 0 );

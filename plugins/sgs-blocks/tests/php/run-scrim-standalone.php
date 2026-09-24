<?php
/**
 * Standalone runner for the shared viewport scrim (Wave 3C U-2, `includes/helpers-scrim.php`).
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-scrim-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

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

$has = static fn( string $hay, string $needle ): bool => false !== strpos( $hay, $needle );

// Nothing set: no CSS, nothing queued.
ok( '' === sgs_scrim_render( array(), 'u0', array( 'open' => '.u0:modal' ) ), 'unset attributes emit nothing' );
ok( array() === sgs_scrim_queue(), 'unset attributes queue no HTML' );
ok( '' === sgs_scrim_render( array( 'scrimOpacity' => array( 'desktop' => 0 ) ), 'u0', array( 'open' => '.u0:modal' ) ), 'opacity 0 at every tier emits nothing' );

// The drawer default: black at 0.55.
$drawer = sgs_scrim_render(
	array(
		'scrimColour'  => '#000000',
		'scrimOpacity' => array( 'desktop' => 0.55 ),
	),
	'u1',
	array( 'open' => '.u1[open]' )
);
ok( $has( $drawer, '.u1-scrim{position:fixed;inset:0;z-index:9990;opacity:0;pointer-events:none;transition:opacity 200ms ease;--sgs-scrim-fill:#000000}' ), 'base rule: fixed, hidden, fill = the colour, fading out over the default 200ms' );
ok( $has( $drawer, '.u1-scrim::before{content:"";position:absolute;inset:0;background:var(--sgs-scrim-fill);opacity:var(--sgs-scrim-opacity,0)}' ), 'the tint sits on ::before with its own opacity' );
ok( $has( $drawer, '.u1-scrim{--sgs-scrim-opacity:0.55;}' ), 'desktop strength 0.55' );
ok( $has( $drawer, ':root:has(.u1[open]) .u1-scrim{opacity:1;pointer-events:auto;transition-duration:200ms}' ), 'open state comes from :has() on the given selector, fading in over the default 200ms' );
$timed = sgs_scrim_render( array( 'scrimOpacity' => array( 'desktop' => 0.5 ) ), 'u9', array( 'open' => '.u9[open]', 'enter_ms' => 450, 'exit_ms' => 250, 'easing' => 'cubic-bezier(0.16, 0.84, 0.32, 1)' ) );
ok( $has( $timed, 'transition:opacity 250ms cubic-bezier(0.16, 0.84, 0.32, 1);' ), 'U-5: the closed rule carries the owner exit time and easing' );
ok( $has( $timed, ':root:has(.u9[open]) .u9-scrim{opacity:1;pointer-events:auto;transition-duration:450ms}' ), 'U-5: the open rule carries the owner entry time' );
$hostile = sgs_scrim_render( array( 'scrimOpacity' => array( 'desktop' => 0.5 ) ), 'u8', array( 'open' => '.u8[open]', 'easing' => 'ease;}body{x' ) );
ok( ! $has( $hostile, 'body{x' ) && $has( $hostile, 'transition:opacity 200ms ease;' ), 'U-5: an easing that could break out of the declaration is refused' );
ok( ! $has( $drawer, 'backdrop-filter' ), 'no blur set: no backdrop-filter emitted' );
ok( $has( $drawer, '@media (forced-colors:active){.u1-scrim{display:none}}' ), 'hidden in forced colours' );
ok( $has( $drawer, '@media (prefers-reduced-motion:reduce){.u1-scrim{transition-duration:.01ms}}' ), 'reduced motion shortens the fade' );
$queue = sgs_scrim_queue();
ok( isset( $queue['u1'] ) && '<div class="sgs-scrim u1-scrim" aria-hidden="true"></div>' === $queue['u1'], 'the HTML is queued for wp_footer, aria-hidden' );

// Per-tier strength and blur (away: 0.5 tablet, 0 mobile; halcyon-style blur).
$tiers = sgs_scrim_render(
	array(
		'scrimOpacity' => array(
			'desktop' => 0.28,
			'tablet'  => 0.5,
			'mobile'  => 0,
		),
		'scrimBlur'    => array( 'desktop' => '2px' ),
	),
	'u2',
	array( 'open' => '.u2 [data-sgs-mega-trigger][aria-expanded="true"]' )
);
ok( $has( $tiers, '.u2-scrim{--sgs-scrim-opacity:0.28;}' ), 'desktop strength' );
ok( $has( $tiers, '@media (max-width:1023px){.u2-scrim{--sgs-scrim-opacity:0.5;}}' ), 'tablet strength under the 1023px query' );
ok( $has( $tiers, '@media (max-width:767px){.u2-scrim{--sgs-scrim-opacity:0;}}' ), 'mobile strength under the 767px query' );
ok( $has( $tiers, 'backdrop-filter:blur(var(--sgs-scrim-blur,0px))' ), 'blur is on the scrim element, not ::before' );
ok( $has( $tiers, '.u2-scrim{--sgs-scrim-blur:2px;}' ), 'desktop blur value' );
ok( $has( $tiers, '--sgs-scrim-fill:#000' ), 'no colour set: fill falls back to black' );
ok( $has( $tiers, ':root:has(.u2 [data-sgs-mega-trigger][aria-expanded="true"]) .u2-scrim' ), 'the bar open selector is used verbatim' );

// Gradient wins over the colour; a token slug resolves to its preset variable.
$grad = sgs_scrim_render(
	array(
		'scrimColour'         => 'primary',
		'scrimColourGradient' => 'linear-gradient(270deg, rgba(11,11,18,.5) 0%, rgba(11,11,18,0) 50%)',
		'scrimOpacity'        => array( 'desktop' => 0.2 ),
	),
	'u3',
	array( 'open' => '.u3:modal' )
);
ok( $has( $grad, '--sgs-scrim-fill:linear-gradient(270deg, rgba(11,11,18,.5) 0%, rgba(11,11,18,0) 50%)' ), 'a gradient wins over the colour' );
$token = sgs_scrim_render(
	array(
		'scrimColour'  => 'primary',
		'scrimOpacity' => array( 'desktop' => 0.5 ),
	),
	'u4',
	array( 'open' => '.u4:modal' )
);
ok( $has( $token, '--sgs-scrim-fill:var(--wp--preset--color--primary' ), 'a token slug resolves to its preset variable' );

// Blur alone makes it visible; clamping; hostile input refused.
ok( '' !== sgs_scrim_render( array( 'scrimBlur' => array( 'mobile' => 16 ) ), 'u5', array( 'open' => '.u5:modal' ) ), 'a blur alone makes the scrim visible (bare number = px)' );
$clamped = sgs_scrim_render( array( 'scrimOpacity' => array( 'desktop' => 7 ) ), 'u6', array( 'open' => '.u6:modal' ) );
ok( $has( $clamped, '--sgs-scrim-opacity:1;' ), 'strength above 1 clamps to 1' );
ok( '' === sgs_scrim_render( array( 'scrimOpacity' => array( 'desktop' => 0.5 ) ), 'u7', array( 'open' => '.u7{}body{display:none' ) ), 'an open selector that breaks out is refused' );
ok( '' === sgs_scrim_render( array( 'scrimOpacity' => array( 'desktop' => 0.5 ) ), 'u8', array() ), 'no open selector: nothing emitted' );
$hostile_blur = sgs_scrim_render( array( 'scrimOpacity' => array( 'desktop' => 0.5 ), 'scrimBlur' => array( 'desktop' => '2px;}body{display:none' ) ), 'u9', array( 'open' => '.u9:modal' ) );
ok( ! $has( $hostile_blur, 'display:none}' ) || $has( $hostile_blur, '@media (forced-colors:active){.u9-scrim{display:none}}' ) && 1 === substr_count( $hostile_blur, 'display:none' ), 'a hostile blur value is dropped' );
$data = sgs_scrim_render( array( 'scrimOpacity' => array( 'desktop' => 0.5 ) ), 'u10', array( 'open' => '.u10[open]', 'data' => array( 'sgs-nav-scrim' => 'drawer-1"><x' ) ) );
$queue = sgs_scrim_queue();
ok( $has( $queue['u10'], 'data-sgs-nav-scrim="drawer-1&quot;&gt;&lt;x"' ), 'data attributes are escaped' );

// The footer printer is hooked.
$hooked = false;
foreach ( $GLOBALS['sgs_test_actions'] as $a ) {
	$hooked = $hooked || ( 'wp_footer' === $a[0] && 'sgs_scrim_print_footer' === $a[1] );
}
ok( $hooked, 'sgs_scrim_print_footer is hooked to wp_footer' );
ob_start();
sgs_scrim_print_footer();
$footer = (string) ob_get_clean();
ok( $has( $footer, 'u1-scrim' ) && $has( $footer, 'u10-scrim' ), 'the footer prints every queued scrim' );

// Negative control: a strength formatter that ignores the value makes the tier test fail.
$broken = static fn( $raw ) => '0.99';
$bt     = sgs_scrim_tiers( array( 'desktop' => 0.28 ), $broken );
ok( '0.99' === $bt['desktop'] && ! $has( '.u2-scrim{--sgs-scrim-opacity:' . $bt['desktop'] . ';}', '0.28' ), 'negative control: a broken formatter loses the 0.28 the tier test asserts' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );

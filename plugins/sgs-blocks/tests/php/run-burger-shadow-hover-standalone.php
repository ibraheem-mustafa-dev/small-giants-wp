<?php
/**
 * Standalone runner for the menu button's hover shadow (`burgerShadowHover` / `burgerShadowColourHover`), through the real
 * trigger CSS emitter: the hover shape and colour replace the automatic lift, a hover shape alone works with no resting
 * shadow (the Indus draft's burger gains its shadow on hover only), a hover colour alone recolours the resting shape, and
 * every drawn shadow hands `--sgs-focus-under` to the focus system.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-burger-shadow-hover-standalone.php
 * Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';
foreach ( array( 'esc_attr__', 'esc_html__', '__' ) as $sgs_stub ) {
	if ( ! function_exists( $sgs_stub ) ) {
		eval( 'function ' . $sgs_stub . '( $text, $domain = "default" ) { return htmlspecialchars( (string) $text, ENT_QUOTES, "UTF-8" ); }' );
	}
}
$inc = dirname( __DIR__, 2 ) . '/includes/';
foreach ( array( 'helpers-responsive.php', 'helpers-tokens.php', 'helpers-hover-state.php', 'helpers-shadow-layers.php', 'helpers-shadow-hover.php', 'helpers-colour-variants.php', 'nav-menu-trigger-css.php' ) as $f ) {
	if ( is_file( $inc . $f ) ) {
		require_once $inc . $f;
	}
}

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

if ( ! function_exists( 'sgs_nav_bar_menu_trigger_css' ) || ! function_exists( 'sgs_shadow_decls' ) ) {
	ok( false, 'the trigger CSS emitter and the shadow helpers load in the standalone harness' );
	exit( 1 );
}

$hover_shadow = '0 10px 22px -10px rgba(10, 126, 168, 0.85)';
$plain        = sgs_nav_bar_menu_trigger_css( array(), '.u' );
ok( false === strpos( $plain, 'box-shadow' ), 'no shadow attributes print no box-shadow' );

$hover_only = sgs_nav_bar_menu_trigger_css( array( 'burgerShadowHover' => $hover_shadow ), '.u' );
ok( false !== strpos( $hover_only, 'box-shadow:' ) && false !== strpos( $hover_only, ':hover' ), 'a hover shape alone prints a hover rule' );
ok( false !== strpos( $hover_only, '--sgs-focus-under:' ), 'the hover shadow hands --sgs-focus-under to the focus system' );
ok( 1 === preg_match( '/:focus-visible/', $hover_only ), 'the hover shadow also paints on keyboard focus (the shared hover-state pair)' );
ok( 0 === preg_match( '/\.u[^{]*\.sgs-nav-bar-menu__burger\{[^}]*box-shadow/', preg_replace( '/@media[^{]*\{(.*?\})\}/s', '', $hover_only ) ), 'a hover-only shadow draws nothing at rest' );

$both = sgs_nav_bar_menu_trigger_css( array( 'burgerShadow' => '0 2px 4px 0 rgba(0,0,0,.2)', 'burgerShadowHover' => $hover_shadow ), '.u' );
ok( substr_count( $both, 'box-shadow:' ) >= 2, 'a resting and a hover shadow print two box-shadow declarations' );
ok( false !== strpos( $both, '22px -10px' ), 'the hover shape is the one written, not the automatic lift' );

$off = sgs_nav_bar_menu_trigger_css( array( 'burgerShadow' => '0 2px 4px 0 rgba(0,0,0,.2)', 'shadowLiftOnHover' => false ), '.u' );
ok( 1 === substr_count( $off, 'box-shadow:' ), 'with the lift switched off and no hover value, only the resting shadow prints' );

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

<?php
/**
 * Standalone runner for Wave 3C U-5: the drawer and panel entry and exit motion
 * vocabulary and item stagger. Design: `.claude/reports/2026-09-24-u5-motion-design.md`.
 *
 * Loads the REAL shipped helpers and reads the REAL shipped CSS, JS and JSON, so a
 * change to the shipped code is a change to what is tested. Negative controls read
 * the same files at the pre-U-5 commit (00641d401) through `git show` and prove each
 * structural check fails there.
 *
 *   php plugins/sgs-blocks/tests/php/run-u5-motion-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ );
}

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

$root = dirname( __DIR__, 2 );
require_once $root . '/includes/class-sgs-breakpoints.php';
require_once $root . '/includes/helpers-tokens.php';
require_once $root . '/includes/helpers-responsive.php';
require_once $root . '/includes/helpers-motion-easing.php';
require_once $root . '/includes/helpers-nav-drawer-motion.php';

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

function has( string $haystack, string $needle ): bool {
	return false !== strpos( $haystack, $needle );
}

function read_file( string $rel ): string {
	global $root;
	return str_replace( "\r\n", "\n", (string) file_get_contents( $root . '/' . $rel ) );
}

/** A file at the pre-U-5 commit. `~` form, never `^` (cmd.exe eats the caret). */
function read_old( string $rel ): string {
	$out = shell_exec( 'git show 00641d401:plugins/sgs-blocks/' . $rel );
	return str_replace( "\r\n", "\n", (string) $out );
}

$anchors = array( 'full-screen', 'header', 'side-start', 'side-end', 'container', 'trigger', 'centred' );

// ══════════════════════════════════════════════════════════════════════════
// 1. The shared easing list: one set of values everywhere.
// ══════════════════════════════════════════════════════════════════════════
$values = sgs_motion_easing_values();
foreach ( array( 'nav-drawer' => 'entryEasing', 'nav-bar-menu' => 'submenuAnimationEasing' ) as $block => $attr ) {
	$json = json_decode( read_file( "src/blocks/$block/block.json" ), true );
	ok( ( $json['attributes'][ $attr ]['enum'] ?? null ) === $values, "$block.$attr enum equals sgs_motion_easing_values()" );
}
preg_match_all( "/value: '([a-z-]+)' \\}/", read_file( 'src/components/MotionEasingControl.js' ), $m );
ok( $m[1] === $values, 'MotionEasingControl.js options list the same values in the same order' );

ok( 'ease-out' === sgs_motion_easing_css( 'ease-out-css' ), 'ease-out-css resolves to the CSS keyword' );
ok( 'cubic-bezier(0.16, 0.84, 0.32, 1)' === sgs_motion_easing_css( 'drafts' ), 'drafts resolves to the drafts curve (halcyon, indus-foods)' );
ok( 'cubic-bezier(0.4, 0, 0.2, 1)' === sgs_motion_easing_css( 'standard' ), 'standard resolves to butcherbox\'s measured curve' );
ok( 'var(--wp--custom--easing--ease-out)' === sgs_motion_easing_css( 'ease-out' ), 'ease-out is the expo-out theme token' );
ok( 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' === sgs_motion_easing_css( 'custom', 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' ), 'a valid custom curve passes through' );
ok( 'ease-out' === sgs_motion_easing_css( 'custom', 'red;}body{x', 'ease-out' ), 'a hostile custom curve falls back' );
ok( 'ease-out' === sgs_motion_easing_css( 'nope', '', 'ease-out' ), 'an unknown name falls back' );
ok( 3000 === sgs_motion_ms( 99999, 1 ) && 0 === sgs_motion_ms( -5, 1 ) && 7 === sgs_motion_ms( 'x', 7 ), 'durations clamp to 0..3000 and default on junk' );

// ══════════════════════════════════════════════════════════════════════════
// 2. Drawer motion resolution.
// ══════════════════════════════════════════════════════════════════════════
$sel = '.u.wp-block-sgs-nav-drawer';

$default = sgs_nav_drawer_motion( array(), $sel, array(), $anchors );
ok( has( $default['css'], '--sgs-nd-anim-in:sgs-nav-drawer-in;' ), 'an untouched full-screen drawer keeps the -8px nudge' );
ok( has( $default['css'], '--sgs-nd-enter-dur:250ms;--sgs-nd-exit-dur:200ms;--sgs-nd-ease:ease-out;--sgs-nd-from-opacity:0;' ), 'defaults: 250ms in, 200ms out, ease-out, fade on' );
ok( array() === $default['classes'] && array() === $default['data'], 'defaults add no class and no data attribute' );
ok( ! has( $default['css'], '@media' ), 'identical tiers emit no media query' );

$auto_trigger = sgs_nav_drawer_motion( array(), $sel, array( 'desktop' => 'trigger', 'mobile' => 'full-screen' ), $anchors );
ok( has( $auto_trigger['css'], '--sgs-nd-anim-in:sgs-nav-drawer-corner-scale-in;--sgs-nd-anim-out:sgs-nav-drawer-corner-scale-out;--sgs-nd-anim-origin:top right;' ), 'auto follows a trigger anchor to the corner scale' );
ok( has( $auto_trigger['css'], '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){' . $sel . '{--sgs-nd-anim-in:sgs-nav-drawer-in;' ), 'auto follows the phone anchor per tier' );

$away = sgs_nav_drawer_motion(
	array(
		'entryAnimation' => array( 'desktop' => 'slide-start' ),
		'entryDuration'  => 300,
		'exitDuration'   => 300,
		'entryFade'      => false,
	),
	$sel,
	array(),
	$anchors
);
ok( has( $away['css'], '--sgs-nd-anim-in:sgs-nav-drawer-slide-start-in;' ) && has( $away['css'], '--sgs-nd-from-opacity:1;' ) && has( $away['css'], '--sgs-nd-enter-dur:300ms;--sgs-nd-exit-dur:300ms;' ), 'away: a pure 300ms slide from the start edge' );

$hostile = sgs_nav_drawer_motion( array( 'entryAnimation' => array( 'desktop' => 'x;}body{' ) ), $sel, array(), $anchors );
ok( ! has( $hostile['css'], 'body{' ) && has( $hostile['css'], 'sgs-nav-drawer-in;' ), 'an off-list shape falls back to auto' );

$curtain = sgs_nav_drawer_motion( array( 'entryAnimation' => array( 'desktop' => 'curtain' ), 'curtainColour' => '#131419', 'entryDuration' => 1800 ), $sel, array(), $anchors );
ok( in_array( 'sgs-nav-drawer--curtain', $curtain['classes'], true ), 'curtain adds its class' );
ok( has( $curtain['css'], '--sgs-nd-curtain-in:sgs-nav-drawer-curtain-sweep-in;' ) && has( $curtain['css'], '--sgs-nd-curtain-colour:#131419;' ), 'dogstudio: the curtain sweep and its colour' );
$grad = sgs_nav_drawer_motion( array( 'entryAnimation' => array( 'desktop' => 'curtain' ), 'curtainColour' => '#131419', 'curtainColourGradient' => 'linear-gradient(90deg, #000 0%, #fff 100%)' ), $sel, array(), $anchors );
ok( has( $grad['css'], '--sgs-nd-curtain-colour:linear-gradient(90deg, #000 0%, #fff 100%);' ), 'a curtain gradient wins over the flat colour' );
ok( array_key_exists( 'sgs-nd-focus-after-entry', $curtain['data'] ), 'an entry over 500ms defers focus until it ends' );

$lusion = sgs_nav_drawer_motion(
	array(
		'itemStagger'         => 20,
		'itemStaggerDistance' => array( 'desktop' => 88 ),
		'itemStaggerOnClose'  => true,
	),
	$sel,
	array(),
	$anchors
);
ok( in_array( 'sgs-nav-drawer--stagger', $lusion['classes'], true ) && in_array( 'sgs-nav-drawer--stagger-close', $lusion['classes'], true ), 'lusion: stagger with reverse-on-close' );
ok( has( $lusion['css'], '--sgs-nd-stagger-step:20ms;' ) && has( $lusion['css'], '--sgs-nd-stagger-dist:88px;' ), 'the step and distance reach the drawer' );
ok( ! has( $lusion['css'], '--sgs-nd-stagger-max' ), 'no cap is emitted unless set (fantasy, lamalama, studionamma are uncapped)' );

$drafts = sgs_nav_drawer_motion( array( 'itemStagger' => 55, 'itemStaggerMax' => 320 ), $sel, array(), $anchors );
ok( has( $drafts['css'], '--sgs-nd-stagger-max:320ms;' ), 'the drafts\' 320ms cap is emitted when set' );

$studionamma = sgs_nav_drawer_motion( array( 'itemStagger' => 100, 'itemStaggerDistance' => array( 'desktop' => 387, 'mobile' => 168 ) ), $sel, array(), $anchors );
ok( has( $studionamma['css'], '--sgs-nd-stagger-dist:387px' ) && has( $studionamma['css'], '--sgs-nd-stagger-dist:168px' ), 'studionamma: the travel distance differs per tier' );

// ══════════════════════════════════════════════════════════════════════════
// 3. Every keyframe the resolver names exists in the drawer stylesheet.
// ══════════════════════════════════════════════════════════════════════════
$nd_css = read_file( 'src/blocks/nav-drawer/style.css' );
$names  = array();
foreach ( sgs_nav_drawer_motion_shapes() as $shape ) {
	foreach ( $anchors as $anchor ) {
		$frames = sgs_nav_drawer_motion_keyframes( $shape, $anchor );
		$names[ $frames['in'] ]  = true;
		$names[ $frames['out'] ] = true;
	}
}
$names['sgs-nav-drawer-curtain-sweep-in']  = true;
$names['sgs-nav-drawer-curtain-sweep-out'] = true;
unset( $names['none'] );
$missing = array_filter( array_keys( $names ), fn( $n ) => ! has( $nd_css, '@keyframes ' . $n . ' {' ) );
ok( array() === array_values( $missing ), 'every keyframe the resolver names is defined in nav-drawer/style.css' );
$old_nd_css  = read_old( 'src/blocks/nav-drawer/style.css' );
$old_missing = array_filter( array_keys( $names ), fn( $n ) => ! has( $old_nd_css, '@keyframes ' . $n . ' {' ) );
ok( '' !== $old_nd_css && count( $old_missing ) > 0, 'negative control: the pre-U-5 stylesheet lacks the new keyframes' );

ok( has( $nd_css, 'animation-name: var(--sgs-nd-anim-in, sgs-nav-drawer-in);' ), 'the open rule reads the per-tier keyframe name' );
ok( ! has( $nd_css, 'sgs-nav-drawer--anim-' ), 'the old per-anchor animation classes are gone' );
preg_match( '/@media \(prefers-reduced-motion: no-preference\) \{\n\t\.wp-block-sgs-nav-drawer\[open\] \{/', $nd_css, $rm );
ok( 1 === count( $rm ), 'the drawer motion sits inside prefers-reduced-motion: no-preference' );

// JS shape options mirror the PHP allow-list.
preg_match_all( "/value: '([a-z-]+)' \\}/", read_file( 'src/blocks/nav-drawer/MotionPanel.js' ), $sm );
ok( $sm[1] === sgs_nav_drawer_motion_shapes(), 'MotionPanel.js shape options equal sgs_nav_drawer_motion_shapes()' );

$nd_json = json_decode( read_file( 'src/blocks/nav-drawer/block.json' ), true );
ok( ! isset( $nd_json['attributes']['animateFrom'] ), 'animateFrom is removed' );
foreach ( array( 'entryAnimation', 'itemStaggerDistance' ) as $tier_attr ) {
	ok( 'object' === ( $nd_json['attributes'][ $tier_attr ]['type'] ?? '' ) && array() === ( $nd_json['attributes'][ $tier_attr ]['default'] ?? null ), "$tier_attr is a tier object defaulting to {}" );
}
ok( 0 === ( $nd_json['attributes']['itemStaggerMax']['default'] ?? null ), 'itemStaggerMax defaults to 0 (no cap)' );

// ══════════════════════════════════════════════════════════════════════════
// 4. Drawer item stagger contract (nav-drawer-menu owns the item rules).
// ══════════════════════════════════════════════════════════════════════════
$ndm_css = read_file( 'src/blocks/nav-drawer-menu/style.css' );
ok( has( $ndm_css, ".sgs-nav-drawer-menu__bar--drawer > .sgs-nav-drawer-menu__item:nth-child(20) {\n\t--sgs-i: 19;" ), 'items are indexed as direct children of the drawer list (nested lists never restart the count)' );
ok( has( $ndm_css, ':nth-last-child(1) {' ) && has( $ndm_css, 'sgs-nav-drawer--stagger-close.is-closing' ), 'reverse order on close' );
ok( has( $ndm_css, '@supports (transition-delay: calc(sibling-index() * 1ms))' ), 'native sibling-index() through a valid @supports test' );
ok( has( $ndm_css, 'var(--sgs-nd-last-i, 0)' ) && has( $ndm_css, ':not(.wp-block-sgs-nav-drawer-menu)' ), 'a logo or button beside the menu arrives with the last item' );
ok( ! has( read_old( 'src/blocks/nav-drawer-menu/style.css' ), '--sgs-nd-stagger-step' ), 'negative control: the pre-U-5 drawer menu has no stagger' );

// ══════════════════════════════════════════════════════════════════════════
// 5. Panels: both forks animate, and close without catching the pointer.
// ══════════════════════════════════════════════════════════════════════════
$markup = read_file( 'includes/nav-menu-markup.php' );
ok( has( $markup, 'sgs-nav-bar-menu__mega-panel-wrap sgs-nav-bar-menu__panel-motion sgs-nav-bar-menu__panel-motion--%7$s' ), 'the mega fork carries the motion class' );
ok( has( $markup, "sgs-nav-bar-menu__submenu-wrap sgs-nav-bar-menu__panel-motion sgs-nav-bar-menu__panel-motion--' . ( \$submenu['animation'] ?? 'none' )" ), 'the dropdown fork carries the same class' );
ok( ! has( read_old( 'includes/nav-menu-markup.php' ), 'sgs-nav-bar-menu__panel-motion' ), 'negative control: before U-5 the mega fork had no animation class' );

$nbm_render = read_file( 'src/blocks/nav-bar-menu/render.php' );
ok( has( $nbm_render, "array( 'fade', 'fade-lift', 'slide-down', 'grow' )" ), 'the renderer allows the five panel shapes' );
ok( has( $nbm_render, "'enter_ms' => \$sgs_nm_panel_in," ), 'the bar scrim fades with the panels' );

$nbm_css = read_file( 'src/blocks/nav-bar-menu/style.css' );
foreach ( array( 'transition-behavior: allow-discrete;', 'pointer-events: none;', 'visibility: hidden;', '@starting-style {' ) as $needle ) {
	ok( has( $nbm_css, $needle ), "panel exit rule has `$needle`" );
}
ok( ! has( $nbm_css, 'sgs-nav-bar-menu__submenu-wrap--fade' ), 'the old open-only keyframe classes are gone' );

$dsp = read_file( 'src/shared/nav-menu-panels/DropdownStylePanel.js' );
ok( has( $dsp, "value: 'slide-down'" ) && ! has( $dsp, 'value="slide"' ), 'the editor saves slide-down, the value the renderer accepts' );
ok( has( read_old( 'src/shared/nav-menu-panels/DropdownStylePanel.js' ), 'value="slide"' ), 'negative control: before U-5 the editor saved an unaccepted "slide"' );

// ══════════════════════════════════════════════════════════════════════════
// 6. Close lifecycle and the retired JS stagger.
// ══════════════════════════════════════════════════════════════════════════
$store = read_file( 'src/shared/nav-interactivity/store.js' );
ok( has( $store, 'el.getAnimations( { subtree: true } )' ) && has( $store, 'Promise.allSettled' ), 'the close waits on every subtree animation' );
ok( ! has( $store, "addEventListener( 'animationend'" ), 'the close no longer ends on the first animationend (a curtain ::before ended it early)' );
ok( has( read_old( 'src/shared/nav-interactivity/store.js' ), "addEventListener( 'animationend'" ), 'negative control: before U-5 the close ended on the first animationend' );
ok( has( $store, "data-sgs-nd-focus-after-entry" ), 'focus waits for a long entry' );

ok( ! file_exists( $root . '/src/shared/effects/stagger.js' ), 'the JS stagger module is deleted' );
$mp_json = json_decode( read_file( 'src/blocks/mega-panel/block.json' ), true );
ok( ! isset( $mp_json['attributes']['staggerOnOpen'] ), 'mega-panel staggerOnOpen is removed' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );

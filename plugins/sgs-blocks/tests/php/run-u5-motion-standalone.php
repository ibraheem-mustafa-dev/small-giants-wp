<?php
/**
 * Standalone runner for the nav drawer and nav bar panel motion contracts that remain after Spec 38A M6.6-G5: the
 * drawer and the bar's panels move on the Entrance model, so what is tested here is what the blocks still own.
 *
 * Loads the REAL shipped helpers and reads the REAL shipped CSS, JS and JSON, so a change to the shipped code is a
 * change to what is tested.
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
require_once $root . '/includes/motion/class-sgs-motion-field-types.php';
require_once $root . '/includes/helpers-nav-drawer-motion-model.php';

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

$anchors = array( 'full-screen', 'header', 'side-start', 'side-end', 'container', 'trigger', 'centred' );

// ══════════════════════════════════════════════════════════════════════════
// 1. The shared easing list: one set of values everywhere.
// ══════════════════════════════════════════════════════════════════════════
$values = sgs_motion_easing_values();
preg_match_all( "/\\bnav: '([a-z-]+)'/", read_file( 'src/components/motion/easing-master-list.js' ), $m );
ok( $m[1] === $values, 'the easing master list (easing-master-list.js) carries the nav vocabulary in the same values and order' );
$scrim_json = json_decode( read_file( 'src/blocks/nav-bar-menu/block.json' ), true );
ok( 'string' === ( $scrim_json['attributes']['scrimFadeEasing']['type'] ?? '' ), 'the bar keeps its backdrop fade easing attribute' );

ok( 'ease-out' === sgs_motion_easing_css( 'ease-out-css' ), 'ease-out-css resolves to the CSS keyword' );
ok( 'cubic-bezier(0.16, 0.84, 0.32, 1)' === sgs_motion_easing_css( 'drafts' ), 'drafts resolves to the drafts curve (halcyon, the wholesale-food client)' );
ok( 'cubic-bezier(0.4, 0, 0.2, 1)' === sgs_motion_easing_css( 'standard' ), 'standard resolves to butcherbox\'s measured curve' );
ok( 'var(--wp--custom--easing--emphasised)' === sgs_motion_easing_css( 'ease-out' ), 'ease-out is the expo-out theme token' );
ok( 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' === sgs_motion_easing_css( 'custom', 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' ), 'a valid custom curve passes through' );
ok( 'ease-out' === sgs_motion_easing_css( 'custom', 'red;}body{x', 'ease-out' ), 'a hostile custom curve falls back' );
ok( 'ease-out' === sgs_motion_easing_css( 'nope', '', 'ease-out' ), 'an unknown name falls back' );
ok( 3000 === sgs_flat_duration_ms( 99999, 1 ) && 0 === sgs_flat_duration_ms( -5, 1 ) && 7 === sgs_flat_duration_ms( 'x', 7 ), 'durations clamp to 0..3000 and default on junk' );

// ══════════════════════════════════════════════════════════════════════════
// 2. The drawer on the Entrance model (Spec 38A FR-38A-51).
// ══════════════════════════════════════════════════════════════════════════
$sel       = '.u.wp-block-sgs-nav-drawer';
$nd_render = read_file( 'src/blocks/nav-drawer/render.php' );
ok( has( $nd_render, '$sgs_nd_motion = sgs_nav_drawer_motion_timing( $attributes );' ) && has( $nd_render, "\$wrapper_args['data-sgs-motion-state'] = '';" ), 'every drawer reads its panel layer timing and prints the motion state host' );
ok( ! function_exists( 'sgs_nav_drawer_motion' ) && ! function_exists( 'sgs_nav_drawer_uses_motion_model' ), 'the old drawer motion resolver and its overlap gate are gone' );

$none = sgs_nav_drawer_motion_timing( array() );
ok( null === $none['enter_ms'] && null === $none['exit_ms'] && '' === $none['easing'] && array() === $none['data'], 'with no panel layer: no timing, so the scrim keeps its own default' );
$layer = static function ( array $values, array $close = array(), string $trigger = 'open' ): array {
	$base = array(
		'trigger' => $trigger,
		'values'  => $values,
	);
	if ( array() !== $close ) {
		$base['close'] = $close;
	}
	return array( 'sgsMotion' => array( 'elements' => array( 'root' => array( 'entrance' => array( 'base' => $base ) ) ) ) );
};
$t_away = sgs_nav_drawer_motion_timing( $layer( array( 'duration' => 300, 'easing' => 'ease-out' ), array( 'closeDuration' => 200 ) ) );
ok( 300 === $t_away['enter_ms'] && 200 === $t_away['exit_ms'] && 'ease-out' === $t_away['easing'] && array() === $t_away['data'], 'a 300ms open, 200ms close panel times the scrim 300/200 with its easing' );
$t_same = sgs_nav_drawer_motion_timing( $layer( array( 'duration' => 900, 'easing' => 'token:easing.emphasised' ) ) );
ok( 900 === $t_same['exit_ms'] && 'var(--wp--custom--easing--emphasised)' === $t_same['easing'] && array_key_exists( 'sgs-nd-focus-after-entry', $t_same['data'] ), 'no close duration follows the open; a token easing resolves; over 500ms defers focus' );
ok( null === sgs_nav_drawer_motion_timing( $layer( array( 'duration' => 'token:duration.slow' ) ) )['enter_ms'] && null === sgs_nav_drawer_motion_timing( $layer( array( 'duration' => 900 ), array(), 'scroll' ) )['enter_ms'], 'a token duration, or a root entrance on another trigger, gives no timing' );

// The panel's transform origin is anchor geometry, so a drawer grows from its anchor's edge.
$origin_header = sgs_nav_drawer_motion_origin_css( $sel, array( 'desktop' => 'header' ), $anchors );
ok( $sel . '{--sgs-nd-anim-origin:top center;}' === $origin_header, 'a header anchor emits the top-edge origin (top center) and nothing else' );
ok( $sel . '{--sgs-nd-anim-origin:top center;}' === sgs_nav_drawer_motion_origin_css( $sel, array( 'desktop' => 'container' ), $anchors ), 'a container anchor emits the same top-edge origin' );
$origin_tiers = sgs_nav_drawer_motion_origin_css( $sel, array( 'desktop' => 'header', 'mobile' => 'full-screen' ), $anchors );
ok( $sel . '{--sgs-nd-anim-origin:top center;}@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){' . $sel . '{--sgs-nd-anim-origin:center;}}' === $origin_tiers, 'the origin follows the anchor per tier: Tablet inherits Desktop, the full-screen phone is centred' );
ok( $sel . '{--sgs-nd-anim-origin:top right;}' === sgs_nav_drawer_motion_origin_css( $sel, array( 'desktop' => 'trigger' ), $anchors ), 'a trigger anchor emits the corner origin (top right)' );
ok( '' === sgs_nav_drawer_motion_origin_css( $sel, array(), $anchors ) && '' === sgs_nav_drawer_motion_origin_css( $sel, array( 'desktop' => 'side-start', 'mobile' => 'centred' ), $anchors ), 'a drawer whose every tier is centred emits nothing' );
ok( 1 === preg_match( '/\$css\s+\.= sgs_nav_drawer_motion_origin_css\( \$root_sel, \$anchor_attr_raw, \$sgs_nd_allowed_anchors \);/', $nd_render ) && 1 === substr_count( $nd_render, 'sgs_nav_drawer_motion_origin_css' ), 'render.php writes the origin once, for every drawer' );

$nd_css = read_file( 'src/blocks/nav-drawer/style.css' );
ok( has( $nd_css, "[data-sgs-motion-state] {\n\t\ttransform-origin: var(--sgs-nd-anim-origin, center);" ), 'the stylesheet applies the anchor origin to the motion state host' );
ok( ! has( $nd_css, '@keyframes sgs-nav-drawer-' ) && ! has( $nd_css, '--sgs-nd-last-i' ) && ! has( $nd_css, 'sgs-nav-drawer--stagger' ), 'the old panel keyframes and the item ladder are gone from the drawer stylesheet' );

$nd_edit = read_file( 'src/blocks/nav-drawer/edit.js' );
ok( has( $nd_edit, 'scrimFadeDuration: value ?? 0' ) && ! has( $nd_edit, 'curtainColour' ), 'the scrim fade time keeps its control; the curtain colour control is gone' );
ok( array( 'root', 'body' ) === ( json_decode( read_file( 'src/blocks/nav-drawer/block.json' ), true )['supports']['sgs']['motion']['opens'] ?? null ), 'the drawer offers Panel opens on its root and body' );
$nd_json = json_decode( read_file( 'src/blocks/nav-drawer/block.json' ), true );
foreach ( array( 'entryAnimation', 'entryDuration', 'exitDuration', 'entryEasing', 'entryEasingCustom', 'entryFade', 'curtainColour', 'curtainColourGradient', 'itemStagger', 'itemStaggerDistance', 'itemStaggerDuration', 'itemStaggerMax', 'itemStaggerOnClose', 'itemStaggerAxis', 'itemStaggerReveal', 'staggerInsideGroups' ) as $gone ) {
	ok( ! isset( $nd_json['attributes'][ $gone ] ), "nav-drawer attribute $gone is removed" );
}
foreach ( array( 'src/blocks/nav-drawer/MotionPanel.js', 'src/blocks/nav-drawer/ItemEntranceControls.js', 'src/blocks/nav-drawer/grow-from-anchor.js', 'includes/helpers-nav-drawer-motion.php', 'includes/helpers-nav-drawer-stagger-shape.php' ) as $gone_file ) {
	ok( ! file_exists( $root . '/' . $gone_file ), "$gone_file is deleted" );
}

$ndm_css = read_file( 'src/blocks/nav-drawer-menu/style.css' );
ok( ! has( $ndm_css, 'sibling-index()' ) && ! has( $ndm_css, '--sgs-i:' ) && ! has( $ndm_css, '--sgs-ndm-si:' ), 'the drawer menu stylesheet carries no index ladder' );
ok( has( read_file( 'src/blocks/nav-drawer-menu/render.php' ), "Sgs_Motion_Loop_Delays::item_array( 'sgs/nav-drawer-menu', \$uid, \$attributes, \$sgs_nm_loop_tagged['count'], '.sgs-nav-drawer-menu__item' )" ) && has( $ndm_css, '[data-drill-enhanced] > .sgs-nav-drawer-menu__item[data-sgs-me~="open"]' ), 'the menu items take stored per-index delays and fill backwards in drill mode' );
// The accordion section's open and close runs on `::details-content`, which the model cannot target (Bean decision C).
ok( has( $ndm_css, '::details-content' ) && has( $ndm_css, '.sgs-nav-drawer-menu--acc-height' ), 'the accordion section open and close stays on its ::details-content CSS' );
$ndm_json = json_decode( read_file( 'src/blocks/nav-drawer-menu/block.json' ), true );
ok( isset( $ndm_json['attributes']['submenuAnimation'] ) && ! isset( $ndm_json['attributes']['submenuItemStagger'] ), 'the drawer menu keeps the section animation attributes and loses the row stagger' );

$store     = read_file( 'src/shared/nav-interactivity/store.js' );
$lifecycle = read_file( 'src/shared/nav-interactivity/drawer-lifecycle.js' );
$close_at  = strpos( $store, "drawer.classList.add( 'is-closing' );" );
$tell_at   = strpos( $store, "announceDrawer( drawer, 'close' );" );
$sample_at = strpos( $store, 'whenAnimationsSettle( drawer, () => drawer.close() );' );
ok( false !== $close_at && false !== $tell_at && false !== $sample_at && $close_at < $tell_at && $tell_at < $sample_at, 'the store announces the close BEFORE it samples the animations to wait on' );
$dms = read_file( 'src/blocks/nav-drawer/drawer-motion-state.js' );
ok( has( $dms, "import( /* webpackIgnore: true */ '@sgs/motion-state' )" ) && has( $dms, '.catch( () => null )' ) && has( $dms, 'loaded.clearMotionState( drawer )' ) && has( read_file( 'src/blocks/nav-drawer/view.js' ), 'initDrawerMotionState();' ) && ! has( read_file( 'src/blocks/nav-drawer/view.js' ), 'GrowFromAnchor' ), 'the drawer publishes open and close through @sgs/motion-state and fails soft' );

// ══════════════════════════════════════════════════════════════════════════
// 3. The bar's panels on the Entrance model.
// ══════════════════════════════════════════════════════════════════════════
$markup = read_file( 'includes/nav-menu-markup.php' );
ok( has( $markup, 'sgs-nav-bar-menu__mega-panel-wrap sgs-nav-bar-menu__panel-motion" data-sgs-mega-panel' ) && has( $markup, "\$sub_wrap_class = 'sgs-nav-bar-menu__submenu-wrap sgs-nav-bar-menu__panel-motion';" ), 'both forks carry the panel motion class, with no shape modifier' );

$nbm_render = read_file( 'src/blocks/nav-bar-menu/render.php' );
ok( has( $nbm_render, 'sgs_nav_bar_motion_panels( $items_html, $uid, $attributes )' ) && has( read_file( 'includes/helpers-nav-bar-motion-model.php' ), "Sgs_Motion_Loop_Delays::item_array( 'sgs/nav-bar-menu'" ), 'every bar takes its item delays from the stored stagger settings (one scoped rule per index)' );
ok( has( $nbm_render, "'enter_ms' => \$sgs_nm_scrim_fade > 0 ? \$sgs_nm_scrim_fade : \$sgs_nm_panel_in," ), 'the bar scrim fades with the panels unless a scrim fade duration is set' );
ok( ! has( $nbm_render, 'sgs-nav-bar-menu--panel-stagger' ) && ! has( $nbm_render, '--sgs-nbm-panel-dur' ) && ! has( $nbm_render, '--sgs-nbm-stagger' ), 'render.php writes no old panel values or stagger classes' );

$nbm_css = read_file( 'src/blocks/nav-bar-menu/style.css' );
ok( ! has( $nbm_css, 'sgs-nav-bar-menu__panel-motion--' ) && ! has( $nbm_css, 'sibling-index()' ) && ! has( $nbm_css, '--sgs-i:' ) && ! has( $nbm_css, '@keyframes sgs-nav-bar-menu-panel-item-in' ), 'the bar stylesheet carries no panel shape rules and no item ladder' );
$nbm_json = json_decode( read_file( 'src/blocks/nav-bar-menu/block.json' ), true );
foreach ( array( 'submenuAnimation', 'submenuAnimationDuration', 'submenuExitDuration', 'submenuAnimationEasing', 'submenuAnimationEasingCustom', 'submenuItemStagger', 'submenuItemStaggerDuration', 'submenuItemStaggerMax', 'submenuItemStaggerDistance', 'submenuItemStaggerScope', 'burgerMorphDuration', 'burgerMorphEasing', 'burgerMorphEasingCustom' ) as $gone ) {
	ok( ! isset( $nbm_json['attributes'][ $gone ] ), "nav-bar-menu attribute $gone is removed" );
}
ok( ! file_exists( $root . '/src/blocks/nav-bar-menu/PanelMotionPanel.js' ), 'PanelMotionPanel.js is deleted' );
ok( has( read_file( 'src/blocks/nav-bar-menu/view.js' ), "import initPanelMotionState from './panel-motion-state';" ), 'the bar publishes each panel open state through @sgs/motion-state (panel-motion-state.js)' );

// ══════════════════════════════════════════════════════════════════════════
// 4. Close lifecycle and the retired JS stagger.
// ══════════════════════════════════════════════════════════════════════════
ok( has( $lifecycle, 'el.getAnimations( { subtree: true } )' ) && has( $lifecycle, 'Promise.allSettled' ) && has( $store, "import { announceDrawer, whenAnimationsSettle } from './drawer-lifecycle';" ), 'the close waits on every subtree animation (drawer-lifecycle.js)' );
ok( ! has( $store, "addEventListener( 'animationend'" ), 'the close no longer ends on the first animationend' );
ok( has( $store, 'data-sgs-nd-focus-after-entry' ), 'focus waits for a long entry' );
ok( ! file_exists( $root . '/src/shared/effects/stagger.js' ), 'the JS stagger module is deleted' );

$mp_json = json_decode( read_file( 'src/blocks/mega-panel/block.json' ), true );
ok( ! isset( $mp_json['attributes']['staggerOnOpen'] ) && ! isset( $mp_json['attributes']['fxEffect'] ), 'mega-panel carries neither staggerOnOpen nor the block-private fx effect attributes' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );

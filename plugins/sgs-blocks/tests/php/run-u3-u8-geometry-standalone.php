<?php
/**
 * Standalone test: Wave 3C U-3 + U-8, where a surface sits.
 *
 * Drawer: the side and header-content anchors, anchorOffset, their motion and
 * default edge (nav-drawer/render.php::$sgs_nd_geometry_for_anchor and the
 * default-edge section, includes/helpers-nav-drawer-motion.php, store.js).
 * Menu: the per-tier item gap, the shared panel placement vocabulary, the gap
 * below the header and the hover bridge (includes/nav-menu-*.php, block.json).
 *
 * The drawer geometry closure is extracted from the REAL render.php and run.
 * Every block of checks carries a negative control: the same check run against
 * the pre-change source (PRE_CHANGE, read with `git show`) must fail.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-u3-u8-geometry-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable WordPress.WP.AlternativeFunctions, Squiz.PHP.Eval.Discouraged -- CLI test harness.

const PRE_CHANGE = 'b867a7fa1';

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/' );
}

$pass = 0;
$fail = 0;

/**
 * Record one check.
 *
 * @param bool   $cond  Result.
 * @param string $label What was checked.
 */
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

/**
 * Text between two markers (start inclusive, end exclusive), or ''.
 *
 * @param string $src   Source.
 * @param string $start Start marker.
 * @param string $end   End marker.
 * @return string Section.
 */
function section( string $src, string $start, string $end ): string {
	$a = strpos( $src, $start );
	$b = false !== $a ? strpos( $src, $end, $a ) : false;
	return ( false !== $a && false !== $b ) ? substr( $src, $a, $b - $a ) : '';
}

/**
 * A repo file at the pre-change commit.
 *
 * @param string $path Repo-relative path.
 * @return string Contents ('' when unavailable).
 */
function old_file( string $path ): string {
	$root = dirname( __DIR__, 4 );
	return (string) shell_exec( 'git -C ' . escapeshellarg( $root ) . ' show ' . PRE_CHANGE . ':' . $path . ' 2>' . ( '\\' === DIRECTORY_SEPARATOR ? 'NUL' : '/dev/null' ) );
}

$plugin   = dirname( __DIR__, 2 );
$rel      = 'plugins/sgs-blocks/';
$render   = (string) file_get_contents( $plugin . '/src/blocks/nav-drawer/render.php' );
$old_rend = old_file( $rel . 'src/blocks/nav-drawer/render.php' );
ok( '' !== $old_rend, 'the pre-change render.php is readable for the negative controls' );

// ── 1. Drawer geometry closure ────────────────────────────────────────────
$geometry = function ( string $src ) {
	$code = section( $src, '$sgs_nd_z_under_header = ', '$anchor_attr_raw ' );
	if ( '' === $code ) {
		return null;
	}
	$sgs_nd_geometry_for_anchor = null;
	eval( $code );
	return $sgs_nd_geometry_for_anchor;
};
$geo     = $geometry( $render );
$old_geo = $geometry( $old_rend );
ok( is_callable( $geo ) && is_callable( $old_geo ), 'the geometry closure is extracted from the current and the pre-change render.php' );

$z_popover = 'z-index:calc(var(--sgs-header-z, 100) + 1);';
$z_under   = 'z-index:min(90, max(2, calc(var(--sgs-header-z, 100) - 1)));';

$side = $geo( 'side-start', '390px', 'modal', '' );
ok( false !== strpos( $side, 'inset-inline-start:0;' ) && false !== strpos( $side, 'width:min(390px, 100vw);' ) && false !== strpos( $side, 'top:0px;' ) && false !== strpos( $side, 'height:calc(100dvh - 0px);' ), 'side-start: a full-height panel on the start edge, panelSize wide (away 768: 390 x 900 at left 0)' );
ok( false !== strpos( $side, $z_under ), 'a modal side panel stacks under the header rule (the dialog is top layer anyway)' );
ok( false === strpos( $old_geo( 'side-start', '390px', 'modal' ), 'inset-inline-start' ), 'NEGATIVE CONTROL: the pre-change closure has no side panel (side-start fell through to full screen)' );
ok( false !== strpos( $geo( 'side-end', '', 'modal', '' ), 'inset-inline-end:0;' ) && false !== strpos( $geo( 'side-end', '', 'modal', '' ), 'width:min(400px, 100vw);' ), 'side-end: the end edge, default width 400px' );
$side_nm = $geo( 'side-start', '', 'non-modal', '' );
ok( false !== strpos( $side_nm, 'top:var(--sgs-drawer-opener-row-bottom, 0px);' ) && false !== strpos( $side_nm, $z_popover ), 'a non-modal side panel starts at the burger row and paints above the header' );

$cont = $geo( 'container', '', 'modal', '' );
ok( false !== strpos( $cont, 'left:var(--sgs-drawer-container-left, 16px);' ) && false !== strpos( $cont, 'right:var(--sgs-drawer-container-right, 16px);' ), 'container: left and right follow the measured header content box (16px without one)' );
ok( false !== strpos( $cont, 'top:calc(var(--sgs-drawer-header-offset, var(--sgs-header-height, 0px)) + 0px);' ), 'container (modal): directly under the header by default (lusion 375: top 66 under a 64.8 header)' );
ok( false !== strpos( $geo( 'container', '', 'non-modal', '12px' ), 'top:calc(var(--sgs-drawer-opener-row-bottom, 0px) + 12px);' ), 'container (non-modal): under the burger row plus anchorOffset' );
ok( false === strpos( $old_geo( 'container', '', 'modal' ), 'container-left' ), 'NEGATIVE CONTROL: the pre-change closure has no container anchor' );

$trig = $geo( 'trigger', '310px', 'non-modal', '12.8px' );
ok( false !== strpos( $trig, 'top:calc(var(--sgs-drawer-trigger-top, 8px) + 12.8px);' ), 'trigger: anchorOffset is the gap below the burger (lusion 1440: 12.8px)' );
ok( false !== strpos( $geo( 'trigger', '', 'modal', '' ), 'top:calc(var(--sgs-drawer-trigger-top, 8px) + 8px);' ), 'trigger: the default gap stays 8px, so an untouched drawer is unchanged (16px before JS)' );
ok( false !== strpos( $old_geo( 'trigger', '', 'modal' ), 'top:var(--sgs-drawer-trigger-top, 16px);' ), 'NEGATIVE CONTROL: the pre-change trigger panel had no operator gap' );

ok( false !== strpos( $render, "\$sgs_nd_allowed_anchors = array( 'full-screen', 'header', 'side-start', 'side-end', 'container', 'trigger', 'centred' );" ), 'the anchor allow-list carries all seven values' );
ok( false !== strpos( $render, "\$anchor_offset_raw    = \$attributes['anchorOffset'] ?? array();" ) && false !== strpos( $render, '$sgs_nd_offset_is_set ||' ), 'render.php reads anchorOffset per tier and emits geometry when only the offset is set' );

// ── 2. Default edge for the new anchors ───────────────────────────────────
require_once $plugin . '/includes/class-sgs-breakpoints.php';
require_once $plugin . '/includes/helpers-responsive.php';
require_once $plugin . '/includes/helpers-shadow-layers.php';
$edge_section = section( $render, '// ── Default edge (Bean, 2026-09-24).', '// ── Background image media layer' );
ok( '' !== $edge_section, 'the default-edge section is found' );
$run_edge = function ( array $attributes, string $modality ) use ( $edge_section ): string {
	$css                    = '';
	$root_sel               = '.t.wp-block-sgs-nav-drawer';
	$sgs_nd_allowed_anchors = array( 'full-screen', 'header', 'side-start', 'side-end', 'container', 'trigger', 'centred' );
	$sgs_nd_shadow_raw      = isset( $attributes['shadow'] ) ? (string) $attributes['shadow'] : '';
	eval( $edge_section );
	return $css;
};
$edge_side = $run_edge( array( 'anchor' => array( 'desktop' => 'side-start' ) ), 'modal' );
ok( false !== strpos( $edge_side, 'box-shadow:var(--wp--preset--shadow--floating)' ) && false !== strpos( $edge_side, 'border-radius:0;' ) && false !== strpos( $edge_side, 'border:0;border-inline-end:1px solid var(--wp--preset--color--primary);' ), 'side-start: shadow, square corners, a line on the open (inline-end) edge' );
ok( false !== strpos( $run_edge( array( 'anchor' => array( 'desktop' => 'side-end' ) ), 'modal' ), 'border-inline-start:1px solid' ), 'side-end: the line sits on the inline-start edge' );
$edge_cont = $run_edge( array( 'anchor' => array( 'desktop' => 'container' ) ), 'modal' );
ok( false !== strpos( $edge_cont, 'border-radius:20px;' ) && false !== strpos( $edge_cont, 'border:1px solid var(--wp--preset--color--primary);' ), 'container: the card edge (20px corners, 1px line)' );
ok( '' === $run_edge( array(), 'modal' ), 'NEGATIVE CONTROL: a modal full-screen drawer still gets no default edge' );

// ── 3. Motion: auto follows the new anchors ───────────────────────────────
require_once $plugin . '/includes/helpers-motion-easing.php';
require_once $plugin . '/includes/helpers-nav-drawer-motion.php';
ok( 'sgs-nav-drawer-slide-start-in' === sgs_nav_drawer_motion_keyframes( 'auto', 'side-start' )['in'], 'auto on a side-start panel slides in from the start edge' );
ok( 'sgs-nav-drawer-slide-end-in' === sgs_nav_drawer_motion_keyframes( 'auto', 'side-end' )['in'], 'auto on a side-end panel slides in from the end edge' );
ok( 'sgs-nav-drawer-expand-down-in' === sgs_nav_drawer_motion_keyframes( 'auto', 'container' )['in'], 'auto on a container panel expands down from the header' );
ok( false === strpos( old_file( $rel . 'includes/helpers-nav-drawer-motion.php' ), "'side-start' =>" ), 'NEGATIVE CONTROL: the pre-change auto map had no side anchors' );

// ── 4. store.js measurements ──────────────────────────────────────────────
$store     = (string) file_get_contents( $plugin . '/src/shared/nav-interactivity/store.js' );
$old_store = old_file( $rel . 'src/shared/nav-interactivity/store.js' );
ok( 3 === substr_count( $store, 'publishContainerInsets( drawer, trigger )' ) && 1 === substr_count( $store, 'function publishContainerInsets( drawer, trigger )' ), 'store.js measures the header content box on open and on every viewport change' );
ok( false !== strpos( $store, ".querySelector( ':scope > .sgs-container__inner' ) || row" ) && false !== strpos( $store, 'document.documentElement.clientWidth -' ), 'the content box is the row band when present, else the row, measured against clientWidth' );
ok( false !== strpos( $store, 'Math.round( tRect.bottom ) )' ) && false === strpos( $store, 'tRect.bottom + 8' ), 'the trigger top is the raw burger bottom (the gap is anchorOffset)' );
ok( false !== strpos( $old_store, 'tRect.bottom + 8' ), 'NEGATIVE CONTROL: the pre-change store.js hardcoded +8' );

// ── 5. Item gap per tier ──────────────────────────────────────────────────
$link_css = (string) file_get_contents( $plugin . '/includes/nav-menu-submenu-link-css.php' );
$sep_css  = (string) file_get_contents( $plugin . '/includes/nav-menu-item-border-featured-css.php' );
ok( false !== strpos( $link_css, "'css'       => '--sgs-nm-gap'," ) && false !== strpos( $link_css, "__bar{gap:var(--sgs-nm-gap, 8px);}" ), 'the gap is written per tier as --sgs-nm-gap and the bar reads it' );
ok( false !== strpos( $sep_css, "\$item_separator_gap       = 'var(--sgs-nm-gap, 8px)';" ), 'the item separator centres on the same per-tier gap' );
$string_casts = 0;
foreach ( glob( $plugin . '/includes/nav-menu-*.php' ) as $f ) {
	$string_casts += preg_match_all( "/\\(string\\)\\s*\\(?\\s*\\\$attributes\\['gap'\\]/", (string) file_get_contents( $f ) );
}
ok( 0 === $string_casts, 'no nav include casts the gap object to a string (it would print "Array")' );
ok( 1 <= preg_match_all( "/\\(string\\)\\s*\\(?\\s*\\\$attributes\\['gap'\\]/", old_file( $rel . 'includes/nav-menu-submenu-link-css.php' ) . old_file( $rel . 'includes/nav-menu-item-border-featured-css.php' ) ), 'NEGATIVE CONTROL: the pre-change includes cast the flat gap string' );
$gap_obj = sgs_emit_responsive_css(
	'.u',
	array(
		array(
			'value'     => array( 'desktop' => '32px', 'mobile' => '24px' ),
			'css'       => '--sgs-nm-gap',
			'transform' => static function ( $raw ) {
				return (string) $raw;
			},
		),
	)
);
ok( false !== strpos( $gap_obj, '.u{--sgs-nm-gap:32px;}' ) && false !== strpos( $gap_obj, '.u{--sgs-nm-gap:24px;}' ), 'lusion pitch: 32px above, 24px at mobile, as two tier rules' );

// ── 6. block.json shapes ──────────────────────────────────────────────────
$bj = function ( string $block ) use ( $plugin ): array {
	return json_decode( (string) file_get_contents( $plugin . '/src/blocks/' . $block . '/block.json' ), true )['attributes'];
};
$nbm = $bj( 'nav-bar-menu' );
$ndm = $bj( 'nav-drawer-menu' );
$nd  = $bj( 'nav-drawer' );
ok( 'object' === $nbm['gap']['type'] && 'object' === $ndm['gap']['type'], 'gap is a tier object on both menu blocks' );
ok( array( 'start', 'center', 'end', 'page-centred', 'full-width' ) === $nbm['submenuAlign']['enum'], 'submenuAlign carries the five placements' );
ok( 'object' === $nbm['megaAlign']['type'] && ! isset( $nbm['megaAlign']['enum'] ), 'megaAlign is a tier object with no JSON enum (PHP allow-list)' );
ok( 'object' === $nd['anchorOffset']['type'], 'anchorOffset is a tier object on the drawer' );
$old_nbm = json_decode( old_file( $rel . 'src/blocks/nav-bar-menu/block.json' ), true )['attributes'] ?? array();
ok( isset( $old_nbm['gap'] ) && 'string' === $old_nbm['gap']['type'] && ! isset( $old_nbm['megaAlign'] ), 'NEGATIVE CONTROL: the pre-change bar had a flat gap and no megaAlign' );

// ── 7. Panel placement and the gap below the header ───────────────────────
$sub     = (string) file_get_contents( $plugin . '/includes/nav-menu-submenu-css.php' );
$old_sub = old_file( $rel . 'includes/nav-menu-submenu-css.php' );
ok( false !== strpos( $sub, "'calc(var(--sgs-mm-panel-top, 100%) + ' . \$sgs_nm_top_offset . ')'" ) && false !== strpos( $sub, "__mega-panel-wrap{position:absolute;top:' . \$sgs_nm_panel_top . ';" ) && false !== strpos( $sub, '$submenu_wrap_top = $sgs_nm_panel_top;' ), 'both panel kinds sit at the header bottom plus submenuTopOffset' );
ok( false !== strpos( $old_sub, "__mega-panel-wrap{position:absolute;top:var(--sgs-mm-panel-top, 100%);" ), 'NEGATIVE CONTROL: the pre-change mega panel ignored submenuTopOffset' );
ok( false !== strpos( $sub, "'css'       => '--sgs-nbm-mega-align'," ) && false !== strpos( $sub, "array( 'start', 'center', 'end', 'page-centred', 'full-width' ), true ) ? \$raw : ''" ), 'megaAlign is written per tier as --sgs-nbm-mega-align through the allow-list' );
ok( false !== strpos( $sub, "__mega' . \$sgs_nm_open_root . '::after{" ) && false !== strpos( $sub, 'height:var(--sgs-mm-bridge-h, 0px);' ) && false === strpos( $sub, '__submenu-wrap::before{' ), 'the hover bridge hangs from the open item on both kinds, sized by the script, never from the scrolling wrap' );
ok( false !== strpos( $old_sub, '__submenu-wrap::before{' ), 'NEGATIVE CONTROL: the pre-change bridge sat on the scrolling dropdown wrap only' );
$nbm_render = (string) file_get_contents( $plugin . '/src/blocks/nav-bar-menu/render.php' );
ok( false !== strpos( $nbm_render, "array( 'start', 'center', 'end', 'page-centred', 'full-width' ), true )" ), 'the dropdown align allow-list matches the JSON enum' );

$md = (string) file_get_contents( $plugin . '/src/shared/nav-interactivity/mega-disclosure.js' );
ok( false !== strpos( $md, "root.closest( '.sgs-site-header' ) || root.closest( '.sgs-site-header-row' )" ) && false !== strpos( $md, "'--sgs-mm-panel-top'," ), 'repositionPanel publishes the header bottom for both kinds' );
ok( false !== strpos( $md, "root.style.setProperty(\r\n\t\t\t'--sgs-mm-bridge-h'," ) || false !== strpos( $md, "root.style.setProperty(\n\t\t\t'--sgs-mm-bridge-h'," ), 'the bridge height is published on the disclosure root' );

ok( false !== strpos( $md, 'const pageWidth = document.documentElement.clientWidth;' ) && false === strpos( $md, 'viewportBounds( window.innerWidth )' ), 'panels centre on the visible page width, not one that includes the scrollbar (live: 7px off centre)' );
ok( false !== strpos( old_file( $rel . 'src/shared/nav-interactivity/mega-disclosure.js' ), 'viewportBounds( window.innerWidth )' ), 'NEGATIVE CONTROL: the pre-change code centred on innerWidth' );
ok( false !== strpos( $md, 'restingTop - anchor.bottom' ) && false !== strpos( $md, 'parseFloat( window.getComputedStyle( panel ).top )' ), 'the bridge is sized from the panel resting top, not its mid-animation rect (live: 8px dead strip)' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );

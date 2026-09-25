<?php
/**
 * Standalone runner for Wave 3C U-10 + U-14 (header-row structure).
 *
 * Calls the REAL code and checks:
 * 1. includes/device-visibility.php: `sgsCollapseVisibility` hide/only add
 *    `sgs-hide-collapsed` / `sgs-only-collapsed`; an off-list value adds nothing.
 * 2. includes/sgs-header-pass-through.php: the header writes those rules at its
 *    burger-owning menu's collapse point (nested menu, collapsePoint 1060), and
 *    writes none when the menu has showBurger false or there is no menu.
 * 3. `headerPassThrough` on at desktop only: the merge entry is position:fixed
 *    with the admin-bar term, and the structural pointer-events pair sits in
 *    the desktop query only.
 * 4. includes/nav-trigger-surface-css.php: `triggerSurface` emits the ::after
 *    stretch, the magnet move and the static rules inside the tier + collapse
 *    query; off emits nothing.
 * 5. includes/nav-detach-chip.php + nav-menu-markup.php: the chip copy of the
 *    burger carries the detach wrapper class, data-sgs-nav-collapse,
 *    aria-controls, the click directive, no aria-hidden and the uid class; it
 *    is queued once and printed on wp_footer; its size is never below 44px.
 *
 * Negative control: the same file run against the parent commit (<sha>~1)
 * fails, because none of these files or behaviours exist there.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-u10-u14-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged
// phpcs:disable Generic.Files.OneObjectStructurePerFile.MultipleFound

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// ── Minimal WordPress stubs ─────────────────────────────────────────────────
foreach ( array( 'esc_attr', 'esc_html', 'sanitize_key', 'sanitize_html_class', 'sanitize_hex_color', 'esc_attr__', '__', 'esc_html__' ) as $sgs_stub ) {
	if ( ! function_exists( $sgs_stub ) ) {
		eval( "function {$sgs_stub}( \$s ) { return (string) \$s; }" ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- fixed identity stubs for a CLI test.
	}
}
$GLOBALS['sgs_test_actions'] = array();
function add_action( $hook, $cb, $priority = 10 ) {
	$GLOBALS['sgs_test_actions'][ $hook ][] = $cb;
}
function add_filter( ...$args ) {}
function wp_json_encode( $data ) {
	return json_encode( $data );
}
function absint( $n ) {
	return abs( (int) $n );
}
function wp_get_global_settings() {
	return array();
}
function wp_interactivity_data_wp_context( $ctx ) {
	return "data-wp-context='" . json_encode( $ctx ) . "'";
}

/**
 * A minimal stand-in for WordPress's WP_HTML_Tag_Processor: enough for
 * device-visibility.php's first-visible-tag class injection.
 */
class WP_HTML_Tag_Processor {
	private $html;
	private $pos   = -1;
	private $tag   = '';
	private $start = 0;
	private $len   = 0;
	public function __construct( $html ) {
		$this->html = $html;
	}
	public function next_tag() {
		if ( ! preg_match( '/<([a-zA-Z]+)([^>]*)>/', $this->html, $m, PREG_OFFSET_CAPTURE, $this->pos + 1 ) ) {
			return false;
		}
		$this->tag   = strtoupper( $m[1][0] );
		$this->start = $m[0][1];
		$this->len   = strlen( $m[0][0] );
		$this->pos   = $m[0][1];
		return true;
	}
	public function get_tag() {
		return $this->tag;
	}
	public function get_attribute( $name ) {
		$open = substr( $this->html, $this->start, $this->len );
		return preg_match( '/\s' . $name . '="([^"]*)"/', $open, $m ) ? $m[1] : null;
	}
	public function add_class( $class ) {
		$open = substr( $this->html, $this->start, $this->len );
		$new  = preg_replace( '/\sclass="([^"]*)"/', ' class="$1 ' . $class . '"', $open, 1 );
		$this->html = substr_replace( $this->html, $new, $this->start, $this->len );
		$this->len  = strlen( $new );
	}
	public function set_attribute( $name, $value ) {
		$open = substr( $this->html, $this->start, $this->len );
		$new  = substr( $open, 0, -1 ) . ' ' . $name . '="' . $value . '">';
		$this->html = substr_replace( $this->html, $new, $this->start, $this->len );
		$this->len  = strlen( $new );
	}
	public function get_updated_html() {
		return $this->html;
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

$root = dirname( __DIR__, 2 );
foreach ( array( 'device-visibility.php', 'sgs-header-pass-through.php', 'nav-trigger-surface-css.php', 'nav-detach-chip.php', 'helpers-item-effects.php', 'nav-menu-markup.php' ) as $sgs_file ) {
	if ( ! is_file( $root . '/includes/' . $sgs_file ) ) {
		ok( false, "includes/$sgs_file exists" );
		echo "\n$pass passed, $fail failed\n";
		exit( 1 );
	}
}
require_once $root . '/includes/helpers-css-safety.php';
require_once $root . '/includes/helpers-responsive.php';
require_once $root . '/includes/device-visibility.php';
require_once $root . '/includes/sgs-header-pass-through.php';
require_once $root . '/includes/nav-trigger-surface-css.php';
require_once $root . '/includes/nav-detach-chip.php';
require_once $root . '/includes/helpers-item-effects.php';
require_once $root . '/includes/nav-menu-markup.php';

// ── 1. Class injection ──────────────────────────────────────────────────────
$html = '<style>.x{}</style><div class="wp-block-x">Call</div>';
$out  = SGS\Blocks\inject_device_visibility_classes( $html, array( 'blockName' => 'sgs/button', 'attrs' => array( 'sgsCollapseVisibility' => 'hide' ) ) );
ok( false !== strpos( $out, 'class="wp-block-x sgs-hide-collapsed"' ), '1a hide adds sgs-hide-collapsed to the first visible tag' );
$out = SGS\Blocks\inject_device_visibility_classes( $html, array( 'blockName' => 'sgs/button', 'attrs' => array( 'sgsCollapseVisibility' => 'only' ) ) );
ok( false !== strpos( $out, 'sgs-only-collapsed' ), '1b only adds sgs-only-collapsed' );
$out = SGS\Blocks\inject_device_visibility_classes( $html, array( 'blockName' => 'sgs/button', 'attrs' => array( 'sgsCollapseVisibility' => 'bogus' ) ) );
ok( $out === $html, '1c an off-list value adds nothing' );

// ── 2. Collapse-visibility rules from the header ────────────────────────────
$nav    = array( 'blockName' => 'sgs/nav-bar-menu', 'attrs' => array( 'collapsePoint' => 1060 ), 'innerBlocks' => array() );
$header = array(
	'innerBlocks' => array(
		array( 'blockName' => 'sgs/site-header-row', 'attrs' => array(), 'innerBlocks' => array(
			array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array( $nav ) ),
		) ),
	),
);
$css    = sgs_header_collapse_visibility_css( '.h.sgs-site-header', $header );
ok( false !== strpos( $css, '@media (max-width:1059px){.h.sgs-site-header .sgs-hide-collapsed{display:none !important;}}' ), '2a hide rule below the nested menu\'s collapse point, scoped to the header' );
ok( false !== strpos( $css, '@media (min-width:1060px){.h.sgs-site-header .sgs-only-collapsed{display:none !important;}}' ), '2b only rule at and above it' );
$no_burger = $header;
$no_burger['innerBlocks'][0]['innerBlocks'][0]['innerBlocks'][0]['attrs']['showBurger'] = false;
ok( '' === sgs_header_collapse_visibility_css( '.h', $no_burger ), '2c a menu with showBurger false writes no rules' );
ok( '' === sgs_header_collapse_visibility_css( '.h', array( 'innerBlocks' => array() ) ), '2d no menu, no rules' );
$default_point = sgs_header_collapse_visibility_css( '.h', array( 'innerBlocks' => array( array( 'blockName' => 'sgs/nav-bar-menu', 'attrs' => array() ) ) ) );
ok( false !== strpos( $default_point, '(max-width:767px)' ), '2e an unset collapsePoint is 768' );

// ── 3. Pass-through ─────────────────────────────────────────────────────────
$pt    = array( 'headerPassThrough' => array( 'desktop' => 'on', 'tablet' => 'off' ) );
$entry = sgs_header_pass_through_entry( $pt );
ok( 'fixed' === $entry['props']['position'] && false !== strpos( $entry['props']['top'], '--wp-admin--admin-bar--height' ), '3a merge entry is fixed, under the admin bar' );
$merged = sgs_merge_tri_state_declarations( '.h', array( $entry ), 'off' );
ok( false !== strpos( $merged, 'position:fixed' ), '3b the merge emits position:fixed' );
$pcss = sgs_header_pass_through_css( '.h', $pt );
ok( 0 === strpos( $pcss, '@media (min-width:1024px){' ), '3c pointer rules sit in the desktop query only' );
ok( false !== strpos( $pcss, '.h,.h .sgs-site-header-row,.h .sgs-container__inner,.h .sgs-nav-bar-menu,.h .sgs-nav-bar-menu__bar{pointer-events:none;}' ), '3d structure passes clicks' );
ok( false !== strpos( $pcss, '.h .sgs-site-header-row>:not(.sgs-nav-bar-menu,.sgs-site-header-row,.sgs-container__inner)' ) && false !== strpos( $pcss, '.h .sgs-nav-bar-menu__mega-panel-wrap{pointer-events:auto;}' ), '3e row children and the menu\'s items and panels keep clicks' );
ok( false === strpos( $pcss, '768px' ), '3f nothing emitted for tablet or mobile' );
ok( '' === sgs_header_pass_through_css( '.h', array() ), '3g off everywhere emits nothing' );

// ── 4. Surface trigger ──────────────────────────────────────────────────────
$scss = sgs_nav_bar_menu_trigger_surface_css( array( 'triggerSurface' => array( 'desktop' => 'on', 'tablet' => 'off' ) ), '.m', 1100 );
ok( 0 === strpos( $scss, '@media (min-width:1024px) and (max-width:1099px){' ), '4a inside the desktop tier AND below the collapse point' );
ok( false !== strpos( $scss, '.m .sgs-nav-bar-menu__burger::after{content:"";position:absolute;inset:0;cursor:pointer;}' ), '4b the ::after stretches' );
ok( false !== strpos( $scss, '.sgs-site-header-row:has(.m){position:relative;}' ), '4c the row is the containing block' );
ok( false !== strpos( $scss, '[data-sgs-fx="magnet"]{transform:none;will-change:auto;}' ), '4d the magnet transform leaves the button' );
ok( false !== strpos( $scss, ':not(.sgs-nav-bar-menu,.sgs-container__inner,:has(.m)))' ) && false !== strpos( $scss, '{z-index:1;}' ), '4e other row blocks sit above the overlay' );
ok( '' === sgs_nav_bar_menu_trigger_surface_css( array(), '.m', 1100 ), '4f off emits nothing' );

// ── 5. Detaching chip ───────────────────────────────────────────────────────
$chip_attrs = array(
	'triggerDetach'      => array( 'desktop' => 'on', 'tablet' => 'off' ),
	'triggerDetachAfter' => array( 'desktop' => 330, 'tablet' => 210 ),
	'triggerDetachSize' => array( 'desktop' => 68.6, 'mobile' => 30 ),
);
$toggle = sgs_nav_bar_menu_burger_toggle_markup( wp_interactivity_data_wp_context( array( 'isOpen' => false, 'drawerRef' => 'd1' ) ), 'd1', '<svg></svg>', 'icon', 'Menu', '', '', false, 1100, 'x', 'after', array(), 3, 'sgs-nav-bar-menu__detach-wrap' );
$wrap   = sgs_nav_detach_chip_wrap( 'sgs-nav-bar-menu-abc123', $toggle, $chip_attrs );
ok( false !== strpos( $wrap, 'class="sgs-nav-bar-menu-abc123 sgs-nav-bar-menu__detach"' ), '5a chip wrapper carries the menu uid' );
ok( false !== strpos( $wrap, 'class="sgs-nav-bar-menu__detach-wrap"' ) && false === strpos( $wrap, '__toggle-wrap' ), '5b detach wrapper class, never the toggle-wrap' );
ok( false !== strpos( $wrap, 'data-sgs-nav-collapse="1100"' ) && false !== strpos( $wrap, 'aria-controls="d1"' ) && false !== strpos( $wrap, 'data-wp-on--click="actions.toggleDrawer"' ), '5c collapse width, aria-controls and the toggle directive' );
ok( false === strpos( $wrap, 'aria-hidden="true"><button' ) && false === strpos( $wrap, 'sgs-nav-bar-menu__detach" aria-hidden' ), '5d the chip is not aria-hidden' );
ok( false !== strpos( $wrap, 'data-sgs-nav-detach-after="{&quot;desktop&quot;:330' ) || false !== strpos( $wrap, 'data-sgs-nav-detach-after="{"desktop":330' ), '5e per-tier thresholds for the watcher' );
sgs_nav_detach_chip_queue( 'sgs-nav-bar-menu-abc123', $wrap );
sgs_nav_detach_chip_queue( 'sgs-nav-bar-menu-abc123', $wrap );
ob_start();
foreach ( $GLOBALS['sgs_test_actions']['wp_footer'] ?? array() as $cb ) {
	$cb();
}
$printed = (string) ob_get_clean();
ok( 1 === substr_count( $printed, 'sgs-nav-bar-menu__detach"' ), '5f queued twice, printed once on wp_footer' );
$ccss = sgs_nav_detach_chip_css( $chip_attrs, '.sgs-nav-bar-menu-abc123', 1100 );
ok( false !== strpos( $ccss, '{display:none;position:fixed;top:calc(var(--wp-admin--admin-bar--height, 0px)' ), '5g hidden by default, fixed under the admin bar' );
ok( false !== strpos( $ccss, '--sgs-nav-detach-size:68.6px' ) && false !== strpos( $ccss, '--sgs-nav-detach-size:44px' ), '5h per-tier size, never below 44px' );
ok( false !== strpos( $ccss, '@media (min-width:1024px) and (max-width:1099px){.sgs-nav-bar-menu-abc123.sgs-nav-bar-menu__detach.is-detached{display:block;}}' ), '5i shown only at ON tiers below the collapse point' );
ok( '' === sgs_nav_detach_chip_css( array(), '.m', 1100 ), '5j off emits nothing' );

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );

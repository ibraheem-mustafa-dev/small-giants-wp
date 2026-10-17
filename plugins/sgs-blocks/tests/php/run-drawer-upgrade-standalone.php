<?php
/**
 * Standalone runner for the opt-in drawer settings (plan
 * .claude/plans/archive/2026-10-13-indus-review-block-builds.md items 7 and 9):
 *
 * - sgs/container `pinEdge` (includes/container-pin-edge-css.php)
 * - sgs/nav-drawer `chromeSticky`, the logo box and the close fill
 *   (includes/nav-drawer-chrome-extras-css.php) and the `icons` slot lift
 *   (includes/nav-drawer-chrome-icons.php)
 * - sgs/nav-drawer-menu caret box (includes/nav-drawer-menu-caret-box-css.php)
 * - sgs/mega-panel drawer shell, row fill, card box and `stacked-overlay`
 *   (includes/mega-panel-drawer-extras-css.php)
 *
 * Each setting has a negative case (unset emits nothing) and a positive case
 * (set paints the declared rule).
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-drawer-upgrade-standalone.php
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
require_once dirname( __DIR__, 2 ) . '/scripts/qa/lib/wp-stubs.php';

$root = dirname( __DIR__, 2 ) . '/includes/';
require_once $root . 'render-helpers.php';
require_once $root . 'container-pin-edge-css.php';
require_once $root . 'nav-drawer-chrome-extras-css.php';
require_once $root . 'nav-drawer-chrome-icons.php';
require_once $root . 'nav-drawer-menu-caret-box-css.php';
require_once $root . 'mega-panel-drawer-extras-css.php';

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

// ── Container pin to edge ────────────────────────────────────────────────────
$sel = '.sgs-cst-x.wp-block-sgs-container';
ok( '' === sgs_container_pin_edge_css( $sel, array() ), 'pin: unset emits nothing' );
ok( '' === sgs_container_pin_edge_css( $sel, array( 'pinEdge' => array() ) ), 'pin: the {} default emits nothing' );
ok( '' === sgs_container_pin_edge_css( $sel, array( 'pinEdge' => array( 'desktop' => 'none' ) ) ), 'pin: none everywhere emits nothing' );
$css = sgs_container_pin_edge_css(
	$sel,
	array(
		'pinEdge' => array( 'mobile' => 'bottom' ),
		'padding' => array( 'desktop' => array( 'bottom' => '16px' ) ),
	)
);
ok( 0 === strpos( $css, '@media (max-width:767px){' ), 'pin: mobile-only bottom sits inside the mobile query only' );
ok( false !== strpos( $css, 'position:sticky;bottom:0;z-index:2;padding-bottom:calc(16px + env(safe-area-inset-bottom, 0px)) !important;' ), 'pin: bottom sticks at 0, sits above siblings and adds the safe area to the cascaded padding' );
$css = sgs_container_pin_edge_css( $sel, array( 'pinEdge' => array( 'desktop' => 'top' ) ) );
ok( 0 === strpos( $css, $sel . '{position:sticky;top:0;' ) && false !== strpos( $css, 'padding-top:env(safe-area-inset-top, 0px) !important' ), 'pin: top on every device needs no media query and pads by the top inset' );
$css = sgs_container_pin_edge_css(
	$sel,
	array(
		'pinEdge' => array(
			'desktop' => 'top',
			'mobile'  => 'none',
		),
	)
);
ok( false !== strpos( $css, '(min-width:1024px),(min-width:768px) and (max-width:1023px)' ) && false === strpos( $css, '(max-width:767px)' ), 'pin: a tier set to none gets no rule' );

// ── Drawer top row extras ────────────────────────────────────────────────────
$root_sel = '.sgs-nav-drawer-x.wp-block-sgs-nav-drawer';
ok( '' === sgs_nav_drawer_chrome_extras_css( array(), $root_sel, true ), 'chrome extras: nothing set emits nothing' );
$css = sgs_nav_drawer_chrome_extras_css( array( 'chromeSticky' => true ), $root_sel, false );
ok( false !== strpos( $css, $root_sel . '[open]{overflow:hidden;}' ) && false !== strpos( $css, '> .sgs-nav-drawer__body{flex:1 1 auto;min-height:0;overflow-y:auto;' ), 'chromeSticky: the body becomes the scrolling area' );
$box = array(
	'chromeLogoBoxBg'      => '#FFFFFF',
	'chromeLogoBoxRadius'  => '14px',
	'chromeLogoBoxPadding' => array(
		'top'  => '8px',
		'left' => '10px',
	),
);
ok( '' === sgs_nav_drawer_chrome_extras_css( $box, $root_sel, false ), 'logo box: no logo, no rule' );
$css = sgs_nav_drawer_chrome_extras_css( $box, $root_sel, true );
ok( false !== strpos( $css, '.sgs-nav-drawer__chrome-logo{background-color:#FFFFFF;border-radius:14px;padding-top:8px;padding-left:10px;}' ), 'logo box: fill, radius and padding paint the logo link' );
$css = sgs_nav_drawer_chrome_extras_css(
	array(
		'closeBg'      => '#E7D768',
		'closeBgHover' => '#FFFFFF',
	),
	$root_sel,
	false
);
ok( false !== strpos( $css, '.sgs-nav-drawer__close{background-color:#E7D768}' ) && false !== strpos( $css, ':hover{background-color:#FFFFFF}' ), 'close fill: resting and hover fills' );

// ── Icons slot lift ──────────────────────────────────────────────────────────
// An inner block stand-in: a name and a render() returning fixed markup.
$inner   = static function ( string $name, string $html ) {
	return new class( $name, $html ) {
		/**
		 * Block name.
		 *
		 * @var string
		 */
		public $name;
		/**
		 * Rendered markup.
		 *
		 * @var string
		 */
		private $html;
		public function __construct( string $name, string $html ) {
			$this->name = $name;
			$this->html = $html;
		}
		public function render(): string {
			return $this->html;
		}
	};
};
$icons   = '<ul class="sgs-social-icons sgs-si-1">ICONS</ul>';
$block   = (object) array(
	'inner_blocks' => array(
		$inner( 'sgs/social-icons', $icons ),
		$inner( 'sgs/nav-drawer-menu', '<nav>MENU</nav>' ),
	),
);
$content = "\n" . $icons . "\n\n<nav>MENU</nav>";
$before  = $content;
ok( '' === sgs_nav_drawer_chrome_icons_lift( array( 'chromeSlotType' => 'heading' ), $block, $content ) && $before === $content, 'icons slot: another slot type moves nothing' );
$slot = sgs_nav_drawer_chrome_icons_lift(
	array(
		'chromeSlotType'      => 'icons',
		'chromeSlotPlacement' => 'end',
	),
	$block,
	$content
);
ok( false !== strpos( $slot, 'sgs-nav-drawer__chrome-slot--icons sgs-nav-drawer__chrome-slot--at-end">' . $icons ), 'icons slot: the leading Social Icons group moves into the top row' );
ok( false === strpos( $content, 'ICONS' ) && false !== strpos( $content, 'MENU' ), 'icons slot: the group leaves the body and the menu stays' );
$block2   = (object) array( 'inner_blocks' => array( $inner( 'sgs/nav-drawer-menu', '<nav>MENU</nav>' ) ) );
$content2 = '<nav>MENU</nav>';
ok( '' === sgs_nav_drawer_chrome_icons_lift( array( 'chromeSlotType' => 'icons' ), $block2, $content2 ) && '<nav>MENU</nav>' === $content2, 'icons slot: no leading group, nothing moves' );

// ── Drawer menu caret box ────────────────────────────────────────────────────
$uid = '.sgs-nav-drawer-menu-x';
ok( '' === sgs_nav_drawer_menu_caret_box_css( array(), $uid ), 'caret box: nothing set emits nothing' );
ok(
	'' === sgs_nav_drawer_menu_caret_box_css(
		array(
			'caretBoxBorderStyle'    => 'solid',
			'caretBoxOnTrailingIcon' => true,
		),
		$uid
	),
	'caret box: a style with no width, and the trailing switch alone, emit nothing'
);
$css = sgs_nav_drawer_menu_caret_box_css(
	array(
		'caretBoxBorderWidth'      => array(
			'top'    => '1.5px',
			'right'  => '1.5px',
			'bottom' => '1.5px',
			'left'   => '1.5px',
		),
		'caretBoxBorderColour'     => '#FFFFFF',
		'caretBoxBorderColourOpen' => '#E7D768',
		'caretBoxBgOpen'           => '#E7D768',
	),
	$uid
);
ok( false !== strpos( $css, $uid . ' .sgs-nav-drawer-menu__caret{display:inline-flex;' ) && false !== strpos( $css, 'border-radius:50%' ) && false !== strpos( $css, 'width:40px;height:40px' ), 'caret box: a 40px circle round the expander' );
ok( false !== strpos( $css, '[open] > .sgs-nav-drawer-menu__accordion-summary .sgs-nav-drawer-menu__caret{background-color:#E7D768;border-color:#E7D768;}' ), 'caret box: the open row repaints fill and ring' );
ok( false === strpos( $css, '__trailing-icon' ), 'caret box: trailing icons untouched unless switched on' );
$css = sgs_nav_drawer_menu_caret_box_css(
	array(
		'caretBoxBg'             => '#000000',
		'caretBoxOnTrailingIcon' => true,
	),
	$uid
);
ok( false !== strpos( $css, '__caret,' . $uid . ' .sgs-nav-drawer-menu__trailing-icon{' ), 'caret box: the switch draws the same circle round trailing icons' );

// ── Mega panel drawer copy ───────────────────────────────────────────────────
$panel = '.sgs-mega-panel-x.wp-block-sgs-mega-panel';
$row   = $panel . ' .sgs-mega-group > .wp-block-sgs-container';
$aside = $panel . '.sgs-mega-panel--in-drawer .sgs-mega-aside';
ok( '' === sgs_mega_panel_drawer_shell_css( array(), $panel, $row ), 'mega shell: nothing set emits nothing' );
$css = sgs_mega_panel_drawer_shell_css(
	array(
		'drawerShellRadius'  => '22px',
		'drawerShellPadding' => array( 'top' => '14px' ),
		'drawerLinkRadius'   => '14px',
		'drawerLinkHoverBg'  => '#123456',
	),
	$panel,
	$row
);
ok( false !== strpos( $css, $panel . '{border-radius:22px;padding-top:14px;}' ), 'mega shell: radius and padding on the drawer copy' );
ok( false !== strpos( $css, $row . '{border-radius:14px;}' ) && false !== strpos( $css, ':focus-within{background-color:#123456}' ), 'mega rows: radius, and the hover fill also on keyboard focus' );
ok( '' === sgs_mega_panel_drawer_card_box_decls( array() ), 'mega card box: unset emits nothing' );
ok(
	'border-radius:16px;padding:14px;' === sgs_mega_panel_drawer_card_box_decls(
		array(
			'drawerCardRadius'  => '16px',
			'drawerCardPadding' => '14px',
		)
	),
	'mega card box: radius and padding outside compact mode'
);
$css = sgs_mega_panel_drawer_stacked_css( array( 'drawerCardRadius' => '16px' ), $aside, '' );
ok( false !== strpos( $css, $aside . ' > :nth-child(2){position:absolute;inset-block-start:12px;inset-inline-start:12px;' ), 'stacked-overlay: the tag sits over the image corner' );
ok( false !== strpos( $css, ' .sgs-button{display:inline-flex;' ) && false !== strpos( $css, 'width:40px;height:40px;' ) && false !== strpos( $css, '.sgs-button__label{position:absolute;width:1px;' ), 'stacked-overlay: the link is a 40px circle whose label stays for screen readers' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );

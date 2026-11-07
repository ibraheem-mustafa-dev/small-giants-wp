<?php
/**
 * Standalone runner for the bar's keyboard-focus open (`submenuOpenOnFocus`) and the drawer's parent row action
 * (`parentRowAction`).
 *
 *   php plugins/sgs-blocks/tests/php/run-nav-focus-open-and-row-toggle-standalone.php
 *
 * Runs the shipped markup builders and asserts: with focus open off the bar's disclosure roots print no focusout
 * directive and no `openOnFocus` context member (today's markup); with it on, a dropdown and a mega root both carry
 * them; a drawer parent with a page keeps its link and a caret-only summary under `navigate`, and becomes one
 * whole-row summary (no link, label inside) under `toggle`; a disabled parent stays a plain label under `toggle`.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
$plugin = dirname( __DIR__, 2 );
require_once $plugin . '/scripts/qa/lib/wp-stubs.php';
foreach ( array( 'render-helpers', 'helpers-item-effects', 'nav-menu-markup' ) as $include ) {
	require_once $plugin . '/includes/' . $include . '.php';
}

$failures = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures ): void {
	echo ( $ok ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $ok ) {
		++$failures;
	}
};
$has = static function ( string $haystack, string $needle ): bool {
	return false !== strpos( $haystack, $needle );
};

// ── Bar: the focus-open directive and context ──────────────────────────────────────────────────────────────────
$base = array(
	'align'        => 'start',
	'caret'        => true,
	'close_grace'  => 170,
	'intent_delay' => 80,
	'open_on'      => 'hover',
	'label_roll'   => '',
);
$item = array(
	'identifier' => 'id:7',
	'url'        => 'https://example.test/about',
	'label'      => 'About',
	'has_url'    => true,
	'type'       => 'custom',
	'object_id'  => 7,
	'children'   => array(
		array(
			'identifier' => 'id:8',
			'url'        => 'https://example.test/story',
			'label'      => 'Story',
			'has_url'    => true,
			'children'   => array(),
		),
	),
);
$off = sgs_nav_bar_menu_render_items( array( $item ), array(), 'u', $base );
$on  = sgs_nav_bar_menu_render_items( array( $item ), array(), 'u', $base + array( 'open_on_focus' => true ) );
$check( $has( $off, 'sgs-nav-bar-menu__submenu-root' ), 'sanity: the dropdown root is rendered' );
$check( ! $has( $off, 'actions.focusLeave' ) && ! $has( $off, 'openOnFocus' ), 'off: no focusout directive and no openOnFocus context member' );
$check( ! $has( sgs_nav_bar_menu_render_items( array( $item ), array(), 'u', $base + array( 'open_on_focus' => false ) ), 'actions.focusLeave' ), 'off (explicit false): still no directive' );
$check( $has( $on, 'data-wp-on--focusout="actions.focusLeave"' ) && $has( $on, 'openOnFocus' ), 'on: the dropdown root carries the focusout directive and the context member' );
$check( $has( $on, 'actions.warmPanels' ), 'on: the root keeps its existing focusin directive (the open path)' );
$check( 1 === substr_count( $on, 'actions.focusLeave' ), 'on: exactly one directive per disclosure root' );
$check( array() === sgs_nav_bar_menu_focus_open_context( $base ) && '' === sgs_nav_bar_menu_focus_open_attrs( $base ), 'helpers: an unset flag yields nothing' );

// ── Drawer: parentRowAction ────────────────────────────────────────────────────────────────────────────────────
$options = sgs_nav_drawer_menu_row_options( array() );
$check( false === $options['parent_row_toggle'], 'drawer options: default is navigate' );
$check( false === sgs_nav_drawer_menu_row_options( array( 'parentRowAction' => 'bogus' ) )['parent_row_toggle'], 'drawer options: an unknown value is navigate' );
$check( true === sgs_nav_drawer_menu_row_options( array( 'parentRowAction' => 'toggle' ) )['parent_row_toggle'], 'drawer options: toggle is recognised' );

$li      = 'sgs-nav-drawer-menu__item';
$nav     = sgs_nav_drawer_menu_accordion_html( $item, $li, 'd', true, '<li>x</li>', $options );
$tog_opt = sgs_nav_drawer_menu_row_options( array( 'parentRowAction' => 'toggle' ) );
$tog     = sgs_nav_drawer_menu_accordion_html( $item, $li, 'd', true, '<li>x</li>', $tog_opt );
$check( $has( $nav, '<a class="sgs-nav-drawer-menu__link" href="https://example.test/about"' ), 'navigate: the parent label is a link to its page' );
$check( $has( $nav, 'aria-label="Show submenu for About"' ) && ! $has( $nav, 'accordion-summary--row' ), 'navigate: a caret-only summary toggles the section' );
$check( ! $has( $tog, '<a class="sgs-nav-drawer-menu__link"' ) && ! $has( $tog, 'href="https://example.test/about"' ), 'toggle: no link to the parent page is printed' );
$check( $has( $tog, 'sgs-nav-drawer-menu__accordion-summary--row' ) && $has( $tog, '>About' ), 'toggle: the label sits inside the whole-row summary' );
$check( $has( $tog, '<summary class="sgs-nav-drawer-menu__accordion-summary sgs-focus--inset sgs-nav-drawer-menu__link' ), 'toggle: the summary carries the link class so the row looks the same' );

$no_page = $item;
$no_page['has_url'] = false;
$check( sgs_nav_drawer_menu_accordion_html( $no_page, $li, 'd', true, '<li>x</li>', $options ) === sgs_nav_drawer_menu_accordion_html( $no_page, $li, 'd', true, '<li>x</li>', $tog_opt ), 'a parent with no page of its own prints the same under both actions' );

$disabled_opt = $tog_opt;
$disabled_opt['disabled_ids'] = array( 'id:7' );
$dis = sgs_nav_drawer_menu_accordion_html( $item, $li, 'd', true, '<li>x</li>', $disabled_opt );
$check( $has( $dis, 'aria-disabled="true"' ) && ! $has( $dis, 'accordion-summary--row' ), 'toggle: a disabled parent stays a plain label' );

echo $failures ? "\n$failures FAILED\n" : "\nall passed\n";
exit( $failures ? 1 : 0 );

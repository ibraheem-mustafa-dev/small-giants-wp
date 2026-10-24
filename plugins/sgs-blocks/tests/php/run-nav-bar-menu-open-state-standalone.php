<?php
/**
 * Standalone runner for the sgs/nav-bar-menu Open state (`itemBgOpen`, `itemColourOpen`).
 *
 *   php plugins/sgs-blocks/tests/php/run-nav-bar-menu-open-state-standalone.php
 *
 * Runs the shipped `sgs_nav_shared_item_state_css()` (includes/nav-menu-css.php) and asserts: the item's open look is
 * keyed on the root that wraps the trigger and its panel, `:has( > [data-sgs-mega-trigger][aria-expanded="true"] )`,
 * so a button trigger, a link-as-trigger and a link beside a separate chevron trigger all take it and a leaf item
 * (no panel, so no such root) never does; the background paints on the item's `::before` layer with its alpha kept, a
 * palette slug resolves to its token and a custom colour passes through; the text colour paints on the link; neither
 * attribute set prints no open rule; and the markup the selector is keyed on is what the block prints.
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
foreach ( array( 'render-helpers', 'helpers-typography', 'helpers-colour-wcag', 'nav-menu-treatments', 'sweep-css', 'nav-menu-css', 'nav-menu-item-border-featured-css', 'nav-menu-item-transition-css', 'nav-menu-item-hover-scope-css', 'nav-menu-item-padding-css', 'nav-menu-caret-css' ) as $include ) {
	require_once $plugin . '/includes/' . $include . '.php';
}

// Defined in each menu block's render.php (not loadable here); it builds the typography hover rule, which this test does
// not assert on.
if ( ! function_exists( 'sgs_nav_shared_typography_hover_rule' ) ) {
	function sgs_nav_shared_typography_hover_rule( ...$args ) {
		return '';
	}
}

$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};
$has = static function ( string $haystack, string $needle ): bool {
	return false !== strpos( $haystack, $needle );
};

$open_root = '.u :is(.sgs-nav-bar-menu__submenu-root, .sgs-nav-bar-menu__mega):has(> [data-sgs-mega-trigger][aria-expanded="true"]) > .sgs-nav-bar-menu__link';

$css = sgs_nav_shared_item_state_css( array( 'itemBgOpen' => 'rgba(10,126,168,.12)', 'itemColourOpen' => '#0a7ea8' ), '.u', 'sgs-nav-bar-menu' );
$check( $has( $css, $open_root . '::before{background-color:#0A7EA81F;}' ), '1. the open background paints on the item\'s ::before layer with its alpha kept (#0A7EA81F, the colour helper\'s hex form of rgba(10,126,168,.12)): ' . $css );
$check( $has( $css, $open_root . '{color:#0a7ea8;}' ), '1. the open text colour paints on the link' );
$check( $has( $css, '.u .sgs-nav-bar-menu__link{position:relative;isolation:isolate;}' ), '1. an open fill alone still sets up the ::before layer (stacking context)' );
$check( ! $has( $css, '.sgs-nav-bar-menu__item:not(' ) && ! $has( $css, '.sgs-nav-bar-menu__link[aria-expanded' ), '1. the selector is the wrapper root, never the bare link, so a leaf item (no root) stays plain' );

$slug = sgs_nav_shared_item_state_css( array( 'itemBgOpen' => 'primary', 'itemColourOpen' => 'surface' ), '.u', 'sgs-nav-bar-menu' );
$check( $has( $slug, $open_root . '::before{background-color:var(--wp--preset--color--primary, currentColor);}' ) && $has( $slug, $open_root . '{color:var(--wp--preset--color--surface, currentColor);}' ), '2. palette slugs resolve to their tokens: ' . $slug );

$none = sgs_nav_shared_item_state_css( array(), '.u', 'sgs-nav-bar-menu' );
$check( ! $has( $none, 'aria-expanded="true"]) > .sgs-nav-bar-menu__link' ), '3. neither attribute set prints no open rule' );
$text_only = sgs_nav_shared_item_state_css( array( 'itemColourOpen' => '#0a7ea8' ), '.u', 'sgs-nav-bar-menu' );
$check( $has( $text_only, $open_root . '{color:#0a7ea8;}' ) && ! $has( $text_only, $open_root . '::before' ), '3. text colour alone prints no background rule' );

// The markup the selector keys on.
$markup = (string) file_get_contents( $plugin . '/includes/nav-menu-markup.php' );
$check( 3 <= substr_count( $markup, 'data-sgs-mega-trigger aria-expanded="false"' ) + substr_count( $markup, 'data-sgs-mega-trigger aria-expanded' ), '4. every panel trigger the block prints carries data-sgs-mega-trigger and aria-expanded' );
$check( $has( $markup, 'class="sgs-nav-bar-menu__submenu-root"' ) && $has( $markup, "'sgs-nav-bar-menu__mega'" ), '4. the dropdown root and the mega root are the wrappers the selector names' );

echo $failures ? "\n$failures of $checks checks FAILED\n" : "OK: all $checks checks passed\n";
exit( $failures ? 1 : 0 );

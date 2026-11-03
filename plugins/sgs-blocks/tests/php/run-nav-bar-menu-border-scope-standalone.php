<?php
/**
 * Standalone runner for sgs/nav-bar-menu `itemBorderScope`.
 *
 *   php plugins/sgs-blocks/tests/php/run-nav-bar-menu-border-scope-standalone.php
 *
 * Runs the shipped `sgs_nav_shared_item_state_css()` and asserts: with the attribute unset (or 'item') the underline is the
 * link's own border; with 'label' the link paints no border width or style, a flat label-wide band is drawn on the link's
 * `::after` at the link's bottom edge reading the link's border colour, the Sweep band takes the same geometry, and the
 * drawer menu's output (no such attribute) is the same as before.
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

$base = array(
	'itemBorderWidth'         => array( 'bottom' => '2px' ),
	'itemBorderStyle'         => 'solid',
	'itemBorderColour'        => 'transparent',
	'itemBorderColourCurrent' => '#D8CA50',
);
$link = '.u .sgs-nav-bar-menu__link';

// Negative control: unset and 'item' print the link's own border, and no band.
$unset = sgs_nav_shared_item_state_css( $base, '.u', 'sgs-nav-bar-menu' );
$item  = sgs_nav_shared_item_state_css( $base + array( 'itemBorderScope' => 'item' ), '.u', 'sgs-nav-bar-menu' );
$check( $has( $unset, $link . '{border-width:0 0 2px 0;border-style:solid;}' ) || $has( $unset, $link . '{border-width:' ), '1. unset: the link carries its own border width and style: ' . $unset );
$check( ! $has( $unset, 'border-bottom-color:inherit' ), '1. unset: no label band' );
$check( $unset === $item, '2. an explicit \'item\' prints exactly what unset prints' );

// Positive: label.
$label = sgs_nav_shared_item_state_css( $base + array( 'itemBorderScope' => 'label' ), '.u', 'sgs-nav-bar-menu' );
$check( ! $has( $label, 'border-width:' ) && ! $has( $label, 'border-style:' ), '3. label: the link paints no border width or style: ' . $label );
$check( $has( $label, $link . '::after{content:"";position:absolute;bottom:0;inset-inline-start:var(--sgs-nav-link-pad-start,12px);inset-inline-end:var(--sgs-nav-link-pad-end,12px);border-bottom:2px solid currentColor;border-bottom-color:inherit;pointer-events:none;}' ), '3. label: a flat band at the link bottom, between the inline paddings, reading the link\'s border colour' );
$check( $has( $label, $link . '{position:relative;}' ), '3. label: the link is the band\'s containing block' );
$check( $has( $label, $link . ':has(+ .sgs-nav-bar-menu__subtoggle)::after{inset-inline-end:0;}' ), '3. label: a split item\'s band ends at the label (its end padding sits on the toggle)' );
$check( $has( $label, '#D8CA50' ) && $has( $label, 'border-color:#D8CA50' ), '3. label: the current colour still rides the link\'s border-color the band inherits' );
$check( ! $has( $label, 'border-radius' ), '3. label: no radius reaches the band' );

// No bottom width: nothing painted.
$none = sgs_nav_shared_item_state_css( array( 'itemBorderScope' => 'label', 'itemBorderColour' => '#fff' ), '.u', 'sgs-nav-bar-menu' );
$check( ! $has( $none, 'border-bottom:' ), '4. label with no width prints no band' );

// Sweep takes the label geometry.
$sweep_attrs = $base + array( 'itemBorderColourHover' => '#D8CA50' );
$sweep_t     = array( 'itemBorderHoverTreatment' => 'sweep' );
$sweep_item  = sgs_nav_shared_item_state_css( $sweep_attrs, '.u', 'sgs-nav-bar-menu', $sweep_t );
$sweep_label = sgs_nav_shared_item_state_css( $sweep_attrs + array( 'itemBorderScope' => 'label' ), '.u', 'sgs-nav-bar-menu', $sweep_t );
$check( $has( $sweep_item, 'inset-inline:0;bottom:calc(-1 * 2px);height:2px;' ), '5. sweep unset: the band keeps its item-wide geometry' );
$check( $has( $sweep_label, $link . '::after{content:"";position:absolute;bottom:0;inset-inline-start:var(--sgs-nav-link-pad-start,12px);inset-inline-end:var(--sgs-nav-link-pad-end,12px);height:2px;' ), '5. sweep label: the band spans the label at the link bottom: ' . $sweep_label );

// Drawer: no attribute, so the output never changes.
$drawer = sgs_nav_shared_item_state_css( $base, '.u', 'sgs-nav-drawer-menu' );
$check( ! $has( $drawer, 'border-bottom-color:inherit' ) && $has( $drawer, '.u .sgs-nav-drawer-menu__link{border-width:' ), '6. drawer: the row border is the link\'s own' );

if ( $failures ) {
	echo "\n$failures of $checks checks FAILED.\n";
	exit( 1 );
}
echo "All $checks checks passed.\n";

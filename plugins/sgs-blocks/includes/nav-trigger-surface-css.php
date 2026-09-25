<?php
/**
 * The sgs/nav-bar-menu "Whole row opens the menu" setting (`triggerSurface`,
 * Wave 3C U-14, family M-39, DEC-14 as amended).
 *
 * At an ON tier, below the collapse point (the only place the burger shows,
 * so the bar and its panels are not in play), the burger's `::after`
 * stretches over its `.sgs-site-header-row`: lamalama's `inset-0` overlay.
 * Being part of the button, a click on it IS a click on the button — the same
 * toggle, focus return, `aria-expanded` and 44px floor, with no JS.
 *
 * The row is the containing block; every positioned box between the row and
 * the button is made static, and a magnet's transform (which would make the
 * button itself the containing block) moves to the button's children, whose
 * custom properties the magnet runtime already writes. Other blocks in the row
 * are lifted above the overlay, so they keep their own clicks.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/sgs-header-pass-through.php';

if ( ! function_exists( 'sgs_nav_bar_menu_trigger_surface_css' ) ) {
	/**
	 * The surface-trigger rules at the tiers where `triggerSurface` is on.
	 *
	 * @param array  $attributes     Block attributes.
	 * @param string $uid_sel        The menu's uid selector, e.g. `.sgs-nav-bar-menu-1a2b3c4d`.
	 * @param int    $collapse_point The menu's resolved collapse point.
	 * @return string CSS.
	 */
	function sgs_nav_bar_menu_trigger_surface_css( array $attributes, string $uid_sel, int $collapse_point ): string {
		$tiers = sgs_resolve_on_tiers( $attributes['triggerSurface'] ?? array(), 'on', 'off' );
		if ( empty( $tiers ) ) {
			return '';
		}
		$row    = '.sgs-site-header-row:has(' . $uid_sel . ')';
		$burger = $uid_sel . ' .sgs-nav-bar-menu__burger';
		$magnet = $burger . '[data-sgs-fx="magnet"]';
		// Direct children of the row or of an inner band, other than the menu,
		// another band, or a wrapper that holds the menu.
		$others = $row . ' :is(.sgs-site-header-row,.sgs-container__inner)>:not(.sgs-nav-bar-menu,.sgs-container__inner,:has(' . $uid_sel . '))';

		$rules  = $row . '{position:relative;}';
		$rules .= $row . ' :has(' . $uid_sel . '),' . $uid_sel . ',' . $uid_sel . ' .sgs-nav-bar-menu__toggle-wrap,' . $burger . '{position:static;}';
		$rules .= $burger . '::after{content:"";position:absolute;inset:0;cursor:pointer;}';
		$rules .= $magnet . '{transform:none;will-change:auto;}';
		$rules .= $magnet . '>.sgs-nav-bar-menu__burger-icon,' . $magnet . '>.sgs-nav-bar-menu__burger-text{transform:translate(var(--magnet-x,0px),var(--magnet-y,0px));transition:var(--sgs-magnet-transition);}';
		$rules .= ':where(' . $others . '){position:relative;}' . $others . '{z-index:1;}';

		return sgs_tier_exact_media_css( $tiers, $rules, '(max-width:' . ( max( 1, $collapse_point ) - 1 ) . 'px)' );
	}
}

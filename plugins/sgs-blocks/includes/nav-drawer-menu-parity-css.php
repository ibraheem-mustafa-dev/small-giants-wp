<?php
/**
 * `sgs/nav-drawer-menu` — CSS for the 2026-09-28 additions: G-11's open-state
 * item colour, and parity with `sgs/nav-bar-menu`'s badge/disabled colours
 * and the new per-item trailing icon (G-7).
 *
 * `require_once`'d by `nav-drawer-menu-extras-css.php`; every function is
 * `function_exists`-guarded.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_drawer_menu_parity_css' ) ) {
	/**
	 * The open-state, badge, disabled and trailing-icon CSS fragment.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $scope      The instance scope selector.
	 * @param string $link       `{$scope} .sgs-nav-drawer-menu__link` (unused —
	 *                           kept for signature parity with this file's
	 *                           sibling emitters).
	 * @return string CSS.
	 */
	function sgs_nav_drawer_menu_parity_css( array $attributes, string $scope, string $link ): string {
		unset( $link );
		$css = '';

		// G-11 — the label colour of a top-level accordion item while its own
		// <details> is open. Two selector shapes: the has_url case (the label
		// is a sibling <a>/<span> of the <details>) and the whole-row-toggle
		// case (I-D9 — the label lives INSIDE the <summary> itself).
		$open_colour = trim( (string) ( $attributes['itemColourOpen'] ?? '' ) );
		if ( '' !== $open_colour ) {
			$decl = 'color:' . sgs_colour_value( $open_colour ) . ';';
			$css .= $scope . ' .sgs-nav-drawer-menu__accordion-row:has(> .sgs-nav-drawer-menu__accordion[open]) > .sgs-nav-drawer-menu__link{' . $decl . '}';
			$css .= $scope . ' .sgs-nav-drawer-menu__accordion[open] > .sgs-nav-drawer-menu__accordion-summary--row{' . $decl . '}';
		}

		// Parity — badge colour (block-level; copy is per-item).
		$badge_bg   = sgs_background_paint_decl( (string) ( $attributes['itemBadgeColour'] ?? 'accent-light' ), '' );
		$badge_text = sgs_text_colour_decl( (string) ( $attributes['itemBadgeTextColour'] ?? 'accent-text' ) );
		$badge_css  = ( '' !== $badge_bg ? $badge_bg . ';' : '' ) . ( '' !== $badge_text ? $badge_text . ';' : '' );
		if ( '' !== $badge_css ) {
			$css .= $scope . ' .sgs-nav-drawer-menu__badge{' . $badge_css . '}';
		}
		if ( function_exists( 'sgs_nav_item_badge_css' ) ) {
			$css .= sgs_nav_item_badge_css( $scope . ' .sgs-nav-drawer-menu__badge', $attributes );
		}

		// Parity — disabled item/sublink text colour.
		$disabled_decl = sgs_text_colour_decl( (string) ( $attributes['itemDisabledColour'] ?? 'text-muted' ) );
		if ( '' !== $disabled_decl ) {
			$css .= $scope . ' .sgs-nav-drawer-menu__link[aria-disabled="true"],' . $scope . ' .sgs-nav-drawer-menu__sublink[aria-disabled="true"]{' . $disabled_decl . ';}';
		}

		// G-7 — trailing icon colour (block-level) + size (per tier).
		$trail_colour = trim( (string) ( $attributes['itemTrailingIconColour'] ?? '' ) );
		if ( '' !== $trail_colour ) {
			$css .= $scope . ' .sgs-nav-drawer-menu__trailing-icon{color:' . sgs_colour_value( $trail_colour ) . ';}';
		}
		$trail_size = $attributes['itemTrailingIconSize'] ?? array();
		if ( is_array( $trail_size ) && array() !== $trail_size ) {
			$css .= sgs_emit_responsive_css(
				$scope,
				array(
					array(
						'value'     => $trail_size,
						'css'       => '--sgs-ndm-trail-size',
						'transform' => 'sgs_css_single_length_value',
					),
				)
			);
		}

		return $css;
	}
}

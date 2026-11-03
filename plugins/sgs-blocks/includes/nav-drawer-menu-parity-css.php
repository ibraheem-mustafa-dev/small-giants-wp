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

require_once __DIR__ . '/helpers-tiered-border.php';

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

		// Badge tones: an item set to tone A or B (itemBadgeTones) carries a modifier class; its colours paint that class
		// only, after the block-level rule so they win at equal specificity.
		foreach ( array( 'A', 'B' ) as $tone ) {
			$tone_bg   = sgs_background_paint_decl( (string) ( $attributes[ 'badgeColour' . $tone ] ?? '' ), '' );
			$tone_text = sgs_text_colour_decl( (string) ( $attributes[ 'badgeTextColour' . $tone ] ?? '' ) );
			$tone_css  = ( '' !== $tone_bg ? $tone_bg . ';' : '' ) . ( '' !== $tone_text ? $tone_text . ';' : '' );
			if ( '' !== $tone_css ) {
				$css .= $scope . ' .sgs-nav-drawer-menu__badge--tone-' . strtolower( $tone ) . '{' . $tone_css . '}';
			}
		}

		// Badge border per device, and an opacity over the stylesheet's 0.65 (an empty value keeps that default).
		$css .= sgs_emit_responsive_css( $scope . ' .sgs-nav-drawer-menu__badge', sgs_tiered_border_specs( $attributes['badgeBorder'] ?? array() ) );
		$badge_opacity = trim( (string) ( $attributes['itemBadgeOpacity'] ?? '' ) );
		if ( '' !== $badge_opacity && is_numeric( $badge_opacity ) ) {
			$css .= $scope . ' .sgs-nav-drawer-menu__badge{opacity:' . round( min( 1.0, max( 0.0, (float) $badge_opacity ) ), 2 ) . ';}';
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

		$css .= sgs_nav_drawer_menu_trailing_position_css( $attributes, $scope );
		$css .= sgs_nav_drawer_menu_expander_height_css( $attributes, $scope );

		return $css;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_trailing_position_css' ) ) {
	/**
	 * `itemTrailingIconPosition` 'row-end': a leaf row's trailing icon moves to
	 * the inline end of the row, centred on the line the accordion expander
	 * uses. The expander is a `--sgs-ndm-caret-tap-min` (44px) wide box with its
	 * glyph centred; a client circle size sets that floor to 0 and the circle
	 * itself is the box. The icon's own width is `--sgs-ndm-trail-w` (the
	 * trailing circle, when drawn) or 1em, so its end margin is half the
	 * difference, never negative. Accordion-parent rows (the `--has-submenu`
	 * list items) are untouched: their link already reserves the expander gutter.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $scope      The instance scope selector.
	 * @return string CSS; '' unless the position is 'row-end'.
	 */
	function sgs_nav_drawer_menu_trailing_position_css( array $attributes, string $scope ): string {
		if ( 'row-end' !== (string) ( $attributes['itemTrailingIconPosition'] ?? '' ) ) {
			return '';
		}
		$css = '';
		$size = is_array( $attributes['caretBoxSize'] ?? null ) ? $attributes['caretBoxSize'] : array();
		$ring = array() !== $size;
		foreach ( array( 'caretBoxBg', 'caretBoxBgGradient', 'caretBoxBorderColour', 'caretBoxBorderWidth' ) as $key ) {
			$ring = $ring || ! empty( $attributes[ $key ] );
		}
		if ( ! empty( $attributes['caretBoxOnTrailingIcon'] ) && $ring ) {
			// The trailing circle's width follows the caret circle size (40px default), per tier.
			$css .= $scope . '{--sgs-ndm-trail-w:40px;}';
			$css .= sgs_emit_responsive_css(
				$scope,
				array(
					array(
						'value'        => $size,
						'css'          => '--sgs-ndm-trail-w',
						'unit_default' => 'px',
					),
				)
			);
		}
		$icon = $scope . ' .sgs-nav-drawer-menu__trailing-icon';
		$css .= $scope . ' .sgs-nav-drawer-menu__item--drawer:not(.sgs-nav-drawer-menu__item--has-submenu) > .sgs-nav-drawer-menu__link:has(> .sgs-nav-drawer-menu__trailing-icon){padding-inline-end:0;}';
		$css .= $icon . '{margin-inline-start:auto;}';
		$css .= $scope . ' .sgs-nav-drawer-menu__item--drawer:not(.sgs-nav-drawer-menu__item--has-submenu) > .sgs-nav-drawer-menu__link > .sgs-nav-drawer-menu__trailing-icon{margin-inline-end:max(0px,calc((var(--sgs-ndm-caret-tap-min,44px) - var(--sgs-ndm-trail-w,1em)) / 2));}';
		return $css;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_expander_height_css' ) ) {
	/**
	 * The accordion expander is overlaid on its row from the top. With
	 * `itemMinHeight` set the row is taller than the expander's 44px floor, so
	 * the expander takes the link's height per tier and its centred glyph (or
	 * circle) sits level with the link, not at the row top. The submenu opens
	 * below the link, so the expander stays level with the link. The whole-row
	 * toggle (no URL) is the row itself and is left alone. Unset: no rule.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $scope      The instance scope selector.
	 * @return string CSS; '' when itemMinHeight is unset.
	 */
	function sgs_nav_drawer_menu_expander_height_css( array $attributes, string $scope ): string {
		$min_height = $attributes['itemMinHeight'] ?? null;
		if ( ! is_array( $min_height ) || array() === $min_height ) {
			return '';
		}
		return sgs_emit_responsive_css(
			$scope . ' .sgs-nav-drawer-menu__accordion-summary:not(.sgs-nav-drawer-menu__accordion-summary--row)',
			array(
				array(
					'value'        => $min_height,
					'css'          => 'height',
					'unit_default' => 'px',
				),
			)
		);
	}
}

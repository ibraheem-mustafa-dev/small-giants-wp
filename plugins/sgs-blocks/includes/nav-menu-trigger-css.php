<?php
/**
 * SGS Nav Menu (sgs/nav-menu) — the MENU BUTTON's scoped CSS.
 *
 * Split out of `nav-menu-submenu-css.php` (Spec 41 step 15). It is its own
 * module because it is its own element with its own inspector panel ("Menu
 * Button", §9.3): icon/text colour with its glyph-Sweep treatment, the resting
 * and hover background, and the size rule that must stop being a fixed square
 * the moment the button carries a word.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, matching its sibling CSS modules.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_menu_trigger_css' ) ) {
	/**
	 * Build the menu-button half of nav-menu's scoped <style>.
	 *
	 * @param array  $attributes   Block attributes.
	 * @param string $uid_sel      This instance's CSS scope selector (`.{uid}`).
	 * @param array  $treatments   RESOLVED hover treatments — ⛔ never the stored attribute.
	 * @param string $trigger_mode Resolved `triggerMode` (icon|text|icon-and-text).
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_menu_trigger_css( array $attributes, string $uid_sel, array $treatments = array(), string $trigger_mode = 'icon' ): string {
		$css         = '';
		$burger_sel  = $uid_sel . ' .sgs-nav-menu__burger';
		$t_burger    = (string) ( $treatments['burgerColourHoverTreatment'] ?? 'swap' );
		$t_burger_bg = (string) ( $treatments['burgerBgHoverTreatment'] ?? 'swap' );

		// 4e. Burger colour / resting background / hover / size.
		// D956 — burgerColourGradient is the gradient sibling (778879732 rollout,
		// Phase 3); gradient wins when set+valid.
		$burger_colour           = isset( $attributes['burgerColour'] ) ? (string) $attributes['burgerColour'] : '';
		$burger_colour_gradient  = isset( $attributes['burgerColourGradient'] ) ? (string) $attributes['burgerColourGradient'] : '';
		$burger_colour_effective = sgs_resolve_text_colour_or_gradient( $burger_colour, $burger_colour_gradient );
		/*
		 * Menu-button icon/text colour. Its Sweep (FR-41-23/26) is the SAME glyph
		 * sweep the item and sublink rows use — eligibility-gated on three
		 * declared conditions (no own background in EITHER state, no icon
		 * gradient, and `triggerMode !== 'icon'` because a pure-icon SVG has no
		 * glyphs for `background-clip:text` to grip). `render.php` has already
		 * applied that predicate; this reads the RESOLVED value only.
		 */
		$burger_colour_hover = (string) ( $attributes['burgerColourHover'] ?? '' );
		$burger_sweep        = array(
			'base'  => '',
			'hover' => '',
		);
		if ( 'sweep' === $t_burger && '' !== $burger_colour_hover ) {
			$burger_sweep = sgs_nav_menu_text_sweep_css(
				$burger_sel,
				'' !== $burger_colour ? sgs_colour_value( $burger_colour ) : '',
				sgs_colour_value( $burger_colour_hover )
			);
		}

		if ( '' !== $burger_sweep['base'] ) {
			$css .= $burger_sweep['base'];
		} elseif ( '' !== $burger_colour_effective ) {
			$burger_colour_decl = sgs_text_colour_decl( $burger_colour_effective );
			if ( '' !== $burger_colour_decl ) {
				$css .= $burger_sel . '{' . $burger_colour_decl . ';}';
			}
			$css .= sgs_text_colour_gradient_fallback_rule( $burger_sel, $burger_colour_effective );
		}

		if ( '' !== $burger_sweep['hover'] ) {
			$css .= $burger_sweep['hover'];
		} elseif ( 'none' !== $t_burger && '' !== $burger_colour_hover ) {
			$css .= sgs_hover_state_rules( $burger_sel, 'color:' . sgs_colour_value( $burger_colour_hover ), ':focus-visible' );
		}

		/*
		 * RESTING background — the base for burgerHoverColour's hover state (Spec 35
		 * FR-35-5 STATE_WITHOUT_BASE). Before this, the burger's hover background had
		 * no resting counterpart: a client could style the hover fill but never the
		 * button's own resting fill. style.css's `background:none` stays the
		 * byte-identical default when this is left unset.
		 */
		$burger_bg          = isset( $attributes['burgerBg'] ) ? (string) $attributes['burgerBg'] : '';
		$burger_bg_gradient = sgs_css_gradient_value( $attributes['burgerBgGradient'] ?? '' );
		if ( '' !== $burger_bg ) {
			$css .= $uid_sel . ' .sgs-nav-menu__burger{' . sgs_background_paint_decl( $burger_bg, $burger_bg_gradient ) . ';}';
		}
		// `burgerBgHoverTreatment` is a TWO-option row (none|swap): a single button
		// is neither a repeated item row for the shared pill to slide between nor a
		// text baseline for a sweep band, so there is no third option to honour.
		$burger_hover_slug = isset( $attributes['burgerHoverColour'] ) ? (string) $attributes['burgerHoverColour'] : '';
		if ( '' !== $burger_hover_slug && 'none' !== $t_burger_bg ) {
			$css .= sgs_hover_state_rules( $burger_sel, 'background-color:' . sgs_colour_value( $burger_hover_slug ), ':focus-visible' );
		}

		/*
		 * ⚠ The button cannot stay a fixed square once it carries a word
		 * (FR-41-12). Under `text` / `icon-and-text` the fixed `width` becomes
		 * `min-width` + `width:auto`; `height` and `min-height` are KEPT so the
		 * 44px touch-target floor survives. Under `icon` the rule is unchanged.
		 */
		$burger_size = sgs_css_length_value( $attributes['burgerSize'] ?? '44px' );
		if ( '' !== $burger_size ) {
			$css .= $burger_sel . '{'
				. ( 'icon' === $trigger_mode ? 'width:' . $burger_size . ';' : 'width:auto;' )
				. 'height:' . $burger_size . ';min-width:' . $burger_size . ';min-height:' . $burger_size . ';}';
		}

		/*
		 * Menu-button LABEL typography (Spec 41 Wave 2 J1). Scoped to the TEXT SPAN
		 * (`.sgs-nav-menu__burger-text`), never the button itself ($burger_sel), so
		 * `icon-and-text` mode never accidentally resizes the icon SVG. Both the
		 * font-family AND font-size inherit-when-blank escape hatches are opted in:
		 * the burger label renders as a UA `<button>` (UA defaults ~13.3px/Arial),
		 * not a heading tag governed by theme.json's own presets, so an unset value
		 * must actively contest the UA default rather than stay silent.
		 */
		$burger_text_sel = $uid_sel . ' .sgs-nav-menu__burger-text';
		$css            .= sgs_typography_css_rule( $attributes, 'burger', $burger_text_sel, '', true, true );

		return $css;
	}
}

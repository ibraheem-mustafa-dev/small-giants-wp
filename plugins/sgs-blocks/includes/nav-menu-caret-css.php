<?php
/**
 * SGS Nav Bar Menu — dropdown/mega caret glyph controls (U-18 gap I-B6).
 *
 * `submenuCaret` (existing) is a pure boolean show/hide. This file adds the
 * caret's own SIZE, resting/hover OPACITY, the GAP between it and the item
 * label, and the timing of its 180-degree open turn.
 *
 * The turn itself is emitted elsewhere (nav-menu-submenu-css.php:
 * `[aria-expanded="true"] .{bem}__caret{transform:rotate(180deg)}`) with no
 * transition of its own — this file ADDS the `transition` declaration
 * alongside it on the same `.{bem}__caret` selector; it never touches that
 * existing rule.
 *
 * Both nav blocks call it. `sgs/nav-bar-menu` uses the defaults below;
 * `sgs/nav-drawer-menu` styles its accordion expander (`.sgs-nav-drawer-menu__caret`)
 * with the same attributes and passes `$selectors` to say which elements carry
 * the label gap and the hover/focus state, because a drawer row has no
 * `__submenu-root` and its label is not always a sibling of the caret.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_menu_caret_css' ) ) {
	/**
	 * Build the caret's size/opacity/gap/turn-timing CSS fragment.
	 *
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @param string $bem_root   `sgs-nav-bar-menu` or `sgs-nav-drawer-menu`.
	 * @param array  $attributes Block attributes (verbatim render.php param).
	 * @param array  $selectors  Optional per-block selector overrides. Keys, all optional:
	 *                           `gap` (the element that takes `submenuCaretGap`; default
	 *                           `.{uid} .{bem}__link`), `hover_mouse` (rule selector list for the
	 *                           caret while its row is hovered; default the bar's
	 *                           `__submenu-root:hover` caret) and `hover_keyboard` (the same for
	 *                           keyboard focus). Omitted keys keep the bar's selectors, so a
	 *                           caller that passes nothing emits exactly what it always did.
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_menu_caret_css( string $uid_sel, string $bem_root, array $attributes, array $selectors = array() ): string {
		$css           = '';
		$caret_sel     = $uid_sel . ' .' . $bem_root . '__caret';
		$caret_svg_sel = $caret_sel . ' svg';

		// Size — overrides the `1em` default (nav-menu-submenu-link-css.php)
		// with an explicit length.
		$size = sgs_css_single_length_value( $attributes['submenuCaretSize'] ?? '' );
		if ( '' !== $size ) {
			$css .= $caret_svg_sel . '{width:' . $size . ';height:' . $size . ';}';
		}

		// Gap from the label — on `.{bem}__link`, which the caret's label
		// span is a flex sibling of (also covers the mega trigger, which
		// shares the same `__link` class).
		$gap = sgs_css_single_length_value( $attributes['submenuCaretGap'] ?? '' );
		if ( '' !== $gap ) {
			$gap_sel = (string) ( $selectors['gap'] ?? $uid_sel . ' .' . $bem_root . '__link' );
			$css    .= $gap_sel . '{gap:' . $gap . ';}';
		}

		// Resting opacity — independent of the item's own itemOpacity.
		$opacity = $attributes['submenuCaretOpacity'] ?? null;
		if ( is_numeric( $opacity ) ) {
			$css .= $caret_sel . '{opacity:' . max( 0, min( 1, (float) $opacity ) ) . ';}';
		}

		// Hover/keyboard-focus opacity — keyed on the SAME submenu-root
		// hover/has-focus condition nav-menu-css.php's own caret colour
		// pairing already uses ($bar_mouse_caret_sel / $bar_keyboard_caret_sel),
		// so the caret's opacity and colour brighten/dim together.
		$opacity_hover = $attributes['submenuCaretOpacityHover'] ?? null;
		if ( is_numeric( $opacity_hover ) ) {
			$decl               = 'opacity:' . max( 0, min( 1, (float) $opacity_hover ) ) . ';';
			$submenu_root_sel   = $uid_sel . ' .' . $bem_root . '__submenu-root';
			$mouse_caret_sel    = (string) ( $selectors['hover_mouse'] ?? $submenu_root_sel . ':hover .' . $bem_root . '__caret' );
			$keyboard_caret_sel = (string) ( $selectors['hover_keyboard'] ?? $submenu_root_sel . ':is( :has( ul.' . $bem_root . '__submenu :focus-visible ), [data-sgs-nav-has-focus] ) .' . $bem_root . '__caret' );
			$css               .= sgs_hover_guarded_rule( $mouse_caret_sel, $decl );
			$css               .= $keyboard_caret_sel . '{' . $decl . '}';
		}

		// Turn timing — gated on EITHER control being set; unset keeps
		// today's instant (untransitioned) 180-degree turn.
		$turn_duration_raw = $attributes['submenuCaretTurnDuration'] ?? null;
		$turn_easing_key   = (string) ( $attributes['submenuCaretTurnEasing'] ?? '' );
		if ( is_numeric( $turn_duration_raw ) || '' !== $turn_easing_key ) {
			$turn_ms     = sgs_motion_ms( $turn_duration_raw, 300 );
			$turn_easing = sgs_motion_easing_css(
				$turn_easing_key,
				(string) ( $attributes['submenuCaretTurnEasingCustom'] ?? '' ),
				'ease'
			);
			$css        .= $caret_sel . '{transition:transform ' . $turn_ms . 'ms ' . $turn_easing . ';}';
			$css        .= '@media (prefers-reduced-motion: reduce){' . $caret_sel . '{transition:none;}}';
		}

		return $css;
	}
}

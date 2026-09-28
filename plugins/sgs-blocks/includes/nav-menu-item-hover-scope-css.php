<?php
/**
 * SGS Nav Bar Menu — `itemHoverScope: 'with-submenu'` border-channel override
 * (U-18 gap G-13, second pass 2026-09-28).
 *
 * `nav-menu-css.php` scopes its OWN hover rules (text colour, background
 * fill, opacity, the text-Sweep hover half, the Highlight font-weight bump)
 * directly to `$link_hover_sel`, because it builds every one of those rules
 * itself. The item BORDER's hover/current states are built by the SHARED
 * `sgs_border_states_css()` primitive (`includes/helpers-colour-variants.php`)
 * via `includes/nav-menu-item-border-featured-css.php::sgs_nav_shared_item_border_css()`
 * — a 300+ line file this project does not grow, calling a shared primitive
 * used by several unrelated blocks. Neither file can be re-scoped by editing
 * their internals without risking every OTHER caller of that primitive.
 *
 * So this file does not touch either: it emits an ADDITIVE override, scoped
 * to items WITHOUT a submenu/mega (`.{bem}__item` lacking `--has-submenu`/
 * `--mega`), that pins the border back to its OWN resting value on hover —
 * using the SAME resolution `sgs_border_states_css()` itself uses
 * (`sgs_resolve_text_colour_or_gradient()` + `sgs_colour_value()` fallback),
 * never a guess, and `currentColor` when no resting colour is set (the exact
 * CSS specified initial value for `border-color`, so a reset to "no rule at
 * all" and a reset to `currentColor` are visually identical). The override
 * selector carries two extra `:not()` clauses over the plain `.{bem}__link`
 * the shared primitive emits, so it wins on SPECIFICITY alone — it does not
 * depend on running after the border module in source order.
 *
 * The `sweep` treatment's hover-triggered visual is not a border-colour
 * change at all — it is the `::after` band's `background-position` travelling
 * from `sgs_directional_sweep_css()`'s `rest_position` to `hover_position`
 * (`nav-menu-item-border-featured-css.php` lines ~145-177). This file freezes
 * that same selector's `::after` at its own `rest_position`, recomputed via
 * the SAME pure `sgs_directional_sweep_positions( $sweepAngle )` call the
 * border module uses, from the SAME `sweepAngle`/`borderHoverAnimationDirection`
 * attributes — not a duplicated literal.
 *
 * Not covered by this file (disclosed, not silently dropped):
 *   - The item SEPARATOR (between adjacent bar items, FR-41-37) — a
 *     different concept (an edge two items share) from an item's OWN hover
 *     paint, so G-13 does not apply to it.
 *   - The FEATURED item's own hover states (`nav-menu-item-border-featured-css.php`'s
 *     featured-pill section) — featured is an independent per-item flag, not
 *     gated by submenu presence in the spec text this gap is drawn from.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_item_hover_scope_border_css' ) ) {
	/**
	 * Border-channel override for `itemHoverScope: 'with-submenu'`.
	 *
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @param string $bem_root   `sgs-nav-bar-menu` (the only block with this border-hover
	 *                           mechanism and the has-submenu/mega item-modifier classes today).
	 * @param array  $attributes Block attributes (verbatim render.php param).
	 * @param string $t_border   RESOLVED `itemBorderHoverTreatment` ('swap'/'none'/'sweep') from
	 *                           `sgs_nav_shared_resolved_treatments()` — the SAME resolved value
	 *                           `sgs_nav_shared_item_border_css()` was called with.
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_item_hover_scope_border_css( string $uid_sel, string $bem_root, array $attributes, string $t_border ): string {
		if ( 'with-submenu' !== (string) ( $attributes['itemHoverScope'] ?? 'all' ) ) {
			return '';
		}
		if ( ! in_array( $t_border, array( 'swap', 'sweep' ), true ) ) {
			return '';
		}

		$css             = '';
		$no_submenu_link = $uid_sel . ' .' . $bem_root . '__item:not(.' . $bem_root . '__item--has-submenu):not(.' . $bem_root . '__item--mega) .' . $bem_root . '__link';

		if ( 'swap' === $t_border ) {
			$normal_flat  = (string) ( $attributes['itemBorderColour'] ?? '' );
			$normal_paint = sgs_resolve_text_colour_or_gradient( $normal_flat, '' );
			if ( '' !== $normal_paint && $normal_paint === $normal_flat ) {
				$normal_paint = sgs_colour_value( $normal_paint );
			}
			$reset_colour = '' !== $normal_paint ? $normal_paint : 'currentColor';
			$css         .= sgs_hover_state_rules( $no_submenu_link, 'border-color:' . $reset_colour, ':focus-within' );
			return $css;
		}

		// 'sweep' — freeze the ::after band's background-position at rest.
		$item_border_box = is_array( $attributes['itemBorderWidth'] ?? null ) ? $attributes['itemBorderWidth'] : array();
		$sweep_edge      = isset( $item_border_box['bottom'] ) ? sgs_css_length_value( (string) $item_border_box['bottom'] ) : '';
		$sweep_hover     = sgs_colour_value( (string) ( $attributes['itemBorderColourHover'] ?? '' ) );
		if ( '' === $sweep_edge || '' === $sweep_hover ) {
			return '';
		}
		$sweep_angle = isset( $attributes['sweepAngle'] ) ? (float) $attributes['sweepAngle'] : 90.0;
		if ( ! isset( $attributes['sweepAngle'] ) && 'right-to-left' === (string) ( $attributes['borderHoverAnimationDirection'] ?? 'left-to-right' ) ) {
			$sweep_angle = 270.0;
		}
		$positions = sgs_directional_sweep_positions( $sweep_angle );
		$css      .= sgs_hover_state_rules( $no_submenu_link, 'background-position:' . $positions['rest'], ':focus-visible', '::after' );

		return $css;
	}
}

<?php
/**
 * `sgs/nav-drawer-menu` — the row divider (`itemSeparator*`), the horizontal
 * counterpart of the bar's between-item vertical rule.
 *
 * `sgs/nav-bar-menu` draws its separator between adjacent items in a row
 * (`includes/nav-menu-item-border-featured-css.php::sgs_nav_shared_item_border_css`,
 * gated on a bar that is NOT `--drawer`). In the drawer the same attribute
 * family draws the rule between STACKED rows: a `::before` on every top-level
 * `.sgs-nav-drawer-menu__item` except the first, laid across the top edge of the
 * row. It is a separate mechanism from `itemBorderWidth`/`itemBorderColour*`
 * (the row's own border edge), so both can run at once in different colours.
 *
 * Emission is gated on a width AND a colour: an untouched drawer (width '')
 * emits nothing.
 *
 * Hover. The rule belongs to the row below it and to the row above it, so the
 * hover colour (or sweep) fires when EITHER row's head is pointed at or
 * keyboard-focused. The head is the row's own link, its expander or its
 * whole-row toggle, not the open section, so hovering a sub-item does not
 * repaint the divider above its parent. Every hover selector is one top-level
 * comma part (`sgs_hover_guarded_rule()` splits on commas), so the `:has()`
 * lists are written out as separate parts.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/sweep-css.php';

if ( ! function_exists( 'sgs_nav_drawer_menu_separator_css' ) ) {
	/**
	 * Build the row-divider CSS.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @return string CSS fragment (no wrapping <style> tag), or '' when no divider is set.
	 */
	function sgs_nav_drawer_menu_separator_css( array $attributes, string $uid_sel ): string {
		$width  = sgs_css_length_value( (string) ( $attributes['itemSeparatorWidth'] ?? '' ) );
		$colour = sgs_colour_value( (string) ( $attributes['itemSeparatorColour'] ?? '' ) );
		if ( '' === $width || '' === $colour ) {
			return '';
		}

		$style = sgs_css_keyword_sanitise( (string) ( $attributes['itemSeparatorStyle'] ?? '' ) );
		if ( 'none' === $style ) {
			return '';
		}
		$style     = '' !== $style ? $style : 'solid';
		$hover     = sgs_colour_value( (string) ( $attributes['itemSeparatorColourHover'] ?? '' ) );
		$treatment = (string) ( $attributes['itemSeparatorHoverTreatment'] ?? 'swap' );
		// A sweep is a gradient band, which can only ever render a solid line, so a
		// dashed or dotted style withdraws it back to a colour swap (the same rule as
		// block.json::supports.sgs.sweepEligibility.itemSeparatorHoverTreatment).
		if ( 'sweep' === $treatment && ( 'solid' !== $style || '' === $hover ) ) {
			$treatment = 'swap';
		}
		if ( ! in_array( $treatment, array( 'none', 'swap', 'sweep' ), true ) || '' === $hover ) {
			$treatment = 'none';
		}

		$bem    = 'sgs-nav-drawer-menu';
		$bar    = $uid_sel . ' .' . $bem . '__bar';
		$item   = $bar . ' > .' . $bem . '__item:not(:first-child)';
		$motion = 'var(--sgs-ndm-motion, 300ms ease)';
		$css    = '';

		// The row heads that count as "pointing at the row": a plain link row's
		// link, a split row's link, and the expander summary (also the whole-row toggle).
		$heads = array(
			'> .' . $bem . '__link',
			'> .' . $bem . '__accordion-row > .' . $bem . '__link',
			'> .' . $bem . '__accordion-row > .' . $bem . '__accordion > .' . $bem . '__accordion-summary',
		);
		// Selectors for "this divider's own row is hovered/focused" and "the row
		// ABOVE it is hovered/focused" — the divider is the `::before` of its own row.
		$own_hover   = array();
		$own_focus   = array();
		$above_hover = array();
		$above_focus = array();
		foreach ( $heads as $head ) {
			$own_hover[]   = $item . ':has(' . $head . ':hover)::before';
			$own_focus[]   = $item . ':has(' . $head . ':focus-visible)::before';
			$above_hover[] = $bar . ' > .' . $bem . '__item:has(' . $head . ':hover) + .' . $bem . '__item::before';
			$above_focus[] = $bar . ' > .' . $bem . '__item:has(' . $head . ':focus-visible) + .' . $bem . '__item::before';
		}
		$hover_sels = implode( ',', array_merge( $own_hover, $above_hover ) );
		$focus_sels = implode( ',', array_merge( $own_focus, $above_focus ) );

		if ( 'sweep' === $treatment ) {
			$angle = isset( $attributes['itemSeparatorSweepAngle'] ) && is_numeric( $attributes['itemSeparatorSweepAngle'] )
				? (float) $attributes['itemSeparatorSweepAngle'] : 90.0;
			$sweep = sgs_directional_sweep_css( $angle, $colour, $hover );
			// The band is a real box of the divider's own thickness, not a border, so
			// the gradient has a padding box to size against.
			$css .= $item . '::before{content:"";position:absolute;z-index:1;inset-inline:0;top:0;height:' . $width . ';'
				. 'background-image:' . $sweep['gradient'] . ';background-size:' . $sweep['background_size'] . ';'
				. 'background-position:' . $sweep['rest_position'] . ';background-repeat:no-repeat;'
				. 'transition:background-position ' . $motion . ';pointer-events:none;}';
			$css .= sgs_hover_guarded_rule( $hover_sels, 'background-position:' . $sweep['hover_position'] );
			$css .= $focus_sels . '{background-position:' . $sweep['hover_position'] . ';}';
		} else {
			$css .= $item . '::before{content:"";position:absolute;z-index:1;inset-inline:0;top:0;'
				. 'border-top:' . $width . ' ' . $style . ' ' . $colour . ';'
				. ( 'none' !== $treatment ? 'transition:border-top-color ' . $motion . ';' : '' )
				. 'pointer-events:none;}';
			if ( 'swap' === $treatment ) {
				$css .= sgs_hover_guarded_rule( $hover_sels, 'border-top-color:' . $hover );
				$css .= $focus_sels . '{border-top-color:' . $hover . ';}';
			}
		}
		if ( 'none' !== $treatment ) {
			$css .= '@media (prefers-reduced-motion:reduce){' . $item . '::before{transition:none;}}';
		}

		return $css;
	}
}

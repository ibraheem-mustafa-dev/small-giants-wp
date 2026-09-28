<?php
/**
 * SGS Nav Bar Menu / Nav Drawer Menu — shared item-level padding emitter
 * (Spec 36 "Item hover paint", M-21): "the bar and drawer menus were one
 * block, so every item-level control belongs on both (`itemPadding`,
 * `submenuLinkPadding`)".
 *
 * Emits `itemPadding` (the top-level menu link) and `submenuLinkPadding`
 * (the dropdown/mega/accordion submenu link) for EITHER `sgs/nav-bar-menu`
 * or `sgs/nav-drawer-menu` from one shared function, given only `$bem_root`.
 *
 * Publishes each box's resting inline-start side as a CSS custom property
 * (`--sgs-nav-link-pad-start`, `--sgs-nav-sublink-pad-start`), which
 * `itemPaddingShiftHover`'s additive hover shift (nav-menu-css.php,
 * nav-menu-submenu-css.php) calc()s from. A custom property resolves from
 * the element's final computed value, not textual declaration order, so it
 * does not matter whether this file's call runs before or after the file
 * that reads it back.
 *
 * ⚠ LOAD ORDER: not bootstrap-loaded — require_once'd per-instance,
 * matching the rest of the nav-menu-*-css.php family. Depends on
 * helpers-responsive.php (sgs_emit_responsive_css) already being loaded —
 * every render.php in this family requires that file before this one.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_item_padding_css' ) ) {
	/**
	 * Build the item-padding + submenu-link-padding CSS fragment shared by
	 * `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`.
	 *
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @param string $bem_root   `sgs-nav-bar-menu` or `sgs-nav-drawer-menu`.
	 * @param array  $attributes Block attributes (verbatim render.php param).
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_item_padding_css( string $uid_sel, string $bem_root, array $attributes ): string {
		$css = '';

		/*
		 * itemPadding — the top-level menu link (`.{bem}__link`). Default
		 * 8px 12px (style.css). Emitted per side, tier-diffed, at (0,2,0) —
		 * beats the (0,1,0) stylesheet default. The resting inline-start
		 * side is ALSO published as a custom property so itemPaddingShiftHover
		 * always calc()s from whatever is actually in effect, whichever
		 * attribute set it.
		 */
		$link_sel     = $uid_sel . ' .' . $bem_root . '__link';
		$item_padding = $attributes['itemPadding'] ?? null;
		if ( is_array( $item_padding ) && array() !== $item_padding ) {
			$item_padding_start = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				if ( isset( $item_padding[ $tier ]['left'] ) && '' !== $item_padding[ $tier ]['left'] ) {
					$item_padding_start[ $tier ] = $item_padding[ $tier ]['left'];
				}
			}
			$css .= sgs_emit_responsive_css(
				$link_sel,
				array(
					array(
						'value'        => $item_padding,
						'css'          => 'padding',
						'box'          => true,
						'unit_default' => 'px',
					),
					array(
						'value'        => $item_padding_start,
						'css'          => '--sgs-nav-link-pad-start',
						'unit_default' => 'px',
					),
				)
			);
		}

		/*
		 * submenuLinkPadding — the dropdown/mega/accordion submenu link
		 * (`.{bem}__sublink`). Default 0 16px (nav-menu-submenu-css.php's own
		 * `padding:0 16px` shorthand). Emitted as the SAME longhand-per-side
		 * shape as itemPadding above, at (0,2,0) — wins over the base rule's
		 * (0,2,0) shorthand by SOURCE ORDER (a longhand declared after a
		 * shorthand overrides only the side it names; this file's call runs
		 * after nav-menu-submenu-css.php's in every render.php in this
		 * family), never by specificity, since both are equally specific. An
		 * unset side/tier keeps the shorthand's default for that side, exactly
		 * like itemPadding. The resting inline-start side is likewise
		 * published for itemPaddingShiftHover's sublink calc
		 * (nav-menu-submenu-css.php).
		 */
		$sublink_sel      = $uid_sel . ' .' . $bem_root . '__sublink';
		$submenu_link_pad = $attributes['submenuLinkPadding'] ?? null;
		if ( is_array( $submenu_link_pad ) && array() !== $submenu_link_pad ) {
			$submenu_pad_start = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				if ( isset( $submenu_link_pad[ $tier ]['left'] ) && '' !== $submenu_link_pad[ $tier ]['left'] ) {
					$submenu_pad_start[ $tier ] = $submenu_link_pad[ $tier ]['left'];
				}
			}
			$css .= sgs_emit_responsive_css(
				$sublink_sel,
				array(
					array(
						'value'        => $submenu_link_pad,
						'css'          => 'padding',
						'box'          => true,
						'unit_default' => 'px',
					),
					array(
						'value'        => $submenu_pad_start,
						'css'          => '--sgs-nav-sublink-pad-start',
						'unit_default' => 'px',
					),
				)
			);
		}

		return $css;
	}
}

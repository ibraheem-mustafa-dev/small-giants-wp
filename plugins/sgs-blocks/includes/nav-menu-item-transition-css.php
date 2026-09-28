<?php
/**
 * SGS Nav Bar Menu / Nav Drawer Menu — the item link's OWN hover/current
 * colour-and-background transition timing (proven gap, U-18 nav audit §5).
 *
 * `itemMotionDuration`/`itemMotionEasing` are genuinely read and emitted on
 * both nav menu blocks, but only for the label-roll crossfade
 * (`includes/helpers-item-effects.php::sgs_item_motion_transition()`) and,
 * on the drawer, the sibling-dim/ornament crossfade. The item link's OWN
 * `background-color`/`color` transition on hover/focus is a hardcoded
 * literal fallback on a theme token — `var(--wp--custom--transition--fast,
 * 150ms ease)` — in each block's own `style.css`, wired to nothing.
 * `block.json::supports.sgs.elements.item.attrMap` claims a
 * `css:transition-duration -> itemMotionDuration` routing destination for
 * this exact rule that nothing ever emitted.
 *
 * This file closes that gap: it publishes `--sgs-nav-item-motion` as a
 * `<duration> <easing>` pair ONLY when the operator has actually set
 * `itemMotionDuration` (gated on that attribute alone, not on
 * `itemMotionEasing`, which always carries a non-empty JSON default of
 * `ease` — gating on it too would make this fire for every instance and
 * silently change the unset default from 150ms to some other value). Each
 * block's own `style.css` reads it as
 * `var(--sgs-nav-item-motion, var(--wp--custom--transition--fast, 150ms ease))`
 * — unset keeps today's 150ms token exactly; set overrides it.
 *
 * ⚠ Deliberately NOT `sgs_item_motion_transition()` (helpers-item-effects.php):
 * that helper defaults an unset duration to 300ms, which is correct for the
 * label-roll/sibling-dim features it was built for (both brand new, no
 * legacy default to preserve) but would silently move this control's own
 * unset default from 150ms to 300ms — a real visual regression on every
 * existing instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_item_transition_css' ) ) {
	/**
	 * Publish the item link's own hover/current transition timing, shared by
	 * `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`.
	 *
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @param string $bem_root   `sgs-nav-bar-menu` or `sgs-nav-drawer-menu` (unused today —
	 *                           the custom property is published on the instance root, not a
	 *                           BEM-scoped element — kept for signature parity with the
	 *                           file's sibling helpers and in case a future caller needs a
	 *                           block-specific fallback).
	 * @param array  $attributes Block attributes (verbatim render.php param).
	 * @return string CSS fragment (no wrapping <style> tag), or '' when unset.
	 */
	function sgs_nav_item_transition_css( string $uid_sel, string $bem_root, array $attributes ): string {
		unset( $bem_root );

		$duration_raw = $attributes['itemMotionDuration'] ?? null;
		if ( ! is_numeric( $duration_raw ) ) {
			return '';
		}

		$ms     = sgs_motion_ms( $duration_raw, 150 );
		$easing = sgs_motion_easing_css(
			(string) ( $attributes['itemMotionEasing'] ?? '' ),
			(string) ( $attributes['itemMotionEasingCustom'] ?? '' ),
			'ease'
		);

		return $uid_sel . '{--sgs-nav-item-motion:' . $ms . 'ms ' . $easing . ';}';
	}
}

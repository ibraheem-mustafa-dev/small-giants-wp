<?php
/**
 * SGS Nav Drawer Menu — disabled top-level/sub item markup (Wave B parity,
 * 2026-09-28). `sgs/nav-drawer-menu` gained `disabledItemIds`/
 * `itemDisabledColour` (attribute, inspector, CSS on `[aria-disabled="true"]`
 * for `.{bem}__link`/`.{bem}__sublink`), but the leaf/sub-item `<a>` markup
 * is built in the SHARED `includes/nav-menu-markup.php::sgs_nav_drawer_menu_render_items()`
 * — a 600+ line file this project does not grow. This file holds the two
 * markup builders so that shared function only needs a per-item boolean
 * check + a one-line call, matching the disabled shape
 * `sgs_nav_bar_menu_render_items()` already renders (non-interactive text,
 * no `href`, no `data-sgs-nav-path` so `markCurrentPage()` in view.js never
 * touches it, `aria-disabled="true"`, not focusable).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_drawer_disabled_link_html' ) ) {
	/**
	 * A disabled top-level drawer row: `<li><span aria-disabled="true">…</span></li>`.
	 *
	 * @param string $li_class   Already-built `<li>` class list (the caller folds
	 *                           the `--disabled` modifier in before calling this).
	 * @param string $label_html Pre-rendered label inner HTML (already escaped/trusted —
	 *                           `sgs_nav_drawer_menu_label_inner()`'s own output).
	 * @param string $badge_html Pre-rendered badge HTML (`sgs_nav_shared_badge_html()`'s
	 *                           own output — already escaped internally).
	 * @return string HTML.
	 */
	function sgs_nav_drawer_disabled_link_html( string $li_class, string $label_html, string $badge_html ): string {
		return sprintf(
			'<li class="%1$s"><span class="sgs-nav-drawer-menu__link" aria-disabled="true">%2$s%3$s</span></li>',
			esc_attr( $li_class ),
			$label_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_nav_drawer_menu_label_inner() esc_html/esc_attr's internally.
			$badge_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_nav_shared_badge_html() esc_attr/esc_html's internally.
		);
	}
}

if ( ! function_exists( 'sgs_nav_drawer_disabled_sublink_html' ) ) {
	/**
	 * A disabled drawer sub-item: `<li><span aria-disabled="true">…</span></li>`.
	 *
	 * @param string $label      Raw sub-item label (escaped here).
	 * @param string $featured_class Already-built featured modifier class fragment
	 *                           (e.g. ' sgs-nav-drawer-menu__subitem--featured', or '').
	 * @return string HTML.
	 */
	function sgs_nav_drawer_disabled_sublink_html( string $label, string $featured_class ): string {
		return sprintf(
			'<li class="sgs-nav-drawer-menu__subitem sgs-nav-drawer-menu__subitem--disabled%1$s"><span class="sgs-nav-drawer-menu__sublink" aria-disabled="true">%2$s</span></li>',
			esc_attr( $featured_class ),
			esc_html( $label )
		);
	}
}

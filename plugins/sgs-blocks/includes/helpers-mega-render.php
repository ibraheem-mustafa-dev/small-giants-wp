<?php
/**
 * Mega-panel render helper — resolves a menu item's mega panel to rendered
 * HTML with a hard recursion guard (CF-1, Spec 36 FR-36-5 / FR-36-15).
 *
 * WHY A SEPARATE HELPER (not a top-level function in nav-menu/render.php):
 * WordPress runs a dynamic block's render.php via `include` once PER INSTANCE,
 * so a function declared at the top level of render.php fatals ("Cannot
 * redeclare") the moment a page holds two nav-menus (D374 /
 * STOP-NO-TOP-LEVEL-FUNCTION-IN-PER-RENDER-PHP). This file is `require_once`d,
 * and every function is `function_exists`-guarded, so it loads exactly once.
 *
 * WHY THE RECURSION GUARD (CF-1, FATAL-class): a mega panel is arbitrary
 * block content (`do_blocks`). If a panel embeds a nav bound to a menu that
 * contains the very item this panel hangs off — directly or transitively —
 * rendering it would re-enter this resolver for the same panel and recurse
 * without bound: an infinite loop / stack exhaustion (a self-inflicted DoS).
 * The static `$sgs_mega_rendering` set (keyed by panel post-ID) + a hard
 * depth cap short-circuit that: a panel already on the stack, or a stack
 * deeper than the cap, returns null and the caller degrades to a plain link
 * (FR-36-9a). The key is set BEFORE `do_blocks` and cleared in `finally`, so
 * even a fatal inside a child block cannot leave the guard stuck.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_mega_render_panel_content' ) ) {
	/**
	 * Maximum mega-panel nesting depth. A panel embedding a nav that opens
	 * another mega is exotic but legal; three levels is far beyond any real
	 * design and well short of a stack problem.
	 */
	if ( ! defined( 'SGS_MEGA_MAX_DEPTH' ) ) {
		define( 'SGS_MEGA_MAX_DEPTH', 3 );
	}

	/**
	 * Resolve a mega panel post ID to its rendered inner HTML, guarding against
	 * self-reference recursion + runaway depth.
	 *
	 * Reuses the single verified resolver
	 * {@see \SGS\Blocks\Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item()} (which
	 * enforces post-type + published status + integrity, FR-36-9a) by handing it
	 * a minimal `{object, object_id}` shape — the same two fields a real
	 * `nav_menu_item` carries — so there is ONE resolution code path, not two.
	 *
	 * @param int $panel_id The `sgs_mega_menu` post ID (a menu item's object_id).
	 * @return string|null Rendered panel HTML, or null when the target is
	 *                     missing/trashed/not-a-panel/unpublished, OR when the
	 *                     recursion guard trips (caller degrades to a plain link).
	 */
	function sgs_mega_render_panel_content( int $panel_id ): ?string {
		static $sgs_mega_rendering = array();

		if ( $panel_id <= 0 ) {
			return null;
		}

		// Recursion guard (CF-1): already rendering this panel, or too deep.
		if ( isset( $sgs_mega_rendering[ $panel_id ] ) || count( $sgs_mega_rendering ) >= SGS_MEGA_MAX_DEPTH ) {
			return null;
		}

		if ( ! class_exists( '\SGS\Blocks\Sgs_Mega_Menu_CPT' ) ) {
			return null;
		}

		$panel = \SGS\Blocks\Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item(
			(object) array(
				'object'    => 'sgs_mega_menu',
				'object_id' => $panel_id,
			)
		);

		if ( ! $panel instanceof \WP_Post ) {
			return null;
		}

		$sgs_mega_rendering[ $panel_id ] = true;
		try {
			$html = do_blocks( $panel->post_content );
		} finally {
			unset( $sgs_mega_rendering[ $panel_id ] );
		}

		return $html;
	}
}

/**
 * SGS Nav Menu (sgs/nav-menu) — shared editor helpers.
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — every export here
 * is verbatim from edit.js.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

/**
 * Burger Menu scope presets (Bean 2026-07-28 — no bare px values in the UI).
 * The stored attribute stays the numeric `collapsePoint` (render.php and the
 * emitted @media rules are unchanged); these are the operator-facing names:
 *
 * - mobile (DEFAULT) — burger below 768px (the device-tier mobile boundary,
 *   `~/.claude/rules/visual-standards.md`).
 * - tablet — burger below 1024px (tablet + mobile collapse).
 * - always — burger on EVERY device. 99999px comfortably exceeds any real
 *   viewport; increasingly common on large sites (drawer-first navigation).
 * - custom — any other stored value; picking it in the UI reveals the px box.
 */
export const BURGER_SCOPE_PX = { mobile: 768, tablet: 1024, always: 99999 };

/**
 * Resolve a stored collapsePoint back to its scope name for the toggle.
 *
 * @param {number} px Stored collapse point.
 * @return {string} 'mobile' | 'tablet' | 'always' | 'custom'.
 */
export function burgerScopeOf( px ) {
	if ( px === BURGER_SCOPE_PX.always ) {
		return 'always';
	}
	if ( px === BURGER_SCOPE_PX.tablet ) {
		return 'tablet';
	}
	if ( px === BURGER_SCOPE_PX.mobile ) {
		return 'mobile';
	}
	return 'custom';
}

/**
 * Link-count threshold for informational notice (FR-36-8, FR-36-12).
 * Baymard's research identified ~50 links as the abandonment cliff in navigation.
 * This is directional; validate against our own sites and adjust as needed.
 * NOT a gate — the operator can always save/publish regardless.
 *
 * @see https://baymard.com/blog/website-navigation-menu-increase-usability
 */
export const LINK_COUNT_THRESHOLD = 50;

/**
 * Client-side mirror of render.php's SGS_Nav_Menu_Bar_Renderer::flatten() —
 * top-level items only (submenus collapse to their own link), same
 * identifier rule ('id:<id>' when the block carries one, else 'label:<text>')
 * so a ticked featuredItemIds entry matches the server-rendered item.
 *
 * @param {Array}  blocks     Parsed top-level nav blocks.
 * @param {string} parentPath Path-qualified prefix (recursion only).
 * @param {number} depth      Nesting depth (recursion only).
 * @return {Array<{identifier: string, label: string}>} Flattened items.
 */
export function flattenMenuItems( blocks, parentPath = '', depth = 0 ) {
	const items = [];
	( blocks || [] ).forEach( ( block ) => {
		if ( 'core/home-link' === block.name ) {
			items.push( {
				identifier: 'special:home',
				label: __( 'Home', 'sgs-blocks' ),
				depth,
			} );
			return;
		}
		// core/page-list featured-marking is a Phase-1 limitation — the editor
		// can't expand a page-list without a REST call, so page-list items are
		// not offered in the featured checklist this phase.
		if (
			! [
				'core/navigation-link',
				'core/navigation-submenu',
			].includes( block.name )
		) {
			return;
		}
		const label = block.attributes?.label;
		if ( ! label ) {
			return;
		}
		const id = block.attributes?.id;
		const ownKey = id ? `id:${ id }` : `label:${ label }`;
		/*
		 * Path-qualified EXACTLY as render.php does (`$parent_path . '>' .
		 * $own_key`), or a ticked child would never match the item the server
		 * renders. Top-level keys stay bare, so existing selections still match.
		 */
		const identifier = parentPath ? `${ parentPath }>${ ownKey }` : ownKey;
		// isMega mirrors render.php's from_link() 'type' check ('type' === the
		// linked post type slug for a link to an sgs_mega_menu CPT post) — feeds
		// the megaDrawerFallbackIds checklist (MegaDrawerPanel.js).
		const isMega = 'sgs_mega_menu' === block.attributes?.type;
		const hasChildren =
			'core/navigation-submenu' === block.name &&
			( block.innerBlocks || [] ).length > 0;
		items.push( { identifier, label, depth, isMega, hasChildren } );
		/*
		 * Recurse into children. Without this the checklist listed TOP-LEVEL
		 * items only, so render.php's featured-child support (it marks any child
		 * whose identifier is in featuredItemIds) was unreachable from the
		 * editor — the block could render a featured child but no client could
		 * ever ask for one. Council-caught; by this project's own rule a setting
		 * that needs code is not done.
		 */
		if ( 'core/navigation-submenu' === block.name ) {
			items.push(
				...flattenMenuItems( block.innerBlocks, identifier, depth + 1 )
			);
		}
	} );
	return items;
}

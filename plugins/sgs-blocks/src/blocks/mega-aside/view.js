/**
 * SGS Mega Aside (sgs/mega-aside) — frontend interactivity for `preview` format.
 *
 * GROUND-TRUTH: verified against .claude/plans/archive/2026-07-24-mega-menu-BUILD-SPEC.md
 * §8 ("preview: hover-reactive — displays the currently-hovered link's title
 * and description") + icon-list/view.js's module-bootstrap pattern (reused
 * here, same house style: querySelectorAll + forEach + DOMContentLoaded gate).
 *
 * ONE responsibility: when `data-aside-format="preview"`, swap the aside's
 * heading + text content to match whichever link elsewhere in the SAME
 * `.wp-block-sgs-mega-panel` is currently hovered/focused, restoring the
 * authored default (the sensible resting state — always real server-rendered
 * content, never an empty box) the moment nothing is hovered/focused.
 *
 * Progressive enhancement only: with zero JS the aside still renders its
 * authored heading/text (the resting state) — this is purely an enhancement
 * layer, never load-bearing content. No `.innerHTML` of link-derived content
 * (CF-2) — every write uses `textContent`.
 *
 * Deliberately does NOT touch mega-panel's or mega-group's/icon-list's own
 * files or stores — this reads sibling DOM via event delegation on the
 * shared `.wp-block-sgs-mega-panel` ancestor only, never a shared JS module.
 *
 * @package
 */

const PANEL_SELECTOR = '.wp-block-sgs-mega-panel';
const ASIDE_SELECTOR = '.sgs-mega-aside[data-aside-format="preview"]';
const HEADING_SELECTOR = ':scope > .wp-block-sgs-heading';
const TEXT_SELECTOR = ':scope > .wp-block-sgs-text';

/**
 * Wire up one preview-format aside instance: capture its authored default
 * heading/text, then delegate hover + focus on the parent panel to swap that
 * content to match the hovered/focused link's accessible name.
 *
 * @param {HTMLElement} aside The `.sgs-mega-aside[data-aside-format="preview"]` root.
 */
function wirePreviewAside( aside ) {
	const panel = aside.closest( PANEL_SELECTOR );
	const headingEl = aside.querySelector( HEADING_SELECTOR );
	const textEl = aside.querySelector( TEXT_SELECTOR );

	// No panel ancestor, or no heading/text child to update — nothing to wire;
	// the authored static content already renders correctly with zero JS.
	if ( ! panel || ! headingEl || ! textEl ) {
		return;
	}

	const defaultHeading = headingEl.textContent;
	const defaultText = textEl.textContent;

	/**
	 * Show a hovered/focused link's own accessible name in place of the
	 * default heading, and clear the description (the sibling link markup
	 * carries no per-item description field to preview — an honest resting
	 * state for the text row rather than a fabricated one).
	 *
	 * @param {HTMLAnchorElement} link The hovered/focused link.
	 */
	function showLink( link ) {
		const label = ( link.textContent || '' ).trim();
		if ( '' === label ) {
			return;
		}
		headingEl.textContent = label;
		textEl.textContent = '';
	}

	/** Restore the authored default resting state. */
	function restoreDefault() {
		headingEl.textContent = defaultHeading;
		textEl.textContent = defaultText;
	}

	panel.addEventListener( 'mouseover', ( event ) => {
		const link = event.target.closest( 'a[href]' );
		if ( link && panel.contains( link ) && ! aside.contains( link ) ) {
			showLink( link );
		}
	} );

	panel.addEventListener( 'mouseout', ( event ) => {
		const leavingLink = event.target.closest( 'a[href]' );
		const enteringLink = event.relatedTarget
			? event.relatedTarget.closest( 'a[href]' )
			: null;
		if (
			leavingLink &&
			! aside.contains( leavingLink ) &&
			enteringLink !== leavingLink
		) {
			restoreDefault();
		}
	} );

	panel.addEventListener( 'focusin', ( event ) => {
		const link = event.target.closest( 'a[href]' );
		if ( link && panel.contains( link ) && ! aside.contains( link ) ) {
			showLink( link );
		}
	} );

	panel.addEventListener( 'focusout', ( event ) => {
		const link = event.target.closest( 'a[href]' );
		if ( link && ! aside.contains( link ) ) {
			restoreDefault();
		}
	} );
}

/** Initialise every preview-format sgs/mega-aside instance on the page. */
function init() {
	document.querySelectorAll( ASIDE_SELECTOR ).forEach( wirePreviewAside );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}

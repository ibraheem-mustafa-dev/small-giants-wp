/**
 * SGS Menu (sgs/nav-menu) — frontend interactivity.
 *
 * Progressive enhancement only: every link is already a server-rendered
 * <a href> in the DOM (crawlable with zero JS). This module adds ONE feature:
 * the accordion disclosure toggles. A click on a `.sgs-nav-menu__toggle` button
 * flips its `aria-expanded` and its controlled submenu's `hidden` attribute.
 *
 * Adapted from adaptive-nav's `setupDrawerAccordions`, but SELF-CONTAINED — it
 * shares no state with adaptive-nav's view.js. One-open-at-a-time is NOT
 * enforced (an accordion, not an exclusive disclosure), matching the drawer
 * baseline being extracted.
 *
 * There may be multiple `.sgs-nav-menu` instances on a page (e.g. a drawer menu
 * and a footer column) — each is initialised independently.
 *
 * @package SGS\Blocks
 */

/**
 * Wire the accordion toggles for one nav-menu instance.
 *
 * @param {HTMLElement} root The `.sgs-nav-menu` root (`<ul>`).
 */
function setupNavMenu( root ) {
	const toggles = root.querySelectorAll( '.sgs-nav-menu__toggle' );
	toggles.forEach( ( button ) => {
		button.addEventListener( 'click', () => {
			const panelId = button.getAttribute( 'aria-controls' );
			const panel = panelId ? document.getElementById( panelId ) : null;
			if ( ! panel ) {
				return;
			}
			const isOpen = button.getAttribute( 'aria-expanded' ) === 'true';
			button.setAttribute( 'aria-expanded', isOpen ? 'false' : 'true' );
			panel.hidden = isOpen;
		} );
	} );
}

/**
 * Initialise every nav-menu instance on the page.
 */
function init() {
	document.querySelectorAll( '.sgs-nav-menu' ).forEach( setupNavMenu );
}

// Initialise on DOM ready or immediately if already loaded.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}

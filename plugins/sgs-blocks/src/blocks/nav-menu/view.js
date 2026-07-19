/**
 * SGS Nav Menu (sgs/nav-menu) — frontend interactivity.
 *
 * Two responsibilities:
 *  1. Register the shared `store('sgs/nav')` (importing it is what registers
 *     it — see the module doc-block in shared/nav-interactivity/store.js).
 *     This is what makes the burger's `data-wp-on--click="actions.toggleDrawer"`
 *     work.
 *  2. Compute `aria-current="page"` CLIENT-SIDE at mount, comparing
 *     `location.pathname` against each link's `data-sgs-nav-path` (set by
 *     render.php). This canNOT be done server-side: the stack sits behind
 *     LiteSpeed page cache, so a server-baked aria-current would serve a
 *     stale page's answer to every cached visitor (FR-36-10/-11).
 *
 * Every link is already a real, crawlable server-rendered <a href> — this is
 * progressive enhancement only; with zero JS the bar still works, it just
 * has no "you are here" indicator and the burger has no handler.
 *
 * @package SGS\Blocks
 */

import '../../shared/nav-interactivity/store';

/**
 * Normalise a path the same way render.php's items do: no trailing slash,
 * '' for the root, so a comparison against `location.pathname` is exact.
 *
 * @param {string} pathname A URL pathname.
 * @return {string} Normalised path.
 */
function normalisePath( pathname ) {
	return pathname.endsWith( '/' ) && pathname !== '/'
		? pathname.replace( /\/$/, '' )
		: pathname;
}

/**
 * Mark the current-page link (if any) inside one `.sgs-nav-menu` bar.
 *
 * @param {HTMLElement} root The `.wp-block-sgs-nav-menu` root.
 */
function markCurrentPage( root ) {
	const current = normalisePath( window.location.pathname );
	root.querySelectorAll( '.sgs-nav-menu__link[data-sgs-nav-path]' ).forEach(
		( link ) => {
			const path = normalisePath( link.dataset.sgsNavPath || '' );
			if ( path !== '' && path === current ) {
				link.setAttribute( 'aria-current', 'page' );
			} else {
				link.removeAttribute( 'aria-current' );
			}
		}
	);
}

/**
 * Initialise every sgs/nav-menu instance on the page.
 */
function init() {
	document
		.querySelectorAll( '.wp-block-sgs-nav-menu' )
		.forEach( markCurrentPage );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}

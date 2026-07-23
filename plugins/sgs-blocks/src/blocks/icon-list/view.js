/**
 * SGS Icon List (sgs/icon-list) — frontend interactivity.
 *
 * ONE responsibility: compute `aria-current="page"` CLIENT-SIDE at mount,
 * comparing `location.pathname` against each item link's `data-sgs-nav-path`
 * (set by render.php on every `<a>` that carries a per-item url, whether the
 * list is menu-bound or a typed link list). This canNOT be done server-side —
 * the stack sits behind LiteSpeed page cache, so a server-baked aria-current
 * would serve one cached page's answer to every visitor on every page
 * (FR-36-11). Mirrors `sgs/nav-menu`'s `view.js` exactly (FR-36-26c Dispatch
 * B — reuse the pattern, do not re-derive it).
 *
 * Every link is already a real, crawlable server-rendered `<a href>` — this
 * is progressive enhancement only; with zero JS the list still works, it
 * just has no "you are here" indicator.
 *
 * @package SGS\Blocks
 */

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
 * Mark the current-page link (if any) inside one `.wp-block-sgs-icon-list`.
 *
 * @param {HTMLElement} root The block's root element.
 */
function markCurrentPage( root ) {
	const current = normalisePath( window.location.pathname );
	root.querySelectorAll( '.sgs-icon-list__item-link[data-sgs-nav-path]' ).forEach(
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
 * Initialise every sgs/icon-list instance on the page.
 */
function init() {
	document
		.querySelectorAll( '.wp-block-sgs-icon-list' )
		.forEach( markCurrentPage );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}

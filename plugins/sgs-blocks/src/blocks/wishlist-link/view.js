/**
 * SGS Wishlist Link — hydrates the live saved-item count badge.
 *
 * render.php always renders the count as 0 (page-cache safety, same pattern
 * as sgs/cart's badge — see that block's render.php docblock). This module
 * fills in the real count from the shared wishlist store and keeps it in
 * sync across every wishlist-link on the page, and across tabs.
 */
import { ensureWishlistReady, onWishlistChange } from '../../shared/wishlist-store';

/**
 * Paint one badge's visible state.
 *
 * @param {HTMLElement} link  The `[data-sgs-wishlist-link]` root.
 * @param {number}      count Saved-item count.
 */
function paint( link, count ) {
	const badge = link.querySelector( '[data-sgs-wishlist-count]' );
	if ( badge ) {
		badge.textContent = String( count );
		badge.classList.toggle( 'sgs-wishlist-link__badge--visible', count > 0 );
	}
	link.setAttribute(
		'aria-label',
		count === 1 ? 'Wishlist, 1 item' : `Wishlist, ${ count } items`
	);
}

const links = document.querySelectorAll( '[data-sgs-wishlist-link]' );
if ( links.length > 0 ) {
	ensureWishlistReady().then( ( ids ) => {
		links.forEach( ( link ) => paint( link, ids.length ) );
	} );
	onWishlistChange( ( ids ) => {
		links.forEach( ( link ) => paint( link, ids.length ) );
	} );
}

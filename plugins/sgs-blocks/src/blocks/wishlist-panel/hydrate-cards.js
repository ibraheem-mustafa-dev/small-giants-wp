/**
 * SGS Wishlist Panel — start the Interactivity API on cards inserted after page load.
 *
 * The Interactivity API starts every `data-wp-interactive` region once, when the page loads; a product card the panel
 * inserts later (add to basket, option pickers) would be inert. This starts those regions the way the API itself
 * does for each region it finds at load. The call goes through the API's private entry point, which WordPress may
 * change: if it is missing or throws, the card keeps its no-script markup (the add-to-basket form submits to the
 * product page).
 *
 * @package
 */
import { privateApis } from '@wordpress/interactivity';

const CONSENT = 'I acknowledge that using private APIs means my theme or plugin will inevitably break in the next version of WordPress.';

/**
 * The outermost interactive regions inside a container.
 *
 * @param {HTMLElement} container The element the cards were inserted into.
 * @return {HTMLElement[]} The regions to start.
 */
export function outerRegions( container ) {
	return Array.from( container.querySelectorAll( '[data-wp-interactive]' ) ).filter( ( node ) => {
		const outer = node.parentElement?.closest( '[data-wp-interactive]' );
		return ! outer || ! container.contains( outer );
	} );
}

/**
 * Start the Interactivity API on each card region inside a container.
 *
 * @param {HTMLElement} container The element the cards were inserted into.
 * @return {Promise<void>}
 */
export async function hydrateCards( container ) {
	const regions = outerRegions( container );
	if ( ! regions.length ) {
		return;
	}
	try {
		const { getRegionRootFragment, toVdom, render } = privateApis( CONSENT );
		for ( const node of regions ) {
			if ( ! node.isConnected ) {
				continue;
			}
			const fragment = getRegionRootFragment( node );
			render( toVdom( node ), fragment );
		}
	} catch {
		// The cards stay as the server printed them.
	}
}

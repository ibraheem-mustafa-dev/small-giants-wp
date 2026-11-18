/**
 * SGS Wishlist Panel — the saved products' cards.
 *
 * The cards layout draws each saved product as the site's own `sgs/product-card`. The card markup comes from
 * `POST /sgs/v1/wishlist-cards` (`includes/wishlist/class-wishlist-cards-rest.php`), which renders it with the panel's
 * template card; the template and its signature are printed on the panel's root (`render-cards.php`). The route is
 * public and carries no nonce, so this is a plain fetch.
 *
 * @package
 */

/**
 * Split a list into chunks no longer than `size`.
 *
 * @param {Array}  list The list.
 * @param {number} size The most items one chunk holds.
 * @return {Array[]} The chunks, in order.
 */
export function chunkIds( list, size ) {
	const step = Math.max( 1, Number( size ) || 1 );
	const chunks = [];
	for ( let i = 0; i < list.length; i += step ) {
		chunks.push( list.slice( i, i + step ) );
	}
	return chunks;
}

/**
 * The card markup for each saved product the site can show.
 *
 * A product the route leaves out (no longer published or visible), a failed request or a panel with no cards URL
 * leaves that product out of the map: the panel then draws its plain row for it.
 *
 * @param {Object}   labels `labels.js::readPanelData()` output (`cardsUrl`, `cardTemplate`, `cardSig`, `cardsChunk`).
 * @param {number[]} ids    The product IDs to draw.
 * @param {Function} [send] The fetch function (a test passes its own).
 * @return {Promise<Map<number,string>>} Product ID to card HTML.
 */
export async function fetchProductCards( labels, ids, send = window.fetch.bind( window ) ) {
	const cards = new Map();
	if ( ! labels.cardsUrl || ! labels.cardTemplate || ! labels.cardSig || ! ids.length ) {
		return cards;
	}
	await Promise.all(
		chunkIds( ids, labels.cardsChunk ).map( async ( chunk ) => {
			try {
				const response = await send( labels.cardsUrl, {
					method: 'POST',
					credentials: 'same-origin',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify( { ids: chunk, template: labels.cardTemplate, sig: labels.cardSig } ),
				} );
				if ( ! response.ok ) {
					return;
				}
				const json = await response.json();
				for ( const item of Array.isArray( json?.items ) ? json.items : [] ) {
					if ( item && 'string' === typeof item.html && Number( item.id ) > 0 ) {
						cards.set( Number( item.id ), item.html );
					}
				}
			} catch {
				// This chunk's products draw as plain rows.
			}
		} )
	);
	return cards;
}

/**
 * The saved products the product-cards layout shows: those with a card. A product the route left out (hidden,
 * unpublished, password-protected) is not drawn, so the count and the grid agree.
 *
 * @param {Object[]}           products Store API products.
 * @param {Map<number,string>} cards    `fetchProductCards()` output.
 * @return {Object[]} The products that have a card, in order.
 */
export function cardProducts( products, cards ) {
	return products.filter( ( product ) => cards.has( Number( product.id ) ) );
}

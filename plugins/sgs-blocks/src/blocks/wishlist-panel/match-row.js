/**
 * SGS Wishlist Panel — cart-row → Store API item matcher (Wave 3C U-12 §E,
 * "Save for later" enhancer).
 *
 * The enhancer watches WooCommerce's own cart-page markup
 * (`tr.wc-block-cart-items__row`, verified live on WC 11.1.0) and needs to
 * find, for each row, the matching Store API cart item (`GET
 * /wc/store/v1/cart`) so it knows which `key` to remove and which product id
 * to save. The only link between the two is the product PERMALINK: the
 * row's `a.wc-block-components-product-name[href]` versus the Store API
 * item's `permalink` field.
 *
 * URL NORMALISATION (documented per the U-12 design brief):
 *   - the scheme (http/https) is IGNORED — the cart row and the Store API
 *     response can legitimately differ here (e.g. a mixed-content proxy),
 *     and the scheme carries no product identity;
 *   - the host is lower-cased;
 *   - the pathname has its trailing slash stripped, EXCEPT the root "/" —
 *     "/product/mug" and "/product/mug/" are the SAME product;
 *   - the QUERY STRING is kept and compared AS-IS (not sorted, not
 *     stripped) — a product-variant query string (e.g. "?attribute_size=l")
 *     is part of the product's identity here, so two URLs differing only by
 *     query string do NOT match.
 *   - the hash/fragment is ignored (never part of a WooCommerce permalink's
 *     identity).
 *
 * A row with no exact match (after normalisation) gets no button at all —
 * never a best-guess match (an exact match is safer than a wrong "Save for
 * later" removing the wrong line item).
 */

/**
 * Normalise a URL for permalink comparison. Returns '' for an unparseable
 * value so a bad input can never accidentally equal another bad input.
 *
 * @param {string} url A URL (absolute or, for a same-origin href, relative).
 * @return {string} The normalised form, or '' if `url` cannot be parsed.
 */
export function normaliseUrl( url ) {
	if ( ! url || 'string' !== typeof url ) {
		return '';
	}
	let parsed;
	try {
		parsed = new URL( url, window.location.origin );
	} catch ( e ) {
		return '';
	}
	const host = parsed.host.toLowerCase();
	let pathname = parsed.pathname;
	if ( pathname.length > 1 && pathname.endsWith( '/' ) ) {
		pathname = pathname.slice( 0, -1 );
	}
	return host + pathname + parsed.search;
}

/**
 * Find the Store API cart item whose `permalink` normalises to the same
 * value as a cart row's product-name link href.
 *
 * @param {string} rowHref   The row's `a.wc-block-components-product-name` href.
 * @param {Array}  cartItems Store API `GET /cart` `items` array.
 * @return {Object|null} The matching item, or null on no exact match.
 */
export function findCartItemForRow( rowHref, cartItems ) {
	const target = normaliseUrl( rowHref );
	if ( '' === target || ! Array.isArray( cartItems ) ) {
		return null;
	}
	const match = cartItems.find(
		( item ) => item && normaliseUrl( item.permalink ) === target
	);
	return match || null;
}

/**
 * Resolve the product id to save to the wishlist for a Store API cart item.
 * A variation's `id` is the variation post id (type `product_variation`,
 * which `includes/wishlist/class-wishlist-store.php::Wishlist_Store::product_is_valid()` rejects) — the wishlist
 * always wants the PARENT product id.
 *
 * @param {Object} item A Store API cart item.
 * @return {number} The product id to save, or 0 if it cannot be resolved.
 */
export function wishlistProductIdForCartItem( item ) {
	if ( ! item ) {
		return 0;
	}
	const parentId = Number( item.parent_id ) || 0;
	return parentId > 0 ? parentId : Number( item.id ) || 0;
}

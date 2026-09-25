/**
 * SGS Wishlist Panel — the WooCommerce Store API calls it uses.
 *
 * One client serves the whole page: these are the cart block's own
 * `src/blocks/cart/store-api.js` functions, so the panel, the Save-for-later
 * enhancer and the cart flyout share one request function and one rotating
 * Store API nonce.
 *
 * @package
 */

export {
	fetchCart,
	addCartItem,
	removeCartItem as removeCartItemByKey,
	fetchProducts as fetchWishlistProducts,
	formatMoney,
} from '../cart/store-api';

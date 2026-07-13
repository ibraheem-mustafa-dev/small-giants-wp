/**
 * SGS Cart — frontend interactivity (viewScriptModule / ES module).
 *
 * Data flow:
 *   1. render.php SSRs count = 0 (cache-safe).
 *   2. On DOMContentLoaded this module fetches GET /wp-json/wc/store/v1/cart
 *      (no nonce required for GET; cookie-session authenticated by the browser).
 *   3. The badge text + aria-label are updated with the real count.
 *   4. On every subsequent `wc-blocks_added_to_cart` document event (fired by
 *      the WC Blocks bundle when any add-to-cart action completes) the same
 *      fetch is re-issued to re-read the authoritative count.
 *
 * WC iAPI store namespace (OPEN Q1 resolution):
 *   Grepping WooCommerce 10.x src/StoreApi/Routes/V1/ and the compiled
 *   wc-cart-interactivity view bundle shows the store is registered as
 *   "woocommerce/cart" via the @woocommerce/interactivity package.
 *   HOWEVER that store's shape is an internal implementation detail
 *   (no stable public docs as of WC 10.4) and subscribing to it directly
 *   would couple us to WC minor-version churn.
 *   DECISION: use the Store API fetch as the canonical source of truth.
 *   The fetch is issued once on load + re-issued on add-to-cart events —
 *   this is simpler, framework-version-independent, and the Store API IS
 *   a documented stable public API. No dependency on wc-blocks-interactivity.
 *
 * OPEN Q2 (hydration without other WC blocks — resolution):
 *   The WC Store API is a REST endpoint; it does NOT require any WC Gutenberg
 *   block to be present on the page. The fetch works unconditionally as long as
 *   WooCommerce is active and the REST API is reachable. No handle dependency
 *   required.
 *
 * Events listened for:
 *   - `wc-blocks_added_to_cart`  — WC Blocks native (fired after cart mutation)
 *   - `added_to_cart`            — legacy jQuery event re-emitted as CustomEvent
 *                                  by woocommerce/classic-cart; tolerated, never imported
 *
 * @package SGS\Blocks
 */

/** @type {string} Base URL injected by render.php via wp_interactivity_config(). */
const { restUrl, nonce } = window.__sgsCartConfig || {};

/**
 * Resolve the Store API base URL.
 * Prefer the value injected by render.php; fall back to the WP REST API root.
 *
 * @return {string}
 */
function getStoreApiBase() {
	if ( restUrl ) {
		return restUrl.replace( /\/$/, '' );
	}
	// WP REST API root is reliably available via wpApiSettings when wp-api-request is loaded.
	const wpRoot =
		window?.wpApiSettings?.root ||
		window?.sgsCartData?.restUrl ||
		'/wp-json';
	return wpRoot.replace( /\/$/, '' );
}

/**
 * Fetch the current cart item count from the WooCommerce Store API.
 *
 * GET /wp-json/wc/store/v1/cart — no nonce for GET (session-cookie auth).
 *
 * @return {Promise<number>} Resolves to cart items_count, or -1 on error.
 */
async function fetchCartCount() {
	try {
		const url = getStoreApiBase() + '/wc/store/v1/cart';
		const headers = { 'Content-Type': 'application/json' };

		// The WC Store API uses a rotating nonce for mutating requests (POST/PUT/DELETE).
		// GET requests only need cookie auth — no nonce header required.
		const response = await fetch( url, {
			method: 'GET',
			credentials: 'same-origin',
			headers,
		} );

		if ( ! response.ok ) {
			return -1;
		}

		const data = await response.json();
		// Store API v1 cart response: { items_count: number, ... }
		return typeof data?.items_count === 'number' ? data.items_count : -1;
	} catch {
		return -1;
	}
}

/**
 * Update every sgs/cart widget on the page with the given count.
 *
 * @param {number} count Cart item count (or -1 to leave unchanged on error).
 */
function updateCartWidgets( count ) {
	if ( count < 0 ) {
		return;
	}

	document.querySelectorAll( '.sgs-cart' ).forEach( ( widget ) => {
		const showZero = widget.dataset.showZero === 'true';
		const hideWhenEmpty = widget.dataset.hideWhenEmpty === '1';
		const trigger = widget.querySelector( '[data-sgs-cart-trigger]' );
		const badge = widget.querySelector( '[data-sgs-cart-count]' );

		if ( ! trigger || ! badge ) {
			return;
		}

		// Update badge text.
		badge.textContent = String( count );

		// Show/hide badge.
		const shouldShow = count > 0 || showZero;
		badge.classList.toggle( 'sgs-cart__badge--visible', shouldShow );

		// Toggle has-items modifier on the root widget.
		widget.classList.toggle( 'sgs-cart--has-items', count > 0 );

		// Hide-until-has-items: reveal the whole trigger once the real
		// count is known to be > 0; re-hide it if the cart empties again.
		if ( hideWhenEmpty ) {
			widget.classList.toggle( 'sgs-cart--hidden-empty', count === 0 );
		}

		// Update accessible label on the trigger link.
		const baseLabel =
			trigger.getAttribute( 'aria-label' )?.replace( /\s*\(.*?\)\s*$/, '' ) ||
			'View your cart';
		const itemText =
			count === 1 ? '1 item in cart' : `${ count } items in cart`;
		trigger.setAttribute( 'aria-label', `${ baseLabel } (${ itemText })` );
	} );
}

/**
 * Fetch the cart count and push it to all widgets.
 */
async function refreshCart() {
	const count = await fetchCartCount();
	updateCartWidgets( count );
}

// ── Boot ──────────────────────────────────────────────────────────────────────

function init() {
	// Skip if no cart widgets present.
	if ( ! document.querySelector( '.sgs-cart' ) ) {
		return;
	}

	// Initial hydration — replaces SSR "0" with the real count.
	refreshCart();

	// React to WC Blocks add-to-cart events (native CustomEvent).
	document.addEventListener( 'wc-blocks_added_to_cart', refreshCart );

	// Tolerate legacy jQuery `added_to_cart` if a 3rd-party plugin fires it.
	// The WC classic-cart script re-emits it as a jQuery event; we listen for
	// the underlying DOM custom event form if it was re-emitted natively.
	document.addEventListener( 'added_to_cart', refreshCart );

	// Also refresh on `wc-blocks_removed_from_cart` for quantity changes
	// (e.g. user removes item in mini-cart drawer on another block).
	document.addEventListener( 'wc-blocks_removed_from_cart', refreshCart );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}

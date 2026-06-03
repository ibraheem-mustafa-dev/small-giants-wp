/**
 * SGS Product Card — Bound-mode frontend interactivity (viewScriptModule).
 *
 * Powers the Interactivity API store for the Bound product card:
 *   - Reactive price / image / stock swapping when the visitor picks an option
 *     pill — reading ONLY the seeded per-instance data-wp-context manifest
 *     (U3). Zero network requests on pill change; all variation data is already
 *     in the page.
 *   - Add-to-cart via the WooCommerce Store API (no jQuery, no wc-blocks
 *     bundle). Cart XHR is confined to addToCart only.
 *
 * Pill-event bridge (U4): the pill block (sgs/option-picker) dispatches a
 * bubbling DOM event on change:
 *   type   : 'sgs:option-selected'
 *   detail : { typeKey (taxonomy, e.g. "pa_size"), selectedKey (term slug) }
 *
 * That event name contains a colon, which the WP Interactivity `data-wp-on--`
 * directive parser does NOT bind (verified live — the listener is silently
 * skipped). So instead of a `data-wp-on--sgs:option-selected` directive, the
 * card uses `data-wp-init="callbacks.initPillBridge"` to capture its reactive
 * context once and attach a plain `addEventListener` for the colon event. The
 * captured context is the live Interactivity proxy, so mutating its keys in the
 * listener still drives the reactive bindings — and the shared option-picker
 * block keeps its documented `sgs:option-selected` contract unchanged.
 *
 * Context shape (per card instance, seeded server-side by render.php via
 * wp_interactivity_data_wp_context — U3 manifest):
 *
 *   productId          {string}   WC product ID
 *   addToCartId        {number}   variation ID used by addToCart (U7 rewires)
 *   decimals           {number}   currency decimal places (default 2)
 *   currencySymbol     {string}   e.g. "£"
 *   combos             {Object}   keyed by comboKey → variation data
 *                                   { variationId, priceMinor, regularMinor,
 *                                     saleMinor|null, pctOff, inStock, imageUrl }
 *   axes               {Array}    [{ taxonomy, label, terms:[{slug,label}] }]
 *   selectedAxes       {Object}   { [taxonomy]: slug } — current selections
 *   selectedKey        {string}   current comboKey (sorted "tax:slug|…")
 *   selectedVariationId{number}
 *   priceDisplay       {string}   e.g. "£9.99"
 *   regularDisplay     {string}   struck-through regular price (on-sale only)
 *   pctDisplay         {string}   e.g. "20% off" (empty when not on sale)
 *   showSale           {boolean}  true when variation is on sale
 *   hideSale           {boolean}  !showSale
 *   inStock            {boolean}
 *   stockText          {string}   e.g. "Out of stock" (empty when in stock)
 *   imageSrc           {string}
 *   imageAlt           {string}
 *   cartStatus         {string}   user-facing cart feedback string
 *   pending            {boolean}  true while addToCart XHR is in flight
 *
 * comboKey format (MUST match server exactly):
 *   {taxonomy}:{slug} pairs sorted ASCENDING by taxonomy, joined with "|"
 *   e.g. "pa_flavour:vanilla|pa_size:12-pack"
 *
 * No state mutation occurs for typed-mode cards — they carry no
 * data-wp-interactive attribute so this store never binds to them.
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

/**
 * Resolve the WooCommerce Store API base URL.
 *
 * @return {string} Base REST URL with no trailing slash.
 */
function getStoreApiBase() {
	const wpRoot =
		window?.wpApiSettings?.root ||
		window?.sgsCartData?.restUrl ||
		'/wp-json';
	return wpRoot.replace( /\/$/, '' );
}

/**
 * Format a minor-unit integer (e.g. 999 → "£9.99") using the card's
 * currency settings from context.
 *
 * Thousands-grouping follows the browser locale — for prices >= the thousands
 * boundary this may differ slightly from WC's server format. Acceptable for
 * Phase 1: all Mama's prices are < £100. The cart price is always
 * server-authoritative.
 *
 * @param {number} minor Amount in minor currency units (pence).
 * @param {Object} ctx   The card's Interactivity API context object.
 * @return {string}      Formatted price string, e.g. "£9.99".
 */
function formatPrice( minor, ctx ) {
	const decimals = typeof ctx.decimals === 'number' ? ctx.decimals : 2;
	const amount = ( minor / Math.pow( 10, decimals ) ).toLocaleString(
		undefined,
		{
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}
	);
	return ( ctx.currencySymbol || '' ) + amount;
}

/**
 * Apply a pill selection to the card's seeded context (multi-axis, SSR-safe).
 *
 * Mutates the seeded display keys on the live Interactivity proxy so the
 * data-wp-text / data-wp-bind directives re-render. Every key written here is a
 * plain seeded data key (never a JS getter) — a getter would resolve empty
 * server-side and wipe the SSR value.
 *
 * @param {Object} ctx    The card's live Interactivity context proxy.
 * @param {Object} detail The sgs:option-selected event detail { typeKey, selectedKey }.
 */
function applyPillSelection( ctx, detail ) {
	const typeKey = detail?.typeKey;
	const key = detail?.selectedKey;

	if (
		typeof typeKey !== 'string' || typeKey === '' ||
		typeof key !== 'string' || key === ''
	) {
		return;
	}

	// Simple / CPT card carries no manifest — nothing to swap.
	if ( ! ctx.combos ) {
		return;
	}

	// Update the selected axis immutably so the proxy detects the reference
	// change, then build the comboKey: taxonomy:slug pairs sorted ascending by
	// taxonomy, joined with "|". Must match the server format exactly.
	ctx.selectedAxes = { ...ctx.selectedAxes, [ typeKey ]: key };
	const comboKey = Object.keys( ctx.selectedAxes )
		.sort()
		.map( ( t ) => t + ':' + ctx.selectedAxes[ t ] )
		.join( '|' );

	const combo = ctx.combos[ comboKey ];

	if ( combo ) {
		// Valid combination — update all display keys.
		ctx.selectedKey = comboKey;
		ctx.selectedVariationId = combo.variationId;

		ctx.priceDisplay = formatPrice( combo.priceMinor, ctx );

		const onSale =
			combo.saleMinor !== null && combo.saleMinor !== undefined;
		ctx.showSale = onSale;
		ctx.hideSale = ! onSale;
		ctx.regularDisplay = onSale
			? formatPrice( combo.regularMinor, ctx )
			: '';
		ctx.pctDisplay = combo.pctOff > 0 ? combo.pctOff + '% off' : '';

		ctx.inStock = !! combo.inStock;
		ctx.stockText = combo.inStock ? '' : 'Out of stock';

		// M-C7: leave the current image if the variation has none.
		if ( combo.imageUrl ) {
			ctx.imageSrc = combo.imageUrl;
		}
	} else {
		// Invalid/unavailable combination (U5 will pre-grey these pills).
		// Set a safe non-purchasable state; do not touch price or image.
		ctx.selectedVariationId = 0;
		ctx.inStock = false;
		ctx.stockText = 'Unavailable';
	}
}

store( 'sgs/product-card', {
	callbacks: {
		/**
		 * Bridge the option-picker's `sgs:option-selected` custom event to the
		 * store. Runs once per card via data-wp-init. Captures the live context
		 * proxy and the card element, then listens for the bubbling pill event
		 * (the colon in the event name prevents a data-wp-on directive binding).
		 */
		initPillBridge() {
			const { ref } = getElement();
			if ( ! ref || ref.dataset.sgsPillBridge === '1' ) {
				return;
			}
			ref.dataset.sgsPillBridge = '1';

			const ctx = getContext();
			ref.addEventListener( 'sgs:option-selected', ( event ) => {
				applyPillSelection( ctx, event.detail );
			} );
		},
	},
	actions: {
		/**
		 * Add the bound product to the cart via the WC Store API, then
		 * announce the result and notify sgs/cart to re-read the count.
		 *
		 * A3: The button is rendered as an <a> so it degrades to a product-page
		 * link without JS. This action calls event.preventDefault() to intercept
		 * the navigation and handle the cart add via the Store API instead.
		 *
		 * A4: Guarded by context.pending to prevent spam clicks. Sets pending=true
		 * before any async work and clears it in the finally clause regardless of
		 * outcome. The <a> is disabled + aria-busy while pending via data-wp-bind.
		 *
		 * Generator action: the Interactivity API awaits yielded promises.
		 *
		 * @param {Event} event The click event from the <a> element.
		 */
		*addToCart( event ) {
			// A3: prevent the fallback link navigation when JS is active.
			if ( event && typeof event.preventDefault === 'function' ) {
				event.preventDefault();
			}

			const ctx = getContext();
			const id = parseInt( ctx.addToCartId, 10 );
			if ( ! id ) {
				return;
			}

			// A4: spam guard — bail immediately if a request is already in flight.
			if ( ctx.pending ) {
				return;
			}

			ctx.cartStatus = '';
			ctx.pending = true;

			try {
				const url = getStoreApiBase() + '/wc/store/v1/cart/add-item';

				// First request: read the rotating Store API nonce from the
				// response header (GET /cart returns a fresh `Nonce` header).
				const nonceRes = yield fetch(
					getStoreApiBase() + '/wc/store/v1/cart',
					{
						method: 'GET',
						credentials: 'same-origin',
					}
				);
				if ( ! nonceRes.ok ) {
					ctx.cartStatus =
						'Sorry, something went wrong adding this item.';
					return;
				}
				const nonce = nonceRes.headers.get( 'Nonce' ) || '';

				const headers = { 'Content-Type': 'application/json' };
				if ( nonce ) {
					headers.Nonce = nonce;
				}

				const response = yield fetch( url, {
					method: 'POST',
					credentials: 'same-origin',
					headers,
					body: JSON.stringify( { id, quantity: 1 } ),
				} );

				if ( ! response.ok ) {
					ctx.cartStatus =
						'Sorry, this item could not be added to your basket.';
					return;
				}

				ctx.cartStatus = 'Added to your basket.';

				// Notify the sgs/cart badge to re-fetch the authoritative count.
				// WC fires this itself when its own blocks are present; we dispatch
				// it unconditionally so the badge updates even on a WC-block-free page.
				document.dispatchEvent(
					new CustomEvent( 'wc-blocks_added_to_cart' )
				);
			} catch {
				ctx.cartStatus =
					'Sorry, something went wrong adding this item.';
			} finally {
				// A4: always clear pending so the button re-enables after the request.
				ctx.pending = false;
			}
		},
	},
} );

/**
 * SGS Product Card — Bound-mode frontend interactivity (viewScriptModule).
 *
 * Powers the Interactivity API store for the Bound product card:
 *   - Reactive price / image swapping when the visitor picks an option pill.
 *   - Add-to-cart via the WooCommerce Store API (no jQuery, no wc-blocks bundle).
 *
 * The pill block (sgs/option-picker) dispatches a bubbling DOM event on change:
 *   type   : 'sgs:option-selected'
 *   detail : { typeKey, selectedKey, contentImpact }
 * The verified field is `event.detail.selectedKey` (NOT `.value`).
 *
 * State shape (seeded server-side by render.php via wp_interactivity_state):
 *   variations: { [productId]: { [optionKey]: { price, image, imageAlt, inStock, impacts } } }
 *
 * Context (per card instance, seeded server-side by render.php):
 *   { productId, selected, addToCartId, imageSrc, imageAlt, cartStatus }
 *
 * No state mutation occurs for typed-mode cards — they carry no
 * data-wp-interactive attribute, so this store never binds to them.
 */

import { store, getContext } from '@wordpress/interactivity';

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

const { state } = store( 'sgs/product-card', {
	actions: {
		/**
		 * Handle the bubbling option-picker selection event.
		 *
		 * Mutates CONTEXT keys (imageSrc / imageAlt) rather than relying on
		 * JS-only derived getters: the directives bound to these keys are
		 * processed server-side too, so the values must be plain context
		 * data (a JS getter resolves to empty server-side and wipes the SSR
		 * value). Reads the VERIFIED field `event.detail.selectedKey`.
		 *
		 * Phase 1 note: `_sgs_variation_sets` carries no per-option image, so
		 * every option currently maps to the base image — selection updates
		 * `selected` but the image does not visibly change until per-option
		 * data lands (Phase 2). The wiring is correct and ready.
		 *
		 * @param {CustomEvent} event The sgs:option-selected event.
		 */
		handlePillSelect( event ) {
			const key = event?.detail?.selectedKey;
			if ( typeof key !== 'string' || key === '' ) {
				return;
			}
			const ctx = getContext();
			ctx.selected = key;

			const variation = state.variations?.[ ctx.productId ]?.[ key ];
			if ( variation ) {
				if ( variation.image ) {
					ctx.imageSrc = variation.image;
				}
				if ( typeof variation.imageAlt === 'string' ) {
					ctx.imageAlt = variation.imageAlt;
				}
			}
		},

		/**
		 * Add the bound product to the cart via the WC Store API, then
		 * announce the result and notify sgs/cart to re-read the count.
		 *
		 * Generator action: the Interactivity API awaits yielded promises.
		 */
		*addToCart() {
			const ctx = getContext();
			const id = parseInt( ctx.addToCartId, 10 );
			if ( ! id ) {
				return;
			}

			ctx.cartStatus = '';

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
			}
		},
	},
} );

/**
 * SGS Choice Flow — 'add-to-bag' terminal (Spec 43 FR-43-20, D3 v1.8.0).
 *
 * D3 (Bean's 2026-09-26 review): the terminal's own button moved out of
 * `sgs/choice-flow-result` and into `sgs/choice-flow`'s own footer, as "Add
 * to basket" and "Buy now" (Back left, these right) — since the footer is
 * the one element outside every step's markup, and different result steps
 * can switch each button on/off and relabel them independently
 * (`choice-flow-result/render.php`'s own `data-*` attributes, read via
 * `navigation.js`'s `getActiveResultEl()`). Both send the SAME add-to-cart
 * request; "Buy now" additionally redirects to `data-checkout-url`
 * (`wc_get_checkout_url()`, seeded by `choice-flow-result/render.php`) on
 * success.
 *
 * Split out of `pricing.js` (which was itself already split out of `view.js`
 * to respect this codebase's 250-line JS guideline) — this file owns only
 * the terminal's cart/checkout requests; `pricing.js` owns the accumulated
 * add-on state it reads via `getAddonSummary()`.
 *
 * @package SGS\Blocks
 */

import { getAddonSummary } from './pricing.js';
import { collectFlowFields, validateTerminalFields } from './flow-fields.js';
import { getResolvedVariation } from './variation.js';
import { FLOW_SELECTOR, getActiveResultEl } from './navigation.js';

/**
 * Whether this flow ever asked a variation-mode product-option question
 * (Spec 43 FR-43-10 — `data-flow-combos` is seeded on the flow root only
 * when at least one descendant `sgs/choice-flow-question` has a
 * `productAttribute` in variation mode).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {boolean} True when the flow has at least one variation-mode step.
 */
function flowHasVariationSteps( flowRoot ) {
	return flowRoot.hasAttribute( 'data-flow-combos' );
}

/**
 * D3 — shared implementation for both footer buttons: validates the
 * terminal's own fields, resolves what's being bought, POSTs to the SGS
 * secure proxy exactly as `sgs/product-card`'s own `addToCart` action does,
 * then (for "Buy now" only) redirects to checkout on success.
 *
 * @param {HTMLElement} buttonEl           The clicked footer button.
 * @param {boolean}     redirectToCheckout True for "Buy now", false for "Add to basket".
 */
async function handleTerminalPurchase( buttonEl, redirectToCheckout ) {
	if ( buttonEl.disabled ) {
		return;
	}

	const flowRoot = buttonEl.closest( FLOW_SELECTOR );
	if ( ! flowRoot ) {
		return;
	}
	const resultEl = getActiveResultEl( flowRoot );
	if ( ! resultEl ) {
		return;
	}

	// FR-43-21: the purchase step's own fields must be complete first.
	if ( ! validateTerminalFields( resultEl ) ) {
		return;
	}

	const statusEl = resultEl.querySelector( '.sgs-choice-flow-result__cart-status' );
	const endpoint = resultEl.getAttribute( 'data-endpoint' );
	const nonce = resultEl.getAttribute( 'data-nonce' );
	const checkoutUrl = resultEl.getAttribute( 'data-checkout-url' ) || '';

	// FR-43-10a: the flow's own variation-mode product-option steps are the
	// authority on what's being bought when they resolve — they override a
	// page buybox's base. Only when they DON'T resolve (this flow has no such
	// steps at all) does the existing buybox/seeded base apply.
	const resolvedVariation = getResolvedVariation( flowRoot );
	const { productId, variationId, attributes, addons } = getAddonSummary( flowRoot );

	if ( flowHasVariationSteps( flowRoot ) && ! resolvedVariation ) {
		if ( statusEl ) {
			statusEl.dataset.state = 'error';
			statusEl.textContent = 'Please choose every option above before adding this to your bag.';
		}
		return;
	}

	const finalProductId = resolvedVariation ? resolvedVariation.productId : productId;
	const finalVariationId = resolvedVariation ? resolvedVariation.variationId : variationId;
	const finalAttributes = resolvedVariation ? resolvedVariation.attributes : attributes;

	if ( ! finalProductId && ! finalVariationId ) {
		if ( statusEl ) {
			statusEl.dataset.state = 'error';
			statusEl.textContent = 'No product to add — please start again from the product page.';
		}
		return;
	}

	const id = finalVariationId > 0 ? finalVariationId : finalProductId;
	// Taxonomy-keyed (the proxy accepts taxonomy-keyed attributes) —
	// identical shape whether the attributes came from the flow's own
	// resolution or the buybox fallback.
	const variation = Object.entries( finalAttributes ).map( ( [ attribute, value ] ) => ( {
		attribute,
		value,
	} ) );

	const body = { id, quantity: 1, addons };
	const fields = collectFlowFields( flowRoot, resultEl );
	if ( fields.length ) {
		body.fields = fields;
	}
	if ( variation.length ) {
		body.variation = variation;
	}

	buttonEl.disabled = true;
	buttonEl.setAttribute( 'aria-busy', 'true' );
	if ( statusEl ) {
		delete statusEl.dataset.state;
		statusEl.textContent = '';
	}

	try {
		const response = await fetch( endpoint, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': nonce || '',
			},
			body: JSON.stringify( body ),
		} );

		if ( ! response.ok ) {
			let message = 'Sorry, this item could not be added to your bag.';
			try {
				const errorJson = await response.json();
				if ( errorJson && errorJson.message ) {
					message = errorJson.message;
				}
			} catch ( _e ) {
				// Ignore parse errors — use the default message above.
			}
			if ( statusEl ) {
				statusEl.dataset.state = 'error';
				statusEl.textContent = message;
			}
			return;
		}

		if ( statusEl ) {
			statusEl.dataset.state = 'success';
			statusEl.textContent = redirectToCheckout ? 'Added — taking you to checkout…' : 'Added to your bag.';
		}

		// Same post-success signalling as sgs/product-card's own addToCart —
		// so a page's mini-cart/bag badge updates regardless of which block
		// added the item.
		document.dispatchEvent( new CustomEvent( 'wc-blocks_added_to_cart' ) );
		window.dispatchEvent( new CustomEvent( 'sgs-cart-updated' ) );
		document.querySelector( '.wc-block-mini-cart__button' )?.click();

		if ( redirectToCheckout && checkoutUrl ) {
			window.location.assign( checkoutUrl );
			return; // Navigating away — no point re-enabling the button below.
		}
	} catch ( _e ) {
		if ( statusEl ) {
			statusEl.dataset.state = 'error';
			statusEl.textContent = 'Sorry, something went wrong adding this item.';
		}
	} finally {
		buttonEl.disabled = false;
		buttonEl.removeAttribute( 'aria-busy' );
	}
}

/**
 * Handle a click on the flow footer's "Add to basket" button.
 *
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow__add-to-basket`.
 */
export async function handleAddToBasketClick( buttonEl ) {
	await handleTerminalPurchase( buttonEl, false );
}

/**
 * Handle a click on the flow footer's "Buy now" button — the same
 * add-to-cart request, then straight to checkout on success.
 *
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow__buy-now`.
 */
export async function handleBuyNowClick( buttonEl ) {
	await handleTerminalPurchase( buttonEl, true );
}

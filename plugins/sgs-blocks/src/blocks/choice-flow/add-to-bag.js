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

import { toastActions } from '../../shared/toast/store.js';
import { getAddonSummary, resetAddonAnswers } from './pricing.js';
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
 * The one add-to-bag request, shared by the footer buttons and the skip link
 * (N38): resolves what is being bought, POSTs to the SGS secure proxy exactly
 * as `sgs/product-card`'s own `addToCart` action does, reports the outcome
 * to the shared toast, and (for "Buy now" only) redirects to checkout on
 * success.
 *
 * `bareFrame` is the skip link's add: the product and its chosen variation
 * with no add-ons, no purchase-step fields, and no demand that the flow's own
 * variation steps have resolved (the first question is all the shopper has
 * seen). Its problems go to the toast, since the result step's status region
 * is on a step that is not showing.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {HTMLElement} resultEl The `add-to-bag` result carrying the endpoint, nonce and checkout URL.
 * @param {Object}      options
 * @param {HTMLElement} options.buttonEl           The control that was pressed (disabled while the request runs).
 * @param {boolean}     options.redirectToCheckout True for "Buy now".
 * @param {boolean}     options.bareFrame          True for the skip link's frame-only add.
 * @return {Promise<boolean>} True when the item was added.
 */
async function addFlowToBag( flowRoot, resultEl, { buttonEl, redirectToCheckout, bareFrame } ) {
	// In the normal path this region is VALIDATION ONLY. The outcome of the
	// add request itself goes to the one shared toast; a "you haven't
	// finished choosing" message has to stay next to the controls that are
	// unfinished (WCAG 3.3.1), and a toast that clears itself after 5s cannot
	// do that. It is the same in-context treatment validateTerminalFields()
	// already gives a required field via reportValidity().
	const statusEl = resultEl.querySelector( '.sgs-choice-flow-result__cart-status' );
	const reportProblem = ( message ) => {
		if ( bareFrame ) {
			toastActions.showError( message );
		} else if ( statusEl ) {
			statusEl.dataset.state = 'error';
			statusEl.textContent = message;
		}
	};
	const endpoint = resultEl.getAttribute( 'data-endpoint' );
	const nonce = resultEl.getAttribute( 'data-nonce' );
	const checkoutUrl = resultEl.getAttribute( 'data-checkout-url' ) || '';

	// FR-43-10a: the flow's own variation-mode product-option steps are the
	// authority on what's being bought when they resolve — they override a
	// page buybox's base. Only when they DON'T resolve (this flow has no such
	// steps at all) does the existing buybox/seeded base apply.
	const resolvedVariation = getResolvedVariation( flowRoot );
	const { productId, variationId, attributes, addons } = getAddonSummary( flowRoot );

	if ( ! bareFrame && flowHasVariationSteps( flowRoot ) && ! resolvedVariation ) {
		reportProblem( 'Please choose every option above before adding this to your bag.' );
		return false;
	}

	const finalProductId = resolvedVariation ? resolvedVariation.productId : productId;
	const finalVariationId = resolvedVariation ? resolvedVariation.variationId : variationId;
	const finalAttributes = resolvedVariation ? resolvedVariation.attributes : attributes;

	if ( ! finalProductId && ! finalVariationId ) {
		reportProblem( 'No product to add — please start again from the product page.' );
		return false;
	}

	const id = finalVariationId > 0 ? finalVariationId : finalProductId;
	// Taxonomy-keyed (the proxy accepts taxonomy-keyed attributes) —
	// identical shape whether the attributes came from the flow's own
	// resolution or the buybox fallback.
	const variation = Object.entries( finalAttributes ).map( ( [ attribute, value ] ) => ( {
		attribute,
		value,
	} ) );

	const body = { id, quantity: 1, addons: bareFrame ? [] : addons };
	const fields = bareFrame ? [] : collectFlowFields( flowRoot, resultEl );
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
			toastActions.showError( message );
			return false;
		}

		toastActions.showSuccess(
			redirectToCheckout
				? 'Added — taking you to checkout…'
				: 'Added to your bag.'
		);

		// Same post-success signalling as sgs/product-card's own addToCart —
		// so a page's mini-cart/bag badge updates regardless of which block
		// added the item. The bag drawer is deliberately NOT opened: the
		// toast's "View bag" is the way in.
		document.dispatchEvent( new CustomEvent( 'wc-blocks_added_to_cart' ) );
		window.dispatchEvent( new CustomEvent( 'sgs-cart-updated' ) );

		if ( redirectToCheckout && checkoutUrl ) {
			window.location.assign( checkoutUrl );
		}
		return true;
	} catch ( _e ) {
		toastActions.showError( 'Sorry, something went wrong adding this item.' );
		return false;
	} finally {
		buttonEl.disabled = false;
		buttonEl.removeAttribute( 'aria-busy' );
	}
}

/**
 * D3 — shared implementation for both footer buttons: validates the
 * terminal's own fields, then adds via `addFlowToBag()`.
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

	await addFlowToBag( flowRoot, resultEl, { buttonEl, redirectToCheckout, bareFrame: false } );
}

/**
 * N38 — the skip link's add: the bare frame (product and chosen variation,
 * no add-ons) goes to the bag through the same request the footer's "Add to
 * basket" sends.
 *
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow__skip-button`.
 * @return {Promise<boolean>} True when the frame was added; false when it could not be (an error toast has been shown).
 */
export async function addFrameToBag( buttonEl ) {
	if ( buttonEl.disabled ) {
		return false;
	}
	const flowRoot = buttonEl.closest( FLOW_SELECTOR );
	const resultEl = flowRoot ? flowRoot.querySelector( '[data-action="add-to-bag"][data-endpoint]' ) : null;
	if ( ! resultEl ) {
		toastActions.showError( 'Sorry, this item could not be added to your bag.' );
		return false;
	}
	// The frame alone: the request sends no add-ons (`bareFrame`). The shopper's
	// picks are dropped only once the frame is in the bag, so a failed add
	// leaves the pop-up exactly as it was.
	const added = await addFlowToBag( flowRoot, resultEl, { buttonEl, redirectToCheckout: false, bareFrame: true } );
	if ( added ) {
		resetAddonAnswers( flowRoot );
	}
	return added;
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

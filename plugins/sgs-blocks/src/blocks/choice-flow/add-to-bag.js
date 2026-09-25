/**
 * SGS Choice Flow — 'add-to-bag' terminal (Spec 43 FR-43-20, v1.4.0).
 *
 * Split out of `pricing.js` (which was itself already split out of `view.js`
 * to respect this codebase's 250-line JS guideline) — this file owns only
 * the terminal button's click handling; `pricing.js` owns the accumulated
 * add-on state it reads via `getAddonSummary()`.
 *
 * @package SGS\Blocks
 */

import { getAddonSummary } from './pricing.js';
import { collectFlowFields, validateTerminalFields } from './flow-fields.js';
import { getResolvedVariation } from './variation.js';

/**
 * Whether this flow ever asked a variation-mode product-option question
 * (Spec 43 FR-43-10 — `data-flow-combos` is seeded on the flow
 * root only when at least one descendant `sgs/choice-flow-question` has a
 * `productAttribute` in variation mode; it's absent for every other flow).
 * Used to tell "this is a simple/answer-mode flow with no variation to
 * resolve" (fine — falls straight to the buybox base) apart from "this flow
 * IS variable but the shopper's picks don't (yet) resolve to a purchasable
 * combo" (an error, not a silent fallback).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {boolean} True when the flow has at least one variation-mode step.
 */
function flowHasVariationSteps( flowRoot ) {
	return flowRoot.hasAttribute( 'data-flow-combos' );
}

/**
 * Handle a click on a `sgs/choice-flow-result` "Add to bag" button
 * (`action: "add-to-bag"`, FR-43-20). POSTs to the SGS secure proxy exactly
 * as `sgs/product-card`'s own `addToCart` action does — same nonce header,
 * same endpoint shape, same success signalling — so the site's mini-cart/
 * bag badge updates identically regardless of which block added the item.
 *
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow-result__add-to-bag`.
 */
export async function handleAddToBagClick( buttonEl ) {
	if ( buttonEl.disabled ) {
		return;
	}

	const flowRoot = buttonEl.closest( '[data-wp-interactive="sgs/choice-flow"]' );
	const resultEl = buttonEl.closest( '.sgs-choice-flow-result' );
	if ( ! flowRoot || ! resultEl ) {
		return;
	}

	// FR-43-21: the purchase step's own fields must be complete first.
	if ( ! validateTerminalFields( resultEl ) ) {
		return;
	}

	const summaryEl = resultEl.querySelector( '.sgs-choice-flow-result__addon-summary' );
	const statusEl = resultEl.querySelector( '.sgs-choice-flow-result__cart-status' );
	const endpoint = buttonEl.getAttribute( 'data-endpoint' );
	const nonce = buttonEl.getAttribute( 'data-nonce' );

	// FR-43-10a: the flow's own variation-mode product-option
	// steps are the authority on what's being bought when they resolve —
	// they override a page buybox's base, per the same section's precedence
	// rule. Only when they DON'T resolve (this flow has no such steps at
	// all) does the existing buybox/seeded base apply.
	const resolvedVariation = getResolvedVariation( flowRoot );
	const { productId, variationId, attributes, addons, rows } = getAddonSummary( flowRoot );

	if ( summaryEl ) {
		summaryEl.textContent = rows.length
			? rows.map( ( row ) => `${ row.label } (${ row.priceLabel })` ).join( ' · ' )
			: '';
	}

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
	// Taxonomy-keyed (the proxy accepts taxonomy-keyed
	// attributes) — identical shape whether the attributes came from the
	// flow's own resolution or the buybox fallback.
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
			statusEl.textContent = 'Added to your bag.';
		}

		// Same post-success signalling as sgs/product-card's own addToCart —
		// so a page's mini-cart/bag badge updates regardless of which block
		// added the item.
		document.dispatchEvent( new CustomEvent( 'wc-blocks_added_to_cart' ) );
		window.dispatchEvent( new CustomEvent( 'sgs-cart-updated' ) );
		document.querySelector( '.wc-block-mini-cart__button' )?.click();
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

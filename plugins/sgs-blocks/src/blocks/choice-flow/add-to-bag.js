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

	const { productId, variationId, attributes, addons, rows } = getAddonSummary( flowRoot );

	if ( summaryEl ) {
		summaryEl.textContent = rows.length
			? rows.map( ( row ) => `${ row.label } (${ row.priceLabel })` ).join( ' · ' )
			: '';
	}

	if ( ! productId && ! variationId ) {
		if ( statusEl ) {
			statusEl.dataset.state = 'error';
			statusEl.textContent = 'No product to add — please start again from the product page.';
		}
		return;
	}

	const id = variationId > 0 ? variationId : productId;
	const variation = Object.entries( attributes ).map( ( [ attribute, value ] ) => ( {
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

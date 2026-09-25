/**
 * SGS Choice Flow — 'email' terminal (Spec 43 FR-43-4).
 *
 * Same shape as `add-to-bag.js`: a click/submit handler that POSTs to the
 * SGS forms engine's own choice-flow route
 * (`/sgs/v1/choice-flow/submit`, `includes/forms/class-choice-flow-submit.php`)
 * using the nonce + endpoint `render.php` already embedded as `data-*` on
 * the submit button, exactly as `sgs/product-card`'s own `addToCart` action
 * and this block's own `handleAddToBagClick` read theirs.
 *
 * @package SGS\Blocks
 */

import { collectFlowFields } from './flow-fields.js';

/**
 * Wire every `sgs/choice-flow-result` email-capture form inside this flow
 * instance. Safe to call more than once per flow root (each form is bound
 * only the first time it is seen).
 *
 * @param {HTMLElement}           flowEl  The flow's root element
 *                                          (`[data-wp-interactive="sgs/choice-flow"]`).
 * @param {() => Array<string>} getTags Returns the tags gathered along the path taken.
 */
export function initEmailResults( flowEl, getTags ) {
	if ( ! flowEl ) {
		return;
	}
	const forms = flowEl.querySelectorAll( '.sgs-choice-flow-result__email-form' );
	forms.forEach( ( formEl ) => {
		if ( formEl.dataset.sgsEmailBound ) {
			return;
		}
		formEl.dataset.sgsEmailBound = '1';
		formEl.addEventListener( 'submit', ( event ) => {
			handleEmailSubmit( event, flowEl, getTags );
		} );
	} );
}

/**
 * Handle a submit on one email-capture form.
 *
 * @param {SubmitEvent}  event  The form's submit event.
 * @param {HTMLElement}  flowEl  The flow's root element.
 * @param {Function}     getTags Returns the tags gathered along the path taken.
 */
async function handleEmailSubmit( event, flowEl, getTags ) {
	event.preventDefault();

	const formEl = event.currentTarget;
	const resultEl = formEl.closest( '.sgs-choice-flow-result' );
	const buttonEl = formEl.querySelector( '.sgs-choice-flow-result__email-submit' );
	const statusEl = formEl.querySelector( '.sgs-choice-flow-result__email-status' );
	const successEl = resultEl ? resultEl.querySelector( '.sgs-choice-flow-result__email-success' ) : null;
	const emailInput = formEl.querySelector( '.sgs-choice-flow-result__email-input' );
	const honeypotInput = formEl.querySelector( '.sgs-choice-flow-result__honeypot input' );

	if ( ! buttonEl || ! resultEl || ! emailInput ) {
		return;
	}
	if ( ! formEl.checkValidity() ) {
		formEl.reportValidity();
		return;
	}

	const endpoint = buttonEl.getAttribute( 'data-endpoint' );
	const nonce = buttonEl.getAttribute( 'data-nonce' );
	const flowRef = buttonEl.getAttribute( 'data-flow-ref' ) || '';

	// The path's unpriced answers (plainAnswers only — an email terminal has
	// no purchase-step file/text fields of its own, but collectFlowFields()
	// degrades safely to just the answers when resultEl carries none).
	const answers = collectFlowFields( flowEl, resultEl ).map( ( { label, value } ) => ( {
		label,
		value: value || '',
	} ) );

	const body = {
		flowRef,
		email: emailInput.value.trim(),
		answers,
		tags: 'function' === typeof getTags ? getTags() : [],
		sgs_hp: honeypotInput ? honeypotInput.value : '',
	};

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

		let result = {};
		try {
			result = await response.json();
		} catch ( _e ) {
			// No JSON body — the generic error message below is used instead.
		}

		if ( ! response.ok || ! result.success ) {
			const message = ( result && result.message ) || 'Sorry, something went wrong. Please try again.';
			if ( statusEl ) {
				statusEl.dataset.state = 'error';
				statusEl.textContent = message;
			}
			return;
		}

		formEl.hidden = true;
		if ( successEl ) {
			successEl.hidden = false;
		}
		if ( statusEl ) {
			statusEl.textContent = '';
		}
	} catch ( _e ) {
		if ( statusEl ) {
			statusEl.dataset.state = 'error';
			statusEl.textContent = 'Sorry, something went wrong. Please try again.';
		}
	} finally {
		buttonEl.disabled = false;
		buttonEl.removeAttribute( 'aria-busy' );
	}
}

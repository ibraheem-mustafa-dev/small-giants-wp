/**
 * sgs/buybox — back-in-stock notify-me form handler.
 *
 * Self-contained ES module. No @wordpress/interactivity import, no store
 * access. Pure progressive enhancement: attaches a submit listener to each
 * .sgs-buybox__notify-form on the page and POSTs to /wp-json/sgs/v1/notify/subscribe.
 *
 * Status messages are written via textContent (XSS-inert). Turnstile is reset
 * on error so the user can retry without a page reload.
 *
 * @since 1.18.0 (FR-30-10 Spec 30 Step 10)
 */

/**
 * Attach submit handlers to all notify forms on the page.
 */
function initNotifyForms() {
	const forms = document.querySelectorAll( '.sgs-buybox__notify-form' );

	forms.forEach( ( form ) => {
		form.addEventListener( 'submit', handleSubmit );
	} );
}

/**
 * Handle form submission.
 *
 * @param {SubmitEvent} event
 */
async function handleSubmit( event ) {
	event.preventDefault();

	const form = /** @type {HTMLFormElement} */ ( event.currentTarget );
	const statusEl = form.querySelector( '.sgs-buybox__notify-status' );

	// -- Read field values ---------------------------------------------------
	const emailInput = form.querySelector( 'input[type="email"]' );
	const consentInput = form.querySelector( 'input[type="checkbox"]' );
	const tokenInput = form.querySelector( 'input[name="cf-turnstile-response"]' );
	const productId = parseInt( form.dataset.productId, 10 );
	const nonce = form.dataset.nonce || '';

	const email = emailInput ? emailInput.value.trim() : '';
	const consent = consentInput ? consentInput.checked : false;
	const turnstileToken = tokenInput ? tokenInput.value : '';

	// -- Client-side guard ---------------------------------------------------
	if ( ! email ) {
		if ( statusEl ) {
			statusEl.textContent = 'Please enter your email address.';
		}
		if ( emailInput ) {
			emailInput.focus();
		}
		return;
	}

	if ( ! consent ) {
		if ( statusEl ) {
			statusEl.textContent = 'Please tick the consent box to continue.';
		}
		if ( consentInput ) {
			consentInput.focus();
		}
		return;
	}

	// -- Clear previous status -----------------------------------------------
	if ( statusEl ) {
		statusEl.textContent = '';
		statusEl.removeAttribute( 'data-status' );
	}

	// -- Disable submit while pending ----------------------------------------
	const submitBtn = form.querySelector( 'button[type="submit"]' );
	if ( submitBtn ) {
		submitBtn.disabled = true;
	}

	try {
		const response = await fetch( '/wp-json/sgs/v1/notify/subscribe', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': nonce,
			},
			body: JSON.stringify( {
				productId,
				email,
				consent,
				turnstileToken,
			} ),
		} );

		if ( response.ok ) {
			// Success — clear inputs and show confirmation.
			if ( emailInput ) {
				emailInput.value = '';
			}
			if ( consentInput ) {
				consentInput.checked = false;
			}
			if ( statusEl ) {
				statusEl.setAttribute( 'data-status', 'success' );
				statusEl.textContent = "✓ You’ll be notified when this is back in stock.";
			}
			resetTurnstile( form );
		} else {
			// Server error — surface the message.
			let message = "Something went wrong. Please try again.";
			try {
				const body = await response.json();
				if ( body && body.message ) {
					message = body.message;
				}
			} catch ( _e ) {
				// JSON parse failed — keep the generic message.
			}
			if ( statusEl ) {
				statusEl.setAttribute( 'data-status', 'error' );
				statusEl.textContent = "! " + message;
			}
			resetTurnstile( form );
		}
	} catch ( networkError ) {
		if ( statusEl ) {
			statusEl.setAttribute( 'data-status', 'error' );
			statusEl.textContent = "! Network error. Please check your connection and try again.";
		}
		resetTurnstile( form );
	} finally {
		if ( submitBtn ) {
			submitBtn.disabled = false;
		}
	}
}

/**
 * Reset the Turnstile widget inside the given form (if present and available).
 *
 * @param {HTMLFormElement} form
 */
function resetTurnstile( form ) {
	const widget = form.querySelector( '.cf-turnstile' );
	if ( widget && window.turnstile && typeof window.turnstile.reset === 'function' ) {
		window.turnstile.reset( widget );
	}
}

// -- Initialise on DOM ready -------------------------------------------------
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initNotifyForms );
} else {
	initNotifyForms();
}
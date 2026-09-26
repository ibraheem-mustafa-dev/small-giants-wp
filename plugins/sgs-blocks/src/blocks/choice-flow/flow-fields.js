/**
 * SGS Choice Flow — answers and fields carried to the bag (Spec 43 FR-43-21).
 *
 * Two things travel with an add-to-bag request beside the priced add-on
 * pairs: the answer to every unpriced question on the path taken, and the
 * text / number / file fields placed in the purchase step itself. File fields
 * upload as soon as a file is picked, to a cart-scoped endpoint that stamps
 * the file with this shopper's cart session; only the attachment ID travels.
 *
 * @package SGS\Blocks
 */

/**
 * Unpriced answers per flow instance, in the order they were given.
 *
 * @type {WeakMap<HTMLElement, Array<{stepIndex: number, label: string, value: string}>>}
 */
const plainAnswers = new WeakMap();

/**
 * Record the answer to an unpriced question.
 *
 * @param {HTMLElement} flowRoot  Flow wrapper element.
 * @param {number}      stepIndex The question's step index.
 * @param {HTMLElement} stepEl    The question's step (its `data-step-label` names the answer).
 * @param {HTMLElement} buttonEl  The chosen option.
 */
export function recordPlainAnswer( flowRoot, stepIndex, stepEl, buttonEl ) {
	const labelEl = buttonEl.querySelector( '.sgs-choice-flow-question__option-label' );
	const value = ( labelEl ? labelEl.textContent : buttonEl.getAttribute( 'data-value' ) || '' ).trim();
	const label = ( stepEl.getAttribute( 'data-step-label' ) || '' ).trim();
	if ( ! label || ! value ) {
		return;
	}
	const list = plainAnswers.get( flowRoot ) || [];
	plainAnswers.set( flowRoot, [ ...list.filter( ( answer ) => answer.stepIndex !== stepIndex ), { stepIndex, label, value } ] );
}

/**
 * The unpriced answers recorded so far, in path order — a snapshot copy, so
 * mutating the result never affects flow state. Read by `summary.js` to
 * build the D4 summary panel's plain-answer and product-option-answer rows
 * (a product-option step's unpriced choice is recorded the same way as a
 * plain question's, via `recordPlainAnswer()` above — see `variation.js`).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {Array<{stepIndex: number, label: string, value: string}>} Answers given so far.
 */
export function getPlainAnswers( flowRoot ) {
	return ( plainAnswers.get( flowRoot ) || [] ).slice();
}

/**
 * The shopper went Back to `stepIndex`: that answer and every later one no
 * longer describe the path.
 *
 * @param {HTMLElement} flowRoot  Flow wrapper element.
 * @param {number}      stepIndex The step returned to.
 */
export function forgetAnswersFrom( flowRoot, stepIndex ) {
	const list = plainAnswers.get( flowRoot );
	if ( list ) {
		plainAnswers.set( flowRoot, list.filter( ( answer ) => answer.stepIndex < stepIndex ) );
	}
}

/**
 * The form fields in the purchase step (the result's own step).
 *
 * @param {HTMLElement} resultEl The `.sgs-choice-flow-result`.
 * @return {HTMLElement[]} Field wrappers.
 */
function terminalFields( resultEl ) {
	const stepEl = resultEl.closest( '.sgs-form-step' );
	return stepEl ? Array.from( stepEl.querySelectorAll( '.sgs-form-field' ) ) : [];
}

/**
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {string} The field's visible label.
 */
function fieldLabel( fieldEl ) {
	const labelEl = fieldEl.querySelector( 'label' );
	if ( ! labelEl ) {
		return '';
	}
	// Without the required marker and its screen-reader "(required)".
	const copy = labelEl.cloneNode( true );
	copy.querySelectorAll( '.sgs-form-field__required, .sgs-sr-only' ).forEach( ( el ) => el.remove() );
	return copy.textContent.trim();
}

/**
 * Check the purchase step's required fields before anything is sent; the
 * first problem is reported by the browser on that field.
 *
 * @param {HTMLElement} resultEl The `.sgs-choice-flow-result`.
 * @return {boolean} True when every field is fine.
 */
export function validateTerminalFields( resultEl ) {
	for ( const fieldEl of terminalFields( resultEl ) ) {
		const fileInput = fieldEl.querySelector( 'input[type="file"]' );
		if ( fileInput ) {
			const idInput = fieldEl.querySelector( 'input[data-file-id]' );
			const uploaded = idInput && idInput.getAttribute( 'data-file-id' );
			if ( fileInput.required && ! uploaded ) {
				fileInput.setCustomValidity( fileInput.files.length ? 'Your photo is still uploading.' : 'Please add a photo.' );
				fileInput.reportValidity();
				return false;
			}
			fileInput.setCustomValidity( '' );
			continue;
		}
		const input = fieldEl.querySelector( 'input:not([type="hidden"]), select, textarea' );
		if ( input && ! input.checkValidity() ) {
			input.reportValidity();
			return false;
		}
	}
	return true;
}

/**
 * Everything to send as `fields`: the path's unpriced answers, then the
 * purchase step's filled-in fields.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {HTMLElement} resultEl The `.sgs-choice-flow-result`.
 * @return {Array<{label: string, value?: string, file_id?: number}>} Entries.
 */
export function collectFlowFields( flowRoot, resultEl ) {
	const entries = ( plainAnswers.get( flowRoot ) || [] ).map( ( { label, value } ) => ( { label, value } ) );
	for ( const fieldEl of terminalFields( resultEl ) ) {
		const label = fieldLabel( fieldEl );
		if ( ! label ) {
			continue;
		}
		const idInput = fieldEl.querySelector( 'input[data-file-id]' );
		if ( fieldEl.querySelector( 'input[type="file"]' ) ) {
			const fileId = parseInt( idInput ? idInput.getAttribute( 'data-file-id' ) : '', 10 );
			if ( fileId > 0 ) {
				entries.push( { label, file_id: fileId } );
			}
			continue;
		}
		const input = fieldEl.querySelector( 'input:not([type="hidden"]), select, textarea' );
		const value = input ? String( input.value || '' ).trim() : '';
		if ( value ) {
			entries.push( { label, value } );
		}
	}
	return entries;
}

/**
 * Upload a picked file for a purchase step (the file field's own
 * `data-wp-on--change="actions.uploadFile"`, resolved by this block's store).
 * The endpoint and nonce come from the flow's add-to-bag button.
 *
 * @param {Event} event The file input's change event.
 */
export async function uploadFlowFile( event ) {
	const input = event.target;
	const fieldEl = input.closest( '.sgs-form-field' );
	const stepEl = input.closest( '.sgs-form-step' );
	const buttonEl = stepEl ? stepEl.querySelector( '.sgs-choice-flow-result__add-to-bag' ) : null;
	const file = input.files && input.files[ 0 ];
	if ( ! fieldEl || ! buttonEl || ! file ) {
		return;
	}
	const idInput = fieldEl.querySelector( 'input[data-file-id]' );
	const progressEl = fieldEl.querySelector( '.sgs-form-file__progress' );
	const previewEl = fieldEl.querySelector( '.sgs-form-file__preview' );
	const errorEl = fieldEl.querySelector( '.sgs-form-field__error' );
	const endpoint = ( buttonEl.getAttribute( 'data-endpoint' ) || '' ).replace( /\/cart\/add-item$/, '/cart/upload' );

	if ( idInput ) {
		idInput.setAttribute( 'data-file-id', '' );
	}
	if ( progressEl ) {
		progressEl.hidden = false;
	}
	if ( errorEl ) {
		errorEl.textContent = '';
	}

	try {
		const body = new FormData();
		body.append( 'file', file );
		const response = await fetch( endpoint, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'X-WP-Nonce': buttonEl.getAttribute( 'data-nonce' ) || '' },
			body,
		} );
		const result = await response.json().catch( () => ( {} ) );
		if ( ! response.ok || ! result.id ) {
			throw new Error( result.message || 'Upload failed. Please try again.' );
		}
		if ( idInput ) {
			idInput.setAttribute( 'data-file-id', String( result.id ) );
		}
		input.setCustomValidity( '' );
		if ( previewEl ) {
			previewEl.hidden = false;
			previewEl.textContent = `✓ ${ result.name || file.name }`;
		}
	} catch ( error ) {
		input.value = '';
		if ( errorEl ) {
			errorEl.textContent = error.message;
		}
	} finally {
		if ( progressEl ) {
			progressEl.hidden = true;
		}
	}
}

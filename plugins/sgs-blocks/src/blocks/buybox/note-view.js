/**
 * sgs/buybox free-text note (Spec 27 FR-27-PS8).
 *
 * Plain DOM, no store. The textarea is outside the cart form, so this module keeps the text on the buy box root as
 * `data-extra-note` (JSON `{label, value, note}`), which product-card/view.js::buildAddBody adds to the cart proxy's
 * `fields` and `expressFields` hands to the express payment buttons. `data-sgs-note-ready` is "0" while a compulsory note is
 * empty: the buttons stay inert (`expressUsable`) and the add is refused here, before the product-card store's own submit.
 * `sgs:picks-changed` (the existing "the choices changed" event) is sent when the readiness flips and when the shopper leaves
 * the box, not on every key, because the express amount is recalculated on the server each time it fires.
 *
 * @package SGS\Blocks
 */

import { charsLeft, isNearLimit, noteRow, noteReady } from './note-logic.js';

const ROOT_SELECTOR = '.sgs-buybox';

function initNote( box ) {
	const root = box.closest( ROOT_SELECTOR );
	const input = box.querySelector( '.sgs-buybox__note-input' );
	if ( ! root || ! input || '1' === box.dataset.sgsNoteInit ) {
		return;
	}
	box.dataset.sgsNoteInit = '1';

	const max = parseInt( box.dataset.max, 10 ) || 300;
	const required = '1' === box.dataset.required;
	const label = box.dataset.label || '';
	const count = box.querySelector( '.sgs-buybox__note-count' );
	const status = box.querySelector( '.sgs-buybox__note-status' );
	const error = box.querySelector( '.sgs-buybox__note-error' );
	const leftMessage = box.dataset.leftMessage || '%d';
	let lastSpoken = '';

	function publish() {
		const row = noteRow( label, input.value, max );
		const ready = noteReady( required, input.value ) ? '1' : '0';
		if ( row ) {
			root.dataset.extraNote = JSON.stringify( row );
		} else {
			delete root.dataset.extraNote;
		}
		const flipped = root.dataset.sgsNoteReady !== ready;
		root.dataset.sgsNoteReady = ready;
		return flipped;
	}

	function draw() {
		const left = charsLeft( input.value, max );
		if ( count ) {
			count.textContent = `${ max - left } / ${ max }`;
		}
		// The count is spoken only near the limit, and only when it changes, so typing is not narrated.
		const spoken = isNearLimit( left, max ) ? leftMessage.replace( '%d', String( left ) ) : '';
		if ( status && spoken !== lastSpoken ) {
			status.textContent = spoken;
			lastSpoken = spoken;
		}
	}

	function clearError() {
		if ( error && ! error.hidden ) {
			error.hidden = true;
			error.textContent = '';
			input.removeAttribute( 'aria-invalid' );
		}
	}

	input.addEventListener( 'input', () => {
		draw();
		clearError();
		if ( publish() ) {
			root.dispatchEvent( new CustomEvent( 'sgs:picks-changed' ) );
		}
	} );
	input.addEventListener( 'change', () => {
		publish();
		root.dispatchEvent( new CustomEvent( 'sgs:picks-changed' ) );
	} );

	// The add gate: ROOT is an ancestor of the cart form, so this capture listener runs before product-card's own submit.
	root.addEventListener(
		'submit',
		( event ) => {
			if ( ! event.target.matches || ! event.target.matches( '.buybox__cart-form' ) ) {
				return;
			}
			publish();
			if ( noteReady( required, input.value ) ) {
				return;
			}
			event.preventDefault();
			event.stopImmediatePropagation();
			if ( error ) {
				error.textContent = box.dataset.requiredMessage || '';
				error.hidden = false;
			}
			input.setAttribute( 'aria-invalid', 'true' );
			input.focus();
		},
		true
	);

	draw();
	publish();
}

function initAll() {
	document.querySelectorAll( '[data-sgs-note]' ).forEach( initNote );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', initAll );
} else {
	initAll();
}

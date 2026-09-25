/**
 * Modal — frontend interactivity.
 *
 * Uses native HTML dialog element with showModal() and close() methods.
 * Native dialog provides built-in focus trap, Escape key handling, and ::backdrop styling.
 * WCAG 2.2 AA compliant with proper ARIA attributes and keyboard navigation.
 *
 * Two opener mechanisms feed the same open/close functions (modal-core.js):
 * 1. This block's own trigger button (`.sgs-modal__trigger`) — wired below,
 *    one listener per instance, unchanged shape from before.
 * 2. ANY other element on the page (a plain text link, a button in a
 *    different block, a filter panel, a footer link…) — open-anywhere.js's
 *    single delegated document-level click listener.
 *
 * @package SGS\Blocks
 */

import { openModal, closeModal } from './modal-core';
import { initGenericOpeners, initHashOnLoad } from './open-anywhere';

/**
 * Wire up a single dialog's own close button, overlay-click and close-cleanup
 * behaviour. Runs for EVERY `.sgs-modal__dialog` on the page, regardless of
 * whether that instance has its own trigger button — triggerStyle:'none'
 * (block.json) renders no trigger at all (the modal is opened only by a
 * link/data-sgs-modal-open element elsewhere, via open-anywhere.js, or a
 * page-load hash), but its close button and overlay click must still work.
 * Previously this was wired inside initTrigger() below, so a trigger-less
 * dialog silently got none of it.
 *
 * @param {HTMLDialogElement} dialog The `.sgs-modal__dialog` element.
 */
function initDialog( dialog ) {
	const closeButton = dialog.querySelector( '.sgs-modal__close' );
	const closeOnOverlay = dialog.dataset.closeOnOverlay === 'true';

	// Close button.
	if ( closeButton ) {
		closeButton.addEventListener( 'click', () => {
			closeModal( dialog );
		} );
	}

	// Close on backdrop/overlay click.
	// Native dialog fires a 'click' event on the dialog element when clicking the backdrop.
	if ( closeOnOverlay ) {
		dialog.addEventListener( 'click', ( e ) => {
			// Check if the click was on the dialog itself (backdrop area).
			// dialog.getBoundingClientRect() gives us the content box, excluding the backdrop.
			const rect = dialog.getBoundingClientRect();
			const clickedInDialog =
				rect.top <= e.clientY &&
				e.clientY <= rect.top + rect.height &&
				rect.left <= e.clientX &&
				e.clientX <= rect.left + rect.width;

			if ( ! clickedInDialog ) {
				closeModal( dialog );
			}
		} );
	}

	// Single cleanup point for every close path — our own closeModal() calls
	// (close button, overlay click, generic-opener from open-anywhere.js) AND
	// native Escape/`cancel` handling all end in dialog.close(), which fires
	// 'close'. Restores body scroll position and resets the opener's
	// aria-expanded (openModal(), modal-core.js, sets dialog.__sgsOpener —
	// tracked regardless of which mechanism opened the dialog, so this reset
	// is not limited to the block's own trigger button).
	dialog.addEventListener( 'close', () => {
		const scrollY = Number.parseInt( dialog.dataset.scrollY || '0', 10 );
		document.body.classList.remove( 'sgs-modal-scroll-locked' );
		document.body.style.removeProperty( '--sgs-modal-scroll-y' );
		window.scrollTo( 0, scrollY );

		if ( dialog.__sgsOpener && 'BUTTON' === dialog.__sgsOpener.tagName ) {
			dialog.__sgsOpener.setAttribute( 'aria-expanded', 'false' );
		}
		dialog.__sgsOpener = null;
	} );
}

/**
 * Wire up a single modal instance's own trigger button, if it has one.
 * Absent entirely when triggerStyle:'none' — those dialogs still get
 * initDialog()'s close/overlay/cleanup wiring above; they simply have no
 * button of their own to open them.
 *
 * @param {HTMLElement} trigger The `.sgs-modal__trigger` button.
 */
function initTrigger( trigger ) {
	const modalId = trigger.dataset.modalId;
	if ( ! modalId ) {
		return;
	}

	const dialog = document.getElementById( modalId );
	if ( ! dialog ) {
		return;
	}

	const closeButton = dialog.querySelector( '.sgs-modal__close' );

	trigger.addEventListener( 'click', () => {
		openModal( dialog, closeButton, trigger );
	} );
}

function initModals() {
	document.querySelectorAll( '.sgs-modal__dialog' ).forEach( initDialog );
	document.querySelectorAll( '.sgs-modal__trigger' ).forEach( initTrigger );
	initGenericOpeners();
	initHashOnLoad();
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initModals );
} else {
	initModals();
}

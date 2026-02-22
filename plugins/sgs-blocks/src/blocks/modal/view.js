/**
 * Modal — frontend interactivity.
 *
 * Handles modal open/close, focus trap, Escape key, and backdrop click.
 * WCAG 2.2 AA compliant with proper ARIA attributes and keyboard navigation.
 *
 * @package SGS\Blocks
 */

function initModals() {
	const triggers = document.querySelectorAll( '.sgs-modal__trigger' );

	triggers.forEach( ( trigger ) => {
		const modalId = trigger.getAttribute( 'data-modal-id' );
		if ( ! modalId ) {
			return;
		}

		const modal = document.getElementById( modalId );
		if ( ! modal ) {
			return;
		}

		const closeButton = modal.querySelector( '.sgs-modal__close' );
		const closeOnBackdrop =
			modal.getAttribute( 'data-close-on-backdrop' ) === 'true';

		// Store the element that opened the modal (for focus restoration).
		let previousActiveElement = null;

		// Open modal.
		trigger.addEventListener( 'click', () => {
			previousActiveElement = document.activeElement;
			openModal( modal, closeButton );
		} );

		// Close button.
		if ( closeButton ) {
			closeButton.addEventListener( 'click', () => {
				closeModal( modal, previousActiveElement );
			} );
		}

		// Backdrop click.
		if ( closeOnBackdrop ) {
			modal.addEventListener( 'click', ( e ) => {
				// Only close if clicking the overlay itself (not the content).
				if ( e.target === modal ) {
					closeModal( modal, previousActiveElement );
				}
			} );
		}

		// Escape key.
		document.addEventListener( 'keydown', ( e ) => {
			if (
				e.key === 'Escape' &&
				modal.getAttribute( 'aria-hidden' ) === 'false'
			) {
				closeModal( modal, previousActiveElement );
			}
		} );

		// Focus trap (Tab and Shift+Tab).
		modal.addEventListener( 'keydown', ( e ) => {
			if (
				e.key === 'Tab' &&
				modal.getAttribute( 'aria-hidden' ) === 'false'
			) {
				trapFocus( e, modal );
			}
		} );
	} );
}

/**
 * Open a modal.
 */
function openModal( modal, closeButton ) {
	modal.setAttribute( 'aria-hidden', 'false' );
	document.body.classList.add( 'sgs-modal-open' );

	// Focus the close button (first focusable element).
	if ( closeButton ) {
		// Use a small delay to ensure the modal is visible before focusing.
		setTimeout( () => {
			closeButton.focus();
		}, 100 );
	}
}

/**
 * Close a modal.
 */
function closeModal( modal, previousActiveElement ) {
	modal.setAttribute( 'aria-hidden', 'true' );
	document.body.classList.remove( 'sgs-modal-open' );

	// Restore focus to the element that opened the modal.
	if ( previousActiveElement && previousActiveElement.focus ) {
		previousActiveElement.focus();
	}
}

/**
 * Trap focus within the modal (accessibility requirement).
 *
 * When Tab is pressed, keep focus cycling within the modal.
 * When Shift+Tab is pressed at the first element, jump to the last.
 */
function trapFocus( e, modal ) {
	const focusableElements = modal.querySelectorAll(
		'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
	);

	if ( focusableElements.length === 0 ) {
		return;
	}

	const firstElement = focusableElements[ 0 ];
	const lastElement = focusableElements[ focusableElements.length - 1 ];

	if ( e.shiftKey ) {
		// Shift+Tab: if on first element, jump to last.
		if ( document.activeElement === firstElement ) {
			e.preventDefault();
			lastElement.focus();
		}
	} else {
		// Tab: if on last element, jump to first.
		if ( document.activeElement === lastElement ) {
			e.preventDefault();
			firstElement.focus();
		}
	}
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initModals );
} else {
	initModals();
}

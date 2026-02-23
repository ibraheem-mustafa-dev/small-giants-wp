/**
 * Modal — frontend interactivity.
 *
 * Uses native HTML dialog element with showModal() and close() methods.
 * Native dialog provides built-in focus trap, Escape key handling, and ::backdrop styling.
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

		const dialog = document.getElementById( modalId );
		if ( ! dialog ) {
			return;
		}

		const closeButton = dialog.querySelector( '.sgs-modal__close' );
		const closeOnOverlay =
			dialog.getAttribute( 'data-close-on-overlay' ) === 'true';

		// Open modal when trigger button is clicked.
		trigger.addEventListener( 'click', () => {
			openModal( dialog, closeButton );
		} );

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

		// Native dialog handles Escape key automatically, but we can listen for the 'cancel' event
		// if we want to prevent default behaviour or add custom logic.
		dialog.addEventListener( 'cancel', ( e ) => {
			// Allow default (close on Escape).
			// If you wanted to prevent Escape closing, you'd use e.preventDefault() here.
		} );
	} );
}

/**
 * Open a modal using native dialog.showModal().
 *
 * Native dialog provides:
 * - Automatic focus trap (Tab cycles within dialog)
 * - Escape key handling (closes dialog)
 * - Backdrop styling via ::backdrop pseudo-element
 * - Accessibility with aria-modal implicit from showModal()
 */
function openModal( dialog, closeButton ) {
	dialog.showModal();

	// Focus the close button (first focusable element).
	if ( closeButton ) {
		// Small delay to ensure dialog is fully rendered.
		setTimeout( () => {
			closeButton.focus();
		}, 50 );
	}
}

/**
 * Close a modal using native dialog.close().
 *
 * Native dialog automatically restores focus to the element that opened it.
 */
function closeModal( dialog ) {
	dialog.close();
}

// Initialise on DOM ready.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initModals );
} else {
	initModals();
}

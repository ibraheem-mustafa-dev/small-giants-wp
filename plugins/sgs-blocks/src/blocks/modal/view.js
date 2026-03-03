/**
 * SGS Modal — Interactivity API store.
 *
 * Uses native <dialog> for built-in focus trap, Escape key, and ::backdrop.
 * The IA API manages the open/closed state reactively.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'sgs/modal', {
	actions: {
		/**
		 * Open the modal.
		 * Called by the trigger button's data-wp-on--click.
		 */
		open() {
			const ctx = getContext();
			ctx.isOpen = true;
		},

		/**
		 * Close the modal.
		 * Called by the close button's data-wp-on--click.
		 */
		close() {
			const ctx = getContext();
			ctx.isOpen = false;
		},

		/**
		 * Handle click on the dialog element.
		 * Closes when clicking the backdrop (outside dialog box) if closeOnOverlay is true.
		 *
		 * @param {MouseEvent} event
		 */
		handleOverlayClick( event ) {
			const ctx = getContext();
			if ( ! ctx.closeOnOverlay ) {
				return;
			}

			const dialog = event.currentTarget;
			const rect   = dialog.getBoundingClientRect();
			const clickedInside =
				rect.top    <= event.clientY &&
				event.clientY <= rect.top + rect.height &&
				rect.left   <= event.clientX &&
				event.clientX <= rect.left + rect.width;

			if ( ! clickedInside ) {
				ctx.isOpen = false;
			}
		},

		/**
		 * Handle the dialog's native cancel event (Escape key).
		 * Syncs context.isOpen to match the dialog's closed state.
		 */
		handleCancel() {
			const ctx = getContext();
			// Browser already closed the dialog via Escape; just sync state.
			ctx.isOpen = false;
		},
	},

	callbacks: {
		/**
		 * Keep the native <dialog> open/closed state in sync with context.isOpen.
		 * Attached via data-wp-watch="callbacks.syncDialog" on the <dialog> element.
		 */
		syncDialog() {
			const ctx     = getContext();
			const { ref } = getElement(); // ref = the <dialog> element

			if ( ctx.isOpen && ! ref.open ) {
				ref.showModal();

				// Move focus to close button for accessibility.
				requestAnimationFrame( () => {
					const closeBtn = ref.querySelector( '.sgs-modal__close' );
					if ( closeBtn ) {
						closeBtn.focus();
					}
				} );
			} else if ( ! ctx.isOpen && ref.open ) {
				ref.close();
			}
		},
	},
} );

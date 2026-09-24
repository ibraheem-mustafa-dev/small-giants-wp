/**
 * Modal — shared open/close/resolve logic used by both view.js's own trigger
 * wiring and open-anywhere.js's generic-opener + hash-on-load handling.
 * Extracted so neither consuming file grows past the framework's 250-line JS
 * limit while duplicating none of the actual behaviour.
 *
 * @package SGS\Blocks
 */

/**
 * Open a modal using native dialog.showModal().
 *
 * Native dialog provides a built-in focus trap — Tab and Shift+Tab cycle
 * only through focusable elements inside the dialog while it is open.
 * No manual focusin/focusout listener is required; the browser enforces
 * this at the platform level when showModal() is used (WCAG 2.1 SC 2.1.2).
 *
 * Additional native behaviour:
 * - Escape key closes the dialog (fires 'cancel' event)
 * - Backdrop styling via ::backdrop pseudo-element
 * - aria-modal="true" implied by showModal()
 * - Focus returns to whatever had focus when showModal() was called (the
 *   opener, since clicking a link/button focuses it first) — this is native
 *   dialog.close() behaviour, unaffected by which opener triggered the open.
 *
 * Additionally we lock body scroll while the modal is open so the page
 * beneath does not scroll when the user scrolls inside the dialog, and set
 * aria-expanded on the opener when it is a button (native links have no
 * aria-expanded semantics).
 *
 * @param {HTMLDialogElement} dialog      The dialog to open.
 * @param {HTMLElement|null}  closeButton The dialog's own close button, if any.
 * @param {HTMLElement|null}  opener      The element that triggered the open.
 */
export function openModal( dialog, closeButton, opener ) {
	dialog.showModal();

	// Lock body scroll — save current position to restore on close.
	// Real properties (overflow / position / top / width) live in style.css
	// on the `.sgs-modal-scroll-locked` class (no-inline styling contract,
	// Spec 32); only the scroll-position VALUE is written here, as a CSS
	// custom-property value (allowed).
	const scrollY = window.scrollY;
	document.body.classList.add( 'sgs-modal-scroll-locked' );
	document.body.style.setProperty( '--sgs-modal-scroll-y', `-${ scrollY }px` );
	dialog.dataset.scrollY = scrollY;

	// Track the opener so the dialog's own 'close' listener (view.js) can
	// reset its aria-expanded state, regardless of which mechanism (own
	// trigger, generic opener, hash-load) opened this dialog.
	dialog.__sgsOpener = opener || null;
	if ( opener && 'BUTTON' === opener.tagName ) {
		opener.setAttribute( 'aria-expanded', 'true' );
	}

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
 * The actual cleanup (scroll restore, aria-expanded reset) runs once, in the
 * dialog's own 'close' event listener (registered in view.js's initTrigger)
 * — that event fires for EVERY close, whether triggered by this function,
 * native Escape/`cancel` handling, or `dialog.close()` called directly, so
 * cleanup cannot be skipped depending on which path closed the dialog.
 *
 * Native dialog automatically restores focus to the element that opened it.
 *
 * @param {HTMLDialogElement} dialog The dialog to close.
 */
export function closeModal( dialog ) {
	dialog.close();
}

/**
 * Resolve a candidate opener id (from `href="#id"` or
 * `data-sgs-modal-open="id"`) to the modal `<dialog>` it should open, or
 * `null` when the id does not point at any SGS modal — so callers can leave
 * unrelated hashes/ids alone (no preventDefault, normal browser behaviour).
 *
 * The id targets this block's WRAPPER (which carries `id="<anchor>"` via
 * native anchor support, supports.anchor:true, when the operator has set an
 * HTML anchor on the block) rather than the dialog's own internal
 * `wp_unique_id()`-based id, so a client only ever needs to know and share
 * one id: the anchor shown in the block's own inspector panel.
 *
 * @param {string} id The candidate id, without a leading '#'.
 * @return {HTMLDialogElement|null} The matching dialog, or null.
 */
export function resolveModalDialog( id ) {
	if ( ! id ) {
		return null;
	}
	const target = document.getElementById( id );
	if ( ! target ) {
		return null;
	}
	if ( target.matches( '.sgs-modal__dialog' ) ) {
		return target;
	}
	// Only the modal block's own wrapper counts. A section anchor that merely
	// CONTAINS a modal must keep its normal jump-to-section behaviour.
	if ( ! target.matches( '.sgs-modal' ) ) {
		return null;
	}
	return target.querySelector( ':scope > .sgs-modal__dialog' );
}

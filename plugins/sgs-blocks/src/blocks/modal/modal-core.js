/**
 * Modal — shared open/close/resolve logic used by both view.js's own trigger
 * wiring and open-anywhere.js's generic-opener + hash-on-load handling.
 * Extracted so neither consuming file grows past the framework's 250-line JS
 * limit while duplicating none of the actual behaviour.
 *
 * @package SGS\Blocks
 */

import { announceModalOpen } from './modal-motion-state';

/**
 * The page's real scroll position. While another surface (the nav drawer) holds a fixed-position body scroll lock,
 * `window.scrollY` is 0 and the position lives in the body's negative `top`.
 *
 * @return {number} Pixels scrolled.
 */
function pageScrollY() {
	const { style } = document.body;
	const top = Number.parseFloat( style.top );
	if ( 'fixed' === style.position && Number.isFinite( top ) && top < 0 ) {
		return Math.round( -top );
	}
	return window.scrollY;
}

/**
 * Whether an element can take focus now: attached, laid out, and not inside a closed dialog.
 *
 * @param {Element|null} el Candidate.
 * @return {boolean} True when it is shown.
 */
function isShown( el ) {
	if ( ! el || ! el.isConnected || 'function' !== typeof el.getClientRects || 0 === el.getClientRects().length ) {
		return false;
	}
	const host = el.closest( 'dialog' );
	return ! host || host.open;
}

/**
 * Put focus back after a modal closes. The browser returns it to the element focused at open, which is unusable when that
 * was a link inside a nav drawer that has since closed (focus then falls to the body). The opener is used when still
 * shown; otherwise the control that opened its drawer (`aria-controls`).
 *
 * @param {HTMLDialogElement} dialog The dialog that just closed.
 */
export function restoreModalFocus( dialog ) {
	const target = dialog.__sgsReturnFocus || null;
	dialog.__sgsReturnFocus = null;
	const active = document.activeElement;
	// The `close` event fires before the browser moves focus off the dialog's own control (its close button), so
	// focus still inside the dialog counts as not yet returned. Focus the visitor already put elsewhere stays.
	const stranded = ! active || active === document.body || active === document.documentElement || dialog.contains( active );
	if ( ! stranded ) {
		return;
	}
	if ( isShown( target ) ) {
		target.focus( { preventScroll: true } );
		return;
	}
	const drawer = target ? target.closest( '[data-sgs-nav-drawer]' ) : null;
	const burger = drawer && drawer.id ? document.querySelector( `[aria-controls="${ drawer.id }"]` ) : null;
	if ( isShown( burger ) ) {
		burger.focus( { preventScroll: true } );
	}
}

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
 *   This is already opener-agnostic, not hardcoded to the block's own trigger
 *   button: it works identically whether `opener` (the 3rd argument below) is
 *   this block's own `.sgs-modal__trigger`, an unrelated link/button elsewhere
 *   on the page (open-anywhere.js's generic-opener listener), or `null` (a
 *   page-load hash open, initHashOnLoad() — nothing to return focus to).
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
	// Where focus goes back to on close: the opener, else whatever held focus.
	const active = document.activeElement;
	dialog.__sgsReturnFocus = opener || ( active && active !== document.body ? active : null );
	// Read before showModal: a nav drawer's scroll lock may still be on, which reports window.scrollY as 0.
	const scrollY = pageScrollY();
	dialog.showModal();
	announceModalOpen( dialog );

	// Lock body scroll — save current position to restore on close.
	// Real properties (overflow / position / top / width) live in style.css
	// on the `.sgs-modal-scroll-locked` class (no-inline styling contract,
	// Spec 32); only the scroll-position VALUE is written here, as a CSS
	// custom-property value (allowed).
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

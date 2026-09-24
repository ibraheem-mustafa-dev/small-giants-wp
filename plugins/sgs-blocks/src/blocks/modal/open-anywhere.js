/**
 * Modal — "open from anywhere" mechanisms, both feeding the shared
 * openModal()/resolveModalDialog() from modal-core.js:
 *
 * 1. A SINGLE delegated document-level click listener that lets ANY element
 *    on the page open an sgs/modal — not only the modal block's own trigger
 *    button (that stays in view.js, unchanged). Matches either
 *    `href="#<anchor>"` (the modal block's own HTML anchor —
 *    supports.anchor:true, block.json) or `data-sgs-modal-open="<anchor>"`.
 * 2. A nice-to-have: opening a modal directly via a page-load URL hash
 *    (`/page/#size-guide`), off by default per-instance (openOnHashLoad,
 *    block.json).
 *
 * @package SGS\Blocks
 */

import { openModal, resolveModalDialog } from './modal-core';

/**
 * A single delegated document-level click listener that lets ANY element on
 * the page open an sgs/modal. Two opener shapes are recognised:
 *
 * - `<a href="#<anchor>">` — a normal text link; the default jump-to-anchor
 *   is prevented ONLY once a matching modal is confirmed, so an unrelated
 *   `#anchor` (a different block, or no match at all) still behaves normally.
 * - `[data-sgs-modal-open="<anchor>"]` — any element (button, span, list
 *   item…) that isn't naturally a link, for openers that shouldn't navigate.
 */
export function initGenericOpeners() {
	document.addEventListener( 'click', ( event ) => {
		const opener = event.target.closest( '[data-sgs-modal-open], a[href^="#"]' );
		if ( ! opener ) {
			return;
		}

		// Already-handled by view.js's initTrigger() — avoid a double-open
		// on the block's own trigger button.
		if ( opener.classList.contains( 'sgs-modal__trigger' ) ) {
			return;
		}

		const explicitId = opener.dataset.sgsModalOpen;
		const hashId = opener.tagName === 'A' && opener.getAttribute( 'href' )
			? opener.getAttribute( 'href' ).slice( 1 )
			: '';
		const id = explicitId || hashId;
		if ( ! id ) {
			return;
		}

		const dialog = resolveModalDialog( id );
		if ( ! dialog ) {
			// Unknown id / not a modal — leave default behaviour (normal
			// anchor jump, or nothing for a non-link opener) alone.
			return;
		}

		event.preventDefault();
		const closeButton = dialog.querySelector( '.sgs-modal__close' );
		openModal( dialog, closeButton, opener );
	} );
}

/**
 * Nice-to-have: opening a modal directly via a page-load URL hash
 * (`/page/#size-guide`). Off by default per-instance (openOnHashLoad,
 * block.json) so an existing anchor link's normal jump-to-position behaviour
 * is unaffected unless the operator opts a specific modal in.
 */
export function initHashOnLoad() {
	const id = window.location.hash ? window.location.hash.slice( 1 ) : '';
	if ( ! id ) {
		return;
	}
	const dialog = resolveModalDialog( id );
	if ( ! dialog || dialog.dataset.openOnHashLoad !== 'true' ) {
		return;
	}
	const closeButton = dialog.querySelector( '.sgs-modal__close' );
	openModal( dialog, closeButton, null );
}

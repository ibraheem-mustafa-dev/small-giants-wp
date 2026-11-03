/**
 * SGS Choice Flow — closing the sgs/modal pop-up a flow sits in.
 *
 * @package SGS\Blocks
 */

const MODAL_DIALOG_SELECTOR = 'dialog.sgs-modal__dialog';
const MODAL_CLOSE_SELECTOR = '.sgs-modal__close';

/**
 * Close the sgs/modal dialog the flow sits in, by its own Close button (the
 * route `chrome.js` takes), so its scroll-restore and aria-expanded cleanup
 * run. Does nothing for a flow that is not in a pop-up.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
export function closeEnclosingModal( flowRoot ) {
	const dialog = flowRoot.closest( MODAL_DIALOG_SELECTOR );
	const closeEl = dialog ? dialog.querySelector( MODAL_CLOSE_SELECTOR ) : null;
	if ( closeEl ) {
		closeEl.click();
	}
}

/**
 * SGS Cart — the panel's live heading count and the note under Checkout.
 *
 * Both are optional, server-rendered empty (render.php through
 * includes/helpers-cart-panel.php::sgs_cart_panel_body_html()) and filled here
 * from the live Store API cart, like the badge count: the page cache would
 * otherwise serve one visitor's numbers to everyone.
 *
 * @package
 */

import { formatMoney } from './store-api';
import {
	instalmentMinor,
	noteWithAmount,
} from '../../shared/cart-live/instalments';

import { appendAuthoredText } from '../../utils/authored-text-dom';
/**
 * Update the "(N)" after the panel heading and the instalments note.
 *
 * @param {HTMLElement} panelRoot The `[data-sgs-cart-panel]` element.
 * @param {Object}      [cart]    The Store API cart response.
 */
export function updatePanelExtras( panelRoot, cart ) {
	const count = Number( cart?.items_count ) || 0;
	const countEl = panelRoot.querySelector( '[data-sgs-cart-panel-count]' );
	if ( countEl ) {
		countEl.textContent = `(${ count })`;
	}

	const noteEl = panelRoot.querySelector( '[data-sgs-cart-note]' );
	if ( ! noteEl ) {
		return;
	}
	const template = noteEl.dataset.noteTemplate || '';
	const total = Number( cart?.totals?.total_price ?? 0 );
	if ( ! template || count < 1 || total <= 0 ) {
		noteEl.hidden = true;
		return;
	}
	const amount = formatMoney(
		instalmentMinor( total, noteEl.dataset.noteCount ),
		cart.totals
	);
	// The note is typed rich text with a %s for the amount: the amount goes in as text, the note as DOM nodes.
	const safeAmount = String( amount )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' );
	appendAuthoredText( noteEl, noteWithAmount( template, safeAmount ) );
	noteEl.hidden = false;
}

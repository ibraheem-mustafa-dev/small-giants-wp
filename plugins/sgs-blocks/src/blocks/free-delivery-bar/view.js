/**
 * SGS Free-delivery Bar: keeps the card current from the page-wide cart reading.
 *
 * The card's words and threshold are data attributes printed by render.php. The cart arrives from
 * `src/shared/cart-live/` (one reader for the whole page, however many bundles import it) and the shared
 * `updateFreeDeliveryProgress()` paints the fill, the progressbar value and the message.
 *
 * @package
 */

import { onCartChange } from '../../shared/cart-live';
import { updateFreeDeliveryProgress } from '../../shared/cart-live/free-delivery-progress';

const OPTIONS = {
	pctProperty: '--sgs-free-delivery-bar-pct',
	completeClass: 'sgs-free-delivery-bar--complete',
};

/**
 * Wire one card.
 *
 * @param {HTMLElement} el The `[data-sgs-free-delivery-bar]` root.
 */
function initBar( el ) {
	const config = {
		threshold: el.dataset.freeDeliveryThreshold || '',
		message: el.dataset.freeDeliveryMessage || '',
		successMessage: el.dataset.freeDeliverySuccessMessage || '',
		hideWhenEmpty: '1' === el.dataset.freeDeliveryHideEmpty,
	};
	// The server already printed the fill at its real level: do not drop it to empty and grow it again.
	if ( 'server' === el.dataset.reading ) {
		el.sgsFillReleased = true;
	}
	onCartChange( ( cart ) => {
		updateFreeDeliveryProgress( el, cart, config, OPTIONS );
		el.dataset.reading = 'live';
	} );
}

document.querySelectorAll( '[data-sgs-free-delivery-bar]' ).forEach( initBar );

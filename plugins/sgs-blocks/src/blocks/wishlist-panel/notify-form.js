/**
 * SGS Wishlist Panel — "Notify me" mini-form for an out-of-stock saved item.
 *
 * Posts to the EXISTING `POST /sgs/v1/notify/subscribe` route
 * (`includes/class-stock-notify.php`) with its full consent step — the
 * wishlist panel does not duplicate that endpoint's validation, it just
 * supplies the form. Reuses the `wp_rest` nonce
 * `includes/wishlist/class-wishlist-rest.php::Wishlist_Rest::enqueue_client_config()` already
 * exposes on `window.sgsWishlistData.nonce` (Stock_Notify's own
 * `permission_callback` is `__return_true`, but its handler still verifies
 * `X-WP-Nonce` itself — see that file's Step 1).
 *
 * @package
 */
import { escapeHtml } from './render-rows';

/**
 * @return {string} The REST root, no trailing slash.
 */
function restRoot() {
	const root =
		window?.sgsWishlistData?.restUrl || window?.wpApiSettings?.root || '/wp-json/';
	return root.replace( /\/$/, '' );
}

/**
 * Build the notify-me form's markup. Every visible string is a block
 * attribute (`labels.js::readPanelData()`), never hard-coded here.
 *
 * @param {number} productId Product id.
 * @param {Object} labels    `labels.js::readPanelData()` output.
 * @return {string} Form HTML.
 */
function formHtml( productId, labels ) {
	const emailId = `sgs-wishlist-notify-email-${ productId }`;
	const consentId = `sgs-wishlist-notify-consent-${ productId }`;
	const privacyLink = labels.privacyUrl
		? ` <a class="sgs-wishlist-panel__privacy-link" href="${ escapeHtml(
				labels.privacyUrl
		  ) }">${ escapeHtml( labels.privacyLinkLabel ) }</a>`
		: '';
	return (
		'<form class="sgs-wishlist-panel__notify-inner">' +
		`<label for="${ emailId }">${ escapeHtml( labels.notifyEmailLabel ) }</label>` +
		`<input type="email" id="${ emailId }" name="email" required autocomplete="email" />` +
		'<div class="sgs-wishlist-panel__notify-consent">' +
		`<input type="checkbox" id="${ consentId }" name="consent" required />` +
		`<label for="${ consentId }">${ escapeHtml( labels.notifyConsentText ) }</label>` +
		privacyLink +
		'</div>' +
		`<button type="submit">${ escapeHtml( labels.notifyLabel ) }</button>` +
		'<p class="sgs-wishlist-panel__notify-message" role="status" aria-live="polite"></p>' +
		'</form>'
	);
}

/**
 * Mount (or reveal) the notify-me form for one product inside a saved row.
 *
 * @param {HTMLElement} container The `.sgs-wishlist-panel__notify-form` element.
 * @param {number}      productId Product id.
 * @param {Object}      labels    `labels.js::readPanelData()` output.
 */
export function mountNotifyForm( container, productId, labels ) {
	if ( ! container.dataset.sgsMounted ) {
		container.innerHTML = formHtml( productId, labels ); // Built from escapeHtml()'d strings + a numeric id only.
		container.dataset.sgsMounted = '1';

		const form = container.querySelector( 'form' );
		const messageEl = container.querySelector( '.sgs-wishlist-panel__notify-message' );

		form.addEventListener( 'submit', async ( event ) => {
			event.preventDefault();
			const email = form.querySelector( 'input[name="email"]' ).value;
			const consent = form.querySelector( 'input[name="consent"]' ).checked;
			const submitButton = form.querySelector( 'button[type="submit"]' );
			submitButton.disabled = true;
			messageEl.textContent = '';

			try {
				const response = await fetch( restRoot() + '/sgs/v1/notify/subscribe', {
					method: 'POST',
					credentials: 'same-origin',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': window?.sgsWishlistData?.nonce || '',
					},
					body: JSON.stringify( { productId, email, consent } ),
				} );
				const json = await response.json().catch( () => null );
				if ( response.ok ) {
					messageEl.textContent = labels.notifySuccessText;
					form.querySelector( 'button[type="submit"]' ).hidden = true;
					form.querySelector( 'input[name="email"]' ).disabled = true;
					form.querySelector( 'input[name="consent"]' ).disabled = true;
				} else {
					messageEl.textContent = json?.message || labels.errorText;
				}
			} catch {
				messageEl.textContent = labels.errorText;
			} finally {
				submitButton.disabled = false;
			}
		} );
	}
	container.hidden = false;
}

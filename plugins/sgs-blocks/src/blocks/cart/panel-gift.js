/**
 * SGS Cart — the drawer's gift box (FR-30-17).
 *
 * A view of the one gift value the `sgs/gift-order` block keeps in the WooCommerce session. render.php prints the box
 * (includes/helpers-cart-panel-extras.php::sgs_cart_gift_box_html) hidden; this module shows it while the basket holds an
 * item, fills it from the Store API cart's `extensions.sgs_gift` (the drawer's cart read asks for it with `X-SGS-Gift: 1`) and
 * saves a change through `POST /sgs/v1/cart/gift`, the route the basket page, the checkout and the product page use. After a
 * save it announces the value on the document (`sgs:gift-changed`) so another gift box on the same page follows.
 *
 * @package
 */

const TYPING_DELAY = 600;

/** Document event carrying `{ on, to, message, source }` after a gift box saved. */
export const GIFT_EVENT = 'sgs:gift-changed';

/** Request header that adds the gift value to a Store API cart response. */
export const GIFT_HEADERS = { 'X-SGS-Gift': '1' };

const SAVE_ERROR = 'Your gift choice could not be saved. Please try again.';

/**
 * Wire the gift box inside one panel.
 *
 * @param {HTMLElement} panelRoot The `[data-sgs-cart-panel]` element.
 * @return {{ headers: Object|null, sync: Function }} `headers` for the panel's cart read (null when the panel has no gift box); `sync( cart )` shows or hides the box and fills it from the cart.
 */
export function initGift( panelRoot ) {
	const root = panelRoot.querySelector( '[data-sgs-cart-gift]' );
	const box = root?.querySelector( '.sgs-cart__panel-gift-checkbox' );
	const fields = root?.querySelector( '.sgs-cart__panel-gift-fields' );
	const to = root?.querySelector( '.sgs-cart__panel-gift-to' );
	const note = root?.querySelector( '.sgs-cart__panel-gift-message' );
	const alert = root?.querySelector( '.sgs-cart__panel-gift-error' );
	if ( ! root || ! box || ! fields || ! to || ! note || ! root.dataset.restUrl ) {
		return { headers: null, sync: () => {} };
	}

	let timer = null;
	let inFlight = 0;

	const draw = () => {
		fields.hidden = ! box.checked;
	};
	const fail = ( message ) => {
		if ( alert ) {
			alert.textContent = message || '';
			alert.hidden = ! message;
		}
	};
	const apply = ( value ) => {
		box.checked = !! value.on;
		to.value = value.on ? String( value.to || '' ) : '';
		note.value = value.on ? String( value.message || '' ) : '';
		draw();
	};
	// Typing or a save in progress owns the fields: a cart reading or another box's news waits until it is done.
	const busy = () => null !== timer || inFlight > 0;

	const save = () => {
		timer = null;
		inFlight += 1;
		const sent = { on: box.checked, to: box.checked ? to.value : '', message: box.checked ? note.value : '' };
		fetch( root.dataset.restUrl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': root.dataset.nonce || '' },
			body: JSON.stringify( sent ),
		} )
			.then( ( response ) => response.json().then( ( body ) => ( { response, body } ) ) )
			.then( ( { response, body } ) => {
				fail( response.ok ? '' : body?.message || SAVE_ERROR );
				if ( response.ok ) {
					document.dispatchEvent( new CustomEvent( GIFT_EVENT, { detail: { ...sent, source: root } } ) );
				}
			} )
			.catch( () => fail( SAVE_ERROR ) )
			.finally( () => {
				inFlight -= 1;
			} );
	};
	const later = ( immediate ) => {
		window.clearTimeout( timer );
		if ( immediate ) {
			save();
			return;
		}
		timer = window.setTimeout( save, TYPING_DELAY );
	};
	const flush = () => {
		if ( null !== timer ) {
			window.clearTimeout( timer );
			save();
		}
	};

	box.addEventListener( 'change', () => {
		draw();
		later( true );
	} );
	[ to, note ].forEach( ( field ) => {
		field.addEventListener( 'input', () => later( false ) );
		field.addEventListener( 'blur', flush );
	} );
	document.addEventListener( GIFT_EVENT, ( event ) => {
		if ( event.detail?.source !== root && ! busy() ) {
			apply( event.detail );
		}
	} );
	draw();

	return {
		headers: GIFT_HEADERS,
		sync( cart ) {
			const hasItems = Array.isArray( cart?.items ) && cart.items.length > 0;
			root.hidden = ! hasItems;
			const stored = cart?.extensions?.sgs_gift;
			if ( ! hasItems || ! stored || busy() ) {
				return;
			}
			const to_max = Number( stored.limits?.to );
			const message_max = Number( stored.limits?.message );
			if ( to_max > 0 ) {
				to.maxLength = to_max;
			}
			if ( message_max > 0 ) {
				note.maxLength = message_max;
			}
			apply( stored );
		},
	};
}

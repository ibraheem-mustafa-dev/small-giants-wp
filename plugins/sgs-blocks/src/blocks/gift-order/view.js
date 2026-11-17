/**
 * Gift order on a single-product page (viewScriptModule, vanilla ES module).
 *
 * render.php prints the tick box and the note box (includes/gift-order/helpers-gift-order-product.php). This module
 * saves them through the same route the basket and checkout use (`POST /sgs/v1/cart/gift` with the `wp_rest`
 * nonce) and reads the stored value back from the Store API cart, so a page served from a cache still shows the
 * shopper's own state. The recipient name is not on this page; it is sent back as it was stored.
 *
 * @package
 */

const TYPING_DELAY = 600;

// Another gift box on the page (the cart drawer's) announces its saved value with this event; see src/blocks/cart/panel-gift.js.
const GIFT_EVENT = 'sgs:gift-changed';

/**
 * Fill `%1$d` (used), `%2$d` (maximum) and `%3$d` (left) in the block's count text.
 *
 * @param {string} format Count text.
 * @param {number} used   Characters used.
 * @param {number} max    Characters allowed.
 * @return {string} Text.
 */
function countText( format, used, max ) {
	const values = { 1: used, 2: max, 3: Math.max( 0, max - used ) };
	return String( format ).replace( /%([123])\$d/g, ( all, n ) =>
		String( values[ n ] )
	);
}

/**
 * @param {HTMLElement} root The `.sgs-gift-order--product` element.
 */
function init( root ) {
	let config = {};
	try {
		config = JSON.parse( root.dataset.config || '{}' );
	} catch ( error ) {
		return;
	}
	const box = root.querySelector( '.sgs-gift-order__checkbox' );
	const fields = root.querySelector( '.sgs-gift-order__fields' );
	const note = root.querySelector( '.sgs-gift-order__textarea' );
	const count = root.querySelector( '.sgs-gift-order__count' );
	const alert = root.querySelector( '.sgs-gift-order__error' );
	if ( ! box || ! fields || ! note || ! config.restUrl ) {
		return;
	}
	const max = Number( config.messageLimit ) || 0;
	let recipient = String( config.to || '' );
	let timer = null;
	let edits = 0;

	const draw = () => {
		fields.hidden = ! box.checked;
		if ( count ) {
			count.textContent = countText(
				config.characterCountText,
				note.value.length,
				max
			);
		}
	};
	const fail = ( message ) => {
		if ( alert ) {
			alert.textContent = message || '';
			alert.hidden = ! message;
		}
	};
	const save = () => {
		timer = null;
		const sent = edits;
		const value = {
			on: box.checked,
			to: box.checked ? recipient : '',
			message: box.checked ? note.value : '',
		};
		fetch( config.restUrl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': config.nonce,
			},
			body: JSON.stringify( value ),
		} )
			.then( ( response ) =>
				response.json().then( ( body ) => ( { response, body } ) )
			)
			.then( ( { response, body } ) => {
				if ( response.ok ) {
					document.dispatchEvent(
						new CustomEvent( GIFT_EVENT, {
							detail: { ...value, source: root },
						} )
					);
				}
				if ( sent !== edits ) {
					return;
				}
				fail( response.ok ? '' : body.message || config.saveErrorText );
			} )
			.catch( () => fail( config.saveErrorText ) );
	};
	const later = ( immediate ) => {
		edits += 1;
		window.clearTimeout( timer );
		if ( immediate ) {
			save();
			return;
		}
		timer = window.setTimeout( save, TYPING_DELAY );
	};

	box.addEventListener( 'change', () => {
		draw();
		later( true );
	} );
	note.addEventListener( 'input', () => {
		draw();
		later( false );
	} );
	note.addEventListener( 'blur', () => {
		if ( timer ) {
			window.clearTimeout( timer );
			save();
		}
	} );
	draw();

	document.addEventListener( GIFT_EVENT, ( event ) => {
		const value = event.detail;
		if ( ! value || value.source === root || null !== timer ) {
			return;
		}
		box.checked = !! value.on;
		note.value = value.on ? value.message || '' : '';
		recipient = value.on ? value.to || '' : '';
		draw();
	} );

	// A cached page carries someone else's state: read this shopper's own from the cart.
	fetch( config.storeUrl, {
		credentials: 'same-origin',
		headers: { 'X-SGS-Gift': '1' },
	} )
		.then( ( response ) => ( response.ok ? response.json() : null ) )
		.then( ( cart ) => {
			const stored = cart && cart.extensions && cart.extensions.sgs_gift;
			if ( ! stored || edits > 0 ) {
				return;
			}
			box.checked = !! stored.on;
			note.value = stored.message || '';
			recipient = stored.to || '';
			draw();
		} )
		.catch( () => {} );
}

document
	.querySelectorAll( '.sgs-gift-order--product' )
	.forEach( ( root ) => init( root ) );

/**
 * The drawer's gift box: shown while the basket has an item, filled from the cart's `extensions.sgs_gift`, saved through
 * `POST /sgs/v1/cart/gift` with the nonce, and announced on the document so another gift box follows.
 */
'use strict';

const { initGift, GIFT_EVENT, GIFT_HEADERS } = require( '../../src/blocks/cart/panel-gift' );

const markup = () => `
<div data-sgs-cart-panel>
	<div class="sgs-cart__panel-gift" data-sgs-cart-gift data-rest-url="/wp-json/sgs/v1/cart/gift" data-nonce="n1" hidden>
		<input type="checkbox" class="sgs-cart__panel-gift-checkbox" />
		<div class="sgs-cart__panel-gift-fields" hidden>
			<input type="text" class="sgs-cart__panel-gift-to" maxlength="100" />
			<textarea class="sgs-cart__panel-gift-message" maxlength="500"></textarea>
		</div>
		<p class="sgs-cart__panel-gift-error" hidden></p>
	</div>
</div>`;

const flush = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

describe( 'initGift', () => {
	let panel;
	beforeEach( () => {
		document.body.innerHTML = markup();
		panel = document.querySelector( '[data-sgs-cart-panel]' );
		global.fetch = jest.fn( () => Promise.resolve( { ok: true, json: () => Promise.resolve( {} ) } ) );
	} );

	test( 'a panel without the box does nothing and asks for no gift data', () => {
		document.body.innerHTML = '<div data-sgs-cart-panel></div>';
		const gift = initGift( document.querySelector( '[data-sgs-cart-panel]' ) );
		expect( gift.headers ).toBeNull();
		expect( () => gift.sync( { items: [ {} ] } ) ).not.toThrow();
	} );

	test( 'a panel with the box asks the cart read for the gift value', () => {
		expect( initGift( panel ).headers ).toEqual( GIFT_HEADERS );
	} );

	test( 'the box shows only while the basket has an item', () => {
		const gift = initGift( panel );
		const root = panel.querySelector( '[data-sgs-cart-gift]' );
		gift.sync( { items: [ { key: 'a' } ] } );
		expect( root.hidden ).toBe( false );
		gift.sync( { items: [] } );
		expect( root.hidden ).toBe( true );
	} );

	test( 'the session value fills the box, the name and the note, and the server caps set the limits', () => {
		const gift = initGift( panel );
		gift.sync( { items: [ {} ], extensions: { sgs_gift: { on: true, to: 'Sam', message: 'Enjoy', limits: { to: 40, message: 120 } } } } );
		expect( panel.querySelector( '.sgs-cart__panel-gift-checkbox' ).checked ).toBe( true );
		expect( panel.querySelector( '.sgs-cart__panel-gift-fields' ).hidden ).toBe( false );
		expect( panel.querySelector( '.sgs-cart__panel-gift-to' ).value ).toBe( 'Sam' );
		expect( panel.querySelector( '.sgs-cart__panel-gift-message' ).value ).toBe( 'Enjoy' );
		expect( panel.querySelector( '.sgs-cart__panel-gift-to' ).maxLength ).toBe( 40 );
		expect( panel.querySelector( '.sgs-cart__panel-gift-message' ).maxLength ).toBe( 120 );
		gift.sync( { items: [ {} ], extensions: { sgs_gift: { on: false, to: '', message: '' } } } );
		expect( panel.querySelector( '.sgs-cart__panel-gift-checkbox' ).checked ).toBe( false );
		expect( panel.querySelector( '.sgs-cart__panel-gift-fields' ).hidden ).toBe( true );
	} );

	test( 'a cart reply without the gift value leaves the box as it is', () => {
		const gift = initGift( panel );
		gift.sync( { items: [ {} ], extensions: { sgs_gift: { on: true, to: 'Sam', message: '' } } } );
		gift.sync( { items: [ {}, {} ] } );
		expect( panel.querySelector( '.sgs-cart__panel-gift-checkbox' ).checked ).toBe( true );
		expect( panel.querySelector( '.sgs-cart__panel-gift-to' ).value ).toBe( 'Sam' );
	} );

	test( 'ticking saves at once, with the wp_rest nonce, and announces the value', async () => {
		initGift( panel );
		const seen = [];
		document.addEventListener( GIFT_EVENT, ( event ) => seen.push( event.detail ) );
		const box = panel.querySelector( '.sgs-cart__panel-gift-checkbox' );
		box.checked = true;
		box.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		const [ url, options ] = global.fetch.mock.calls[ 0 ];
		expect( url ).toBe( '/wp-json/sgs/v1/cart/gift' );
		expect( options.method ).toBe( 'POST' );
		expect( options.credentials ).toBe( 'same-origin' );
		expect( options.headers[ 'X-WP-Nonce' ] ).toBe( 'n1' );
		expect( JSON.parse( options.body ) ).toEqual( { on: true, to: '', message: '' } );
		expect( panel.querySelector( '.sgs-cart__panel-gift-fields' ).hidden ).toBe( false );
		await flush();
		expect( seen ).toHaveLength( 1 );
		expect( seen[ 0 ].on ).toBe( true );
	} );

	test( 'typing waits for a pause, and leaving the field saves straight away', () => {
		jest.useFakeTimers();
		initGift( panel );
		const to = panel.querySelector( '.sgs-cart__panel-gift-to' );
		panel.querySelector( '.sgs-cart__panel-gift-checkbox' ).checked = true;
		to.value = 'Sam';
		to.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		expect( global.fetch ).not.toHaveBeenCalled();
		jest.advanceTimersByTime( 700 );
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		expect( JSON.parse( global.fetch.mock.calls[ 0 ][ 1 ].body ) ).toEqual( { on: true, to: 'Sam', message: '' } );
		to.value = 'Sami';
		to.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		to.dispatchEvent( new Event( 'blur' ) );
		expect( global.fetch ).toHaveBeenCalledTimes( 2 );
		jest.useRealTimers();
	} );

	test( 'untick sends an empty name and note', () => {
		initGift( panel );
		const box = panel.querySelector( '.sgs-cart__panel-gift-checkbox' );
		panel.querySelector( '.sgs-cart__panel-gift-to' ).value = 'Sam';
		box.checked = false;
		box.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		expect( JSON.parse( global.fetch.mock.calls[ 0 ][ 1 ].body ) ).toEqual( { on: false, to: '', message: '' } );
	} );

	test( 'a refused save shows the server message in the alert', async () => {
		global.fetch = jest.fn( () => Promise.resolve( { ok: false, json: () => Promise.resolve( { message: 'Too long.' } ) } ) );
		initGift( panel );
		const box = panel.querySelector( '.sgs-cart__panel-gift-checkbox' );
		box.checked = true;
		box.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		await flush();
		const alert = panel.querySelector( '.sgs-cart__panel-gift-error' );
		expect( alert.hidden ).toBe( false );
		expect( alert.textContent ).toBe( 'Too long.' );
	} );

	test( 'another gift box saving updates this one, but never while this one is being edited', () => {
		jest.useFakeTimers();
		initGift( panel );
		const box = panel.querySelector( '.sgs-cart__panel-gift-checkbox' );
		document.dispatchEvent( new CustomEvent( GIFT_EVENT, { detail: { on: true, to: 'Al', message: 'Hi', source: {} } } ) );
		expect( box.checked ).toBe( true );
		expect( panel.querySelector( '.sgs-cart__panel-gift-message' ).value ).toBe( 'Hi' );
		const note = panel.querySelector( '.sgs-cart__panel-gift-message' );
		note.value = 'Mine';
		note.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		document.dispatchEvent( new CustomEvent( GIFT_EVENT, { detail: { on: false, to: '', message: '', source: {} } } ) );
		expect( box.checked ).toBe( true );
		expect( note.value ).toBe( 'Mine' );
		jest.useRealTimers();
	} );
} );

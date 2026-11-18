/**
 * sgs/cart drawer quantity stepper (itemQtyStyle "stepper"): item-row-template.js and panel-render.js.
 *
 * The default number box stays byte-for-byte what it was (the cart-view-requests snapshots also pin that); the stepper
 * names each button after the product, stops at the line's Store API limits, and goes through the same update request
 * as the number box while keyboard focus stays on the control in use.
 */

'use strict';

jest.mock( '@sgs/nav-store', () => ( {} ) );
jest.mock( '../../src/shared/wishlist-store', () => ( { addWishlistId: jest.fn() } ) );

const { itemRowHtml } = require( '../../src/blocks/cart/item-row-template' );

const flush = async () => {
	for ( let i = 0; i < 6; i++ ) {
		await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
	}
};

const meta = { currency_minor_unit: 2, currency_prefix: '£', currency_suffix: '' };
const totals = ( minor ) => ( { total_items: String( minor ), total_price: String( minor ), ...meta } );

const line = ( qty, limits ) => ( {
	key: 'k1',
	id: 7,
	name: 'Zookie box',
	quantity: qty,
	permalink: 'https://example.test/p/7',
	images: [],
	item_data: [],
	totals: { line_total: String( qty * 1000 ), ...meta },
	...( limits ? { quantity_limits: limits } : {} ),
} );

const html = ( qty, limits, opts = { qtyStyle: 'stepper' } ) => {
	const host = document.createElement( 'div' );
	host.innerHTML = itemRowHtml( line( qty, limits ), totals( qty * 1000 ), opts );
	return host;
};

describe( 'item row quantity control markup', () => {
	it( 'a stepper is off unless asked for: the default row has the number box and no buttons', () => {
		const host = html( 2, undefined, {} );
		expect( host.querySelector( '.sgs-cart__item-stepper' ) ).toBeNull();
		expect( host.querySelector( '.sgs-cart__item-qty-step' ) ).toBeNull();
		expect( host.querySelector( 'label.sgs-cart__item-qty-label' ).className ).toBe( 'sgs-cart__item-qty-label' );
		expect( host.querySelector( 'input' ).outerHTML ).toBe(
			'<input type="number" min="0" step="1" id="sgs-cart-qty-k1" class="sgs-cart__item-qty-input" value="2" data-key="k1" aria-label="Quantity for Zookie box">'
		);
	} );

	it( 'the stepper has a minus button, the number and a plus button, each named after the product', () => {
		const host = html( 2, { minimum: 1, maximum: 10, multiple_of: 1, editable: true } );
		const stepper = host.querySelector( '.sgs-cart__item-stepper' );
		const [ minus, plus ] = stepper.querySelectorAll( 'button' );
		expect( minus.getAttribute( 'aria-label' ) ).toBe( 'Decrease quantity of Zookie box' );
		expect( plus.getAttribute( 'aria-label' ) ).toBe( 'Increase quantity of Zookie box' );
		expect( minus.getAttribute( 'type' ) ).toBe( 'button' );
		const input = stepper.querySelector( 'input[type=number]' );
		expect( input.getAttribute( 'aria-label' ) ).toBe( 'Quantity for Zookie box' );
		expect( input.value ).toBe( '2' );
		expect( input.getAttribute( 'max' ) ).toBe( '10' );
		expect( minus.disabled ).toBe( false );
		expect( plus.disabled ).toBe( false );
		expect( host.querySelector( 'label' ).className ).toContain( 'sgs-cart__item-qty-label--hidden' );
	} );

	it( 'the minus button is off at the minimum and the plus button at the maximum', () => {
		const atMin = html( 1, { minimum: 1, maximum: 5 } );
		expect( atMin.querySelector( '.sgs-cart__item-qty-step--minus' ).disabled ).toBe( true );
		expect( atMin.querySelector( '.sgs-cart__item-qty-step--plus' ).disabled ).toBe( false );
		const atMax = html( 5, { minimum: 1, maximum: 5 } );
		expect( atMax.querySelector( '.sgs-cart__item-qty-step--plus' ).disabled ).toBe( true );
		expect( atMax.querySelector( '.sgs-cart__item-qty-step--minus' ).disabled ).toBe( false );
	} );

	it( 'a line sold in steps moves by its step and stops when one more step would pass the maximum', () => {
		const host = html( 6, { minimum: 6, maximum: 12, multiple_of: 6 } );
		expect( host.querySelector( '.sgs-cart__item-qty-step--minus' ).disabled ).toBe( true );
		expect( host.querySelector( '.sgs-cart__item-qty-step--plus' ).dataset.step ).toBe( '6' );
		const full = html( 12, { minimum: 6, maximum: 12, multiple_of: 6 } );
		expect( full.querySelector( '.sgs-cart__item-qty-step--plus' ).disabled ).toBe( true );
	} );

	it( 'a line that cannot be edited has both buttons off and the number read-only', () => {
		const host = html( 3, { minimum: 1, maximum: 9, editable: false } );
		expect( host.querySelectorAll( 'button:disabled' ).length ).toBe( 2 );
		expect( host.querySelector( 'input' ).readOnly ).toBe( true );
	} );

	it( 'a line with no limits from the Store API is open at the top and stops at one at the bottom', () => {
		const host = html( 4, undefined );
		expect( host.querySelector( '.sgs-cart__item-qty-step--plus' ).disabled ).toBe( false );
		expect( html( 1, undefined ).querySelector( '.sgs-cart__item-qty-step--minus' ).disabled ).toBe( true );
	} );
} );

describe( 'stepper in the drawer', () => {
	let state;
	let limits;
	let posts;
	let startLimits = { minimum: 1, maximum: 3, multiple_of: 1, editable: true };

	const DOM = `
<div class="wp-block-sgs-cart sgs-cart" data-display-mode="drawer" data-show-zero-any="true" data-count-pop="off">
	<button data-sgs-cart-trigger aria-label="View your cart"><span data-sgs-cart-count>0</span></button>
	<div data-sgs-cart-panel data-sgs-cart-mode="drawer">
		<div data-sgs-cart-items aria-busy="true" data-qty-style="stepper"></div>
		<div class="sgs-cart__panel-subtotal" data-sgs-cart-footer><span data-sgs-cart-subtotal></span></div>
		<p data-sgs-cart-status></p>
	</div>
</div>`;

	beforeEach( async () => {
		state = 2;
		limits = startLimits;
		posts = [];
		delete window.sgsCartLive;
		delete window.wp;
		global.fetch = jest.fn( ( url, options = {} ) => {
			if ( 'POST' === ( options.method || 'GET' ) ) {
				const body = JSON.parse( options.body );
				posts.push( String( url ).replace( /^.*\/wc\/store\/v1/, '' ) + ' ' + JSON.stringify( body ) );
				state = body.quantity ?? 0;
			}
			return Promise.resolve( {
				ok: true,
				headers: { get: () => 'nonce-1' },
				json: () =>
					Promise.resolve( {
						items: state ? [ line( state, limits ) ] : [],
						items_count: state,
						totals: totals( state * 1000 ),
					} ),
			} );
		} );
		document.body.innerHTML = DOM;
		jest.isolateModules( () => {
			require( '../../src/blocks/cart/view.js' );
		} );
		await flush();
		document.querySelector( '[data-sgs-cart-trigger]' ).click();
		await flush();
	} );

	it( 'a remove that fails says so and puts keyboard focus back on the remove button', async () => {
		const remove = document.querySelector( 'button.sgs-cart__item-remove' );
		remove.focus();
		// A browser drops focus from a button the moment it is disabled; jsdom does not, so the call itself is the proof.
		const refocus = jest.spyOn( remove, 'focus' );
		global.fetch = jest.fn( () => Promise.reject( new TypeError( 'offline' ) ) );
		remove.click();
		await flush();
		expect( document.querySelector( '[data-sgs-cart-status]' ).textContent ).toBe( 'Could not remove that item. Please try again.' );
		expect( remove.disabled ).toBe( false );
		expect( refocus ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'plus adds one through the same update request', async () => {
		const plus = document.querySelector( '.sgs-cart__item-qty-step--plus' );
		plus.focus();
		plus.click();
		await flush();
		expect( posts ).toEqual( [ '/cart/update-item {"key":"k1","quantity":3}' ] );
		expect( document.querySelector( '.sgs-cart__item-qty-input' ).value ).toBe( '3' );
		expect( document.querySelector( '[data-sgs-cart-status]' ).textContent ).toBe( 'Quantity updated to 3.' );
	} );

	it( 'reaching the maximum switches plus off and hands keyboard focus to the number', async () => {
		const plus = document.querySelector( '.sgs-cart__item-qty-step--plus' );
		plus.focus();
		plus.click();
		await flush();
		expect( document.querySelector( '.sgs-cart__item-qty-step--plus' ).disabled ).toBe( true );
		expect( document.activeElement ).toBe( document.querySelector( '.sgs-cart__item-qty-input' ) );
	} );

	it( 'minus takes one off, and focus moves to the number once minus is off', async () => {
		const minus = document.querySelector( '.sgs-cart__item-qty-step--minus' );
		minus.focus();
		minus.click();
		await flush();
		expect( posts ).toEqual( [ '/cart/update-item {"key":"k1","quantity":1}' ] );
		// At 1 the minus button is now off, so focus moves to the number instead of being lost.
		expect( document.activeElement ).toBe( document.querySelector( '.sgs-cart__item-qty-input' ) );
	} );

	describe( 'a line already at its minimum', () => {
		beforeAll( () => {
			startLimits = { minimum: 2, maximum: 3, multiple_of: 1, editable: true };
		} );
		afterAll( () => {
			startLimits = { minimum: 1, maximum: 3, multiple_of: 1, editable: true };
		} );

		it( 'a disabled button sends nothing', async () => {
			const minus = document.querySelector( '.sgs-cart__item-qty-step--minus' );
			expect( minus.disabled ).toBe( true );
			minus.click();
			await flush();
			expect( posts ).toEqual( [] );
		} );
	} );
} );

/**
 * sgs/cart live basket (src/blocks/cart/view.js on src/shared/cart-live): the Store API request count and the drawer's
 * rendered markup.
 *
 * Pins, for a drawer with one line: GET /cart once on load, once on opening the drawer and once per add event; one POST
 * per quantity change or removal and no GET beside it. The drawer's markup after each step is snapshotted.
 */

'use strict';

jest.mock( '@sgs/nav-store', () => ( {} ) );
jest.mock( '../../src/shared/wishlist-store', () => ( { addWishlistId: jest.fn() } ) );

const flush = async () => {
	for ( let i = 0; i < 6; i++ ) {
		await new Promise( ( resolve ) => setTimeout( resolve, 0 ) );
	}
};

const totals = ( minor ) => ( {
	total_items: String( minor ),
	total_price: String( minor ),
	currency_minor_unit: 2,
	currency_prefix: '£',
	currency_suffix: '',
} );

const line = ( qty ) => ( {
	key: 'k1',
	id: 7,
	name: 'Zookie box',
	quantity: qty,
	permalink: 'https://example.test/p/7',
	images: [],
	item_data: [],
	prices: { price: '1000', currency_minor_unit: 2, currency_prefix: '£', currency_suffix: '' },
	totals: { line_total: String( qty * 1000 ), line_total_tax: '0', currency_minor_unit: 2, currency_prefix: '£', currency_suffix: '' },
} );

const cart = ( qty ) => ( {
	items: qty ? [ line( qty ) ] : [],
	items_count: qty,
	totals: totals( qty * 1000 ),
} );

const DOM = `
<div class="wp-block-sgs-cart sgs-cart" data-display-mode="drawer" data-show-zero-any="true" data-count-pop="off">
	<button data-sgs-cart-trigger aria-label="View your cart"><span data-sgs-cart-count>0</span></button>
	<div data-sgs-cart-panel data-sgs-cart-mode="drawer">
		<h2>Basket <span data-sgs-cart-panel-count></span></h2>
		<div data-sgs-cart-items aria-busy="true"></div>
		<div class="sgs-cart__panel-subtotal" data-sgs-cart-footer><span data-sgs-cart-subtotal></span></div>
		<p data-sgs-cart-status></p>
	</div>
</div>`;

let state;
let calls;
let added;
const realAdd = document.addEventListener.bind( document );

const mockFetch = () => {
	global.fetch = jest.fn( ( url, options = {} ) => {
		const method = options.method || 'GET';
		const path = String( url ).replace( /^.*\/wc\/store\/v1/, '' );
		calls.push( method + ' ' + path );
		if ( 'POST' === method ) {
			const body = JSON.parse( options.body );
			if ( '/cart/remove-item' === path || 0 === body.quantity ) {
				state = 0;
			} else {
				state = body.quantity;
			}
		}
		return Promise.resolve( {
			ok: true,
			headers: { get: () => 'nonce-1' },
			json: () => Promise.resolve( cart( state ) ),
		} );
	} );
};

const load = async () => {
	document.body.innerHTML = DOM;
	jest.isolateModules( () => {
		require( '../../src/blocks/cart/view.js' );
	} );
	await flush();
};

beforeEach( () => {
	state = 2;
	calls = [];
	added = [];
	document.addEventListener = ( name, fn, opts ) => {
		added.push( [ name, fn ] );
		realAdd( name, fn, opts );
	};
	delete window.sgsCartLive;
	delete window.wp;
	mockFetch();
} );

afterEach( () => {
	added.forEach( ( [ name, fn ] ) => document.removeEventListener( name, fn ) );
	document.addEventListener = realAdd;
} );

describe( 'sgs/cart drawer: Store API requests', () => {
	it( 'load, open, add, quantity change and remove each cost the same requests', async () => {
		const steps = {};
		const mark = ( name ) => {
			steps[ name ] = calls.splice( 0 );
		};
		await load();
		mark( 'load' );
		expect( document.querySelector( '[data-sgs-cart-count]' ).textContent ).toBe( '2' );

		document.querySelector( '[data-sgs-cart-trigger]' ).click();
		await flush();
		mark( 'open' );
		const opened = document.body.innerHTML;

		state = 3;
		document.dispatchEvent( new Event( 'wc-blocks_added_to_cart' ) );
		await flush();
		mark( 'add' );
		expect( document.querySelector( '[data-sgs-cart-count]' ).textContent ).toBe( '3' );

		const input = document.querySelector( 'input.sgs-cart__item-qty-input' );
		input.value = '5';
		input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		await flush();
		mark( 'quantity' );
		const afterQuantity = document.body.innerHTML;

		document.querySelector( 'button.sgs-cart__item-remove' ).click();
		await flush();
		mark( 'remove' );

		expect( steps ).toEqual( {
			load: [ 'GET /cart' ],
			open: [ 'GET /cart' ],
			add: [ 'GET /cart' ],
			quantity: [ 'POST /cart/update-item' ],
			remove: [ 'POST /cart/remove-item' ],
		} );
		expect( opened ).toMatchSnapshot( 'drawer after open' );
		expect( afterQuantity ).toMatchSnapshot( 'drawer after quantity change' );
		expect( document.body.innerHTML ).toMatchSnapshot( 'drawer after remove' );
		expect( document.querySelector( '[data-sgs-cart-count]' ).textContent ).toBe( '0' );
	} );

	it( 'the first mutation carries the nonce the loading GET returned', async () => {
		await load();
		document.querySelector( '[data-sgs-cart-trigger]' ).click();
		await flush();
		const input = document.querySelector( 'input.sgs-cart__item-qty-input' );
		input.value = '4';
		input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		await flush();
		const post = global.fetch.mock.calls.find( ( [ , o ] ) => o && 'POST' === o.method );
		expect( post[ 1 ].headers.Nonce ).toBe( 'nonce-1' );
	} );
} );

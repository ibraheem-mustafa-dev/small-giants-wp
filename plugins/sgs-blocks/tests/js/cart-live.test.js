/**
 * Cart live (src/shared/cart-live/): the page-wide cart reader and the free-delivery renderer (Spec 27 FR-30-20).
 *
 * - separate bundles of the module share one instance, one listener set and one Store API request;
 * - WooCommerce's add and remove events refetch (a burst is one request in flight and one queued);
 * - a page with the `wc/store/cart` store reads it instead of fetching, and listeners get Store API-shaped data;
 * - a £21.50 basket against £35 reads "Add £13.50 more" at 61%, and a £35 basket reads the success line;
 * - the shared renderer paints the cart drawer's names by default and the bar's when told to.
 */

'use strict';

const flush = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

const cartJson = ( minor ) => ( {
	items: [ { key: 'a', quantity: 2 } ],
	items_count: 2,
	totals: {
		total_items: String( minor ),
		total_items_tax: '0',
		currency_minor_unit: 2,
		currency_prefix: '£',
		currency_suffix: '',
	},
} );

/**
 * Load a fresh copy of the module, as a second view bundle would.
 *
 * @return {Object} The module's exports.
 */
const loadBundle = () => {
	let mod;
	jest.isolateModules( () => {
		mod = require( '../../src/shared/cart-live' );
	} );
	return mod;
};

// Every instance listens on the same jsdom document, so each test removes the listeners it added.
let added = [];
const realAdd = document.addEventListener.bind( document );

beforeEach( () => {
	added = [];
	document.addEventListener = ( name, fn, opts ) => {
		added.push( [ name, fn ] );
		realAdd( name, fn, opts );
	};
	delete window.sgsCartLive;
	delete window.wp;
	document.body.className = '';
	global.fetch = jest.fn( () =>
		Promise.resolve( {
			ok: true,
			json: () => Promise.resolve( cartJson( 2150 ) ),
		} )
	);
} );

afterEach( () => {
	added.forEach( ( [ name, fn ] ) =>
		document.removeEventListener( name, fn )
	);
	document.addEventListener = realAdd;
} );

describe( 'cart-live singleton', () => {
	it( 'two bundles share one instance and one request', async () => {
		const first = loadBundle();
		const second = loadBundle();
		const a = jest.fn();
		const b = jest.fn();
		first.onCartChange( a );
		second.onCartChange( b );
		await flush();
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		expect( global.fetch.mock.calls[ 0 ][ 0 ] ).toMatch(
			/\/wc\/store\/v1\/cart$/
		);
		expect( a ).toHaveBeenCalledTimes( 1 );
		expect( b ).toHaveBeenCalledTimes( 1 );
		expect( window.sgsCartLive.version ).toBe( 1 );
	} );

	it( 'a listener added later gets the known cart at once', async () => {
		const mod = loadBundle();
		mod.onCartChange( jest.fn() );
		await flush();
		const late = jest.fn();
		mod.onCartChange( late );
		expect( late ).toHaveBeenCalledTimes( 1 );
		expect( late.mock.calls[ 0 ][ 0 ].items_count ).toBe( 2 );
	} );

	it( 'refetches on each WooCommerce cart event, and a burst is coalesced', async () => {
		const mod = loadBundle();
		mod.onCartChange( jest.fn() );
		await flush();
		global.fetch.mockClear();
		document.dispatchEvent( new Event( 'wc-blocks_added_to_cart' ) );
		document.dispatchEvent( new Event( 'added_to_cart' ) );
		document.dispatchEvent( new Event( 'wc-blocks_removed_from_cart' ) );
		await flush();
		await flush();
		// One in flight plus one queued behind it.
		expect( global.fetch ).toHaveBeenCalledTimes( 2 );
	} );

	it( "ignores the store's empty defaults, which carry no currency, and asks the Store API after a grace period", async () => {
		jest.useFakeTimers();
		const selectors = {
			getCartData: jest.fn( () => ( { items: [], itemsCount: 0, totals: { currency_code: '', total_items: '0' } } ) ),
			hasFinishedResolution: jest.fn( () => true ),
		};
		window.wp = { data: { select: jest.fn( () => selectors ), subscribe: jest.fn() } };
		const mod = loadBundle();
		const cb = jest.fn();
		mod.onCartChange( cb );
		expect( cb ).not.toHaveBeenCalled();
		expect( global.fetch ).not.toHaveBeenCalled();
		jest.advanceTimersByTime( 3100 );
		jest.useRealTimers();
		await flush();
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		expect( cb ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'stop listening works', async () => {
		const mod = loadBundle();
		const cb = jest.fn();
		const stop = mod.onCartChange( cb );
		await flush();
		stop();
		document.dispatchEvent( new Event( 'wc-blocks_added_to_cart' ) );
		await flush();
		expect( cb ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'reads the wc/store/cart store when the page has it, with no request', async () => {
		let subscriber = null;
		const data = {
			items: [ { quantity: 3 } ],
			itemsCount: 3,
			totals: {
				total_items: '2150',
				total_items_tax: '0',
				currency_code: 'GBP',
				currency_minor_unit: 2,
				currency_prefix: '£',
			},
		};
		const selectors = {
			getCartData: jest.fn( () => data ),
			hasFinishedResolution: jest.fn( () => true ),
		};
		window.wp = {
			data: {
				select: jest.fn( () => selectors ),
				subscribe: jest.fn( ( cb ) => {
					subscriber = cb;
				} ),
			},
		};
		const mod = loadBundle();
		const cb = jest.fn();
		mod.onCartChange( cb );
		await flush();
		expect( global.fetch ).not.toHaveBeenCalled();
		expect( cb ).toHaveBeenCalledTimes( 1 );
		expect( cb.mock.calls[ 0 ][ 0 ].totals.total_items ).toBe( '2150' );
		expect( cb.mock.calls[ 0 ][ 0 ].totals.currency_prefix ).toBe( '£' );
		expect( cb.mock.calls[ 0 ][ 0 ].items_count ).toBe( 3 );
		// A quantity stepper on the Cart block changes the store: the listener hears it.
		selectors.getCartData.mockReturnValue( {
			...data,
			itemsCount: 4,
			items: [ { quantity: 4 } ],
		} );
		subscriber();
		expect( cb ).toHaveBeenCalledTimes( 2 );
		expect( cb.mock.calls[ 1 ][ 0 ].items_count ).toBe( 4 );
		// An unchanged store does not notify again.
		subscriber();
		expect( cb ).toHaveBeenCalledTimes( 2 );
	} );
} );

describe( 'free-delivery progress renderer', () => {
	const {
		updateFreeDeliveryProgress,
	} = require( '../../src/shared/cart-live/free-delivery-progress' );

	const bar = () => {
		document.body.innerHTML =
			'<div id="bar"><p data-sgs-cart-free-delivery-text></p><div role="progressbar" aria-valuenow="0" data-sgs-cart-free-delivery-track></div></div>';
		const el = document.getElementById( 'bar' );
		el.sgsFillReleased = true;
		return el;
	};
	const config = {
		threshold: '35',
		message: 'Add %s more for free delivery',
		successMessage: 'You have free delivery',
	};
	const options = {
		pctProperty: '--sgs-free-delivery-bar-pct',
		completeClass: 'sgs-free-delivery-bar--complete',
	};

	it( 'reads Add £13.50 more at 61% for a £21.50 basket', () => {
		const el = bar();
		updateFreeDeliveryProgress( el, cartJson( 2150 ), config, options );
		expect(
			el.querySelector( '[data-sgs-cart-free-delivery-text]' ).textContent
		).toBe( 'Add £13.50 more for free delivery' );
		expect(
			el
				.querySelector( '[role=progressbar]' )
				.getAttribute( 'aria-valuenow' )
		).toBe( '61' );
		expect(
			el.style.getPropertyValue( '--sgs-free-delivery-bar-pct' )
		).toBe( '61.42857142857143%' );
		expect(
			el.classList.contains( 'sgs-free-delivery-bar--complete' )
		).toBe( false );
		expect( el.hidden ).toBe( false );
	} );

	it( 'reads the success line for a £35 basket', () => {
		const el = bar();
		updateFreeDeliveryProgress( el, cartJson( 3500 ), config, options );
		expect(
			el.querySelector( '[data-sgs-cart-free-delivery-text]' ).textContent
		).toBe( 'You have free delivery' );
		expect(
			el
				.querySelector( '[role=progressbar]' )
				.getAttribute( 'aria-valuenow' )
		).toBe( '100' );
		expect(
			el.classList.contains( 'sgs-free-delivery-bar--complete' )
		).toBe( true );
	} );

	it( 'hides for an empty basket when told to, and with no threshold', () => {
		const el = bar();
		updateFreeDeliveryProgress(
			el,
			{ items: [], totals: {} },
			{ ...config, hideWhenEmpty: true },
			options
		);
		expect( el.hidden ).toBe( true );
		updateFreeDeliveryProgress(
			el,
			cartJson( 100 ),
			{ ...config, threshold: '' },
			options
		);
		expect( el.hidden ).toBe( true );
	} );

	it( 'uses the cart drawer names when given no options', () => {
		const el = bar();
		updateFreeDeliveryProgress( el, cartJson( 3500 ), config );
		expect(
			el.classList.contains( 'sgs-cart__free-delivery--complete' )
		).toBe( true );
		expect(
			el.style.getPropertyValue( '--sgs-cart-free-delivery-pct' )
		).toBe( '100%' );
	} );

	it( 'leaves an unchanged message alone', () => {
		const el = bar();
		updateFreeDeliveryProgress( el, cartJson( 2150 ), config, options );
		const text = el.querySelector( '[data-sgs-cart-free-delivery-text]' );
		const node = text.firstChild;
		updateFreeDeliveryProgress( el, cartJson( 2150 ), config, options );
		expect( text.firstChild ).toBe( node );
	} );
} );

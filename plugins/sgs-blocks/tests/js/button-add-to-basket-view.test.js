/**
 * sgs/button's `add-to-basket` link source (src/blocks/button/view.js): a tap adds the product through the cart proxy.
 *
 * Negative controls: 'a failed add shows the message' fails if the failure is swallowed; 'a second tap while busy is
 * ignored' fails if the busy state does not guard the handler; 'an ordinary link is left alone' fails if the handler binds
 * to every link; 'a button the page redrew after load still adds' fails if the listener is bound to the first element; 'a button put into the page after load still adds' fails if boot looks for a button before listening.
 */

const MARKUP =
	'<a id="add" class="sgs-button" href="/product/trio/" data-sgs-link-source="add-to-basket"' +
	' data-sgs-add-url="/wp-json/sgs/v1/cart/add-item" data-sgs-add-nonce="nonce1"' +
	" data-sgs-add-body='{\"id\":42,\"quantity\":1}' data-sgs-add-after=\"stay\">Add</a>" +
	'<a id="plain" href="/elsewhere/">Elsewhere</a>';

const flush = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

describe( 'add-to-basket button', () => {
	let events;
	let onDocument;
	let onWindow;
	let viewListeners;

	beforeEach( () => {
		jest.resetModules();
		document.body.innerHTML = MARKUP;
		events = [];
		onDocument = () => events.push( 'document' );
		onWindow = () => events.push( 'window' );
		document.addEventListener( 'wc-blocks_added_to_cart', onDocument );
		window.addEventListener( 'sgs-cart-updated', onWindow );
		// The view listens on the document, which outlives a test: record its listeners so each test removes its own.
		const addListener = jest.spyOn( document, 'addEventListener' );
		require( '../../src/blocks/button/view' );
		viewListeners = addListener.mock.calls.filter( ( call ) => 'click' === call[ 0 ] );
		addListener.mockRestore();
	} );

	afterEach( () => {
		viewListeners.forEach( ( [ type, listener ] ) => document.removeEventListener( type, listener ) );
		document.removeEventListener( 'wc-blocks_added_to_cart', onDocument );
		window.removeEventListener( 'sgs-cart-updated', onWindow );
		delete global.fetch;
	} );

	it( 'adds through the proxy with the nonce and the body, shows a busy state and signals the cart', async () => {
		let resolveFetch;
		global.fetch = jest.fn(
			() =>
				new Promise( ( resolve ) => {
					resolveFetch = resolve;
				} )
		);
		const link = document.getElementById( 'add' );
		link.click();
		await flush();

		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		const [ url, options ] = global.fetch.mock.calls[ 0 ];
		expect( url ).toBe( '/wp-json/sgs/v1/cart/add-item' );
		expect( options.headers[ 'X-WP-Nonce' ] ).toBe( 'nonce1' );
		expect( JSON.parse( options.body ) ).toEqual( { id: 42, quantity: 1 } );
		expect( link.getAttribute( 'aria-busy' ) ).toBe( 'true' );

		resolveFetch( { ok: true, json: async () => ( { added: true } ) } );
		await flush();
		await flush();

		expect( events ).toEqual( [ 'document', 'window' ] );
		expect( link.hasAttribute( 'aria-busy' ) ).toBe( false );
		expect( link.nextElementSibling.getAttribute( 'aria-live' ) ).toBe( 'polite' );
		expect( link.nextElementSibling.textContent ).toBe( 'Added to your basket.' );
	} );

	it( 'a button the page redrew after load still adds', async () => {
		global.fetch = jest.fn( () => new Promise( () => {} ) );
		const first = document.getElementById( 'add' );
		const redrawn = first.cloneNode( true );
		first.replaceWith( redrawn );
		redrawn.click();
		await flush();

		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		expect( redrawn.getAttribute( 'aria-busy' ) ).toBe( 'true' );
	} );

	it( 'a button put into the page after load still adds', async () => {
		global.fetch = jest.fn( () => new Promise( () => {} ) );
		viewListeners.forEach( ( [ type, listener ] ) => document.removeEventListener( type, listener ) );
		document.body.innerHTML = '';
		jest.resetModules();
		const addListener = jest.spyOn( document, 'addEventListener' );
		require( '../../src/blocks/button/view' );
		viewListeners = addListener.mock.calls.filter( ( call ) => 'click' === call[ 0 ] );
		addListener.mockRestore();
		document.body.innerHTML = MARKUP;
		document.getElementById( 'add' ).click();
		await flush();

		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'a second tap while busy is ignored', async () => {
		global.fetch = jest.fn( () => new Promise( () => {} ) );
		const link = document.getElementById( 'add' );
		link.click();
		link.click();
		await flush();
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'a failed add shows the message, clears the busy state and lets the next tap follow the link', async () => {
		global.fetch = jest.fn( async () => ( {
			ok: false,
			json: async () => ( {
				message: 'This product is currently out of stock.',
			} ),
		} ) );
		const link = document.getElementById( 'add' );
		link.click();
		await flush();
		await flush();

		expect( events ).toEqual( [] );
		expect( link.hasAttribute( 'aria-busy' ) ).toBe( false );
		expect( link.nextElementSibling.textContent ).toContain( 'This product is currently out of stock.' );

		// Read the click's fate as it reaches the document, then stop jsdom trying to navigate.
		let preventedByHandler = null;
		const observe = ( event ) => {
			preventedByHandler = event.defaultPrevented;
			event.preventDefault();
		};
		document.addEventListener( 'click', observe );
		link.dispatchEvent( new MouseEvent( 'click', { bubbles: true, cancelable: true, button: 0 } ) );
		document.removeEventListener( 'click', observe );
		expect( preventedByHandler ).toBe( false );
		expect( global.fetch ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'a network failure shows the plain sentence', async () => {
		global.fetch = jest.fn( async () => {
			throw new TypeError( 'Failed to fetch' );
		} );
		const link = document.getElementById( 'add' );
		link.click();
		await flush();
		await flush();
		expect( link.nextElementSibling.textContent ).toContain( 'Could not add that to your basket.' );
		expect( link.nextElementSibling.textContent ).not.toContain( 'Failed to fetch' );
	} );

	it( 'an ordinary link is left alone', () => {
		global.fetch = jest.fn();
		const click = new MouseEvent( 'click', { bubbles: true, cancelable: true, button: 0 } );
		document.getElementById( 'plain' ).dispatchEvent( click );
		expect( click.defaultPrevented ).toBe( false );
		expect( global.fetch ).not.toHaveBeenCalled();
	} );
} );

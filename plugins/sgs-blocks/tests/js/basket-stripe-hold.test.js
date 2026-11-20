/**
 * @jest-environment jsdom
 *
 * Basket Stripe hold (assets/js/basket-stripe-hold.js): a <script> from js.stripe.com added with appendChild or
 * insertBefore waits for the first scroll, press, key or touch, then lands where it was meant to, in order; every other
 * node is added at once, and the DOM methods are put back on release.
 */
const ORIGINAL = {
	append: Node.prototype.appendChild,
	insert: Node.prototype.insertBefore,
};

function script( src ) {
	const s = document.createElement( 'script' );
	s.src = src;
	return s;
}

function load() {
	jest.isolateModules( () => {
		require( '../../assets/js/basket-stripe-hold.js' );
	} );
}

afterEach( () => {
	// Release any hold a test left armed, so it cannot add its scripts into the next test's page.
	window.dispatchEvent( new Event( 'keydown' ) );
	Node.prototype.appendChild = ORIGINAL.append;
	Node.prototype.insertBefore = ORIGINAL.insert;
	document.head.innerHTML = '';
	document.body.innerHTML = '';
} );

describe( 'basket Stripe hold', () => {
	it( 'holds a js.stripe.com script and adds other nodes at once', () => {
		load();
		const stripe = script( 'https://js.stripe.com/clover/stripe.js' );
		const plugin = script( 'https://shop.test/wp-content/plugins/pay/blocks.js' );
		const div = document.createElement( 'div' );
		expect( document.head.appendChild( stripe ) ).toBe( stripe );
		document.head.appendChild( plugin );
		document.body.appendChild( div );
		expect( stripe.isConnected ).toBe( false );
		expect( plugin.isConnected ).toBe( true );
		expect( div.isConnected ).toBe( true );
	} );

	it( 'treats a look-alike host as an ordinary script', () => {
		load();
		const other = script( 'https://js.stripe.com.evil.test/stripe.js' );
		document.head.appendChild( other );
		expect( other.isConnected ).toBe( true );
	} );

	it( 'adds the held scripts in order on the first scroll and restores the DOM methods', () => {
		load();
		const marker = document.createElement( 'meta' );
		document.head.appendChild( marker );
		const a = script( 'https://js.stripe.com/clover/stripe.js' );
		const b = script( 'https://js.stripe.com/v3/' );
		document.head.appendChild( a );
		document.head.insertBefore( b, marker );
		window.dispatchEvent( new Event( 'scroll' ) );
		expect( a.isConnected ).toBe( true );
		expect( b.isConnected ).toBe( true );
		expect( Array.from( document.head.children ) ).toEqual( [ b, marker, a ] );
		expect( Node.prototype.appendChild ).toBe( ORIGINAL.append );
		expect( Node.prototype.insertBefore ).toBe( ORIGINAL.insert );
	} );

	it( 'adds a Stripe script at once after the first interaction', () => {
		load();
		window.dispatchEvent( new Event( 'pointerdown' ) );
		const late = script( 'https://js.stripe.com/clover/stripe.js' );
		document.head.appendChild( late );
		expect( late.isConnected ).toBe( true );
	} );
} );

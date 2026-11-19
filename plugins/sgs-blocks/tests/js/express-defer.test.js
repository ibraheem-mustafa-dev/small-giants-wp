/**
 * Late start for the payment plugin's scripts (assets/js/express-defer.js, Spec 27 FR-27-EXPRESS-DEFER).
 * Negative controls: 'runs in page order' fails if the loader starts every file at once; 'runs once' fails without the
 * `started` guard; 'unknown scripts untouched' fails if the loader revives every plain-text script.
 */
const SRC = 'https://shop.test/wp-content/plugins/woo-stripe-payment/assets/build/';

function held( attrs, body = '' ) {
	const s = document.createElement( 'script' );
	s.type = 'text/plain';
	s.setAttribute( 'data-sgs-defer', 'text/javascript' );
	Object.entries( attrs ).forEach( ( [ k, v ] ) => s.setAttribute( k, v ) );
	s.textContent = body;
	return s;
}

let log;
let loads;
let appendedOrder;
let onLoaded;

function load() {
	jest.isolateModules( () => require( '../../assets/js/express-defer.js' ) );
}

/** jsdom does not fetch scripts; record each live external script and finish it on demand. */
function patchScripts() {
	const original = document.createElement.bind( document );
	jest.spyOn( document, 'createElement' ).mockImplementation( ( tag ) => {
		const el = original( tag );
		if ( 'script' === tag ) {
			Object.defineProperty( el, 'src', {
				configurable: true,
				get: () => el.getAttribute( 'src' ) || '',
				set: ( v ) => el.setAttribute( 'src', v ),
			} );
		}
		return el;
	} );
}

beforeEach( () => {
	log = [];
	loads = [];
	appendedOrder = [];
	document.body.innerHTML = '<div class="sgs-buybox__express"></div>';
	window.__ran = [];
	patchScripts();
	// Inline scripts run for real in jsdom only with runScripts; record live scripts instead of executing them.
	const replace = Node.prototype.replaceChild;
	jest.spyOn( Node.prototype, 'replaceChild' ).mockImplementation( function ( live, old ) {
		if ( 'SCRIPT' === live.tagName ) {
			const src = live.getAttribute( 'src' );
			appendedOrder.push( src ? 'file:' + src.replace( SRC, '' ) : 'inline:' + live.text );
			if ( src ) {
				loads.push( live );
			}
			old.parentNode.removeChild( old );
			document.body.appendChild( live );
			return old;
		}
		return replace.call( this, live, old );
	} );
	onLoaded = () => log.push( 'loaded' );
	window.addEventListener( 'sgs:express-loaded', onLoaded );
} );

afterEach( () => {
	window.removeEventListener( 'sgs:express-loaded', onLoaded );
	jest.restoreAllMocks();
	document.body.innerHTML = '';
} );

function build() {
	const a = held( { id: 'wc-stripe-actions-js-extra' }, 'window.__data=1' );
	const b = held( { id: 'wc-stripe-actions-js', src: SRC + 'actions.js', defer: '' } );
	const c = held( { id: 'wc-stripe-product-js-before' }, 'window.__before=1' );
	const d = held( { id: 'wc-stripe-product-js', src: SRC + 'product.js' } );
	const e = held( { id: 'wc-stripe-product-js-after' }, 'window.__after=1' );
	[ a, b, c, d, e ].forEach( ( n ) => document.body.appendChild( n ) );
}

describe( 'express defer loader', () => {
	test( 'does nothing before the first interaction', () => {
		build();
		load();
		expect( appendedOrder ).toEqual( [] );
		expect( document.querySelectorAll( 'script[type="text/plain"]' ).length ).toBe( 5 );
	} );

	test.each( [ 'scroll', 'pointerdown', 'keydown', 'touchstart' ] )( 'a %s starts it', ( name ) => {
		build();
		load();
		window.dispatchEvent( new Event( name ) );
		expect( appendedOrder.length ).toBeGreaterThan( 0 );
	} );

	test( 'runs in page order, each file finishing before the next, inline data kept in place', () => {
		build();
		load();
		window.dispatchEvent( new Event( 'scroll' ) );
		// The first inline runs at once; the first file then holds the queue until it has loaded.
		expect( appendedOrder ).toEqual( [ 'inline:window.__data=1', 'file:actions.js' ] );
		expect( loads[ 0 ].async ).toBe( false );
		expect( loads[ 0 ].hasAttribute( 'defer' ) ).toBe( false );
		expect( loads[ 0 ].hasAttribute( 'type' ) ).toBe( false );
		expect( loads[ 0 ].hasAttribute( 'data-sgs-defer' ) ).toBe( false );
		loads[ 0 ].dispatchEvent( new Event( 'load' ) );
		expect( appendedOrder ).toEqual( [ 'inline:window.__data=1', 'file:actions.js', 'inline:window.__before=1', 'file:product.js' ] );
		expect( log ).toEqual( [] );
		loads[ 1 ].dispatchEvent( new Event( 'load' ) );
		expect( appendedOrder[ 4 ] ).toBe( 'inline:window.__after=1' );
		expect( log ).toEqual( [ 'loaded' ] );
	} );

	test( 'a file that fails to load does not stop the rest', () => {
		build();
		load();
		window.dispatchEvent( new Event( 'scroll' ) );
		loads[ 0 ].dispatchEvent( new Event( 'error' ) );
		loads[ 1 ].dispatchEvent( new Event( 'load' ) );
		expect( log ).toEqual( [ 'loaded' ] );
	} );

	test( 'runs once however many triggers fire', () => {
		build();
		load();
		[ 'scroll', 'pointerdown', 'keydown', 'touchstart', 'scroll' ].forEach( ( n ) => window.dispatchEvent( new Event( n ) ) );
		loads[ 0 ].dispatchEvent( new Event( 'load' ) );
		loads[ 1 ].dispatchEvent( new Event( 'load' ) );
		expect( appendedOrder.filter( ( s ) => 'file:actions.js' === s ) ).toHaveLength( 1 );
		expect( appendedOrder ).toHaveLength( 5 );
		expect( log ).toEqual( [ 'loaded' ] );
	} );

	test( 'a real module type is restored', () => {
		const m = held( { id: 'x-js', src: SRC + 'x.js' } );
		m.setAttribute( 'data-sgs-defer', 'module' );
		document.body.appendChild( m );
		load();
		window.dispatchEvent( new Event( 'scroll' ) );
		expect( loads[ 0 ].type ).toBe( 'module' );
	} );

	test( 'unknown scripts untouched: a plain-text script without the marker is never revived', () => {
		const other = document.createElement( 'script' );
		other.type = 'text/plain';
		other.id = 'template';
		other.textContent = 'not code';
		document.body.appendChild( other );
		build();
		load();
		window.dispatchEvent( new Event( 'scroll' ) );
		expect( document.getElementById( 'template' ) ).toBe( other );
		expect( appendedOrder.join() ).not.toContain( 'not code' );
	} );

	test( 'without held scripts it adds no listeners and fires nothing', () => {
		const add = jest.spyOn( window, 'addEventListener' );
		load();
		window.dispatchEvent( new Event( 'scroll' ) );
		expect( log ).toEqual( [] );
		expect( add.mock.calls.filter( ( [ n ] ) => 'scroll' === n ) ).toHaveLength( 0 );
	} );

	test( 'the buttons coming within a screen of the viewport also starts it', () => {
		let callback;
		let options;
		window.IntersectionObserver = class {
			constructor( cb, opts ) {
				callback = cb;
				options = opts;
			}
			observe() {}
			disconnect() {}
		};
		Object.defineProperty( document, 'readyState', { configurable: true, get: () => 'complete' } );
		build();
		load();
		expect( appendedOrder ).toEqual( [] );
		expect( options.rootMargin ).toBe( '100% 0px 100% 0px' );
		callback( [ { isIntersecting: false } ] );
		expect( appendedOrder ).toEqual( [] );
		callback( [ { isIntersecting: true } ] );
		expect( appendedOrder.length ).toBeGreaterThan( 0 );
		delete window.IntersectionObserver;
		delete document.readyState;
	} );
} );

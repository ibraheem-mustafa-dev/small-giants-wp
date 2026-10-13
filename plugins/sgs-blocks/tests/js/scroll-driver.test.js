/**
 * Scroll driver (Spec 38A FR-38A-21): progress values at three positions,
 * the page basis, and silence under reduced motion.
 */

const VH = 800;

function makeMatchMedia( initial ) {
	const listeners = new Set();
	const query = {
		matches: initial,
		addEventListener: ( type, fn ) => listeners.add( fn ),
		removeEventListener: ( type, fn ) => listeners.delete( fn ),
	};
	return {
		query,
		set( value ) {
			query.matches = value;
			listeners.forEach( ( fn ) => fn( { matches: value } ) );
		},
	};
}

function load( { reduced = false } = {} ) {
	let queue = [];
	window.requestAnimationFrame = ( fn ) => {
		queue.push( fn );
		return queue.length;
	};
	window.cancelAnimationFrame = () => {
		queue = [];
	};
	const media = makeMatchMedia( reduced );
	const none = { matches: false, addEventListener() {}, removeEventListener() {} };
	window.matchMedia = ( query ) =>
		'(prefers-reduced-motion: reduce)' === query ? media.query : none;
	Object.defineProperty( window, 'innerHeight', {
		value: VH,
		configurable: true,
	} );
	document.body.innerHTML = '';
	let driver;
	jest.isolateModules( () => {
		driver = require( '../../src/shared/effects/scroll-driver' );
	} );
	return {
		driver,
		media,
		flush() {
			const run = queue;
			queue = [];
			run.forEach( ( fn ) => fn() );
		},
	};
}

function element( attr, top, height = 400 ) {
	const el = document.createElement( 'div' );
	if ( attr ) {
		el.setAttribute( 'data-sgs-scroll', attr );
	}
	el.getBoundingClientRect = () => ( {
		top,
		height,
		bottom: top + height,
	} );
	document.body.appendChild( el );
	return el;
}

const read = ( el ) => el.style.getPropertyValue( '--sgs-scroll-progress' );

describe( 'scroll driver', () => {
	test( 'view basis gives 0, 0.5 and 1 at three positions', () => {
		const { driver, flush } = load();
		const el = element( 'view', VH ); // top meets viewport bottom
		driver.observe( el );
		flush();
		expect( read( el ) ).toBe( '0' );

		el.getBoundingClientRect = () => ( {
			top: ( VH - 400 ) / 2,
			height: 400,
			bottom: ( VH - 400 ) / 2 + 400,
		} );
		driver.update();
		expect( read( el ) ).toBe( '0.5' );

		el.getBoundingClientRect = () => ( {
			top: -400,
			height: 400,
			bottom: 0,
		} ); // bottom meets viewport top
		driver.update();
		expect( read( el ) ).toBe( '1' );
	} );

	test( 'page basis follows document scroll, and unknown means view', () => {
		const { driver } = load();
		Object.defineProperty( document.documentElement, 'scrollHeight', {
			value: 2800,
			configurable: true,
		} );
		const page = element( 'page', 0 );
		const unknown = element( 'sideways', VH );
		driver.scan();
		[ [ 0, '0' ], [ 1000, '0.5' ], [ 2000, '1' ] ].forEach(
			( [ y, expected ] ) => {
				window.scrollY = y;
				driver.update();
				expect( read( page ) ).toBe( expected );
			}
		);
		expect( read( unknown ) ).toBe( '0' );
	} );

	test( 'scroll listener is passive and writes through rAF only', () => {
		const spy = jest.spyOn( window, 'addEventListener' );
		const { driver, flush } = load();
		const el = element( 'view', VH );
		driver.observe( el );
		expect( spy ).toHaveBeenCalledWith(
			'scroll',
			expect.any( Function ),
			{ passive: true }
		);
		expect( read( el ) ).toBe( '' );
		flush();
		expect( read( el ) ).toBe( '0' );

		el.getBoundingClientRect = () => ( {
			top: ( VH - 400 ) / 2,
			height: 400,
			bottom: ( VH - 400 ) / 2 + 400,
		} );
		window.dispatchEvent( new Event( 'scroll' ) );
		expect( read( el ) ).toBe( '0' );
		flush();
		expect( read( el ) ).toBe( '0.5' );
		spy.mockRestore();
	} );

	test( 'writes nothing under reduced motion and clears on a mid-session switch', () => {
		const { driver, media, flush } = load( { reduced: true } );
		const el = element( 'view', 100 );
		driver.observe( el );
		flush();
		driver.update();
		expect( read( el ) ).toBe( '' );

		media.set( false );
		flush();
		expect( read( el ) ).not.toBe( '' );

		media.set( true );
		expect( read( el ) ).toBe( '' );
	} );

	test( 'unobserve removes the value', () => {
		const { driver, flush } = load();
		const el = element( 'view', 100 );
		driver.observe( el );
		flush();
		expect( read( el ) ).not.toBe( '' );
		driver.unobserve( el );
		expect( read( el ) ).toBe( '' );
	} );
} );

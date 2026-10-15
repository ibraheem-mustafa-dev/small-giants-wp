/**
 * Scroll progress boot module (Spec 38A FR-38A-36): three sources, three
 * outputs, three counter formats, defaults, and a negative control.
 *
 * `@sgs/scroll-driver` is a webpack external with no jest mapping, so the test
 * maps it virtually onto the real driver source and wraps `observe` in a spy.
 */

jest.mock(
	'@sgs/scroll-driver',
	() => {
		const actual = jest.requireActual(
			'../../src/shared/effects/scroll-driver'
		);
		return {
			...actual,
			observe: jest.fn( actual.observe ),
			unobserve: jest.fn( actual.unobserve ),
		};
	},
	{ virtual: true }
);

const VH = 800;
const ATTR = 'data-sgs-fx-scroll-progress-';

function setup( { reduced = false, scrollY = 0 } = {} ) {
	let queue = [];
	window.requestAnimationFrame = ( fn ) => {
		queue.push( fn );
		return queue.length;
	};
	window.cancelAnimationFrame = () => {
		queue = [];
	};
	const query = {
		matches: reduced,
		addEventListener() {},
		removeEventListener() {},
	};
	const none = {
		matches: false,
		addEventListener() {},
		removeEventListener() {},
	};
	window.matchMedia = ( q ) =>
		'(prefers-reduced-motion: reduce)' === q ? query : none;
	Object.defineProperty( window, 'innerHeight', {
		value: VH,
		configurable: true,
	} );
	Object.defineProperty( document.documentElement, 'scrollHeight', {
		value: VH + 1000,
		configurable: true,
	} );
	window.scrollY = scrollY;
	document.body.innerHTML = '';
	return {
		flush() {
			const run = queue;
			queue = [];
			run.forEach( ( fn ) => fn() );
		},
	};
}

function mark( attrs = {}, parent = document.body, tag = 'div' ) {
	const el = document.createElement( tag );
	el.setAttribute( 'data-sgs-fx', 'scroll-progress' );
	Object.entries( attrs ).forEach( ( [ key, value ] ) =>
		el.setAttribute( ATTR + key, value )
	);
	parent.appendChild( el );
	return el;
}

function boot() {
	let driverMock;
	jest.isolateModules( () => {
		require( '../../src/shared/effects/fx-scroll-progress' );
		driverMock = require( '@sgs/scroll-driver' );
	} );
	return driverMock;
}

function pin( progress, total = 5 ) {
	const el = document.createElement( 'div' );
	el.setAttribute( 'data-sgs-fx', 'horizontal-panel' );
	el.setAttribute( 'data-sgs-fx-progress-total', String( total ) );
	el.style.setProperty( '--sgs-fx-progress', String( progress ) );
	document.body.appendChild( el );
	return el;
}

const prop = ( el ) => el.style.getPropertyValue( '--sgs-scroll-progress' );

describe( 'fx-scroll-progress', () => {
	test( 'page source drives a bar from the document scroll', () => {
		const { flush } = setup( { scrollY: 500 } );
		const bar = mark( { source: 'page', output: 'bar-x' } );
		const driver = boot();
		flush();
		expect( driver.observe ).toHaveBeenCalledWith(
			bar,
			expect.objectContaining( { basis: 'page', information: true } )
		);
		expect( prop( bar ) ).toBe( '0.5' );
	} );

	test( 'section source measures the enclosing section', () => {
		const { flush } = setup();
		const section = document.createElement( 'section' );
		section.getBoundingClientRect = () => ( {
			top: ( VH - 1000 ) / 2,
			height: 1000,
			bottom: ( VH - 1000 ) / 2 + 1000,
		} );
		document.body.appendChild( section );
		const bar = mark( { source: 'section', output: 'bar-y' }, section );
		const driver = boot();
		flush();
		expect( driver.observe ).toHaveBeenCalledWith(
			bar,
			expect.objectContaining( { basis: 'section' } )
		);
		expect( prop( bar ) ).toBe( '0.5' );
	} );

	test( 'pin source bar needs no observer; a pin-less one falls back to page', () => {
		const { flush } = setup( { scrollY: 1000 } );
		const holder = pin( 0.4 );
		const pinned = mark( { source: 'pin', output: 'bar-x' }, holder );
		const orphan = mark( { source: 'pin', output: 'bar-x' } );
		const driver = boot();
		flush();
		expect( driver.observe ).not.toHaveBeenCalledWith(
			pinned,
			expect.anything()
		);
		expect( prop( pinned ) ).toBe( '' );
		expect( driver.observe ).toHaveBeenCalledWith(
			orphan,
			expect.objectContaining( { basis: 'page' } )
		);
		expect( orphan.getAttribute( ATTR + 'source' ) ).toBe( 'page' );
		expect( prop( orphan ) ).toBe( '1' );
	} );

	test( 'page counter renders percent', () => {
		const { flush } = setup( { scrollY: 370 } );
		const counter = mark( {
			output: 'counter',
			'counter-format': 'percent',
		} );
		boot();
		flush();
		expect( counter.textContent ).toBe( '37%' );
	} );

	test( 'percent rounds to the nearest whole number', () => {
		const { flush } = setup( { scrollY: 375 } );
		const counter = mark( { output: 'counter' } );
		boot();
		flush();
		expect( counter.textContent ).toBe( '38%' );
	} );

	test( 'index formats fall back to percent on page and section sources', () => {
		const { flush } = setup( { scrollY: 1000 } );
		const a = mark( {
			output: 'counter',
			'counter-format': 'index-of-total',
		} );
		const b = mark( {
			source: 'page',
			output: 'counter',
			'counter-format': 'padded-index-of-total',
		} );
		boot();
		flush();
		expect( a.textContent ).toBe( '100%' );
		expect( b.textContent ).toBe( '100%' );
	} );

	test( 'pin counter formats: padded 01 / 05 at 0 and 05 / 05 at 1, plain 3 / 5 at 0.5', () => {
		const { flush } = setup();
		const holder = pin( 0 );
		const padded = mark(
			{
				source: 'pin',
				output: 'counter',
				'counter-format': 'padded-index-of-total',
			},
			holder
		);
		const plain = mark(
			{
				source: 'pin',
				output: 'counter',
				'counter-format': 'index-of-total',
			},
			holder
		);
		const pct = mark( { source: 'pin', output: 'counter' }, holder );
		boot();
		expect( padded.textContent ).toBe( '01 / 05' );
		expect( plain.textContent ).toBe( '1 / 5' );
		expect( pct.textContent ).toBe( '0%' );

		holder.style.setProperty( '--sgs-fx-progress', '0.5' );
		window.dispatchEvent( new Event( 'scroll' ) );
		flush();
		expect( plain.textContent ).toBe( '3 / 5' );

		holder.style.setProperty( '--sgs-fx-progress', '1' );
		window.dispatchEvent( new Event( 'scroll' ) );
		flush();
		expect( padded.textContent ).toBe( '05 / 05' );
		expect( plain.textContent ).toBe( '5 / 5' );
		expect( pct.textContent ).toBe( '100%' );
	} );

	test( 'missing attributes take page, bar-x and percent defaults', () => {
		const { flush } = setup( { scrollY: 250 } );
		const bar = mark();
		const driver = boot();
		flush();
		expect( driver.observe ).toHaveBeenCalledWith(
			bar,
			expect.objectContaining( { basis: 'page' } )
		);
		expect( bar.textContent ).toBe( '' ); // bar-x, not a counter
		expect( prop( bar ) ).toBe( '0.25' );

		const counter = mark( { output: 'counter' } );
		boot();
		flush();
		expect( counter.textContent ).toBe( '25%' );
	} );

	test( 'keeps tracking under reduced motion', () => {
		const { flush } = setup( { reduced: true, scrollY: 500 } );
		const bar = mark();
		boot();
		flush();
		expect( prop( bar ) ).toBe( '0.5' );
	} );

	test( 'NEGATIVE CONTROL: an unmarked element is never observed or written', () => {
		const { flush } = setup( { scrollY: 500 } );
		const decoy = document.createElement( 'div' );
		decoy.setAttribute( 'data-sgs-fx', 'scroll-progress-extra magnet' );
		decoy.setAttribute( ATTR + 'output', 'counter' );
		document.body.appendChild( decoy );
		const plain = document.createElement( 'div' );
		plain.setAttribute( ATTR + 'output', 'counter' );
		document.body.appendChild( plain );
		const driver = boot();
		flush();
		expect( driver.observe ).not.toHaveBeenCalled();
		expect( prop( decoy ) ).toBe( '' );
		expect( prop( plain ) ).toBe( '' );
		expect( decoy.textContent ).toBe( '' );
		expect( plain.textContent ).toBe( '' );
	} );
} );

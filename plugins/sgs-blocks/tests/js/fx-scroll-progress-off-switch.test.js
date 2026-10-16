/**
 * Scroll progress honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * The module boots on import, so every case mounts its DOM and then loads it in isolation. `window.matchMedia` is a
 * viewport of a chosen width: each list reads `matches` live, and `resize()` fires the `change` listeners of every
 * query whose answer flips. `@sgs/scroll-driver` is the real driver behind a spy. The RED CONTROL swaps `bootGated`
 * for an ungated loop and shows the same off tier then drives the element, so the guarded cases cannot pass without
 * the guard.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

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

const OFF_SWITCH = '../../src/shared/effects/off-switch';
const ATTR = 'data-sgs-fx-scroll-progress-';
const VH = 800;

let width = 1440;
let listeners = [];
let queue = [];
let addSpy;
let removeSpy;

function queryMatches( query, at ) {
	if ( query.includes( 'reduced-motion' ) ) {
		return false;
	}
	const max = /max-width:\s*(\d+)px/.exec( query );
	const min = /min-width:\s*(\d+)px/.exec( query );
	return (
		( ! max || at <= Number( max[ 1 ] ) ) &&
		( ! min || at >= Number( min[ 1 ] ) )
	);
}

function installViewport( initial ) {
	width = initial;
	listeners = [];
	window.matchMedia = ( query ) => ( {
		media: query,
		get matches() {
			return queryMatches( query, width );
		},
		addEventListener: ( type, listener ) =>
			listeners.push( { query, listener } ),
		removeEventListener: ( type, listener ) => {
			listeners = listeners.filter(
				( entry ) =>
					entry.query !== query || entry.listener !== listener
			);
		},
	} );
}

function resize( to ) {
	const from = width;
	width = to;
	listeners
		.filter(
			( entry ) =>
				queryMatches( entry.query, from ) !==
				queryMatches( entry.query, to )
		)
		.slice()
		.forEach( ( entry ) =>
			entry.listener( {
				matches: queryMatches( entry.query, to ),
				media: entry.query,
			} )
		);
}

function flush() {
	const run = queue;
	queue = [];
	run.forEach( ( fn ) => fn() );
}

/**
 * Add a scroll-progress element.
 *
 * @param {Object} attrs  Scroll-progress options (source, output, ...).
 * @param {Object} extra  Any other attributes, such as the off switch.
 * @param {Node}   parent Where to append it.
 */
function mark( attrs = {}, extra = {}, parent = document.body ) {
	const el = document.createElement( 'div' );
	el.setAttribute( 'data-sgs-fx', 'scroll-progress' );
	Object.entries( attrs ).forEach( ( [ key, value ] ) =>
		el.setAttribute( ATTR + key, value )
	);
	Object.entries( extra ).forEach( ( [ key, value ] ) =>
		el.setAttribute( key, value )
	);
	parent.appendChild( el );
	return el;
}

function pin( progress, total = 5 ) {
	const el = document.createElement( 'div' );
	el.setAttribute( 'data-sgs-fx', 'horizontal-panel' );
	el.setAttribute( 'data-sgs-fx-progress-total', String( total ) );
	el.style.setProperty( '--sgs-fx-progress', String( progress ) );
	document.body.appendChild( el );
	return el;
}

function boot() {
	let driver;
	jest.isolateModules( () => {
		require( '../../src/shared/effects/fx-scroll-progress' );
		driver = require( '@sgs/scroll-driver' );
	} );
	flush();
	return driver;
}

const prop = ( el ) => el.style.getPropertyValue( '--sgs-scroll-progress' );
const pinListeners = ( spy ) =>
	spy.mock.calls.filter(
		( [ type, fn ] ) => 'scroll' === type && 'schedulePin' === fn.name
	).length;

const offMobile = { 'data-sgs-fx-off-mobile': 'scroll-progress' };
const offTablet = { 'data-sgs-fx-off-tablet': 'scroll-progress' };

beforeEach( () => {
	queue = [];
	window.requestAnimationFrame = ( fn ) => {
		queue.push( fn );
		return queue.length;
	};
	window.cancelAnimationFrame = () => {
		queue = [];
	};
	Object.defineProperty( window, 'innerHeight', {
		value: VH,
		configurable: true,
	} );
	Object.defineProperty( document.documentElement, 'scrollHeight', {
		value: VH + 1000,
		configurable: true,
	} );
	window.scrollY = 500;
	document.body.innerHTML = '';
	installViewport( 1440 );
	addSpy = jest.spyOn( window, 'addEventListener' );
	removeSpy = jest.spyOn( window, 'removeEventListener' );
} );

afterEach( () => {
	jest.dontMock( OFF_SWITCH );
	addSpy.mockRestore();
	removeSpy.mockRestore();
	document.body.innerHTML = '';
} );

describe( 'scroll progress per-device off switch', () => {
	test( 'a driven bar is released on entering the off tier (property cleared) and driven again on leaving it', () => {
		const bar = mark( { source: 'page', output: 'bar-x' }, offMobile );
		const driver = boot();
		expect( prop( bar ) ).toBe( '0.5' );
		resize( 375 );
		expect( driver.unobserve ).toHaveBeenCalledWith( bar );
		expect( prop( bar ) ).toBe( '' );
		resize( 1440 );
		flush();
		expect( driver.observe ).toHaveBeenCalledTimes( 2 );
		expect( prop( bar ) ).toBe( '0.5' );
	} );

	test( 'a driven counter gets its server-rendered text back on the off tier and updates again after', () => {
		const counter = mark( { output: 'counter' }, offMobile );
		counter.textContent = 'Scroll';
		boot();
		expect( counter.textContent ).toBe( '50%' );
		resize( 375 );
		expect( counter.textContent ).toBe( 'Scroll' );
		resize( 1440 );
		flush();
		expect( counter.textContent ).toBe( '50%' );
	} );

	test( 'booted on its off tier, the element is never handed to the driver until the tier is left', () => {
		installViewport( 800 );
		const bar = mark( { output: 'bar-x' }, offTablet );
		const driver = boot();
		expect( driver.observe ).not.toHaveBeenCalled();
		expect( prop( bar ) ).toBe( '' );
		resize( 375 );
		flush();
		expect( driver.observe ).toHaveBeenCalledTimes( 1 );
		expect( prop( bar ) ).toBe( '0.5' );
	} );

	test( 'the flat disable switch stops the element at its tier', () => {
		installViewport( 375 );
		const bar = mark(
			{ output: 'bar-x' },
			{ 'data-sgs-fx-disable-mobile': '' }
		);
		const driver = boot();
		expect( driver.observe ).not.toHaveBeenCalled();
		expect( prop( bar ) ).toBe( '' );
		resize( 1440 );
		flush();
		expect( prop( bar ) ).toBe( '0.5' );
	} );

	test( 'another effect in the off list leaves scroll progress running on that tier', () => {
		installViewport( 375 );
		const bar = mark(
			{ output: 'bar-x' },
			{ 'data-sgs-fx-off-mobile': 'particles' }
		);
		boot();
		expect( prop( bar ) ).toBe( '0.5' );
	} );

	test( 'the shared pin-counter listener stays while one counter runs', () => {
		const holder = pin( 0.5 );
		const first = mark( { source: 'pin', output: 'counter' }, offMobile, holder );
		const second = mark( { source: 'pin', output: 'counter' }, offTablet, holder );
		first.textContent = 'one';
		second.textContent = 'two';
		boot();
		expect( first.textContent ).toBe( '50%' );
		expect( pinListeners( addSpy ) ).toBe( 1 );
		// Mobile: the first is off, the second still counts, so the listener stays.
		resize( 375 );
		expect( first.textContent ).toBe( 'one' );
		expect( second.textContent ).toBe( '50%' );
		expect( pinListeners( removeSpy ) ).toBe( 0 );
		// Tablet: the second is off, the first is back on.
		resize( 800 );
		expect( first.textContent ).toBe( '50%' );
		expect( second.textContent ).toBe( 'two' );
		expect( pinListeners( removeSpy ) ).toBe( 0 );
	} );

	test( 'the last pin counter going off removes the shared listener and restores its text', () => {
		const holder = pin( 0.5 );
		const counter = mark( { source: 'pin', output: 'counter' }, offMobile, holder );
		counter.textContent = 'one';
		boot();
		expect( pinListeners( addSpy ) ).toBe( 1 );
		resize( 375 );
		expect( pinListeners( removeSpy ) ).toBe( 1 );
		expect( counter.textContent ).toBe( 'one' );
		resize( 1440 );
		expect( pinListeners( addSpy ) ).toBe( 2 );
		expect( counter.textContent ).toBe( '50%' );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same off tier drives the element', () => {
		jest.doMock( OFF_SWITCH, () => ( {
			bootGated: ( effect, selector, init ) => {
				const cleanups = Array.from(
					document.querySelectorAll( selector )
				).map( init );
				return () =>
					cleanups.forEach( ( cleanup ) => cleanup && cleanup() );
			},
		} ) );
		installViewport( 375 );
		const bar = mark( { output: 'bar-x' }, offMobile );
		boot();
		expect( prop( bar ) ).toBe( '0.5' );
	} );
} );

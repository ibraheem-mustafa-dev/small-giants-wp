/**
 * Parallax honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * The module registers on import, so every case mounts its DOM and then loads it in isolation. `window.matchMedia` is
 * a viewport of a chosen width: each list reads `matches` live, and `resize()` fires the `change` listeners of every
 * query whose answer flips. `@sgs/scroll-driver` is a recording fake whose `observe` pushes one view-basis update
 * straight away, so a registered element visibly carries a travel value. The RED CONTROL swaps `bootGated` for an
 * ungated loop and shows the same off tier then registers the element.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

jest.mock(
	'@sgs/scroll-driver',
	() => ( {
		observe: jest.fn( ( el, options ) => {
			if ( options && options.onUpdate ) {
				options.onUpdate( el, 0.75 );
			}
		} ),
		unobserve: jest.fn(),
	} ),
	{ virtual: true }
);

const OFF_SWITCH = '../../src/shared/effects/off-switch';
const TRAVEL = '--sgs-fx-parallax-travel';

let width = 1440;
let listeners = [];

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

function mount( attrs ) {
	document.body.innerHTML = `<div id="t" data-sgs-fx="parallax" ${ attrs }></div>`;
	const el = document.getElementById( 't' );
	let driver;
	let module;
	jest.isolateModules( () => {
		driver = require( '@sgs/scroll-driver' );
		module = require( '../../src/shared/effects/fx-parallax' );
	} );
	return { el, driver, module };
}

const travel = ( el ) => el.style.getPropertyValue( TRAVEL );
const reducedListeners = () =>
	listeners.filter( ( entry ) => entry.query.includes( 'reduced-motion' ) )
		.length;

beforeEach( () => {
	installViewport( 1440 );
} );

afterEach( () => {
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( 'parallax per-device off switch', () => {
	test( 'off on mobile: travelling on desktop, released and back at rest on mobile, travelling again after', () => {
		const { el, driver } = mount( 'data-sgs-fx-off-mobile="parallax"' );
		expect( travel( el ) ).not.toBe( '' );
		expect( reducedListeners() ).toBe( 1 );
		resize( 375 );
		expect( driver.unobserve ).toHaveBeenCalledWith( el );
		expect( travel( el ) ).toBe( '' );
		expect( el.style.cssText ).toBe( '' );
		// The last element went, so its reduced-motion listener went with it.
		expect( reducedListeners() ).toBe( 0 );
		resize( 1440 );
		expect( driver.observe ).toHaveBeenCalledTimes( 2 );
		expect( travel( el ) ).not.toBe( '' );
		expect( reducedListeners() ).toBe( 1 );
	} );

	test( 'booted on its off tier, the element is never handed to the driver until the tier is left', () => {
		installViewport( 800 );
		const { el, driver } = mount( 'data-sgs-fx-off-tablet="parallax"' );
		expect( driver.observe ).not.toHaveBeenCalled();
		expect( travel( el ) ).toBe( '' );
		expect( reducedListeners() ).toBe( 0 );
		resize( 375 );
		expect( driver.observe ).toHaveBeenCalledTimes( 1 );
		expect( travel( el ) ).not.toBe( '' );
	} );

	test( 'the flat disable switch stops parallax at its tier', () => {
		installViewport( 375 );
		const { el, driver } = mount( 'data-sgs-fx-disable-mobile=""' );
		expect( driver.observe ).not.toHaveBeenCalled();
		expect( travel( el ) ).toBe( '' );
		resize( 1440 );
		expect( travel( el ) ).not.toBe( '' );
	} );

	test( 'another effect in the off list leaves parallax running on that tier', () => {
		installViewport( 375 );
		const { el } = mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( travel( el ) ).not.toBe( '' );
	} );

	test( 'unregister releases one element: driver told, travel cleared, repeat call harmless', () => {
		const { el, driver, module } = mount( '' );
		expect( travel( el ) ).not.toBe( '' );
		module.unregister( el );
		module.unregister( el );
		expect( driver.unobserve ).toHaveBeenCalledTimes( 1 );
		expect( travel( el ) ).toBe( '' );
	} );

	test( 'teardown ends the tier watching: a later resize registers nothing', () => {
		const { el, driver, module } = mount(
			'data-sgs-fx-off-mobile="parallax"'
		);
		module.teardown();
		expect( travel( el ) ).toBe( '' );
		resize( 375 );
		resize( 1440 );
		expect( driver.observe ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same off tier registers the element', () => {
		jest.doMock( OFF_SWITCH, () => ( {
			bootGated: ( effect, targets, init ) => {
				const cleanups = Array.from( targets ).map( init );
				return () =>
					cleanups.forEach( ( cleanup ) => cleanup && cleanup() );
			},
		} ) );
		installViewport( 375 );
		const { el, driver } = mount( 'data-sgs-fx-off-mobile="parallax"' );
		expect( driver.observe ).toHaveBeenCalledTimes( 1 );
		expect( travel( el ) ).not.toBe( '' );
	} );
} );

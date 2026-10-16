/**
 * The follow-pointer tilt writer honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through
 * `pointer-track.js::bindAll`, which routes each element through `bootGated` when the caller passes the effect slug.
 *
 * `window.matchMedia` is a viewport of a chosen width (no reduced motion): each list reads `matches` live, and
 * `resize()` fires the `change` listeners of every query whose answer flips. The cases read the pointer listeners the
 * element carries (spied on `addEventListener`) and the custom properties written. The RED CONTROL swaps `bootGated`
 * for an ungated loop and shows the listener then exists on the off tier, so the guarded cases cannot pass without
 * the guard.
 */

/* global jest, describe, test, expect, beforeEach, afterEach, MouseEvent */

const OFF_SWITCH = '../../src/shared/effects/off-switch';
const MODULE = '../../src/shared/effects/fx-follow-pointer.js';
const MARK = 'data-sgs-fx="follow-pointer" data-sgs-mc="transform"';
const PROP = '--sgs-tilt-y';
const SLUG = 'follow-pointer';

let width = 1440;
let listeners = [];
let queue;
let nextId;
let pointerListeners;

function queryMatches( query, at ) {
	if ( query.includes( 'reduced-motion' ) ) {
		return false;
	}
	const max = /max-width:\s*([\d.]+)px/.exec( query );
	const min = /min-width:\s*([\d.]+)px/.exec( query );
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

function prepare( el ) {
	el.getBoundingClientRect = () => ( {
		left: 0,
		top: 0,
		right: 200,
		bottom: 100,
		width: 200,
		height: 100,
	} );
	const add = el.addEventListener.bind( el );
	const remove = el.removeEventListener.bind( el );
	el.addEventListener = ( type, fn, opts ) => {
		if ( 'pointermove' === type ) {
			pointerListeners.add( fn );
		}
		return add( type, fn, opts );
	};
	el.removeEventListener = ( type, fn, opts ) => {
		if ( 'pointermove' === type ) {
			pointerListeners.delete( fn );
		}
		return remove( type, fn, opts );
	};
}

function mount( attrs ) {
	document.body.innerHTML = `<div id="e0" ${ MARK } ${ attrs }></div>`;
	const els = Array.from( document.querySelectorAll( '[data-sgs-fx]' ) );
	els.forEach( prepare );
	jest.isolateModules( () => require( MODULE ) );
	return els;
}

function move( el, x = 150, y = 25 ) {
	const event = new MouseEvent( 'pointermove', {
		clientX: x,
		clientY: y,
		bubbles: true,
	} );
	Object.defineProperty( event, 'pointerType', { value: 'mouse' } );
	el.dispatchEvent( event );
	const run = [ ...queue.values() ];
	queue.clear();
	run.forEach( ( fn ) => fn() );
}

const written = ( el ) => el.style.getPropertyValue( PROP );

beforeEach( () => {
	pointerListeners = new Set();
	queue = new Map();
	nextId = 1;
	installViewport( 1440 );
	window.requestAnimationFrame = ( fn ) => {
		queue.set( nextId, fn );
		return nextId++;
	};
	window.cancelAnimationFrame = ( id ) => queue.delete( id );
	window.getComputedStyle = () => ( {
		getPropertyValue: () => '',
	} );
} );

afterEach( () => {
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( `${ SLUG } per-device off switch`, () => {
	test( 'off on mobile: tracks on desktop, stops and clears on mobile, tracks again after', () => {
		const [ el ] = mount( `data-sgs-fx-off-mobile="${ SLUG }"` );
		expect( pointerListeners.size ).toBe( 1 );
		move( el );
		expect( written( el ) ).not.toBe( '' );

		resize( 375 );
		expect( pointerListeners.size ).toBe( 0 );
		expect( written( el ) ).toBe( '' );
		move( el );
		expect( written( el ) ).toBe( '' );

		resize( 1440 );
		expect( pointerListeners.size ).toBe( 1 );
		move( el );
		expect( written( el ) ).not.toBe( '' );
	} );

	test( 'booted on its off tier, the element gets no listener until the tier is left', () => {
		installViewport( 800 );
		const [ el ] = mount( `data-sgs-fx-off-tablet="${ SLUG }"` );
		expect( pointerListeners.size ).toBe( 0 );
		move( el );
		expect( written( el ) ).toBe( '' );
		resize( 1440 );
		expect( pointerListeners.size ).toBe( 1 );
	} );

	test( 'the flat disable switch stops the effect at its tier', () => {
		installViewport( 375 );
		const [ el ] = mount( 'data-sgs-fx-disable-mobile=""' );
		expect( pointerListeners.size ).toBe( 0 );
		resize( 800 );
		expect( pointerListeners.size ).toBe( 1 );
		move( el );
		expect( written( el ) ).not.toBe( '' );
	} );

	test( 'only the element switched off stops; a sibling keeps tracking', () => {
		document.body.innerHTML =
			`<div id="a" ${ MARK } data-sgs-fx-off-mobile="${ SLUG }"></div>` +
			`<div id="b" ${ MARK }></div>`;
		const els = [ 'a', 'b' ].map( ( id ) => document.getElementById( id ) );
		els.forEach( prepare );
		jest.isolateModules( () => require( MODULE ) );
		resize( 375 );
		move( els[ 0 ] );
		move( els[ 1 ] );
		expect( written( els[ 0 ] ) ).toBe( '' );
		expect( written( els[ 1 ] ) ).not.toBe( '' );
	} );

	test( 'another effect in the off list leaves this one running on that tier', () => {
		installViewport( 375 );
		const [ el ] = mount( 'data-sgs-fx-off-mobile="ripple"' );
		expect( pointerListeners.size ).toBe( 1 );
		move( el );
		expect( written( el ) ).not.toBe( '' );
	} );

	test( 'RED CONTROL: with the gate bypassed, the listener and the write appear on the off tier', () => {
		jest.doMock( OFF_SWITCH, () => ( {
			bootGated: ( effect, targets, init ) => {
				const cleanups = Array.from( targets ).map( init );
				return () =>
					cleanups.forEach( ( cleanup ) => cleanup && cleanup() );
			},
		} ) );
		installViewport( 375 );
		const [ el ] = mount( `data-sgs-fx-off-mobile="${ SLUG }"` );
		expect( pointerListeners.size ).toBe( 1 );
		move( el );
		expect( written( el ) ).not.toBe( '' );
	} );
} );

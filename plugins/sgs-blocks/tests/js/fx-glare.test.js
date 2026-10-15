/**
 * Follow pointer and glare pointer writers (Spec 38A FR-38A-41, FR-38A-47, FR-38A-50; build unit M5.6).
 *
 * Each module boots on import, so every case mounts its DOM and then loads the module in isolation. The tilt
 * module's configuration (`--sgs-tilt-max`, `--sgs-tilt-lock`) comes from computed style, which jsdom does not
 * resolve from a stylesheet, so `getComputedStyle` is stubbed to return the case's values; the live probe
 * (scripts/motion-qa/probe-follow-pointer.mjs) proves the real computed-style read in browsers.
 */
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

let reduced;
let listeners;
let queue;
let nextId;
let config;

const flush = () => {
	const run = [ ...queue.values() ];
	queue.clear();
	run.forEach( ( fn ) => fn() );
};
const read = ( el, prop ) => el.style.getPropertyValue( prop );

function installMatchMedia() {
	listeners = [];
	window.matchMedia = jest.fn( ( query ) => ( {
		get matches() {
			return REDUCED_QUERY === query && reduced;
		},
		addEventListener: ( type, fn ) => listeners.push( fn ),
		removeEventListener: ( type, fn ) => {
			listeners = listeners.filter( ( l ) => l !== fn );
		},
	} ) );
}

function mount( attrs, module ) {
	document.body.innerHTML = `<div id="t" ${ attrs }></div>`;
	const el = document.getElementById( 't' );
	el.getBoundingClientRect = () => ( { left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 } );
	jest.isolateModules( () => require( module ) );
	return el;
}

const tilt = () =>
	mount( 'data-sgs-fx="follow-pointer" data-sgs-mc="transform"', '../../src/shared/effects/fx-follow-pointer.js' );
const glare = () => mount( 'data-sgs-fx="glare"', '../../src/shared/effects/fx-glare.js' );

function move( el, x, y, pointerType = 'mouse' ) {
	const event = new MouseEvent( 'pointermove', { clientX: x, clientY: y, bubbles: true } );
	Object.defineProperty( event, 'pointerType', { value: pointerType } );
	el.dispatchEvent( event );
}

beforeEach( () => {
	reduced = false;
	config = { '--sgs-tilt-max': '8deg', '--sgs-tilt-lock': 'none' };
	installMatchMedia();
	queue = new Map();
	nextId = 1;
	window.requestAnimationFrame = ( fn ) => {
		queue.set( nextId, fn );
		return nextId++;
	};
	window.cancelAnimationFrame = ( id ) => queue.delete( id );
	window.getComputedStyle = () => ( { getPropertyValue: ( name ) => config[ name ] ?? '' } );
} );

describe( 'follow pointer writer', () => {
	it( 'reads 8deg and 8deg at the top right corner, -8deg and -8deg at the bottom left, 0 at the centre', () => {
		const el = tilt();
		move( el, 200, 0 );
		flush();
		expect( read( el, '--sgs-tilt-x' ) ).toBe( '8.00deg' );
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '8.00deg' );
		move( el, 0, 100 );
		flush();
		expect( read( el, '--sgs-tilt-x' ) ).toBe( '-8.00deg' );
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '-8.00deg' );
		move( el, 100, 50 );
		flush();
		expect( read( el, '--sgs-tilt-x' ) ).toBe( '0.00deg' );
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '0.00deg' );
	} );

	it( 'reaches the maximum 5% in from each edge and stays linear between', () => {
		const el = tilt();
		move( el, 190, 5 );
		flush();
		expect( read( el, '--sgs-tilt-x' ) ).toBe( '8.00deg' );
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '8.00deg' );
		move( el, 150, 50 );
		flush();
		expect( read( el, '--sgs-tilt-x' ) ).toBe( '0.00deg' );
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '4.44deg' );
	} );

	it( 'scales to the maximum angle the element declares', () => {
		config[ '--sgs-tilt-max' ] = '12deg';
		const el = tilt();
		move( el, 200, 0 );
		flush();
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '12.00deg' );
	} );

	it( 'an axis lock keeps the tilt on that one axis', () => {
		config[ '--sgs-tilt-lock' ] = 'x';
		const el = tilt();
		move( el, 200, 0 );
		flush();
		expect( read( el, '--sgs-tilt-x' ) ).toBe( '8.00deg' );
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '0.00deg' );
		config[ '--sgs-tilt-lock' ] = 'y';
		move( el, 200, 0 );
		flush();
		expect( read( el, '--sgs-tilt-x' ) ).toBe( '0.00deg' );
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '8.00deg' );
	} );

	it( 'throttles to one write per frame, using the latest position', () => {
		const el = tilt();
		move( el, 0, 0 );
		move( el, 200, 0 );
		expect( queue.size ).toBe( 1 );
		flush();
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '8.00deg' );
	} );

	it( 'resets both properties on leave', () => {
		const el = tilt();
		move( el, 150, 25 );
		flush();
		expect( read( el, '--sgs-tilt-y' ) ).not.toBe( '' );
		el.dispatchEvent( new MouseEvent( 'pointerleave' ) );
		expect( read( el, '--sgs-tilt-y' ) ).not.toBe( '' );
		flush();
		expect( read( el, '--sgs-tilt-x' ) ).toBe( '' );
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '' );
	} );

	it( 'a pointer that re-enters before the reset frame keeps its tilt', () => {
		const el = tilt();
		move( el, 200, 0 );
		flush();
		el.dispatchEvent( new MouseEvent( 'pointerleave' ) );
		move( el, 190, 5 );
		flush();
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '8.00deg' );
	} );

	it( 'ignores a touch pointer', () => {
		const el = tilt();
		move( el, 200, 0, 'touch' );
		expect( queue.size ).toBe( 0 );
		expect( el.getAttribute( 'style' ) ).toBeNull();
	} );

	it( 'does not bind an element that is not marked for Follow pointer and the transform channel', () => {
		document.body.innerHTML = '<div id="a" data-sgs-fx="follow-pointer"></div><div id="b" data-sgs-mc="transform"></div>';
		jest.isolateModules( () => require( '../../src/shared/effects/fx-follow-pointer.js' ) );
		[ 'a', 'b' ].forEach( ( id ) => {
			const el = document.getElementById( id );
			move( el, 200, 0 );
			expect( queue.size ).toBe( 0 );
		} );
	} );

	it( 'writes nothing under reduced motion', () => {
		reduced = true;
		const el = tilt();
		move( el, 200, 0 );
		flush();
		expect( queue.size ).toBe( 0 );
		expect( el.getAttribute( 'style' ) ).toBeNull();
	} );

	it( 'stops and clears when reduced motion switches on mid-session, and resumes when it switches off', () => {
		const el = tilt();
		move( el, 200, 0 );
		flush();
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '8.00deg' );
		move( el, 0, 0 );
		reduced = true;
		listeners.forEach( ( fn ) => fn() );
		flush();
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '' );
		move( el, 200, 0 );
		flush();
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '' );
		reduced = false;
		listeners.forEach( ( fn ) => fn() );
		move( el, 0, 0 );
		flush();
		expect( read( el, '--sgs-tilt-y' ) ).toBe( '-8.00deg' );
	} );

	it( 'writes only the two tilt custom properties across a pointer path, never transform', () => {
		const el = tilt();
		[ [ 0, 0 ], [ 100, 50 ], [ 200, 100 ], [ 20, 90 ] ].forEach( ( [ x, y ] ) => {
			move( el, x, y );
			flush();
		} );
		expect( Array.from( el.style ).sort() ).toEqual( [ '--sgs-tilt-x', '--sgs-tilt-y' ] );
		expect( el.style.transform ).toBe( '' );
		expect( el.getAttribute( 'style' ) ).not.toMatch( /transform/ );
	} );
} );

describe( 'glare writer', () => {
	it( 'writes the pointer position as percentages of the box', () => {
		const el = glare();
		move( el, 150, 25 );
		flush();
		expect( read( el, '--sgs-glare-x' ) ).toBe( '75.0%' );
		expect( read( el, '--sgs-glare-y' ) ).toBe( '25.0%' );
	} );

	it( 'resets on leave, ignores touch, and writes only its two custom properties', () => {
		const el = glare();
		move( el, 200, 100, 'touch' );
		expect( queue.size ).toBe( 0 );
		move( el, 200, 100 );
		flush();
		expect( Array.from( el.style ).sort() ).toEqual( [ '--sgs-glare-x', '--sgs-glare-y' ] );
		el.dispatchEvent( new MouseEvent( 'pointerleave' ) );
		flush();
		expect( el.getAttribute( 'style' ) ).toBeFalsy();
	} );

	it( 'stops writing when reduced motion switches on mid-session', () => {
		const el = glare();
		move( el, 100, 50 );
		flush();
		expect( read( el, '--sgs-glare-x' ) ).toBe( '50.0%' );
		reduced = true;
		listeners.forEach( ( fn ) => fn() );
		expect( read( el, '--sgs-glare-x' ) ).toBe( '' );
		move( el, 200, 0 );
		flush();
		expect( read( el, '--sgs-glare-x' ) ).toBe( '' );
	} );
} );

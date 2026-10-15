/**
 * Cursor-field `image-reveal` ring writer and reveal-mode emitter (Spec 38A FR-38A-34, FR-38A-47; build unit M5.11).
 *
 * The module boots on import, so each case mounts its DOM and then loads `fx-cursor-field.js` in isolation. The painted
 * radius, wash and ring are CSS; the live probe (scripts/motion-qa/probe-cursor-field.mjs --local) measures them in real
 * engines. This file proves what the scripts write: pixel positions on the ring layer, the seed flag, no opacity toggling
 * and no participants in reveal mode, and silence under reduced motion.
 */
const REDUCED = '(prefers-reduced-motion: reduce)';
const FINE = '(hover: hover) and (pointer: fine)';

let reduced;
let listeners;
let queue;
let nextId;

const flush = () => {
	const run = [ ...queue.values() ];
	queue.clear();
	run.forEach( ( fn ) => fn() );
};

function installMatchMedia() {
	listeners = [];
	window.matchMedia = jest.fn( ( query ) => ( {
		get matches() {
			return FINE === query || ( REDUCED === query && reduced );
		},
		addEventListener: ( type, fn ) => listeners.push( fn ),
		removeEventListener: ( type, fn ) => {
			listeners = listeners.filter( ( l ) => l !== fn );
		},
	} ) );
}

function mount( type = 'image-reveal' ) {
	document.body.innerHTML = `<div id="t" data-sgs-fx="cursor-field" data-sgs-cursor-field="${ type }"><p>Body</p><span class="sgs-motion-layer" data-sgs-layer="cursor-field-ring" aria-hidden="true"></span></div>`;
	const el = document.getElementById( 't' );
	el.getBoundingClientRect = () => ( { left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200 } );
	Object.defineProperty( el, 'offsetWidth', { value: 400 } );
	Object.defineProperty( el, 'offsetHeight', { value: 200 } );
	jest.isolateModules( () => require( '../../src/shared/effects/fx-cursor-field.js' ) );
	return { el, layer: el.querySelector( '.sgs-motion-layer' ) };
}

function pointer( el, type, x, y ) {
	const event = new MouseEvent( type, { clientX: x, clientY: y, bubbles: true } );
	Object.defineProperty( event, 'pointerType', { value: 'mouse' } );
	el.dispatchEvent( event );
}

beforeEach( () => {
	reduced = false;
	installMatchMedia();
	queue = new Map();
	nextId = 1;
	window.requestAnimationFrame = ( fn ) => {
		queue.set( nextId, fn );
		return nextId++;
	};
	window.cancelAnimationFrame = ( id ) => queue.delete( id );
} );

describe( 'cursor-field ring writer', () => {
	it( 'writes the pointer position in pixels inside the element, at three positions', () => {
		const { el, layer } = mount();
		[ [ 100, 25 ], [ 200, 150 ], [ 300, 50 ] ].forEach( ( [ x, y ] ) => {
			pointer( el, 'pointermove', x, y );
			flush();
			expect( layer.style.getPropertyValue( '--sgs-ring-x' ) ).toBe( `${ x }.0px` );
			expect( layer.style.getPropertyValue( '--sgs-ring-y' ) ).toBe( `${ y }.0px` );
		} );
	} );

	it( 'seeds the first write without the live flag, then sets it on the next frame', () => {
		const { el, layer } = mount();
		pointer( el, 'pointermove', 100, 50 );
		flush();
		expect( layer.hasAttribute( 'data-sgs-ring-live' ) ).toBe( false );
		flush();
		expect( layer.hasAttribute( 'data-sgs-ring-live' ) ).toBe( true );
	} );

	it( 'on leave drops the live flag and keeps the last position', () => {
		const { el, layer } = mount();
		pointer( el, 'pointermove', 100, 50 );
		flush();
		flush();
		el.dispatchEvent( new MouseEvent( 'pointerleave' ) );
		flush();
		expect( layer.hasAttribute( 'data-sgs-ring-live' ) ).toBe( false );
		expect( layer.style.getPropertyValue( '--sgs-ring-x' ) ).toBe( '100.0px' );
	} );

	it( 'writes only custom properties on the layer', () => {
		const { el, layer } = mount();
		pointer( el, 'pointermove', 100, 50 );
		flush();
		const names = layer.getAttribute( 'style' ).split( ';' ).map( ( d ) => d.split( ':' )[ 0 ].trim() ).filter( Boolean );
		expect( names.length ).toBeGreaterThan( 0 );
		expect( names.every( ( n ) => n.startsWith( '--' ) ) ).toBe( true );
	} );

	it( 'writes nothing under reduced motion', () => {
		reduced = true;
		const { el, layer } = mount();
		pointer( el, 'pointermove', 100, 50 );
		flush();
		expect( layer.getAttribute( 'style' ) ).toBeNull();
	} );

	it( 'does nothing on an element with no ring layer', () => {
		document.body.innerHTML = '<div id="t" data-sgs-cursor-field="image-reveal"></div>';
		const el = document.getElementById( 't' );
		jest.isolateModules( () => require( '../../src/shared/effects/fx-cursor-field.js' ) );
		pointer( el, 'pointermove', 10, 10 );
		flush();
		expect( el.querySelector( '.sgs-motion-layer' ) ).toBeNull();
	} );
} );

describe( 'cursor-field reveal mode emitter', () => {
	it( 'never toggles the opacity property that the other field types hide with', () => {
		const { el } = mount();
		el.dispatchEvent( new MouseEvent( 'mouseenter', { clientX: 10, clientY: 10 } ) );
		el.dispatchEvent( new MouseEvent( 'mouseleave', { clientX: 10, clientY: 10 } ) );
		flush();
		expect( el.style.getPropertyValue( '--sgs-cursor-field-opacity' ) ).toBe( '' );
	} );

	it( 'control: a glow field is hidden at rest through that opacity property', () => {
		const { el } = mount( 'glow' );
		expect( el.style.getPropertyValue( '--sgs-cursor-field-opacity' ) ).toBe( '0' );
	} );

	it( 'marks no participants', () => {
		const { el } = mount();
		expect( el.querySelector( '[data-sgs-cursor-participant]' ) ).toBeNull();
	} );
} );

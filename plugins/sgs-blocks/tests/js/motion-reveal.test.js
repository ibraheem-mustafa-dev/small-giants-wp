/**
 * The scroll reveal module (assets/js/motion-reveal.js): jsdom with a mocked IntersectionObserver and matchMedia.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const SRC = fs.readFileSync( path.join( __dirname, '../../assets/js/motion-reveal.js' ), 'utf8' );
const READY = 'sgs-motion-ready';

let observers;
let reduced;
let listeners;

class MockIO {
	constructor( cb, opts ) {
		this.cb = cb;
		this.opts = opts;
		this.targets = new Set();
		this.disconnected = false;
		observers.push( this );
	}
	observe( el ) {
		this.targets.add( el );
	}
	unobserve( el ) {
		this.targets.delete( el );
	}
	disconnect() {
		this.targets.clear();
		this.disconnected = true;
	}
}

const fire = ( io, el, isIntersecting, top = 100, intersectionRatio = isIntersecting ? 0.5 : 0 ) =>
	io.cb( [ { target: el, isIntersecting, intersectionRatio, boundingClientRect: { top } } ], io );
const live = () => observers.filter( ( o ) => ! o.disconnected );
const cropped = () => live().filter( ( o ) => o.opts.rootMargin );
const uncropped = () => live().find( ( o ) => ! o.opts.rootMargin );
// The element's top edge in the viewport; jsdom's default is 0, so tests place it below the fold unless they say otherwise.
const add = ( attrs = '', style = '', top = 2000, box = {} ) => {
	document.body.insertAdjacentHTML( 'beforeend', `<div data-sgs-me="scroll opacity" ${ attrs } style="${ style }"></div>` );
	const el = document.body.lastElementChild;
	const rect = { top, bottom: top + 40, height: 40, left: 10, right: 110, width: 100, ...box };
	el.getBoundingClientRect = () => rect;
	el.getClientRects = () => ( box.noBox ? [] : [ rect ] );
	return el;
};
const page = ( scrollHeight ) => Object.defineProperty( document.documentElement, 'scrollHeight', { value: scrollHeight, configurable: true } );
const run = () => window.eval( SRC );

beforeEach( () => {
	observers = [];
	reduced = false;
	listeners = [];
	document.documentElement.className = '';
	document.body.innerHTML = '';
	page( 5000 );
	window.IntersectionObserver = MockIO;
	window.matchMedia = ( query ) => ( {
		get matches() {
			return '(prefers-reduced-motion: reduce)' === query && reduced;
		},
		addEventListener: ( type, fn ) => listeners.push( fn ),
	} );
} );

test( 'adds sgs-motion-ready and sets data-sgs-in on intersection', () => {
	const el = add();
	run();
	expect( document.documentElement.classList.contains( READY ) ).toBe( true );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
	fire( cropped()[ 0 ], el, true );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( true );
	expect( cropped()[ 0 ].targets.has( el ) ).toBe( false );
} );

test( 'does not reveal an element that is not intersecting', () => {
	const el = add();
	run();
	fire( cropped()[ 0 ], el, false, 900 );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
} );

test( 'reveals an element already scrolled above the viewport', () => {
	const el = add();
	run();
	fire( cropped()[ 0 ], el, false, -300 );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( true );
} );

test( 'never sets data-sgs-in before sgs-motion-ready, and only observes scroll entrances', () => {
	const seen = [];
	const load = add();
	load.setAttribute( 'data-sgs-me', 'load opacity' );
	const el = add();
	const spy = MockIO.prototype.observe;
	MockIO.prototype.observe = function ( t ) {
		seen.push( document.documentElement.classList.contains( READY ) );
		spy.call( this, t );
	};
	run();
	MockIO.prototype.observe = spy;
	expect( seen ).toEqual( [ true ] );
	expect( cropped()[ 0 ].targets.has( load ) ).toBe( false );
	expect( cropped()[ 0 ].targets.has( el ) ).toBe( true );
	expect( load.hasAttribute( 'data-sgs-in' ) ).toBe( false );
} );

test( 'honours the start line from --sgs-me-start and shares one observer per line', () => {
	const a = add( '', '--sgs-me-start: 20%' );
	const b = add( '', '--sgs-me-start: 20%' );
	const c = add();
	run();
	const margins = cropped().map( ( o ) => o.opts.rootMargin ).sort();
	expect( margins ).toEqual( [ '0px 0px -20% 0px', '0px 0px -6% 0px' ] );
	const io20 = observers.find( ( o ) => '0px 0px -20% 0px' === o.opts.rootMargin );
	expect( [ ...io20.targets ] ).toEqual( [ a, b ] );
	expect( cropped().find( ( o ) => o !== io20 ).targets.has( c ) ).toBe( true );
	expect( uncropped() ).toBeUndefined();
} );

test( 'with reduced motion on at load nothing is hidden or observed', () => {
	reduced = true;
	const el = add();
	run();
	expect( document.documentElement.classList.contains( READY ) ).toBe( false );
	expect( live() ).toHaveLength( 0 );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
} );

test( 'a mid-session change to reduced motion releases the observers and drops the class; reversing re-arms', () => {
	const done = add();
	const el = add();
	run();
	fire( cropped()[ 0 ], done, true );
	reduced = true;
	listeners.forEach( ( fn ) => fn() );
	expect( document.documentElement.classList.contains( READY ) ).toBe( false );
	expect( live() ).toHaveLength( 0 );
	reduced = false;
	listeners.forEach( ( fn ) => fn() );
	expect( document.documentElement.classList.contains( READY ) ).toBe( true );
	expect( [ ...cropped()[ 0 ].targets ] ).toEqual( [ el ] );
} );

test( 'an element whose start line the page cannot scroll to reveals once fully visible in the uncropped viewport', () => {
	page( 800 );
	const el = add( '', '', 760 );
	run();
	expect( uncropped().opts ).toEqual( { threshold: 1 } );
	// Cropped observer: at maximum scroll the element stays inside the band, so it never intersects.
	fire( cropped()[ 0 ], el, false, 760 );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
	// Partly visible in the uncropped viewport: not yet.
	fire( uncropped(), el, true, 780, 0.4 );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
	fire( uncropped(), el, true, 728, 1 );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( true );
	expect( [ ...uncropped().targets ] ).toEqual( [] );
	expect( [ ...cropped()[ 0 ].targets ] ).toEqual( [] );
} );

test( 'a short mid-page element is not watched by the fully-visible observer, so fully visible below its line does not reveal it', () => {
	page( 5000 );
	const el = add( '', '', 760 );
	run();
	expect( uncropped() ).toBeUndefined();
	fire( cropped()[ 0 ], el, false, 760, 1 );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
	expect( [ ...cropped()[ 0 ].targets ] ).toEqual( [ el ] );
} );

test( 'only elements whose line is out of scroll reach join the fully-visible observer', () => {
	page( 1000 );
	const reachable = add( '', '', 800 );
	const unreachable = add( '', '', 990 );
	run();
	expect( [ ...uncropped().targets ] ).toEqual( [ unreachable ] );
	expect( cropped()[ 0 ].targets.has( reachable ) ).toBe( true );
} );

test( 'the pre-ready reveal skips elements with no layout box, zero size or a horizontal position outside the viewport', () => {
	const hidden = add( '', '', 100, { noBox: true, width: 0, height: 0 } );
	const zeroW = add( '', '', 100, { width: 0, right: 10 } );
	const zeroH = add( '', '', 100, { height: 0, bottom: 100 } );
	const offRight = add( '', '', 100, { left: 2000, right: 2100 } );
	const offLeft = add( '', '', 100, { left: -300, right: -10 } );
	const ok = add( '', '', 100 );
	run();
	[ hidden, zeroW, zeroH, offRight, offLeft ].forEach( ( e ) => expect( e.hasAttribute( 'data-sgs-in' ) ).toBe( false ) );
	expect( ok.hasAttribute( 'data-sgs-in' ) ).toBe( true );
	expect( cropped().flatMap( ( o ) => [ ...o.targets ] ) ).toEqual( expect.arrayContaining( [ hidden, zeroW, zeroH, offRight, offLeft ] ) );
} );

test( 'every rect is read before any data-sgs-in is written', () => {
	const log = [];
	const a = add( '', '', 100 );
	const b = add( '', '', 100 );
	[ a, b ].forEach( ( e ) => {
		const rect = e.getBoundingClientRect;
		e.getBoundingClientRect = () => {
			log.push( 'read' );
			return rect();
		};
	} );
	const spy = Element.prototype.setAttribute;
	Element.prototype.setAttribute = function ( name, value ) {
		'data-sgs-in' === name && log.push( 'write' );
		return spy.call( this, name, value );
	};
	run();
	Element.prototype.setAttribute = spy;
	expect( log ).toEqual( [ 'read', 'read', 'write', 'write' ] );
} );

test( 'an element already above its start line is revealed before the class is added, and never observed', () => {
	let classAtReveal = null;
	const spy = Element.prototype.setAttribute;
	Element.prototype.setAttribute = function ( name, value ) {
		if ( 'data-sgs-in' === name ) {
			classAtReveal = document.documentElement.classList.contains( READY );
		}
		return spy.call( this, name, value );
	};
	const above = add( '', '', 100 );
	const edge = add( '', '--sgs-me-start: 20%', 700 );
	const below = add( '', '', 2000 );
	run();
	Element.prototype.setAttribute = spy;
	expect( classAtReveal ).toBe( false );
	expect( above.hasAttribute( 'data-sgs-in' ) ).toBe( true );
	expect( edge.hasAttribute( 'data-sgs-in' ) ).toBe( false );
	expect( below.hasAttribute( 'data-sgs-in' ) ).toBe( false );
	expect( cropped().flatMap( ( o ) => [ ...o.targets ] ) ).not.toContain( above );
	expect( uncropped() ).toBeUndefined();
} );

test( 'without IntersectionObserver the class is never added', () => {
	delete window.IntersectionObserver;
	add();
	run();
	expect( document.documentElement.classList.contains( READY ) ).toBe( false );
} );

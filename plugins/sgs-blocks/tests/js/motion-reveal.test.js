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

const fire = ( io, el, isIntersecting, top = 100 ) =>
	io.cb( [ { target: el, isIntersecting, boundingClientRect: { top } } ], io );
const live = () => observers.filter( ( o ) => ! o.disconnected );
const add = ( attrs = '', style = '' ) => {
	document.body.insertAdjacentHTML( 'beforeend', `<div data-sgs-me="scroll opacity" ${ attrs } style="${ style }"></div>` );
	return document.body.lastElementChild;
};
const run = () => window.eval( SRC );

beforeEach( () => {
	observers = [];
	reduced = false;
	listeners = [];
	document.documentElement.className = '';
	document.body.innerHTML = '';
	window.IntersectionObserver = MockIO;
	window.matchMedia = () => ( {
		get matches() {
			return reduced;
		},
		addEventListener: ( type, fn ) => listeners.push( fn ),
	} );
} );

test( 'adds sgs-motion-ready and sets data-sgs-in on intersection', () => {
	const el = add();
	run();
	expect( document.documentElement.classList.contains( READY ) ).toBe( true );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
	fire( observers[ 0 ], el, true );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( true );
	expect( observers[ 0 ].targets.has( el ) ).toBe( false );
} );

test( 'does not reveal an element that is not intersecting', () => {
	const el = add();
	run();
	fire( observers[ 0 ], el, false, 900 );
	expect( el.hasAttribute( 'data-sgs-in' ) ).toBe( false );
} );

test( 'reveals an element already scrolled above the viewport', () => {
	const el = add();
	run();
	fire( observers[ 0 ], el, false, -300 );
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
	expect( observers[ 0 ].targets.has( load ) ).toBe( false );
	expect( observers[ 0 ].targets.has( el ) ).toBe( true );
	expect( load.hasAttribute( 'data-sgs-in' ) ).toBe( false );
} );

test( 'honours the start line from --sgs-me-start and shares one observer per line', () => {
	const a = add( '', '--sgs-me-start: 20%' );
	const b = add( '', '--sgs-me-start: 20%' );
	const c = add();
	run();
	const margins = observers.map( ( o ) => o.opts.rootMargin ).sort();
	expect( margins ).toEqual( [ '0px 0px -20% 0px', '0px 0px -6% 0px' ] );
	const io20 = observers.find( ( o ) => '0px 0px -20% 0px' === o.opts.rootMargin );
	expect( [ ...io20.targets ] ).toEqual( [ a, b ] );
	expect( observers.find( ( o ) => o !== io20 ).targets.has( c ) ).toBe( true );
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
	fire( observers[ 0 ], done, true );
	reduced = true;
	listeners.forEach( ( fn ) => fn() );
	expect( document.documentElement.classList.contains( READY ) ).toBe( false );
	expect( live() ).toHaveLength( 0 );
	reduced = false;
	listeners.forEach( ( fn ) => fn() );
	expect( document.documentElement.classList.contains( READY ) ).toBe( true );
	const [ io ] = live();
	expect( [ ...io.targets ] ).toEqual( [ el ] );
} );

test( 'without IntersectionObserver the class is never added', () => {
	delete window.IntersectionObserver;
	add();
	run();
	expect( document.documentElement.classList.contains( READY ) ).toBe( false );
} );

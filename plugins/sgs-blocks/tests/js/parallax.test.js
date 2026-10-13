/**
 * Element parallax (assets/js/parallax.js): writes `--sgs-plx-y` through rAF on scroll and resize, and follows the
 * reduced-motion preference live in both directions.
 */
const SCRIPT = '../../assets/js/parallax.js';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

let reduced;
let listeners;
let queue;

function mount() {
	document.body.innerHTML = '<div data-sgs-parallax="element" id="p"></div>';
	const el = document.getElementById( 'p' );
	el.getBoundingClientRect = () => ( { top: 100, bottom: 500, height: 400 } );
	jest.isolateModules( () => require( SCRIPT ) );
	return el;
}

const flush = () => {
	const run = queue;
	queue = [];
	run.forEach( ( fn ) => fn() );
};
const read = ( el ) => el.style.getPropertyValue( '--sgs-plx-y' );

beforeEach( () => {
	reduced = false;
	listeners = [];
	queue = [];
	Object.defineProperty( window, 'innerHeight', { value: 800, configurable: true } );
	window.matchMedia = jest.fn( ( query ) => ( {
		get matches() {
			return REDUCED_QUERY === query && reduced;
		},
		addEventListener: ( type, fn ) => listeners.push( fn ),
	} ) );
	window.requestAnimationFrame = ( fn ) => queue.push( fn );
} );

describe( 'parallax', () => {
	it( 'sets the offset at load and updates it on scroll through rAF', () => {
		const el = mount();
		expect( window.matchMedia ).toHaveBeenCalledWith( REDUCED_QUERY );
		expect( read( el ) ).not.toBe( '' );
		el.getBoundingClientRect = () => ( { top: -200, bottom: 200, height: 400 } );
		const before = read( el );
		window.dispatchEvent( new Event( 'scroll' ) );
		expect( read( el ) ).toBe( before );
		flush();
		expect( read( el ) ).not.toBe( before );
	} );

	it( 'recomputes on resize', () => {
		const el = mount();
		const before = read( el );
		Object.defineProperty( window, 'innerHeight', { value: 400, configurable: true } );
		window.dispatchEvent( new Event( 'resize' ) );
		flush();
		expect( read( el ) ).not.toBe( before );
	} );

	it( 'writes nothing under reduced motion at load, and starts when the preference switches off', () => {
		reduced = true;
		const el = mount();
		window.dispatchEvent( new Event( 'scroll' ) );
		flush();
		expect( read( el ) ).toBe( '' );
		reduced = false;
		listeners.forEach( ( fn ) => fn() );
		expect( read( el ) ).not.toBe( '' );
		el.getBoundingClientRect = () => ( { top: -200, bottom: 200, height: 400 } );
		const before = read( el );
		window.dispatchEvent( new Event( 'scroll' ) );
		flush();
		expect( read( el ) ).not.toBe( before );
	} );

	it( 'stops and clears when reduced motion switches on mid-session, then resumes when it switches off', () => {
		const el = mount();
		expect( read( el ) ).not.toBe( '' );
		reduced = true;
		listeners.forEach( ( fn ) => fn() );
		expect( read( el ) ).toBe( '' );
		window.dispatchEvent( new Event( 'scroll' ) );
		flush();
		expect( read( el ) ).toBe( '' );
		reduced = false;
		listeners.forEach( ( fn ) => fn() );
		expect( read( el ) ).not.toBe( '' );
	} );
} );

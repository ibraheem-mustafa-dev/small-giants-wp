/**
 * Tilt script (Spec 38A FR-38A-47, FR-38A-50): the pointer writes `--sgs-tilt-x` and `--sgs-tilt-y` only, never
 * `style.transform`; reduced motion writes nothing and a mid-session change takes effect live.
 */
const SCRIPT = '../../assets/js/tilt-3d.js';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

let reduced;
let listeners;

function installMatchMedia() {
	listeners = [];
	window.matchMedia = jest.fn( ( query ) => ( {
		get matches() {
			return REDUCED_QUERY === query && reduced;
		},
		addEventListener: ( type, fn ) => listeners.push( fn ),
		removeEventListener: () => {},
	} ) );
}

function mount() {
	document.body.innerHTML = '<div class="sgs-has-tilt-3d" id="t"></div>';
	const el = document.getElementById( 't' );
	el.getBoundingClientRect = () => ( { left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 } );
	jest.isolateModules( () => require( SCRIPT ) );
	return el;
}

function move( el, x, y ) {
	el.dispatchEvent( new MouseEvent( 'mousemove', { clientX: x, clientY: y, bubbles: true } ) );
}

beforeEach( () => {
	reduced = false;
	installMatchMedia();
	window.requestAnimationFrame = ( fn ) => {
		fn();
		return 1;
	};
	window.cancelAnimationFrame = () => {};
} );

describe( 'tilt-3d', () => {
	it( 'writes the two custom properties and never style.transform', () => {
		const el = mount();
		move( el, 200, 0 );
		expect( el.style.getPropertyValue( '--sgs-tilt-y' ) ).toBe( '6.00deg' );
		expect( el.style.getPropertyValue( '--sgs-tilt-x' ) ).toBe( '6.00deg' );
		expect( el.style.transform ).toBe( '' );
		expect( el.getAttribute( 'style' ) ).not.toMatch( /transform/ );
	} );

	it( 'resets both properties on leave', () => {
		const el = mount();
		move( el, 150, 25 );
		el.dispatchEvent( new MouseEvent( 'mouseleave' ) );
		expect( el.style.getPropertyValue( '--sgs-tilt-x' ) ).toBe( '' );
		expect( el.style.getPropertyValue( '--sgs-tilt-y' ) ).toBe( '' );
	} );

	it( 'writes nothing under reduced motion', () => {
		reduced = true;
		const el = mount();
		move( el, 200, 0 );
		expect( el.getAttribute( 'style' ) ).toBeNull();
	} );

	it( 'stops and clears when reduced motion switches on mid-session, and resumes when it switches off', () => {
		const el = mount();
		move( el, 200, 0 );
		expect( el.style.getPropertyValue( '--sgs-tilt-y' ) ).toBe( '6.00deg' );
		reduced = true;
		listeners.forEach( ( fn ) => fn() );
		expect( el.style.getPropertyValue( '--sgs-tilt-y' ) ).toBe( '' );
		move( el, 200, 0 );
		expect( el.style.getPropertyValue( '--sgs-tilt-y' ) ).toBe( '' );
		reduced = false;
		listeners.forEach( ( fn ) => fn() );
		move( el, 0, 0 );
		expect( el.style.getPropertyValue( '--sgs-tilt-y' ) ).toBe( '-6.00deg' );
	} );

	it( 'asks for the reduced-motion query and writes only the two tilt custom properties across a pointer path', () => {
		const el = mount();
		expect( window.matchMedia ).toHaveBeenCalledWith( REDUCED_QUERY );
		[ [ 0, 0 ], [ 100, 50 ], [ 200, 100 ], [ 20, 90 ] ].forEach( ( [ x, y ] ) => move( el, x, y ) );
		const written = Array.from( el.style );
		expect( written.sort() ).toEqual( [ '--sgs-tilt-x', '--sgs-tilt-y' ] );
		expect( el.style.transform ).toBe( '' );
	} );
} );

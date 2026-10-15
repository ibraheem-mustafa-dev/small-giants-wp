/**
 * Ripple pointer writer (Spec 38A FR-38A-45, FR-38A-47; build unit M5.9).
 *
 * The module boots on import, so every case mounts its DOM and then loads the module in isolation. jsdom runs no
 * animation, so the cases assert what the writer sets (custom properties and `data-sgs-ripple`); the live probe
 * (scripts/motion-qa/probe-ripple.mjs) samples the painted circle at 0, 325 and 650ms in browsers.
 */
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

let reduced;
let changeListeners;

const read = ( el, prop ) => el.style.getPropertyValue( prop );

function installMatchMedia() {
	changeListeners = [];
	window.matchMedia = jest.fn( ( query ) => ( {
		get matches() {
			return REDUCED_QUERY === query && reduced;
		},
		addEventListener: ( type, fn ) => changeListeners.push( fn ),
		removeEventListener: () => {},
	} ) );
}

function mount( attrs ) {
	document.body.innerHTML = `<button id="t" data-sgs-fx="ripple" ${ attrs }></button>`;
	const el = document.getElementById( 't' );
	el.getBoundingClientRect = () => ( { left: 10, top: 20, width: 200, height: 100, right: 210, bottom: 120 } );
	jest.isolateModules( () => require( '../../src/shared/effects/fx-ripple.js' ) );
	return el;
}

function fire( el, type, x, y, extra = {} ) {
	const event = new MouseEvent( type, { clientX: x, clientY: y, bubbles: true, ...extra } );
	el.dispatchEvent( event );
}

const INDUS =
	'data-sgs-fx-ripple-size-factor="2.2" data-sgs-fx-ripple-duration="650" data-sgs-fx-ripple-colour="#ffffff" data-sgs-fx-ripple-easing="linear"';

beforeEach( () => {
	reduced = false;
	installMatchMedia();
} );

describe( 'ripple writer', () => {
	it( 'writes the Indus circle on pointerdown: diameter max(w, h) x 2.2, white, 650ms, at the pointer', () => {
		const el = mount( INDUS );
		fire( el, 'pointerdown', 60, 70 );
		expect( read( el, '--sgs-ripple-d' ) ).toBe( '440px' );
		expect( read( el, '--sgs-ripple-x' ) ).toBe( '50.0px' );
		expect( read( el, '--sgs-ripple-y' ) ).toBe( '50.0px' );
		expect( read( el, '--sgs-ripple-colour' ) ).toBe( '#ffffff' );
		expect( read( el, '--sgs-ripple-duration' ) ).toBe( '650ms' );
		expect( read( el, '--sgs-ripple-ease' ) ).toBe( 'linear' );
		expect( el.getAttribute( 'data-sgs-ripple' ) ).toBe( 'play' );
	} );

	it( 'takes the Indus defaults when no value is stored', () => {
		const el = mount( '' );
		fire( el, 'pointerdown', 10, 20 );
		expect( read( el, '--sgs-ripple-d' ) ).toBe( '440px' );
		expect( read( el, '--sgs-ripple-duration' ) ).toBe( '650ms' );
		expect( read( el, '--sgs-ripple-colour' ) ).toBe( '#fff' );
		expect( read( el, '--sgs-ripple-ease' ) ).toBe( 'ease-out' );
	} );

	it( 'bounds the size factor and refuses a colour that breaks out of the declaration', () => {
		const el = mount( 'data-sgs-fx-ripple-size-factor="40" data-sgs-fx-ripple-colour="red;background:url(x)"' );
		fire( el, 'pointerdown', 10, 20 );
		expect( read( el, '--sgs-ripple-d' ) ).toBe( '1000px' );
		expect( read( el, '--sgs-ripple-colour' ) ).toBe( '#fff' );
	} );

	it( 'a pointerdown layer ignores click, and a click layer ignores pointerdown', () => {
		const down = mount( INDUS );
		fire( down, 'click', 60, 70, { detail: 1 } );
		expect( down.hasAttribute( 'data-sgs-ripple' ) ).toBe( false );
		const click = mount( `${ INDUS } data-sgs-fx-trigger="click"` );
		fire( click, 'pointerdown', 60, 70 );
		expect( click.hasAttribute( 'data-sgs-ripple' ) ).toBe( false );
		fire( click, 'click', 60, 70, { detail: 1 } );
		expect( click.getAttribute( 'data-sgs-ripple' ) ).toBe( 'play' );
		expect( read( click, '--sgs-ripple-x' ) ).toBe( '50.0px' );
	} );

	it( 'a keyboard click starts at the centre', () => {
		const el = mount( `${ INDUS } data-sgs-fx-trigger="click"` );
		fire( el, 'click', 0, 0, { detail: 0 } );
		expect( read( el, '--sgs-ripple-x' ) ).toBe( '100.0px' );
		expect( read( el, '--sgs-ripple-y' ) ).toBe( '50.0px' );
	} );

	it( 'plays nothing under reduced motion, read live', () => {
		const el = mount( INDUS );
		reduced = true;
		fire( el, 'pointerdown', 60, 70 );
		expect( el.hasAttribute( 'data-sgs-ripple' ) ).toBe( false );
		expect( read( el, '--sgs-ripple-d' ) ).toBe( '' );
		reduced = false;
		fire( el, 'pointerdown', 60, 70 );
		expect( el.getAttribute( 'data-sgs-ripple' ) ).toBe( 'play' );
	} );

	it( 'a switch to reduced motion cancels a circle already running', () => {
		const el = mount( INDUS );
		fire( el, 'pointerdown', 60, 70 );
		expect( el.getAttribute( 'data-sgs-ripple' ) ).toBe( 'play' );
		reduced = true;
		changeListeners.forEach( ( fn ) => fn() );
		expect( el.hasAttribute( 'data-sgs-ripple' ) ).toBe( false );
	} );

	it( 'clears the play marker when the animation ends and never writes an inline transform or opacity', () => {
		const el = mount( INDUS );
		fire( el, 'pointerdown', 60, 70 );
		el.dispatchEvent( new Event( 'animationend' ) );
		expect( el.hasAttribute( 'data-sgs-ripple' ) ).toBe( false );
		expect( el.getAttribute( 'style' ) ).not.toMatch( /(^|;|\s)(transform|translate|scale|opacity)\s*:/ );
	} );

	it( 'ignores a secondary mouse button', () => {
		const el = mount( INDUS );
		fire( el, 'pointerdown', 60, 70, { button: 2 } );
		expect( el.hasAttribute( 'data-sgs-ripple' ) ).toBe( false );
	} );
} );

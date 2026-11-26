/**
 * assets/js/touch-input.js (Spec 38A FR-38A-17): by default a touch puts `.sgs-pressed` on the touched element and its
 * ancestors at once and `.sgs-touch-input` on <html>; lifting, a scroll (pointercancel) or sliding off the element
 * clears the pressed class. "Off on touch screens" (`desktop`) sets only the touch class, "Show on tap" (`tap`)
 * neither; a mouse never sets either and clears the touch class on a press or a plain move.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const SRC = fs.readFileSync( path.join( __dirname, '../../assets/js/touch-input.js' ), 'utf8' );
const root = document.documentElement;

function pointer( target, type, pointerType, extra = {} ) {
	const event = new Event( type, { bubbles: true, composed: true } );
	const props = { pointerType, pointerId: 1, isPrimary: true, clientX: 5, clientY: 5, ...extra };
	for ( const [ key, value ] of Object.entries( props ) ) {
		Object.defineProperty( event, key, { value } );
	}
	target.dispatchEvent( event );
}

const pressed = () => [ ...document.querySelectorAll( '.sgs-pressed' ) ].map( ( el ) => el.id || el.tagName.toLowerCase() );

describe( 'touch-input', () => {
	let card;
	let link;
	let other;
	let under;

	beforeAll( () => {
		document.body.innerHTML = '<div id="card"><a id="link" href="#">Go</a></div><p id="other">x</p>';
		card = document.getElementById( 'card' );
		link = document.getElementById( 'link' );
		other = document.getElementById( 'other' );
		document.elementFromPoint = () => under;
		window.requestAnimationFrame = ( cb ) => {
			cb();
			return 1;
		};
		window.cancelAnimationFrame = () => {};
		// eslint-disable-next-line no-eval
		window.eval( SRC );
	} );

	beforeEach( () => {
		root.removeAttribute( 'data-sgs-touch-hover' );
		pointer( link, 'pointerup', 'touch' );
		pointer( link, 'pointermove', 'mouse' );
		under = link;
	} );

	test( 'a touch presses the element and every ancestor at once, and turns the mouse halves off', () => {
		pointer( link, 'pointerdown', 'touch' );
		expect( pressed() ).toEqual( [ 'html', 'body', 'card', 'link' ] );
		expect( root.classList.contains( 'sgs-touch-input' ) ).toBe( true );
	} );

	test( 'a long touch keeps it, and lifting the finger clears it', () => {
		pointer( link, 'pointerdown', 'touch' );
		pointer( link, 'pointermove', 'touch' );
		expect( pressed() ).toContain( 'link' );
		pointer( link, 'pointerup', 'touch' );
		expect( pressed() ).toEqual( [] );
	} );

	test( 'a touch that becomes a scroll (pointercancel) clears it', () => {
		pointer( link, 'pointerdown', 'touch' );
		pointer( link, 'pointercancel', 'touch' );
		expect( pressed() ).toEqual( [] );
	} );

	test( 'sliding off unpresses each element the finger left, and presses nothing new', () => {
		pointer( link, 'pointerdown', 'touch' );
		under = card;
		pointer( link, 'pointermove', 'touch' );
		expect( pressed() ).toEqual( [ 'html', 'body', 'card' ] );
		under = other;
		pointer( link, 'pointermove', 'touch' );
		expect( pressed() ).toEqual( [ 'html', 'body' ] );
		expect( other.classList.contains( 'sgs-pressed' ) ).toBe( false );
	} );

	test( 'a mouse never presses, and a mouse move or press gives the hover looks back', () => {
		pointer( link, 'pointerdown', 'mouse' );
		expect( pressed() ).toEqual( [] );
		pointer( link, 'pointerdown', 'touch' );
		pointer( link, 'pointerup', 'touch' );
		pointer( link, 'pointermove', 'mouse' );
		expect( root.classList.contains( 'sgs-touch-input' ) ).toBe( false );
		pointer( link, 'pointerdown', 'touch' );
		pointer( link, 'pointerdown', 'mouse' );
		expect( root.classList.contains( 'sgs-touch-input' ) ).toBe( false );
	} );

	test( '"Off on touch screens" turns the mouse halves off and presses nothing', () => {
		root.setAttribute( 'data-sgs-touch-hover', 'desktop' );
		pointer( link, 'pointerdown', 'touch' );
		expect( root.classList.contains( 'sgs-touch-input' ) ).toBe( true );
		expect( pressed() ).toEqual( [] );
	} );

	test( '"Show on tap" leaves the browser\'s own hover alone', () => {
		root.setAttribute( 'data-sgs-touch-hover', 'tap' );
		pointer( link, 'pointerdown', 'touch' );
		expect( root.classList.contains( 'sgs-touch-input' ) ).toBe( false );
		expect( pressed() ).toEqual( [] );
	} );
} );

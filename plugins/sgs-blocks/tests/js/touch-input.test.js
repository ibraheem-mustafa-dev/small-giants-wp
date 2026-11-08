/**
 * assets/js/touch-input.js: with "Desktop only" hover on touch screens, a touch press sets `.sgs-touch-input` on
 * <html> and a mouse clears it, on a press or a plain move (device emulation switched off, a hybrid laptop).
 */
const fs = require( 'fs' );
const path = require( 'path' );

const SRC = fs.readFileSync( path.join( __dirname, '../../assets/js/touch-input.js' ), 'utf8' );

function pointer( type, pointerType ) {
	const event = new Event( type, { bubbles: true } );
	Object.defineProperty( event, 'pointerType', { value: pointerType } );
	window.dispatchEvent( event );
}

describe( 'touch-input', () => {
	beforeAll( () => {
		document.documentElement.setAttribute( 'data-sgs-touch-hover', 'desktop' );
		// eslint-disable-next-line no-eval
		window.eval( SRC );
	} );

	test( 'a touch press sets the touch state and a touch move keeps it', () => {
		pointer( 'pointerdown', 'touch' );
		expect( document.documentElement.classList.contains( 'sgs-touch-input' ) ).toBe( true );
		pointer( 'pointermove', 'touch' );
		expect( document.documentElement.classList.contains( 'sgs-touch-input' ) ).toBe( true );
	} );

	test( 'a mouse move clears it without a click', () => {
		pointer( 'pointerdown', 'touch' );
		pointer( 'pointermove', 'mouse' );
		expect( document.documentElement.classList.contains( 'sgs-touch-input' ) ).toBe( false );
	} );

	test( 'a mouse press clears it too', () => {
		pointer( 'pointerdown', 'touch' );
		pointer( 'pointerdown', 'mouse' );
		expect( document.documentElement.classList.contains( 'sgs-touch-input' ) ).toBe( false );
	} );
} );

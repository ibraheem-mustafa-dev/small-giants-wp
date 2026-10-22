/**
 * `image-reveal` full reveal on keyboard focus and on touch or pen tap (Spec 38A). The paint is CSS; this proves the flag
 * `data-sgs-reveal-open` the stylesheet reads, and that the mouse never sets it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { initRevealOpen } from '../../src/shared/effects/cursor-field-reveal';

const OPEN = 'data-sgs-reveal-open';
let el;
let stop;

const pointer = ( target, type, pointerType ) => {
	const event = new Event( type, { bubbles: true } );
	event.pointerType = pointerType;
	target.dispatchEvent( event );
};

beforeEach( () => {
	document.body.innerHTML = '<div id="out">x</div><div id="t" data-sgs-cursor-field="image-reveal"><a id="a" href="#a">A</a><a id="b" href="#b">B</a></div>';
	el = document.getElementById( 't' );
	stop = initRevealOpen( el );
} );

afterEach( () => stop() );

test( 'focus inside opens the reveal and leaving closes it', () => {
	document.getElementById( 'a' ).focus();
	expect( el.hasAttribute( OPEN ) ).toBe( true );
	document.getElementById( 'b' ).focus();
	expect( el.hasAttribute( OPEN ) ).toBe( true );
	document.getElementById( 'b' ).blur();
	expect( el.hasAttribute( OPEN ) ).toBe( false );
} );

test( 'a touch tap toggles and a tap outside closes', () => {
	pointer( el, 'pointerup', 'touch' );
	expect( el.hasAttribute( OPEN ) ).toBe( true );
	pointer( el, 'pointerup', 'touch' );
	expect( el.hasAttribute( OPEN ) ).toBe( false );
	pointer( el, 'pointerup', 'pen' );
	expect( el.hasAttribute( OPEN ) ).toBe( true );
	pointer( document.getElementById( 'out' ), 'pointerdown', 'touch' );
	expect( el.hasAttribute( OPEN ) ).toBe( false );
} );

test( 'a mouse click on a link inside the card does not open it', () => {
	const link = document.getElementById( 'a' );
	pointer( link, 'pointerdown', 'mouse' );
	link.focus();
	expect( el.hasAttribute( OPEN ) ).toBe( false );
} );

test( 'a Tab in from elsewhere after a tap opens it (the key press lands outside the card)', () => {
	pointer( el, 'pointerup', 'touch' );
	pointer( el, 'pointerup', 'touch' );
	expect( el.hasAttribute( OPEN ) ).toBe( false );
	document.getElementById( 'out' ).dispatchEvent( new KeyboardEvent( 'keydown', { key: 'Tab', bubbles: true } ) );
	document.getElementById( 'b' ).focus();
	expect( el.hasAttribute( OPEN ) ).toBe( true );
} );

test( 'the mouse never opens the full reveal', () => {
	pointer( el, 'pointerup', 'mouse' );
	expect( el.hasAttribute( OPEN ) ).toBe( false );
} );

test( 'teardown removes the flag', () => {
	pointer( el, 'pointerup', 'touch' );
	stop();
	expect( el.hasAttribute( OPEN ) ).toBe( false );
} );

test( 'a tap on a link inside the card opens it and a second tap closes it although the link keeps focus', () => {
	const link = document.getElementById( 'a' );
	pointer( link, 'pointerup', 'touch' );
	link.focus();
	expect( el.hasAttribute( OPEN ) ).toBe( true );
	pointer( link, 'pointerup', 'touch' );
	expect( el.hasAttribute( OPEN ) ).toBe( false );
} );

test( 'keyboard focus after a tap counts again', () => {
	pointer( el, 'pointerup', 'touch' );
	pointer( el, 'pointerup', 'touch' );
	el.dispatchEvent( new Event( 'keydown', { bubbles: true } ) );
	document.getElementById( 'b' ).focus();
	expect( el.hasAttribute( OPEN ) ).toBe( true );
} );

test( 'the touch stylesheet keeps the image layer while the reveal is open', () => {
	const css = readFileSync( join( __dirname, '../../assets/css/fx-cursor-field.css' ), 'utf8' );
	const touch = css.slice( css.indexOf( '@media not all and (hover: hover) and (pointer: fine)' ) );
	const rule = touch.slice( 0, touch.indexOf( '}' ) );
	expect( rule ).toContain( ':not([data-sgs-cursor-field="image-reveal"][data-sgs-reveal-open])::before' );
} );

/**
 * `image-reveal` full reveal on keyboard focus and on touch or pen tap (Spec 38A). The paint is CSS; this proves the flag
 * `data-sgs-reveal-open` the stylesheet reads, and that the mouse never sets it.
 */
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

test( 'the mouse never opens the full reveal', () => {
	pointer( el, 'pointerup', 'mouse' );
	expect( el.hasAttribute( OPEN ) ).toBe( false );
} );

test( 'teardown removes the flag', () => {
	pointer( el, 'pointerup', 'touch' );
	stop();
	expect( el.hasAttribute( OPEN ) ).toBe( false );
} );

/**
 * The head gate (assets/js/marquee-ready-gate.js) marks a marquee root before the module boots. An `overflow` marquee
 * is never pre-marked: whether the items overflow is known only after measuring, so a pre-mark would show a running
 * layout that snaps back (a layout shift) or hide the resting wrap the module has to measure.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const SOURCE = fs
	.readFileSync( path.join( __dirname, '../../assets/js/marquee-ready-gate.js' ), 'utf8' )
	.replace( /SGS_MARQUEE_BREAKPOINTS/g, '{ mobile: 767, tablet: 1023 }' );

async function runGate( below ) {
	document.body.innerHTML = '';
	window.matchMedia = () => ( { matches: false } );
	Element.prototype.animate = () => ( {} );
	new Function( SOURCE )();
	const root = document.createElement( 'div' );
	root.setAttribute( 'data-sgs-fx', 'marquee' );
	root.setAttribute( 'data-sgs-fx-marquee-below-breakpoint', below );
	root.innerHTML = '<div class="lane"><div data-sgs-marquee-set><a href="#a">A</a></div></div>';
	document.body.appendChild( root );
	await Promise.resolve();
	await Promise.resolve();
	document.dispatchEvent( new Event( 'DOMContentLoaded' ) );
	return root;
}

afterEach( () => {
	delete Element.prototype.animate;
} );

test( 'an overflow marquee is not pre-marked: the module decides after measuring', async () => {
	const root = await runGate( 'overflow' );
	expect( root.hasAttribute( 'data-sgs-marquee' ) ).toBe( false );
	expect( root.querySelector( '.lane' ).hasAttribute( 'data-sgs-marquee-lane' ) ).toBe( false );
} );

test( 'NEGATIVE CONTROL: an always marquee is still pre-marked', async () => {
	const root = await runGate( 'always' );
	expect( root.getAttribute( 'data-sgs-marquee' ) ).toBe( 'on' );
} );

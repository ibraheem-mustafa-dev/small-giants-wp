/**
 * Checkboxes and radios take the inset focus ring (Spec 32 section 14.5) on a click as well as on a keyboard focus, so a
 * selectable card carrying a stretched input rings inside its border with no second ring outside it.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const raw = fs.readFileSync( path.resolve( __dirname, '../../../../theme/sgs-theme/assets/css/focus.css' ), 'utf8' );
const css = raw.replace( /\r/g, '' );

describe( 'choice control focus', () => {
	test( 'checkboxes and radios set the inset offset and halo', () => {
		const start = css.indexOf( 'input[type="checkbox"],\ninput[type="radio"] {' );
		expect( start ).toBeGreaterThan( -1 );
		const rule = css.slice( start, css.indexOf( '}', start ) );
		expect( rule ).toContain( '--sgs-focus-offset: calc(var(--sgs-focus-width) * -1)' );
		expect( rule ).toContain( '--sgs-focus-halo: inset 0 0 0' );
	} );

	test( 'a pointer focus (:focus without :focus-visible) draws the same ring', () => {
		const start = css.indexOf( 'input[type="checkbox"]:focus:not(:focus-visible' );
		expect( start ).toBeGreaterThan( -1 );
		const rule = css.slice( start, css.indexOf( '}', start ) );
		expect( rule ).toContain( 'outline: var(--sgs-focus-width)' );
		expect( rule ).toContain( 'outline-offset: var(--sgs-focus-offset)' );
		expect( rule ).toContain( 'box-shadow: var(--sgs-focus-halo)' );
	} );
} );

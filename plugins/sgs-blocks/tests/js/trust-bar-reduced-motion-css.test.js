/**
 * A ticker trust bar under `prefers-reduced-motion: reduce` is a still, tidy layout: the marquee never starts, so the bar
 * must wrap, centre, keep its gap, stay inside its container and show each badge once. jsdom has no layout, so this reads
 * the shipped stylesheets and asserts the rules the browser will apply.
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const read = ( rel ) => fs.readFileSync( path.join( __dirname, '../..', rel ), 'utf8' ).replace( /\/\*[\s\S]*?\*\//g, '' );

/** The body of the first `@media (prefers-reduced-motion: reduce)` block, by brace matching. */
function reducedMotionBlock( css ) {
	const start = css.indexOf( '@media (prefers-reduced-motion: reduce)' );
	if ( start < 0 ) {
		return '';
	}
	const open = css.indexOf( '{', start );
	let depth = 0;
	for ( let i = open; i < css.length; i++ ) {
		depth += '{' === css[ i ] ? 1 : '}' === css[ i ] ? -1 : 0;
		if ( 0 === depth ) {
			return css.slice( open + 1, i );
		}
	}
	return '';
}

/** The declarations of the first rule in `block` whose selector contains `needle`. */
function declarations( block, needle ) {
	const re = /([^{}]+)\{([^{}]*)\}/g;
	let m;
	while ( ( m = re.exec( block ) ) ) {
		if ( m[ 1 ].includes( needle ) ) {
			return m[ 2 ].replace( /\s+/g, ' ' );
		}
	}
	return '';
}

describe( 'trust bar still layout under reduced motion', () => {
	const block = reducedMotionBlock( read( 'src/blocks/trust-bar/style.css' ) );

	test( 'a ticker bar wraps, centres and never exceeds its container', () => {
		const rule = declarations( block, '.sgs-trust-bar.sgs-trust-bar[data-sgs-fx~="marquee"]' );
		expect( rule ).toContain( 'display: flex' );
		expect( rule ).toContain( 'flex-wrap: wrap' );
		expect( rule ).toContain( 'justify-content: center' );
		expect( rule ).toContain( 'max-width: 100%' );
		expect( rule ).toContain( 'min-width: 0' );
		expect( rule ).not.toMatch( /\bgap\s*:/ ); // the bar keeps its own gap
	} );

	test( 'a bar limited to tablet or mobile keeps its authored layout', () => {
		const selector = [ ...block.matchAll( /([^{}]+)\{/g ) ].map( ( m ) => m[ 1 ] ).find( ( s ) => s.includes( '.sgs-trust-bar.sgs-trust-bar' ) );
		expect( selector ).toContain( ':not([data-sgs-fx-marquee-below-breakpoint="tablet"])' );
		expect( selector ).toContain( ':not([data-sgs-fx-marquee-below-breakpoint="mobile"])' );
	} );

	test( 'a badge shrinks to the bar, wraps a long label and has inline padding an operator can override', () => {
		expect( block ).toMatch( /max-width: 100%;\s*min-width: 0;\s*overflow-wrap: anywhere/ );
		expect( block ).toMatch( /:where\(\.sgs-trust-bar\[data-sgs-fx~="marquee"\] \.sgs-trust-bar__badge\)\s*\{\s*padding-inline:/ );
	} );

	test( 'the title takes its own row', () => {
		expect( declarations( block, '.sgs-trust-bar__title' ) ).toContain( 'flex: 0 0 100%' );
	} );
} );

describe( 'the shared marquee lane under reduced motion', () => {
	test( 'a cloned item is hidden from view and assistive technology', () => {
		const block = reducedMotionBlock( read( 'assets/css/fx-marquee.css' ) );
		expect( declarations( block, '[data-sgs-marquee-clone]' ) ).toContain( 'display: none' );
	} );
} );

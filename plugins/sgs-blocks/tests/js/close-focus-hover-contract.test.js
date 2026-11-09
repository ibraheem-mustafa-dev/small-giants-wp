/**
 * Source contracts for three shared behaviours:
 * - closing a drawer, flyout or menu hands focus back without scrolling the page;
 * - closing a modal restores the page position instantly;
 * - a Link-style button keeps its own colour on hover, and a button keeps the underline utility's line on hover.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const plugin = path.resolve( __dirname, '..', '..' );
const read = ( relative ) => fs.readFileSync( path.join( plugin, relative ), 'utf8' );
const theme = ( relative ) => fs.readFileSync( path.resolve( plugin, '..', '..', 'theme/sgs-theme', relative ), 'utf8' );

describe( 'focus returned on close never scrolls the page', () => {
	test.each( [
		[ 'src/shared/nav-interactivity/store.js', /\b(?:trigger|headerFallback)\.focus\(\s*\)/ ],
		[ 'src/blocks/cart/flyout.js', /\btrigger\.focus\(\s*\)/ ],
		[ 'src/blocks/language-switch/view.js', /\btrigger\.focus\(\s*\)/ ],
		[ 'src/blocks/store-selector/view.js', /\btrigger\.focus\(\s*\)/ ],
	] )( '%s has no plain focus call on its opener', ( file, plain ) => {
		expect( read( file ) ).not.toMatch( plain );
		expect( read( file ) ).toMatch( /focus\(\s*\{\s*preventScroll:\s*true\s*\}\s*\)/ );
	} );

	test( 'the mega menu returns focus to its trigger without scrolling', () => {
		expect( read( 'src/shared/nav-interactivity/mega-disclosure.js' ) ).toMatch(
			/trigger\.focus\(\s*\{\s*preventScroll:\s*true\s*\}\s*\)/
		);
	} );
} );

describe( 'closing a modal restores the page position instantly', () => {
	test( 'scroll-behavior is auto around the scrollTo and put back after it', () => {
		const source = read( 'src/blocks/modal/view.js' );
		const call = source.indexOf( 'window.scrollTo( 0, scrollY )' );
		expect( call ).toBeGreaterThan( -1 );
		const set = source.lastIndexOf( ".style.scrollBehavior = 'auto'", call );
		expect( set ).toBeGreaterThan( -1 );
		expect( call - set ).toBeLessThan( 120 );
		expect( source.indexOf( '.style.scrollBehavior = previous', call ) ).toBeGreaterThan( call );
	} );
} );

describe( 'button hover', () => {
	test( 'a Link-style button does not reset its hover colour to the parent colour', () => {
		const rule = read( 'src/blocks/button/style.css' ).match( /\.sgs-button--link\s*\{[^}]*\}/ )[ 0 ];
		expect( rule ).not.toMatch( /--sgs-btn-color-hover/ );
		expect( rule ).toMatch( /--sgs-btn-color:\s*currentColor/ );
	} );

	test( 'the underline utility keeps its line through a button hover, and a hover gradient still wins', () => {
		const css = theme( 'assets/css/utilities.css' );
		const hover = css.match( /:is\(a, button\)\.sgs-hover-underline-slide:is\(:hover, :focus-visible\)[^{]*\{[^}]*\}/ )[ 0 ];
		expect( hover ).toMatch( /background-image:\s*var\(--sgs-btn-bg-hover-image,\s*linear-gradient\(/ );
	} );
} );

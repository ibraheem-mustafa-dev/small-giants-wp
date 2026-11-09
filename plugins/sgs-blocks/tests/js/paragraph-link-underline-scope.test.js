/**
 * The page-wide paragraph link underline skips links an SGS block styles itself, as the list-link selector already does,
 * or a block's own underline gains a second line under it.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const css = fs.readFileSync( path.resolve( __dirname, '..', '..', 'assets/css/extensions.css' ), 'utf8' );

test( 'every paragraph link selector excludes SGS-classed links', () => {
	const selectors = css.match( /\.entry-content p a[^,{]*/g );
	expect( selectors.length ).toBe( 3 );
	selectors.forEach( ( selector ) => expect( selector ).toContain( ':not([class*="sgs-"])' ) );
} );

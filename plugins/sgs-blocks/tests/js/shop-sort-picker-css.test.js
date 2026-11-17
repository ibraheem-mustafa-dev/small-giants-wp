/**
 * The shop's sort dropdown opens as a list joined to its button where the browser supports a customisable
 * select (`appearance: base-select`, Chromium only). Every rule sits inside one `@supports` block, so any other
 * browser, and a site that picks the browser's own arrow in the Customizer, keeps the standard dropdown.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const CSS = fs.readFileSync(
	path.resolve( __dirname, '..', '..', '..', '..', 'theme', 'sgs-theme', 'assets', 'css', 'woocommerce.css' ),
	'utf8'
);

function supportsBlock() {
	const start = CSS.indexOf( '@supports (appearance: base-select)' );
	if ( start < 0 ) {
		return '';
	}
	let depth = 0;
	for ( let i = CSS.indexOf( '{', start ); i < CSS.length; i++ ) {
		if ( '{' === CSS[ i ] ) {
			depth++;
		} else if ( '}' === CSS[ i ] && 0 === --depth ) {
			return CSS.slice( start, i + 1 );
		}
	}
	return '';
}

describe( 'sort dropdown picker', () => {
	const block = supportsBlock();

	test( 'has an @supports (appearance: base-select) block', () => {
		expect( block ).not.toBe( '' );
	} );

	test( 'opts the select and its picker into base-select, only under the opt-in body class', () => {
		expect( block ).toMatch( /body\.sgs-shop-sort-joined select\.orderby[^{]*\{[^}]*appearance:\s*base-select/ );
		expect( block ).toMatch( /select\.orderby::picker\(select\)[^{]*\{[^}]*appearance:\s*base-select/ );
	} );

	test( 'joins the list to the button: flat bottom edge while open, no gap above the list', () => {
		expect( block ).toMatch( /select\.orderby:open/ );
		expect( block ).toMatch( /::picker\(select\)[^{]*\{[^}]*margin-block-start:/ );
	} );

	test( 'the only base-select appearance outside the block is none', () => {
		const outside = CSS.replace( block, '' ).replace( /\/\*[\s\S]*?\*\//g, '' );
		expect( outside ).not.toMatch( /base-select|::picker/ );
	} );
} );

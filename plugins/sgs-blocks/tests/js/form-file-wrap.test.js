/**
 * A long uploaded file name stays inside its box (Spec 04 FR-4-1): the preview, the file name, both error lines, the field
 * and the review list wrap an unbroken string instead of stretching the grid track.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

// The form block's sheets: the form's own (the review list), the field sheet (the field and its error line) and the
// file upload sheet (the preview, the file name and the file error line).
const CSS_FILES = [ 'style.css', 'field-sheet/style.css', 'file-sheet/style.css' ].map( ( sheet ) =>
	path.resolve( __dirname, '..', '..', 'src', 'blocks', 'form', sheet )
);

/**
 * Declarations of every rule whose selector list is exactly the given selectors (order and spacing ignored).
 *
 * @param {string}   css       Stylesheet source.
 * @param {string[]} selectors Selectors the rule must list.
 * @return {Object<string,string>} Property to value.
 */
function declarationsFor( css, selectors ) {
	const want = [ ...selectors ].sort().join( '|' );
	const found = {};
	postcss.parse( css ).walkRules( ( rule ) => {
		const have = rule.selectors.map( ( s ) => s.replace( /\s+/g, ' ' ).trim() ).sort().join( '|' );
		if ( have !== want ) {
			return;
		}
		rule.walkDecls( ( decl ) => {
			found[ decl.prop ] = decl.value;
		} );
	} );
	return found;
}

describe( 'form sheets: long file names', () => {
	const css = CSS_FILES.map( ( file ) => fs.readFileSync( file, 'utf8' ) ).join( '\n' );

	it( 'lets the preview shrink and wrap anywhere', () => {
		const decls = declarationsFor( css, [ '.sgs-form-file__preview' ] );
		expect( decls[ 'min-width' ] ).toBe( '0' );
		expect( decls[ 'overflow-wrap' ] ).toBe( 'anywhere' );
	} );

	it( 'wraps the file name and both error lines anywhere', () => {
		expect( declarationsFor( css, [ '.sgs-form-file__name', '.sgs-form-file__error' ] )[ 'overflow-wrap' ] ).toBe( 'anywhere' );
		expect( declarationsFor( css, [ '.sgs-form-field__error' ] )[ 'overflow-wrap' ] ).toBe( 'anywhere' );
	} );

	it( 'lets a field shrink below its content at zero specificity', () => {
		const decls = declarationsFor( css, [ ':where(.sgs-form-field)' ] );
		expect( decls[ 'min-width' ] ).toBe( '0' );
	} );

	it( 'lets the review term and detail shrink and wrap', () => {
		const decls = declarationsFor( css, [ '.sgs-form-review__term', '.sgs-form-review__detail' ] );
		expect( decls[ 'min-width' ] ).toBe( '0' );
		expect( decls[ 'overflow-wrap' ] ).toBe( 'anywhere' );
	} );

	it( 'negative control: a stylesheet without the rules reports nothing', () => {
		expect( declarationsFor( '.sgs-form-file__preview{padding:1px}', [ '.sgs-form-file__preview' ] )[ 'overflow-wrap' ] ).toBeUndefined();
	} );
} );

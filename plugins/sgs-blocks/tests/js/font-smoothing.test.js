/**
 * Font smoothing: the synchronous critical stylesheet tells Mac browsers to smooth letters in greyscale, so text weight
 * matches the drafts (Spec 01 FR-1-1). The declarations sit on the `html` rule, which loads on the frontend and in the
 * editor (`add_editor_style`).
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const CSS_FILE = path.resolve( __dirname, '..', '..', '..', '..', 'theme', 'sgs-theme', 'assets', 'css', 'core-blocks-critical.css' );

/**
 * Declarations of every top-level `html` rule in a stylesheet, keyed by property.
 *
 * @param {string} css Stylesheet source.
 * @return {Object<string,string>} Property to value.
 */
function htmlDeclarations( css ) {
	const found = {};
	postcss.parse( css ).walkRules( ( rule ) => {
		if ( rule.parent.type !== 'root' || rule.selector.trim() !== 'html' ) {
			return;
		}
		rule.walkDecls( ( decl ) => {
			found[ decl.prop ] = decl.value;
		} );
	} );
	return found;
}

describe( 'core-blocks-critical.css font smoothing', () => {
	const css = fs.readFileSync( CSS_FILE, 'utf8' );

	it( 'smooths greyscale in WebKit and Gecko on the html element', () => {
		const decls = htmlDeclarations( css );
		expect( decls[ '-webkit-font-smoothing' ] ).toBe( 'antialiased' );
		expect( decls[ '-moz-osx-font-smoothing' ] ).toBe( 'grayscale' );
	} );

	it( 'negative control: a stylesheet without them reports nothing', () => {
		const decls = htmlDeclarations( 'html{scroll-behavior:smooth}' );
		expect( decls[ '-webkit-font-smoothing' ] ).toBeUndefined();
	} );
} );

/**
 * authoredTextPlain reads the words of a typed rich value without any WordPress global, so a block that calls it
 * cannot crash the editor when `@wordpress/dom` lacks a helper.
 */
import { authoredTextPlain } from '../../../src/utils/authored-text';

describe( 'authoredTextPlain', () => {
	it( 'does not import @wordpress/dom (core exports strip-html only as __unstableStripHTML)', () => {
		const fs = require( 'fs' );
		const source = fs.readFileSync( require.resolve( '../../../src/utils/authored-text' ), 'utf8' );
		expect( source ).not.toMatch( /from\s+['"]@wordpress\/dom['"]/ );
	} );

	it( 'removes tags, decodes entities and turns a line break into a space', () => {
		expect( authoredTextPlain( 'Find <strong>a&nbsp;gift</strong><br>now' ) ).toBe( 'Find a gift now' );
	} );

	it( 'drops script and style contents', () => {
		expect( authoredTextPlain( 'Search<script>alert(1)</script><style>p{}</style>' ) ).toBe( 'Search' );
	} );

	it( 'passes plain text and empty values through', () => {
		expect( authoredTextPlain( '  Search   shop ' ) ).toBe( 'Search shop' );
		expect( authoredTextPlain( undefined ) ).toBe( '' );
		expect( authoredTextPlain( null ) ).toBe( '' );
	} );
} );

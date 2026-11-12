/**
 * The touch hover guard rewrites the stylesheet WordPress actually serves for each block: block.json names
 * `style-index.css` (webpack's output), while copy-built-styles.js also writes a `style.css` copy.
 */
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const { findStyleCssFiles } = require( '../../scripts/hover-guard/run-transform.js' );

describe( 'hover-guard findStyleCssFiles', () => {
	it( 'collects style-index.css, style.css and their rtl twins in every block folder', () => {
		const base = fs.mkdtempSync( path.join( os.tmpdir(), 'hover-guard-' ) );
		const block = path.join( base, 'buybox' );
		fs.mkdirSync( block );
		for ( const name of [ 'style-index.css', 'style.css', 'style-index-rtl.css', 'style-rtl.css', 'index.css' ] ) {
			fs.writeFileSync( path.join( block, name ), 'a:hover{transform:none}' );
		}
		const found = findStyleCssFiles( base ).map( ( f ) => path.basename( f ) ).sort();
		fs.rmSync( base, { recursive: true, force: true } );
		expect( found ).toEqual( [ 'style-index-rtl.css', 'style-index.css', 'style-rtl.css', 'style.css' ] );
	} );
} );

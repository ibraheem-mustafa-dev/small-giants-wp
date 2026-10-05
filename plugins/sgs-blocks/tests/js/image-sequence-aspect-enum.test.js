/**
 * sgs/image-sequence validates `aspectRatio` against its block.json enum in
 * render.php; the inspector offers MediaSizingPanel's RATIO_OPTIONS. The two
 * value sets must be identical, or the inspector offers a ratio the front end
 * silently replaces with 16 / 9 (or the enum allows one nobody can pick).
 */

const fs = require( 'fs' );
const path = require( 'path' );

const root = path.resolve( __dirname, '../..' );

function ratioOptionValues() {
	const source = fs.readFileSync( path.join( root, 'src/components/MediaSizingPanel.js' ), 'utf8' );
	const block = source.match( /export const RATIO_OPTIONS = \[([\s\S]*?)\];/ );
	expect( block ).not.toBeNull();
	return [ ...block[ 1 ].matchAll( /value:\s*'([^']*)'/g ) ].map( ( m ) => m[ 1 ] );
}

describe( 'image-sequence aspectRatio enum', () => {
	it( 'equals the inspector RATIO_OPTIONS values, default included', () => {
		const blockJson = JSON.parse( fs.readFileSync( path.join( root, 'src/blocks/image-sequence/block.json' ), 'utf8' ) );
		const attr = blockJson.attributes.aspectRatio;
		const options = ratioOptionValues();

		expect( options.length ).toBeGreaterThan( 0 );
		expect( attr.enum ).toEqual( options );
		expect( attr.enum ).toContain( attr.default );
	} );
} );

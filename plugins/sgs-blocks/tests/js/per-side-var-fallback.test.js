/**
 * The build's minifier folds four `padding-{side}` longhands into one `padding` shorthand. A shorthand that reads an
 * unset custom property with no fallback is invalid and paints no padding at all, so a box that sets only its top side
 * would lose that side too. Every block stylesheet that reads per-side custom properties must give each side a fallback.
 */

const fs = require( 'fs' );
const path = require( 'path' );

const BLOCKS = path.join( __dirname, '..', '..', 'src', 'blocks' );
const SIDES = [ 'top', 'right', 'bottom', 'left' ];

/**
 * @param {string} css Stylesheet source.
 * @return {string[]} `padding` or `margin` when all four sides read a custom property and at least one lacks a fallback.
 */
function unguardedSideFamilies( css ) {
	const found = [];
	[ 'padding', 'margin' ].forEach( ( property ) => {
		const reads = ( side ) => new RegExp( String.raw`${ property }-${ side }:\s*var\(\s*--[a-z0-9-]+` ).test( css );
		const bare = ( side ) =>
			new RegExp( String.raw`${ property }-${ side }:\s*var\(\s*--[a-z0-9-]+\s*\)\s*;` ).test( css );
		if ( SIDES.every( reads ) && SIDES.some( bare ) ) {
			found.push( property );
		}
	} );
	return found;
}

const stylesheets = fs
	.readdirSync( BLOCKS )
	.map( ( dir ) => path.join( BLOCKS, dir, 'style.css' ) )
	.filter( ( file ) => fs.existsSync( file ) );

describe( 'per-side custom properties carry a fallback', () => {
	it.each( stylesheets.map( ( file ) => [ path.basename( path.dirname( file ) ), file ] ) )( '%s', ( name, file ) => {
		expect( unguardedSideFamilies( fs.readFileSync( file, 'utf8' ) ) ).toEqual( [] );
	} );

	it( 'negative control: any bare side is reported, fully guarded sides are not', () => {
		const rule = ( guard ) =>
			SIDES.map( ( side ) => `padding-${ side }: var( --x-${ side }${ guard( side ) } );` ).join( '\n' );
		expect( unguardedSideFamilies( rule( () => '' ) ) ).toEqual( [ 'padding' ] );
		expect( unguardedSideFamilies( rule( ( side ) => ( 'top' === side ? '' : ', 0' ) ) ) ).toEqual( [ 'padding' ] );
		expect( unguardedSideFamilies( rule( () => ', 0' ) ) ).toEqual( [] );
	} );
} );

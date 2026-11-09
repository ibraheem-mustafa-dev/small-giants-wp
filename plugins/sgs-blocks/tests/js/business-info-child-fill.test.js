/**
 * sgs/business-info opts into the child-sizing extension (a map can fill a grown flex item) and its map
 * frame is a column flex box whose iframe takes the room the frame gains.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const read = ( rel ) => fs.readFileSync( path.resolve( __dirname, '..', '..', rel ), 'utf8' );
const block = JSON.parse( read( 'src/blocks/business-info/block.json' ) );
const css = read( 'src/blocks/business-info/style.css' );

const rule = ( selector ) => {
	const at = css.indexOf( `\n${ selector } {` );
	return at < 0 ? '' : css.slice( at, css.indexOf( '}', at ) );
};

test( 'business-info enables the childSizing extension', () => {
	expect( block.supports.sgs.enabledExtensions ).toContain( 'childSizing' );
} );

test( 'the map frame is a flex column and its iframe grows into spare height', () => {
	expect( rule( '.sgs-business-map' ) ).toMatch( /display:\s*flex/ );
	expect( rule( '.sgs-business-map' ) ).toMatch( /flex-direction:\s*column/ );
	expect( rule( '.sgs-business-map iframe' ) ).toMatch( /flex:\s*1 1 auto/ );
} );

test( 'the map wrapper passes a grown height down to the frame', () => {
	expect( rule( '.sgs-business-info-wrap--map' ) ).toMatch( /flex-direction:\s*column/ );
	expect( rule( '.sgs-business-info-wrap--map > .sgs-business-map' ) ).toMatch( /flex:\s*1 1 auto/ );
} );

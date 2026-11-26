/**
 * src/utils/shape-dividers.js is the editor twin of includes/shape-dividers.php:
 * the same shape paths, and the same scale/height/tile geometry.
 */

const fs = require( 'fs' );
const path = require( 'path' );

import {
	SHAPE_DIVIDER_PATHS,
	shapeDividerAxis,
	shapeDividerTile,
	shapeDividerHeight,
	shapeDividerGradient,
	shapeDividerTransform,
} from '../../src/utils/shape-dividers';

describe( 'shape-dividers twin', () => {
	it( 'carries exactly the shapes and paths sgs_get_shape_dividers() returns', () => {
		const php = fs.readFileSync( path.resolve( __dirname, '../../includes/shape-dividers.php' ), 'utf8' );
		const fromPhp = {};
		for ( const m of php.matchAll( /'([a-z-]+)'\s*=>\s*array\(\s*'label' => '[^']*',\s*'path'\s*=> '([^']*)'/g ) ) {
			fromPhp[ m[ 1 ] ] = m[ 2 ];
		}
		expect( Object.keys( fromPhp ).length ).toBeGreaterThan( 0 );
		expect( { ...SHAPE_DIVIDER_PATHS } ).toEqual( fromPhp );
	} );

	it( 'clamps an axis to 10-400 and treats unset as 100', () => {
		expect( shapeDividerAxis( undefined, 'x' ) ).toBe( 100 );
		expect( shapeDividerAxis( { x: 'abc' }, 'x' ) ).toBe( 100 );
		expect( shapeDividerAxis( { y: 2 }, 'y' ) ).toBe( 10 );
		expect( shapeDividerAxis( { y: 900 }, 'y' ) ).toBe( 400 );
	} );

	it( 'derives height from Y and a centred tile from X', () => {
		expect( shapeDividerHeight( 150 ) ).toBe( 180 );
		expect( shapeDividerTile( 100 ) ).toBeNull();
		expect( shapeDividerTile( 50 ) ).toEqual( { tileW: 600, originX: 300, tileScale: 0.5 } );
	} );

	it( 'maps a linear angle to the PHP gradient-def line and a radial to r 75%', () => {
		const linear = shapeDividerGradient( 'linear-gradient(90deg,#ff0000 0%,#0000ff 100%)' );
		expect( linear.x1 ).toBeCloseTo( 0 );
		expect( linear.y1 ).toBeCloseTo( 0.5 );
		expect( linear.x2 ).toBeCloseTo( 1 );
		expect( linear.y2 ).toBeCloseTo( 0.5 );
		expect( linear.stops ).toHaveLength( 2 );
		expect( shapeDividerGradient( 'radial-gradient(#fff,#000)' ).r ).toBe( 75 );
		expect( shapeDividerGradient( 'not a gradient' ) ).toBeNull();
	} );
	it( 'mirrors with translate + scale (never scaleX(-1)), a top divider mirrored by default', () => {
		expect( shapeDividerTransform( false, false, 'bottom' ) ).toBeUndefined();
		expect( shapeDividerTransform( true, false, 'bottom' ) ).toBe( 'translate(1200 0) scale(-1 1)' );
		expect( shapeDividerTransform( false, true, 'bottom' ) ).toBe( 'translate(0 120) scale(1 -1)' );
		expect( shapeDividerTransform( true, true, 'bottom' ) ).toBe( 'translate(1200 120) scale(-1 -1)' );
		expect( shapeDividerTransform( false, false, 'top' ) ).toBe( 'translate(0 120) scale(1 -1)' );
		expect( shapeDividerTransform( false, true, 'top' ) ).toBeUndefined();
		expect( shapeDividerTransform( true, false, 'top' ) ).toBe( 'translate(1200 120) scale(-1 -1)' );
	} );

	it( 'writes the same transform strings as sgs_shape_divider_transform()', () => {
		const php = fs.readFileSync( path.resolve( __dirname, '../../includes/shape-dividers.php' ), 'utf8' );
		expect( php ).toContain( "' transform=\"translate(' . $tx . ' ' . $ty . ') scale(' . $sx . ' ' . $sy . ')\"'" );
		expect( php ).toContain( "( 'top' === $position ) !== $invert" );
	} );
	it( 'every block that mounts the Shape dividers panel also mounts the canvas preview and the root class', () => {
		const blocksDir = path.resolve( __dirname, '../../src/blocks' );
		const panelBlocks = fs
			.readdirSync( blocksDir )
			.filter( ( name ) => {
				const edit = path.join( blocksDir, name, 'edit.js' );
				return (
					fs.existsSync( edit ) &&
					/<ShapeDividersPanel\b/.test( fs.readFileSync( edit, 'utf8' ) )
				);
			} );
		expect( panelBlocks.sort() ).toEqual( [ 'container', 'hero', 'site-footer', 'trust-bar' ] );
		for ( const name of panelBlocks ) {
			const source = fs.readFileSync( path.join( blocksDir, name, 'edit.js' ), 'utf8' );
			expect( source ).toMatch( /<ShapeDividerPreviews?\b/ );
			expect( 'container' === name || /shapeDividerClassName\(/.test( source ) ).toBe( true );
		}
	} );
} );

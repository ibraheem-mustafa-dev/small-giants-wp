/**
 * src/utils/end-shape.js is the editor twin of includes/helpers-end-shape.php.
 *
 * The expected strings are read out of tests/php/LabelEndShapeTest.php (its
 * `private const` literals), so the PHP and JS outputs are held to one set of
 * literals; the arrow-right ones are also written out here so a change to the
 * PHP test cannot silently loosen this one.
 */

const fs = require( 'fs' );
const path = require( 'path' );

import {
	END_SHAPE_ALLOWED,
	endShapeNormalise,
	endShapeDepth,
	endShapeEdgePath,
	endShapeCutSvg,
	endShapeStrokeSvg,
	endShapeMaskDecls,
	endShapeRingDecls,
} from '../../src/utils/end-shape';

const phpTest = fs.readFileSync( path.resolve( __dirname, '../php/LabelEndShapeTest.php' ), 'utf8' );

/**
 * The PHP test's `private const NAME = '…';` literals, unescaped.
 */
function phpConstants() {
	const out = {};
	for ( const m of phpTest.matchAll( /private const (\w+) = ('(?:[^'\\]|\\.)*'|"[^"]*");/g ) ) {
		const raw = m[ 2 ];
		out[ m[ 1 ] ] = '"' === raw[ 0 ] ? raw.slice( 1, -1 ) : raw.slice( 1, -1 ).replace( /\\(['\\])/g, '$1' );
	}
	return out;
}

const PHP = phpConstants();

const ARROW_RIGHT_CUT =
	"<svg xmlns='http://www.w3.org/2000/svg' width='45' height='100' viewBox='0 0 45 100' preserveAspectRatio='none'><path fill-rule='evenodd' transform='matrix(0 0.0833 -0.375 0 45 0)' d='M0,0H1200V120H0Z M0,0 L600,120 L1200,0 L1200,120 L0,120 Z'/></svg>";

const ARROW_RIGHT_MASK =
	'mask-image:linear-gradient(#000 0 0),url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'45\' height=\'100\' viewBox=\'0 0 45 100\' preserveAspectRatio=\'none\'%3E%3Cpath fill-rule=\'evenodd\' transform=\'matrix(0 0.0833 -0.375 0 45 0)\' d=\'M0,0H1200V120H0Z M0,0 L600,120 L1200,0 L1200,120 L0,120 Z\'/%3E%3C/svg%3E");mask-position:0 0,right center;mask-size:100% 100%,auto 100%;mask-repeat:no-repeat;mask-composite:subtract;';

describe( 'end-shape twin', () => {
	it( 'reads the PHP test literals', () => {
		expect( Object.keys( PHP ) ).toEqual(
			expect.arrayContaining( [
				'ALLOWED',
				'EDGE_ARROW',
				'EDGE_TRIANGLE',
				'EDGE_SLANT',
				'EDGE_CURVE',
				'EDGE_WAVE_SMOOTH',
				'EDGE_ZIGZAG',
				'CUT_ARROW_RIGHT_45',
				'MASK_ARROW_RIGHT_45',
				'STROKE_ARROW_RIGHT_45',
			] )
		);
	} );

	it( 'allows the same shapes in the same order', () => {
		expect( END_SHAPE_ALLOWED.join( ',' ) ).toBe( PHP.ALLOWED );
	} );

	it( 'draws every edge path as the PHP helper does', () => {
		const expected = {
			arrow: 'EDGE_ARROW',
			triangle: 'EDGE_TRIANGLE',
			slant: 'EDGE_SLANT',
			curve: 'EDGE_CURVE',
			'wave-smooth': 'EDGE_WAVE_SMOOTH',
			zigzag: 'EDGE_ZIGZAG',
		};
		for ( const [ shape, key ] of Object.entries( expected ) ) {
			expect( endShapeEdgePath( shape ) ).toBe( PHP[ key ] );
		}
		expect( endShapeEdgePath( 'arrow' ) ).toBe( 'M0,0 L600,120 L1200,0' );
		expect( endShapeEdgePath( 'cloud' ) ).toBe( '' );
	} );

	it( 'draws the right-arrow cut tile as the PHP helper does', () => {
		expect( endShapeCutSvg( 'arrow', 'right', 45 ) ).toBe( PHP.CUT_ARROW_RIGHT_45 );
		expect( endShapeCutSvg( 'arrow', 'right', 45 ) ).toBe( ARROW_RIGHT_CUT );
	} );

	it( 'mirrors the matrix for a left end', () => {
		expect( endShapeCutSvg( 'arrow', 'left', 45 ) ).toContain( 'matrix(0 0.0833 0.375 0 0 0)' );
	} );

	it( 'prints the right-arrow mask declarations as the PHP helper does', () => {
		expect( endShapeMaskDecls( { right: [ 'arrow', 45 ] } ) ).toBe( PHP.MASK_ARROW_RIGHT_45 );
		expect( endShapeMaskDecls( { right: [ 'arrow', 45 ] } ) ).toBe( ARROW_RIGHT_MASK );
	} );

	it( 'adds a layer and a union for a second end, and nothing for none', () => {
		const both = endShapeMaskDecls( { left: [ 'triangle', 30 ], right: [ 'arrow', 45 ] } );
		expect( both ).toContain( 'mask-position:0 0,right center,left center;' );
		expect( both ).toContain( 'mask-composite:subtract,add;' );
		expect( endShapeMaskDecls( {} ) ).toBe( '' );
		expect( endShapeMaskDecls( { left: [ '', 45 ] } ) ).toBe( '' );
	} );

	it( 'strokes the edge at twice the outline width', () => {
		expect( endShapeStrokeSvg( 'arrow', 'right', 45, 2 ) ).toBe( PHP.STROKE_ARROW_RIGHT_45 );
	} );

	it( 'builds the ring with the stroke tile, or the straight sides alone', () => {
		const ring = endShapeRingDecls( { right: [ 'arrow', 45 ] }, '2px', 2 );
		expect( ring ).toContain( 'padding:2px;' );
		expect( ring ).toContain( 'mask-clip:border-box,content-box,border-box;' );
		expect( ring ).toContain( 'mask-composite:add,exclude;' );
		expect( ring ).toContain( "stroke-width='4'" );
		const plain = endShapeRingDecls( { right: [ 'arrow', 45 ] }, '0.125rem', null );
		expect( plain ).not.toContain( 'stroke-width' );
		expect( plain ).toContain( 'mask-composite:exclude;' );
	} );

	it( 'normalises a shape and clamps a depth', () => {
		expect( endShapeNormalise( 'cloud' ) ).toBe( '' );
		expect( endShapeNormalise( 'arrow' ) ).toBe( 'arrow' );
		expect( endShapeDepth( 900 ) ).toBe( 150 );
		expect( endShapeDepth( 1 ) ).toBe( 10 );
		expect( endShapeDepth( undefined ) ).toBe( 45 );
		expect( endShapeDepth( '' ) ).toBe( 45 );
	} );
} );

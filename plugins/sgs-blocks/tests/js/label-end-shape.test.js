/**
 * src/utils/end-shape.js is the editor twin of includes/helpers-end-shape.php, and
 * src/blocks/label/end-shape-preview.js prints the rules render.php prints for a shaped label.
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
	endShapeCutSvg,
	endShapeMaskDecls,
	endShapeBorderBoxDecls,
	endShapeLayerDecls,
} from '../../src/utils/end-shape';
import { labelEndShapePreviewCss } from '../../src/blocks/label/end-shape-preview';

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

const DRAFT_LAYER =
	'content:"";position:absolute;inset:calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px);border-style:solid;border-width:2px 2px 2px 2px;border-color:#3A2A22;border-right:1px solid transparent;background-clip:padding-box;z-index:-2;box-sizing:border-box;pointer-events:none;border-radius:inherit;' +
	ARROW_RIGHT_MASK;

/** The draft's tag: right V notch, 2px solid #3A2A22 border, #EE8088 fill. */
const DRAFT_TAG = {
	endShapeRight: 'arrow',
	endDepth: 45,
	borderWidth: { top: '2px', right: '2px', bottom: '2px', left: '2px' },
	borderStyle: 'solid',
	borderColour: '#3A2A22',
	backgroundColour: '#EE8088',
};

// colourVar() asks the browser's CSS.supports() whether a value is already a colour; jsdom has
// no CSS global, so this stands in for the browser's answer.
beforeAll( () => {
	global.CSS = { supports: ( property, value ) => 'color' === property && /^(#|rgba?\(|hsla?\()/i.test( String( value ) ) };
} );
afterAll( () => {
	delete global.CSS;
} );

describe( 'end-shape twin', () => {
	it( 'reads the PHP test literals', () => {
		expect( Object.keys( PHP ) ).toEqual(
			expect.arrayContaining( [ 'ALLOWED', 'CUT_ARROW_RIGHT_45', 'MASK_ARROW_RIGHT_45', 'LAYER_ARROW_RIGHT_DRAFT' ] )
		);
	} );

	it( 'allows the same shapes in the same order', () => {
		expect( END_SHAPE_ALLOWED.join( ',' ) ).toBe( PHP.ALLOWED );
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

	it( 'prints the draft layer as the PHP helper does', () => {
		const layer = endShapeLayerDecls(
			{ right: [ 'arrow', 45 ] },
			[ 'border-style:solid', 'border-width:2px 2px 2px 2px' ],
			'background-color:#3A2A22'
		);
		expect( layer ).toBe( PHP.LAYER_ARROW_RIGHT_DRAFT );
		expect( layer ).toBe( DRAFT_LAYER );
	} );

	it( 'insets each side by its width, maps the paint onto the border and leaves the shaped side paint-free', () => {
		const right = { right: [ 'arrow', 45 ] };
		expect(
			endShapeBorderBoxDecls( right, [ 'border-style:solid', 'border-width:2px 0 0 4px' ], 'background-image:linear-gradient(90deg,#f00,#00f)' )
		).toBe(
			'inset:calc(-1 * 2px) 0 0 calc(-1 * 4px);border-style:solid;border-width:2px 0 0 4px;border-image:linear-gradient(90deg,#f00,#00f) 1;border-image-width:1 0 1 1;border-right:1px solid transparent;background-clip:padding-box;'
		);
		expect( endShapeBorderBoxDecls( right, [ 'border-style:dashed', 'border-width:2px 2px 2px 2px' ], '' ) ).toBe(
			'inset:calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px) calc(-1 * 2px);border-style:dashed;border-width:2px 2px 2px 2px;border-right:1px solid transparent;background-clip:padding-box;'
		);
		expect( endShapeBorderBoxDecls( right, [], 'background-color:#3A2A22' ) ).toBe(
			'inset:0;border-right:1px solid transparent;background-clip:padding-box;'
		);
		expect( endShapeBorderBoxDecls( {}, [], 'background-color:#3A2A22' ) ).toBe( 'inset:0;' );
		expect(
			endShapeBorderBoxDecls(
				{ left: [ 'triangle', 30 ], right: [ 'arrow', 45 ] },
				[ 'border-style:solid', 'border-width:2px 2px 2px 2px' ],
				'background-image:linear-gradient(90deg,#f00,#00f)'
			)
		).toContain( 'border-image-width:1 0 1 0;border-right:1px solid transparent;border-left:1px solid transparent;background-clip:padding-box;' );
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

describe( 'label end-shape canvas preview', () => {
	const SEL = '.sgs-lbl-ed-abc';

	it( 'paints the draft tag fill and border on the cut layer, as render.php does', () => {
		expect( labelEndShapePreviewCss( SEL, DRAFT_TAG ) ).toBe(
			'.sgs-lbl-ed-abc.wp-block-sgs-label{background-color:transparent;position:relative;isolation:isolate;}' +
				'.sgs-lbl-ed-abc.wp-block-sgs-label::after{' +
				PHP.LAYER_ARROW_RIGHT_DRAFT +
				'background-color:#EE8088;}'
		);
	} );

	it( 'insets each side of the layer by that side\'s width', () => {
		const css = labelEndShapePreviewCss( SEL, { ...DRAFT_TAG, borderWidth: { top: '2px', left: '4px' } } );
		expect( css ).toContain( 'inset:calc(-1 * 2px) 0 0 calc(-1 * 4px);border-style:solid;border-width:2px 0 0 4px;border-color:#3A2A22;' );
	} );

	it( 'paints a gradient border as a border image and keeps a dashed style', () => {
		expect( labelEndShapePreviewCss( SEL, { ...DRAFT_TAG, borderColourGradient: 'linear-gradient(90deg,#ff0000,#0000ff)' } ) ).toContain(
			'border-image:linear-gradient(90deg,#ff0000,#0000ff) 1;'
		);
		expect( labelEndShapePreviewCss( SEL, { ...DRAFT_TAG, borderStyle: 'dashed' } ) ).toContain( 'border-style:dashed;border-width:2px 2px 2px 2px;' );
	} );

	it( 'draws no border on the layer for style none, and nothing without a shape', () => {
		const none = labelEndShapePreviewCss( SEL, { ...DRAFT_TAG, borderStyle: 'none' } );
		expect( none ).toContain(
			'::after{content:"";position:absolute;inset:0;border-right:1px solid transparent;background-clip:padding-box;z-index:-2;'
		);
		expect( none ).not.toContain( '#3A2A22' );
		expect( labelEndShapePreviewCss( SEL, { ...DRAFT_TAG, endShapeRight: '' } ) ).toBe( '' );
	} );

	it( 'prints no edge element rules', () => {
		expect( labelEndShapePreviewCss( SEL, DRAFT_TAG ) ).not.toContain( 'sgs-label__edge' );
	} );
} );

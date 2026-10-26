/**
 * The Floating layer's canvas twin: layerPreviewStyle mirrors the rules render.php emits for the positioned root
 * (tests/php/DecorativeImageLayerTest.php asserts the same literals on the PHP side).
 */
import { layerPreviewStyle, layerBoxPreview, layerPaintsBox } from '../../src/blocks/decorative-image/layer-preview';
import PAINTS_BOX_CASES from '../fixtures/decorative-image-paints-box.json';

describe( 'layerPreviewStyle', () => {
	it( 'Fit the content is max-content capped at the parent, whatever the tier', () => {
		const attrs = {
			widthUnit: 'auto',
			width: { desktop: 300, tablet: 180 },
			rotation: { desktop: 12 },
		};
		const style = layerPreviewStyle( attrs, 'tablet', true );
		expect( style.width ).toBe( 'max-content' );
		expect( style.maxWidth ).toBe( '100%' );
		expect( style.transform ).toBe( 'translate(-50%, -50%) rotate(12deg)' );
	} );

	it( 'Percentage uses the previewed tier and has no cap unless a max width is set', () => {
		const attrs = {
			widthUnit: '%',
			width: { desktop: 60, tablet: 40 },
		};
		expect( layerPreviewStyle( attrs, 'desktop', true ).width ).toBe( '60%' );
		expect( layerPreviewStyle( attrs, 'tablet', true ).width ).toBe( '40%' );
		expect( layerPreviewStyle( attrs, 'mobile', true ).width ).toBe( '40%' );
		expect( layerPreviewStyle( attrs, 'desktop', true ).maxWidth ).toBeUndefined();
	} );

	it( 'Fixed stays in pixels; a max width applies per previewed tier, any unit, none by default', () => {
		const attrs = { width: { desktop: 240 }, maxWidth: { desktop: '30%', mobile: '12rem' } };
		expect( layerPreviewStyle( attrs, 'desktop', false ) ).toMatchObject( { width: '240px', maxWidth: '30%' } );
		expect( layerPreviewStyle( attrs, 'tablet', false ).maxWidth ).toBe( '30%' );
		expect( layerPreviewStyle( attrs, 'mobile', false ).maxWidth ).toBe( '12rem' );
		expect( layerPreviewStyle( { width: { desktop: 240 } }, 'desktop', false ).maxWidth ).toBeUndefined();
		expect( layerPreviewStyle( { widthUnit: 'auto', maxWidth: { desktop: '320px' } }, 'desktop', true ).maxWidth ).toBe( '320px' );
	} );

	it( 'the canvas layer always takes pointer events so an empty layer keeps a clickable appender', () => {
		expect( layerPreviewStyle( {}, 'desktop', true ).pointerEvents ).toBe( 'auto' );
		expect( layerPreviewStyle( {}, 'desktop', false ).pointerEvents ).toBe( 'auto' );
	} );

	it( 'opacity defaults to fully opaque and flip joins the transform', () => {
		const style = layerPreviewStyle( { flipX: true }, 'desktop', true );
		expect( style.opacity ).toBe( 1 );
		expect( style.transform ).toBe( 'translate(-50%, -50%) scaleX(-1)' );
	} );
} );

describe( 'layerBoxPreview', () => {
	const ring = {
		borderWidth: { top: '2px', right: '2px', bottom: '2px', left: '2px' },
		borderStyle: 'solid',
		borderColour: 'rgba(216,202,80,.55)',
		borderRadius: { desktop: { topLeft: '50%', topRight: '50%', bottomRight: '50%', bottomLeft: '50%' } },
		height: { desktop: '340px', mobile: '120px' },
	};

	it( 'previews the ring: border, 50% radius and height, as render.php prints them', () => {
		const style = layerBoxPreview( ring, 'desktop' );
		expect( style.borderStyle ).toBe( 'solid' );
		expect( style.borderWidth ).toBe( '2px 2px 2px 2px' );
		expect( style.borderColor ).toBe( 'rgba(216,202,80,.55)' );
		expect( style.borderTopLeftRadius ).toBe( '50%' );
		expect( style.borderBottomRightRadius ).toBe( '50%' );
		expect( style.height ).toBe( '340px' );
	} );

	it( 'a narrower tier inherits the wider height until it sets its own', () => {
		expect( layerBoxPreview( ring, 'tablet' ).height ).toBe( '340px' );
		expect( layerBoxPreview( ring, 'mobile' ).height ).toBe( '120px' );
	} );

	it( 'paints the fill and the shadow', () => {
		const style = layerBoxPreview(
			{ backgroundColour: '#112233', boxShadow: '0 4px 12px', boxShadowColour: '#000000' },
			'desktop'
		);
		expect( style.backgroundColor ).toBe( '#112233' );
		expect( style.boxShadow ).toBe( '0px 4px 12px 0px #000000' );
	} );

	it( 'a gradient fill wins over the flat colour', () => {
		const style = layerBoxPreview(
			{ backgroundColour: '#112233', backgroundColourGradient: 'linear-gradient(red, blue)' },
			'desktop'
		);
		expect( style.backgroundImage ).toBe( 'linear-gradient(red, blue)' );
		expect( style.backgroundColor ).toBeUndefined();
	} );

	it( 'an unset box adds nothing, so an existing layer previews as before', () => {
		expect( layerBoxPreview( {}, 'desktop' ) ).toEqual( {} );
	} );
} );

describe( 'layerBoxPreview shape', () => {
	it( 'clips the canvas layer to the shape render.php clips the root to', () => {
		expect( layerBoxPreview( { shape: 'circle' }, 'desktop', [] ).clipPath ).toBe( 'circle(50%)' );
		expect( layerBoxPreview( { shape: 'rounded' }, 'desktop', [] ).clipPath ).toBe( 'inset(0 round 12px)' );
		expect( layerBoxPreview( { shape: 'square' }, 'desktop', [] ).clipPath ).toBe( 'inset(0)' );
	} );

	it( 'no shape, none or an unknown shape prints no clip', () => {
		[ {}, { shape: 'none' }, { shape: 'hexagon' } ].forEach( ( attrs ) => {
			expect( layerBoxPreview( attrs, 'desktop', [] ).clipPath ).toBeUndefined();
		} );
	} );
} );

describe( 'an empty layer draws exactly when render.php says', () => {
	// The same table tests/php/DecorativeImageLayerTest.php renders the real block against.
	it.each( PAINTS_BOX_CASES.map( ( c ) => [ c.name, c.attrs, c.paints ] ) )( '%s', ( name, attrs, paints ) => {
		expect( layerPaintsBox( attrs ) ).toBe( paints );
	} );

	it( 'a layer with no media and no content previews no box when it would not render one', () => {
		const heightOnly = { height: { desktop: '80px' } };
		expect( layerBoxPreview( heightOnly, 'desktop', [], true ) ).toEqual( {} );
		expect( layerBoxPreview( heightOnly, 'desktop', [], false ).height ).toBe( '80px' );
		expect( layerBoxPreview( { ...heightOnly, backgroundColour: '#112233' }, 'desktop', [], true ).height ).toBe( '80px' );
	} );
} );

describe( 'layerPreviewStyle edge offsets (the twin of DecorativeImageLayerTest edge cases)', () => {
	it( 'edges on both axes replace the centre model', () => {
		const style = layerPreviewStyle(
			{ positionTop: { desktop: '-110px' }, positionRight: { desktop: '-90px' }, positionX: { desktop: 30 } },
			'desktop',
			false
		);
		expect( style.top ).toBe( '-110px' );
		expect( style.right ).toBe( '-90px' );
		expect( style.left ).toBeUndefined();
		expect( style.transform ).toBe( 'none' );
	} );

	it( 'one anchored axis keeps the other axis centred', () => {
		const style = layerPreviewStyle(
			{ positionTop: { desktop: '24px' }, positionX: { desktop: 30 }, rotation: { desktop: 15 } },
			'desktop',
			false
		);
		expect( style.left ).toBe( '30%' );
		expect( style.top ).toBe( '24px' );
		expect( style.transform ).toBe( 'translateX(-50%) rotate(15deg)' );
	} );

	it( 'a narrower tier inherits the wider edge and an anchored axis ignores its centre tiers', () => {
		const attrs = { positionBottom: { desktop: '-60px', tablet: '-40px' }, positionY: { desktop: 50, tablet: 20 } };
		expect( layerPreviewStyle( attrs, 'mobile', false ).bottom ).toBe( '-40px' );
		expect( layerPreviewStyle( attrs, 'tablet', false ).top ).toBeUndefined();
	} );

	it( 'an unsafe edge value prints nothing and leaves the axis centred', () => {
		const style = layerPreviewStyle( { positionLeft: { desktop: '1px;}body{color:red' } }, 'desktop', false );
		expect( style.left ).toBe( '50%' );
		expect( style.transform ).toBe( 'translate(-50%, -50%)' );
	} );
} );

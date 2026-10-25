/**
 * The Floating layer's canvas twin: layerPreviewStyle mirrors the rules render.php emits for the positioned root
 * (tests/php/DecorativeImageLayerTest.php asserts the same literals on the PHP side).
 */
import { layerPreviewStyle, layerBoxPreview } from '../../src/blocks/decorative-image/layer-preview';

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

	it( 'Percentage uses the previewed tier and drops the max-width cap', () => {
		const attrs = {
			widthUnit: '%',
			width: { desktop: 60, tablet: 40 },
			maxWidthPercent: 20,
		};
		expect( layerPreviewStyle( attrs, 'desktop', true ).width ).toBe( '60%' );
		expect( layerPreviewStyle( attrs, 'tablet', true ).width ).toBe( '40%' );
		expect( layerPreviewStyle( attrs, 'mobile', true ).width ).toBe( '40%' );
		expect( layerPreviewStyle( attrs, 'desktop', true ).maxWidth ).toBeUndefined();
	} );

	it( 'Fixed stays in pixels with the percentage cap', () => {
		const style = layerPreviewStyle(
			{ width: { desktop: 240 }, maxWidthPercent: 30 },
			'desktop',
			false
		);
		expect( style.width ).toBe( '240px' );
		expect( style.maxWidth ).toBe( '30%' );
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

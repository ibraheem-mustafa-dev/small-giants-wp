/**
 * The Floating layer's canvas twin: layerPreviewStyle mirrors the rules render.php emits for the positioned root
 * (tests/php/DecorativeImageLayerTest.php asserts the same literals on the PHP side).
 */
import { layerPreviewStyle } from '../../src/blocks/decorative-image/layer-preview';

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

	it( 'a layer with content takes pointer events, an image alone does not', () => {
		expect( layerPreviewStyle( {}, 'desktop', true ).pointerEvents ).toBe( 'auto' );
		expect( layerPreviewStyle( {}, 'desktop', false ).pointerEvents ).toBe( 'none' );
	} );

	it( 'opacity defaults to fully opaque and flip joins the transform', () => {
		const style = layerPreviewStyle( { flipX: true }, 'desktop', true );
		expect( style.opacity ).toBe( 1 );
		expect( style.transform ).toBe( 'translate(-50%, -50%) scaleX(-1)' );
	} );
} );

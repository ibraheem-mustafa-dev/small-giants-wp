/**
 * Editor-canvas previews resolve at the device tier the editor previews, the
 * way each front-end emitter resolves it: per-side and whole-box tier boxes,
 * corner radii, the tiered background image, the shared wrapper mirror, the
 * button's tiered width/min-height/icon size and the hero's split media tier.
 */

import { tierBoxShorthand, BOX_CORNER_KEYS } from '../../src/utils/spacing-preview';
import { backgroundPreview } from '../../src/utils/background-preview';
import { containerWrapperPreview } from '../../src/utils/container-wrapper-preview';
import { buttonPreviewStyle, labelCollapsedAt } from '../../src/blocks/button/preview-style';
import { splitMediaAtTier } from '../../src/blocks/hero/canvas-preview';
import { multiButtonFlexPreview } from '../../src/blocks/multi-button/preview-style';
import { imageControlsCanvasVars } from '../../src/blocks/extensions/image-controls';

describe( 'tierBoxShorthand', () => {
	const padding = { desktop: { top: '10px', left: '20px' }, tablet: { top: '4px' } };

	it( 'merges a narrower tier per side for a per-side emitter', () => {
		expect( tierBoxShorthand( padding, 'tablet' ) ).toBe( '4px 0 0 20px' );
	} );

	it( 'takes the narrowest declaring tier whole for a whole-box emitter', () => {
		expect( tierBoxShorthand( padding, 'tablet', undefined, true ) ).toBe( '4px 0 0 0' );
		expect( tierBoxShorthand( padding, 'mobile', undefined, true ) ).toBe( '4px 0 0 0' );
		expect( tierBoxShorthand( padding, 'desktop', undefined, true ) ).toBe( '10px 0 0 20px' );
	} );

	it( 'resolves corner keys for a radius', () => {
		const radius = { desktop: { topLeft: '8px' }, mobile: { bottomRight: '2px' } };
		expect( tierBoxShorthand( radius, 'desktop', BOX_CORNER_KEYS ) ).toBe( '8px 0 0 0' );
		expect( tierBoxShorthand( radius, 'mobile', BOX_CORNER_KEYS ) ).toBe( '8px 0 2px 0' );
	} );
} );

describe( 'backgroundPreview tiered image', () => {
	const attrs = {
		backgroundImage: { url: 'd.jpg' },
		backgroundImageTablet: { url: 't.jpg' },
		backgroundImageMobile: {},
	};
	it( 'swaps the tablet image in at tablet and mobile (mobile unset)', () => {
		expect( backgroundPreview( attrs, [], [], 'desktop' ).style[ '--sgs-ed-bg-image' ] ).toBe( 'url(d.jpg)' );
		expect( backgroundPreview( attrs, [], [], 'tablet' ).style[ '--sgs-ed-bg-image' ] ).toBe( 'url(t.jpg)' );
		expect( backgroundPreview( attrs, [], [], 'mobile' ).style[ '--sgs-ed-bg-image' ] ).toBe( 'url(t.jpg)' );
	} );
} );

describe( 'containerWrapperPreview', () => {
	it( 'resolves gap, max-width and the layout at the tier and adds the layout class', () => {
		const out = containerWrapperPreview( {
			layout: 'grid',
			gap: { desktop: '24', mobile: '8' },
			maxWidth: { desktop: '900px' },
			columns: { desktop: 3, mobile: 1 },
			gridTemplateRows: { desktop: 'auto 1fr' },
		}, 'mobile' );
		expect( out.style.gap ).toBe( '8px' );
		expect( out.style.maxWidth ).toBe( '900px' );
		expect( out.style.gridTemplateColumns ).toBe( 'repeat(1, 1fr)' );
		expect( out.style.gridTemplateRows ).toBe( 'auto 1fr' );
		expect( out.className ).toBe( 'sgs-container--grid' );
		expect( out.hasBandProps ).toBe( false );
	} );

	it( 'moves the grid onto the band when a content width opens one', () => {
		const out = containerWrapperPreview( { layout: 'grid', contentWidth: { desktop: '800px' }, gridTemplateRows: { desktop: '1fr' } }, 'desktop' );
		expect( out.hasBandProps ).toBe( true );
		expect( out.bandStyle.maxWidth ).toBe( '800px' );
		expect( out.bandStyle.display ).toBe( 'grid' );
		expect( out.bandStyle.gridTemplateRows ).toBe( '1fr' );
		expect( out.style.display ).toBeUndefined();
	} );

	it( 'paints a string desktop radius as one value, as sgs_border_radius_tiers() does', () => {
		expect( containerWrapperPreview( { borderRadius: { desktop: '6px', tablet: { topLeft: '0' } } }, 'desktop' ).style.borderRadius ).toBe( '6px' );
	} );
} );

describe( 'buttonPreviewStyle', () => {
	const attrs = {
		widthType: { desktop: 'fit', mobile: 'full' },
		minHeight: { desktop: 40, tablet: 3 },
		minHeightTabletUnit: 'rem',
		iconSize: { desktop: 20, mobile: 32 },
		contentAlign: { desktop: 'center', tablet: 'flex-start' },
	};
	it( 'paints each tier as render.php emits it', () => {
		expect( buttonPreviewStyle( attrs, [], 'desktop' ).style ).toMatchObject( { width: 'fit-content', minHeight: '40px', '--sgs-btn-icon-size': '20px', justifyContent: 'center' } );
		expect( buttonPreviewStyle( attrs, [], 'tablet' ).style ).toMatchObject( { width: 'fit-content', minHeight: '3rem', justifyContent: 'flex-start' } );
		expect( buttonPreviewStyle( attrs, [], 'mobile' ).style ).toMatchObject( { width: '100%', '--sgs-btn-icon-size': '32px' } );
	} );

	it( 'collapses the label only from the chosen tier down, and only with an icon', () => {
		expect( labelCollapsedAt( 'tablet', true, 'desktop' ) ).toBe( false );
		expect( labelCollapsedAt( 'tablet', true, 'mobile' ) ).toBe( true );
		expect( labelCollapsedAt( 'all', false, 'desktop' ) ).toBe( false );
	} );
} );

describe( 'splitMediaAtTier', () => {
	it( 'cascades a tier with no media up to the wider tier', () => {
		const attrs = { splitMediaType: 'image', splitMediaImageUrl: 'd.jpg', splitMediaTypeMobile: 'video', splitMediaVideoUrlMobile: 'm.mp4' };
		expect( splitMediaAtTier( attrs, 'tablet' ).image.url ).toBe( 'd.jpg' );
		expect( splitMediaAtTier( attrs, 'mobile' ).type ).toBe( 'video' );
	} );
} );

describe( 'multiButtonFlexPreview', () => {
	it( 'uses render.php mobile defaults when the mobile tier is unset', () => {
		expect( multiButtonFlexPreview( { flexDirection: { desktop: 'row' } }, 'mobile' ) ).toMatchObject( { flexDirection: 'column', gap: '8px', alignItems: 'stretch' } );
	} );
} );

describe( 'imageControlsCanvasVars', () => {
	it( 'emits the same custom properties includes/image-controls.php injects', () => {
		expect( imageControlsCanvasVars( { sgsObjectFit: 'contain', sgsHeightTablet: 300, sgsHeightUnit: 'vh', sgsObjectPosition: { x: 0.5, y: 0.5 } } ) ).toEqual( {
			'--sgs-object-fit': 'contain',
			'--sgs-height-tablet': '300vh',
		} );
	} );
} );

/**
 * The editor-canvas style builders that mirror what render.php paints for the
 * notice banner, tab, gallery, post grid, CTA section, nav drawer chrome and
 * cart panel. Each builder is called with a setting on and off: the value must
 * appear on and only on the "on" call, so a builder that stopped reading its
 * attribute fails here (the wiring gate proves the read exists; this proves it
 * paints).
 */
import { buildWrapperStyle } from '../../src/blocks/notice-banner/preview-style';
import { buildTabPreview } from '../../src/blocks/tab/preview-style';
import { wrapperBorderPreview } from '../../src/utils/wrapper-border-preview';
import { captionPreviewStyle } from '../../src/blocks/gallery/preview-style';
import { postGridWrapperPreview, cardGradientPreview } from '../../src/blocks/post-grid/preview-style';
import { applyCtaWrapperPreview } from '../../src/blocks/cta-section/preview-style';
import { tierBackgroundImageUrl } from '../../src/utils/background-preview';
import { chromeRowStyle, chromeSlotStyle, shellBorderStyle, closeBorderStyle } from '../../src/blocks/nav-drawer/chrome-preview-style';
import { tierLengthPreview } from '../../src/utils/cssLength';
import { panelElementStyles, panelRootStyle, triggerStyles, scrimPreviewStyle } from '../../src/blocks/cart/panel-preview-style';

const GRADIENT = 'linear-gradient(90deg, #111111, #eeeeee)';
const BOX = { top: '2px', right: '2px', bottom: '2px', left: '2px' };
const PALETTE = [ { slug: 'brand', color: '#112233' } ];

describe( 'notice-banner wrapper preview', () => {
	it( 'paints fill, text, border, radius and typography, and nothing when unset', () => {
		const on = buildWrapperStyle(
			{
				backgroundColourGradient: GRADIENT,
				textColour: 'brand',
				borderWidth: BOX,
				borderStyle: 'solid',
				borderColour: 'brand',
				borderRadius: { desktop: { topLeft: '4px', topRight: '4px', bottomRight: '4px', bottomLeft: '4px' } },
				fontWeight: '700',
			},
			'desktop',
			PALETTE,
			false
		);
		expect( on.backgroundImage ).toBe( GRADIENT );
		expect( on.color ).toBe( '#112233' );
		expect( on.borderWidth ).toBe( '2px 2px 2px 2px' );
		expect( on.borderColor ).toBe( '#112233' );
		expect( [ on.borderTopLeftRadius, on.borderTopRightRadius, on.borderBottomRightRadius, on.borderBottomLeftRadius ] ).toEqual( [ '4px', '4px', '4px', '4px' ] );
		expect( on.fontWeight ).toBe( '700' );
		expect( buildWrapperStyle( {}, 'desktop', PALETTE, false ) ).toEqual( {} );
	} );
	it( 'follows the previewed tier for padding, set sides only (CR6)', () => {
		const attributes = { padding: { desktop: BOX, tablet: { top: '9px' } } };
		const tablet = buildWrapperStyle( attributes, 'tablet', PALETTE, false );
		expect( tablet ).toMatchObject( { paddingTop: '9px', paddingRight: '2px', paddingBottom: '2px', paddingLeft: '2px' } );
		expect( tablet.padding ).toBeUndefined();
		expect( buildWrapperStyle( attributes, 'desktop', PALETTE, false ) ).toMatchObject( { paddingTop: '2px', paddingRight: '2px', paddingBottom: '2px', paddingLeft: '2px' } );
	} );

	it( 'leaves a side set at no tier to the stylesheet, never 0 (CR6)', () => {
		const style = buildWrapperStyle( { padding: { tablet: { top: '9px' } } }, 'tablet', PALETTE, false );
		expect( style.paddingTop ).toBe( '9px' );
		expect( style.paddingLeft ).toBeUndefined();
	} );
} );

describe( 'tab preview', () => {
	it( 'paints the border and the narrower-tier width cap', () => {
		const attributes = {
			borderWidth: BOX,
			borderStyle: 'dashed',
			maxWidth: { desktop: '800px', tablet: '600px' },
		};
		expect( buildTabPreview( attributes, 'tablet', PALETTE ).wrapperStyle.maxWidth ).toBe( '600px' );
		expect( buildTabPreview( attributes, 'desktop', PALETTE ).wrapperStyle.borderStyle ).toBe( 'dashed' );
		expect( buildTabPreview( {}, 'desktop', PALETTE ).wrapperStyle ).toEqual( {} );
	} );
} );

describe( 'gallery preview', () => {
	it( 'paints the wrapper border and the caption fill and text gradients', () => {
		expect( wrapperBorderPreview( { borderWidth: BOX, borderStyle: 'solid', borderColour: 'brand' }, 'desktop', PALETTE ).borderColor ).toBe( '#112233' );
		expect( wrapperBorderPreview( {}, 'desktop', PALETTE ) ).toEqual( {} );
		const caption = captionPreviewStyle( { captionColourGradient: GRADIENT, captionBgColourGradient: GRADIENT }, PALETTE );
		expect( caption.backgroundImage ).toBe( GRADIENT );
		expect( caption[ '--sgs-gallery-caption-fill' ] ).toBe( GRADIENT );
		expect( captionPreviewStyle( {}, PALETTE ) ).toEqual( {} );
	} );
} );

describe( 'post-grid preview', () => {
	it( 'caps the root width and band, and writes the card gradient property', () => {
		const { rootStyle, bandStyle, hasBandProps } = postGridWrapperPreview(
			{ maxWidth: { desktop: '900px' }, contentWidth: { desktop: '700px' } },
			'desktop',
			PALETTE
		);
		expect( rootStyle.maxWidth ).toBe( '900px' );
		expect( hasBandProps ).toBe( true );
		expect( bandStyle.maxWidth ).toBe( '700px' );
		expect( cardGradientPreview( GRADIENT ) ).toEqual( { '--sgs-card-bg-gradient': GRADIENT } );
		expect( cardGradientPreview( 'not a gradient' ) ).toEqual( {} );
	} );
} );

describe( 'cta-section preview', () => {
	it( 'paints text, spacing, size, gap and the band at the previewed tier', () => {
		const style = {};
		const { bandStyle, hasBandProps } = applyCtaWrapperPreview(
			{
				textColour: 'brand',
				padding: { desktop: BOX },
				minHeight: { desktop: 300, tablet: '200px' },
				gap: { desktop: '10px' },
				contentWidth: { desktop: '700px' },
			},
			'tablet',
			PALETTE,
			style
		);
		expect( style.color ).toBe( '#112233' );
		expect( [ style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft ] ).toEqual( [ '2px', '2px', '2px', '2px' ] );
		expect( style.minHeight ).toBe( '200px' );
		expect( style.gap ).toBe( '10px' );
		expect( hasBandProps ).toBe( true );
		expect( bandStyle.maxWidth ).toBe( '700px' );
		expect( applyCtaWrapperPreview( {}, 'desktop', PALETTE, {} ).hasBandProps ).toBe( false );
	} );
	it( 'swaps in the tablet and mobile background images as the wrapper does', () => {
		const attributes = { backgroundImageTablet: { url: 't.jpg' }, backgroundImageMobile: { url: 'm.jpg' } };
		expect( tierBackgroundImageUrl( null, attributes.backgroundImageTablet, attributes.backgroundImageMobile, 'desktop' ) ).toBe( '' );
		expect( tierBackgroundImageUrl( null, attributes.backgroundImageTablet, attributes.backgroundImageMobile, 'tablet' ) ).toBe( 't.jpg' );
		expect( tierBackgroundImageUrl( null, attributes.backgroundImageTablet, attributes.backgroundImageMobile, 'mobile' ) ).toBe( 'm.jpg' );
		expect( tierBackgroundImageUrl( null, { url: 't.jpg' }, undefined, 'mobile' ) ).toBe( 't.jpg' );
	} );
} );

describe( 'nav-drawer chrome preview', () => {
	it( 'paints the row, the slot, the shell border and the close box', () => {
		const row = chromeRowStyle( { chromeRowHeight: { desktop: 64 }, chromeRowGap: { desktop: '8px' }, chromeRowBg: 'brand' }, 'desktop', PALETTE );
		expect( row ).toMatchObject( { minHeight: '64px', gap: '8px', backgroundColor: '#112233' } );
		expect( chromeRowStyle( {}, 'desktop', PALETTE ) ).toEqual( {} );
		expect( chromeSlotStyle( { chromeSlotType: 'label', chromeSlotColour: 'brand' }, 'desktop', PALETTE ).color ).toBe( '#112233' );
		const button = chromeSlotStyle( { chromeSlotType: 'button', chromeButtonColourBackground: 'brand', chromeButtonBorderWidth: BOX }, 'desktop', PALETTE );
		expect( button.backgroundColor ).toBe( '#112233' );
		expect( button.borderWidth ).toBe( '2px 2px 2px 2px' );
		expect( shellBorderStyle( { borderWidth: BOX, borderStyle: 'solid' }, 'desktop', PALETTE ).borderStyle ).toBe( 'solid' );
		expect( closeBorderStyle( { closeBorderWidth: BOX, closeBorderColour: 'brand' }, PALETTE ).borderColor ).toBe( '#112233' );
		expect( tierLengthPreview( { desktop: '20px', tablet: '10px' }, 'mobile' ) ).toBe( '10px' );
	} );
} );

describe( 'cart panel preview', () => {
	it( 'paints each panel element from its own settings', () => {
		const s = panelElementStyles(
			{
				panelTitleFontSize: { desktop: 22 },
				checkoutBg: 'brand',
				itemThumbRadius: '6px',
				panelHeadPadding: { desktop: BOX },
				panelBodyGap: { desktop: '14px' },
			},
			'desktop',
			PALETTE
		);
		expect( s.heading.fontSize ).toBe( '22px' );
		expect( s.checkout.backgroundColor ).toBe( '#112233' );
		expect( s.thumb.borderRadius ).toBe( '6px' );
		// Set sides only, as the per-side emitter prints them (CR6): four longhand keys, no shorthand.
		expect( s.header ).toMatchObject( { paddingTop: '2px', paddingRight: '2px', paddingBottom: '2px', paddingLeft: '2px' } );
		expect( s.header.padding ).toBeUndefined();
		expect( s.items.gap ).toBe( '14px' );
		expect( panelElementStyles( {}, 'desktop', PALETTE ).checkout ).toEqual( {} );
	} );
	it( 'writes the panel fill, the badge and pill fills and the scrim', () => {
		expect( panelRootStyle( { panelBgGradient: GRADIENT }, 'desktop', PALETTE )[ '--sgs-cart-editor-panel-fill' ] ).toBe( GRADIENT );
		expect( panelRootStyle( {}, 'desktop', PALETTE ) ).toEqual( {} );
		expect( triggerStyles( { badgeColourGradient: GRADIENT }, 'desktop', PALETTE, false ).badge[ '--sgs-cart-editor-badge-fill' ] ).toBe( GRADIENT );
		expect( triggerStyles( { pillBgColourGradient: GRADIENT }, 'desktop', PALETTE, true ).trigger[ '--sgs-cart-editor-pill-fill' ] ).toBe( GRADIENT );
		expect( triggerStyles( { pillBgColourGradient: GRADIENT }, 'desktop', PALETTE, false ).trigger ).toEqual( {} );
		const scrim = scrimPreviewStyle( { scrimColour: 'brand', scrimOpacity: { desktop: 0.4 }, scrimBlur: { desktop: '6px' } }, 'desktop', PALETTE );
		expect( scrim ).toEqual( { '--sgs-scrim-fill': '#112233', '--sgs-scrim-opacity': 0.4, '--sgs-scrim-blur': '6px' } );
	} );
} );

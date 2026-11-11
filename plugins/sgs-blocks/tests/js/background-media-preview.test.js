/**
 * Spec 49 §7.8, §9.7: the editor mirror of an adopted block background prints the layer data the wrapper prints for
 * the same attributes: a photo, a tile or Pinned photo as a CSS background, a video, an SVG, the overlay, and the
 * root classes.
 */
import { backgroundMediaAt, backgroundMediaPreview, backgroundOverlayAt, valueAt } from '../../src/utils/background-media-preview.js';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>';
const photo = ( extra = {} ) => ( {
	backgroundSource: { desktop: { kind: 'image', url: 'https://example.test/d.jpg' }, mobile: { kind: 'image', url: 'https://example.test/m.jpg' } },
	...extra,
} );

describe( 'valueAt', () => {
	it( 'inherits from the next wider device and reads a plain value as desktop', () => {
		expect( valueAt( { desktop: 'a' }, 'mobile' ) ).toBe( 'a' );
		expect( valueAt( { desktop: 'a', tablet: 'b' }, 'mobile' ) ).toBe( 'b' );
		expect( valueAt( 'tile', 'tablet' ) ).toBe( 'tile' );
		expect( valueAt( undefined, 'desktop' ) ).toBeUndefined();
	} );
} );

describe( 'backgroundMediaAt', () => {
	it( 'shows each device photo as an image with its Fit and Focal', () => {
		const attrs = photo( { backgroundFit: { desktop: 'contain' }, backgroundFocal: { desktop: { x: 0.25, y: 0.5 } } } );
		expect( backgroundMediaAt( attrs, 'desktop' ) ).toEqual( { type: 'image', url: 'https://example.test/d.jpg', fit: 'contain', focal: '25% 50%' } );
		expect( backgroundMediaAt( attrs, 'mobile' ).url ).toBe( 'https://example.test/m.jpg' );
	} );

	it( 'paints Tile as a CSS background with Repeat and Tile size', () => {
		const attrs = photo( { backgroundFit: { desktop: 'tile' }, backgroundRepeat: { desktop: 'repeat-x' }, backgroundTileSize: { desktop: '120px' } } );
		expect( backgroundMediaAt( attrs, 'desktop' ) ).toMatchObject( { type: 'tile', repeat: 'repeat-x', size: '120px', pinned: false } );
	} );

	it( 'paints Pinned as a CSS background that keeps its Fit', () => {
		const attrs = photo( { backgroundPinned: true, backgroundFit: { desktop: 'cover' } } );
		expect( backgroundMediaAt( attrs, 'desktop' ) ).toMatchObject( { type: 'tile', pinned: true, size: 'cover', repeat: 'no-repeat' } );
	} );

	it( 'shows a video cover image, an SVG, a missing file, and nothing for kind none', () => {
		expect( backgroundMediaAt( { backgroundSource: { desktop: { kind: 'video', url: 'v.mp4', poster: { url: 'p.jpg' } } } }, 'desktop' ) ).toMatchObject( { type: 'video', poster: 'p.jpg' } );
		expect( backgroundMediaAt( { backgroundSource: { desktop: { kind: 'svg', markup: SVG } } }, 'desktop' ).type ).toBe( 'svg' );
		expect( backgroundMediaAt( { backgroundSource: { desktop: { kind: 'image', id: 7 } } }, 'desktop' ) ).toEqual( { type: 'missing', kind: 'image' } );
		expect( backgroundMediaAt( { backgroundSource: { desktop: { kind: 'image', url: 'a.jpg' }, mobile: { kind: 'none' } } }, 'mobile' ) ).toBeNull();
		expect( backgroundMediaAt( {}, 'desktop' ) ).toBeNull();
	} );
} );

describe( 'backgroundOverlayAt', () => {
	it( 'is null with no colour or gradient', () => {
		expect( backgroundOverlayAt( { backgroundOverlayOpacity: { desktop: 40 } }, 'desktop', [] ) ).toBeNull();
	} );

	it( 'paints a gradient over the colour, with the strength at the device and the blend', () => {
		const attrs = {
			backgroundOverlayColour: '#000000',
			backgroundOverlayGradient: 'linear-gradient(red, blue)',
			backgroundOverlayOpacity: { desktop: 40, mobile: 70 },
			backgroundOverlayBlend: 'multiply',
		};
		expect( backgroundOverlayAt( attrs, 'desktop', [] ) ).toEqual( { backgroundImage: 'linear-gradient(red, blue)', opacity: 0.4, mixBlendMode: 'multiply' } );
		expect( backgroundOverlayAt( attrs, 'mobile', [] ).opacity ).toBe( 0.7 );
	} );
} );

describe( 'backgroundMediaPreview', () => {
	it( 'returns the root classes the wrapper prints', () => {
		expect( backgroundMediaPreview( photo(), [], [], 'desktop' ).className ).toContain( 'sgs-container--has-bg-image' );
		const video = { backgroundSource: { desktop: { kind: 'video', url: 'v.mp4' } } };
		expect( backgroundMediaPreview( video, [], [], 'desktop' ).className ).toContain( 'sgs-container--has-bg-video' );
		const svg = { backgroundSource: { desktop: { kind: 'svg', markup: SVG } }, backgroundSvgLayer: 'front', backgroundSvgTextShadow: true };
		const className = backgroundMediaPreview( svg, [], [], 'desktop' ).className;
		expect( className ).toContain( 'sgs-container--has-bg-svg' );
		expect( className ).toContain( 'sgs-container--bg-front' );
		expect( className ).toContain( 'sgs-container--svg-text-shadow' );
	} );

	it( 'carries Photo opacity and says whether there is anything to draw', () => {
		const out = backgroundMediaPreview( photo( { backgroundOpacity: { desktop: 60 } } ), [], [], 'desktop' );
		expect( out.media.opacity ).toBe( 0.6 );
		expect( out.hasBgMedia ).toBe( true );
		expect( backgroundMediaPreview( {}, [], [], 'desktop' ) ).toMatchObject( { hasBgMedia: false, hasOverlay: false, media: null, overlay: null } );
	} );
} );

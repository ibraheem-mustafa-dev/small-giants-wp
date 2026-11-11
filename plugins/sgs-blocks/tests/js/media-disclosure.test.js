/**
 * Spec 49 §9.3: each atom's `disclosure( attrs, device, prefix, opts )`, per
 * kind and device, with the mask-shape and background omissions.
 */
import { disclosure as source } from '../../src/components/media/atoms/source.js';
import { disclosure as videoBehaviour } from '../../src/components/media/atoms/video-behaviour.js';
import { disclosure as meaning } from '../../src/components/media/atoms/meaning.js';
import { disclosure as svgPresentation } from '../../src/components/media/atoms/svg-presentation.js';
import { disclosure as objectFit } from '../../src/components/media/atoms/object-fit.js';
import { disclosure as focalPoint } from '../../src/components/media/atoms/focal-point.js';
import { disclosure as boxShape } from '../../src/components/media/atoms/box-shape.js';
import { disclosure as overlay } from '../../src/components/media/atoms/overlay.js';
import { disclosure as opacity } from '../../src/components/media/atoms/opacity.js';
import { disclosure as shadow } from '../../src/components/media/atoms/shadow.js';
import { disclosure as mediaPadding } from '../../src/components/media/atoms/media-padding.js';
import { disclosure as caption } from '../../src/components/media/atoms/caption.js';
import { disclosure as link } from '../../src/components/media/atoms/link.js';

const state = ( map, base ) => map[ base ].state;
const all = ( map ) => Object.values( map ).map( ( s ) => s.state );

describe( 'disclosure: earlier object call is unchanged', () => {
	it( 'still returns the single state for an atom called with an object', () => {
		expect( objectFit( { attributes: {} } ) ).toEqual( { state: 'shown', hiddenReason: null } );
		expect( overlay( { attributes: {} } ).state ).toBe( 'disabled' );
		expect( videoBehaviour( { attributes: { videoAutoplay: true } } ).VideoMuted.state ).toBe( 'disabled' );
	} );
} );

describe( 'source and media-type, per kind', () => {
	const only = ( kind ) => ( { kinds: [ kind ] } );
	it.each( [
		[ 'image', 'ImageUrl', 'shown' ],
		[ 'image', 'VideoUrl', 'omitted' ],
		[ 'video', 'VideoUrl', 'shown' ],
		[ 'video', 'Thumbnail', 'shown' ],
		[ 'embed', 'VideoUrl', 'shown' ],
		[ 'embed', 'Thumbnail', 'omitted' ],
		[ 'svg', 'SvgContent', 'shown' ],
		[ 'svg', 'ImageUrl', 'omitted' ],
	] )( 'a %s slot: %s is %s', ( kind, base, expected ) => {
		expect( state( source( {}, 'desktop', '', only( kind ) ), base ) ).toBe( expected );
	} );

	it( 'reads the kind per device: a video on mobile, a photo on desktop', () => {
		const attrs = { mediaType: 'image', mediaTypeMobile: 'video' };
		const opts = { kinds: [ 'image', 'video' ] };
		expect( state( source( attrs, 'desktop', '', opts ), 'ImageUrl' ) ).toBe( 'shown' );
		expect( state( source( attrs, 'mobile', '', opts ), 'ImageUrl' ) ).toBe( 'omitted' );
		expect( state( source( attrs, 'mobile', '', opts ), 'VideoUrl' ) ).toBe( 'shown' );
		expect( state( source( attrs, 'tablet', '', opts ), 'VideoUrl' ) ).toBe( 'omitted' );
	} );

	it( 'treats a YouTube source as an embed', () => {
		const attrs = { mediaType: 'video', videoSource: 'youtube' };
		expect( state( source( attrs, 'desktop', '', { kinds: [ 'video', 'embed' ] } ), 'Thumbnail' ) ).toBe( 'omitted' );
	} );
} );

describe( 'meaning', () => {
	it( 'omits Alt when Decorative, on image', () => {
		const opts = { kinds: [ 'image' ] };
		expect( state( meaning( {}, 'desktop', '', opts ), 'ImageAlt' ) ).toBe( 'shown' );
		expect( state( meaning( { imageDecorative: true }, 'desktop', '', opts ), 'ImageAlt' ) ).toBe( 'omitted' );
	} );
	it( 'offers Title, not Alt, on video and embed, and no Decorative on embed', () => {
		const video = meaning( {}, 'desktop', '', { kinds: [ 'video' ] } );
		expect( [ state( video, 'ImageAlt' ), state( video, 'VideoAlt' ), state( video, 'ImageDecorative' ) ] ).toEqual( [ 'omitted', 'shown', 'shown' ] );
		const embed = meaning( { imageDecorative: true }, 'desktop', '', { kinds: [ 'embed' ] } );
		expect( [ state( embed, 'VideoAlt' ), state( embed, 'ImageDecorative' ) ] ).toEqual( [ 'shown', 'omitted' ] );
	} );
	it( 'offers aria-label on an SVG', () => {
		expect( state( meaning( {}, 'desktop', '', { kinds: [ 'svg' ] } ), 'ImageAlt' ) ).toBe( 'shown' );
	} );
	it( 'omits Decorative when the photo has a link, but not on a background', () => {
		const attrs = { linkUrl: 'https://example.test' };
		expect( state( meaning( attrs, 'desktop', '', { kinds: [ 'image' ] } ), 'ImageDecorative' ) ).toBe( 'omitted' );
		expect( state( meaning( attrs, 'desktop', '', { kinds: [ 'image' ], context: 'background' } ), 'ImageDecorative' ) ).toBe( 'shown' );
	} );
} );

describe( 'video-behaviour', () => {
	it( 'is omitted for an image and on a background', () => {
		expect( new Set( all( videoBehaviour( {}, 'desktop', '', { kinds: [ 'image' ] } ) ) ) ).toEqual( new Set( [ 'omitted' ] ) );
		expect( new Set( all( videoBehaviour( {}, 'desktop', '', { kinds: [ 'video' ], context: 'background' } ) ) ) ).toEqual( new Set( [ 'omitted' ] ) );
	} );
	it( 'locks Muted and Inline on with Autoplay, per device', () => {
		const attrs = { videoAutoplayMobile: true };
		const opts = { kinds: [ 'video' ] };
		expect( state( videoBehaviour( attrs, 'desktop', '', opts ), 'VideoMuted' ) ).toBe( 'shown' );
		const mobile = videoBehaviour( attrs, 'mobile', '', opts );
		expect( [ state( mobile, 'VideoMuted' ), state( mobile, 'VideoPlaysInline' ) ] ).toEqual( [ 'disabled', 'disabled' ] );
		expect( mobile.VideoMuted.hiddenReason ).toBeTruthy();
	} );
	it( 'offers an embed autoplay, mute, loop and controls only', () => {
		const embed = videoBehaviour( {}, 'desktop', '', { kinds: [ 'embed' ] } );
		expect( state( embed, 'VideoLoop' ) ).toBe( 'shown' );
		expect( state( embed, 'VideoLazyLoad' ) ).toBe( 'omitted' );
		expect( state( embed, 'VideoCaptionsUrl' ) ).toBe( 'omitted' );
	} );
	it( 'offers a video file captions', () => {
		expect( state( videoBehaviour( {}, 'desktop', '', { kinds: [ 'video' ] } ), 'VideoCaptionsUrl' ) ).toBe( 'shown' );
	} );
} );

describe( 'svg-presentation', () => {
	it( 'shows only on an SVG, never the duplicate opacity or min height', () => {
		const svg = svgPresentation( {}, 'desktop', '', { kinds: [ 'svg' ] } );
		expect( [ state( svg, 'SvgPosition' ), state( svg, 'SvgOpacity' ), state( svg, 'SvgMinHeight' ) ] ).toEqual( [ 'shown', 'omitted', 'omitted' ] );
		expect( state( svgPresentation( {}, 'desktop', '', { kinds: [ 'image' ] } ), 'SvgPosition' ) ).toBe( 'omitted' );
	} );
	it( 'disables Animation speed until an animation is chosen', () => {
		const opts = { kinds: [ 'svg' ] };
		expect( state( svgPresentation( {}, 'desktop', '', opts ), 'SvgAnimationSpeed' ) ).toBe( 'disabled' );
		expect( state( svgPresentation( { svgAnimation: 'pulse' }, 'desktop', '', opts ), 'SvgAnimationSpeed' ) ).toBe( 'shown' );
	} );
} );

describe( 'object-fit and focal-point', () => {
	const image = { kinds: [ 'image' ] };
	it( 'puts a hint in place of Fit and Focal while the box does not crop', () => {
		const fit = objectFit( {}, 'desktop', '', image );
		expect( fit.ObjectFit.state ).toBe( 'disabled' );
		expect( fit.ObjectFit.hiddenReason ).toMatch( /Aspect ratio or a Height/ );
		expect( focalPoint( {}, 'desktop', '', image ).ObjectPosition.state ).toBe( 'disabled' );
	} );
	it( 'shows Fit and Focal once a ratio or height is set at that device', () => {
		const attrs = { aspectRatio: '16 / 9' };
		expect( state( objectFit( attrs, 'mobile', '', image ), 'ObjectFit' ) ).toBe( 'shown' );
		expect( state( focalPoint( attrs, 'mobile', '', image ), 'ObjectPosition' ) ).toBe( 'shown' );
		expect( state( focalPoint( { height: { tablet: '300px' } }, 'tablet', '', image ), 'ObjectPosition' ) ).toBe( 'shown' );
		expect( state( focalPoint( { height: { tablet: '300px' } }, 'desktop', '', image ), 'ObjectPosition' ) ).toBe( 'disabled' );
	} );
	it( 'disables Focal when Fit is fill', () => {
		const attrs = { aspectRatio: '1 / 1', objectFit: 'fill' };
		expect( focalPoint( attrs, 'desktop', '', image ).ObjectPosition.state ).toBe( 'disabled' );
	} );
	it( 'offers Fit to image, video and SVG; Focal to image and video; neither to an embed', () => {
		const attrs = { aspectRatio: '1 / 1' };
		const at = ( kind ) => ( { kinds: [ kind ] } );
		expect( [ 'image', 'video', 'svg', 'embed' ].map( ( k ) => state( objectFit( attrs, 'desktop', '', at( k ) ), 'ObjectFit' ) ) ).toEqual( [ 'shown', 'shown', 'shown', 'omitted' ] );
		expect( [ 'image', 'video', 'svg', 'embed' ].map( ( k ) => state( focalPoint( attrs, 'desktop', '', at( k ) ), 'ObjectPosition' ) ) ).toEqual( [ 'shown', 'shown', 'omitted', 'omitted' ] );
	} );
	it( 'on a background: Size, Position and Pinned show; Fit does not; Repeat needs Tile; Pinned needs no Parallax', () => {
		const bg = { kinds: [ 'image' ], context: 'background' };
		const fit = objectFit( {}, 'desktop', '', bg );
		expect( [ state( fit, 'ObjectFit' ), state( fit, 'Size' ) ] ).toEqual( [ 'omitted', 'shown' ] );
		const focal = focalPoint( {}, 'desktop', '', bg );
		expect( [ state( focal, 'ObjectPosition' ), state( focal, 'Position' ), state( focal, 'Repeat' ), state( focal, 'Attachment' ) ] ).toEqual( [ 'omitted', 'shown', 'omitted', 'shown' ] );
		expect( state( focalPoint( { size: 'tile' }, 'desktop', '', bg ), 'Repeat' ) ).toBe( 'shown' );
		expect( state( focalPoint( {}, 'desktop', '', { ...bg, parallax: true } ), 'Attachment' ) ).toBe( 'omitted' );
	} );
	it( 'offers no Size outside a background', () => {
		expect( state( objectFit( {}, 'desktop', '', image ), 'Size' ) ).toBe( 'omitted' );
	} );
} );

describe( 'box-shape', () => {
	const image = { kinds: [ 'image' ] };
	it( 'omits Aspect ratio when Height is Match its space', () => {
		expect( state( boxShape( { height: 'fill' }, 'desktop', '', image ), 'AspectRatio' ) ).toBe( 'omitted' );
		expect( state( boxShape( {}, 'desktop', '', image ), 'AspectRatio' ) ).toBe( 'shown' );
	} );
	it( 'shows Border style and colour only once a width is set', () => {
		expect( state( boxShape( {}, 'desktop', '', image ), 'BorderStyle' ) ).toBe( 'omitted' );
		const withWidth = boxShape( { borderWidth: { top: '2px' } }, 'desktop', '', image );
		expect( [ state( withWidth, 'BorderStyle' ), state( withWidth, 'BorderColour' ) ] ).toEqual( [ 'shown', 'shown' ] );
	} );
	it.each( [
		[ 'hexagon', 'omitted', 'omitted' ],
		[ 'circle', 'omitted', 'shown' ],
		[ 'ellipse', 'omitted', 'shown' ],
		[ 'pill', 'omitted', 'shown' ],
		[ 'none', 'shown', 'shown' ],
	] )( 'shape %s: Corners %s, Border width %s', ( shape, corners, border ) => {
		const map = boxShape( { shape, borderWidth: { top: '2px' } }, 'desktop', '', image );
		expect( state( map, 'BorderRadius' ) ).toBe( corners );
		expect( state( map, 'BorderWidth' ) ).toBe( border );
		expect( state( map, 'BorderColour' ) ).toBe( 'omitted' === border ? 'omitted' : 'shown' );
		expect( state( map, 'Shape' ) ).toBe( 'shown' );
	} );
	it( 'reads Shape per device: none at a device clears it', () => {
		const attrs = { shape: { desktop: 'hexagon', mobile: 'none' } };
		expect( state( boxShape( attrs, 'desktop', '', image ), 'BorderRadius' ) ).toBe( 'omitted' );
		expect( state( boxShape( attrs, 'mobile', '', image ), 'BorderRadius' ) ).toBe( 'shown' );
	} );
	it( 'offers every kind Width, Height and the limits, and omits it all on a background', () => {
		[ 'image', 'video', 'embed', 'svg' ].forEach( ( kind ) => {
			const map = boxShape( {}, 'desktop', '', { kinds: [ kind ] } );
			[ 'Width', 'Height', 'MinHeight', 'MaxHeight', 'MaxWidth', 'Shape' ].forEach( ( base ) => expect( state( map, base ) ).toBe( 'shown' ) );
		} );
		expect( new Set( all( boxShape( {}, 'desktop', '', { kinds: [ 'image' ], context: 'background' } ) ) ) ).toEqual( new Set( [ 'omitted' ] ) );
	} );
	it( 'never offers the old sizing mode toggle', () => {
		expect( state( boxShape( {}, 'desktop', '', image ), 'MediaSizing' ) ).toBe( 'omitted' );
	} );
} );

describe( 'overlay, opacity, shadow, padding', () => {
	it( 'enables strength and blend once a colour or gradient is set', () => {
		const off = overlay( {}, 'desktop', '', {} );
		expect( [ state( off, 'OverlayOpacity' ), state( off, 'OverlayBlendMode' ), state( off, 'OverlayColour' ) ] ).toEqual( [ 'disabled', 'disabled', 'shown' ] );
		expect( off.OverlayOpacity.hiddenReason ).toBeTruthy();
		expect( state( overlay( { overlayGradient: 'linear-gradient(red, blue)' }, 'desktop', '', {} ), 'OverlayOpacity' ) ).toBe( 'shown' );
		expect( state( overlay( { overlayColour: 'black' }, 'desktop', '', {} ), 'OverlayBlendMode' ) ).toBe( 'shown' );
	} );
	it( 'offers Photo opacity to image, video and SVG but not an embed', () => {
		const states = [ 'image', 'video', 'svg', 'embed' ].map( ( k ) => state( opacity( {}, 'desktop', '', { kinds: [ k ] } ), 'Opacity' ) );
		expect( states ).toEqual( [ 'shown', 'shown', 'shown', 'omitted' ] );
	} );
	it( 'drops spread, inset and raw CSS from Shadow under a mask, not under a radius shape', () => {
		const mask = shadow( { shape: 'hexagon' }, 'desktop', '', { kinds: [ 'image' ] } );
		expect( mask.BoxShadow.hide ).toEqual( [ 'spread', 'inset', 'raw' ] );
		expect( mask.BoxShadow.note ).toBe( 'Shadows follow the shape' );
		expect( shadow( { shape: 'circle' }, 'desktop', '', { kinds: [ 'image' ] } ).BoxShadow.hide ).toBeUndefined();
	} );
	it( 'omits Shadow on a background and Padding on a background or an embed', () => {
		expect( state( shadow( {}, 'desktop', '', { kinds: [ 'image' ], context: 'background' } ), 'BoxShadow' ) ).toBe( 'omitted' );
		expect( state( mediaPadding( {}, 'desktop', '', { kinds: [ 'embed' ] } ), 'Padding' ) ).toBe( 'omitted' );
		expect( state( mediaPadding( {}, 'desktop', '', { kinds: [ 'image' ], context: 'background' } ), 'Padding' ) ).toBe( 'omitted' );
		expect( state( mediaPadding( {}, 'desktop', '', { kinds: [ 'video' ] } ), 'Padding' ) ).toBe( 'shown' );
	} );
} );

describe( 'caption and link', () => {
	it( 'shows Caption to image and video, the tag only once there is caption text', () => {
		const none = caption( {}, 'desktop', '', { kinds: [ 'image' ] } );
		expect( [ state( none, 'Caption' ), state( none, 'CaptionTag' ) ] ).toEqual( [ 'shown', 'omitted' ] );
		expect( state( caption( { caption: 'Hello' }, 'desktop', '', { kinds: [ 'video' ] } ), 'CaptionTag' ) ).toBe( 'shown' );
		expect( state( caption( { caption: 'Hello' }, 'desktop', '', { kinds: [ 'svg' ] } ), 'Caption' ) ).toBe( 'omitted' );
	} );
	it( 'shows Link to image only, never on a background', () => {
		expect( state( link( {}, 'desktop', '', { kinds: [ 'image' ] } ), 'LinkUrl' ) ).toBe( 'shown' );
		expect( state( link( {}, 'desktop', '', { kinds: [ 'video' ] } ), 'LinkUrl' ) ).toBe( 'omitted' );
		expect( state( link( {}, 'desktop', '', { kinds: [ 'image' ], context: 'background' } ), 'LinkUrl' ) ).toBe( 'omitted' );
	} );
} );

describe( 'closed vocabulary', () => {
	it( 'every state is shown, disabled or omitted, with a reason whenever disabled', () => {
		const fns = [ source, videoBehaviour, meaning, svgPresentation, objectFit, focalPoint, boxShape, overlay, opacity, shadow, mediaPadding, caption, link ];
		[ 'image', 'video', 'embed', 'svg' ].forEach( ( kind ) => {
			[ 'desktop', 'tablet', 'mobile' ].forEach( ( device ) => {
				fns.forEach( ( fn ) => {
					Object.values( fn( {}, device, '', { kinds: [ kind ] } ) ).forEach( ( s ) => {
						expect( [ 'shown', 'disabled', 'omitted' ] ).toContain( s.state );
						if ( 'disabled' === s.state ) {
							expect( s.hiddenReason ).toBeTruthy();
						}
					} );
				} );
			} );
		} );
	} );
} );

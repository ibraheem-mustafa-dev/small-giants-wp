/**
 * The editor-canvas mirror of an adopted block's background (Spec 49 §7.8, §9.7).
 *
 * `SGS_Container_Wrapper` prints, for a block that declares `backgroundSource`, a `.sgs-bg-media` element (a picture,
 * a tile layer, a video with its cover, or an inline SVG) and a `.sgs-bg-overlay` span. This module works out the same
 * two nodes for the editor at the previewed device, so the canvas shows what the page prints, painted by the same
 * stylesheet (`assets/css/media-bg.css`). `BackgroundLayers.js` draws them.
 *
 * Pure apart from the shared colour helpers: no JSX.
 *
 * @package SGS\Blocks
 */
import { sanitiseSvg } from './sanitise-svg';
import { backgroundPaintPreview, overlayPaintPreview } from './background-preview';
import { surfaceBackdropPreview, wrapperToneClass } from './surface-preview';

const DEVICES = [ 'desktop', 'tablet', 'mobile' ];
const CASCADE = { desktop: [ 'desktop' ], tablet: [ 'tablet', 'desktop' ], mobile: [ 'mobile', 'tablet', 'desktop' ] };
const FITS = [ 'cover', 'contain', 'fill', 'none', 'scale-down' ];
const REPEATS = [ 'repeat', 'repeat-x', 'repeat-y', 'no-repeat' ];

const isEmpty = ( v ) => undefined === v || null === v || '' === v || 'inherit' === v;

/**
 * A per-device value at a device: its own, else the nearest wider device's. A plain value is the desktop value.
 *
 * @param {*}      raw    Stored value (`{desktop,tablet,mobile}` or plain).
 * @param {string} device Device.
 * @return {*} The value, or undefined.
 */
export function valueAt( raw, device = 'desktop' ) {
	const tiered = raw && 'object' === typeof raw && ! Array.isArray( raw ) && DEVICES.some( ( d ) => d in raw );
	if ( ! tiered ) {
		return isEmpty( raw ) ? undefined : raw;
	}
	const hit = ( CASCADE[ device ] || CASCADE.desktop ).find( ( d ) => ! isEmpty( raw[ d ] ) );
	return undefined === hit ? undefined : raw[ hit ];
}

/**
 * A Focal `{x,y}` (0 to 1) as `object-position` or `background-position` text.
 *
 * @param {Object|undefined} focal The point.
 * @return {string} The text, or '' when unset.
 */
function focalText( focal ) {
	if ( ! focal || ! Number.isFinite( Number( focal.x ) ) || ! Number.isFinite( Number( focal.y ) ) ) {
		return '';
	}
	const pct = ( n ) => `${ Math.round( Math.max( 0, Math.min( 1, Number( n ) ) ) * 10000 ) / 100 }%`;
	return `${ pct( focal.x ) } ${ pct( focal.y ) }`;
}

/**
 * What the background media layer holds at a device.
 *
 * @param {Object} attrs  Block attributes.
 * @param {string} device Previewed device.
 * @return {Object|null} `{ type, ... }` with type `image`, `tile`, `video`, `svg` or `missing`; null for no source.
 */
export function backgroundMediaAt( attrs, device = 'desktop' ) {
	const source = valueAt( attrs?.backgroundSource, device );
	if ( ! source || 'object' !== typeof source || 'none' === source.kind ) {
		return null;
	}
	const kind = source.kind || ( source.markup ? 'svg' : 'image' );
	const fit = valueAt( attrs.backgroundFit, device );
	const focal = focalText( valueAt( attrs.backgroundFocal, device ) );
	const pinned = true === attrs.backgroundPinned;
	if ( 'svg' === kind ) {
		const markup = source.markup ? sanitiseSvg( String( source.markup ) ) : '';
		return markup ? { type: 'svg', markup, fit: 'contain' === fit ? 'contain' : 'cover' } : null;
	}
	if ( ! source.url ) {
		return source.id ? { type: 'missing', kind } : null;
	}
	if ( 'video' === kind ) {
		return { type: 'video', url: source.url, poster: source.poster?.url || '', fit: FITS.includes( fit ) ? fit : 'cover', focal };
	}
	if ( 'tile' === fit || pinned ) {
		const repeat = valueAt( attrs.backgroundRepeat, device );
		const size = 'tile' === fit ? valueAt( attrs.backgroundTileSize, device ) : undefined;
		let bgSize = 'cover';
		if ( 'tile' === fit ) {
			bgSize = isEmpty( size ) ? 'auto' : String( size );
		} else if ( 'contain' === fit ) {
			bgSize = 'contain';
		} else if ( 'none' === fit ) {
			bgSize = 'auto';
		}
		return {
			type: 'tile',
			url: source.url,
			pinned,
			repeat: 'tile' === fit ? ( REPEATS.includes( repeat ) ? repeat : 'repeat' ) : 'no-repeat',
			size: bgSize,
			position: focal,
		};
	}
	return { type: 'image', url: source.url, fit: FITS.includes( fit ) ? fit : 'cover', focal };
}

/**
 * The overlay's paint at the editor: a gradient wins over the colour, then strength at the device and blend.
 *
 * @param {Object} attrs   Block attributes.
 * @param {string} device  Previewed device.
 * @param {Array}  palette Theme colour palette.
 * @return {Object|null} A style object, or null with nothing to paint.
 */
export function backgroundOverlayAt( attrs, device, palette ) {
	const opacity = valueAt( attrs?.backgroundOverlayOpacity, device );
	const { hasOverlay, vars } = overlayPaintPreview(
		attrs?.backgroundOverlayColour,
		attrs?.backgroundOverlayGradient,
		opacity,
		attrs?.backgroundOverlayBlend,
		palette
	);
	if ( ! hasOverlay ) {
		return null;
	}
	const paint = backgroundPaintPreview( attrs.backgroundOverlayColour, attrs.backgroundOverlayGradient, palette );
	return {
		...paint,
		...( undefined !== vars[ '--sgs-ed-overlay-opacity' ] && { opacity: vars[ '--sgs-ed-overlay-opacity' ] } ),
		...( vars[ '--sgs-ed-overlay-blend' ] && { mixBlendMode: vars[ '--sgs-ed-overlay-blend' ] } ),
	};
}

/**
 * The editor preview of an adopted block's background, in the shape `backgroundPreview()` returns plus the layer data.
 *
 * `className` carries the root modifier classes the wrapper prints (`sgs-container--has-bg-image`, `--has-bg-video`,
 * `--has-bg-svg`, `--bg-front`) and the surface-tone class; `style` carries the surface blur and saturate.
 *
 * @param {Object} attrs           Block attributes.
 * @param {Array}  colourPalette   Theme colour palette.
 * @param {Array}  gradientPresets Theme gradient presets.
 * @param {string} tier            Previewed device.
 * @return {{style:Object,className:string,media:(Object|null),overlay:(Object|null),hasBgMedia:boolean,hasOverlay:boolean}} The preview.
 */
export function backgroundMediaPreview( attrs, colourPalette, gradientPresets = [], tier = 'desktop' ) {
	const media = backgroundMediaAt( attrs, tier );
	const overlay = backgroundOverlayAt( attrs, tier, colourPalette );
	const opacity = valueAt( attrs?.backgroundOpacity, tier );
	let rootClass = '';
	if ( media ) {
		rootClass = 'video' === media.type ? 'sgs-container--has-bg-video' : 'svg' === media.type ? 'sgs-container--has-bg-svg' : 'sgs-container--has-bg-image';
	}
	const classes = [
		rootClass,
		media && 'svg' === media.type && 'front' === attrs?.backgroundSvgLayer && 'sgs-container--bg-front',
		media && 'svg' === media.type && attrs?.backgroundSvgTextShadow && 'sgs-container--svg-text-shadow',
		wrapperToneClass( attrs, colourPalette, gradientPresets ),
	];
	const strength = Number.isFinite( Number( opacity ) ) && ! isEmpty( opacity ) ? Math.max( 0, Math.min( 100, Number( opacity ) ) ) / 100 : undefined;
	return {
		style: { ...surfaceBackdropPreview( attrs ) },
		className: classes.filter( Boolean ).join( ' ' ),
		media: media ? { ...media, opacity: strength } : null,
		overlay,
		hasBgMedia: !! media,
		hasOverlay: !! overlay,
	};
}

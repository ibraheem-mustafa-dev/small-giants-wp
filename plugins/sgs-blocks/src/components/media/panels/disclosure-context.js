/**
 * Shared reading for the media atoms' `disclosure( attrs, device, prefix, opts )`
 * rules (Spec 49 §9.3, C4).
 *
 * Pure: importable by plain Node, no JSX, no `@wordpress/*`. Each atom builds
 * its per-base state map through `rulesFor()`; the panels read the same map.
 *
 * A state is `{ state, hiddenReason }` with `state` one of the closed
 * vocabulary `shown | disabled | omitted`. A rule returns `undefined` for
 * "shown".
 *
 * Values are read at the active device through the cascade mobile, tablet,
 * desktop, from either storage shape in use: a `{desktop,tablet,mobile}` object
 * under the base key, or a flat key with `Tablet` / `Mobile` siblings.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { MEDIA_BASES, mediaStoredAttrName } from '../../MediaElementControls.js';

export const DEVICES = [ 'desktop', 'tablet', 'mobile' ];

const CASCADE = {
	desktop: [ 'desktop' ],
	tablet: [ 'tablet', 'desktop' ],
	mobile: [ 'mobile', 'tablet', 'desktop' ],
};

const EMBED_SOURCES = /^(youtube|vimeo|embed|oembed)$/i;
const RADIUS_SHAPES = [ 'circle', 'ellipse', 'pill' ];
const NO_SHAPE = [ '', 'none' ];
const NOT_A_BOX = [ '', 'natural', 'auto', 'original' ];

/** Closed-vocabulary state builders. */
export const shown = () => ( { state: 'shown', hiddenReason: null } );
export const disabled = ( hiddenReason ) => ( { state: 'disabled', hiddenReason } );
export const omitted = ( hiddenReason = null ) => ( { state: 'omitted', hiddenReason } );

/** What a disabled control tells the person, shared by the atoms' rules. */
export const REASONS = {
	noCrop: __(
		'To choose which part of the photo shows, first give it a shape: pick an Aspect ratio or a Height.',
		'sgs-blocks'
	),
	focalFill: __( 'A stretched photo has no part to choose.', 'sgs-blocks' ),
	autoplayLock: __(
		'Locked on while Autoplay is on: a browser refuses to autoplay an unmuted video, and iOS needs "plays inline" or the video takes over the screen.',
		'sgs-blocks'
	),
	overlayPaint: __(
		'Overlay strength and blend only apply once an overlay colour or gradient is set.',
		'sgs-blocks'
	),
	svgSpeed: __( 'Animation speed only applies once an animation is chosen.', 'sgs-blocks' ),
	corners: __( 'Corners are not used while a shape is chosen.', 'sgs-blocks' ),
	borders: __(
		'Borders are not available on this shape. Choose Circle, Ellipse or Pill to keep a border.',
		'sgs-blocks'
	),
	shadowFollowsShape: __( 'Shadows follow the shape', 'sgs-blocks' ),
};

/**
 * Whether a `disclosure()` call uses the earlier object form
 * (`disclosure( { attributes, prefix, blockSlug } )`) that the atoms' own
 * controls still make. The new form always passes the device as a string.
 *
 * @param {*} first  First argument.
 * @param {*} device Second argument.
 * @return {boolean} True for the earlier form.
 */
export function isLegacyCall( first, device ) {
	return 'string' !== typeof device;
}

/**
 * @param {*} raw Stored value.
 * @return {boolean} True when `raw` is a `{desktop,tablet,mobile}` object.
 */
export function isTierObject( raw ) {
	return (
		!! raw &&
		'object' === typeof raw &&
		! Array.isArray( raw ) &&
		DEVICES.some( ( d ) => d in raw )
	);
}

/**
 * @param {*} value A stored value.
 * @return {boolean} True unless undefined, null, an empty string or an empty object.
 */
export function isSet( value ) {
	if ( undefined === value || null === value || '' === value ) {
		return false;
	}
	if ( 'object' === typeof value && ! Array.isArray( value ) ) {
		return Object.keys( value ).length > 0;
	}
	return true;
}

const cap = ( device ) => device.charAt( 0 ).toUpperCase() + device.slice( 1 );

/**
 * The attribute key that holds one device's own value of a flat base.
 *
 * @param {string} key    The base's desktop key.
 * @param {string} device 'desktop' | 'tablet' | 'mobile'.
 * @return {string} The key.
 */
export function deviceKey( key, device ) {
	return 'desktop' === device ? key : key + cap( device );
}

/**
 * The value a device stores itself, with no cascade.
 *
 * @param {Object} attrs  Block attributes.
 * @param {string} key    The base's desktop key.
 * @param {string} device Device.
 * @return {*} The own value, or undefined.
 */
export function ownAt( attrs, key, device ) {
	const raw = attrs ? attrs[ key ] : undefined;
	if ( isTierObject( raw ) ) {
		return raw[ device ];
	}
	return 'desktop' === device ? raw : attrs?.[ deviceKey( key, device ) ];
}

/**
 * The value in force at a device: its own, else the nearest wider device's.
 *
 * @param {Object} attrs  Block attributes.
 * @param {string} key    The base's desktop key.
 * @param {string} device Device.
 * @return {*} The resolved value, or undefined.
 */
export function readAt( attrs, key, device ) {
	for ( const d of CASCADE[ device ] || CASCADE.desktop ) {
		const own = ownAt( attrs, key, d );
		if ( isSet( own ) ) {
			return own;
		}
	}
	return undefined;
}

/**
 * The `setAttributes` patch that writes (or, with undefined, clears) one
 * device's own value. A `{desktop,tablet,mobile}` object is kept as one;
 * otherwise `mode` picks the shape: 'object' stores the object, 'flat' the
 * `Tablet` / `Mobile` sibling keys.
 *
 * @param {Object} attrs  Block attributes.
 * @param {string} key    The base's desktop key.
 * @param {string} device Device.
 * @param {*}      value  Value, or undefined to clear.
 * @param {string} mode   'object' | 'flat'.
 * @return {Object} Patch.
 */
export function tierPatch( attrs, key, device, value, mode = 'flat' ) {
	const raw = attrs ? attrs[ key ] : undefined;
	if ( isTierObject( raw ) || 'object' === mode ) {
		const next = isTierObject( raw ) ? { ...raw } : isSet( raw ) ? { desktop: raw } : {};
		if ( isSet( value ) ) {
			next[ device ] = value;
		} else {
			delete next[ device ];
		}
		return { [ key ]: Object.keys( next ).length ? next : undefined };
	}
	return { [ deviceKey( key, device ) ]: isSet( value ) ? value : undefined };
}

/**
 * The patch that clears a base on the given devices.
 *
 * @param {Object}   attrs   Block attributes.
 * @param {string}   key     The base's desktop key.
 * @param {string[]} devices Devices to clear.
 * @param {string}   mode    'object' | 'flat'.
 * @return {Object} Patch.
 */
export function clearPatch( attrs, key, devices, mode = 'flat' ) {
	const raw = attrs ? attrs[ key ] : undefined;
	if ( isTierObject( raw ) || 'object' === mode ) {
		const next = isTierObject( raw ) ? { ...raw } : isSet( raw ) ? { desktop: raw } : {};
		devices.forEach( ( d ) => delete next[ d ] );
		return { [ key ]: Object.keys( next ).length ? next : undefined };
	}
	const patch = {};
	devices.forEach( ( d ) => {
		patch[ deviceKey( key, d ) ] = undefined;
	} );
	return patch;
}

/**
 * Every attribute key one base can store a value under, for Reset.
 *
 * @param {string} key    The base's desktop key.
 * @param {string} device 'all' or one device.
 * @return {string[]} Keys.
 */
export function keysFor( key, device = 'all' ) {
	const devices = 'all' === device ? DEVICES : [ device ];
	return devices.map( ( d ) => deviceKey( key, d ) );
}

/**
 * The slot's kind at a device: image, video, embed or svg.
 *
 * @param {Function} get   Reads a base at the device.
 * @param {string[]} kinds The slot's allowed kinds.
 * @return {string} Kind.
 */
function resolveKind( get, kinds ) {
	if ( 1 === kinds.length ) {
		return kinds[ 0 ];
	}
	const type = get( 'MediaType' );
	const base = [ 'image', 'video', 'svg', 'lottie', 'embed' ].includes( type ) ? type : 'image';
	if ( 'video' === base && EMBED_SOURCES.test( String( get( 'VideoSource' ) || '' ) ) ) {
		return 'embed';
	}
	return base;
}

/**
 * Everything a rule reads, resolved at one device.
 *
 * @param {Object} attrs  Block attributes.
 * @param {string} device Device.
 * @param {string} prefix Surface prefix.
 * @param {Object} opts   `{ blockSlug, kinds, context, parallax }`; `context`
 *                        is 'background' for a container background.
 * @return {Object} Context.
 */
export function createContext( attrs, device, prefix = '', opts = {} ) {
	const { blockSlug = '', kinds = [], context = 'element', parallax = false } = opts || {};
	const a = attrs || {};
	const dev = DEVICES.includes( device ) ? device : 'desktop';
	const get = ( base ) => readAt( a, mediaStoredAttrName( blockSlug, prefix, base ), dev );

	const shapeRaw = get( 'Shape' );
	const shapeSlug = String(
		( shapeRaw && 'object' === typeof shapeRaw ? shapeRaw.shape : shapeRaw ) || 'none'
	).toLowerCase();
	const isRadius = RADIUS_SHAPES.includes( shapeSlug );
	const isMask = ! NO_SHAPE.includes( shapeSlug ) && ! isRadius && ! [ 'rounded', 'square' ].includes( shapeSlug );

	const background = 'background' === context;
	const ratio = String( get( 'AspectRatio' ) || '' ).toLowerCase();
	const height = String( get( 'Height' ) || '' ).toLowerCase();

	return {
		attrs: a,
		device: dev,
		prefix,
		blockSlug,
		background,
		parallax: !! parallax,
		kinds,
		kind: resolveKind( get, kinds ),
		get,
		has: ( base ) => isSet( get( base ) ),
		shapeSlug,
		isRadius,
		isMask,
		shapeHidesCorners: isMask || isRadius,
		heightMatchesSpace: 'fill' === height,
		boxCrops: background || ! NOT_A_BOX.includes( ratio ) || ! NOT_A_BOX.includes( height ),
		hasBorderWidth: ( () => {
			const raw = readAt( a, mediaStoredAttrName( blockSlug, prefix, 'BorderWidth' ), dev );
			if ( raw && 'object' === typeof raw ) {
				return Object.values( raw ).some( ( v ) => parseFloat( v ) > 0 );
			}
			return parseFloat( raw ) > 0;
		} )(),
	};
}

/**
 * @param {Object}    c     Context.
 * @param {...string} kinds Kinds.
 * @return {boolean} True when the context's kind is one of `kinds`.
 */
export const kindIn = ( c, ...kinds ) => kinds.includes( c.kind );

/**
 * Build one atom's per-base state map.
 *
 * @param {string}   atom   The atom's key in `MEDIA_BASES`.
 * @param {Object}   attrs  Block attributes.
 * @param {string}   device Device.
 * @param {string}   prefix Surface prefix.
 * @param {Object}   opts   See `createContext()`.
 * @param {Function} rule   `( base, ctx ) => state | undefined`.
 * @return {Object<string,{state:string,hiddenReason:(string|null)}>} Map.
 */
export function rulesFor( atom, attrs, device, prefix, opts, rule ) {
	const ctx = createContext( attrs, device, prefix, opts );
	const map = {};
	( MEDIA_BASES[ atom ] || [] ).forEach( ( base ) => {
		map[ base ] = rule( base, ctx ) || shown();
	} );
	return map;
}

// A block that draws itself one way on one device and another way on another (Spec 48 FR-48-8): a setting choosing how the
// block draws (a calibration fixture variant's key, calibration-fixtures.json `variants`, or a paint state's `equals`) that
// holds a value per device, as Tablet / Mobile siblings (`triggerStyle`, `triggerStyleTablet`, `triggerStyleMobile`) or as a
// tier object (`{ desktop, tablet, mobile }`). A bag drawn as a pill on the desktop and as an icon on the phone is in its pill
// mode at 1440 and its icon mode at 375: a setting calibration measured only in the pill variant (its `variants`) paints
// nothing at 375, and the block's default paint at 375 is the icon variant's. Fill reads each width in the mode in force
// there: `deviceModes` gives, per read width, the fixture variants that draw the node as it draws at that width, which
// lib/paint-state.mjs::calibrationForNode keeps on the node's calibration as `modeAt`, and lib/resolve.mjs (a setting not in
// force at a width answers no draft value there) and lib/fill-prop.mjs::resolveProperty (a property resolved per mode) read.

// One variant's attributes as calibration renders them (lib/calibrate-instances.mjs::variantAttributes, kept apart so the
// resolver can read this module without the calibration planner): the fixture's base attributes with the variant's laid
// over them, a variant value of null removing that attribute.
const variantAttributes = ( base = {}, variant = {} ) => Object.fromEntries( Object.entries( { ...( base || {} ), ...variant } ).filter( ( [ k ] ) => null !== variant[ k ] ) );
export const MODE_WIDTHS = [ 375, 768, 1440 ];
const TIER = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };
const TIER_KEYS = [ 'desktop', 'tablet', 'mobile' ];
// The tiers a device shows, nearest first: an empty tier shows the next wider one.
const CHAIN = { desktop: [ 'desktop' ], tablet: [ 'tablet', 'desktop' ], mobile: [ 'mobile', 'tablet', 'desktop' ] };
const SUFFIX = { desktop: '', tablet: 'Tablet', mobile: 'Mobile' };
const unset = ( v ) => undefined === v || null === v || '' === v;
const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );

// Whether a setting holds a value per device: Tablet or Mobile siblings in the block's schema, or an object (a tier object).
const flatSiblings = ( schema, key ) => !! ( schema?.[ `${ key }Tablet` ] || schema?.[ `${ key }Mobile` ] );
const perDevice = ( schema, key ) => flatSiblings( schema, key ) || 'object' === schema?.[ key ]?.type;

// The settings of a block's fixture that choose how it draws and hold a value per device.
export function modeKeys( fixture, schema ) {
	const keys = new Set( [
		...( fixture?.variants || [] ).flatMap( ( v ) => Object.keys( v || {} ) ),
		...( fixture?.paintStates || [] ).flatMap( ( ps ) => Object.keys( ps?.when?.equals || {} ) ),
	] );
	return [ ...keys ].filter( ( k ) => perDevice( schema, k ) );
}

// The value a per-device setting holds at a tier: a Tablet or Mobile sibling left empty shows the next wider one, as does an
// empty tier of a tier object; an unset setting holds its schema default.
export function valueAtTier( attrs, key, tier, schema ) {
	const base = unset( attrs?.[ key ] ) ? schema?.[ key ]?.default : attrs[ key ];
	if ( flatSiblings( schema, key ) ) {
		const hit = CHAIN[ tier ].map( ( t ) => ( 'desktop' === t ? base : attrs?.[ `${ key }${ SUFFIX[ t ] }` ] ) ).find( ( v ) => ! unset( v ) );
		return hit ?? base;
	}
	if ( isObj( base ) && TIER_KEYS.some( ( t ) => t in base ) ) {
		return CHAIN[ tier ].map( ( t ) => base[ t ] ).find( ( v ) => ! unset( v ) );
	}
	return base;
}

// The node's attributes as it draws at a read width: each mode setting holding its value there, its siblings cleared, so a
// paint state's `equals` is matched against the mode in force at that width.
export function attributesAt( attrs, keys, width, schema ) {
	const out = { ...( attrs || {} ) };
	for ( const k of keys ) {
		out[ k ] = valueAtTier( attrs, k, TIER[ width ], schema );
		delete out[ `${ k }Tablet` ];
		delete out[ `${ k }Mobile` ];
	}
	return out;
}

// { 375: [ variant index ], 768: [ ... ], 1440: [ ... ] }: the fixture variants that draw the block as the node draws at each
// read width (the mode settings holding the same values there), for a node whose mode settings hold different values at
// different widths; null for any other node (its mode is one at every width, and calibration's readings all answer it).
export function deviceModes( fixture, schema, attrs ) {
	const keys = modeKeys( fixture, schema );
	if ( ! keys.length ) {
		return null;
	}
	const at = ( a, w ) => JSON.stringify( keys.map( ( k ) => valueAtTier( a, k, TIER[ w ], schema ) ?? null ) );
	const own = Object.fromEntries( MODE_WIDTHS.map( ( w ) => [ w, at( attrs, w ) ] ) );
	if ( new Set( Object.values( own ) ).size < 2 ) {
		return null;
	}
	const variants = ( fixture.variants?.length ? fixture.variants : [ {} ] ).map( ( v ) => variantAttributes( fixture.attributes, v ) );
	return Object.fromEntries( MODE_WIDTHS.map( ( w ) => [ w, variants.map( ( v, i ) => ( at( v, w ) === own[ w ] ? i : -1 ) ).filter( ( i ) => i >= 0 ) ] ) );
}

// Whether a calibrated setting is in force at a read width: calibration measured it in a variant that draws the node as it
// draws there. A setting with no `variants`, a node with no `modeAt`, and a width whose mode no variant draws are not judged.
export function inForceAt( modeAt, c, w ) {
	const mode = modeAt?.[ w ];
	return ! Array.isArray( c?.variants ) || ! Array.isArray( mode ) || ! mode.length || mode.some( ( i ) => c.variants.includes( i ) );
}

// The read widths of `widths` grouped by the mode in force at each: [ [ widths ] ], one group for a node with no `modeAt`.
export function modeGroups( modeAt, widths ) {
	if ( ! modeAt ) {
		return [ widths ];
	}
	const groups = new Map();
	for ( const w of widths ) {
		const k = JSON.stringify( modeAt[ w ] ?? null );
		groups.set( k, [ ...( groups.get( k ) || [] ), w ] );
	}
	return [ ...groups.values() ];
}

// The calibrated settings in force at none of `widths` (a pill's border on a phone that draws the icon): no home for those
// widths' values.
export function notInForce( cal, widths ) {
	if ( ! cal?.modeAt ) {
		return [];
	}
	return Object.entries( cal.settings || {} ).filter( ( [ , c ] ) => widths.every( ( w ) => ! inForceAt( cal.modeAt, c, w ) ) ).map( ( [ a ] ) => a ).sort();
}

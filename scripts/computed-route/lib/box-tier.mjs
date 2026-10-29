// The one place a box setting's per-tier value is built (Spec 48 FR-48-52): an edge box (padding, margin, border width) holds
// { top, right, bottom, left } per tier, so a per-side row writes its own side and a shorthand row writes all four. Both
// writers of a tier value, lib/resolve.mjs::resolve and lib/fill-width-ladder.mjs::ladder, build it here, so a flat string
// never lands in a box setting.

import { parseLength } from './normalise.mjs';

export const SIDES = [ 'top', 'right', 'bottom', 'left' ];
// A border-radius box stores corners, never sides (helpers-box.php::sgs_border_radius_tiers reads topLeft, topRight,
// bottomRight, bottomLeft through sgs_corner_object_shorthand and ignores any other key), per device when the attribute's
// default is a tier object.
export const CORNERS = [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ];
// The corner key of a corner part as css-families names it ('top-left').
const CORNER_KEY = { 'top-left': 'topLeft', 'top-right': 'topRight', 'bottom-right': 'bottomRight', 'bottom-left': 'bottomLeft' };

// The computed border-radius shorthand ("8px", "8px 4px", …) as corners, or null for an elliptical radius.
export function radiusCorners( raw ) {
	const v = String( raw ).trim().split( /\s+/ );
	if ( ! v.length || v.length > 4 || v.some( ( x ) => '/' === x || ! parseLength( x ) ) ) {
		return null;
	}
	const [ a, b = a, c = a, d = b ] = v;
	return Object.fromEntries( CORNERS.map( ( k, i ) => [ k, [ a, b, c, d ][ i ] ] ) );
}

const TIER_WIDTH = { mobile: 375, tablet: 768, desktop: 1440 };

// Whether a framework-DB attribute row is a box setting.
export const isBoxRow = ( row ) => !! row.box_family || 'box_only' === row.tier_shape;

// The calibrated paint of the element at `slot` at a tier's width ({} when calibration measured none). `loose` is the
// caller's path comparison (it drops the :nth-of-type steps when the setting belongs to an enclosing block).
export function calibratedPaint( { calibration, slot, tier, loose = ( p ) => p } ) {
	const elements = calibration?.elements || {};
	const key = Object.keys( elements ).find( ( k ) => loose( k ) === slot ) ?? slot;
	return elements[ key ]?.[ TIER_WIDTH[ tier ] ] || {};
}

// The value a box setting holds for one tier, or null when the shape cannot be built from this row (an elliptical radius,
// a corner given several lengths, an edge shorthand with several values): the caller raises a gap and writes nothing. A
// setting that is not a box returns `value` unchanged. A border-radius setting builds corners ({ topLeft, … }), never sides.
//   row       the attribute row (isBoxRow decides)
//   short     the setting key of the property ('padding', 'border-width')
//   side      the side the property names, or null for a shorthand
//   corner    set when the property is a corner of border-radius ('top-left' …, from resolve.mjs::splitProperty)
//   existing  what the setting already holds at this tier (an object of sides) or undefined
//   paint     the calibrated paint of the element at this tier (calibratedPaint)
// Padding and margin boxes print only their set sides (sgs_box_object_longhands), so writing one side leaves the others to
// the stylesheet or a wider tier, and nothing is seeded. A border width prints 0 for every unset side (an unset width must
// be 0), so the first side written into an empty width box brings the other sides at their calibrated default paint.
export function boxTierValue( { row, short, side, corner = null, value, existing, paint = {} } ) {
	if ( ! isBoxRow( row ) ) {
		return value;
	}
	if ( corner || 'border-radius' === short ) {
		// A corner row writes its own corner key, so the four corner rows compose by deep merge; a whole radius writes all
		// four corners. A value no corner can hold (an elliptical radius, a corner given two lengths) builds nothing.
		const key = CORNER_KEY[ corner ];
		if ( corner ) {
			return key && 1 === String( value ).trim().split( /\s+/ ).length && radiusCorners( value ) ? { [ key ]: value } : null;
		}
		return radiusCorners( value );
	}
	if ( ! side ) {
		return /\s/.test( String( value ).trim() ) ? null : Object.fromEntries( SIDES.map( ( s ) => [ s, value ] ) );
	}
	const seeds = 'border-width' === short && ! ( existing && Object.keys( existing ).length )
		? Object.fromEntries( SIDES.filter( ( s ) => s !== side ).map( ( s ) => [ s, paint[ `border-${ s }-width` ] ] ).filter( ( [ , v ] ) => undefined !== v ) )
		: {};
	return { ...seeds, [ side ]: value };
}

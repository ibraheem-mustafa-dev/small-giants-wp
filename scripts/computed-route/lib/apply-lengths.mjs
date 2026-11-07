// Lengths the applier measures at one width. A width, inset or offset read as one pixel value at 1440 is wrong at 768 and 375, so
// it is written per device (the setting's tier object), or relative to the box it sits in, never as the one px from one viewport.
// Thickness and size may stay scalar. `lengthViolations` is the lint the writers and their tests share: a px write to a setting
// the framework DB paints as width, left, right, top, inset or offset that is not a per-device object.
import { attrRow } from './db.mjs';
import { TIER_WIDTHS } from './fill-prop.mjs';

const TIER = { [ TIER_WIDTHS[ 0 ] ]: 'desktop', [ TIER_WIDTHS[ 1 ] ]: 'tablet', [ TIER_WIDTHS[ 2 ] ]: 'mobile' };
const POSITIONAL = /^(?:width|min-width|max-width|left|right|top|bottom|inset(?:-[a-z]+)*|offset)$/;
const round = ( n, p = 10 ) => Math.round( n * p ) / p;

// The write for one length. `samples`: { width: { px, of } } for the widths where the element shows (`of` the width of the box it
// sits in). A tier-shaped setting gets one value per device; a one-value setting gets a percentage of the box when every width
// agrees on it; otherwise `{ reason }` names the gap.
export function relativeLength( { db, block, attr, samples } ) {
	const widths = Object.keys( samples );
	if ( ! widths.length ) {
		return { reason: `no width shows the element, so ${ attr } has nothing to read` };
	}
	if ( db && 'tier_object' === attrRow( db, block, attr )?.tier_shape ) {
		return { value: Object.fromEntries( widths.map( ( w ) => [ TIER[ w ], `${ round( samples[ w ].px ) }px` ] ) ) };
	}
	const pct = widths.map( ( w ) => ( samples[ w ].of > 0 ? ( samples[ w ].px / samples[ w ].of ) * 100 : null ) );
	if ( pct.some( ( p ) => null === p ) ) {
		return { reason: `${ attr } is one length for every device and the box it sits in was not read` };
	}
	if ( Math.max( ...pct ) - Math.min( ...pct ) > 0.5 ) {
		return { reason: `${ attr } is one length for every device, and the draft's is ${ pct.map( ( p, i ) => `${ round( p ) }% at ${ widths[ i ] }` ).join( ', ' ) }: no single relative length holds them` };
	}
	return { value: `${ round( pct.reduce( ( a, b ) => a + b, 0 ) / pct.length ) }%` };
}

// A length that is the same at every width that shows it (a vertical offset from a fixed badge), as px; { reason } when widths disagree
// and the setting is not per device.
export function constantLength( { db, block, attr, samples } ) {
	const widths = Object.keys( samples );
	if ( db && 'tier_object' === attrRow( db, block, attr )?.tier_shape ) {
		return { value: Object.fromEntries( widths.map( ( w ) => [ TIER[ w ], `${ round( samples[ w ].px ) }px` ] ) ) };
	}
	const px = widths.map( ( w ) => samples[ w ].px );
	if ( ! px.length || Math.max( ...px ) - Math.min( ...px ) > 0.5 ) {
		return { reason: `${ attr } is one length for every device and the draft's differs by device (${ px.join( ', ' ) })` };
	}
	return { value: `${ round( px[ 0 ] ) }px` };
}

// The writes that paint a positional property with a bare px string.
export function lengthViolations( { db, block, writes } ) {
	return ( writes || [] ).filter( ( w ) => {
		const row = w.unset ? null : attrRow( db, block, w.attr );
		return row && POSITIONAL.test( String( row.css_property ?? '' ) ) && 'string' === typeof w.value && /^-?[\d.]+px$/.test( w.value.trim() );
	} ).map( ( w ) => w.attr );
}

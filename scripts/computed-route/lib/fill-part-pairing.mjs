// Part pairing (Spec 48 FR-48-3, "code first, render confirms"): a setting the framework DB places on a part of a block
// (css_element other than `wrapper`: the burger, a label, a shape) is written only from the draft element paired to
// that part. A read taken from another element lands on the setting only by the accident that calibration also measured
// the setting at that element's slot (a burger height calibrated at the nav root reads the nav root's `height: 100%`).
// A part is paired when the element read is the part's own element (the slot its other settings are calibrated at), or
// when calibration measured the read element and the part's element as the same box on this property at every width.
import { attrsFor } from './db.mjs';
import { LOOSE } from './resolve.mjs';
import { defaultPaint, INHERITED } from './fill-prop.mjs';

const WIDTHS = [ 375, 768, 1440 ];

// The slot most of a part's resting settings are calibrated at, or null when the part has none. The slot compares
// without its :nth-of-type steps; exactHome keeps them, so each of a block's repeated parts (Bars 1 to 3) has its own.
export function partHome( db, block, cal, element, except, key = LOOSE ) {
	const counts = new Map();
	for ( const r of attrsFor( db, block ) ) {
		const slot = cal?.settings?.[ r.attr_name ]?.slot;
		if ( r.css_element === element && ! r.css_state && r.attr_name !== except && undefined !== slot ) {
			counts.set( key( slot ), ( counts.get( key( slot ) ) || 0 ) + 1 );
		}
	}
	return [ ...counts.entries() ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ]?.[ 0 ] ?? null;
}

export const exactHome = ( db, block, cal, element ) => partHome( db, block, cal, element, null, String );

// Why a write of `attr` read from the element at `readSlot` does not belong to the part the setting paints, or null when
// it does. prop: the property written; value: the written text (named in the reason).
export function unpairedPart( { db, block, cal, attr, readSlot, prop, value } ) {
	const row = attrsFor( db, block ).find( ( r ) => r.attr_name === attr );
	const element = row?.css_element;
	if ( ! element || 'wrapper' === element ) {
		return null;
	}
	const home = partHome( db, block, cal, element, attr );
	if ( null === home || LOOSE( readSlot ) === home ) {
		return null;
	}
	// An inherited property the setting's own value reached the read element with (calibration's `reaches`, the elements that
	// carried the marker) is the same value on both.
	if ( INHERITED.includes( prop ) && ( cal?.settings?.[ attr ]?.reaches || [] ).includes( readSlot ) ) {
		return null;
	}
	// The same box: equal default paint at every width where both elements render. At a width where either element, or an
	// ancestor in the block, is display:none, its computed value is the declared one (a bar's `100%`), not a measurement.
	const at = ( slot ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, defaultPaint( cal, slot, w, prop ) ] ) );
	const here = at( readSlot );
	const part = at( home );
	const shown = WIDTHS.filter( ( w ) => rendered( cal, readSlot, w ) && rendered( cal, home, w ) );
	if ( shown.length && shown.every( ( w ) => undefined !== here[ w ] && here[ w ] === part[ w ] ) ) {
		return null;
	}
	return `unpaired-part: ${ attr } paints the ${ element } part (calibrated at "${ home }"), but ${ prop } ${ value } was read from "${ readSlot }", an element the draft does not pair to that part (calibration measured a different ${ prop } on each); a value from another box, a percentage included, is never written`;
}

// Whether the element at `slot` renders at width `w` on the calibration page: neither it nor an ancestor in the block is
// display:none in calibration's default paint (an unread display counts as rendered).
export function rendered( cal, slot, w ) {
	const steps = String( slot ).split( ' > ' );
	const paths = [ '', ...steps.map( ( _, i ) => steps.slice( 0, i + 1 ).join( ' > ' ) ) ].filter( ( x, i, all ) => all.indexOf( x ) === i );
	return paths.every( ( p ) => 'none' !== defaultPaint( cal, p, w, 'display' ) );
}

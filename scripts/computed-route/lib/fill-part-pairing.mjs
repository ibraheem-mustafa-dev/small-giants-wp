// Part pairing (Spec 48 FR-48-3, "code first, render confirms"): a setting the framework DB places on a part of a block
// (css_element other than `wrapper`: the burger, a label, a shape) is written only from the draft element paired to
// that part. A read taken from another element lands on the setting only by the accident that calibration also measured
// the setting at that element's slot (a burger height calibrated at the nav root reads the nav root's `height: 100%`).
// A part is paired when the element read is the part's own element (the slot its other settings are calibrated at), or
// when calibration measured the read element and the part's element as the same box on this property at every width.
import { attrsFor } from './db.mjs';
import { LOOSE } from './resolve.mjs';
import { defaultPaint } from './fill-prop.mjs';

const WIDTHS = [ 375, 768, 1440 ];

// The slot most of a part's resting settings are calibrated at, or null when the part has none.
export function partHome( db, block, cal, element, except ) {
	const counts = new Map();
	for ( const r of attrsFor( db, block ) ) {
		const slot = cal?.settings?.[ r.attr_name ]?.slot;
		if ( r.css_element === element && ! r.css_state && r.attr_name !== except && undefined !== slot ) {
			counts.set( LOOSE( slot ), ( counts.get( LOOSE( slot ) ) || 0 ) + 1 );
		}
	}
	return [ ...counts.entries() ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ]?.[ 0 ] ?? null;
}

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
	const at = ( slot ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, defaultPaint( cal, slot, w, prop ) ] ) );
	const here = at( readSlot );
	const part = at( home );
	if ( WIDTHS.every( ( w ) => undefined !== here[ w ] && here[ w ] === part[ w ] ) ) {
		return null;
	}
	return `unpaired-part: ${ attr } paints the ${ element } part (calibrated at "${ home }"), but ${ prop } ${ value } was read from "${ readSlot }", an element the draft does not pair to that part (calibration measured a different ${ prop } on each); a value from another box, a percentage included, is never written`;
}

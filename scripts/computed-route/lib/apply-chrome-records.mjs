// The chrome family's record helpers: the animations.json records that name the draft ids a target owns (or reaches), read as
// hover looks. A record names the element that moves; the block that owns it is the skeleton node whose id span holds it.
import { recordsFor, stateLook } from './apply-records.mjs';

const idsOfTarget = ( target, span ) => ( target[ span ] ?? target.owns ?? [] ).length ? ( target[ span ] ?? target.owns ) : [ Number( /\/(\d+)#/.exec( target.tpl )?.[ 1 ] ) ];

// Records on the draft ids of a target. span: 'owns' (the block's own ids) or 'reach' (its subtree as well).
export function recordsOf( { target, recordsIndex }, span = 'owns' ) {
	return [ ...new Set( idsOfTarget( target, span ).flatMap( ( id ) => recordsFor( recordsIndex, `Root/${ id }#0` ) ) ) ];
}

// The `to` of the first hover look for `property` among records: { value, record } or null.
export function hoverTo( records, property ) {
	for ( const record of records ) {
		const look = stateLook( record )?.looks.find( ( l ) => l.property === property );
		if ( look && 'hover' === record.trigger?.type ) {
			return { value: String( look.to ), from: look.from, record, look };
		}
	}
	return null;
}

// translateX(4px) -> 4; translateY(-4px) with axis 'Y' -> -4; null for any other shape.
export function translate( value, axis = 'X' ) {
	const m = new RegExp( String.raw`translate${ axis }\((-?[\d.]+)px\)` ).exec( String( value ?? '' ) );
	return m ? Number( m[ 1 ] ) : null;
}

// rotate(-1deg) -> -1.
export function rotation( value ) {
	const m = /rotate\((-?[\d.]+)deg\)/.exec( String( value ?? '' ) );
	return m ? Number( m[ 1 ] ) : null;
}

// scale(1.05 ...) -> 1.05.
export function scaleOf( value ) {
	const m = /scale\(([\d.]+)\)/.exec( String( value ?? '' ) );
	return m ? Number( m[ 1 ] ) : null;
}

// Whether `whole` already holds everything `part` states: objects key by key, anything else equal.
export function holds( whole, part ) {
	if ( part && 'object' === typeof part && ! Array.isArray( part ) ) {
		return Boolean( whole ) && 'object' === typeof whole && Object.keys( part ).every( ( k ) => holds( whole[ k ], part[ k ] ) );
	}
	return JSON.stringify( whole ) === JSON.stringify( part );
}

// A write only when the saved attribute differs; the item an op or equal row makes. writes: [ { attr, value, merge? } ]. A `deep`
// write is a part of the saved document, so it is equal when the saved document holds that part.
export function settle( { prop, why, saved, writes, record, state } ) {
	const todo = writes.filter( ( w ) => w.unset ? w.attr in saved : ! ( 'deep' === w.merge ? holds( saved[ w.attr ], w.value ) : JSON.stringify( saved[ w.attr ] ) === JSON.stringify( w.value ) ) );
	if ( ! todo.length ) {
		return { status: 'equal', prop, why: `${ why }: already saved` };
	}
	return { status: 'op', prop, why, writes: todo, checks: [], ...( record ? { record } : {} ), ...( state ? { state } : {} ) };
}

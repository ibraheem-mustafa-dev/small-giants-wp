// What Fill leaves unjudged on one measured node (FR-47-4 step 5): every setting the block's setting record or the
// framework database knows that no read reached and no decision judged, with the reason, so nothing is dropped
// silently. Four kinds:
//   element   a style setting whose recorded element no draftRef or draftSlots finder read;
//   presence  a visibility setting the record holds no presence for, or whose shown or hidden element no finder read;
//   text/link a content setting the record has no reading for;
//   structure an enum setting with no CSS property (a layout or a mode) calibration reads no presence for, so the draft
//             cannot choose its value.
// A setting the skeleton sets itself, or that Fill wrote, is never listed. Content settings come from the database's
// roles (lib/calibrate-content.mjs::contentRowsFor), never a list of names.
import { contentRowsFor, STRUCTURE_ROLES, STRUCTURE_WHERE, isStructureRow, structureValues } from './calibrate-content.mjs';
import { LOOSE } from './resolve.mjs';

export { STRUCTURE_ROLES };

const COLS = 'attr_name, attr_type, enum_values, role, css_property';

// A block's structure settings, the ones calibration reads value by value (lib/calibrate-content.mjs::isStructureRow):
// SGS-owned, no css_property, a string enum in a STRUCTURE_ROLES role or a choice among numbers. A setting of another type
// (an object setting whose enum names its keys) is never read for presence, so it is not listed as unread.
// db: lib/db.mjs::openDb.
export function structureRowsFor( db, block ) {
	return db.prepare( `SELECT ${ COLS } FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' ) AND ${ STRUCTURE_WHERE }` ).all( block ).filter( ( r ) => isStructureRow( r ) ).map( ( r ) => ( { ...r } ) );
}

// One node's unjudged settings. cal: the block's calibration; attributes: the skeleton node's own attributes; slots:
// the element paths a finder read on this node ('' is the draftRef element); written: the settings Fill wrote on it.
// Returns [ { kind, slot, settings: [ attr ], reason } ].
export function unreadOf( { db, block, cal, attributes = {}, slots = [], written = new Set() } ) {
	const out = [];
	const decided = ( a ) => Object.prototype.hasOwnProperty.call( attributes, a ) || written.has( a );
	const read = new Set( slots.map( LOOSE ) );
	const reached = ( paths ) => paths.some( ( p ) => read.has( LOOSE( p ) ) );

	const byElement = new Map();
	for ( const [ attr, s ] of Object.entries( cal?.settings || {} ) ) {
		const paths = s.slots?.length ? s.slots : [ s.slot ?? '' ];
		if ( decided( attr ) || reached( paths ) ) {
			continue;
		}
		byElement.has( paths[ 0 ] ) || byElement.set( paths[ 0 ], [] );
		byElement.get( paths[ 0 ] ).push( attr );
	}
	for ( const [ slot, settings ] of byElement ) {
		out.push( { kind: 'element', slot, settings, reason: `no draftSlots finder names "${ slot }", so the draft element these settings paint was never read` } );
	}

	const content = contentRowsFor( db, block );
	for ( const row of content.presence ) {
		const attr = row.attr_name;
		if ( decided( attr ) ) {
			continue;
		}
		const p = cal?.presence?.[ attr ];
		if ( ! p ) {
			out.push( { kind: 'presence', slot: '', settings: [ attr ], reason: `the site look has no presence reading for ${ attr } (give it a precondition in the setting record's fixtures.json)` } );
			continue;
		}
		const paths = [ ...( p.shows || [] ), ...( p.hides || [] ) ];
		if ( paths.length && ! reached( paths ) ) {
			out.push( { kind: 'presence', slot: paths[ 0 ], settings: [ attr ], reason: `no draftSlots finder names an element it shows or hides ("${ paths[ 0 ] }"), so the draft gave no evidence` } );
		}
	}
	for ( const kind of [ 'text', 'link' ] ) {
		for ( const row of content[ kind ] ) {
			if ( ! decided( row.attr_name ) && ! cal?.[ kind ]?.[ row.attr_name ] ) {
				out.push( { kind, slot: '', settings: [ row.attr_name ], reason: `calibration has no ${ kind } reading for ${ row.attr_name }` } );
			}
		}
	}
	const presenceKeys = Object.keys( cal?.presence || {} );
	for ( const row of structureRowsFor( db, block ) ) {
		const attr = row.attr_name;
		if ( decided( attr ) || presenceKeys.some( ( k ) => k.startsWith( `${ attr }=` ) ) ) {
			continue;
		}
		out.push( { kind: 'structure', slot: '', settings: [ attr ], reason: `calibration has no presence reading for its values (${ structureValues( row ).join( ', ' ) }), so the draft cannot choose one` } );
	}
	return out;
}

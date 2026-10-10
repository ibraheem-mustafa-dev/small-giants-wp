// What Fill leaves unjudged on one measured node (FR-47-4 step 5): every setting the block's calibration or the
// framework database knows that no read reached and no decision judged, with the reason, so nothing is dropped
// silently. Four kinds:
//   element   a style setting whose calibrated element no draftRef or draftSlots finder read;
//   presence  a visibility setting calibration never read, or whose shown or hidden element no finder read;
//   text/link a content setting calibration has no reading for;
//   structure an enum setting with no CSS property (a layout or a mode) calibration reads no presence for, so the draft
//             cannot choose its value.
// A setting the skeleton sets itself, or that Fill wrote, is never listed. Content settings come from the database's
// roles (lib/calibrate-content.mjs::contentRowsFor), never a list of names.
import { contentRowsFor } from './calibrate-content.mjs';
import { LOOSE } from './resolve.mjs';

// Database roles of an enum setting with no CSS property that changes what a block renders rather than how it paints.
export const STRUCTURE_ROLES = [ 'layout', 'select-from-enum' ];

const COLS = 'attr_name, enum_values, role';

// A block's structure settings: SGS-owned enums with no css_property in a STRUCTURE_ROLES role. db: lib/db.mjs::openDb.
export function structureRowsFor( db, block ) {
	return db.prepare( `SELECT ${ COLS } FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' ) AND css_property IS NULL AND enum_values IS NOT NULL AND role IN ( ${ STRUCTURE_ROLES.map( () => '?' ).join( ', ' ) } )` ).all( block, ...STRUCTURE_ROLES ).map( ( r ) => ( { ...r } ) );
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
			out.push( { kind: 'presence', slot: '', settings: [ attr ], reason: `calibration has no presence reading for ${ attr } (recalibrate, or give it a precondition in calibration-fixtures.json)` } );
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
		out.push( { kind: 'structure', slot: '', settings: [ attr ], reason: `calibration has no presence reading for its values (${ JSON.parse( row.enum_values ).filter( Boolean ).join( ', ' ) }), so the draft cannot choose one` } );
	}
	return out;
}

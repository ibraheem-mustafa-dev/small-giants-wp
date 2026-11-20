// The item markers of a list block (Spec 48 FR-48-82, the marker part): each item's own marker, read at the draft element
// the skeleton gave that item's marker part (lib/skeleton-write-units.mjs::buildList, through `markerSlotAt`), is read with the
// icon reader (lib/fill-icon.mjs::iconDecisions) and written to that item; the list's marker type follows what the draft draws
// at every item. Nothing here names a block:
//   - the item array is the block's array setting whose item schema (`array_item_schema`) holds an icon setting the reader
//     writes (iconSource, iconName, iconSvg, brandName, iconFill);
//   - the marker part is the calibrated slot under a repeated item step that holds the block's svg (`markerPart`: a slot whose
//     `<slot> > svg` the calibration also names); copy k's marker is that slot with its last `:nth-of-type` set to k;
//   - what a marker draws: an svg is `icon`; a digit run counting up from 1 is `numbered`; other glyphs are `emoji`; a painted
//     mark with no content is `bullet`; no marker element at any item is `none`;
//   - the marker type is the block's enum setting whose allowed values (the framework DB's `enum_values`, never a list here)
//     include at least three of those kinds. A value the DB does not list for it is a named UNMAPPED row, never written.
// A block whose calibration holds no marker part is not a list with markers: nothing is read or written for it.
// Returns { writes: [{ attr, value, merge }], unmapped: [{ property, value, slot, reason }], notes, decided }.
import { enumSettings } from './db.mjs';
import { iconDecisions, ICON_SETTINGS } from './fill-icon.mjs';

const NTH = /:nth-of-type\((\d+)\)/g;
const MARKERS = [ 'icon', 'emoji', 'bullet', 'numbered', 'none' ];

// The block's item array holding an icon setting the reader writes: { attr, fields } or null.
export function iconItems( db, block ) {
	const rows = db.prepare( 'SELECT array_attr, field_key FROM array_item_schema WHERE block_slug = ?' ).all( block );
	const attr = rows.find( ( r ) => ICON_SETTINGS.includes( r.field_key ) )?.array_attr;
	return attr ? { attr, fields: rows.filter( ( r ) => r.array_attr === attr ).map( ( r ) => r.field_key ) } : null;
}

// The calibrated marker part of a block as the first copy's slot (`settings`: the calibration's settings, each with its
// `slot` and `slots`), or null: the shortest slot under a repeated step that is not a pseudo-element and whose `<slot> > svg`
// the calibration also names (the part the block's own svg sits in).
export function markerPart( settings ) {
	const all = new Set();
	for ( const s of Object.values( settings || {} ) ) {
		[ s?.slot, ...( s?.slots || [] ) ].filter( ( p ) => 'string' === typeof p ).forEach( ( p ) => all.add( p ) );
	}
	const parts = [ ...all ].filter( ( p ) => /:nth-of-type\(\d+\)/.test( p ) && ! p.includes( '::' ) && all.has( `${ p } > svg` ) );
	return parts.sort( ( a, b ) => a.length - b.length || a.localeCompare( b ) )[ 0 ] ?? null;
}

// The part's slot for item copy `k`: its last repeated step set to k.
export function markerSlotAt( part, k ) {
	const at = [ ...String( part ).matchAll( NTH ) ].at( -1 );
	return at ? `${ part.slice( 0, at.index ) }:nth-of-type(${ k })${ part.slice( at.index + at[ 0 ].length ) }` : part;
}

// Each item copy's marker slot among `slots` (the node's measured slots): { <copy number>: slot }.
export function markerSlots( { cal, slots } ) {
	const part = markerPart( cal?.settings );
	const out = {};
	if ( ! part ) {
		return out;
	}
	for ( const s of slots ) {
		const k = Number( [ ...s.matchAll( NTH ) ].at( -1 )?.[ 1 ] ?? NaN );
		Number.isFinite( k ) && markerSlotAt( part, k ) === s && ( out[ k ] = s );
	}
	return out;
}

// What the draft draws at one marker read: 'icon', 'numbered' (with its number), 'emoji' or 'bullet'.
const drawn = ( r ) => ( r.svg?.markup ? 'icon' : /^\d+\.?$/.test( r.words || '' ) ? 'numbered' : r.words ? 'emoji' : 'bullet' );

// db; block; cal: the node's calibration; attributes: the node's settings; reads: { <slot>: the read at the content width }.
export function listMarkerDecisions( { db, block, cal, attributes = {}, reads = {} } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const list = iconItems( db, block );
	const items = list ? attributes[ list.attr ] : null;
	if ( ! Array.isArray( items ) || ! items.length || ! markerPart( cal?.settings ) ) {
		return out;
	}
	const at = markerSlots( { cal, slots: Object.keys( reads ) } );
	const seen = items.map( ( _, i ) => at[ i + 1 ] ).map( ( s ) => ( s && reads[ s ] && ! reads[ s ].missing ? { slot: s, read: reads[ s ] } : null ) );
	const schema = Object.fromEntries( list.fields.map( ( f ) => [ f, {} ] ) );
	let changed = false;
	const next = items.map( ( item, i ) => {
		if ( ! seen[ i ]?.read.svg?.markup ) {
			return item;
		}
		const d = iconDecisions( { svg: seen[ i ].read.svg, schema, attributes: item, requireSvg: false } );
		out.unmapped.push( ...d.unmapped.map( ( u ) => ( { ...u, slot: seen[ i ].slot, reason: `item ${ i + 1 }: ${ u.reason }` } ) ) );
		if ( ! d.writes.length ) {
			return item;
		}
		changed = true;
		return { ...item, ...Object.fromEntries( d.writes.map( ( w ) => [ w.attr, w.value ] ) ) };
	} );
	changed && out.writes.push( { attr: list.attr, value: next, merge: 'replace' } );
	// The marker type: one kind at every item, the numbers counting up from 1, or no marker element at any item.
	const kinds = seen.map( ( s ) => ( s ? drawn( s.read ) : null ) );
	const counts = seen.every( ( s, i ) => ! s || 'numbered' !== drawn( s.read ) || parseInt( s.read.words, 10 ) === i + 1 );
	const kind = kinds.every( ( k ) => null === k ) ? 'none' : kinds.every( ( k ) => k && k === kinds[ 0 ] ) && counts ? kinds[ 0 ] : null;
	if ( ! kind ) {
		out.notes.push( `the draft's item markers differ (${ kinds.map( ( k ) => k ?? 'none' ).join( ', ' ) }), so the list's marker type is not chosen` );
		return out;
	}
	const setting = enumSettings( db, block ).find( ( r ) => {
		try {
			return [].concat( JSON.parse( r.enum_values ) ).filter( ( v ) => MARKERS.includes( v ) ).length >= 3;
		} catch {
			return false;
		}
	} );
	if ( ! setting || ! [].concat( JSON.parse( setting.enum_values ) ).includes( kind ) ) {
		out.unmapped.push( { property: 'marker', value: kind, slot: at[ 1 ] ?? '', reason: `the draft draws a ${ kind } marker at every item and ${ block } has no setting whose allowed values in the framework DB include ${ kind }, so the list's marker type is not written` } );
		return out;
	}
	attributes[ setting.attr_name ] !== kind && out.writes.push( { attr: setting.attr_name, value: kind, merge: 'replace' } );
	out.decided = { [ setting.attr_name ]: kind };
	return out;
}

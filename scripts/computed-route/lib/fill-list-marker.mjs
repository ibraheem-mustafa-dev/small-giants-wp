// The item markers of a list block (Spec 48 FR-48-82, the marker part): each item's own marker or glyph, paired with the
// block's item marker part by lib/skeleton-part-pairing.mjs, is read with the icon reader (lib/fill-icon.mjs::iconDecisions)
// and written to that item; the list's marker type follows what the draft draws at every item. Nothing here names a block:
//   - the item array is the block's array setting whose item schema (`array_item_schema`) holds an icon setting the reader
//     writes (iconSource, iconName, iconSvg, brandName, iconFill);
//   - an item's marker is the part under the item's repeated step that holds the block's svg (the part tree's `svg` kind),
//     at the node's paired slot for that copy;
//   - the marker type is the block's enum setting whose allowed values (the framework DB's `enum_values`, never a list
//     here) include the kind the draft draws: an svg at every marker is `icon`, a digit run counting up from 1 is
//     `numbered`, other glyphs are `emoji`, a painted mark with no content is `bullet`, and no marker element at any
//     item is `none`. A value the DB does not list for the setting is a named UNMAPPED row, never written.
// Returns { writes: [{ attr, value, merge }], unmapped: [{ property, value, slot, reason }], notes }.
import { enumSettings } from './db.mjs';
import { iconDecisions, ICON_SETTINGS } from './fill-icon.mjs';
import { partTree } from './skeleton-part-pairing.mjs';

const NTH = /:nth-of-type\((\d+)\)/g;
const MARKERS = [ 'icon', 'emoji', 'bullet', 'numbered', 'none' ];

// The block's item array holding an icon setting the reader writes: { attr, fields } or null.
export function iconItems( db, block ) {
	const rows = db.prepare( 'SELECT array_attr, field_key FROM array_item_schema WHERE block_slug = ?' ).all( block );
	const attr = rows.find( ( r ) => ICON_SETTINGS.includes( r.field_key ) )?.array_attr;
	return attr ? { attr, fields: rows.filter( ( r ) => r.array_attr === attr ).map( ( r ) => r.field_key ) } : null;
}

// Each item copy's marker slot among `slots` (the node's paired slots): { <copy number>: slot }.
export function markerSlots( { db, block, cal, slots } ) {
	const T = partTree( { db, block, cal, paint: cal?.elements || {} } );
	const out = {};
	for ( const s of slots ) {
		const hits = [ ...s.matchAll( NTH ) ];
		if ( ! hits.length || ! T.kinds( s ).has( 'svg' ) ) {
			continue;
		}
		const k = Number( hits.at( -1 )[ 1 ] );
		( ! out[ k ] || s.length < out[ k ].length ) && ( out[ k ] = s );
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
	if ( ! Array.isArray( items ) || ! items.length ) {
		return out;
	}
	const at = markerSlots( { db, block, cal, slots: Object.keys( reads ) } );
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

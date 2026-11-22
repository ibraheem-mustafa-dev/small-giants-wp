// The item markers of a list block (Spec 48 FR-48-82, the marker part): each item's own marker, read at the draft element
// the skeleton gave that item's marker part (lib/skeleton-write-units.mjs::buildList, through `markerSlotAt`), is read with the
// icon reader (lib/fill-icon.mjs::iconDecisions) and written to that item; the list's marker type follows what the draft draws
// at every item. Nothing here names a block:
//   - the item array is the block's array setting whose item schema (`array_item_schema`) holds an icon setting the reader
//     writes (iconSource, iconName, iconSvg, brandName, iconFill);
//   - the marker part is the calibrated slot under a repeated item step that holds the block's svg (`markerPart`: a slot whose
//     `<slot> > svg` the calibration also names); copy k's marker is that slot with its last `:nth-of-type` set to k;
//   - what a marker draws, in every form: an svg is `icon`; a typed ordinal (1, 01, 1., (1), i., a)) is `numbered` with the number
//     style that prints it (decimal, decimal-leading-zero, lower-roman, ...) and must count up from 1; a dot or bar glyph, an empty
//     painted mark or a disc, circle or square list style is `bullet`; any other glyph is `emoji`, written to the item's icon-name
//     field (`array_item_schema.role` icon) with `iconSource` emoji; a list-style image is `image`; no marker at any item is `none`;
//   - the CSS an item's own element draws (its list-style type, its `::marker` content, or a glyph, counter or small painted dot
//     on its `::before` when its list style is none, `drawnByCss`) is read at the item part (`itemSlotAt`) and stands for the
//     block's `<item slot>::marker`; a copy with an svg or glyph part keeps that part as its marker;
//   - the marker type is the block's enum setting whose allowed values (the framework DB's `enum_values`, never a list here)
//     include at least three of those kinds; the number style is the block's other enum setting whose values include `decimal`
//     (the default style is written only over another value). A value the DB does not list is a named UNMAPPED row, never written.
// A block whose calibration holds no marker part is not a list with markers: nothing is read or written for it.
// Returns { writes: [{ attr, value, merge }], unmapped: [{ property, value, slot, reason }], notes, decided }.
import { enumSettings } from './db.mjs';
import { iconDecisions, ICON_SETTINGS } from './fill-icon.mjs';

const NTH = /:nth-of-type\((\d+)\)/g;
export const MARKERS = [ 'icon', 'emoji', 'bullet', 'numbered', 'none' ];
const ICON_NAME_ROLES = [ 'icon-slug', 'icon' ];
// Glyphs that draw a dot or a bar: a bullet, whichever character draws it.
const BULLET_GLYPHS = /^[•·‧∙●○◦▪▫■□◆◇‣⁃–—\-|*]$/u;
const BULLET_TYPES = [ 'disc', 'circle', 'square', 'disclosure-open', 'disclosure-closed' ];
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

// The block's item array holding an icon setting the reader writes: { attr, fields, roles } or null.
export function iconItems( db, block ) {
	const rows = db.prepare( 'SELECT array_attr, field_key, role FROM array_item_schema WHERE block_slug = ?' ).all( block );
	const attr = rows.find( ( r ) => ICON_SETTINGS.includes( r.field_key ) )?.array_attr;
	const own = rows.filter( ( r ) => r.array_attr === attr );
	return attr ? { attr, fields: own.map( ( r ) => r.field_key ), roles: Object.fromEntries( own.map( ( r ) => [ r.field_key, r.role ?? null ] ) ) } : null;
}

// The calibrated marker part of a block as the first copy's slot (`settings`: the calibration's settings, each with its
// `slot` and `slots`), or null: the shortest slot under a repeated step that is not a pseudo-element and whose `<slot> > svg`
// the calibration also names (the part the block's own svg sits in).
export function markerPart( settings ) {
	return markerParts( settings )[ 0 ] ?? null;
}

// Every marker part the calibration names, shortest first: one setting can also list the part as measured from another anchor
// (a hover reading's `.x__item:nth-of-type(1) > .x__icon` beside the block's `.x > .x__item:nth-of-type(1) > .x__icon`), so a
// reader matching the node's measured slots tries each.
export function markerParts( settings ) {
	const all = new Set();
	for ( const s of Object.values( settings || {} ) ) {
		[ s?.slot, ...( s?.slots || [] ) ].filter( ( p ) => 'string' === typeof p ).forEach( ( p ) => all.add( p ) );
	}
	return [ ...all ].filter( ( p ) => /:nth-of-type\(\d+\)/.test( p ) && ! p.includes( '::' ) && all.has( `${ p } > svg` ) ).sort( ( a, b ) => a.length - b.length || a.localeCompare( b ) );
}

// The part's slot for item copy `k`: its last repeated step set to k.
export function markerSlotAt( part, k ) {
	const at = [ ...String( part ).matchAll( NTH ) ].at( -1 );
	return at ? `${ part.slice( 0, at.index ) }:nth-of-type(${ k })${ part.slice( at.index + at[ 0 ].length ) }` : part;
}

// The item part of copy `k`: the marker part cut after its last repeated step, that step set to k (the element a list item's
// own CSS marker belongs to), or null when the part has no repeated step.
export function itemSlotAt( part, k ) {
	const at = [ ...String( part ).matchAll( NTH ) ].at( -1 );
	return at ? `${ part.slice( 0, at.index ) }:nth-of-type(${ k })` : null;
}

const romanValue = ( s ) => {
	const d = [ ...s.toLowerCase() ].map( ( c ) => ROMAN[ c ] );
	return d.every( Boolean ) ? d.reduce( ( t, v, i ) => t + ( v < ( d[ i + 1 ] ?? 0 ) ? -v : v ), 0 ) : null;
};

// A typed ordinal ("1", "01", "1.", "(1)", "i.", "a)"): { n, formats } (the number styles that print it; `n` is the number each
// style reads it as), else null.
export function ordinal( words ) {
	const hit = /^\(?([0-9]{1,3}|[ivxlcdm]{1,6}|[a-z])[.):]?$/i.exec( String( words || '' ).trim() );
	if ( ! hit ) {
		return null;
	}
	const t = hit[ 1 ];
	if ( /^\d+$/.test( t ) ) {
		return { n: parseInt( t, 10 ), formats: [ t.length > 1 && t.startsWith( '0' ) ? 'decimal-leading-zero' : 'decimal' ] };
	}
	const upper = t === t.toUpperCase();
	const out = [];
	const r = romanValue( t );
	r && out.push( { n: r, format: upper ? 'upper-roman' : 'lower-roman' } );
	1 === t.length && out.push( { n: t.toLowerCase().charCodeAt( 0 ) - 96, format: upper ? 'upper-alpha' : 'lower-alpha' } );
	return out.length ? { n: out.map( ( o ) => o.n ), formats: out.map( ( o ) => o.format ) } : null;
}

// What a glyph draws: numbered (with its number), bullet or emoji.
export function glyph( text ) {
	const w = String( text ).trim();
	const o = ordinal( w );
	if ( o ) {
		return { kind: 'numbered', n: o.n, formats: o.formats };
	}
	return BULLET_GLYPHS.test( w ) ? { kind: 'bullet' } : { kind: 'emoji', glyph: w };
}

// A CSS `content` value's text: the quoted string, '' for an empty string, null for none, normal or a non-string value.
const quoted = ( c ) => {
	const hit = /^"((?:[^"\\]|\\.)*)"$/.exec( String( c || '' ).trim() );
	return hit ? hit[ 1 ].replace( /\\(.)/g, '$1' ) : null;
};
const COUNTER = /^counters?\(\s*[^,)]+(?:,\s*(?:"[^"]*"\s*,\s*)?([a-z-]+))?\s*\)/;
const clear = ( v ) => ! v || /^(transparent|rgba\(0, 0, 0, 0\)|none)$/.test( String( v ).trim() );
const px = ( v ) => parseFloat( v ) || 0;

// What a marker part's own read draws (an element standing for the marker): its svg, its words, or a painted mark.
export function drawnByPart( r ) {
	if ( r.svg?.markup ) {
		return { kind: 'icon' };
	}
	return r.words ? glyph( r.words ) : { kind: 'bullet' };
}

// What the CSS on an item's own element draws as its marker, or null when it draws none: its ::marker (list-style type,
// image and ::marker content), else, with no list style, a glyph, counter or painted dot on its ::before.
export function drawnByCss( r ) {
	const m = r?.marker;
	if ( m && m.image && 'none' !== m.image ) {
		return { kind: 'image' };
	}
	if ( m && m.type && 'none' !== m.type ) {
		const own = quoted( m.content );
		if ( null !== own && '' !== own.trim() ) {
			return glyph( own );
		}
		const typed = quoted( m.type );
		if ( null !== typed ) {
			return '' === typed.trim() ? null : glyph( typed );
		}
		return BULLET_TYPES.includes( m.type ) ? { kind: 'bullet' } : { kind: 'numbered', n: null, formats: [ m.type ] };
	}
	const b = r?.pseudo?.[ '::before' ];
	if ( ! b ) {
		return null;
	}
	const counter = COUNTER.exec( String( b.content || '' ).trim() );
	if ( counter ) {
		return { kind: 'numbered', n: null, formats: [ counter[ 1 ] || 'decimal' ] };
	}
	const text = quoted( b.content );
	if ( null === text ) {
		return null;
	}
	if ( '' !== text.trim() ) {
		return glyph( text );
	}
	// An empty ::before is a marker when it paints a small mark: a dot or a bar.
	const paints = ! clear( b[ 'background-color' ] ) || ! clear( b[ 'background-image' ] ) || px( b[ 'border-top-width' ] ) > 0;
	const small = px( b.width ) > 0 && px( b.width ) <= 24 && px( b.height ) > 0 && px( b.height ) <= 24;
	return paints && small ? { kind: 'bullet' } : null;
}

// Each item copy's marker among `slots` (the node's measured slots): { <copy number>: slot }. A copy's marker part is its
// marker; a copy with none pairs its own item part's CSS marker with the block's `::marker` (`<item slot>::marker`) where `reads`
// shows the item's element drawing one.
export function markerSlots( { cal, slots, reads = {} } ) {
	const copy = ( s ) => Number( [ ...s.matchAll( NTH ) ].at( -1 )?.[ 1 ] ?? NaN );
	// The part among the calibration's that the node's measured slots hold the most copies of.
	const hits = ( part ) => slots.filter( ( s ) => Number.isFinite( copy( s ) ) && markerSlotAt( part, copy( s ) ) === s ).length;
	const part = markerParts( cal?.settings ).map( ( p ) => [ p, hits( p ) ] ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ]?.[ 0 ] ?? null;
	const out = {};
	if ( ! part ) {
		return out;
	}
	for ( const s of slots ) {
		Number.isFinite( copy( s ) ) && markerSlotAt( part, copy( s ) ) === s && ( out[ copy( s ) ] = s );
	}
	for ( const s of slots ) {
		const r = reads[ s ];
		Number.isFinite( copy( s ) ) && itemSlotAt( part, copy( s ) ) === s && ! out[ copy( s ) ] && r && ! r.missing && drawnByCss( r ) && ( out[ copy( s ) ] = `${ s }::marker` );
	}
	return out;
}

// The read a paired marker slot stands for: { slot, read, drawn }, or null when the read is missing.
const readAt = ( slot, reads ) => {
	const own = slot.endsWith( '::marker' );
	const r = reads[ own ? slot.slice( 0, -'::marker'.length ) : slot ];
	return r && ! r.missing ? { slot, read: r, drawn: own ? drawnByCss( r ) : drawnByPart( r ) } : null;
};

// The one number style every numbered item allows, and whether the typed numbers count up from 1: { format, counts }.
function numberStyle( seen ) {
	const all = seen.map( ( s ) => s.drawn.formats );
	const format = all[ 0 ].find( ( f ) => all.every( ( fs ) => fs.includes( f ) ) ) ?? null;
	const counts = seen.every( ( s, i ) => {
		const n = s.drawn.n;
		if ( null === n || undefined === n ) {
			return true;
		}
		const at = Array.isArray( n ) ? n[ s.drawn.formats.indexOf( format ) ] : n;
		return at === i + 1;
	} );
	return { format, counts };
}

// A stored JSON value, or undefined when there is none or it does not parse.
const parsed = ( v ) => {
	try {
		return null === v || undefined === v ? undefined : JSON.parse( v );
	} catch {
		return undefined;
	}
};

// From a block's enum setting rows (`{ attr_name, enum_values, default_value }`): the setting whose allowed values include at
// least three marker kinds, and the one (another) whose values include `decimal`: { marker, number } (each
// { attr_name, values, fallback } or null).
export function markerSettingsFrom( list ) {
	const rows = list.map( ( r ) => {
		try {
			return { attr_name: r.attr_name, values: [].concat( JSON.parse( r.enum_values ) ), fallback: parsed( r.default_value ) };
		} catch {
			return null;
		}
	} ).filter( Boolean );
	const marker = rows.find( ( r ) => r.values.filter( ( v ) => MARKERS.includes( v ) ).length >= 3 ) ?? null;
	const number = rows.find( ( r ) => r !== marker && r.values.includes( 'decimal' ) ) ?? null;
	return { marker, number };
}

// db; block; cal: the node's calibration; attributes: the node's settings; reads: { <slot>: the read at the content width }.
export function listMarkerDecisions( { db, block, cal, attributes = {}, reads = {} } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const list = iconItems( db, block );
	const items = list ? attributes[ list.attr ] : null;
	if ( ! Array.isArray( items ) || ! items.length || ! markerPart( cal?.settings ) ) {
		return out;
	}
	const at = markerSlots( { cal, slots: Object.keys( reads ), reads } );
	const seen = items.map( ( _, i ) => ( at[ i + 1 ] ? readAt( at[ i + 1 ], reads ) : null ) );
	const schema = Object.fromEntries( list.fields.map( ( f ) => [ f, {} ] ) );
	const glyphField = list.fields.find( ( f ) => ICON_NAME_ROLES.includes( list.roles[ f ] ) ) ?? null;
	let changed = false;
	const next = items.map( ( item, i ) => {
		const s = seen[ i ];
		if ( s?.read.svg?.markup && ! s.slot.endsWith( '::marker' ) ) {
			const d = iconDecisions( { svg: s.read.svg, schema, attributes: item, requireSvg: false } );
			out.unmapped.push( ...d.unmapped.map( ( u ) => ( { ...u, slot: s.slot, reason: `item ${ i + 1 }: ${ u.reason }` } ) ) );
			if ( ! d.writes.length ) {
				return item;
			}
			changed = true;
			return { ...item, ...Object.fromEntries( d.writes.map( ( w ) => [ w.attr, w.value ] ) ) };
		}
		// A glyph marker is the item's emoji: the glyph in the field whose role is an icon name, its source emoji.
		if ( 'emoji' === s?.drawn?.kind && glyphField && list.fields.includes( 'iconSource' ) ) {
			const want = { iconSource: 'emoji', [ glyphField ]: s.drawn.glyph };
			if ( Object.entries( want ).some( ( [ k, v ] ) => item[ k ] !== v ) ) {
				changed = true;
				return { ...item, ...want };
			}
		}
		return item;
	} );
	changed && out.writes.push( { attr: list.attr, value: next, merge: 'replace' } );
	// The marker type: one kind at every item (numbered ones sharing a number style and counting up from 1), or no marker at any item.
	const kinds = seen.map( ( s ) => s?.drawn?.kind ?? null );
	const style = 'numbered' === kinds[ 0 ] && kinds.every( ( k ) => 'numbered' === k ) ? numberStyle( seen ) : null;
	const same = kinds.every( ( k ) => k && k === kinds[ 0 ] ) && ( ! style || ( style.format && style.counts ) );
	const kind = kinds.every( ( k ) => null === k ) ? 'none' : same ? kinds[ 0 ] : null;
	if ( ! kind ) {
		const why = style && ! style.format ? 'number styles' : style && ! style.counts ? 'numbers (they do not count up from 1)' : 'item markers';
		out.notes.push( `the draft's ${ why } differ (${ seen.map( ( s ) => ( s?.drawn ? [ s.drawn.kind, ...( s.drawn.formats || [] ) ].join( ' ' ) : 'none' ) ).join( ', ' ) }), so the list's marker type is not chosen` );
		return out;
	}
	const { marker, number } = markerSettingsFrom( enumSettings( db, block ) );
	const slot = at[ 1 ] ?? '';
	if ( ! marker || ! marker.values.includes( kind ) ) {
		out.unmapped.push( { property: 'marker', value: kind, slot, reason: `the draft draws a ${ kind } marker at every item and ${ block } has no setting whose allowed values in the framework DB include ${ kind }, so the list's marker type is not written` } );
		return out;
	}
	attributes[ marker.attr_name ] !== kind && out.writes.push( { attr: marker.attr_name, value: kind, merge: 'replace' } );
	out.decided = { [ marker.attr_name ]: kind };
	if ( style ) {
		if ( number?.values.includes( style.format ) ) {
			// An absent setting holds its default: the default style is written only over another value.
			const held = attributes[ number.attr_name ] ?? number.fallback;
			held !== style.format && out.writes.push( { attr: number.attr_name, value: style.format, merge: 'replace' } );
			out.decided[ number.attr_name ] = style.format;
		} else if ( number || 'decimal' !== style.format ) {
			out.unmapped.push( { property: 'list-style-type', value: style.format, slot, reason: `the draft numbers its items ${ style.format } and ${ block } has no setting whose allowed values in the framework DB include ${ style.format }, so the list's number style is not written` } );
		}
	}
	return out;
}

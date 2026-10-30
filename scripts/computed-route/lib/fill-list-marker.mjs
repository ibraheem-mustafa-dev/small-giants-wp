// The item markers of a list block (Spec 48 FR-48-82, the marker part): each item's own marker or glyph, paired with the
// block's item marker part by lib/skeleton-part-pairing.mjs, is read with the icon reader (lib/fill-icon.mjs::iconDecisions)
// and written to that item; the list's marker type and number style follow what the draft draws at every item. Nothing here
// names a block:
//   - the item array is the block's array setting whose item schema (`array_item_schema`) holds an icon setting the reader
//     writes (iconSource, iconName, iconSvg, brandName, iconFill); a glyph marker goes to the item field whose declared role
//     (`array_item_schema.role`) is an icon name (icon-slug or icon), with the item's iconSource set to emoji;
//   - an item's marker is, in order: the part under the item's repeated step that holds the block's svg (the part tree's
//     `svg` kind), at the node's paired slot for that copy; else the CSS marker the draft draws on the item's own element,
//     paired with the block's `::marker` on its item part (`<item slot>::marker`): the read's list-style type, list-style
//     image and ::marker content (lib/fill-read-collect.mjs `marker`), or a glyph, counter or painted dot on the item's
//     ::before when its list style is none;
//   - what a marker draws: an svg is `icon`; an ordinal (1, 01, 1., (1), i., a)) or a counter / numeric list-style type is
//     `numbered` with its number style (decimal, decimal-leading-zero, lower-roman, ...); a dot or bar glyph (•, ·, ▪, –,
//     ...), a disc, circle or square list style or a painted mark with no content is `bullet`; any other glyph is `emoji`;
//     a list-style image is `image`; no marker at any item is `none`;
//   - the marker type is the block's enum setting whose allowed values (the framework DB's `enum_values`, never a list
//     here) include at least three of the marker kinds, and the number style the block's other enum setting whose allowed
//     values include `decimal` (the CSS list-style-type names). A value the DB does not list is a named UNMAPPED row, never
//     written. Typed ordinals must count up from 1; CSS numbering counts itself.
// Returns { writes: [{ attr, value, merge }], unmapped: [{ property, value, slot, reason }], notes, decided }.
import { enumSettings } from './db.mjs';
import { iconDecisions, ICON_SETTINGS } from './fill-icon.mjs';
import { partTree } from './skeleton-part-pairing.mjs';

const NTH = /:nth-of-type\((\d+)\)/g;
const LAST_NTH = /^\.[^ >]+:nth-of-type\((\d+)\)$/;
const MARKERS = [ 'icon', 'emoji', 'bullet', 'numbered', 'none' ];
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

const romanValue = ( s ) => {
	const d = [ ...s.toLowerCase() ].map( ( c ) => ROMAN[ c ] );
	return d.every( Boolean ) ? d.reduce( ( t, v, i ) => t + ( v < ( d[ i + 1 ] ?? 0 ) ? -v : v ), 0 ) : null;
};

// A typed ordinal ("1", "01", "1.", "(1)", "i.", "a)"): { n, formats } (the number styles that print it), else null.
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
const glyph = ( text ) => {
	const w = String( text ).trim();
	const o = ordinal( w );
	if ( o ) {
		return { kind: 'numbered', n: o.n, formats: o.formats };
	}
	return BULLET_GLYPHS.test( w ) ? { kind: 'bullet' } : { kind: 'emoji', glyph: w };
};

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

// Each item copy's marker among `slots` (the node's paired slots): { <copy number>: slot }. A copy's marker part (the svg
// part under its repeated step) is its marker; a copy with none pairs its own item part's CSS marker with the block's
// `::marker` (`<item slot>::marker`) where `reads` shows the item's element drawing one.
export function markerSlots( { db, block, cal, slots, reads = {} } ) {
	const T = partTree( { db, block, cal, paint: cal?.elements || {} } );
	const out = {};
	for ( const s of slots ) {
		const hits = [ ...s.matchAll( NTH ) ];
		// A part under the repeated step, never the repeated item part itself.
		if ( ! hits.length || LAST_NTH.test( s.split( ' > ' ).at( -1 ) ) || ! T.kinds( s ).has( 'svg' ) ) {
			continue;
		}
		const k = Number( hits.at( -1 )[ 1 ] );
		( ! out[ k ] || s.length < out[ k ].length ) && ( out[ k ] = s );
	}
	// The item part of each copy: the shortest slot ending at a repeated class step for that copy.
	const items = {};
	for ( const s of slots ) {
		const k = Number( LAST_NTH.exec( s.split( ' > ' ).at( -1 ) )?.[ 1 ] ?? NaN );
		Number.isFinite( k ) && ( ! items[ k ] || s.length < items[ k ].length ) && ( items[ k ] = s );
	}
	for ( const [ k, s ] of Object.entries( items ) ) {
		const r = reads[ s ];
		! out[ k ] && r && ! r.missing && drawnByCss( r ) && ( out[ k ] = `${ s }::marker` );
	}
	return out;
}

// The read a paired marker slot stands for: { slot, drawn }.
const readAt = ( slot, reads ) => {
	if ( slot.endsWith( '::marker' ) ) {
		const r = reads[ slot.slice( 0, -'::marker'.length ) ];
		return r && ! r.missing ? { slot, read: r, drawn: drawnByCss( r ) } : null;
	}
	const r = reads[ slot ];
	return r && ! r.missing ? { slot, read: r, drawn: drawnByPart( r ) } : null;
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

// The block's enum setting whose allowed values in the DB include at least three marker kinds, and the one (another)
// whose values include `decimal`: { marker, number } (each { attr_name, values } or null).
function markerSettings( db, block ) {
	const rows = enumSettings( db, block ).map( ( r ) => {
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
	if ( ! Array.isArray( items ) || ! items.length ) {
		return out;
	}
	const at = markerSlots( { db, block, cal, slots: Object.keys( reads ), reads } );
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
	const { marker, number } = markerSettings( db, block );
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

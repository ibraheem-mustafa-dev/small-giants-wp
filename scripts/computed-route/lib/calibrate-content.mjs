// The content side of calibration (FR-47-2, Spec 47 §3.2): which elements a setting makes appear or disappear
// (presence), which element's text it prints (text), and which element it makes a link (link). These settings paint no
// CSS property, so lib/db.mjs::attrsFor never returns them and the slot map cannot see them; they are queried by their
// framework-database `role` instead, and read for node existence, text content and link attributes rather than for
// computed style. The style reader is lib/calibrate-read.mjs; this is its content counterpart.
import { WIDTHS, CAL_PREFIX } from './calibrate-props.mjs';
import { preconditionsFor } from './calibrate-instances.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';
import { EDITOR_TIMEOUT_MS } from './calibrate-chunk.mjs';

// The marker a text setting prints: letters and digits only, so esc_html, esc_attr, sanitize_text_field and wp_kses
// all leave it unchanged, wp_trim_words cannot split it (it carries no space), and percent-encoding is a no-op. It is
// readable as no hex colour, no palette slug and no CSS value, so it can collide with neither real content nor a token.
export const MARKER_TEXT = 'crzq7marker';
// A numeric text setting (a review count, a rating) cannot hold letters; this is a count no default would use.
export const MARKER_NUMBER = 1379;
// A URL setting needs a valid URL to survive esc_url and render an anchor at all. `.invalid` is reserved by RFC 2606,
// so it never resolves. MARKER_SLUG is its needle: unreserved characters only, so a block composing the URL into a
// query string leaves the needle whole.
export const MARKER_SLUG = 'cr-zq7-marker';
export const MARKER_URL = `https://${ MARKER_SLUG }.invalid/`;
// A phone setting: Ofcom's 07700 900xxx drama range in international form, never a real number.
export const MARKER_PHONE = '447700900137';

// The DOM attributes a link setting can write, in the order a reading prefers them: the real link attribute first, a
// data attribute a script reads last.
export const LINK_ATTRS = [ 'href', 'src', 'target', 'action', 'formaction', 'data-href', 'data-url' ];

// The framework-database roles each content read covers. Both halves of each pair are in scope (Bean, 2026-10-05 for
// text; the main thread, 2026-10-05 for link): splitting a pair leaves the larger half unreachable.
export const PRESENCE_ROLES = [ 'boolean-visibility', 'presence-boolean' ];
export const TEXT_ROLES = [ 'content', 'text-content' ];
export const LINK_ROLES = [ 'link-content', 'link-href' ];

const COLS = 'block_slug, attr_name, attr_type, default_value, enum_values, is_responsive, css_property, css_element, css_state, css_tier, tier_shape, box_family, source, role';
const list = ( roles ) => roles.map( () => '?' ).join( ', ' );

// One block's content settings by role, SGS-owned only (R-47-10: never native_wp or a core style). `db` is an
// lib/db.mjs::openDb handle, opened read-only. Returns { presence, text, link }.
export function contentRowsFor( db, block ) {
	const rowsOf = ( roles ) => db.prepare( `SELECT ${ COLS } FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' ) AND role IN ( ${ list( roles ) } )` ).all( block, ...roles ).map( ( r ) => ( { ...r } ) );
	return { presence: rowsOf( PRESENCE_ROLES ), text: rowsOf( TEXT_ROLES ), link: rowsOf( LINK_ROLES ) };
}

// A stored default_value is JSON ("_self", false); a value that will not parse is the literal string.
const defaultOf = ( row, schema ) => {
	if ( schema?.[ row.attr_name ] && 'default' in schema[ row.attr_name ] ) {
		return schema[ row.attr_name ].default;
	}
	try {
		return null == row.default_value ? undefined : JSON.parse( row.default_value );
	} catch {
		return row.default_value;
	}
};

const types = ( row, schema ) => [].concat( schema?.[ row.attr_name ]?.type || row.attr_type || [] );

// The marker for one content setting, or null when its shape can hold none (a list or object text setting holds many
// values, so no single marker string locates one element). kind: 'presence', 'text' or 'link'.
// Returns { label, attrs, needle }.
export function contentMarkerFor( row, kind, schema = {} ) {
	const name = row.attr_name;
	const t = types( row, schema );
	const def = defaultOf( row, schema );
	if ( 'presence' === kind ) {
		// The flip: a visibility boolean's opposite. Presence is read from what the flip renders, so it needs no needle.
		if ( ! t.includes( 'boolean' ) ) {
			return null;
		}
		return { label: 'presence', attrs: { [ name ]: ! def }, needle: null };
	}
	if ( 'text' === kind ) {
		if ( t.includes( 'number' ) || t.includes( 'integer' ) ) {
			return { label: 'text-number', attrs: { [ name ]: MARKER_NUMBER }, needle: String( MARKER_NUMBER ) };
		}
		return t.includes( 'string' ) ? { label: 'text', attrs: { [ name ]: MARKER_TEXT }, needle: MARKER_TEXT } : null;
	}
	if ( ! t.includes( 'string' ) ) {
		return null;
	}
	// A target setting holds a browsing context, never a URL: it is flipped to the other context.
	if ( /target$/i.test( name ) || [ '_self', '_blank' ].includes( def ) ) {
		const value = '_blank' === def ? '_self' : '_blank';
		return { label: 'link-target', attrs: { [ name ]: value }, needle: value };
	}
	if ( /phone|tel|whatsapp/i.test( name ) ) {
		return { label: 'link-phone', attrs: { [ name ]: MARKER_PHONE }, needle: MARKER_PHONE };
	}
	// A setting holding a whole URL takes a valid one; a setting holding a part of one (a message, a taxonomy slug)
	// takes the bare needle, which no URL validator rejects and no escaping changes.
	const whole = /(^|[a-z])url$|href/i.test( name );
	return { label: whole ? 'link-url' : 'link-part', attrs: { [ name ]: whole ? MARKER_URL : MARKER_SLUG }, needle: MARKER_SLUG };
}

// The values of a block's variant setting that get their own presence reading: every value but the one the default
// instance already renders. Values come from the framework database's variant_slots rows and from the setting's enum.
export function variantPresenceValues( schema, variant, current = {} ) {
	const attr = variant?.variantAttr;
	if ( ! attr ) {
		return [];
	}
	const resting = current[ attr ] ?? schema?.[ attr ]?.default;
	const all = [ ...( variant.variantSlots || [] ).map( ( s ) => s.variant_value ), ...( schema?.[ attr ]?.enum || [] ) ];
	return [ ...new Set( all.filter( ( v ) => v && v !== resting ) ) ];
}

// Every content instance for one block: one per presence row (its boolean flipped), one per other value of the block's
// variant setting, one per text row (its marker string) and one per link row (its marker URL). Each carries the
// preconditions its element needs (lib/calibrate-instances.mjs::preconditionsFor), so a setting gated by a show
// toggle or living under one variant still renders. Returns { instances, noMarker }.
export function planContentInstances( block, { contentRows, variant, schema = {}, fixture = {}, ctx = {} } ) {
	const base = { ...( fixture.attributes || {} ), ...( ( fixture.variants || [] )[ 0 ] || {} ) };
	const instances = [];
	const noMarker = new Set();
	// A marker needing preconditions is read against a baseline instance carrying the same preconditions and not the
	// marker, one per distinct set: otherwise everything the precondition itself renders (a whole variant) reads as the
	// setting's own effect. A marker needing none is read against the chunk's plain default instance (baseKey null).
	const addBase = ( pre ) => {
		const baseKey = `content:${ JSON.stringify( pre ) }`;
		if ( ! instances.some( ( i ) => i.isBase && i.baseKey === baseKey ) ) {
			instances.push( { key: `content-base-${ Object.keys( pre ).join( '-' ) }`, attrs: { ...base, ...pre }, variant: 0, isBase: true, baseKey } );
		}
		return baseKey;
	};
	const add = ( row, kind, marker, extra = {} ) => {
		const pre = preconditionsFor( row, schema, base, ctx );
		instances.push( {
			key: `content-${ kind }-${ row.attr_name }${ extra.value ? `-${ extra.value }` : '' }`,
			content: { attr: row.attr_name, kind, needle: marker.needle, ...( undefined === extra.value ? {} : { value: extra.value } ) },
			attrs: { ...base, ...pre, ...marker.attrs },
			variant: 0,
			baseKey: Object.keys( pre ).length ? addBase( pre ) : null,
		} );
	};
	for ( const [ kind, rows ] of [ [ 'presence', contentRows.presence ], [ 'text', contentRows.text ], [ 'link', contentRows.link ] ] ) {
		for ( const row of rows || [] ) {
			const marker = contentMarkerFor( row, kind, schema );
			marker ? add( row, kind, marker ) : noMarker.add( row.attr_name );
		}
	}
	const attr = variant?.variantAttr;
	for ( const value of variantPresenceValues( schema, variant, base ) ) {
		const row = { attr_name: attr, attr_type: 'string', css_property: null, role: 'variant' };
		add( row, 'presence', { label: `variant-${ value }`, attrs: { [ attr ]: value }, needle: null }, { value } );
	}
	return { instances, noMarker };
}

// Every needle the page must be searched for, once each.
export const needlesOf = ( instances ) => [ ...new Set( instances.map( ( i ) => i.content?.needle ).filter( Boolean ) ) ];

// In-page: for every element of each instance (or only the instance `only`), whether it is present and which of
// `needles` its text and its link attributes carry. Self-contained; pathSrc is elementPath's source. Element keys are
// the style reader's keys exactly (lib/calibrate-read.mjs), so a content path and a slot path are the same path.
export function readContentInPage( [ count, prefix, pathSrc, needles, linkAttrs, only ] ) {
	// eslint-disable-next-line no-new-func
	const pathOf = new Function( `return (${ pathSrc });` )();
	const lower = needles.map( ( n ) => String( n ).toLowerCase() );
	// Case-insensitive, so a block that upper-cases a label in PHP still reports its marker.
	const found = ( value ) => {
		if ( null == value || '' === value ) {
			return [];
		}
		const haystack = String( value ).toLowerCase();
		return needles.filter( ( _, i ) => haystack.includes( lower[ i ] ) );
	};
	const collect = ( els, top, keyPrefix ) => {
		for ( const el of [ top, ...top.querySelectorAll( '*' ) ] ) {
			const p = pathOf( el, top );
			const key = keyPrefix ? ( p ? `${ keyPrefix } > ${ p }` : keyPrefix ) : p;
			if ( key in els ) {
				continue;
			}
			// shown: the element has at least one rendered box and is not hidden. An element with display:none has no
			// boxes, so "rendered but not displayed" reads as absent exactly as a node missing from the tree does.
			const shown = el.getClientRects().length > 0 && 'hidden' !== getComputedStyle( el ).visibility;
			const text = found( el.textContent );
			const attrs = {};
			for ( const name of linkAttrs ) {
				const hit = found( el.getAttribute( name ) );
				if ( hit.length ) {
					attrs[ name ] = hit;
				}
			}
			els[ key ] = { shown, ...( text.length ? { t: text } : {} ), ...( Object.keys( attrs ).length ? { a: attrs } : {} ) };
		}
	};
	const out = [];
	for ( let n = 0; n < count; n++ ) {
		const root = undefined === only || only === n ? document.querySelector( `.${ prefix }${ n }` ) : null;
		if ( ! root ) {
			out.push( null );
			continue;
		}
		const els = {};
		collect( els, root, '' );
		const ids = [ ...new Set( [ root, ...root.querySelectorAll( '[aria-controls]' ) ].flatMap( ( e ) => ( e.getAttribute( 'aria-controls' ) || '' ).split( /\s+/ ) ).filter( Boolean ) ) ];
		ids.map( ( id ) => document.getElementById( id ) ).filter( ( t ) => t && ! root.contains( t ) ).forEach( ( t, i ) => collect( els, t, i ? `@controls:${ i + 1 }` : '@controls' ) );
		out.push( els );
	}
	return out;
}

// Reads every instance's content at each width, each width in its own page of the logged-in context, as the style
// reader does. Returns { width: [ instanceReads ] }. A block with no content instance is never read.
export async function readContentAll( page, url, instances, needles ) {
	const out = {};
	const ctx = page.context();
	await Promise.all( WIDTHS.map( async ( w ) => {
		const p = await ctx.newPage();
		try {
			await p.setViewportSize( { width: w, height: 900 } );
			await p.goto( `${ url }${ url.includes( '?' ) ? '&' : '?' }cb=${ Date.now() }`, { waitUntil: 'domcontentloaded', timeout: EDITOR_TIMEOUT_MS } );
			await p.waitForSelector( `.${ CAL_PREFIX }0`, { state: 'attached', timeout: EDITOR_TIMEOUT_MS } );
			await p.waitForTimeout( 800 );
			out[ w ] = await p.evaluate( readContentInPage, [ instances.length, CAL_PREFIX, elementPath.toString(), needles, LINK_ATTRS, undefined ] );
		} finally {
			await p.close();
		}
	} ) );
	return out;
}

const depth = ( p ) => ( '' === p ? 0 : p.split( ' > ' ).length );
// Every path a read shows as present at any width. Both sides are read at the same widths, so an element that renders
// only at one width is present on both sides and belongs to neither list.
const presentPaths = ( read ) => new Set( WIDTHS.flatMap( ( w ) => Object.entries( read?.[ w ] || {} ).filter( ( [ , e ] ) => e?.shown ).map( ( [ p ] ) => p ) ) );

// The elements a setting's flip makes appear and disappear. Presence is existence and display only: a setting that
// restyles an element without adding or removing it records nothing, whatever it changed.
export function presenceFrom( defRead, markRead ) {
	const before = presentPaths( defRead );
	const after = presentPaths( markRead );
	const sort = ( set, other ) => [ ...set ].filter( ( p ) => ! other.has( p ) ).sort( ( a, b ) => depth( a ) - depth( b ) || a.localeCompare( b ) );
	return { shows: sort( after, before ), hides: sort( before, after ) };
}

// The element whose text a setting prints: the deepest element carrying the marker, because every ancestor's
// textContent contains it too. reachedAt: the widths the marker string was found at. Null when no element carries it.
export function textFrom( needle, markRead ) {
	const deepestAt = ( w ) => Object.entries( markRead?.[ w ] || {} ).filter( ( [ , e ] ) => ( e?.t || [] ).includes( needle ) )
		.map( ( [ p ] ) => p ).reduce( ( a, p ) => ( undefined === a || depth( p ) > depth( a ) ? p : a ), undefined );
	const perWidth = WIDTHS.map( ( w ) => [ w, deepestAt( w ) ] ).filter( ( [ , p ] ) => undefined !== p );
	if ( ! perWidth.length ) {
		return null;
	}
	const path = perWidth.map( ( [ , p ] ) => p ).reduce( ( a, p ) => ( depth( p ) > depth( a ) ? p : a ) );
	return { path, reachedAt: perWidth.map( ( [ w ] ) => w ).sort( ( a, b ) => a - b ) };
}

// The element a setting makes a link and the DOM attribute it writes: the shallowest element carrying the marker in
// the most preferred attribute (LINK_ATTRS order), since the anchor itself holds the attribute. Null when none does.
export function linkFrom( needle, markRead ) {
	const hits = WIDTHS.flatMap( ( w ) => Object.entries( markRead?.[ w ] || {} ).flatMap( ( [ p, e ] ) => LINK_ATTRS.filter( ( a ) => ( e?.a?.[ a ] || [] ).includes( needle ) ).map( ( a ) => ( { path: p, attr: a } ) ) ) );
	if ( ! hits.length ) {
		return null;
	}
	const best = hits.reduce( ( a, h ) => {
		const rank = ( x ) => [ LINK_ATTRS.indexOf( x.attr ), depth( x.path ) ];
		const [ ra, da ] = rank( a );
		const [ rh, dh ] = rank( h );
		return rh < ra || ( rh === ra && dh < da ) ? h : a;
	} );
	return { path: best.path, attr: best.attr };
}

// The cache file's `text`, `presence` and `link` keys, from the block's read content instances. A key with no entry is
// omitted entirely, and so is an entry a reading could not locate. A variant value is keyed `<attr>=<value>`.
export function collectContent( instances ) {
	const text = {};
	const presence = {};
	const link = {};
	for ( const inst of instances ) {
		const { attr, kind, needle, value } = inst.content || {};
		if ( ! attr ) {
			continue;
		}
		if ( 'presence' === kind ) {
			const p = presenceFrom( inst.contentDef, inst.contentRead );
			if ( p.shows.length || p.hides.length ) {
				presence[ undefined === value ? attr : `${ attr }=${ value }` ] = p;
			}
			continue;
		}
		const found = 'text' === kind ? textFrom( needle, inst.contentRead ) : linkFrom( needle, inst.contentRead );
		if ( found ) {
			( 'text' === kind ? text : link )[ attr ] = found;
		}
	}
	return { ...( Object.keys( text ).length ? { text } : {} ), ...( Object.keys( presence ).length ? { presence } : {} ), ...( Object.keys( link ).length ? { link } : {} ) };
}

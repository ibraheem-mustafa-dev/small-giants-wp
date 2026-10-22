// Images for Fill (FR-48-39, the image part): a draft <img> (or the <figure> / <picture> holding one) reaches the
// image settings of the block that copies it, through the media map `media-upload.mjs` wrote for the target site
// (FR-48-58). The block's own image settings come from the framework DB, never a per-block table: a block's
// `image-alt` row names its alt setting, and that row's `alt_companion_attr` names the setting holding the image's URL;
// the attachment id setting is that URL setting with `Url` changed to `Id` (else `Id` appended), kept only when the
// block.json declares it; a block with a `caption` string setting takes the figcaption's words.
// The draft's own address is never written: an image the media map does not hold is a named gap row, and a block with
// no image setting (or several, which Fill cannot choose between) is a gap too.
// Returns { writes: [{ attr, value, merge }], unmapped: [{ property, value, slot, reason }], notes }.
import fs from 'fs';
import { paintedAsset } from './media-upload.mjs';

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it).
export const COVERAGE_WRITES = [ 'html:img', 'html-attr:img.src', 'html-attr:img.alt', 'html:figure', 'html:figcaption' ];

const empty = () => ( { writes: [], unmapped: [], notes: [] } );
const unset = ( v ) => undefined === v || null === v || '' === v || 0 === v;
const escapeText = ( s ) => String( s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );

// The client's media map, or null when media-upload has not written one.
export const readMediaMap = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );

// The image settings of one block from the DB: [{ alt, url }] for each `image-alt` row that names its URL setting.
export function imageSlots( db, block ) {
	return db.prepare( "SELECT attr_name, alt_companion_attr FROM block_attributes WHERE block_slug = ? AND role = 'image-alt' AND alt_companion_attr IS NOT NULL ORDER BY attr_name" )
		.all( block ).map( ( r ) => ( { alt: r.attr_name, url: r.alt_companion_attr } ) );
}

// A draft image address as a path inside the draft: the query and fragment removed, the draft's own origin removed,
// leading `/`, `./` and `../` removed. null for an address that is not a file of the draft (data:, blob:, another origin, empty).
export function draftPath( src, origin = '' ) {
	let s = String( src ?? '' ).trim().split( /[?#]/ )[ 0 ];
	if ( ! s || /^(?:data|blob|javascript):/i.test( s ) ) {
		return null;
	}
	if ( /^(?:https?:)?\/\//i.test( s ) ) {
		let u;
		try {
			u = new URL( s, 'https://x/' );
		} catch {
			return null;
		}
		if ( ! origin || u.origin !== origin ) {
			return null;
		}
		s = u.pathname;
	}
	s = decodeURI( s ).replace( /^(?:\.{0,2}\/)+/, '' );
	return s || null;
}

// The media-map entries a draft path names: the files of `site` whose repo path is the draft path or ends with it at a
// folder boundary (sites/<client>/handoff/assets/x.png for the draft's assets/x.png).
export function mapEntries( map, site, p ) {
	return ( map?.sites?.[ site ]?.files || [] ).filter( ( e ) => e.asset === p || String( e.asset ).endsWith( `/${ p }` ) );
}

// The setting that holds the attachment id for a URL setting, or null when the block declares none.
export function idSetting( schema, urlAttr ) {
	const id = /Url$/.test( urlAttr ) ? urlAttr.replace( /Url$/, 'Id' ) : `${ urlAttr }Id`;
	return schema && id in schema ? id : null;
}

// img: the draft element's image read { tag, src, alt, caption } (null when the element holds no single image). A
// <figure> or <picture> mapped to a block with no image setting is a wrapper, not a gap; a bare <img> there is one.
// media: { map, site, origin } (map null when media-map.json is missing). attributes: what the node already holds
// (a setting that holds a value is kept; a difference is a note).
export function mediaDecisions( { slots, schema, attributes = {}, img, media = {} } ) {
	const out = empty();
	if ( ! img ) {
		return out;
	}
	const gap = ( reason ) => out.unmapped.push( { property: 'image', value: img.src, slot: '', reason } );
	if ( ! slots.length && 'img' !== img.tag ) {
		return out;
	}
	if ( 1 !== slots.length ) {
		gap( slots.length ? `the block has ${ slots.length } image settings (${ slots.map( ( s ) => s.url ).join( ', ' ) }) and Fill cannot choose between them` : 'no image setting: the framework DB lists no image-alt setting for this block' );
		return out;
	}
	const [ slot ] = slots;
	const p = draftPath( img.src, media.origin );
	if ( null === p ) {
		gap( `the draft image "${ img.src }" is not a file of the draft, so it has no uploaded copy; add it to sites/<client>/assets and run media-upload` );
		return out;
	}
	if ( ! media.map ) {
		gap( `no media map: run media-upload.mjs for the site before Fill, so "${ p }" has an attachment` );
		return out;
	}
	const hits = mapEntries( media.map, media.site, p );
	if ( ! hits.length ) {
		gap( `"${ p }" is not in the media map for ${ media.site }: run media-upload.mjs so it has an attachment` );
		return out;
	}
	if ( new Set( hits.map( ( h ) => h.id ) ).size > 1 ) {
		gap( `"${ p }" matches ${ hits.length } uploaded files (${ hits.map( ( h ) => h.asset ).join( ', ' ) }), different attachments` );
		return out;
	}
	const [ hit ] = hits;
	const put = ( attr, value ) => {
		if ( unset( attributes[ attr ] ) ) {
			out.writes.push( { attr, value, merge: 'replace' } );
		} else if ( String( attributes[ attr ] ) !== String( value ) ) {
			out.notes.push( `${ attr } holds "${ attributes[ attr ] }"; the draft image is "${ value }"` );
		}
	};
	put( slot.url, hit.url );
	const idAttr = idSetting( schema, slot.url );
	idAttr && put( idAttr, hit.id );
	if ( 'string' === typeof img.alt && '' !== img.alt.trim() ) {
		put( slot.alt, img.alt.trim() );
	} else {
		out.notes.push( `the draft image "${ p }" has ${ null === img.alt ? 'no alt' : 'an empty alt' }, so ${ slot.alt } is left as it is` );
	}
	if ( img.caption ) {
		if ( schema && 'string' === [].concat( schema.caption?.type || [] )[ 0 ] ) {
			put( 'caption', escapeText( img.caption ) );
		} else {
			out.unmapped.push( { property: 'image', value: img.caption, slot: '', reason: 'the draft figure has a figcaption and the block has no caption setting' } );
		}
	}
	return out;
}

// The render check (FR-48-58's identity): the painted image URL on the built page is the attachment the clone mapped.
// painted: the URL the page paints; id: the attachment id Fill wrote. Returns { ok, reason }.
export function paintedImageCheck( { map, site, painted, id } ) {
	const hit = paintedAsset( map, site, painted );
	if ( ! hit ) {
		return { ok: false, reason: `the painted image ${ painted } is no file in the media map for ${ site }` };
	}
	return hit.id === id ? { ok: true, reason: `the painted image is ${ hit.asset } (attachment ${ id })` } : { ok: false, reason: `the painted image is ${ hit.asset } (attachment ${ hit.id }); Fill wrote attachment ${ id }` };
}

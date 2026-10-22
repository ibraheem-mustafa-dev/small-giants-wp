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
import { templateKeyOf } from './fact-key.mjs';

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it).
export const COVERAGE_WRITES = [
	'html-attr:img.alt',
	'html-attr:img.src',
	'html:figcaption',
	'html:figure',
	'html:img',
];

const empty = () => ( { writes: [], unmapped: [], notes: [], checks: [] } );
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
	// A malformed escape (`%E0` on its own) is not a URL-encoded name: the path is kept as written.
	try {
		s = decodeURI( s );
	} catch {
		// keep `s` as written
	}
	s = s.replace( /^(?:\.{0,2}\/)+/, '' );
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

// What the fact record states about the image a draft element is (lib/fact-record.mjs: `elements[key].assets` holds the
// file's intrinsic ratio, `elements[key].alt` the placeholder an image-slot element carries as its alt): { alt, ratio,
// asset } for the element's template key, each null when the record does not state it. A placeholder that is a `{{ }}`
// hole is run-time text, so it is no alt.
export function factImage( facts, finderTpl, rootComponent = null ) {
	const el = facts?.elements?.[ templateKeyOf( finderTpl, rootComponent ) ];
	if ( ! el ) {
		return null;
	}
	const alt = el.alt && ! el.alt.hole && String( el.alt.placeholder ?? '' ).trim() ? String( el.alt.placeholder ).trim() : null;
	const asset = ( el.assets || [] )[ 0 ] ?? null;
	return { alt, ratio: asset?.ratio ?? null, asset: asset?.path ?? null };
}

// The image a node holds: the node's own element when it is one, else the single image any one of its descendant
// elements (a nested slot) reads. snaps: { slot: the element's desktop read }. null when none or when two slots each hold one.
export function nestedImage( snaps ) {
	const own = snaps[ '' ]?.img;
	if ( own ) {
		return own;
	}
	const inner = Object.entries( snaps ).filter( ( [ , s ] ) => s && ! s.missing && s.img ).map( ( [ slot, s ] ) => ( { ...s.img, slot } ) );
	return 1 === inner.length ? inner[ 0 ] : null;
}

// img: the draft element's image read { tag, src, alt, caption } (null when the element holds no single image). A
// <figure> or <picture> mapped to a block with no image setting is a wrapper, not a gap; a bare <img> there is one.
// media: { map, site, origin } (map null when media-map.json is missing). attributes: what the node already holds
// (a setting that holds a value is kept; a difference is a note).
export function mediaDecisions( { slots, schema, attributes = {}, img, media = {}, fact = null } ) {
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
	const alt = 'string' === typeof img.alt && '' !== img.alt.trim() ? img.alt.trim() : fact?.alt ?? null;
	if ( alt ) {
		put( slot.alt, alt );
	} else {
		out.notes.push( `the draft image "${ p }" has ${ null === img.alt ? 'no alt' : 'an empty alt' }, so ${ slot.alt } is left as it is` );
	}
	// The live check's input: the attachment Fill wrote (or the setting already held) and the image's stated ratio.
	out.checks.push( { slot: img.slot ?? '', attr: slot.url, idAttr, id: hit.id, url: hit.url, asset: hit.asset, ratio: fact?.ratio ?? null, alt: alt ?? null } );
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
// ratio: the fact record's stated intrinsic ratio of the draft's file; natural: the painted image's naturalWidth and
// naturalHeight. When both are given the painted ratio must match the stated one within 2%.
export function paintedImageCheck( { map, site, painted, id, ratio = null, natural = null } ) {
	const hit = paintedAsset( map, site, painted );
	if ( ! hit ) {
		return { ok: false, reason: `the painted image ${ painted } is no file in the media map for ${ site }` };
	}
	if ( hit.id !== id ) {
		return { ok: false, reason: `the painted image is ${ hit.asset } (attachment ${ hit.id }); Fill wrote attachment ${ id }` };
	}
	if ( ratio && natural?.w > 0 && natural?.h > 0 && Math.abs( natural.w / natural.h - ratio ) / ratio > 0.02 ) {
		return { ok: false, reason: `the painted image ${ hit.asset } is ${ natural.w }x${ natural.h } (ratio ${ ( natural.w / natural.h ).toFixed( 3 ) }); the draft's file states ratio ${ ratio.toFixed( 3 ) }` };
	}
	return { ok: true, reason: `the painted image is ${ hit.asset } (attachment ${ id })` };
}

// The image rows of the confirm record (FR-48-36): one per image Fill mapped, read at the desktop width, for the live
// check to settle with paintedImageCheck. images: Fill's `images` list ({ node, index, block, attr, idAttr, id, url,
// asset, ratio, alt }). Draft side and declared side are both the draft's own file (the media map entry), so D–R agrees
// by construction; the live half decides.
export function imageRecords( { images } ) {
	return ( images || [] ).map( ( c ) => ( {
		node: c.node, block: c.block, attribute: c.attr, property: 'image', kind: 'image', state: 'default',
		slot: c.slot ?? '', draftId: c.draftId ?? null, width: 1440,
		emitted: c.url, imageId: c.id, asset: c.asset, ratio: c.ratio ?? null, alt: c.alt ?? null,
		declared: c.asset, renderedDraft: c.asset, dr: 'agree', tolerance: null, verdict: 'confirmed', renderedLive: null,
	} ) );
}

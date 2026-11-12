// Images for Fill (FR-48-39, the image part): the media a draft element draws (an <img>, a <picture>, a <video>, an <iframe>
// or an inline <svg>, read at 375, 768 and 1440 by lib/fill-read-collect.mjs) reaches the media slot of the block that copies
// it (Spec 49 section 11, lib/media/): the slot is the one `supports.sgs.mediaElements` declares for the media's placement
// (lib/media/slots.mjs), the Source is written per device with the kind the visible element is at each width, and the file is
// the attachment the media map `media-upload.mjs` wrote for the target site (FR-48-58). A block with a `caption` string setting
// on the slot takes the figcaption's words.
// The draft's own address is never written: an image the media map does not hold is a named gap row, and a block with no
// matching slot (or several, which Fill cannot choose between) is a gap too. A stock preview the draft paints from a stock
// host (lib/media-stock.mjs::stockKey) is the map's `stock: true` entry for its address without the query.
// Returns { writes: [{ attr, value, merge }], unmapped: [{ property, value, slot, reason }], notes, checks }.
import fs from 'fs';
import { paintedAsset } from './media-upload.mjs';
import { stockKey } from './media-stock.mjs';
import { templateKeyOf } from './fact-key.mjs';
import { recordSite } from './cache.mjs';
import { mediaWrites } from './media/write.mjs';

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it).
export const COVERAGE_WRITES = [
	'html-attr:img.alt',
	'html-attr:img.src',
	'html:figcaption',
	'html:figure',
	'html:img',
];


// The client's media map, or null when media-upload has not written one.
export const readMediaMap = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );

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
	return ( map?.sites?.[ recordSite( site ) ]?.files || [] ).filter( ( e ) => e.asset === p || String( e.asset ).endsWith( `/${ p }` ) );
}

// The media-map entries a stock preview names: the `stock: true` files of `site` whose asset is the preview's address
// without the query (lib/media-stock.mjs::stockKey, the key media-upload.mjs uploads it under).
export function stockEntries( map, site, key ) {
	return ( map?.sites?.[ recordSite( site ) ]?.files || [] ).filter( ( e ) => e.stock && e.asset === key );
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

// The figcaption words of the one figure a node holds: the node's own element's, else the single descendant slot's that has
// one. snaps: { slot: the element's read }. null when none or when two slots each have one.
export function captionOf( snaps ) {
	const own = snaps[ '' ]?.img?.caption;
	if ( own ) {
		return own;
	}
	const inner = Object.values( snaps ).filter( ( s ) => s && ! s.missing && s.img?.caption ).map( ( s ) => s.img.caption );
	return 1 === inner.length ? inner[ 0 ] : null;
}

// The media showing at one width across a node's elements: the node's own element's list when it is drawn and lists media
// (it holds its descendants' media), else each descendant slot's. snaps: { slot: the element's read at that width }.
export function mediaAt( snaps ) {
	const own = snaps[ '' ];
	if ( own && ! own.missing ) {
		return own.media || [];
	}
	return Object.values( snaps ).flatMap( ( s ) => ( s && ! s.missing ? s.media || [] : [] ) );
}

// The slot of the one picture a node holds, the image its image settings describe: the node's own element when it is a
// picture (an image read, or a picture's own name), else the single descendant slot that is one. snaps: { slot: the
// element's desktop read }. null when none or when two slots each are one.
export function pictureSlotOf( snaps ) {
	const is = ( s ) => !! ( s && ! s.missing && ( s.img || s.imageName ) );
	if ( is( snaps[ '' ] ) ) {
		return '';
	}
	const inner = Object.entries( snaps ).filter( ( [ , s ] ) => is( s ) ).map( ( [ slot ] ) => slot );
	return 1 === inner.length ? inner[ 0 ] : null;
}

// The uploaded attachment for a draft media address: { hit } or { reason } (a gap row's words). media: { map, site, origin }
// (map null when media-map.json is missing).
export function resolveMedia( src, media = {} ) {
	const file = draftPath( src, media.origin );
	const stock = null === file ? stockKey( src ) : null;
	if ( null === file && null === stock ) {
		return { reason: `the draft image "${ src }" is not a file of the draft, so it has no uploaded copy; add it to sites/<client>/assets and run media-upload` };
	}
	const p = file ?? stock;
	if ( ! media.map ) {
		return { reason: `no media map: run media-upload.mjs for the site before Fill, so "${ p }" has an attachment` };
	}
	const hits = null === file ? stockEntries( media.map, media.site, stock ) : mapEntries( media.map, media.site, p );
	if ( ! hits.length ) {
		return { reason: `${ null === file ? 'the stock preview ' : '' }"${ p }" is not in the media map for ${ media.site }: run media-upload.mjs so it has an attachment` };
	}
	if ( new Set( hits.map( ( h ) => h.id ) ).size > 1 ) {
		return { reason: `"${ p }" matches ${ hits.length } uploaded files (${ hits.map( ( h ) => h.asset ).join( ', ' ) }), different attachments` };
	}
	return { hit: hits[ 0 ] };
}

// slots: the block's media slots (lib/media/slots.mjs::blockMediaSlots). reads: { 1440, 768, 375: the media showing at that
// width } (mediaAt per width). attributes: what the node already holds (a setting that holds a value is kept; a difference
// is a note). media: { map, site, origin }. caption: captionOf's words.
export function mediaDecisions( { slots, attributes = {}, reads, media = {}, fact = null, caption = null } ) {
	return mediaWrites( { slots, attributes, reads, resolve: ( src ) => resolveMedia( src, media ), fact, caption } );
}

// Whether a skeleton handover is settled by the node's picture: the page editor's presence row on the node's own element
// (a split hero's "choose the image" row) once the node's image settings hold the draft's attachment. checks: the
// `checks` mediaDecisions returned for the node (one per image it wrote or found already held).
export const pictureSettles = ( h, checks ) => ( checks || [] ).length > 0 && 'content-page' === h?.owner && 'presence' === h?.kind && '' === ( h?.slot ?? '' );

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

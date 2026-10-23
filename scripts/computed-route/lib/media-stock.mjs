// Stock previews for the media upload (Spec 48 FR-48-58, FR-48-33): the stock-host images a draft paints are found in
// the draft's own source, downloaded once each, and uploaded as `stock: true` entries that Bean replaces later.
//   - found: every `*.dc.html` under `sites/<client>/handoff/` is read for URLs on a stock host
//     (lib/intake-sandbox.mjs::STOCK_HOSTS) and, in a file that builds a URL from a photo ID (`…/photo-' + pid`), for
//     every photo-ID string literal, since the draft paints those through the built URL. A painted image is one
//     identity, its URL without the query (`stockKey`), however many sizes the draft asks for.
//   - downloaded: https only, an image content type only, at most `MAX_STOCK_BYTES`, at the largest width the draft asks
//     for (capped at `MAX_STOCK_WIDTH`); the sha256 of what was downloaded and its source URL go in the map entry.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { STOCK_HOSTS } from './intake-sandbox.mjs';

export const MAX_STOCK_BYTES = 8 * 1024 * 1024;
export const MAX_STOCK_WIDTH = 2400;
export const DEFAULT_STOCK_WIDTH = 1600;
export const STOCK_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };

const URL_RE = /https:\/\/[^\s"'`()<>,\\]+/gi;
const PHOTO_PATH = /^\/photo-[A-Za-z0-9_-]{8,}$/;
const PHOTO_ID = /(['"])(\d{8,}-[0-9a-f]{12})\1/g;
const unescape = ( s ) => s.replace( /&amp;/g, '&' );

// A painted stock URL's identity: scheme, host and path without the query or fragment; null when it is not an image on
// a stock host (`https://unsplash.com/photos/<id>` credit links included).
export function stockKey( url, hosts = STOCK_HOSTS ) {
	let u;
	try {
		u = new URL( unescape( String( url ) ) );
	} catch {
		return null;
	}
	return 'https:' === u.protocol && hosts.includes( u.hostname ) && PHOTO_PATH.test( u.pathname ) ? `https://${ u.hostname }${ u.pathname }` : null;
}

// The URL to download for a stock image: the Unsplash image host takes the width as `w` (with the format and crop
// parameters the draft itself uses); any other host is downloaded as written.
export const stockDownloadUrl = ( key, width ) => ( new URL( key ).hostname === 'images.unsplash.com' ? `${ key }?w=${ Math.min( width || DEFAULT_STOCK_WIDTH, MAX_STOCK_WIDTH ) }&q=80&auto=format&fit=crop` : key );

const lineOf = ( text, index ) => text.slice( 0, index ).split( '\n' ).length;

// The stock images a client's draft paints: [{ key, width, paintedAt: ['<file>:<line>', …] }] in a stable order.
export function stockImages( repo, client, hosts = STOCK_HOSTS ) {
	const dir = path.join( repo, 'sites', client, 'handoff' );
	const drafts = fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( ( f ) => f.endsWith( '.dc.html' ) ).sort() : [];
	const found = new Map();
	const note = ( key, width, where ) => {
		const row = found.get( key ) || { key, width: 0, paintedAt: [] };
		row.width = Math.max( row.width, width || 0 );
		if ( ! row.paintedAt.includes( where ) ) {
			row.paintedAt.push( where );
		}
		found.set( key, row );
	};
	for ( const file of drafts ) {
		const text = fs.readFileSync( path.join( dir, file ), 'utf8' );
		for ( const m of text.matchAll( URL_RE ) ) {
			const key = stockKey( m[ 0 ], hosts );
			if ( key ) {
				note( key, Number( new URL( unescape( m[ 0 ] ) ).searchParams.get( 'w' ) ) || 0, `${ file }:${ lineOf( text, m.index ) }` );
			}
		}
		const builds = hosts.find( ( h ) => new RegExp( `${ h.replace( /\./g, '\\.' ) }/photo-['"\`]` ).test( text ) );
		if ( builds ) {
			for ( const m of text.matchAll( PHOTO_ID ) ) {
				note( `https://${ builds }/photo-${ m[ 2 ] }`, 0, `${ file }:${ lineOf( text, m.index ) }` );
			}
		}
	}
	return [ ...found.values() ].sort( ( a, b ) => a.key.localeCompare( b.key ) );
}

// Downloads one stock image: { bytes, type, ext } or throws. https only (also after a redirect), an image type from
// STOCK_TYPES, at most MAX_STOCK_BYTES.
export async function downloadStock( fetchImpl, url ) {
	if ( ! url.startsWith( 'https://' ) ) {
		throw new Error( `stock image ${ url } is not https` );
	}
	const res = await fetchImpl( url, { headers: { 'User-Agent': 'Mozilla/5.0 SGS media-upload' } } );
	if ( 200 !== res.status ) {
		throw new Error( `stock image ${ url } answered ${ res.status }` );
	}
	if ( res.url && ! String( res.url ).startsWith( 'https://' ) ) {
		throw new Error( `stock image ${ url } redirected to ${ res.url }, which is not https` );
	}
	const type = String( res.headers?.get?.( 'content-type' ) || '' ).split( ';' )[ 0 ].trim().toLowerCase();
	if ( ! STOCK_TYPES[ type ] ) {
		throw new Error( `stock image ${ url } is ${ type || 'of no content type' }, not an image type (${ Object.keys( STOCK_TYPES ).join( ', ' ) })` );
	}
	const declared = Number( res.headers?.get?.( 'content-length' ) );
	if ( declared > MAX_STOCK_BYTES ) {
		throw new Error( `stock image ${ url } declares ${ declared } bytes, over the ${ MAX_STOCK_BYTES } cap` );
	}
	const bytes = Buffer.from( await res.arrayBuffer() );
	if ( bytes.length > MAX_STOCK_BYTES ) {
		throw new Error( `stock image ${ url } is ${ bytes.length } bytes, over the ${ MAX_STOCK_BYTES } cap` );
	}
	return { bytes, type, ext: STOCK_TYPES[ type ] };
}

// The upload file name of a stock image: `stock-<photo id>.<ext>`.
export const stockFileName = ( key, ext ) => `stock-${ new URL( key ).pathname.replace( /^\/photo-/, '' ) }${ ext }`;

export const sha256Of = ( buf ) => crypto.createHash( 'sha256' ).update( buf ).digest( 'hex' );

// Bean's review list (`sites/<client>/build/stock-review.md`): every stock image of every site in the map, where the
// draft paints it and its attachment, so he can replace each with a real photo.
export function stockReview( client, map ) {
	const lines = [ `# Stock previews: ${ client }`, '', 'Each image below is a stock preview the draft paints. Replace the attachment with a real photo (the attachment ID stays the handle).', '' ];
	for ( const [ site, { files = [] } ] of Object.entries( map.sites || {} ) ) {
		const stock = files.filter( ( f ) => f.stock );
		lines.push( `## ${ site }`, '' );
		if ( ! stock.length ) {
			lines.push( 'No stock previews.', '' );
			continue;
		}
		lines.push( '| Source | Painted at | Attachment | Uploaded as |', '|---|---|---|---|' );
		for ( const f of stock ) {
			lines.push( `| ${ f.asset } | ${ ( f.paintedAt || [] ).join( '<br>' ) } | ${ f.id } | ${ f.url } |` );
		}
		lines.push( '' );
	}
	return `${ lines.join( '\n' ) }\n`.replace( /\n{3,}$/, '\n' );
}

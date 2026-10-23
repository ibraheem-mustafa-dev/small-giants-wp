// Stock previews for the media upload (Spec 48 FR-48-58, FR-48-33): the stock-host images a draft paints are found in
// the draft's own source, downloaded once each, and uploaded as `stock: true` entries that Bean replaces later.
//   - found: every `*.dc.html` under `sites/<client>/handoff/` is read for URLs on a stock host
//     (lib/intake-sandbox.mjs::STOCK_HOSTS) and, in a file whose logic builds a URL from a photo ID (`…/photo-' + pid`),
//     for the photo-ID string literals that flow into that built URL expression (read from the logic's AST through
//     variables, arrays, object maps, `concat`, `||`/`?:` and class getters). A photo-ID literal that reaches no built
//     URL is listed as unpainted and never uploaded. A painted image is one identity, its URL without the query
//     (`stockKey`), however many sizes the draft asks for.
//   - downloaded: https only, redirects followed by hand (at most `MAX_STOCK_HOPS`, each to https on a stock host), an
//     image content type whose leading bytes carry that type's signature, the body streamed and abandoned past
//     `MAX_STOCK_BYTES`, at the largest width the draft asks for (capped at `MAX_STOCK_WIDTH`); the sha256 of what was
//     downloaded and its source URL go in the map entry.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { STOCK_HOSTS } from './intake-sandbox.mjs';
import { isThisMember, keyName, loadDraft, resolveName } from './intake-ast.mjs';

export const MAX_STOCK_BYTES = 8 * 1024 * 1024;
export const MAX_STOCK_WIDTH = 2400;
export const MAX_STOCK_HOPS = 3;
export const DEFAULT_STOCK_WIDTH = 1600;
export const STOCK_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };

const URL_RE = /https:\/\/[^\s"'`()<>,\\]+/gi;
const PHOTO_PATH = /^\/photo-[A-Za-z0-9_-]{8,}$/;
const PHOTO_ID = /(['"])(\d{8,}-[0-9a-f]{12})\1/g;
const PHOTO_ID_RE = /^\d{8,}-[0-9a-f]{12}$/;
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

// The expressions the class getter, method or property called `name` yields.
const memberYields = ( idx, name ) => idx.all.flatMap( ( n ) => {
	if ( 'ClassProperty' === n.type && keyName( n ) === name && n.value ) {
		return [ n.value ];
	}
	if ( 'ClassMethod' === n.type && keyName( n ) === name ) {
		return idx.all.filter( ( r ) => 'ReturnStatement' === r.type && r.argument && r.start >= n.start && r.end <= n.end ).map( ( r ) => r.argument );
	}
	return [];
} );

// The photo-ID string literal nodes an expression can yield, through variables, arrays (any element), object maps
// (any value), `concat`, `||`/`??`/`?:` and `this.<getter>`.
function photoLiterals( idx, node, seen = new Set(), depth = 0 ) {
	if ( ! node || seen.has( node ) || depth > 8 ) {
		return [];
	}
	seen.add( node );
	const go = ( n ) => photoLiterals( idx, n, seen, depth + 1 );
	switch ( node.type ) {
		case 'StringLiteral':
			return PHOTO_ID_RE.test( node.value ) ? [ node ] : [];
		case 'Identifier': {
			const r = resolveName( idx, node );
			return 'var' === r?.kind && ! r.key ? go( r.init ) : [];
		}
		case 'ArrayExpression':
			return node.elements.flatMap( ( e ) => go( 'SpreadElement' === e?.type ? e.argument : e ) );
		case 'ObjectExpression':
			return node.properties.flatMap( ( p ) => ( 'ObjectProperty' === p.type ? go( p.value ) : [] ) );
		case 'MemberExpression':
			if ( node.computed ) {
				return go( node.object );
			}
			return isThisMember( node ) ? memberYields( idx, node.property.name ).flatMap( go ) : [];
		case 'CallExpression':
			return 'MemberExpression' === node.callee.type && ! node.callee.computed && 'concat' === node.callee.property.name ? [ ...go( node.callee.object ), ...node.arguments.flatMap( go ) ] : [];
		case 'ConditionalExpression':
			return [ ...go( node.consequent ), ...go( node.alternate ) ];
		case 'LogicalExpression':
			return '&&' === node.operator ? go( node.right ) : [ ...go( node.left ), ...go( node.right ) ];
	}
	return [];
}

// The expressions a draft's logic appends to a `https://<host>/photo-` prefix: `'…/photo-' + x` and `…/photo-${ x }`.
function builtUrlSinks( idx, host ) {
	const prefix = `https://${ host }/photo-`;
	return idx.all.flatMap( ( n ) => {
		if ( 'BinaryExpression' === n.type && '+' === n.operator && 'StringLiteral' === n.left.type && n.left.value.endsWith( prefix ) ) {
			return [ n.right ];
		}
		if ( 'TemplateLiteral' === n.type ) {
			return n.quasis.flatMap( ( q, i ) => ( q.value.cooked.endsWith( prefix ) && n.expressions[ i ] ? [ n.expressions[ i ] ] : [] ) );
		}
		return [];
	} );
}

// The stock images a client's draft paints and the photo IDs it holds without painting:
// { painted: [{ key, width, paintedAt: ['<file>:<line>', …] }], unpainted: [{ key, at: ['<file>:<line>', …], reason }] },
// each in a stable order.
export function stockSurvey( repo, client, hosts = STOCK_HOSTS ) {
	const dir = path.join( repo, 'sites', client, 'handoff' );
	const drafts = fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( ( f ) => f.endsWith( '.dc.html' ) ).sort() : [];
	const found = new Map();
	const held = new Map();
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
		const builds = hosts.find( ( h ) => new RegExp( `${ h.replace( /\./g, '\\.' ) }/photo-['"\`$]` ).test( text ) );
		if ( ! builds ) {
			continue;
		}
		const d = loadDraft( dir, file );
		for ( const sink of d.idx ? builtUrlSinks( d.idx, builds ) : [] ) {
			for ( const lit of photoLiterals( d.idx, sink ) ) {
				note( `https://${ builds }/photo-${ lit.value }`, 0, `${ file }:${ d.idx.line( lit ) }` );
			}
		}
		const reason = d.idx ? 'no built stock URL expression reaches it' : `the draft logic could not be read (${ d.error || 'no logic' })`;
		for ( const m of text.matchAll( PHOTO_ID ) ) {
			const where = `${ file }:${ lineOf( text, m.index ) }`;
			const key = `https://${ builds }/photo-${ m[ 2 ] }`;
			const row = held.get( key ) || { key, at: [], reason };
			if ( ! row.at.includes( where ) ) {
				row.at.push( where );
			}
			held.set( key, row );
		}
	}
	const byKey = ( a, b ) => a.key.localeCompare( b.key );
	return { painted: [ ...found.values() ].sort( byKey ), unpainted: [ ...held.values() ].filter( ( r ) => ! found.has( r.key ) ).sort( byKey ) };
}

// The stock images a client's draft paints: stockSurvey's `painted`.
export const stockImages = ( repo, client, hosts = STOCK_HOSTS ) => stockSurvey( repo, client, hosts ).painted;

const REDIRECTS = new Set( [ 301, 302, 303, 307, 308 ] );

// Whether the leading bytes carry the signature of the image type a response claims.
export function signatureMatches( type, head ) {
	const at = ( off, ascii ) => head.length >= off + ascii.length && head.subarray( off, off + ascii.length ).toString( 'latin1' ) === ascii;
	switch ( type ) {
		case 'image/jpeg':
			return head.length >= 3 && 0xff === head[ 0 ] && 0xd8 === head[ 1 ] && 0xff === head[ 2 ];
		case 'image/png':
			return head.length >= 4 && 0x89 === head[ 0 ] && at( 1, 'PNG' );
		case 'image/gif':
			return at( 0, 'GIF8' );
		case 'image/webp':
			return at( 0, 'RIFF' ) && at( 8, 'WEBP' );
		case 'image/avif':
			return at( 4, 'ftyp' );
	}
	return false;
}

// A response body read chunk by chunk and abandoned (the stream cancelled) as soon as it passes `cap` bytes.
async function readCapped( res, url, cap ) {
	if ( ! res.body?.getReader ) {
		throw new Error( `stock image ${ url } answered with no readable body` );
	}
	const reader = res.body.getReader();
	const chunks = [];
	let size = 0;
	for ( let r = await reader.read(); ! r.done; r = await reader.read() ) {
		size += r.value.length;
		if ( size > cap ) {
			await reader.cancel().catch( () => {} );
			throw new Error( `stock image ${ url } is over the ${ cap } cap (stopped reading at ${ size } bytes)` );
		}
		chunks.push( Buffer.from( r.value ) );
	}
	return Buffer.concat( chunks );
}

// Downloads one stock image: { bytes, type, ext } or throws. https only; each redirect is followed by hand, at most
// MAX_STOCK_HOPS, and only to https on a stock host (`hosts`); an image type from STOCK_TYPES whose leading bytes carry
// that type's signature; the body streamed and abandoned past MAX_STOCK_BYTES.
export async function downloadStock( fetchImpl, url, hosts = STOCK_HOSTS ) {
	let at = url;
	let res;
	for ( let hop = 0; ; hop++ ) {
		let u;
		try {
			u = new URL( at );
		} catch {
			throw new Error( `stock image ${ url } points at ${ at }, which is not a URL` );
		}
		if ( 'https:' !== u.protocol ) {
			throw new Error( 0 === hop ? `stock image ${ url } is not https` : `stock image ${ url } redirected to ${ at }, which is not https` );
		}
		if ( hop > 0 && ! hosts.includes( u.hostname ) ) {
			throw new Error( `stock image ${ url } redirected to ${ at }, which is not on a stock host (${ hosts.join( ', ' ) })` );
		}
		res = await fetchImpl( at, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 SGS media-upload' } } );
		if ( ! REDIRECTS.has( res.status ) ) {
			break;
		}
		if ( hop >= MAX_STOCK_HOPS ) {
			throw new Error( `stock image ${ url } redirected more than ${ MAX_STOCK_HOPS } times` );
		}
		const next = res.headers?.get?.( 'location' );
		if ( ! next ) {
			throw new Error( `stock image ${ url } answered ${ res.status } with no Location` );
		}
		at = new URL( next, at ).href;
	}
	if ( 200 !== res.status ) {
		throw new Error( `stock image ${ url } answered ${ res.status }` );
	}
	const type = String( res.headers?.get?.( 'content-type' ) || '' ).split( ';' )[ 0 ].trim().toLowerCase();
	if ( ! STOCK_TYPES[ type ] ) {
		throw new Error( `stock image ${ url } is ${ type || 'of no content type' }, not an image type (${ Object.keys( STOCK_TYPES ).join( ', ' ) })` );
	}
	const declared = Number( res.headers?.get?.( 'content-length' ) );
	if ( declared > MAX_STOCK_BYTES ) {
		throw new Error( `stock image ${ url } declares ${ declared } bytes, over the ${ MAX_STOCK_BYTES } cap` );
	}
	const bytes = await readCapped( res, url, MAX_STOCK_BYTES );
	if ( ! signatureMatches( type, bytes.subarray( 0, 16 ) ) ) {
		throw new Error( `stock image ${ url } claims ${ type } but its leading bytes are not that type's signature` );
	}
	return { bytes, type, ext: STOCK_TYPES[ type ] };
}

// The upload file name of a stock image: `stock-<photo id>.<ext>`.
export const stockFileName = ( key, ext ) => `stock-${ new URL( key ).pathname.replace( /^\/photo-/, '' ) }${ ext }`;

export const sha256Of = ( buf ) => crypto.createHash( 'sha256' ).update( buf ).digest( 'hex' );

// Bean's review list (`sites/<client>/build/stock-review.md`): every stock image of every site in the map, where the
// draft paints it and its attachment, so he can replace each with a real photo; then the photo IDs the draft holds but
// paints nowhere (`unpainted`, from stockSurvey), which are not uploaded.
export function stockReview( client, map, unpainted = [] ) {
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
	if ( unpainted.length ) {
		lines.push( '## Unpainted photo IDs', '', 'The draft holds these photo IDs but paints none of them, so none is uploaded.', '', '| Source | Held at | Why |', '|---|---|---|' );
		for ( const u of unpainted ) {
			lines.push( `| ${ u.key } | ${ u.at.join( '<br>' ) } | ${ u.reason } |` );
		}
		lines.push( '' );
	}
	return `${ lines.join( '\n' ) }\n`.replace( /\n{3,}$/, '\n' );
}

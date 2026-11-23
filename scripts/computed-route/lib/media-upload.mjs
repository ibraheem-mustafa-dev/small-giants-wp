// Media upload to an ID map (Spec 48 FR-48-58): every image under the export's `assets/` and the client's own images
// under `sites/<client>/assets/` reach a site's media library once, through the WordPress REST media endpoint with the
// site's application password (no file copy to the server). `sites/<client>/build/media-map.json` holds, per site,
// each file's source sha256, attachment ID and URL, and the sha256 of the file WordPress kept (`storedSha256`); an SVG
// the upload sanitiser changed (plugins/sgs-blocks/includes/svg-upload.php) is marked `sanitised` for Bean's review.
// A rerun skips a file whose sha256 is in the map with a live attachment that still serves `storedSha256`.
// With no map entry (the map file is absent, or holds another copy of the site) a file is still not uploaded twice: the
// library is searched for an attachment WordPress named after the file (`findOnSite`), and the map is rebuilt from it.
// A stock preview (an image on a stock host that the draft paints, lib/media-stock.mjs) is downloaded once and uploaded
// the same way as a `stock: true` entry whose `asset` is its source URL without the query; a rerun skips one whose
// attachment is live without downloading it again.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { assertSiteContact } from './site-contact.mjs';
import { readTargets, secretsOf, secretsPath } from './site-targets.mjs';
import { downloadStock, stockDownloadUrl, stockFileName, stockKey, stockSurvey } from './media-stock.mjs';
import { recordSite } from './cache.mjs';

export const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml' };
export const sha256 = ( buf ) => crypto.createHash( 'sha256' ).update( buf ).digest( 'hex' );

const walk = ( dir ) => ( fs.existsSync( dir ) ? fs.readdirSync( dir, { withFileTypes: true } ).flatMap( ( d ) => ( d.isDirectory() ? walk( path.join( dir, d.name ) ) : [ path.join( dir, d.name ) ] ) ) : [] );

// The images to upload, repo-relative with forward slashes, in a stable order.
export function mediaAssets( repo, client ) {
	const roots = [ path.join( repo, 'sites', client, 'handoff', 'assets' ), path.join( repo, 'sites', client, 'assets' ) ];
	return roots.flatMap( walk ).filter( ( f ) => IMAGE_TYPES[ path.extname( f ).toLowerCase() ] )
		.map( ( f ) => path.relative( repo, f ).split( path.sep ).join( '/' ) ).sort();
}

// Whether a site URL may carry an application password as Basic auth: https, or plain http to a loopback host (the
// WSL mirrors).
export function safeSiteUrl( url ) {
	let u;
	try {
		u = new URL( url );
	} catch {
		return false;
	}
	return 'https:' === u.protocol || ( 'http:' === u.protocol && [ 'localhost', '127.0.0.1', '[::1]' ].includes( u.hostname ) );
}

// A site's REST credentials from its secrets file under SGS_SECRETS_ROOT, else `repo` (lib/site-targets.mjs::secretsOf names the
// file and the key suffix from the site's entry in `targets`, default repo's calibration-targets.json; secretsPath places it):
// WP_URL_<key>, WP_USER_<key>, WP_APP_PWD_<key>. A URL that is neither https nor loopback http is
// refused, since the application password travels as Basic auth.
export function siteCredentials( repo, site, targets = readTargets( { repo } ) ) {
	const { envFile, envKey } = secretsOf( site, targets );
	const file = secretsPath( envFile, repo );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `no secrets file for ${ site } (${ envFile })` );
	}
	const env = Object.fromEntries( fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).map( ( l ) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec( l ) ).filter( Boolean ).map( ( [ , k, v ] ) => [ k, v.replace( /^(['"])(.*)\1$/, '$2' ) ] ) );
	const [ url, user, pass ] = [ 'WP_URL', 'WP_USER', 'WP_APP_PWD' ].map( ( k ) => env[ `${ k }_${ envKey }` ] );
	if ( ! url || ! user || ! pass ) {
		throw new Error( `${ envFile } lacks WP_URL_${ envKey }, WP_USER_${ envKey } or WP_APP_PWD_${ envKey }` );
	}
	if ( ! safeSiteUrl( url ) ) {
		throw new Error( `WP_URL_${ envKey } (${ url }) is not https (plain http is allowed only to localhost), and the application password would travel in the clear` );
	}
	return { url: url.replace( /\/+$/, '' ), auth: `Basic ${ Buffer.from( `${ user }:${ pass.replace( /\s+/g, '' ) }` ).toString( 'base64' ) }` };
}

// The upload's Content-Disposition: an ASCII filename (anything else as `_`) plus the UTF-8 name, so a non-ASCII name
// neither breaks the header nor aborts the run.
const disposition = ( name ) => `attachment; filename="${ name.replace( /[^\x20-\x7e]|["\\]/g, '_' ) }"; filename*=UTF-8''${ encodeURIComponent( name ) }`;

// The export's own fingerprints: handoff path → sha256 from `sites/<client>/handoff/MANIFEST.json` (empty when the
// export has none, so every handoff asset is refused). An export asset uploads only when its bytes match its entry.
export function manifestSums( repo, client ) {
	const file = path.join( repo, 'sites', client, 'handoff', 'MANIFEST.json' );
	const files = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).files || [] : [];
	return new Map( files.map( ( f ) => [ f.path, f.sha256 ] ) );
}

export const readMap = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : { sites: {} } );

// The bytes a URL on the site's own origin serves, or null when it does not answer 200 or lies on another origin.
async function served( fetchImpl, creds, url ) {
	let origin;
	try {
		origin = new URL( url ).origin;
	} catch {
		return null;
	}
	if ( origin !== new URL( creds.url ).origin ) {
		return null;
	}
	const res = await fetchImpl( url, { headers: { 'User-Agent': 'Mozilla/5.0 SGS media-upload' } } );
	return 200 === res.status ? Buffer.from( await res.arrayBuffer() ) : null;
}

// How a map entry's attachment stands on the site: 'live' (it serves the file WordPress kept), 'gone' (the site answers 404 for
// it: another copy of the site, or a deleted attachment) or 'changed' (anything else: other bytes, another origin, a failed read).
async function standing( fetchImpl, creds, entry ) {
	const res = await fetchImpl( `${ creds.url }/wp-json/wp/v2/media/${ entry.id }?context=edit`, { headers: { Authorization: creds.auth } } );
	if ( 200 !== res.status ) {
		return 404 === res.status ? 'gone' : 'changed';
	}
	const media = await res.json();
	const bytes = await served( fetchImpl, creds, media.source_url );
	return bytes && sha256( bytes ) === entry.storedSha256 ? 'live' : 'changed';
}

// Whether a map entry's attachment is live and still serves the file WordPress kept; read twice before it is called otherwise, so one
// failed read never makes a duplicate. `last` is how it stood on the last read.
async function stillLive( fetchImpl, creds, entry ) {
	let last = 'changed';
	for ( let i = 0; i < 2 && 'live' !== last; i++ ) {
		last = await standing( fetchImpl, creds, entry );
	}
	return last;
}

// The attachment a site's library already holds for a file name, as { id, url, storedSha256 } with its live bytes read, else null.
// WordPress names the stored file after the upload's file name (`hero.jpg`), adding `-1`, `-2` when the name was taken and `-scaled`
// for a large picture's served copy, so the candidates are the library's images whose file name is the upload's name with those
// suffixes, tried oldest first. `ext` null matches any image extension (a stock preview, whose extension the download decides).
// A name never found in one search page, a request that fails or a candidate that does not serve its bytes is no match.
async function findOnSite( fetchImpl, creds, { stem, ext = null, type = null } ) {
	const plain = ( x ) => String( x ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' );
	const want = plain( stem );
	const res = await fetchImpl( `${ creds.url }/wp-json/wp/v2/media?search=${ encodeURIComponent( stem ) }&per_page=100&orderby=id&order=asc&media_type=image`, { headers: { Authorization: creds.auth } } );
	if ( 200 !== res.status ) {
		return null;
	}
	const list = await res.json().catch( () => [] );
	for ( const media of Array.isArray( list ) ? [ ...list ].sort( ( a, b ) => a.id - b.id ) : [] ) {
		const file = decodeURIComponent( String( media.source_url || '' ).split( /[?#]/ )[ 0 ].split( '/' ).pop() );
		const dot = file.lastIndexOf( '.' );
		const fileExt = dot < 0 ? '' : file.slice( dot ).toLowerCase();
		const fileStem = plain( file.slice( 0, dot < 0 ? file.length : dot ).replace( /-scaled$/i, '' ).replace( /-\d+$/, '' ) );
		if ( fileStem !== want || ! IMAGE_TYPES[ fileExt ] || ( ext && fileExt !== ext.toLowerCase() ) || ( type && media.mime_type && media.mime_type !== type ) ) {
			continue;
		}
		const bytes = await served( fetchImpl, creds, media.source_url );
		if ( bytes ) {
			return { id: media.id, url: media.source_url, storedSha256: sha256( bytes ) };
		}
	}
	return null;
}

// One upload through the REST media endpoint: { media, kept } with the bytes WordPress serves for it.
async function postMedia( fetchImpl, creds, label, name, type, bytes ) {
	const res = await fetchImpl( `${ creds.url }/wp-json/wp/v2/media`, { method: 'POST', headers: { Authorization: creds.auth, 'Content-Type': type, 'Content-Disposition': disposition( name ) }, body: bytes } );
	if ( 201 !== res.status ) {
		throw new Error( `uploading ${ label } answered ${ res.status }: ${ ( await res.text() ).slice( 0, 300 ) }` );
	}
	const media = await res.json();
	const kept = await served( fetchImpl, creds, media.source_url );
	if ( ! kept ) {
		throw new Error( `attachment ${ media.id } for ${ label } does not serve ${ media.source_url }` );
	}
	return { media, kept };
}

// Uploads what the map does not hold live: { files, uploaded, skipped, sanitised }. `apply: false` uploads nothing and
// lists what would be uploaded. The map is returned, not written (the caller writes it). `stock` is the list of stock
// previews to carry (default: those the client's draft paints); `stockFound` returns their keys, `stockUnpainted` the
// photo IDs the draft holds without painting (never uploaded) and `failed` the stock downloads that did not complete
// (the run goes on without them).
export async function uploadMedia( { repo, client, site, map, creds, fetchImpl = fetch, apply = false, log = () => {}, survey = stockSurvey( repo, client ), stock = survey.painted, targets = undefined } ) {
	// The real fetch reaches the site; a caller's own fetchImpl (a test's fake, shop-fixtures' guarded one) is its own business.
	fetchImpl === fetch && assertSiteContact( { site, readOnly: ! apply } );
	// A mirror or a scratch copy shares its test site's record (lib/cache.mjs::recordSite, through `mirrorOf` in either targets
	// file): its database is a copy, so it holds the same attachment ids, and every reader (lib/fill-media.mjs, the skeleton's
	// logo check) looks under the test site's name. An upload through any of them checks and writes that one record.
	const key = recordSite( site, ...( targets ? [ targets ] : [] ) );
	const known = map.sites?.[ key ]?.files || [];
	const handoffPrefix = `sites/${ client }/handoff/`;
	const manifest = manifestSums( repo, client );
	const files = [];
	const nameCount = mediaAssets( repo, client ).reduce( ( m, f ) => m.set( path.basename( f ).toLowerCase(), ( m.get( path.basename( f ).toLowerCase() ) || 0 ) + 1 ), new Map() );
	const report = { uploaded: [], skipped: [], sanitised: [], wouldUpload: [], failed: [], stockFound: stock.map( ( s ) => s.key ), stockUnpainted: survey.unpainted || [] };
	// One stock preview: kept when its attachment is live, else downloaded (its failure is reported, not thrown) and uploaded.
	const carryStock = async ( row ) => {
		const had = known.find( ( e ) => e.stock && e.asset === row.key );
		const state = had ? await stillLive( fetchImpl, creds, had ) : 'gone';
		if ( 'live' === state ) {
			files.push( { ...had, paintedAt: row.paintedAt } );
			report.skipped.push( row.key );
			return;
		}
		const there = 'gone' !== state ? null : await findOnSite( fetchImpl, creds, { stem: path.basename( stockFileName( row.key, '' ) ) } );
		if ( there ) {
			files.push( { asset: row.key, source: stockDownloadUrl( row.key, row.width ), sha256: there.storedSha256, ...there, stock: true, paintedAt: row.paintedAt } );
			report.skipped.push( row.key );
			return;
		}
		if ( ! apply ) {
			report.wouldUpload.push( row.key );
			return;
		}
		const source = stockDownloadUrl( row.key, row.width );
		let got;
		try {
			got = await downloadStock( fetchImpl, source );
		} catch ( e ) {
			report.failed.push( { asset: row.key, reason: e.message } );
			return;
		}
		const sum = sha256( got.bytes );
		const twin = files.find( ( e ) => e.sha256 === sum && e.id );
		if ( twin ) {
			files.push( { ...twin, asset: row.key, source, stock: true, paintedAt: row.paintedAt } );
			report.skipped.push( row.key );
			return;
		}
		const { media, kept } = await postMedia( fetchImpl, creds, row.key, stockFileName( row.key, got.ext ), got.type, got.bytes );
		files.push( { asset: row.key, source, sha256: sum, id: media.id, url: media.source_url, storedSha256: sha256( kept ), stock: true, paintedAt: row.paintedAt } );
		report.uploaded.push( row.key );
		log( `uploaded stock ${ row.key } as attachment ${ media.id }` );
	};
	// A failure part-way keeps what did upload: the error carries the map of the files handled so far plus the earlier
	// rows not reached yet, so the caller can save it and a rerun does not upload them twice.
	try {
		for ( const asset of mediaAssets( repo, client ) ) {
			const bytes = fs.readFileSync( path.join( repo, asset ) );
			const sum = sha256( bytes );
			const shipped = asset.startsWith( handoffPrefix ) ? asset.slice( handoffPrefix.length ) : null;
			if ( null !== shipped && manifest.get( shipped ) !== sum ) {
				throw new Error( `${ asset } ${ manifest.has( shipped ) ? 'differs from' : 'is not in' } the export's MANIFEST.json: re-export the draft (the handoff folder is never edited by hand)` );
			}
			// A file with the same bytes as one this run already handled shares its attachment (no second upload).
			const twin = files.find( ( e ) => e.sha256 === sum && e.id );
			if ( twin ) {
				files.push( { ...twin, asset } );
				report.skipped.push( asset );
				continue;
			}
			const had = known.find( ( e ) => e.sha256 === sum && e.asset === asset ) || known.find( ( e ) => e.sha256 === sum );
			// Read twice before re-uploading, so one failed liveness read never makes a duplicate.
			const state = had ? await stillLive( fetchImpl, creds, had ) : 'gone';
			if ( 'live' === state ) {
				files.push( { ...had, asset } );
				report.skipped.push( asset );
				continue;
			}
			const name = path.basename( asset );
			const type = IMAGE_TYPES[ path.extname( name ).toLowerCase() ];
			// No entry in the map, or an entry whose attachment the site does not have: the library may already hold the file under its own
			// id (a rerun with the map file absent, a second checkout, a copy of the site). An attachment that is there but serves other
			// bytes is replaced by an upload, as before.
			// A name two assets share cannot tell their attachments apart, so those are never adopted by name.
			const there = 'gone' !== state || nameCount.get( name.toLowerCase() ) > 1 ? null : await findOnSite( fetchImpl, creds, { stem: path.basename( name, path.extname( name ) ), ext: path.extname( name ), type } );
			if ( there ) {
				files.push( { asset, sha256: sum, ...there, stock: false } );
				report.skipped.push( asset );
				continue;
			}
			if ( ! apply ) {
				report.wouldUpload.push( asset );
				continue;
			}
			const { media, kept } = await postMedia( fetchImpl, creds, asset, name, type, bytes );
			const entry = { asset, sha256: sum, id: media.id, url: media.source_url, storedSha256: sha256( kept ), stock: false };
			if ( 'image/svg+xml' === type && entry.storedSha256 !== sum ) {
				entry.sanitised = true;
				report.sanitised.push( asset );
			}
			files.push( entry );
			report.uploaded.push( asset );
			log( `uploaded ${ asset } as attachment ${ media.id }${ entry.sanitised ? ' (the SVG sanitiser changed it)' : '' }` );
		}
		for ( const row of stock ) {
			await carryStock( row );
		}
	} catch ( e ) {
		e.map = { ...map, sites: { ...( map.sites || {} ), [ key ]: { files: [ ...files, ...known.filter( ( k ) => ! files.some( ( f ) => f.asset === k.asset ) ) ] } } };
		throw e;
	}
	return { map: { ...map, sites: { ...( map.sites || {} ), [ key ]: { files } } }, key, ...report };
}

// The asset a painted image URL shows on a site, through the map (FR-48-58's identity check): the attachment whose URL
// the painted URL is, else a stock preview whose source URL it is, else one a size WordPress made of it matches (`name-300x200.png`, `name-scaled.png`); null when none.
export function paintedAsset( map, site, src ) {
	const files = map.sites?.[ site ]?.files || [];
	const plain = ( u ) => String( u ).split( /[?#]/ )[ 0 ];
	const unsized = ( u ) => plain( u ).replace( /-(?:\d+x\d+|scaled)(?=\.[a-z0-9]+$)/i, '' );
	// The exact URL first, so an asset whose own name ends like a size (hero-1200x600.png) is never taken for another's.
	// A stock preview the draft paints from its source URL is found by that URL without the query.
	const key = stockKey( src );
	return files.find( ( e ) => plain( e.url ) === plain( src ) ) || ( key && files.find( ( e ) => e.stock && e.asset === key ) ) || files.find( ( e ) => unsized( e.url ) === unsized( src ) ) || null;
}

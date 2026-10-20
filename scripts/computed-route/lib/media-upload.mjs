// Media upload to an ID map (Spec 48 FR-48-58): every image under the export's `assets/` and the client's own images
// under `sites/<client>/assets/` reach a site's media library once, through the WordPress REST media endpoint with the
// site's application password (no file copy to the server). `sites/<client>/build/media-map.json` holds, per site,
// each file's source sha256, attachment ID and URL, and the sha256 of the file WordPress kept (`storedSha256`); an SVG
// the upload sanitiser changed (plugins/sgs-blocks/includes/svg-upload.php) is marked `sanitised` for Bean's review.
// A rerun skips a file whose sha256 is in the map with a live attachment that still serves `storedSha256`.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml' };
export const sha256 = ( buf ) => crypto.createHash( 'sha256' ).update( buf ).digest( 'hex' );

const walk = ( dir ) => ( fs.existsSync( dir ) ? fs.readdirSync( dir, { withFileTypes: true } ).flatMap( ( d ) => ( d.isDirectory() ? walk( path.join( dir, d.name ) ) : [ path.join( dir, d.name ) ] ) ) : [] );

// The images to upload, repo-relative with forward slashes, in a stable order.
export function mediaAssets( repo, client ) {
	const roots = [ path.join( repo, 'sites', client, 'handoff', 'assets' ), path.join( repo, 'sites', client, 'assets' ) ];
	return roots.flatMap( walk ).filter( ( f ) => IMAGE_TYPES[ path.extname( f ).toLowerCase() ] )
		.map( ( f ) => path.relative( repo, f ).split( path.sep ).join( '/' ) ).sort();
}

// A site's REST credentials from `.claude/secrets/<site>.env` (WP_URL_<SITE>, WP_USER_<SITE>, WP_APP_PWD_<SITE>, the
// suffix being the site name upper-cased without its punctuation).
export function siteCredentials( repo, site ) {
	const file = path.join( repo, '.claude', 'secrets', `${ site }.env` );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `no secrets file for ${ site } (.claude/secrets/${ site }.env)` );
	}
	const env = Object.fromEntries( fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).map( ( l ) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec( l ) ).filter( Boolean ).map( ( [ , k, v ] ) => [ k, v.replace( /^['"]|['"]$/g, '' ) ] ) );
	const suffix = site.toUpperCase().replace( /[^A-Z0-9]/g, '' );
	const [ url, user, pass ] = [ 'WP_URL', 'WP_USER', 'WP_APP_PWD' ].map( ( k ) => env[ `${ k }_${ suffix }` ] );
	if ( ! url || ! user || ! pass ) {
		throw new Error( `.claude/secrets/${ site }.env lacks WP_URL_${ suffix }, WP_USER_${ suffix } or WP_APP_PWD_${ suffix }` );
	}
	return { url: url.replace( /\/+$/, '' ), auth: `Basic ${ Buffer.from( `${ user }:${ pass.replace( /\s+/g, '' ) }` ).toString( 'base64' ) }` };
}

export const readMap = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : { sites: {} } );

// The bytes a URL serves, or null when it does not answer 200.
async function served( fetchImpl, url ) {
	const res = await fetchImpl( url, { headers: { 'User-Agent': 'Mozilla/5.0 SGS media-upload' } } );
	return 200 === res.status ? Buffer.from( await res.arrayBuffer() ) : null;
}

// Whether a map entry's attachment is live and still serves the file WordPress kept.
async function stillLive( fetchImpl, creds, entry ) {
	const res = await fetchImpl( `${ creds.url }/wp-json/wp/v2/media/${ entry.id }?context=edit`, { headers: { Authorization: creds.auth } } );
	if ( 200 !== res.status ) {
		return false;
	}
	const media = await res.json();
	const bytes = await served( fetchImpl, media.source_url );
	return !! bytes && sha256( bytes ) === entry.storedSha256;
}

// Uploads what the map does not hold live: { files, uploaded, skipped, sanitised }. `apply: false` uploads nothing and
// lists what would be uploaded. The map is returned, not written (the caller writes it).
export async function uploadMedia( { repo, client, site, map, creds, fetchImpl = fetch, apply = false, log = () => {} } ) {
	const known = map.sites?.[ site ]?.files || [];
	const files = [];
	const report = { uploaded: [], skipped: [], sanitised: [], wouldUpload: [] };
	for ( const asset of mediaAssets( repo, client ) ) {
		const bytes = fs.readFileSync( path.join( repo, asset ) );
		const sum = sha256( bytes );
		// A file with the same bytes as one this run already handled shares its attachment (no second upload).
		const twin = files.find( ( e ) => e.sha256 === sum && e.id );
		if ( twin ) {
			files.push( { ...twin, asset } );
			report.skipped.push( asset );
			continue;
		}
		const had = known.find( ( e ) => e.sha256 === sum && e.asset === asset ) || known.find( ( e ) => e.sha256 === sum );
		if ( had && await stillLive( fetchImpl, creds, had ) ) {
			files.push( { ...had, asset } );
			report.skipped.push( asset );
			continue;
		}
		if ( ! apply ) {
			report.wouldUpload.push( asset );
			continue;
		}
		const name = path.basename( asset );
		const type = IMAGE_TYPES[ path.extname( name ).toLowerCase() ];
		const res = await fetchImpl( `${ creds.url }/wp-json/wp/v2/media`, { method: 'POST', headers: { Authorization: creds.auth, 'Content-Type': type, 'Content-Disposition': `attachment; filename="${ name.replace( /"/g, '' ) }"` }, body: bytes } );
		if ( 201 !== res.status ) {
			throw new Error( `uploading ${ asset } answered ${ res.status }: ${ ( await res.text() ).slice( 0, 300 ) }` );
		}
		const media = await res.json();
		const kept = await served( fetchImpl, media.source_url );
		if ( ! kept ) {
			throw new Error( `attachment ${ media.id } for ${ asset } does not serve ${ media.source_url }` );
		}
		const entry = { asset, sha256: sum, id: media.id, url: media.source_url, storedSha256: sha256( kept ), stock: false };
		if ( 'image/svg+xml' === type && entry.storedSha256 !== sum ) {
			entry.sanitised = true;
			report.sanitised.push( asset );
		}
		files.push( entry );
		report.uploaded.push( asset );
		log( `uploaded ${ asset } as attachment ${ media.id }${ entry.sanitised ? ' (the SVG sanitiser changed it)' : '' }` );
	}
	const next = { ...map, sites: { ...( map.sites || {} ), [ site ]: { files } } };
	return { map: next, ...report };
}

// The asset a painted image URL shows on a site, through the map (FR-48-58's identity check): the attachment whose URL
// the painted URL is, or a size WordPress made of it (`name-300x200.png`, `name-scaled.png`); null when none.
export function paintedAsset( map, site, src ) {
	const bare = ( u ) => String( u ).split( /[?#]/ )[ 0 ].replace( /-(?:\d+x\d+|scaled)(?=\.[a-z0-9]+$)/i, '' );
	return ( map.sites?.[ site ]?.files || [] ).find( ( e ) => bare( e.url ) === bare( src ) ) || null;
}

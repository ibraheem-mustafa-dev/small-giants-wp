// Recording the replay file (Spec 48 FR-48-23). Pass 1 renders the draft in the sandbox with the network closed and lists
// the URLs it asks for on a recordable host (fonts, stock images) or as a pinned runtime script; the recorder then fetches
// exactly those in Node (with the browser's own User-Agent, so Google Fonts returns woff2), checks the pinned scripts
// against their SRI hashes, follows url() references inside recorded CSS, and writes a HAR 1.2 file keyed by the
// MANIFEST.json hash. The draft's own code never reaches the network.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PINNED_SCRIPTS, FONT_HOSTS, DROP_HEADERS, classifyUrl, hostOf, openSandbox } from './intake-sandbox.mjs';

const IMAGE_ACCEPT = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';

const fetchOk = async ( url, headers ) => {
	const res = await fetch( url, { headers, redirect: 'follow' } );
	if ( 200 !== res.status ) {
		throw new Error( `recording ${ url }: HTTP ${ res.status }` );
	}
	return res;
};

// The pinned runtime scripts fetched in Node and checked against their SRI hashes: { url: Buffer }.
export async function fetchPinned( { integrity = PINNED_SCRIPTS } = {} ) {
	const out = {};
	for ( const [ url, sri ] of Object.entries( integrity ) ) {
		const body = Buffer.from( await ( await fetchOk( url, {} ) ).arrayBuffer() );
		assertIntegrity( url, body, sri );
		out[ url ] = body;
	}
	return out;
}

// Throws unless `body` matches the SRI value ("sha384-<base64>", also sha256/sha512).
export function assertIntegrity( url, body, sri ) {
	const [ alg, want ] = sri.split( /-(.*)/s );
	const got = crypto.createHash( alg ).update( body ).digest( 'base64' );
	if ( got !== want ) {
		throw new Error( `recording ${ url }: body does not match its declared integrity ${ sri } (got ${ alg }-${ got })` );
	}
}

// Pass 1 of recording: renders each page in `visits` at each width with the network closed (pinned scripts from a
// Node fetch or the HAR, fonts and images from the HAR when it already holds them) and lists every URL the draft asked
// for on a recordable host or as a pinned script. Returns { urls, blocked (unlisted hosts), userAgent, manifestHash }.
export async function discoverRequests( { folder, index, widths = [ 1440 ], visits = [ index ], stockHosts = [], harPath = null } ) {
	const pinnedBodies = harPath && fs.existsSync( harPath ) ? {} : await fetchPinned();
	const sb = await openSandbox( { folder, index, harPath, mode: 'discover', widths, stockHosts, pinnedBodies } );
	try {
		for ( const width of widths ) {
			for ( const v of visits ) {
				await ( await sb.visit( v, { width } ) ).close();
			}
		}
		const page = await sb.newPage();
		const userAgent = await page.evaluate( () => navigator.userAgent );
		await page.close();
		const urls = [ ...new Set( sb.requests.filter( ( r ) => [ 'recordable', 'pinned' ].includes( r.kind ) ).map( ( r ) => r.url.split( '#' )[ 0 ] ) ) ].sort();
		return { urls, blocked: sb.blocked.filter( ( b ) => 'unlisted-host' === b.reason ), userAgent, manifestHash: sb.manifest.manifestHash };
	} finally {
		await sb.close();
	}
}

const readHar = ( harPath ) => ( fs.existsSync( harPath ) ? JSON.parse( fs.readFileSync( harPath, 'utf8' ) ) : null );

function harEntry( url, reqHeaders, res, body ) {
	const headers = [ ...res.headers ].filter( ( [ n ] ) => ! DROP_HEADERS.has( n.toLowerCase() ) ).map( ( [ name, value ] ) => ( { name, value } ) );
	const mimeType = res.headers.get( 'content-type' ) || 'application/octet-stream';
	const text = /^(text\/|application\/(javascript|json))/.test( mimeType );
	const u = new URL( url );
	return {
		startedDateTime: new Date().toISOString(), time: 0,
		request: { method: 'GET', url, httpVersion: 'HTTP/1.1', cookies: [], headers: Object.entries( reqHeaders ).map( ( [ name, value ] ) => ( { name, value } ) ), queryString: [ ...u.searchParams ].map( ( [ name, value ] ) => ( { name, value } ) ), headersSize: -1, bodySize: 0 },
		response: { status: 200, statusText: 'OK', httpVersion: 'HTTP/1.1', cookies: [], headers, content: { size: body.length, mimeType, ...( text ? { text: body.toString( 'utf8' ) } : { text: body.toString( 'base64' ), encoding: 'base64' } ) }, redirectURL: '', headersSize: -1, bodySize: body.length },
		cache: {}, timings: { send: 0, wait: 0, receive: 0 },
	};
}

// Pass 2 of recording, in Node with no draft code: fetches each URL not already in the HAR at `harPath` (sending the
// browser's User-Agent, so Google Fonts answers with woff2), checks pinned scripts against their SRI, follows every
// url(...) on a recordable host inside recorded CSS until none is new, and writes a HAR 1.2 file (binary bodies in
// base64). Refuses any URL the sandbox would not replay. Returns { harPath, added, entries, bytes }.
export async function recordReplay( { urls, harPath, userAgent, stockHosts = [], integrity = PINNED_SCRIPTS } ) {
	if ( ! userAgent ) {
		throw new Error( 'recordReplay needs the browser User-Agent (discoverRequests returns it)' );
	}
	const har = readHar( harPath ) || { log: { version: '1.2', creator: { name: 'sgs-computed-route intake-sandbox', version: '1.0' }, entries: [] } };
	const have = new Set( har.log.entries.map( ( e ) => e.request.url ) );
	const queue = [ ...urls ];
	const added = [];
	while ( queue.length ) {
		const url = queue.shift().split( '#' )[ 0 ];
		if ( have.has( url ) ) {
			continue;
		}
		const kind = classifyUrl( url, { origin: 'http://127.0.0.1:0', stockHosts } );
		if ( ! [ 'recordable', 'pinned' ].includes( kind ) ) {
			throw new Error( `recordReplay refuses ${ url }: ${ kind } URLs are never recorded` );
		}
		const host = hostOf( url );
		const reqHeaders = { 'user-agent': userAgent, accept: 'fonts.googleapis.com' === host ? 'text/css,*/*;q=0.1' : FONT_HOSTS.includes( host ) || 'pinned' === kind ? '*/*' : IMAGE_ACCEPT };
		const res = await fetchOk( url, reqHeaders );
		const body = Buffer.from( await res.arrayBuffer() );
		if ( integrity[ url ] ) {
			assertIntegrity( url, body, integrity[ url ] );
		}
		har.log.entries.push( harEntry( url, reqHeaders, res, body ) );
		have.add( url );
		added.push( url );
		if ( /text\/css/.test( res.headers.get( 'content-type' ) || '' ) ) {
			for ( const m of body.toString( 'utf8' ).matchAll( /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g ) ) {
				const ref = new URL( m[ 1 ], url ).href;
				if ( 'recordable' === classifyUrl( ref, { origin: 'http://127.0.0.1:0', stockHosts } ) && ! have.has( ref ) ) {
					queue.push( ref );
				}
			}
		}
	}
	fs.mkdirSync( path.dirname( harPath ), { recursive: true } );
	const text = JSON.stringify( har );
	fs.writeFileSync( harPath, text );
	return { harPath, added, entries: har.log.entries.length, bytes: Buffer.byteLength( text ) };
}

// Records an export's replay file: discover, record, and discover again through the new HAR until a pass asks for no
// URL the HAR lacks (at most `rounds` passes; still finding new URLs after that throws). Returns { harPath, urls,
// blocked, rounds }.
export async function recordExport( { folder, index, harPath, widths = [ 1440 ], visits = [ index ], stockHosts = [], rounds = 4 } ) {
	for ( let n = 1; n <= rounds; n++ ) {
		const found = await discoverRequests( { folder, index, widths, visits, stockHosts, harPath } );
		const have = new Set( ( readHar( harPath )?.log.entries || [] ).map( ( e ) => e.request.url ) );
		const missing = found.urls.filter( ( u ) => ! have.has( u ) );
		if ( ! missing.length && fs.existsSync( harPath ) ) {
			return { harPath, urls: found.urls, blocked: found.blocked, rounds: n };
		}
		await recordReplay( { urls: missing, harPath, userAgent: found.userAgent, stockHosts } );
	}
	throw new Error( `recordExport: the draft still asked for unrecorded URLs after ${ rounds } passes` );
}

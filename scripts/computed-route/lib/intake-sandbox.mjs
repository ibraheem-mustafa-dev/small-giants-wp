// Running a draft safely (Spec 48 FR-48-23, Spec 48A FR-48A-10). Intake renders a draft only through
// lib/draft.mjs::serveDraft in a fresh, non-persistent Chromium context launched behind a refusing "trap" proxy with no
// bypass list (Playwright also forces loopback through it), so the browser itself reaches nothing. Every request is
// answered by a route handler: the draft server's exact origin (scheme, host and port) is fetched by Node from
// serveDraft and fulfilled; fonts, stock images and the three pinned runtime scripts come from a per-export
// record-and-replay HAR; everything else (another host, another loopback port) is aborted and listed as a blocked row,
// and every WebSocket is closed and listed. The recording step fetches in Node and runs no draft code.
// Nothing here reads .claude/secrets/; the secret-free worker process is lib/intake-process.mjs.
import fs from 'fs';
import net from 'net';
import path from 'path';
import { serveDraft } from './draft.mjs';
import { readJson, sha256, walkFolder, REPO } from './handoff.mjs';
import { loadChromium } from './fill-read.mjs';

// The three runtime scripts every known support.js build pins, with the SRI hash it declares for each.
export const PINNED_SCRIPTS = {
	'https://unpkg.com/react@18.3.1/umd/react.production.min.js': 'sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z',
	'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': 'sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1',
	'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js': 'sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y',
};
export const FONT_HOSTS = [ 'fonts.googleapis.com', 'fonts.gstatic.com' ];
// Stock-image hosts a draft may name; a caller adds any other host the draft names through `stockHosts`.
export const STOCK_HOSTS = [ 'images.unsplash.com' ];
// Response headers never replayed or passed on: transport framing and cookies.
export const DROP_HEADERS = new Set( [ 'content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie', 'alt-svc' ] );

// The hostname of a URL, or null when it does not parse.
// Node's fetch of the draft origin, retried when the socket fails with ENOBUFS (Windows runs out of socket buffer space
// when many browsers and fetches run at once; the same request succeeds a moment later). Any other failure, and the
// last ENOBUFS after `attempts` tries, is thrown unchanged.
const isNoBufs = ( e ) => 'ENOBUFS' === e?.code || 'ENOBUFS' === e?.cause?.code;
export async function fetchOrigin( url, init, { attempts = 5, delayMs = 100, fetchImpl = fetch } = {} ) {
	for ( let i = 1; ; i++ ) {
		try {
			return await fetchImpl( url, init );
		} catch ( e ) {
			if ( ! isNoBufs( e ) || i >= attempts ) {
				throw e;
			}
			await new Promise( ( r ) => setTimeout( r, delayMs * i ) );
		}
	}
}

export const hostOf = ( url ) => {
	try {
		return new URL( url ).hostname;
	} catch {
		return null;
	}
};
// How long the context must be request-free before pending blocked rows get their draft IDs.
const QUIET_MS = 300;
// How long one draft ID lookup may take before it is given up as draftIdError.
const RESOLVE_MS = 5000;
const escapeRe = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

// What the sandbox does with a URL: 'origin' (the draft server), 'inline' (data:, blob:), 'pinned' (one of the three
// runtime scripts), 'recordable' (a font or stock-image host, replayed from the HAR) or 'unlisted' (always aborted).
export function classifyUrl( url, { origin, stockHosts = [] } ) {
	if ( /^(data|blob):/.test( url ) ) {
		return 'inline';
	}
	if ( url === origin || url.startsWith( `${ origin }/` ) ) {
		return 'origin';
	}
	if ( Object.hasOwn( PINNED_SCRIPTS, url.split( '#' )[ 0 ] ) ) {
		return 'pinned';
	}
	const host = hostOf( url );
	return url.startsWith( 'https://' ) && [ ...FONT_HOSTS, ...STOCK_HOSTS, ...stockHosts ].includes( host ) ? 'recordable' : 'unlisted';
}

// The URL filter the HAR replays: the pinned scripts exactly, and anything on a font or stock host.
export function replayFilter( stockHosts = [] ) {
	const hosts = [ ...FONT_HOSTS, ...STOCK_HOSTS, ...stockHosts ].map( escapeRe ).join( '|' );
	const pinned = Object.keys( PINNED_SCRIPTS ).map( escapeRe ).join( '|' );
	return new RegExp( `^(?:https://(?:${ hosts })/|(?:${ pinned })(?:#.*)?$)` );
}

// The replay file for an export: sites/<client>/build/intake/replay/<manifest hash>.har.
export const replayPath = ( client, manifestHash ) => path.join( REPO, 'sites', client, 'build', 'intake', 'replay', `${ manifestHash }.har` );

// Before anything runs: MANIFEST.json must say schema_version "1.0", every listed file must exist with the listed
// bytes and SHA-256, no unlisted file may sit beside them, and runtime_sha256 must be support.js. Throws naming the
// first kind of mismatch; returns { manifestHash, schemaVersion, files } (manifestHash: SHA-256 of MANIFEST.json's bytes).
export function recheckManifest( folder ) {
	const file = path.join( folder, 'MANIFEST.json' );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `${ folder }: MANIFEST.json is missing; intake does not run an export it cannot verify` );
	}
	const bytes = fs.readFileSync( file );
	const m = readJson( file );
	if ( m.error ) {
		throw new Error( `MANIFEST.json is not valid JSON (${ m.error })` );
	}
	if ( '1.0' !== m.data.schema_version ) {
		throw new Error( `MANIFEST.json schema_version is ${ JSON.stringify( m.data.schema_version ) }; intake reads version "1.0" only` );
	}
	if ( ! Array.isArray( m.data.files ) || ! m.data.files.length ) {
		throw new Error( 'MANIFEST.json lists no files' );
	}
	const problems = [];
	const listed = new Set();
	for ( const e of m.data.files ) {
		listed.add( e.path );
		const abs = path.resolve( folder, e.path );
		if ( ! abs.startsWith( path.resolve( folder ) + path.sep ) || ! fs.existsSync( abs ) ) {
			problems.push( `${ e.path }: listed but not in the folder` );
			continue;
		}
		const buf = fs.readFileSync( abs );
		if ( buf.length !== e.bytes ) {
			problems.push( `${ e.path }: ${ buf.length } bytes, MANIFEST.json says ${ e.bytes }` );
		} else if ( sha256( buf ) !== e.sha256 ) {
			problems.push( `${ e.path }: SHA-256 does not match MANIFEST.json` );
		}
	}
	const { files, problems: walk } = walkFolder( folder );
	problems.push( ...walk, ...files.filter( ( f ) => 'MANIFEST.json' !== f && ! listed.has( f ) ).map( ( f ) => `${ f }: in the folder but not listed in MANIFEST.json` ) );
	const support = path.join( folder, 'support.js' );
	if ( fs.existsSync( support ) && m.data.runtime_sha256 !== sha256( fs.readFileSync( support ) ) ) {
		problems.push( 'support.js: SHA-256 is not MANIFEST.json runtime_sha256' );
	}
	if ( problems.length ) {
		throw new Error( `MANIFEST.json does not match the export:\n${ problems.join( '\n' ) }` );
	}
	return { manifestHash: sha256( bytes ), schemaVersion: m.data.schema_version, files: m.data.files };
}

// The runtime scripts a support.js pins ({ url: sri }, from its `var X_URL = "…"; var X_SRI = "…"` pairs). Throws when
// they are not exactly PINNED_SCRIPTS, so a build pinning other files never gets network it was not given.
export function runtimePins( supportSrc ) {
	const pins = {};
	for ( const m of supportSrc.matchAll( /var\s+(\w+)_URL\s*=\s*"([^"]+)";\s*var\s+\1_SRI\s*=\s*"([^"]+)"/g ) ) {
		pins[ m[ 2 ] ] = m[ 3 ];
	}
	const want = JSON.stringify( Object.entries( PINNED_SCRIPTS ).sort() );
	if ( JSON.stringify( Object.entries( pins ).sort() ) !== want ) {
		throw new Error( `support.js pins ${ JSON.stringify( pins ) }, not the three pinned runtime scripts with their SRI hashes` );
	}
	return pins;
}

// A local proxy that refuses every request and logs it ({ method, target }). The browser is launched behind it with no
// bypass, so a request no route handler answers (and anything route interception cannot see, such as a preconnect)
// never leaves the browser, loopback included.
export async function startTrapProxy() {
	const attempts = [];
	const sockets = new Set();
	const server = net.createServer( ( sock ) => {
		sockets.add( sock );
		sock.on( 'close', () => sockets.delete( sock ) );
		sock.on( 'error', ( e ) => attempts.push( { method: 'ERROR', target: e.message } ) );
		sock.once( 'data', ( chunk ) => {
			const [ method, target ] = chunk.toString( 'latin1' ).split( '\r\n' )[ 0 ].split( ' ' );
			attempts.push( { method, target } );
			sock.end( 'HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n' );
		} );
	} );
	await new Promise( ( done, fail ) => server.once( 'error', fail ).listen( 0, '127.0.0.1', done ) );
	return {
		server: `http://127.0.0.1:${ server.address().port }`, attempts,
		close: () => new Promise( ( done ) => {
			sockets.forEach( ( s ) => s.destroy() );
			server.close( () => done() );
		} ),
	};
}

// In-page: the draft ID (nearest [data-dc-tpl]) of the element whose src, href, srcset, data or poster names `url`.
function draftIdInPage( url ) {
	for ( const el of document.querySelectorAll( '[src],[href],[srcset],[data],[poster]' ) ) {
		const names = [ el.src, el.href, el.currentSrc, el.data, el.poster, ...( el.getAttribute( 'srcset' ) || '' ).split( ',' ).map( ( s ) => {
			try {
				return new URL( s.trim().split( /\s+/ )[ 0 ], document.baseURI ).href;
			} catch {
				return '';
			}
		} ) ];
		if ( names.includes( url ) ) {
			return el.closest( '[data-dc-tpl]' )?.getAttribute( 'data-dc-tpl' ) ?? null;
		}
	}
	return null;
}

// The draft ID behind a blocked request. An iframe navigation resolves through its frame element; any other
// element-initiated load is matched by URL against src/href/srcset/data/poster in the requesting frame's DOM. A
// CSS-initiated load (a background image, a font, an @import) has no element: null. A frame that has gone is reported
// in draftIdError, never as a silent null. A page that does not answer within `limit` ms (a wedged main thread) is
// reported in draftIdError too, so it can never hold up a page close or close().
async function resolveDraftId( row, request, limit ) {
	const lookup = async () => {
		const frame = request.frame();
		if ( request.isNavigationRequest() && frame.parentFrame() ) {
			// A frame the runtime replaced (the pre-boot parse of the raw template) is matched by URL in the page instead.
			return frame.isDetached()
				? frame.page().mainFrame().evaluate( draftIdInPage, row.url )
				: ( await frame.frameElement() ).evaluate( ( e ) => e.closest( '[data-dc-tpl]' )?.getAttribute( 'data-dc-tpl' ) ?? null );
		}
		return frame.evaluate( draftIdInPage, row.url );
	};
	let timer = null;
	try {
		row.draftId = await Promise.race( [ lookup(), new Promise( ( done, fail ) => {
			timer = setTimeout( () => fail( new Error( `the page did not answer the draft ID lookup within ${ limit } ms` ) ), limit );
		} ) ] );
	} catch ( e ) {
		row.draftId = null;
		row.draftIdError = e.message;
	} finally {
		clearTimeout( timer );
	}
}

// Opens the sandbox for a verified export. mode 'replay': fonts, stock images and pinned scripts are served from
// `harPath` only. mode 'discover': the same, except that a missing HAR is allowed and the pinned scripts may be served
// from `pinnedBodies` ({ url: Buffer }) fetched in Node. Every other non-origin request is aborted. Returns
// { browser, context, origin, manifest, newPage, visit, requests, blocked, proxyAttempts, close }:
//   requests: { url, host, kind (classifyUrl), outcome: origin|inline|har|memory|aborted|failed } for every request;
//   blocked:  { url, host, reason: 'unlisted-host'|'replay-miss'|'websocket', draftId } for every aborted request
//             and every WebSocket (a loopback port other than the draft server's is an unlisted host);
//   Every aborted request's draft ID is resolved once the context is request-free for QUIET_MS, on any page it opens
//   (visit() and newPage() alike); a row found no ID then is retried at the next quiet spell and settled for good when
//   its page closes, in visit() or in close(). An ID that cannot be resolved (or a lookup the page does not answer
//   within `resolveTimeout` ms) leaves draftId null with draftIdError set.
//   visit(pagePath, { width }) renders a draft page, waits for the runtime and fonts, scrolls it through, waits for the
//   pending ID resolutions and returns the page; close() waits for them too.
export async function openSandbox( { folder, index, harPath = null, mode = 'replay', widths = [ 1440 ], stockHosts = [], pinnedBodies = {}, headless = true, timeout = 60000, resolveTimeout = RESOLVE_MS } ) {
	if ( ! [ 'replay', 'discover' ].includes( mode ) ) {
		throw new Error( `openSandbox mode must be 'replay' or 'discover', not ${ JSON.stringify( mode ) }` );
	}
	const manifest = recheckManifest( folder );
	runtimePins( fs.readFileSync( path.join( folder, 'support.js' ), 'utf8' ) );
	const hasHar = Boolean( harPath ) && fs.existsSync( harPath );
	if ( 'replay' === mode && ! hasHar ) {
		throw new Error( `replay needs the recorded HAR ${ harPath }; record it first (recordExport)` );
	}
	const srv = await serveDraft( folder, { index } );
	const origin = new URL( srv.url ).origin;
	const trap = await startTrapProxy();
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless, proxy: { server: trap.server } } );
	const context = await browser.newContext( { serviceWorkers: 'block', viewport: { width: widths[ 0 ], height: 900 } } );
	const requests = [];
	const blocked = [];
	const rows = new Map();
	// Aborted requests awaiting their draft ID. The runtime stamps data-dc-tpl after the request fires, so a row is resolved
	// once the page is quiet (no request in flight for QUIET_MS), when a page opened here closes, in visit() and in close():
	// a page opened with newPage() (the census, defect and harness pages) gets IDs exactly as visit() does.
	// The quiet-timer drain is an early attempt: the runtime may not have stamped the element yet, so a row it finds no
	// ID for (and no error) goes back to `pending`. Only a final drain (visit(), close(), a newPage close) accepts null.
	const pending = [];
	let resolving = Promise.resolve();
	let inflight = 0;
	let quiet = null;
	const drain = ( final = true ) => {
		resolving = resolving.then( async () => {
			for ( const [ b, req ] of pending.splice( 0 ) ) {
				await resolveDraftId( b, req, resolveTimeout );
				if ( ! final && null === b.draftId && ! b.draftIdError ) {
					pending.push( [ b, req ] );
				}
			}
		} );
		return resolving;
	};
	context.on( 'request', ( r ) => {
		const row = { url: r.url(), host: hostOf( r.url() ), kind: classifyUrl( r.url(), { origin, stockHosts } ), outcome: null };
		rows.set( r, row );
		requests.push( row );
		inflight++;
		clearTimeout( quiet );
	} );
	const settled = () => {
		inflight = Math.max( 0, inflight - 1 );
		if ( 0 === inflight ) {
			quiet = setTimeout( () => void drain( false ), QUIET_MS );
		}
	};
	context.on( 'requestfinished', ( r ) => {
		settled();
		const row = rows.get( r );
		if ( row && ! row.outcome ) {
			row.outcome = 'origin' === row.kind || 'inline' === row.kind ? row.kind : 'har';
		}
	} );
	context.on( 'requestfailed', ( r ) => {
		settled();
		const row = rows.get( r );
		if ( row && ! row.outcome ) {
			row.outcome = 'failed';
			row.failure = r.failure()?.errorText ?? 'unknown failure';
		}
	} );
	// Registered first, so it runs last: whatever the HAR did not answer.
	await context.route( '**/*', async ( route ) => {
		const req = route.request();
		const url = req.url();
		const kind = classifyUrl( url, { origin, stockHosts } );
		const row = rows.get( req );
		if ( 'inline' === kind ) {
			return route.continue();
		}
		if ( 'origin' === kind ) {
			// Node fetches it from serveDraft (folder-confined); the browser opens no connection of its own.
			const range = req.headers().range;
			const res = await fetchOrigin( url, { redirect: 'manual', headers: range ? { range } : {} } );
			return route.fulfill( { status: res.status, headers: Object.fromEntries( [ ...res.headers ].filter( ( [ n ] ) => ! DROP_HEADERS.has( n ) ) ), body: Buffer.from( await res.arrayBuffer() ) } );
		}
		const body = pinnedBodies[ url.split( '#' )[ 0 ] ];
		if ( 'pinned' === kind && body && 'discover' === mode ) {
			if ( row ) {
				row.outcome = 'memory';
			}
			return route.fulfill( { status: 200, body, contentType: 'text/javascript; charset=utf-8', headers: { 'access-control-allow-origin': '*' } } );
		}
		if ( row ) {
			row.outcome = 'aborted';
		}
		const b = { url, host: hostOf( url ), reason: 'unlisted' === kind ? 'unlisted-host' : 'replay-miss', draftId: null };
		blocked.push( b );
		pending.push( [ b, req ] );
		return route.abort( 'blockedbyclient' );
	} );
	await context.routeWebSocket( /.*/, ( ws ) => {
		blocked.push( { url: ws.url(), host: hostOf( ws.url() ), reason: 'websocket', draftId: null } );
		ws.close( { code: 1008, reason: 'blocked by the intake sandbox' } );
	} );
	if ( hasHar ) {
		await context.routeFromHAR( harPath, { notFound: 'fallback', url: replayFilter( stockHosts ) } );
	}
	const newPage = async () => {
		const page = await context.newPage();
		const closePage = page.close.bind( page );
		page.close = async ( ...args ) => {
			await drain().catch( () => {} );
			return closePage( ...args );
		};
		return page;
	};
	const visit = async ( pagePath = index, { width = widths[ 0 ], height = 900 } = {} ) => {
		const page = await newPage();
		await page.setViewportSize( { width, height } );
		const [ file, query = '' ] = pagePath.split( /\?(.*)/s );
		await page.goto( `${ origin }/${ file.split( '/' ).map( encodeURIComponent ).join( '/' ) }${ query ? `?${ query }` : '' }`, { waitUntil: 'load', timeout } );
		await page.waitForFunction( () => document.querySelector( '#dc-root [data-dc-tpl]' ) && 'function' === typeof window.__dcAnnotatedTemplate && window.__dcAnnotatedTemplate( window.__dcRootName() ), null, { timeout } );
		await page.evaluate( async () => {
			const step = Math.max( 200, window.innerHeight - 100 );
			for ( let y = 0; y < document.documentElement.scrollHeight; y += step ) {
				window.scrollTo( 0, y );
				await new Promise( ( r ) => setTimeout( r, 60 ) );
			}
			window.scrollTo( 0, 0 );
			await document.fonts.ready;
		} );
		await page.waitForLoadState( 'networkidle', { timeout } );
		await drain();
		return page;
	};
	const close = async () => {
		clearTimeout( quiet );
		await drain();
		await browser.close();
		await srv.close();
		await trap.close();
	};
	return { browser, context, origin, manifest, newPage, visit, requests, blocked, proxyAttempts: trap.attempts, close };
}

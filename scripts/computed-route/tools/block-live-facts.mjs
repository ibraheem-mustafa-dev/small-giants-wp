#!/usr/bin/env node
// The live read of the identification facts the code read leaves unknown (Spec 48 F1 step A2b; rules in
// lib/block-live-facts.mjs). Read-only on the mirrors: WP-CLI `eval-file -` lists the pages and the blocks saved inside
// each block, then one headless Chromium renders every page, logged out, at 375, 768 and 1440 and reads each instance.
//   node scripts/computed-route/tools/block-live-facts.mjs [--sites local-indus,local-mamas,local-eye-care] [--db <file>] [--write] [--check] [--json]
// Without --write or --check it prints the counts and writes nothing. --write writes data/block-live-facts.json.
// --check reads again and compares the yes values with the file (evidence and instance counts moving are not drift);
// exit 1 on drift. Theme scripts are refused (lib/block-live-facts.mjs::THEME_SCRIPT). Requests to a Hostinger host are refused, so a mirror page that still names its test site's address
// never reaches it. One browser at a time: the read opens one.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb, DB_PATH } from '../lib/db.mjs';
import { wpEvalRunner } from '../lib/calibration-refs.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import { browserPidOf, closeBrowser } from '../lib/browser-close.mjs';
import { INVENTORY_PHP, THEME_SCRIPT, WIDTHS, absorb, blocksToRead, codeFacts, compareLive, liveFile, readInstances, targetsFor } from '../lib/block-live-facts.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROUTE = path.resolve( HERE, '..' );
const REPO = path.resolve( ROUTE, '..', '..' );
export const LIVE_FILE = path.join( ROUTE, 'data', 'block-live-facts.json' );
export const DEFAULT_SITES = [ 'local-indus', 'local-mamas', 'local-eye-care' ];
const REFUSED_HOST = /(^|\.)(hostingersite\.com|hstgr\.(io|cloud))$/i;

function args( argv ) {
	const o = { sites: DEFAULT_SITES, db: process.env.SGS_FRAMEWORK_DB || DB_PATH, write: false, check: false, json: false };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( '--sites' === a ) {
			o.sites = String( argv[ ++i ] || '' ).split( ',' ).filter( Boolean );
		} else if ( '--db' === a ) {
			o.db = argv[ ++i ];
		} else if ( [ '--write', '--check', '--json' ].includes( a ) ) {
			o[ a.slice( 2 ) ] = true;
		} else {
			throw new Error( `unknown argument ${ a }` );
		}
	}
	return o;
}

// The mirror's inventory (INVENTORY_PHP's JSON). A target that is not a WSL mirror is refused: the read never runs on
// a hosted site.
export function inventoryOf( site, targets ) {
	const t = targets[ site ];
	if ( ! t || ! /^\/\/wsl\.localhost\//.test( String( t.pluginDir || '' ) ) ) {
		throw new Error( `${ site } is not a local WSL mirror in calibration-targets.json; the live read runs on mirrors only` );
	}
	const raw = wpEvalRunner( t, site, REPO )( INVENTORY_PHP );
	return JSON.parse( raw.slice( raw.indexOf( '{' ) ) );
}

async function readPage( context, url, width, targets ) {
	const page = await context.newPage();
	try {
		await page.setViewportSize( { width, height: 900 } );
		await page.goto( url, { waitUntil: 'load', timeout: 60000 } );
		await page.waitForLoadState( 'networkidle', { timeout: 10000 } ).catch( () => {} );
		// Scroll the page through so scroll- and visibility-triggered motion runs, then let it settle.
		await page.evaluate( async () => {
			for ( let y = 0; y < document.documentElement.scrollHeight; y += Math.max( 300, innerHeight * 0.8 ) ) {
				scrollTo( 0, y );
				await new Promise( ( r ) => setTimeout( r, 120 ) );
			}
			scrollTo( 0, document.documentElement.scrollHeight );
		} );
		await page.waitForTimeout( 1200 );
		return await page.evaluate( readInstances, targets );
	} finally {
		await page.close().catch( () => {} );
	}
}

export async function run( o ) {
	const db = openDb( o.db );
	let code;
	try {
		code = codeFacts( db );
	} finally {
		db.close();
	}
	const toRead = blocksToRead( code );
	const targetsJson = JSON.parse( fs.readFileSync( path.join( ROUTE, 'calibration-targets.json' ), 'utf8' ) );
	const acc = { blocks: {}, conflicts: {}, outside: {} };
	const sites = {};
	const failures = [];
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true, args: [ '--hide-scrollbars' ] } );
	const pid = await browserPidOf( browser );
	try {
		for ( const site of o.sites ) {
			const inv = inventoryOf( site, targetsJson );
			const targets = targetsFor( toRead, inv );
			const urls = Object.keys( inv.urls ).sort();
			sites[ site ] = { origin: inv.origin, pages: urls.map( ( u ) => ( { path: new URL( u ).pathname, why: inv.urls[ u ] } ) ) };
			const context = await browser.newContext();
			await context.route( '**/*', ( route ) => {
				const u = new URL( route.request().url() );
				return REFUSED_HOST.test( u.hostname ) || THEME_SCRIPT.test( u.pathname ) ? route.abort() : route.continue();
			} );
			try {
				for ( const url of urls ) {
					for ( const width of WIDTHS ) {
						try {
							const read = await readPage( context, url, width, targets );
							absorb( acc, read, { site, path: new URL( url ).pathname, width }, code, inv );
						} catch ( e ) {
							failures.push( `${ site } ${ url } @${ width }: ${ String( e.message ).split( '\n' )[ 0 ] }` );
						}
					}
					process.stderr.write( `[block-live-facts] ${ site } ${ new URL( url ).pathname }\n` );
				}
			} finally {
				await context.close().catch( () => {} );
			}
		}
	} finally {
		await closeBrowser( browser, pid );
	}
	const file = liveFile( acc, { sites, toRead, readOn: new Date().toISOString().slice( 0, 10 ) } );
	if ( failures.length ) {
		file.failures = failures;
	}
	return file;
}

function summary( file ) {
	const yes = Object.values( file.blocks ).reduce( ( n, e ) => n + Object.values( e.facts ).reduce( ( m, v ) => m + Object.keys( v ).length, 0 ), 0 );
	const pages = Object.entries( file.sites ).map( ( [ s, x ] ) => `${ s } ${ x.pages.length }` ).join( ', ' );
	return [
		`[block-live-facts] pages read: ${ pages } (x ${ file.widths.join( '/' ) })`,
		`  blocks seen ${ Object.keys( file.blocks ).length }, yes values ${ yes }, on no page ${ file.notSeen.length }: ${ file.notSeen.join( ', ' ) }`,
		`  conflicts (code no, seen live) ${ Object.values( file.conflicts ).reduce( ( n, c ) => n + Object.keys( c ).length, 0 ) }, outside the vocabulary ${ Object.values( file.outsideVocabulary ).reduce( ( n, c ) => n + Object.keys( c ).length, 0 ) }, failed page reads ${ ( file.failures || [] ).length }`,
	].join( '\n' );
}

async function main() {
	let o;
	try {
		o = args( process.argv.slice( 2 ) );
	} catch ( e ) {
		console.error( e.message );
		return 2;
	}
	const file = await run( o );
	if ( o.check ) {
		if ( ! fs.existsSync( LIVE_FILE ) ) {
			console.log( `[block-live-facts] FAIL: ${ path.relative( REPO, LIVE_FILE ) } is absent; run with --write` );
			return 1;
		}
		const d = compareLive( JSON.parse( fs.readFileSync( LIVE_FILE, 'utf8' ) ), file );
		const n = d.gained.length + d.lost.length + d.notSeenNow.length + d.seenNow.length;
		console.log( n ? `[block-live-facts] DRIFT: ${ d.gained.length } yes values gained, ${ d.lost.length } lost, ${ d.seenNow.length } blocks newly seen, ${ d.notSeenNow.length } no longer seen; rerun with --write` : `[block-live-facts] OK: ${ path.relative( REPO, LIVE_FILE ) } matches a fresh read` );
		for ( const k of [ ...d.gained.map( ( x ) => '+ ' + x ), ...d.lost.map( ( x ) => '- ' + x ), ...d.seenNow.map( ( x ) => '+ seen ' + x ), ...d.notSeenNow.map( ( x ) => '- seen ' + x ) ].slice( 0, 30 ) ) {
			console.log( '  ' + k );
		}
		return n ? 1 : 0;
	}
	if ( o.write ) {
		fs.writeFileSync( LIVE_FILE, JSON.stringify( file, null, '\t' ) + '\n' );
	}
	console.log( o.json ? JSON.stringify( file, null, '\t' ) : summary( file ) );
	return 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main().then( ( c ) => process.exit( c ), ( e ) => {
		console.error( e.stack || e.message );
		process.exit( 1 );
	} );
}

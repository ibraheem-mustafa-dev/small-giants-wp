// Shared helpers for the C3, C5 and C6 detectors (scripts/parity/detect.mjs): opening the draft and the live page the way the
// walker does, pairing a live block with its draft element through sites/<client>/build/<surface>.pairs.json, and the
// recorded rulings (sites/<client>/build/qa/divergences.json). Client-agnostic: every name comes from the client folder.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveFinder } from '../lib/collect.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '../../..' );
export const RESOLVE_SRC = resolveFinder.toString();

export async function loadPlaywright() {
	const candidates = [ 'scripts/computed-route/node_modules', 'plugins/sgs-blocks/node_modules' ];
	for ( const c of candidates ) {
		const f = path.join( REPO, c, 'playwright/index.mjs' );
		if ( fs.existsSync( f ) ) {
			return import( pathToFileURL( f ).href );
		}
	}
	throw new Error( 'playwright not found under scripts/computed-route or plugins/sgs-blocks' );
}

// Headless hides scrollbars by default, which is why the walker never saw them: every detector launches with them shown.
export async function launchReal( headless = true ) {
	const { chromium } = await loadPlaywright();
	return chromium.launch( { headless, ignoreDefaultArgs: [ '--hide-scrollbars' ] } );
}

export function clientDir( client ) {
	return path.join( REPO, 'sites', client );
}

export function loadPages( client, only = null ) {
	const map = JSON.parse( fs.readFileSync( path.join( clientDir( client ), 'build/page-map.json' ), 'utf8' ) );
	return map.filter( ( p ) => p.route && ( ! only || only.includes( p.route ) ) );
}

export const liveUrl = ( site, page ) => `${ site.replace( /\/$/, '' ) }/?page_id=${ page.id }`;
export const draftUrl = ( draft, page ) => `${ draft.replace( /\/$/, '' ) }/#/${ page.route }`;

const pairCache = new Map();
// 'cr-ref-home-88' -> the draft finder { tpl } from build/home.pairs.json, or null.
export function pairFor( client, ref ) {
	const m = /^cr-ref-(.+)-(\d+)$/.exec( ref || '' );
	if ( ! m ) {
		return null;
	}
	const file = path.join( clientDir( client ), 'build', `${ m[ 1 ] }.pairs.json` );
	if ( ! pairCache.has( file ) ) {
		pairCache.set( file, fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).pairs || {} : {} );
	}
	const hit = pairCache.get( file )[ ref ];
	return hit?.tpl ? { tpl: hit.tpl } : null;
}

export function loadRulings( client ) {
	const f = path.join( clientDir( client ), 'build/qa/divergences.json' );
	return fs.existsSync( f ) ? JSON.parse( fs.readFileSync( f, 'utf8' ) ) : [];
}

// A finding matches a ruling by node (ref, block slug or '*'), property ('*' or the finding's kind) and scope (page route, '*' or absent).
export function ruledBy( rulings, f ) {
	return rulings.find( ( e ) => ( '*' === e.node || ( f.ref && e.node === f.ref ) ) &&
		( '*' === e.property || e.property === f.kind ) && ( ! e.scope || '*' === e.scope || e.scope === f.page ) &&
		( ! e.widths || ! f.width || e.widths.includes( f.width ) ) ) || null;
}

// Opens one side. The draft gets a seeded Math.random so stamped content does not vary between reads.
export async function openSide( browser, side, url, width, height ) {
	const ctx = await browser.newContext( { viewport: { width, height }, reducedMotion: 'no-preference' } );
	if ( 'draft' === side ) {
		await ctx.addInitScript( () => {
			let s = 12345;
			Math.random = () => ( s = ( s * 1664525 + 1013904223 ) % 4294967296 ) / 4294967296;
		} );
	}
	const page = await ctx.newPage();
	await page.goto( url, { waitUntil: 'load', timeout: 60000 } );
	if ( 'draft' === side ) {
		await page.waitForSelector( '.sc-host', { timeout: 15000 } ).catch( () => {} );
	}
	await page.waitForTimeout( 1500 );
	return { ctx, page };
}

// Scrolls the page top to bottom and back so every scroll-in entrance has fired, then waits for them to end.
export async function settle( page, { fast = false } = {} ) {
	await page.evaluate( async ( [ step, pause ] ) => {
		const h = document.documentElement.scrollHeight;
		for ( let y = 0; y < h; y += step ) {
			window.scrollTo( 0, y );
			await new Promise( ( r ) => setTimeout( r, pause ) );
		}
		window.scrollTo( 0, 0 );
	}, fast ? [ 1200, 60 ] : [ 500, 120 ] );
	await page.waitForTimeout( fast ? 800 : 2000 );
}

export const finding = ( f ) => ( { status: 'fail', ...f } );
export const round = ( n ) => ( null === n || undefined === n ? n : Math.round( n * 10 ) / 10 );

// Runs one detector page-runner over every page, applying the recorded rulings. Returns { findings } where each finding
// also carries severity (fail, ruled, unmeasured, pass, info, n/a), check (kind) and trigger (state) for detect.mjs.
export async function runPages( runner, { client, site, draft, pages, widths, divergences } ) {
	const browser = await launchReal();
	const findings = [];
	try {
		for ( const pg of pages ) {
			let got;
			try {
				got = await runner( { browser, client, page: pg, liveUrl: liveUrl( site, pg ), draftUrl: draftUrl( draft, pg ), widths } );
			} catch ( e ) {
				got = [ { class: '?', page: pg.route, status: 'unmeasured', kind: 'page', reason: `page run failed: ${ String( e.message ).split( '\n' )[ 0 ] }` } ];
			}
			findings.push( ...got );
		}
	} finally {
		await browser.close();
	}
	for ( const f of findings ) {
		const rule = 'fail' === f.status ? ruledBy( divergences || [], f ) : null;
		if ( rule ) {
			f.status = 'ruled';
			f.ruling = rule.id;
		}
		f.severity = f.status;
		f.check = f.kind;
		f.trigger = f.state;
	}
	return { findings };
}

export function summary( findings ) {
	const by = {};
	for ( const f of findings ) {
		const k = f.severity || f.status;
		by[ k ] = ( by[ k ] || 0 ) + 1;
	}
	const fails = findings.filter( ( f ) => 'fail' === f.status );
	const perKind = {};
	const perPage = {};
	for ( const f of fails ) {
		perKind[ f.kind ] = ( perKind[ f.kind ] || 0 ) + 1;
		perPage[ f.page ] = ( perPage[ f.page ] || 0 ) + 1;
	}
	return [ `rows: ${ JSON.stringify( by ) }`, `fails per check: ${ JSON.stringify( perKind ) }`, `fails per page: ${ JSON.stringify( perPage ) }` ];
}

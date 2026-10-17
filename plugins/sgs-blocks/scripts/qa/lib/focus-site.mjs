/**
 * `--site` mode of probe-focus-system.mjs: resolve a target's URL from its secrets file, load each requested page
 * SERIALLY (parallel loads trip the canary's CDN bot protection and answer 403), Tab through it at each width, and
 * collect CSS bytes and axe results. Public pages only: no login, no password is read.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarise } from './focus-probe-lib.mjs';
import { tabThrough } from './focus-measure.mjs';
import { AXE_TAGS, axeSourcePath } from '../../motion-qa/probe-motion-a11y-lib.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..', '..', '..' );

/** The site's base URL from `.claude/secrets/<target>.env` (the first WP_URL_* key; the value is a public address). */
export function siteUrl( target ) {
	const file = path.join( REPO, '.claude', 'secrets', `${ target }.env` );
	if ( ! fs.existsSync( file ) ) throw new Error( `no secrets file for target "${ target }" (${ file })` );
	const line = fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).find( ( l ) => /^WP_URL_[A-Z0-9_]+=/.test( l ) );
	if ( ! line ) throw new Error( `no WP_URL_* key in ${ file }` );
	return line.split( '=' )[ 1 ].trim().replace( /^["']|["']$/g, '' ).replace( /\/+$/, '' );
}

const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

/** A page spec to a path: home, shop, cart, product (the first product the Store API lists), a number, or a path. */
export async function resolvePage( base, spec ) {
	if ( spec === 'home' ) return '/';
	if ( spec === 'shop' ) return '/shop/';
	if ( spec === 'cart' ) return '/cart/';
	if ( /^\d+$/.test( spec ) ) return `/?page_id=${ spec }`;
	if ( spec.startsWith( '/' ) ) return spec;
	if ( spec === 'product' ) {
		const res = await fetch( `${ base }/wp-json/wc/store/v1/products?per_page=1`, { headers: { Accept: 'application/json' } } );
		if ( res.ok ) {
			const [ first ] = await res.json();
			if ( first && first.permalink ) return new URL( first.permalink ).pathname;
		}
		throw new Error( 'could not resolve a product page from the Store API' );
	}
	throw new Error( `unknown page "${ spec }" (use home, shop, product, cart, a page id or a /path/)` );
}

/** Load a URL, retrying when the edge answers 403 or a challenge. Returns the final status. */
async function load( page, url ) {
	for ( let attempt = 0; attempt < 4; attempt++ ) {
		const res = await page.goto( url, { waitUntil: 'load', timeout: 60000 } );
		const title = await page.title();
		if ( res && res.status() < 400 && ! /forbidden|just a moment|checking your browser/i.test( title ) ) {
			await page.waitForLoadState( 'networkidle', { timeout: 15000 } ).catch( () => {} );
			return res.status();
		}
		console.log( `  edge answered ${ res ? res.status() : 'nothing' } (${ title }); backing off ${ 20 * ( attempt + 1 ) }s` );
		await sleep( 20000 * ( attempt + 1 ) );
	}
	throw new Error( `blocked by the edge at ${ url } (403 after retries); wait several minutes and rerun` );
}

/** Decoded CSS bytes the page loads: linked sheets fetched in-page, plus inline <style> text. */
async function cssBytes( page ) {
	return page.evaluate( async () => {
		let linked = 0;
		const unreadable = [];
		for ( const link of document.querySelectorAll( 'link[rel~="stylesheet"][href]' ) ) {
			try {
				linked += ( await ( await fetch( link.href ) ).text() ).length;
			} catch ( e ) {
				unreadable.push( link.href );
			}
		}
		let inline = 0;
		for ( const style of document.querySelectorAll( 'style' ) ) inline += style.textContent.length;
		return { linked, inline, total: linked + inline, unreadable: unreadable.length };
	} );
}

/** Run axe once on the loaded page. Returns { violations: [{ id, impact, nodes }] } or { error }. */
async function runAxe( page ) {
	const source = axeSourcePath();
	if ( ! source ) return { error: 'axe-core is not installed' };
	await page.addScriptTag( { path: source } );
	return page.evaluate( async ( tags ) => {
		const result = await window.axe.run( document, { runOnly: { type: 'tag', values: tags } } );
		return { violations: result.violations.map( ( v ) => ( { id: v.id, impact: v.impact, nodes: v.nodes.length } ) ) };
	}, AXE_TAGS );
}

/** Open the header drawer or the first mega panel when asked; says so and carries on when it is not there. */
async function openOverlay( page, opts ) {
	const notes = [];
	if ( opts.openDrawer ) {
		const burger = page.locator( '.sgs-nav-bar-menu__burger:visible' ).first();
		if ( await burger.count() ) {
			await burger.click();
			await page.waitForTimeout( 800 );
			notes.push( 'drawer opened' );
		} else {
			notes.push( 'drawer: not present' );
		}
	}
	if ( opts.openMega ) {
		const trigger = page.locator( '[data-sgs-mega-trigger]:visible' ).first();
		if ( await trigger.count() ) {
			await trigger.click();
			await page.waitForTimeout( 800 );
			notes.push( 'mega panel opened' );
		} else {
			notes.push( 'mega: not present' );
		}
	}
	return notes;
}

/**
 * Probe every requested page at every width, one after another. Returns [{ page, url, axe, widths: [{ width, css,
 * notes, stops, ended, summary }] }].
 */
export async function runSite( browser, opts, scratch ) {
	const base = siteUrl( opts.site );
	const mode = { forcedColors: opts.forcedColors, reducedMotion: opts.reducedMotion };
	const out = [];
	let first = true;
	for ( const spec of opts.pages ) {
		const urlPath = await resolvePage( base, spec );
		const url = base + urlPath;
		const entry = { page: spec, url, axe: null, widths: [] };
		for ( const width of opts.widths ) {
			if ( ! first ) await sleep( opts.pause );
			first = false;
			const context = await browser.newContext( {
				viewport: { width, height: 900 },
				forcedColors: opts.forcedColors ? 'active' : 'none',
				reducedMotion: opts.reducedMotion ? 'reduce' : 'no-preference',
			} );
			const page = await context.newPage();
			console.log( `loading ${ spec } @${ width } (${ url })` );
			await load( page, url );
			if ( opts.axe && entry.axe === null ) entry.axe = await runAxe( page );
			const css = await cssBytes( page );
			const notes = await openOverlay( page, opts );
			const run = await tabThrough( page, {
				maxStops: opts.maxStops,
				settle: opts.settle,
				forcedColors: opts.forcedColors,
				shotsDir: opts.shots,
				shotPrefix: `${ spec }-${ width }`,
				scratch,
			} );
			await context.close();
			entry.widths.push( { width, css, notes, stops: run.stops, ended: run.ended, summary: summarise( run.stops, mode ) } );
		}
		out.push( entry );
	}
	return out;
}

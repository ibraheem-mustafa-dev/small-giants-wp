/**
 * The pure judges and the offline harness of `probe-drawer-entrances.mjs` (Spec 38A M5.D): the expected clip extents and
 * band insets from the fixture's values, an `inset()` parser for computed clip-paths, and the harness page built from
 * the shipped PHP emitters' output for tests/fixtures/motion/pages/drawer-entrances.json.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PLUGIN = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );

/** The fixture's sweep and clip duration (ms) and the opener row the probe declares (px). */
export const DURATION = 600;
export const ROW = 64;

// ---- Pure judges ------------------------------------------------------------------------------------------------

/** Wipe down's visible extent (px from the top) at `ms` of a panel `h` tall. */
export const expectedWipe = ( ms, h ) => h * Math.min( 1, Math.max( 0, ms / DURATION ) );

/** Reveal from the bar's visible extent at `ms`, from the opener row `row` px down a panel `h` tall. */
export const expectedBar = ( ms, h, row = ROW ) => row + ( h - row ) * Math.min( 1, Math.max( 0, ms / DURATION ) );

/** The curtain band's [left, right] insets as shares of the width at `ms`, travelling `direction` (right or left). */
export function expectedBand( ms, direction = 'right' ) {
	const p = Math.min( 1, Math.max( 0, ms / DURATION ) );
	const lead = p <= 0.5 ? 1 - 2 * p : 0;
	const tail = p <= 0.5 ? 0 : 2 * p - 1;
	return 'right' === direction ? { left: tail, right: lead } : { left: lead, right: tail };
}

/** Split a CSS value on top-level spaces (parentheses kept whole). */
function topLevel( text ) {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const ch of text.trim() ) {
		depth += '(' === ch ? 1 : ')' === ch ? -1 : 0;
		if ( ' ' === ch && 0 === depth ) {
			if ( cur ) out.push( cur );
			cur = '';
		} else {
			cur += ch;
		}
	}
	if ( cur ) out.push( cur );
	return out;
}

/** A length-percentage (`12px`, `40%`, `0`, `calc(50% - 4px)`) in px against `basis`, or NaN. */
export function lengthPx( token, basis ) {
	const inner = token.replace( /^calc\((.*)\)$/, '$1' ).replace( /\s+/g, '' );
	const terms = inner.match( /[+-]?[\d.]+(?:px|%)?/g );
	if ( ! terms || terms.join( '' ) !== inner ) return NaN;
	return terms.reduce( ( sum, t ) => sum + ( t.endsWith( '%' ) ? ( parseFloat( t ) / 100 ) * basis : parseFloat( t ) ), 0 );
}

/** `inset(t r b l)` (one to four values, CSS shorthand) as px {top, right, bottom, left}, or null. */
export function parseInset( value, width, height ) {
	const m = /^inset\((.*)\)$/.exec( ( value || '' ).trim() );
	if ( ! m ) return null;
	const v = topLevel( m[ 1 ].replace( /\s+round\s.*$/, '' ) );
	const [ t, r = t, b = t, l = r ] = v;
	const out = { top: lengthPx( t, height ), right: lengthPx( r, width ), bottom: lengthPx( b, height ), left: lengthPx( l, width ) };
	return Object.values( out ).every( Number.isFinite ) ? out : null;
}

// ---- The offline harness ----------------------------------------------------------------------------------------

const HARNESS_ORIGIN = 'http://sgs.test';
const esc = ( s ) => String( s ).replace( /&/g, '&amp;' ).replace( /"/g, '&quot;' ).replace( /</g, '&lt;' );

export function harnessHtml() {
	const items = JSON.parse( execFileSync( 'php', [ path.join( PLUGIN, 'tests/php/run-motion-clip-edge-standalone.php' ), '--dump-harness' ], { encoding: 'utf8' } ) );
	const css = items.map( ( i ) => i.css ).join( '\n' );
	const panels = items.map( ( i ) => {
		const attrs = Object.entries( i.attrs || {} ).map( ( [ k, v ] ) => ` ${ k }="${ esc( v ) }"` ).join( '' );
		const layers = ( i.layers || [] ).map( ( l ) => `<span class="sgs-motion-layer" data-sgs-layer="${ esc( l ) }" aria-hidden="true"></span>` ).join( '' );
		return `<div class="panel ${ esc( i.className ) }"${ attrs }><p>${ esc( i.className ) }</p>${ layers }</div>`;
	} );
	return `<!doctype html><html><head><meta charset="utf-8"><title>drawer entrances harness</title>
<link rel="stylesheet" href="/assets/css/motion.css"><link rel="stylesheet" href="/assets/css/motion-triggers.css"><link rel="stylesheet" href="/assets/css/fx-curtain.css">
<style>
body { margin: 0; padding: 40px; font: 16px sans-serif; }
.panel { position: relative; height: 320px; margin: 0 0 24px; background: #ddd; color: #222; }
.panel p { margin: 0; padding: 16px; }
${ css }
</style></head><body>
${ panels.join( '\n' ) }
</body></html>`;
}

export async function openHarness( context, html ) {
	await context.route( `${ HARNESS_ORIGIN }/**`, ( route ) => {
		const rel = new URL( route.request().url() ).pathname;
		if ( rel === '/' || rel === '/harness.html' ) return route.fulfill( { status: 200, contentType: 'text/html', body: html } );
		const file = path.join( PLUGIN, rel );
		if ( ! file.startsWith( PLUGIN ) || ! fs.existsSync( file ) ) return route.fulfill( { status: 404, body: 'not found' } );
		return route.fulfill( { status: 200, contentType: 'text/css', body: fs.readFileSync( file ) } );
	} );
	const page = await context.newPage();
	await page.goto( `${ HARNESS_ORIGIN }/harness.html`, { waitUntil: 'load' } );
	return page;
}

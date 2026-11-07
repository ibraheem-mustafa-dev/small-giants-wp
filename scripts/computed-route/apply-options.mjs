#!/usr/bin/env node
// The applier's site-option step: values that live in site options, not block settings, read from the draft and written on the
// local mirror. Today: the reading progress bar (`sgs_floating_ui_reading_progress_gradient`, `_colour`, `_height`), read from the
// draft's fixed progress element (the element the handoff's scroll record scales: a `transform` from scaleX(0) to scaleX(1)
// driven by the scroll position). A dry run prints each option, the draft's value and the mirror's; --write sets them.
//   node scripts/computed-route/apply-options.mjs <client> [--draft http://127.0.0.1:5181] [--width 1440] [--write]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const flag = ( name, fallback = null ) => {
	const i = process.argv.indexOf( name );
	return i > -1 ? process.argv[ i + 1 ] : fallback;
};

// The tpl id of the element a scroll record scales along X from 0 to 1.
export function progressTpl( records ) {
	const r = ( records || [] ).find( ( x ) => 'scroll-position' === x.trigger?.type && ( x.properties || [] ).some( ( p ) => 'transform' === p.property && /^scaleX\(0\)/.test( p.from ?? '' ) && /^scaleX\(1\)/.test( p.to ?? '' ) ) );
	return r ? [].concat( r.element?.template_tpl_id ?? [] )[ 0 ] ?? null : null;
}

const HEIGHT_RANGE = [ 2, 8 ];

// The options a draft bar states: { gradient, colour, height } as option name -> value; the bar's paint wins over nothing it lacks.
export function optionsOf( bar ) {
	const out = {};
	const image = String( bar.backgroundImage ?? '' );
	if ( /^linear-gradient\(/.test( image ) ) {
		out.sgs_floating_ui_reading_progress_gradient = image;
	} else if ( bar.backgroundColor && ! /^rgba\([^)]*,\s*0\)$/.test( bar.backgroundColor ) ) {
		out.sgs_floating_ui_reading_progress_colour = bar.backgroundColor;
	}
	const h = Math.round( Number.parseFloat( bar.height ) );
	if ( h >= HEIGHT_RANGE[ 0 ] && h <= HEIGHT_RANGE[ 1 ] ) {
		out.sgs_floating_ui_reading_progress_height = h;
	}
	return out;
}

const wp = ( site, args ) => spawnSync( 'wsl', [ '-d', 'Ubuntu', '-u', 'root', '--', 'bash', '-lc', `cd /var/www/${ site } && wp --allow-root ${ args }` ], { encoding: 'utf8' });

// The draft's progress bar as the page computes it: { position, height, backgroundImage, backgroundColor }, or null. `browser` is an
// open Playwright browser (the applier's own), else one is launched for the read.
async function readBar( { origin, width, tpl, browser = null } ) {
	const own = browser ?? await chromium.launch();
	try {
		const page = await own.newPage( { viewport: { width, height: 900 } } );
		await page.goto( `${ origin }/`, { waitUntil: 'domcontentloaded' } );
		await page.waitForFunction( () => document.querySelectorAll( '[data-dc-tpl]' ).length > 40, null, { timeout: 30000 } );
		const bar = await page.evaluate( ( id ) => {
			const el = document.querySelector( `[data-dc-tpl="${ id }"]` );
			const c = el && getComputedStyle( el );
			return c && { position: c.position, height: c.height, backgroundImage: c.backgroundImage, backgroundColor: c.backgroundColor };
		}, tpl );
		await page.close();
		return bar;
	} finally {
		browser || await own.close();
	}
}

// The option step the applier runs with its own pass: reads the draft's bar and sets each option on the mirror (`write`), or reports
// it. Returns the rows [ { name, value, have, status } ]. `read` and `run` are the page read and the wp-cli call (replaceable in tests).
export async function applyOptions( { repo = REPO, client, origin = 'http://127.0.0.1:5181', width = 1440, write = false, browser = null, say = console.log, read = readBar, run = wp } ) {
	const surfaces = JSON.parse( fs.readFileSync( path.join( repo, 'sites', client, 'build', 'surfaces.json' ), 'utf8' ) );
	const site = Object.values( surfaces ).find( ( s ) => s.site )?.site;
	if ( ! /^local-[a-z0-9-]+$/.test( site ?? '' ) ) {
		throw new Error( `${ site } is not a local mirror` );
	}
	const records = JSON.parse( fs.readFileSync( path.join( repo, 'sites', client, 'handoff', 'animations.json' ), 'utf8' ) ).records;
	const tpl = progressTpl( records );
	if ( ! tpl ) {
		say( 'the handoff holds no scroll record that scales an element along X: no progress bar option to set' );
		return [];
	}
	const bar = await read( { origin: origin.replace( /\/$/, '' ), width, tpl, browser } );
	if ( ! bar || ! /^(fixed|sticky)$/.test( bar.position ) ) {
		say( `draft element ${ tpl } is not a fixed bar (${ JSON.stringify( bar ) }): nothing written` );
		return [];
	}
	const rows = [];
	for ( const [ name, value ] of Object.entries( optionsOf( bar ) ) ) {
		const have = run( site, `option get ${ name }` ).stdout.trim();
		const same = String( value ) === have;
		const status = same ? 'equal' : write ? 'written' : 'would write';
		say( `${ status } ${ name }: draft ${ value } | ${ site } ${ have || '(unset)' }` );
		if ( write && ! same ) {
			const r = run( site, `option update ${ name } ${ JSON.stringify( String( value ) ) }` );
			if ( 0 !== r.status ) {
				throw new Error( `could not write ${ name }: ${ r.stderr || r.stdout }` );
			}
		}
		rows.push( { name, value, have, status } );
	}
	return rows;
}

async function main() {
	const client = process.argv[ 2 ];
	if ( ! client || client.startsWith( '--' ) ) {
		console.error( 'usage: node scripts/computed-route/apply-options.mjs <client> [--draft <origin>] [--width 1440] [--write]' );
		process.exit( 2 );
	}
	await applyOptions( { client, origin: flag( '--draft', 'http://127.0.0.1:5181' ), width: Number( flag( '--width', 1440 ) ), write: process.argv.includes( '--write' ) } );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	await main();
}

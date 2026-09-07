/**
 * sweep-position-ranges.mjs — empirical bounds sweep for the eight new
 * static orientation/scale/framing overrides (rotationX/Y/Z, scaleX/Y/Z,
 * offsetX/Y) added to `createGenerativeBackground()`.
 *
 * ORIGIN: the position/size axis brief for the generative-background engine
 * (Spec 38 / D874 technique spec) — these 8 params are not colour-picker-safe
 * (any value looks fine); enough rotation and the folded shape can turn
 * edge-on and visually vanish, enough scale change and it can shrink to
 * nothing or blow out past the visible frame. This script measures, rather
 * than guesses, where each parameter's shape stops reading as an intentional
 * folded form.
 *
 * METHOD: silhouette mode (`u_silhouetteDebug`, the existing general-purpose
 * diagnostic uniform `silhouette-probe.mjs` already uses) renders a flat
 * magenta footprint with every fragment effect bypassed — a clean geometry-
 * only signal, immune to grading/glow/striation making a small shape look
 * "present" via colour alone. Painted-coverage (same quantised-dominant-
 * colour technique `silhouette-probe.mjs` uses) over the FULL canvas (not a
 * narrow crop — a value that pushes the shape off-frame must still be
 * caught) is measured at one fixed representative phase for every swept
 * value. The baseline (all-default) coverage anchors the sweep; a value is
 * flagged OUT once coverage falls below 30% of baseline (vanished / rotated
 * edge-on / pushed off-frame) in either direction from 0.
 *
 * This is a standalone script — NOT `poc-replica.html` — because that page's
 * query-param contract does not (and per the brief, should not) grow eight
 * new parameters for a one-off sweep; this file builds its own minimal page
 * inline, importing the SAME shipped engine module, so the measurement is
 * against real production code.
 *
 * Usage: node scripts/generative-background/sweep-position-ranges.mjs
 * Writes: scripts/generative-background/runs/sweep-<timestamp>/*.png (gitignored)
 * Prints: a table per parameter + the derived JSON block, ready to review
 * before hand-writing `src/blocks/extensions/fx-genbg-position-ranges.json`.
 *
 * @package
 */

import { chromium } from 'playwright';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { serve, launchGpuBrowser, VIEWPORT } from './harness-lib.mjs';

const HERE = fileURLToPath( new URL( '.', import.meta.url ) );
const REPO_ROOT = resolve( HERE, '..', '..', '..', '..' );
const SWEEP_PAGE_PATH = '/plugins/sgs-blocks/scripts/generative-background/__sweep.html';
const PYTHON = process.env.SGS_PYTHON || 'python';

// One fixed representative phase — the middle of fidelity-compare.mjs's own
// SAMPLE_TIMES range, converted the same way (ms -> engine seconds).
const T_RAW = 27500;
const T_SECONDS = T_RAW / 1000;

const GROUND_COLOUR = [ 250 / 255, 249 / 255, 246 / 255 ];

// A minimal harness page, built inline rather than reusing poc-replica.html
// (see module docblock) — imports the real shipped engine module and exposes
// exactly the knobs this sweep needs via query string.
function buildPageHtml() {
	return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}
.hero{position:relative;width:1440px;height:900px;overflow:hidden;background:#fff}
canvas{position:absolute;top:0;left:0;width:1440px;height:900px;display:block}</style>
</head><body><div class="hero"><canvas id="c" aria-hidden="true"></canvas></div>
<script type="module">
import { createGenerativeBackground } from '/plugins/sgs-blocks/src/shared/effects/webgl/generative-background.js';

const q = new URLSearchParams( location.search );
const num = ( name, dflt ) => {
	const v = q.get( name );
	if ( v === null ) return dflt;
	const f = parseFloat( v );
	return Number.isFinite( f ) ? f : dflt;
};

const canvas = document.getElementById( 'c' );
const gl = canvas.getContext( 'webgl2', { antialias: false, alpha: true, depth: true, powerPreference: 'low-power' } );
if ( ! gl ) {
	window.__err = 'no webgl2';
	window.__ready = true;
} else {
	// Palette texture is irrelevant in silhouette mode (bypassed entirely by
	// u_silhouetteDebug), so a trivial 1x1 canvas stands in — no external
	// asset fetch needed for this sweep.
	const tex = document.createElement( 'canvas' );
	tex.width = 4; tex.height = 4;
	tex.getContext( '2d' ).fillRect( 0, 0, 4, 4 );

	const opts = {
		textureSource: tex,
		speed: 1,
		groundColour: [ ${ GROUND_COLOUR.join( ',' ) } ],
		silhouetteDebug: true,
		rotationX: num( 'rotationX', undefined ),
		rotationY: num( 'rotationY', undefined ),
		rotationZ: num( 'rotationZ', undefined ),
		scaleX: num( 'scaleX', undefined ),
		scaleY: num( 'scaleY', undefined ),
		scaleZ: num( 'scaleZ', undefined ),
		offsetX: num( 'offsetX', undefined ),
		offsetY: num( 'offsetY', undefined ),
	};
	// Strip undefined keys so the engine's own typeof-number default checks
	// apply exactly as they do in production when an attribute is unset.
	Object.keys( opts ).forEach( ( k ) => opts[ k ] === undefined && delete opts[ k ] );

	createGenerativeBackground( canvas, opts ).then( ( handle ) => {
		if ( ! handle ) {
			window.__err = 'createGenerativeBackground returned null';
			window.__ready = true;
			return;
		}
		handle.resize( 1440, 900, 1 );
		handle.draw( ${ T_SECONDS } );
		window.__ready = true;
	} );
}
<\/script></body></html>`;
}

function paintedCoverage( pngPath ) {
	const PY = `
import sys, json
from PIL import Image
import numpy as np
path = sys.argv[1]
img = Image.open(path).convert('RGB')
arr = np.asarray(img)
quant = (arr >> 3).astype(np.int32)
keys = (quant[..., 0] << 10) | (quant[..., 1] << 5) | quant[..., 2]
flat = keys.flatten()
vals, counts = np.unique(flat, return_counts=True)
dominant = int(counts.max()) if counts.size else 0
total = int(flat.size)
print(json.dumps({'coverage': (total - dominant) / total if total else 0.0}))
`;
	const stdout = execFileSync( PYTHON, [ '-c', PY, pngPath ], { encoding: 'utf8' } );
	return JSON.parse( stdout.trim() ).coverage;
}

async function captureAt( browser, origin, paramsQuery, outPng ) {
	const page = await browser.newPage( { viewport: VIEWPORT, deviceScaleFactor: 1 } );
	const consoleMsgs = [];
	page.on( 'console', ( m ) => consoleMsgs.push( `[${ m.type() }] ${ m.text() }` ) );
	page.on( 'pageerror', ( e ) => consoleMsgs.push( `[pageerror] ${ e }` ) );
	try {
		const url = `${ origin }${ SWEEP_PAGE_PATH }?${ paramsQuery }`;
		await page.goto( url, { waitUntil: 'load' } );
		try {
			await page.waitForFunction( () => window.__ready === true, { timeout: 15000 } );
		} catch ( e ) {
			throw new Error( `timed out waiting for __ready. console: ${ consoleMsgs.join( ' | ' ) }` );
		}
		const err = await page.evaluate( () => window.__err || null );
		if ( err ) {
			throw new Error( `${ err } | console: ${ consoleMsgs.join( ' | ' ) }` );
		}
		await page.evaluate(
			() => new Promise( ( r ) => requestAnimationFrame( () => requestAnimationFrame( r ) ) )
		);
		await page.screenshot( { path: outPng } );
	} finally {
		await page.close();
	}
}

const runDir = join( HERE, 'runs', 'sweep-' + Date.now() );
await mkdir( runDir, { recursive: true } );

// Serve REPO_ROOT (needs plugins/sgs-blocks/src/... reachable, and the
// extensionless `./capability` import inside generative-background.js).
const site = await serve( { root: REPO_ROOT, resolveExtensionless: true } );

// The sweep page itself is served from an in-memory route, layered on top of
// harness-lib's file server via a tiny second server proxying just one path
// would be overkill — instead write it to a real (gitignored) scratch file
// inside runs/ and serve REPO_ROOT normally, referencing it by its real path.
const sweepPagePath = join( REPO_ROOT, 'plugins', 'sgs-blocks', 'scripts', 'generative-background', '__sweep.html' );
await writeFile( sweepPagePath, buildPageHtml(), 'utf8' );

const browser = await launchGpuBrowser( chromium );

const PARAM_SWEEPS = {
	rotationX: [ -180, -135, -90, -60, -30, -15, 0, 15, 30, 60, 90, 135, 180 ],
	rotationY: [ -180, -135, -90, -60, -30, -15, 0, 15, 30, 60, 90, 135, 180 ],
	rotationZ: [ -180, -135, -90, -60, -30, -15, 0, 15, 30, 60, 90, 135, 180 ],
	scaleX: [ 0.1, 0.25, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0, 3.0 ],
	scaleY: [ 0.1, 0.25, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0, 3.0 ],
	scaleZ: [ 0.1, 0.25, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0, 3.0 ],
	offsetX: [ -800, -600, -400, -200, -100, 0, 100, 200, 400, 600, 800 ],
	offsetY: [ -800, -600, -400, -200, -100, 0, 100, 200, 400, 600, 800 ],
};

const results = {};

try {
	// Baseline (all-default) coverage anchors the 30% threshold.
	const basePng = join( runDir, 'baseline.png' );
	await captureAt( browser, site.origin, '', basePng );
	const baseline = paintedCoverage( basePng );
	console.log( `Baseline (all-default) painted coverage: ${ ( baseline * 100 ).toFixed( 1 ) }%\n` );

	for ( const [ param, values ] of Object.entries( PARAM_SWEEPS ) ) {
		console.log( `── ${ param } ──` );
		const rows = [];
		for ( const v of values ) {
			const outPng = join( runDir, `${ param }-${ v }.png` );
			let coverage = 0;
			let errMsg = null;
			try {
				await captureAt( browser, site.origin, `${ param }=${ v }`, outPng );
				coverage = paintedCoverage( outPng );
			} catch ( e ) {
				errMsg = String( e.message || e );
			}
			const ratio = baseline > 0 ? coverage / baseline : 0;
			const ok = ! errMsg && ratio >= 0.3;
			rows.push( { v, coverage, ratio, ok, errMsg } );
			console.log(
				`  ${ String( v ).padStart( 6 ) } -> coverage ${ ( coverage * 100 ).toFixed( 1 ).padStart( 5 ) }% ` +
					`(${ ( ratio * 100 ).toFixed( 0 ).padStart( 4 ) }% of baseline) ${ ok ? 'OK' : 'OUT' }${ errMsg ? ' ' + errMsg : '' }`
			);
		}
		results[ param ] = rows;
	}
} finally {
	await browser.close();
	await site.close();
	const { rm } = await import( 'node:fs/promises' );
	await rm( sweepPagePath, { force: true } );
}

console.log( '\n── Derived min/max (largest symmetric OK range around default) ──' );
const derived = {};
const DEFAULTS = {
	rotationX: 0, rotationY: 0, rotationZ: 0,
	scaleX: 1, scaleY: 1, scaleZ: 1,
	offsetX: 0, offsetY: 0,
};
for ( const [ param, rows ] of Object.entries( results ) ) {
	const okValues = rows.filter( ( r ) => r.ok ).map( ( r ) => r.v );
	const min = Math.min( ...okValues );
	const max = Math.max( ...okValues );
	derived[ param ] = { min, max, default: DEFAULTS[ param ] };
	console.log( `${ param }: min=${ min } max=${ max } default=${ DEFAULTS[ param ] }` );
}

await writeFile( join( runDir, 'derived-ranges.json' ), JSON.stringify( derived, null, 2 ) );
console.log( `\nFull results + derived ranges written to ${ runDir }` );

/**
 * Extract GROUND-TRUTH transform matrices from the reference rig.
 *
 * WHAT THIS IS FOR. D882 established that the reliable way to port the fold
 * mechanism is to pull the real `modelViewMatrix`/`projectionMatrix` out of
 * the working rig and check a from-scratch reimplementation reproduces them,
 * rather than eyeballing screenshots. Screenshot comparison had already passed
 * a build that was rotating the wrong way on all three chained rotations; the
 * numbers caught it immediately.
 *
 * This script owns only the EXTRACT half. `verify-transform.mjs` owns the
 * compare half and imports the production module to do it.
 *
 * ⚠ WEBGL IN HEADLESS CHROMIUM. Without the ANGLE/GPU flags below the browser
 * has no WebGL at all, three.js fails to construct a renderer, and the rig
 * never sets `window.__ready`. That failure reads as "the rig is broken"
 * rather than "the browser has no GPU", so the readiness wait below reports
 * which of the two actually happened instead of just timing out.
 *
 * Usage:
 *   node scripts/generative-background/extract-reference-matrices.mjs
 *   node scripts/generative-background/extract-reference-matrices.mjs --dark
 *
 * Writes: scripts/generative-background/reference-matrices.json
 *
 * @package
 */

import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve as serveRoot, launchGpuBrowser, VIEWPORT } from './harness-lib.mjs';

const HERE = fileURLToPath( new URL( '.', import.meta.url ) );
const REPO_ROOT = resolve( HERE, '..', '..', '..', '..' );
const RIG_DIR = join( REPO_ROOT, '.claude', 'scratch', 'stripe-hero-poc' );
const OUT_FILE = join( HERE, 'reference-matrices.json' );

const DARK = process.argv.includes( '--dark' );

// The rig is Gate-E-held study material. If it has gone, say so plainly rather
// than emitting an empty result that a later step would read as "no drift".
if ( ! existsSync( join( RIG_DIR, 'index.html' ) ) ) {
	console.error(
		`FAIL: reference rig not found at ${ RIG_DIR }\n` +
			'Gate E is held precisely so this stays available — see D790/D882.\n' +
			'Without it the transform port cannot be numerically verified.'
	);
	process.exit( 1 );
}

/**
 * Minimal static server over the rig directory. The rig `fetch()`es its shader
 * files, which the file:// origin forbids, so a real HTTP origin is required.
 * Delegates to harness-lib.mjs's shared `serve()` (index-fallback ON,
 * matching this file's pre-extraction behaviour exactly — see that module's
 * header, D888).
 *
 * @return {Promise<{origin: string, close: Function}>} Server handle.
 */
function serveRig() {
	return serveRoot( { root: RIG_DIR, indexFallback: true } );
}

const rig = await serveRig();

const browser = await launchGpuBrowser( chromium );

// The rig sizes its frustum from the canvas, so the viewport IS an input to
// the projection matrix. Record it alongside the numbers — a matrix compared
// against a differently-sized viewport is a meaningless comparison, and this
// is exactly the provenance-field problem a past probe hit. Shared with
// fidelity-compare.mjs (harness-lib.mjs's VIEWPORT) — both need the SAME
// 1440x900 box for their numbers to be comparable to each other.

const page = await browser.newPage( {
	viewport: VIEWPORT,
	deviceScaleFactor: 1,
} );

const consoleErrors = [];
page.on( 'console', ( m ) => {
	if ( m.type() === 'error' ) {
		consoleErrors.push( m.text() );
	}
} );
page.on( 'pageerror', ( e ) => consoleErrors.push( String( e ) ) );

let result;
try {
	const url = rig.origin + '/index.html' + ( DARK ? '?dark' : '' );
	await page.goto( url, { waitUntil: 'load' } );

	// Prove WebGL is actually available BEFORE blaming the rig for not
	// signalling ready — otherwise a GPU-less browser and a broken rig are
	// indistinguishable from the timeout alone.
	const webglOk = await page.evaluate( () => {
		const c = document.createElement( 'canvas' );
		return Boolean( c.getContext( 'webgl2' ) );
	} );
	if ( ! webglOk ) {
		throw new Error(
			'headless Chromium has no WebGL2 — the GPU flags did not take effect. ' +
				'Any "no matrices" result from this run would be vacuous, not evidence.'
		);
	}

	await page.waitForFunction( () => window.__ready === true, { timeout: 30000 } );

	result = await page.evaluate( () => {
		const m = window.__matrices();
		// ⛔ The frustum is sized from the CANVAS box (`canvas.clientWidth/
		// clientHeight` in the rig), NOT the viewport. Recording the viewport
		// here instead looked like careful provenance while naming a number
		// the maths never consumed — the projection comparison then failed
		// against a frustum nothing had built. Capture what is actually used.
		const canvas = document.getElementById( 'c' );
		return {
			modelViewMatrix: Array.from( m.modelViewMatrix ),
			projectionMatrix: Array.from( m.projectionMatrix ),
			frustumSize: {
				width: canvas.clientWidth,
				height: canvas.clientHeight,
			},
		};
	} );
} catch ( err ) {
	console.error( 'FAIL: could not extract matrices from the rig.' );
	console.error( String( err.message || err ) );
	if ( consoleErrors.length ) {
		console.error( '\nBrowser console errors:' );
		consoleErrors.slice( 0, 10 ).forEach( ( e ) => console.error( '  ' + e ) );
	}
	await browser.close();
	await rig.close();
	process.exit( 1 );
}

await browser.close();
await rig.close();

const payload = {
	_meta: {
		source: 'stripe-hero-poc/index.html window.__matrices()',
		preset: DARK ? 'dark' : 'light',
		viewport: VIEWPORT,
		note:
			'Ground truth for verify-transform.mjs. `frustumSize` — NOT `viewport` — ' +
			'is the load-bearing figure: the rig sizes its orthographic frustum from ' +
			'canvas.clientWidth/clientHeight, which is smaller than the viewport ' +
			'because of page layout. Verify against frustumSize or the projection ' +
			'comparison is meaningless.',
	},
	...result,
};

const { writeFile } = await import( 'node:fs/promises' );
await writeFile( OUT_FILE, JSON.stringify( payload, null, 2 ) + '\n', 'utf8' );

console.log( `OK: wrote ${ OUT_FILE }` );
console.log( `    preset   : ${ payload._meta.preset }` );
console.log( `    viewport : ${ VIEWPORT.width }x${ VIEWPORT.height }` );
console.log(
	`    frustum  : ${ result.frustumSize.width }x${ result.frustumSize.height }` +
		'  <- the figure the projection matrix is built from'
);
console.log(
	'    modelView[0..3] : ' +
		result.modelViewMatrix
			.slice( 0, 4 )
			.map( ( n ) => n.toFixed( 6 ) )
			.join( ', ' )
);

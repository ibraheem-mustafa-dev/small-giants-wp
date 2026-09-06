/**
 * Render the SHIPPING generative-background module and capture a PNG.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE NUMERIC VERIFIER. `verify-transform.mjs`
 * proves the matrices are right. It cannot prove anything is PAINTED — a
 * correct transform in front of a failed shader compile, a zero-area canvas,
 * or a fully transparent output all pass it. Those are exactly the failure
 * modes that have previously read as success in this codebase (a 69-gate green
 * run over an SVG sized 2px x 2px that painted nothing).
 *
 * So this asserts PAINTED GEOMETRY, not just a successful run:
 *   - the canvas has real area,
 *   - a meaningful share of pixels are non-transparent,
 *   - and the image is not one flat colour (which is what a blank draw, a
 *     cleared buffer, or geometry entirely outside the frustum all look like).
 *
 * The last one is the important control. "Not blank" is too weak: a canvas
 * uniformly filled with the ground colour is not blank and is still a total
 * failure of the effect.
 *
 * Usage:
 *   node scripts/generative-background/capture-render.mjs
 *   node scripts/generative-background/capture-render.mjs --out foo.png
 *
 * @package
 */

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	serve as serveRoot,
	launchGpuBrowser,
	PAINTED_MIN_COVERAGE,
	PAINTED_MIN_UNIQUE_HUES,
} from './harness-lib.mjs';

const HERE = fileURLToPath( new URL( '.', import.meta.url ) );
const PLUGIN_ROOT = resolve( HERE, '..', '..' );
const HARNESS = '/scripts/perf/generative-background-perf.html';

const outArg = process.argv.indexOf( '--out' );
const OUT_FILE =
	outArg !== -1 && process.argv[ outArg + 1 ]
		? resolve( process.argv[ outArg + 1 ] )
		: resolve( HERE, 'render.png' );

/**
 * Serve the plugin root so the harness's relative `../../src/...` import
 * resolves as a real module URL. Delegates to harness-lib.mjs's shared
 * `serve()` (extensionless-`.js` resolution ON, matching this file's
 * pre-extraction behaviour exactly — see that module's header, D888).
 *
 * @return {Promise<{origin: string, close: Function}>} Server handle.
 */
function serve() {
	return serveRoot( { root: PLUGIN_ROOT, resolveExtensionless: true } );
}

const site = await serve();

const browser = await launchGpuBrowser( chromium );

const page = await browser.newPage( {
	viewport: { width: 1393, height: 761 },
	deviceScaleFactor: 1,
} );

const problems = [];
page.on( 'console', ( m ) => {
	if ( m.type() === 'error' ) {
		problems.push( m.text() );
	}
} );
page.on( 'pageerror', ( e ) => problems.push( String( e ) ) );

let stats;
try {
	await page.goto( site.origin + HARNESS, { waitUntil: 'load' } );

	// --ground light: repaint the harness backdrop white. The reference image
	// sits on a white ground, where the near-white parts of the ribbon are
	// invisible; comparing it against a render on the harness's dark backdrop
	// overstates how much geometry differs. This makes the silhouettes
	// comparable rather than eyeballing across two different grounds.
	if ( process.argv.includes( '--ground' ) ) {
		const g = process.argv[ process.argv.indexOf( '--ground' ) + 1 ];
		if ( g === 'light' ) {
			await page.addStyleTag( { content: 'html,body{background:#fff !important}' } );
		}
	}

	// Same non-vacuity guard as the matrix extractor: a GPU-less browser must
	// be reported as such, never as "the effect drew nothing".
	const webglOk = await page.evaluate( () => {
		const c = document.createElement( 'canvas' );
		return Boolean( c.getContext( 'webgl2' ) );
	} );
	if ( ! webglOk ) {
		throw new Error(
			'headless Chromium has no WebGL2 — the GPU flags did not apply. ' +
				'A "nothing painted" result from this run would be vacuous.'
		);
	}

	await page.waitForFunction( () => window.__ready === true, { timeout: 30000 } );
	// One extra frame so the first draw has certainly landed.
	await page.evaluate(
		() => new Promise( ( r ) => requestAnimationFrame( () => requestAnimationFrame( r ) ) )
	);

	const shot = await page.screenshot( { path: OUT_FILE } );

	/*
	 * ⛔ MEASURE THE SCREENSHOT, NOT `gl.readPixels`.
	 *
	 * The first version of this script read the drawing buffer directly and
	 * reported 0% painted over a render that was demonstrably fine — 786
	 * distinct colours in the very PNG it had just written. A WebGL context
	 * defaults to `preserveDrawingBuffer: false`, so the buffer is empty once
	 * the frame composites; reading it afterwards measures the wrong moment,
	 * not the wrong picture.
	 *
	 * That failure mode is worse than useless: it is indistinguishable from a
	 * genuinely blank canvas, so it would have sent the next person hunting a
	 * rendering bug that does not exist. The screenshot is what the visitor
	 * actually sees and carries no timing dependency, so decode that instead —
	 * handed back into the page as a data URL and read off a 2D canvas, which
	 * needs no extra dependency.
	 */
	stats = await page.evaluate( async ( b64 ) => {
		const img = new Image();
		await new Promise( ( r, j ) => {
			img.onload = r;
			img.onerror = j;
			img.src = 'data:image/png;base64,' + b64;
		} );
		const c = document.createElement( 'canvas' );
		c.width = img.width;
		c.height = img.height;
		const ctx = c.getContext( '2d' );
		ctx.drawImage( img, 0, 0 );
		const px = ctx.getImageData( 0, 0, c.width, c.height ).data;

		// The harness paints a known flat backdrop behind the canvas. Anything
		// differing from the most common colour is the effect itself, which is
		// a better "did it draw" signal than alpha (the screenshot is fully
		// opaque everywhere, so alpha tells us nothing here).
		const counts = new Map();
		const seen = new Set();
		for ( let i = 0; i < px.length; i += 4 * 37 ) {
			// Quantise to 5 bits/channel so grain dither does not masquerade
			// as real image variety.
			const key =
				( ( px[ i ] >> 3 ) << 10 ) |
				( ( px[ i + 1 ] >> 3 ) << 5 ) |
				( px[ i + 2 ] >> 3 );
			counts.set( key, ( counts.get( key ) || 0 ) + 1 );
			seen.add( key );
		}
		let dominant = 0;
		for ( const n of counts.values() ) {
			dominant = Math.max( dominant, n );
		}
		const total = Math.floor( px.length / ( 4 * 37 ) );
		return {
			width: c.width,
			height: c.height,
			opaque: total - dominant,
			total,
			unique: seen.size,
		};
	}, shot.toString( 'base64' ) );
} catch ( err ) {
	console.error( 'FAIL: could not render the effect.' );
	console.error( String( err.message || err ) );
	problems.slice( 0, 10 ).forEach( ( e ) => console.error( '  ' + e ) );
	await browser.close();
	await site.close();
	process.exit( 1 );
}

await browser.close();
await site.close();

const coverage = stats.total ? stats.opaque / stats.total : 0;
let failed = false;

console.log( `canvas       : ${ stats.width }x${ stats.height }` );
console.log(
	`painted      : ${ ( coverage * 100 ).toFixed( 1 ) }% of sampled pixels differ from the backdrop`
);
console.log( `distinct hues: ${ stats.unique } (5-bit quantised)` );

if ( ! stats.width || ! stats.height ) {
	console.error( 'FAIL: canvas has zero area — nothing could have been painted.' );
	failed = true;
}
if ( coverage < PAINTED_MIN_COVERAGE ) {
	console.error(
		'FAIL: almost nothing painted. Either the geometry is outside the frustum ' +
			'or the draw call never ran.'
	);
	failed = true;
}
if ( stats.unique < PAINTED_MIN_UNIQUE_HUES ) {
	console.error(
		'FAIL: the output is essentially one flat colour. This is what a cleared ' +
			'buffer looks like — "not blank" is not the same as "the effect drew".'
	);
	failed = true;
}
if ( problems.length ) {
	console.error( `\nConsole errors during render (${ problems.length }):` );
	problems.slice( 0, 8 ).forEach( ( e ) => console.error( '  ' + e ) );
	failed = true;
}

if ( failed ) {
	process.exit( 1 );
}

console.log( `\nOK: wrote ${ OUT_FILE }` );

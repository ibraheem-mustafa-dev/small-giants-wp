/**
 * flip-probe.mjs — committed, reproducible ground truth for the flipY
 * decision baked into poc-replica.html.
 *
 * WHY THIS EXISTS. Task 1's first attempt tried to answer "which
 * UNPACK_FLIP_Y_WEBGL setting is correct?" by rendering the whole page and
 * comparing hues against a screenshot of the reference rig. That method was
 * rejected on review: the reference's own render passes through an FBO +
 * angular-blur + grain post-process (index.html ~431-453), which is itself a
 * classic Y-flip site, and grain injects per-pixel hue noise — so a hue
 * comparison against that render cannot isolate the flip question from
 * blending, post-processing and geometry all at once.
 *
 * This probe removes all of that. It does exactly one thing: upload
 * palette-a.png to a WebGL2 texture with a given UNPACK_FLIP_Y_WEBGL
 * setting, read the texture straight back out via an FBO + readPixels (no
 * shader, no geometry, no blending), and compare each readback row against
 * the same PNG decoded independently through a 2D canvas. That is a direct,
 * binary, driver-level fact about what pixelStorei does to this exact
 * upload in this exact browser/ANGLE build — not an inference from a
 * rendered composition.
 *
 * The flipY decision for poc-replica.html then combines this fact with one
 * other non-rendered, source-read fact: generative-background-transform.js
 * buildFoldedGeometry() assigns uvs[v] = iy / segmentsY against
 * restY = (v - 0.5) * height — i.e. v=0 maps to the BOTTOM of the local
 * plane and v=1 to the TOP, the same v-up convention three.js's own
 * PlaneGeometry uses (recorded in poc-replica.html's header comment, not
 * re-litigated here). Combined with this probe's finding of what v=0/v=1
 * sample after each flip setting, that is enough to decide without ever
 * rendering either page.
 *
 * PROVENANCE (global constraint 4 — unconditional, not optional here):
 * every numeric result this probe prints is stamped with the unmasked
 * WebGL renderer/vendor strings, the Chromium version, and the SHA-256 of
 * the exact palette-a.png bytes that were fed in. A number without this is
 * not comparable to any other run of this probe on a different machine or
 * against a different copy of the PNG.
 *
 * NEGATIVE CONTROL (I2 fix): a probe that just picks whichever diff is
 * smaller can report a confident answer on degenerate data — e.g. a
 * palette whose top and bottom rows happen to be similar, or a driver that
 * silently ignores pixelStorei entirely, would still produce SOME winner
 * with no warning that the result is meaningless. This probe now asserts
 * separation before concluding anything: the two flip settings must
 * disagree on which PNG row v=1 samples, AND the winning diff must be at
 * least 10x smaller than the losing diff. Fails closed (exit 1) otherwise.
 *
 * Usage: node scripts/generative-background/flip-probe.mjs
 *
 * @package
 */

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { serve as serveRoot, launchGpuBrowser } from './harness-lib.mjs';

const HERE = fileURLToPath( new URL( '.', import.meta.url ) );
// Repo root, not PLUGIN_ROOT — this probe needs to reach
// .claude/scratch/stripe-hero-poc/assets/palette-a.png, which sits outside
// plugins/sgs-blocks. It imports no framework module, so PLUGIN_ROOT's
// tighter scope (capture-render.mjs) buys nothing here.
const REPO_ROOT = resolve( HERE, '..', '..', '..', '..' );
const PALETTE_PATH = resolve( REPO_ROOT, '.claude/scratch/stripe-hero-poc/assets/palette-a.png' );
const PALETTE_URL = '/.claude/scratch/stripe-hero-poc/assets/palette-a.png';

/**
 * Delegates to harness-lib.mjs's shared `serve()` — no extensionless
 * resolution (this probe never served a bundler-style import, matching its
 * pre-extraction behaviour exactly, D888).
 *
 * @return {Promise<{origin: string, close: Function}>} Server handle.
 */
function serve() {
	return serveRoot( { root: REPO_ROOT } );
}

// PROVENANCE (I3): SHA-256 of the exact bytes served, computed independently
// of the browser — proves which copy of palette-a.png this run actually
// used, not just its filename.
const paletteBytes = await readFile( PALETTE_PATH );
const paletteSha256 = createHash( 'sha256' ).update( paletteBytes ).digest( 'hex' );

const site = await serve();
const browser = await launchGpuBrowser( chromium );

let result;
let provenance;
try {
	const page = await browser.newPage();
	const webglOk = await page.evaluate(
		() => Boolean( document.createElement( 'canvas' ).getContext( 'webgl2' ) )
	);
	if ( ! webglOk ) {
		throw new Error( 'headless Chromium has no WebGL2 - the GPU flags did not apply.' );
	}

	await page.goto( site.origin + '/', { waitUntil: 'load' } );

	// PROVENANCE (I3): unmasked renderer/vendor. Requires the
	// WEBGL_debug_renderer_info extension — request it explicitly and record
	// if it's unavailable rather than silently reporting the masked strings.
	const gpuInfo = await page.evaluate( () => {
		const c = document.createElement( 'canvas' );
		const gl = c.getContext( 'webgl2' );
		const ext = gl.getExtension( 'WEBGL_debug_renderer_info' );
		return {
			renderer: ext ? gl.getParameter( ext.UNMASKED_RENDERER_WEBGL ) : gl.getParameter( gl.RENDERER ) + ' (masked - WEBGL_debug_renderer_info unavailable)',
			vendor:   ext ? gl.getParameter( ext.UNMASKED_VENDOR_WEBGL )   : gl.getParameter( gl.VENDOR )   + ' (masked - WEBGL_debug_renderer_info unavailable)',
		};
	} );

	provenance = {
		chromiumVersion: browser.version(),
		gpuRenderer: gpuInfo.renderer,
		gpuVendor: gpuInfo.vendor,
		paletteSha256,
		paletteBytes: paletteBytes.length,
	};

	result = await page.evaluate( async ( paletteUrl ) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = paletteUrl;
		await new Promise( ( res, rej ) => { img.onload = res; img.onerror = rej; } );
		const w = img.naturalWidth;
		const h = img.naturalHeight;

		// Ground truth: decode the SAME PNG through a plain 2D canvas. Row 0
		// of getImageData is the image's visual TOP row; row (h-1) is the
		// visual BOTTOM row. No WebGL involved in this half at all.
		const c2d = document.createElement( 'canvas' );
		c2d.width = w;
		c2d.height = h;
		const ctx2d = c2d.getContext( '2d' );
		ctx2d.drawImage( img, 0, 0 );
		const topRowPng    = Array.from( ctx2d.getImageData( 0, 0,     w, 1 ).data );
		const bottomRowPng = Array.from( ctx2d.getImageData( 0, h - 1, w, 1 ).data );

		function meanAbsDiff( a, b ) {
			let sum = 0;
			for ( let i = 0; i < a.length; i++ ) sum += Math.abs( a[ i ] - b[ i ] );
			return sum / a.length;
		}

		function probeFlip( flipY ) {
			const glCanvas = document.createElement( 'canvas' );
			glCanvas.width = w;
			glCanvas.height = h;
			const gl = glCanvas.getContext( 'webgl2' );
			gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, flipY );
			const tex = gl.createTexture();
			gl.bindTexture( gl.TEXTURE_2D, tex );
			gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

			const fbo = gl.createFramebuffer();
			gl.bindFramebuffer( gl.FRAMEBUFFER, fbo );
			gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0 );

			// readPixels' y is measured from the BOTTOM of the attached
			// texture (OpenGL convention) - read BOTH extremes so the
			// mapping is established directly, not assumed.
			const bufBottom = new Uint8Array( w * 4 );
			gl.readPixels( 0, 0, w, 1, gl.RGBA, gl.UNSIGNED_BYTE, bufBottom );
			const bufTop = new Uint8Array( w * 4 );
			gl.readPixels( 0, h - 1, w, 1, gl.RGBA, gl.UNSIGNED_BYTE, bufTop );

			gl.deleteFramebuffer( fbo );
			gl.deleteTexture( tex );

			return {
				// readPixels(y=0) - the texel row WebGL calls its own row 0.
				glRow0: {
					matchesPngTop:    meanAbsDiff( Array.from( bufBottom ), topRowPng ),
					matchesPngBottom: meanAbsDiff( Array.from( bufBottom ), bottomRowPng ),
				},
				// readPixels(y=h-1) - the texel row at the opposite extreme.
				glRowMax: {
					matchesPngTop:    meanAbsDiff( Array.from( bufTop ), topRowPng ),
					matchesPngBottom: meanAbsDiff( Array.from( bufTop ), bottomRowPng ),
				},
			};
		}

		return {
			width: w,
			height: h,
			flipTrue:  probeFlip( true ),
			flipFalse: probeFlip( false ),
		};
	}, site.origin + PALETTE_URL );
} finally {
	await browser.close();
	await site.close();
}

function verdict( probe ) {
	// "row 0" in WebGL's own texel-index sense is what v=0 samples at the
	// texture's un-transformed edge; whichever PNG row it has the smaller
	// mean-abs-diff against is what v=0 actually holds after this flip
	// setting. A real match reads close to 0; a mismatch reads close to the
	// MEASURED cross-row difference for THIS palette (29.73 on the current
	// palette-a.png — not a theoretical "255 fully different channels"
	// figure; two rows of a soft pastel gradient are nowhere near maximally
	// different from each other, so do not assume 255 for a different
	// palette either. Re-run this probe to get the real number.)
	const row0IsTop   = probe.glRow0.matchesPngTop   < probe.glRow0.matchesPngBottom;
	const rowMaxIsTop = probe.glRowMax.matchesPngTop < probe.glRowMax.matchesPngBottom;
	return {
		'v=0 (texel row 0) samples':   row0IsTop   ? 'PNG top row' : 'PNG bottom row',
		'v=1 (texel row max) samples': rowMaxIsTop ? 'PNG top row' : 'PNG bottom row',
	};
}

console.log( 'PROVENANCE:' );
console.log( '  Chromium version   :', provenance.chromiumVersion );
console.log( '  GPU renderer       :', provenance.gpuRenderer );
console.log( '  GPU vendor         :', provenance.gpuVendor );
console.log( '  palette-a.png      :', provenance.paletteBytes + ' bytes, sha256=' + provenance.paletteSha256 );

console.log( '\npalette-a.png:', result.width + 'x' + result.height );
console.log( '\nflipY = true' );
console.log( '  raw diffs:', JSON.stringify( result.flipTrue ) );
console.log( '  verdict  :', verdict( result.flipTrue ) );
console.log( '\nflipY = false' );
console.log( '  raw diffs:', JSON.stringify( result.flipFalse ) );
console.log( '  verdict  :', verdict( result.flipFalse ) );

console.log(
	'\nGeometry fact (read from generative-background-transform.js, not rendered): ' +
	'buildFoldedGeometry() assigns v=0 to the BOTTOM of the local plane and v=1 to ' +
	'the TOP - the same v-up convention three.js\'s PlaneGeometry uses. So the correct ' +
	'flipY setting is whichever one makes "v=1 samples PNG top row" true above.'
);

// ── I2 fix: separation gate — a negative control, not just a winner-picker ──
// A confident answer on degenerate data (both settings agreeing, or a
// razor-thin margin) is worse than no answer. Assert real separation before
// concluding anything.
const v1True  = verdict( result.flipTrue )[ 'v=1 (texel row max) samples' ];
const v1False = verdict( result.flipFalse )[ 'v=1 (texel row max) samples' ];

const trueWinDiff  = Math.min( result.flipTrue.glRowMax.matchesPngTop,  result.flipTrue.glRowMax.matchesPngBottom );
const trueLoseDiff = Math.max( result.flipTrue.glRowMax.matchesPngTop,  result.flipTrue.glRowMax.matchesPngBottom );
const falseWinDiff  = Math.min( result.flipFalse.glRowMax.matchesPngTop, result.flipFalse.glRowMax.matchesPngBottom );
const falseLoseDiff = Math.max( result.flipFalse.glRowMax.matchesPngTop, result.flipFalse.glRowMax.matchesPngBottom );

let failed = false;

if ( v1True === v1False ) {
	console.error(
		'\nFAIL (negative control): flipY=true and flipY=false BOTH report v=1 samples ' +
		'"' + v1True + '"' + ' — the two settings did not disagree at all. Either this ' +
		'palette has near-identical top/bottom rows, or pixelStorei is being silently ' +
		'ignored by this driver. No conclusion can be drawn from degenerate data.'
	);
	failed = true;
}

// The winning setting's diff must be near-zero AND beat its own losing diff
// by at least 10x — guards against a "confident" result built on noise.
const SEPARATION_FACTOR = 10;
for ( const [ label, winDiff, loseDiff ] of [
	[ 'flipY=true',  trueWinDiff,  trueLoseDiff ],
	[ 'flipY=false', falseWinDiff, falseLoseDiff ],
] ) {
	if ( loseDiff < winDiff * SEPARATION_FACTOR ) {
		console.error(
			'\nFAIL (negative control): ' + label + '\'s winning diff (' + winDiff.toFixed( 3 ) +
			') is not at least ' + SEPARATION_FACTOR + 'x smaller than its losing diff (' +
			loseDiff.toFixed( 3 ) + ') — too close to call decisive.'
		);
		failed = true;
	}
}

if ( failed ) {
	console.error( '\nCONCLUSION: INDETERMINATE — negative control failed, see above.' );
	process.exit( 1 );
}

const trueOk  = v1True  === 'PNG top row';
const falseOk = v1False === 'PNG top row';
console.log(
	'\nCONCLUSION: flipY = ' +
	( trueOk ? 'true' : falseOk ? 'false' : 'INDETERMINATE' ) +
	' is the setting that puts the PNG\'s own top row at v=1.'
);

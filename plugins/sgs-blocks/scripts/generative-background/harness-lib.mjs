/**
 * harness-lib.mjs — shared plumbing for the generative-background fidelity
 * scripts.
 *
 * WHY THIS EXISTS. Before this file, `fidelity-compare.mjs`, `flip-probe.mjs`,
 * `capture-render.mjs` and `extract-reference-matrices.mjs` each hand-rolled
 * their OWN static file server, MIME map, and Chromium launch flags — already
 * measurably drifted (`capture-render.mjs`'s server roots at `PLUGIN_ROOT` and
 * 403s the palette PNG `poc-replica.html` needs, which is why
 * `fidelity-compare.mjs` had to widen its own copy to `REPO_ROOT` rather than
 * reuse it). D888 named this drift as a live alternative explanation for part
 * of the measured fidelity gap — if the four instruments disagree on what
 * "the same page" even means, a number from one is not directly comparable to
 * a number from another. This module is the fix: one server implementation,
 * one MIME map, one GPU flag list, imported by all four instead of copied.
 *
 * ⛔ THIS IS A REFACTOR, NOT A BEHAVIOUR CHANGE. Every option below defaults
 * to reproducing exactly what the pre-extraction script it came from already
 * did — the extensionless-`.js`-resolution convenience, the index-file
 * fallback, the exact traversal guard, the exact GPU flags. Do not "improve"
 * any of these while wiring a caller to import from here; a numeric baseline
 * this file's own extraction is required to leave byte-identical depends on
 * it.
 *
 * @package
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';

/**
 * The superset MIME map every caller needs — a caller serving a narrower tree
 * (e.g. flip-probe.mjs, which only ever needs `.png`/`.html`) is unaffected by
 * the extra entries; an unmatched extension still falls back to
 * `application/octet-stream` exactly as each original copy did.
 */
export const MIME = Object.freeze( {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.glsl': 'text/plain; charset=utf-8',
	'.md': 'text/plain; charset=utf-8',
	'.png': 'image/png',
	'.webp': 'image/webp',
} );

/**
 * The GPU flags every capture/extraction script needs so headless Chromium
 * gets a real WebGL2 context instead of silently falling back to swiftshader
 * or nothing at all. Identical across all four scripts before this file
 * existed — verified by diff, not assumed.
 */
export const GPU_LAUNCH_ARGS = Object.freeze( [
	'--use-gl=angle',
	'--use-angle=default',
	'--ignore-gpu-blocklist',
	'--enable-gpu',
	'--enable-webgl',
] );

/**
 * `chromium.launch()` with the standard GPU flags, plus any caller-supplied
 * extras appended after them (none of the four current callers pass any, but
 * the seam is here rather than inlined so a future one-off flag doesn't force
 * another hand-rolled `launch()` call).
 *
 * @param {import('playwright').BrowserType} chromium The imported `chromium` export from 'playwright'.
 * @param {string[]} extraArgs Additional Chromium args, appended after GPU_LAUNCH_ARGS.
 * @return {Promise<import('playwright').Browser>} The launched browser.
 */
export function launchGpuBrowser( chromium, extraArgs = [] ) {
	return chromium.launch( { args: [ ...GPU_LAUNCH_ARGS, ...extraArgs ] } );
}

/**
 * One static file server, parameterised to reproduce each of the four
 * pre-extraction implementations exactly:
 *   - `fidelity-compare.mjs` -> `{ root: REPO_ROOT, resolveExtensionless: true }`
 *   - `capture-render.mjs`   -> `{ root: PLUGIN_ROOT, resolveExtensionless: true }`
 *   - `flip-probe.mjs`       -> `{ root: REPO_ROOT }` (no extensionless resolution — it never served a bundler-style import)
 *   - `extract-reference-matrices.mjs` -> `{ root: RIG_DIR, indexFallback: true }`
 *
 * @param {Object} opts
 * @param {string} opts.root Absolute directory to serve. A request path
 *   resolving outside this directory 403s (traversal guard, kept from every
 *   original implementation).
 * @param {boolean} [opts.resolveExtensionless] When a requested path has no
 *   file extension and doesn't exist as-is, try appending `.js` — the
 *   bundler-style extensionless import convenience `fidelity-compare.mjs`
 *   and `capture-render.mjs` both needed to serve
 *   `generative-background.js`'s `from './capability'`.
 * @param {boolean} [opts.indexFallback] Map a bare `/` request to
 *   `/index.html` — `extract-reference-matrices.mjs`'s own convenience for
 *   serving the rig directory root.
 * @return {Promise<{origin: string, close: Function}>} Server handle.
 */
export function serve( { root, resolveExtensionless = false, indexFallback = false } ) {
	const server = createServer( async ( req, res ) => {
		try {
			const urlPath = decodeURIComponent( ( req.url || '/' ).split( '?' )[ 0 ] );
			const relPath = indexFallback && urlPath === '/' ? '/index.html' : urlPath;
			let target = normalize( join( root, relPath ) );
			if ( resolveExtensionless && ! existsSync( target ) && ! extname( target ) ) {
				if ( existsSync( target + '.js' ) ) {
					target += '.js';
				}
			}
			if ( target !== root && ! target.startsWith( root + sep ) ) {
				res.writeHead( 403 );
				res.end( 'forbidden' );
				return;
			}
			const body = await readFile( target );
			res.writeHead( 200, {
				'Content-Type': MIME[ extname( target ) ] || 'application/octet-stream',
			} );
			res.end( body );
		} catch {
			res.writeHead( 404 );
			res.end( 'not found' );
		}
	} );
	return new Promise( ( resolvePromise ) => {
		server.listen( 0, '127.0.0.1', () => {
			const { port } = server.address();
			resolvePromise( {
				origin: `http://127.0.0.1:${ port }`,
				close: () => new Promise( ( x ) => server.close( x ) ),
			} );
		} );
	} );
}

/**
 * The viewport `fidelity-compare.mjs` and `extract-reference-matrices.mjs`
 * both pin — the rig sizes its frustum from the canvas, so the viewport IS an
 * input to the projection matrix and must match between any two runs being
 * compared. `capture-render.mjs` deliberately uses a DIFFERENT viewport (the
 * harness canvas's own 1393x761) — that is a real, legitimate divergence, not
 * drift, so it is NOT unified here; forcing it onto this constant would be
 * the exact kind of silent behaviour change this file is not supposed to make.
 */
export const VIEWPORT = Object.freeze( { width: 1440, height: 900 } );

/**
 * Painted-geometry thresholds shared verbatim by `capture-render.mjs` (its
 * own inline `0.02`/`8`) and `fidelity-compare.mjs` (its own
 * `PAINTED_MIN_COVERAGE`/`PAINTED_MIN_UNIQUE_HUES`) — confirmed identical
 * before consolidating, not assumed.
 */
export const PAINTED_MIN_COVERAGE = 0.02;
export const PAINTED_MIN_UNIQUE_HUES = 8;

/**
 * Exit-code convention for scripts that distinguish a FIDELITY FAILURE (the
 * apparatus worked; the measured result is over threshold) from a HARNESS
 * ERROR (the apparatus itself is broken). Currently only `fidelity-compare.mjs`
 * makes this distinction — `capture-render.mjs` and `flip-probe.mjs` are
 * single-purpose smoke tests with their own simpler 0/1 convention, and are
 * deliberately left alone rather than forced onto a three-way enum that would
 * change what their exit code means.
 */
export const EXIT_CODES = Object.freeze( {
	OK: 0,
	FIDELITY_FAILURE: 1,
	HARNESS_ERROR: 2,
} );

/**
 * silhouette-probe.mjs — geometry-vs-shading regression check.
 *
 * ORIGIN (systematic-debugging, 2026-09-03, D926/D927). Built to isolate the
 * measured silhouette-coverage deficit (D925 — ours covered 7-12 points LESS
 * of the frame than the rig) into "geometry/twist" vs "fragment shading".
 * That investigation is DONE — it found geometry/twist was never the
 * problem, and traced the real cause to three fragment-shader constants
 * copied wrong from the reference plus one term (`§3(b)` periodic
 * striations) ported from the WRONG preset entirely. Both are now fixed at
 * the source (see DEFAULT_GLOW_AMOUNT/POWER/RAMP,
 * DEFAULT_STRIATION_STRENGTH/FREQ/COLOUR_ATTENUATION/PARABOLA_POWER's
 * declaration comments in generative-background.js).
 *
 * This script now serves as the ongoing REGRESSION check: SHADED coverage
 * (the real, corrected shipped render) should track SILHOUETTE coverage
 * (pure geometry, `u_silhouetteDebug` — still a general-purpose diagnostic
 * uniform, kept for exactly this) much more closely than before the fix.
 * Compares both against the rig's already-recorded coverage
 * (`fidelity-baseline.json`) at the same three sampled phases
 * `fidelity-compare.mjs` uses.
 *
 * Usage: node scripts/generative-background/silhouette-probe.mjs
 *
 * @package
 */

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve, launchGpuBrowser, VIEWPORT } from './harness-lib.mjs';

const HERE = fileURLToPath( new URL( '.', import.meta.url ) );
const REPO_ROOT = resolve( HERE, '..', '..', '..', '..' );
const REPLICA_PATH = '/plugins/sgs-blocks/scripts/generative-background/poc-replica.html';
const PALETTE = 'palette-a';
const PYTHON = process.env.SGS_PYTHON || 'python';

// SAME raw ?t= values as fidelity-compare.mjs's SAMPLE_TIMES, same
// oursTimeFor() conversion — the whole point is to sample at the identical
// effective phases already recorded in fidelity-baseline.json. Now a plain
// ms->seconds unit conversion (D930): draw()'s own internal TIME_SCALE
// applies the reference-matched speed factor, so this driver no longer
// duplicates it — see fidelity-compare.mjs's matching comment for the
// full derivation.
const SAMPLE_TIMES = Object.freeze( [ 17500, 27500, 47500 ] );
const oursTimeFor = ( rigRawTime ) => rigRawTime / 1000;

// Same theme-token ground colour as D925's fix, so this probe isn't
// reintroducing the already-eliminated ground-colour variable.
const GROUND_COLOUR = [ 250 / 255, 249 / 255, 246 / 255 ];

// Same crop box fidelity-compare.mjs derives for rung 1 (read from the
// tracked baseline rather than re-deriving — the crop is a property of
// where content paints on this run's environment/GPU, and re-deriving it
// here would risk a silent mismatch against the numbers being compared to).
const BASELINE_PATH = join( HERE, 'fidelity-baseline.json' );
const baseline = JSON.parse( readFileSync( BASELINE_PATH, 'utf8' ) );
const rung1 = baseline.rungs[ '1_geometry_shading' ];

// The crop rung 1's numbers were derived against — read from the committed
// baseline (top-level `crop`, confirmed via a direct read of the JSON, not
// assumed) so this probe samples the identical region, not a re-derived one.
const cropBox = baseline.crop;
if ( ! Array.isArray( cropBox ) || cropBox.length !== 4 ) {
	console.error(
		'FAIL: could not find the rung-1 crop box in fidelity-baseline.json. ' +
			'Re-run `npm run fidelity:compare` first so this probe samples the same region.'
	);
	process.exit( 2 );
}
const [ cx0, cy0, cx1, cy1 ] = cropBox;
const cropX = cx0;
const cropY = cy0;
const cropW = cx1 - cx0;
const cropH = cy1 - cy0;

function paintedCoverage( pngPath ) {
	const PY = `
import sys, json
from PIL import Image
import numpy as np
path, x, y, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
region = Image.open(path).convert('RGB').crop((x, y, x + w, y + h))
arr = np.asarray(region)
quant = (arr >> 3).astype(np.int32)
keys = (quant[..., 0] << 10) | (quant[..., 1] << 5) | quant[..., 2]
flat = keys.flatten()
vals, counts = np.unique(flat, return_counts=True)
dominant = int(counts.max()) if counts.size else 0
total = int(flat.size)
print(json.dumps({'coverage': (total - dominant) / total if total else 0.0, 'unique': int(vals.size)}))
`;
	const stdout = execFileSync(
		PYTHON,
		[ '-c', PY, pngPath, String( cropX ), String( cropY ), String( cropW ), String( cropH ) ],
		{ encoding: 'utf8' }
	);
	return JSON.parse( stdout.trim() );
}

async function captureOurs( browser, origin, t, { silhouette = false } = {}, outPng ) {
	const page = await browser.newPage( { viewport: VIEWPORT, deviceScaleFactor: 1 } );
	const problems = [];
	page.on( 'console', ( m ) => {
		if ( m.type() === 'error' ) problems.push( m.text() );
	} );
	page.on( 'pageerror', ( e ) => problems.push( String( e ) ) );
	try {
		const url =
			`${ origin }${ REPLICA_PATH }?t=${ oursTimeFor( t ) }&pal=${ PALETTE }` +
			`&ground=${ GROUND_COLOUR.join( ',' ) }` +
			( silhouette ? '&silhouette=1' : '' );
		await page.goto( url, { waitUntil: 'load' } );
		await page.waitForFunction( () => window.__ready === true, { timeout: 30000 } );
		const err = await page.evaluate( () => window.__err || null );
		if ( err ) {
			throw new Error( `poc-replica.html reported __err: ${ err }` );
		}
		await page.evaluate(
			() => new Promise( ( r ) => requestAnimationFrame( () => requestAnimationFrame( r ) ) )
		);
		await page.screenshot( { path: outPng } );
		if ( problems.length ) {
			throw new Error( `console errors during render: ${ problems.slice( 0, 5 ).join( ' | ' ) }` );
		}
	} finally {
		await page.close();
	}
}

const runDir = join( HERE, 'runs', 'silhouette-probe-' + Date.now() );
const { mkdir } = await import( 'node:fs/promises' );
await mkdir( runDir, { recursive: true } );

const site = await serve( { root: REPO_ROOT, resolveExtensionless: true } );
const browser = await launchGpuBrowser( chromium );

console.log( `Crop box (from fidelity-baseline.json): [${ cropX },${ cropY },${ cropX + cropW },${ cropY + cropH }]\n` );

const MODES = [
	{ key: 'shaded', label: 'SHADED (corrected)', opts: {} },
	{ key: 'silhouette', label: 'SILHOUETTE (pure geometry)', opts: { silhouette: true } },
];

console.log( 'phase   | rig coverage | ' + MODES.map( ( m ) => m.label ).join( ' | ' ) );
console.log( '-'.repeat( 130 ) );

let results = [];
try {
	for ( const t of SAMPLE_TIMES ) {
		const row = { t, effectivePhase: oursTimeFor( t ).toFixed( 2 ) };
		row.rigCoverage = rung1.perTime[ String( t ) ].silhouette.ref_coverage;
		for ( const mode of MODES ) {
			const outPng = join( runDir, `ours-${ mode.key }-t${ t }.png` );
			await captureOurs( browser, site.origin, t, mode.opts, outPng );
			row[ mode.key ] = paintedCoverage( outPng ).coverage;
		}
		console.log(
			`t=${ String( row.effectivePhase ).padEnd( 6 ) } | ${ ( row.rigCoverage * 100 ).toFixed( 1 ).padStart( 11 ) }% | ` +
				MODES.map( ( m ) => `${ ( row[ m.key ] * 100 ).toFixed( 1 ).padStart( m.label.length - 1 ) }%` ).join( ' | ' )
		);
		results.push( row );
	}
} finally {
	await browser.close();
	await site.close();
}

console.log( '\n── Verdict ──' );
const avg = ( key ) => results.reduce( ( s, r ) => s + ( r.rigCoverage - r[ key ] ), 0 ) / results.length;
const avgGapShaded = avg( 'shaded' );
const avgGapSilhouette = avg( 'silhouette' );
console.log( `Average (rig - ours) gap, SHADED (corrected)   : ${ ( avgGapShaded * 100 ).toFixed( 1 ) } points` );
console.log( `Average (rig - ours) gap, SILHOUETTE (geometry): ${ ( avgGapSilhouette * 100 ).toFixed( 1 ) } points` );
console.log(
	`\nBoth should now sit close together (D926/D927's fix removed the fragment-shading ` +
		`divergence that used to separate them by ~9pts). A large gap reopening between the two ` +
		`means a fragment-shading regression; a large SILHOUETTE gap on its own means a geometry ` +
		`regression — check verify-transform.mjs first in that case.`
);

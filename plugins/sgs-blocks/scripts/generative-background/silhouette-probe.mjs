/**
 * silhouette-probe.mjs — systematic-debugging Phase 3 minimal test.
 *
 * HYPOTHESIS (stated before running, per the iron law): the measured
 * silhouette-coverage deficit (D925 — ours covers 7-12 points LESS of the
 * frame than the rig at every sampled phase, IoU 0.756-0.799) is NOT a
 * geometry/twist bug. It is caused by our engine's depth-fade-to-ground
 * mechanism (generative-background.js FRAGMENT_SHADER, `mix(colour, u_ground,
 * depthFade)`), which has NO counterpart anywhere in the reference shader —
 * confirmed by reading `.claude/scratch/stripe-hero-poc/shaders/39798.glsl`
 * in full: no fog, no ground-mix, `u_clearColor` is declared but never
 * referenced, and the renderer's own clear colour is fully transparent
 * (alpha 0). That mechanism blends part of our silhouette toward near-white,
 * which the coverage detector (quantised-key vs dominant background colour)
 * then correctly reads as "background" — eating into our measured coverage
 * without any real shape divergence.
 *
 * TEST: compare OUR OWN silhouette-only coverage (u_silhouetteDebug=true —
 * flat white wherever layers 1-3's folded mesh rasterises, bypassing EVERY
 * fragment effect) against OUR OWN normal shaded coverage, at the same three
 * sampled phases fidelity-compare.mjs already uses. This isolates geometry
 * from fragment shading WITHOUT needing the rig at all for the key
 * comparison — the rig's own already-recorded coverage (fidelity-baseline.json)
 * is printed alongside for context, not re-captured.
 *
 * If silhouette-only coverage ≈ rig coverage: geometry/twist is
 *   essentially correct: the fragment effects are the cause.
 * If silhouette-only coverage is ALSO well below rig coverage: geometry/twist
 *   itself diverges — layer 3 (or the 2026-08-28 noiseWobble addendum, added
 *   after verify-transform.mjs was built and not covered by it) needs
 *   investigating next.
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

// SAME raw ?t= values as fidelity-compare.mjs's SAMPLE_TIMES, SAME
// RIG_SPEED conversion — the whole point is to sample at the identical
// effective phases already recorded in fidelity-baseline.json.
const RIG_SPEED = 4e-5;
const SAMPLE_TIMES = Object.freeze( [ 17500, 27500, 47500 ] );
const oursTimeFor = ( rigRawTime ) => rigRawTime * RIG_SPEED;

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

async function captureOurs(
	browser,
	origin,
	t,
	{
		silhouette = false,
		depthFadeOff = false,
		gradingOff = false,
		additiveOff = false,
		legacyStriationOff = false,
	} = {},
	outPng
) {
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
			( silhouette ? '&silhouette=1' : '' ) +
			( depthFadeOff ? '&depthfade=0' : '' ) +
			( gradingOff ? '&grading=0' : '' ) +
			( additiveOff ? '&additive=0' : '' ) +
			( legacyStriationOff ? '&legacystriation=0' : '' );
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
	{ key: 'shaded', label: 'SHADED (normal)', opts: {} },
	{ key: 'noLegacyStriation', label: 'LEGACY-STRIATION off', opts: { legacyStriationOff: true } },
	{ key: 'noAdditive', label: 'ADDITIVE off', opts: { additiveOff: true } },
	{ key: 'silhouette', label: 'SILHOUETTE (all off)', opts: { silhouette: true } },
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
if ( avgGapShaded <= 0 ) {
	console.log( 'No shaded gap to explain — nothing to conclude.' );
} else {
	for ( const mode of MODES ) {
		if ( mode.key === 'shaded' ) continue;
		const gap = avg( mode.key );
		const recovered = 1 - gap / avgGapShaded;
		console.log(
			`${ mode.label.padEnd( 24 ) }: gap ${ ( gap * 100 ).toFixed( 1 ) } pts, ` +
				`${ ( recovered * 100 ).toFixed( 0 ) }% of the SHADED gap recovered`
		);
	}
	console.log(
		'\nRead this as elimination, per-effect: whichever single toggle above recovers most of the ' +
			'gap on its own is the dominant contributor. If none does individually but SILHOUETTE ' +
			'(all off) does, the effects interact — no single one dominates.'
	);
}

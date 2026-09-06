/**
 * Verify the PRODUCTION transform maths against ground truth from the rig.
 *
 * ⭐ WHY THIS IMPORTS THE REAL MODULE. It would be easier to reimplement the
 * matrix maths here and compare that to the rig. It would also be worthless:
 * two implementations of mine agreeing proves consistency, not correctness,
 * and the shipped file could still be wrong. This imports
 * `webgl/generative-background-transform.js` — the exact module the browser
 * runs — so a passing run is evidence about production, not about a replica.
 * D882 named "the verification so far is in a scratch Node script, not yet
 * wired into `generative-background.js`" as the outstanding gap; this closes it.
 *
 * ⛔ THE NEGATIVE CONTROLS ARE NOT OPTIONAL. A comparator with a too-loose
 * tolerance, or one reading a field that does not exist, passes everything —
 * including a build that is rotating the wrong way. Each check below is paired
 * with a deliberately-broken input that MUST fail. If a negative control
 * passes, the whole run is reported as broken rather than green, because at
 * that point the positive results carry no information.
 *
 * Usage:
 *   node scripts/generative-background/verify-transform.mjs
 *
 * Exits non-zero on any mismatch or any vacuous check.
 *
 * @package
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	buildTransform,
	composeModelMatrix,
	foldVertex,
	PRESETS,
	PLANE_WIDTH,
} from '../../src/shared/effects/webgl/generative-background-transform.js';

const HERE = fileURLToPath( new URL( '.', import.meta.url ) );
const TRUTH_FILE = join( HERE, 'reference-matrices.json' );

// Floating-point agreement threshold, RELATIVE to element magnitude.
//
// ⚠ A flat absolute tolerance does not work here and a fixed 1e-4 initially
// reported a false failure. The rig computes in float64; the production module
// stores into a Float32Array for upload to the GPU, and float32 has roughly
// 1.2e-7 relative precision — which at the view matrix's translation element
// (magnitude ~5000) is an unavoidable ~6e-4 absolute difference. Scaling the
// threshold by magnitude keeps small elements held to a tight absolute bound
// while not failing large ones for storing exactly what they will store on the
// GPU. 1e-6 relative is still ~100x tighter than float32 itself, so this
// loosens nothing that matters: the real bugs (wrong Euler order, transposed
// rotation, uniform scale) diverge by whole units, and the negative controls
// below prove this threshold still catches them.
const RELATIVE_TOLERANCE = 1e-6;
const ABSOLUTE_FLOOR = 1e-4;

let failures = 0;
let checks = 0;

/**
 * Report one assertion.
 *
 * @param {boolean} ok      Did it pass.
 * @param {string}  label   What was checked.
 * @param {string}  detail  Extra context shown on failure.
 */
function assert( ok, label, detail = '' ) {
	checks++;
	if ( ok ) {
		console.log( `  PASS  ${ label }` );
	} else {
		failures++;
		console.log( `  FAIL  ${ label }` );
		if ( detail ) {
			console.log( `        ${ detail }` );
		}
	}
}

/**
 * Largest absolute element-wise difference between two 16-element matrices.
 *
 * @param {ArrayLike<number>} a First matrix.
 * @param {ArrayLike<number>} b Second matrix.
 * @return {number} Max absolute difference.
 */
function maxDiff( a, b ) {
	let worst = 0;
	for ( let i = 0; i < 16; i++ ) {
		worst = Math.max( worst, Math.abs( a[ i ] - b[ i ] ) );
	}
	return worst;
}

/**
 * Do two matrices agree, allowing float32 storage error on large elements?
 *
 * @param {ArrayLike<number>} a First matrix.
 * @param {ArrayLike<number>} b Second matrix.
 * @return {{ok: boolean, worst: number, index: number, budget: number}} Result.
 */
function matricesAgree( a, b ) {
	let ok = true;
	let worst = 0;
	let index = -1;
	let budget = ABSOLUTE_FLOOR;
	for ( let i = 0; i < 16; i++ ) {
		const diff = Math.abs( a[ i ] - b[ i ] );
		const allowed = Math.max(
			ABSOLUTE_FLOOR,
			Math.abs( b[ i ] ) * RELATIVE_TOLERANCE
		);
		if ( diff > allowed ) {
			ok = false;
		}
		if ( diff > worst ) {
			worst = diff;
			index = i;
			budget = allowed;
		}
	}
	return { ok, worst, index, budget };
}

if ( ! existsSync( TRUTH_FILE ) ) {
	console.error(
		`FAIL: no ground truth at ${ TRUTH_FILE }\n` +
			'Run extract-reference-matrices.mjs first. Reporting this as a failure ' +
			'rather than skipping: a "no truth file, nothing to check" pass is ' +
			'exactly the vacuous green this script exists to prevent.'
	);
	process.exit( 1 );
}

const truth = JSON.parse( await readFile( TRUTH_FILE, 'utf8' ) );
const preset = PRESETS[ truth._meta.preset ];

// ⛔ Read frustumSize, NOT viewport — see the extractor's note. An older
// truth file predating that field would silently fall back to the wrong
// number, so refuse rather than guess.
if ( ! truth.frustumSize ) {
	console.error(
		'FAIL: ground-truth file has no `frustumSize`. It predates the fix that ' +
			'records the canvas box the frustum is actually built from. Re-run ' +
			'extract-reference-matrices.mjs; comparing against `viewport` gives a ' +
			'confident wrong answer.'
	);
	process.exit( 1 );
}
const { width, height } = truth.frustumSize;

console.log(
	`Ground truth: ${ truth._meta.preset } preset, frustum ${ width }x${ height }\n`
);

// ── 1. The fold's axis-permutation shortcut ────────────────────────────────
// `foldVertex` collapses Rx(-90) then Ry(-90) into (x,y,z) -> (y,z,x). If that
// identity is wrong the whole sheet is mis-oriented, so assert it directly
// rather than trusting the comment.
console.log( 'Layer 1 — CPU fold' );
{
	// A vertex on the far flank (x < -16) is undeformed except z = foldPower,
	// which makes the permutation readable in isolation.
	const v = 0.5;
	const foldPower = 4 - 2 * Math.pow( 4 * v * ( 1 - v ), 9.5 );
	const restX = -100;
	const restY = 42;
	const got = foldVertex( restX, restY, v, PLANE_WIDTH );
	// Pre-permutation the vertex is (restX + w/4, restY, foldPower);
	// after (x,y,z) -> (y,z,x) it must be (restY, foldPower, restX + w/4).
	const want = [ restY, foldPower, restX + PLANE_WIDTH / 4 ];
	assert(
		Math.abs( got[ 0 ] - want[ 0 ] ) < 1e-9 &&
			Math.abs( got[ 1 ] - want[ 1 ] ) < 1e-9 &&
			Math.abs( got[ 2 ] - want[ 2 ] ) < 1e-9,
		'far-flank vertex lands at the axis-permuted position',
		`got ${ got.map( ( n ) => n.toFixed( 4 ) ) } want ${ want.map( ( n ) =>
			n.toFixed( 4 )
		) }`
	);

	// The central band must actually deform in X — if the band test were wrong
	// (e.g. an inverted comparison) this vertex would pass straight through.
	const centre = foldVertex( 0, 0, 0.5, PLANE_WIDTH );
	const flank = foldVertex( -100, 0, 0.5, PLANE_WIDTH );
	assert(
		Math.abs( centre[ 2 ] - flank[ 2 ] ) > 1e-6,
		'central band is deformed differently from the flank',
		'both bands produced the same X — the band split is not firing'
	);

	// NEGATIVE CONTROL: the mirrored near flank must NOT equal the far flank.
	// If it does, the `x = -x` mirror was dropped and the sheet never folds
	// back over itself — the exact "looks flat and gentle" failure mode.
	//
	// ⚠ Compare the WHOLE vector, not one component. The first version of this
	// check compared index 2 alone and failed: at x = ±100 both flanks land at
	// fx = 0 (one is -100 + w/4, the other is -(100) + w/4), so they genuinely
	// coincide on that axis while differing in fz. The mirror was fine; the
	// test was reading the one component that could not see it.
	const near = foldVertex( 100, 0, 0.5, PLANE_WIDTH );
	const flankDelta = Math.max(
		Math.abs( near[ 0 ] - flank[ 0 ] ),
		Math.abs( near[ 1 ] - flank[ 1 ] ),
		Math.abs( near[ 2 ] - flank[ 2 ] )
	);
	assert(
		flankDelta > 1e-6,
		'[negative control] near flank is mirrored, not identical to far flank',
		'near and far flanks coincide on every axis — the X mirror is missing'
	);
}

// ── 2. Layer 2 + camera against the rig's own matrices ─────────────────────
console.log( '\nLayer 2 — object transform + camera' );
const built = buildTransform( preset, width, height );

{
	const r = matricesAgree( built.modelView, truth.modelViewMatrix );
	assert(
		r.ok,
		`modelViewMatrix matches the rig (worst element diff ${ r.worst.toExponential(
			2
		) } at [${ r.index }], budget ${ r.budget.toExponential( 2 ) })`,
		`got  ${ Array.from( built.modelView )
			.map( ( n ) => n.toFixed( 4 ) )
			.join( ', ' ) }\n        want ${ truth.modelViewMatrix
			.map( ( n ) => n.toFixed( 4 ) )
			.join( ', ' ) }`
	);
}

{
	const r = matricesAgree( built.projection, truth.projectionMatrix );
	assert(
		r.ok,
		`projectionMatrix matches the rig (worst element diff ${ r.worst.toExponential(
			2
		) } at [${ r.index }], budget ${ r.budget.toExponential( 2 ) })`,
		`got  ${ Array.from( built.projection )
			.map( ( n ) => n.toFixed( 6 ) )
			.join( ', ' ) }\n        want ${ truth.projectionMatrix
			.map( ( n ) => n.toFixed( 6 ) )
			.join( ', ' ) }`
	);
}

// ── 3. Negative controls on the matrix comparison ──────────────────────────
// Both of these are real bugs that shipped or were nearly shipped. If either
// now compares as "matching", the tolerance is too loose to catch them and
// every PASS above is meaningless.
console.log( '\nNegative controls' );
{
	// Euler order Rz·Ry·Rx instead of Rx·Ry·Rz — D882's documented wrong guess.
	const [ rx, ry, rz ] = preset.rotation;
	const reversed = composeModelMatrix( preset.position, [ rz, ry, rx ], preset.scale );
	const correct = composeModelMatrix(
		preset.position,
		preset.rotation,
		preset.scale
	);
	const r = matricesAgree( reversed, correct );
	assert(
		! r.ok,
		`[negative control] reversed Euler order is detected as different (diff ${ r.worst.toExponential(
			2
		) })`,
		'a reversed rotation compared EQUAL — the comparison cannot distinguish real bugs'
	);
}

{
	// Uniform scale instead of the reference's non-uniform (9, 8, 5). This is
	// the "looks nearly right but the composition is off" case.
	const uniform = composeModelMatrix( preset.position, preset.rotation, [ 9, 9, 9 ] );
	const r = matricesAgree( uniform, correctModelForScaleControl() );
	assert(
		! r.ok,
		`[negative control] uniform scale is detected as different (diff ${ r.worst.toExponential(
			2
		) })`,
		'a uniform scale matched the reference scale — scale is not reaching the matrix'
	);
}

/**
 * The correctly-scaled model matrix, for the scale negative control.
 *
 * ⚠ Compared against the correct MODEL matrix, not against the rig's
 * modelView. The first version compared a bare model matrix to a modelView
 * (which has the camera folded in) — that "passes" for the wrong reason: those
 * two differ regardless of scale, so the control could never fail and proved
 * nothing about whether scale reaches the matrix.
 *
 * @return {Float32Array} Model matrix with the preset's real scale.
 */
function correctModelForScaleControl() {
	return composeModelMatrix( preset.position, preset.rotation, preset.scale );
}

// ── Result ─────────────────────────────────────────────────────────────────
/*
 * ⛔ REPORT WHAT EACH CHECK IS WORTH — do not print a bare "7/7".
 *
 * Commit b4ce49771's message said "7/7 checks against matrices extracted from
 * the running rig". That was an overstatement caught by an adversarial-council
 * fact-check: only TWO of these compare against the rig. Three are
 * self-consistency checks on our own fold code, and two are negative controls
 * comparing a function against itself — which proves the tolerance can
 * discriminate, not that our maths matches the reference.
 *
 * A bare count invites exactly that misreading, and a count that gets cited as
 * "seven independent confirmations" is how a weak result travels as a strong
 * one. So the breakdown prints alongside the total, always.
 */
console.log( `\n${ checks - failures }/${ checks } checks passed.` );
console.log(
	'  of which: 2 are GROUND-TRUTH comparisons against rig-extracted matrices\n' +
		'            3 are self-consistency checks on our own fold code\n' +
		'            2 are negative controls (tolerance discrimination only)\n' +
		'  ⚠ Layer 3 (the per-frame GPU twist) is verified by NONE of these — it\n' +
		'    lives in a shader string this module cannot import. Not covered here.'
);

if ( failures > 0 ) {
	console.error(
		'\nFAIL: the production transform does not reproduce the reference.\n' +
			'Do NOT tune this visually until the numbers agree — a screenshot ' +
			'already passed a build that rotated the wrong way on all three axes.'
	);
	process.exit( 1 );
}

console.log( 'OK: production transform reproduces the reference numerically.' );

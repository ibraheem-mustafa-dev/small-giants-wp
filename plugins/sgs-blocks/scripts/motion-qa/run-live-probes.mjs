/**
 * Live motion-QA runner — the standing post-deploy motion check.
 *
 * WHY THIS EXISTS (2026-08-21, D730). `scripts/motion-qa/` had accumulated 13 probes and
 * **not one of them was referenced anywhere in `package.json`** — no gate, no alias, no
 * pipeline. They were written for one investigation each and then became unreachable by
 * convention: a future session had no way to discover them short of listing the directory.
 * That is this repo's documented failure mode (D338/D493: a gate sat unwired for three
 * weeks while the docs claimed it ran), and the motion directory was a whole folder of it.
 *
 * ⛔ WHY THIS IS NOT IN `prebuild`. Every probe here needs a LIVE canary. A network-
 * dependent check in a build gate has only two possible behaviours, and both are bad:
 * fail the build when the canary is merely unreachable, or warn-and-pass — which is
 * exactly the vacuity `check-no-inline.py --live-default` already has (it PASSES on a
 * disconnected machine, so a green run there proves nothing). The honest home for a live
 * check is AFTER a deploy, where the canary is up by definition and the deployed code has
 * just been confirmed to be this run's payload.
 *
 * Wired into `build-deploy.py` as `step_motion_qa()`, after `step_verify_payload()`.
 * Opt out with `--skip-motion-qa`, and know that doing so is the D338 mistake.
 *
 * SCOPE, STATED HONESTLY. This runner registers only the probes that are standing
 * regression checks with negative controls and stable canary fixtures. The other probes in
 * this directory are one-shot investigation artefacts tied to a specific incident; they
 * are still runnable by hand and are NOT claimed to be covered here. Promoting one means
 * giving it a stable fixture and a negative control, then adding it to PROBES below.
 *
 * Timing: each probe's wall-clock seconds print after it finishes, and a closing table (probe, seconds,
 * pass/fail, slowest first, plus the total) prints before the PASS/FAIL line. To test that code without the
 * live canary, set SGS_MOTION_QA_PROBES_JSON to a JSON array of { file, what, args } (file may be an
 * absolute path); it replaces the probe list. Unset, the list below runs.
 *
 * Run:  npm run qa:motion
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );

const REAL_PROBES = [
	{
		file: 'probe-morph-geometry.mjs',
		what: 'fx-morph actually changes SVG geometry (D452 close-out, page 2113)',
	},
	{
		file: 'probe-motion-path-repeat.mjs',
		what: 'motion-path re-animates on a second pass (D451 close-out, page 2109)',
	},
	{
		file: 'probe-good-by-default.mjs',
		what: 'scrub/scramble/split-reveal/pin-scrub are safe by default (pages 2103, 2603)',
	},
	{
		file: 'probe-motion-model.mjs',
		what: 'Spec 38A motion model: hover, entrances, reveal, keyframes, tilt, asset guard, scroll driver across engines (pages 5223, 5226, 5229)',
		args: [ '--page', '5223', '--page', '5226', '--page', '5229', '--engine', 'chromium', '--engine', 'firefox', '--width', '1440' ],
	},
	{
		file: 'probe-scroll-progress.mjs',
		what: 'Spec 38A FR-38A-36 scroll progress on fixture page 5250: bar scale and counter text equal page progress, section bar, reduced motion, asset guard',
		args: [ '--engine', 'chromium', '--engine', 'firefox', '--width', '1440' ],
	},
	{
		file: 'probe-ambient-float.mjs',
		what: 'Spec 38A FR-38A-37 ambient float on fixture page 5297: stored timing, three-time samples, phases, pause button, focus pause, reduced motion',
		args: [ '--engine', 'chromium', '--engine', 'firefox', '--width', '1440' ],
	},
	{
		file: 'probe-looping-media.mjs',
		what: 'Spec 38A FR-38A-52 looping media on fixture page 5303: Ken Burns zoom-out-once and hold, SVG pulse, pause buttons, Lottie on scroll, logo draw on load, reduced motion, asset guard',
		args: [ '--engine', 'chromium', '--engine', 'firefox', '--width', '1440' ],
	},
	{
		file: 'probe-marquee.mjs',
		what: 'Spec 38A FR-38A-44 marquee on fixture page 5305: three reference drafts within 2% (45px/s, 24s, 64s, 30s), hover rate, touch pause, edge fade, pause buttons, breakpoint range, reduced motion; 375 runs the below-breakpoint marquees',
		args: [ '--engine', 'chromium', '--engine', 'firefox', '--width', '1440', '--width', '375' ],
	},
];

const PROBES = process.env.SGS_MOTION_QA_PROBES_JSON
	? JSON.parse( process.env.SGS_MOTION_QA_PROBES_JSON )
	: REAL_PROBES;

/** The closing table: one row per probe (name, seconds, pass/fail), slowest first, then the total. */
const formatProbeTable = ( results, totalSeconds ) => {
	const rows = [ ...results ].sort( ( a, b ) => b.seconds - a.seconds );
	const width = Math.max( 'probe'.length, ...rows.map( ( r ) => r.file.length ) );
	return [
		'[motion-qa] ---- probe timings, slowest first ----',
		`[motion-qa] ${ 'probe'.padEnd( width ) }  ${ 'seconds'.padStart( 8 ) }  result`,
		...rows.map(
			( r ) =>
				`[motion-qa] ${ r.file.padEnd( width ) }  ${ r.seconds.toFixed( 1 ).padStart( 8 ) }  ${ r.passed ? 'pass' : 'FAIL' }`
		),
		`[motion-qa] ${ 'TOTAL'.padEnd( width ) }  ${ totalSeconds.toFixed( 1 ).padStart( 8 ) }`,
	].join( '\n' );
};

const run = ( file, args = [] ) =>
	new Promise( ( resolve ) => {
		const child = spawn( process.execPath, [ path.resolve( HERE, file ), ...args ], {
			stdio: 'inherit',
		} );
		child.on( 'close', ( code ) => resolve( code ?? 1 ) );
		child.on( 'error', () => resolve( 1 ) );
	} );

console.log( `[motion-qa] running ${ PROBES.length } live probe(s) against the canary\n` );

const failed = [];
const results = [];
const runStarted = performance.now();
for ( const probe of PROBES ) {
	console.log( `[motion-qa] --- ${ probe.file }: ${ probe.what }` );
	const probeStarted = performance.now();
	const code = await run( probe.file, probe.args );
	const seconds = ( performance.now() - probeStarted ) / 1000;
	console.log( `[motion-qa] ${ probe.file } took ${ seconds.toFixed( 1 ) }s` );
	results.push( { file: probe.file, seconds, passed: code === 0 } );
	if ( code !== 0 ) failed.push( probe.file );
	console.log( '' );
}

console.log( formatProbeTable( results, ( performance.now() - runStarted ) / 1000 ) + '\n' );

if ( failed.length ) {
	console.error(
		`[motion-qa] FAIL — ${ failed.length } of ${ PROBES.length } probe(s) failed:\n` +
			failed.map( ( f ) => `  ${ f }` ).join( '\n' ) +
			'\n\n  A probe fails for one of two reasons and they need different responses:\n' +
			'  1. A real motion regression — the effect stopped working on the live site.\n' +
			'  2. A rotted FIXTURE — the canary page it targets was edited, trashed or\n' +
			'     renumbered. This has already happened once: D451 named page 2083, which\n' +
			'     is now a 404. Each probe reports UNANSWERED separately from a failure, so\n' +
			'     read its output rather than assuming which one you have.\n' +
			'  Neither is fixed by re-running the deploy.'
	);
	process.exit( 1 );
}

console.log( `[motion-qa] PASS — all ${ PROBES.length } live probe(s) green.` );

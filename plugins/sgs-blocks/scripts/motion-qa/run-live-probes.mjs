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
 * TIERS (measured serially on the live canary, 2026-10-17, 735s for the 8 probes): marquee 366.7s, looping-media 127.1s,
 * motion-model 112.5s, scroll-progress 44.7s, ambient-float 41.9s, good-by-default 20.7s, motion-path-repeat 18.0s,
 * morph-geometry 3.9s. Marquee and looping-media are 494s of that and are the two slowest, and they only concern the marquee,
 * Ken Burns, SVG loop, Lottie and logo-draw code, so they are `tiers: [ 'full' ]` and the smoke tier (the other six, about
 * 242s) skips them. The deploy chooses the tier itself (`deploy_qa_tier.py`): full when marquee-related code changed since
 * the last full pass, or when that pass is older than a day; smoke otherwise. `--tier full` here is still the default.
 *
 * ⛔ DO NOT RAISE --parallel ABOVE 1 AGAINST THE HOSTINGER CANARY. On 2026-10-17 running 4 probes at once cut the wall
 * clock to 444s but two probes then failed (fixture pages not answering HTTP 200) and the host's CDN (Server: hcdn) answered
 * 403 to every request: its bot protection treats the burst as an attack. The mechanism stays for hosts without such
 * protection; the runner prints a warning whenever N is above 1.
 *
 * Timing: each probe's wall-clock seconds print after it finishes, and a closing table (probe, seconds,
 * pass/fail, slowest first, plus the total) prints before the PASS/FAIL line.
 *
 * Options (all optional; with none given the run is exactly the serial full run it has always been):
 *   --tier smoke|full   run the probes whose `tiers` list the tier (default full). Marquee and looping-media are full only.
 *   --parallel N        run up to N probes at once, 1 to 8 (default 1 = serial, inherited output). With N above 1 each
 *                       probe's output is captured and printed as one block when it finishes, and the closing table is
 *                       in roster order with the wall-clock total and the sum of per-probe seconds. A probe marked
 *                       `serial: true` runs alone, after the parallel batch. SGS_HEADED=1 forces serial, because
 *                       headed browsers share the one physical pointer.
 *   --only <file>       run just that probe (repeatable), for investigating one.
 *   --list              print the probes the other options select, one per line, and exit 0 without running any
 *                       (no browser, no network).
 * A bad option exits 2 before any probe starts. Scheduling lives in `probe-scheduler.mjs`; the offline test is
 * `node scripts/motion-qa/run-live-probes.selftest.mjs`.
 *
 * To test without the live canary, set SGS_MOTION_QA_PROBES_JSON to the path of a JSON file holding an array of
 * { file, what, args, dir, tiers, serial } that replaces the probe list (`dir` is where `file` is resolved from,
 * default this folder; `file` may be absolute). A value starting with `[` is read as the JSON itself. Real runs
 * never set it.
 *
 * Run:  npm run qa:motion
 *       npm run qa:motion -- --tier smoke --parallel 3
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { formatParallelTable, parseRunnerArgs, printBlock, probePath, runCaptured, schedule, selectProbes, unknownOnly } from './probe-scheduler.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );

const REAL_PROBES = [
	{
		file: 'probe-morph-geometry.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'fx-morph actually changes SVG geometry (D452 close-out, page 2113)',
	},
	{
		file: 'probe-motion-path-repeat.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'motion-path re-animates on a second pass (D451 close-out, page 2109)',
	},
	{
		file: 'probe-good-by-default.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'scrub/scramble/split-reveal/pin-scrub are safe by default (pages 2103, 2603)',
	},
	{
		file: 'probe-motion-model.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A motion model: hover, entrances, reveal, keyframes, tilt, asset guard, scroll driver across engines (pages 5223, 5226, 5229, header baseline 5395)',
		args: [ '--page', '5223', '--page', '5226', '--page', '5229', '--page', '5395', '--engine', 'chromium', '--engine', 'firefox', '--width', '1440' ],
	},
	{
		file: 'probe-scroll-progress.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A FR-38A-36 scroll progress on fixture page 5250: bar scale and counter text equal page progress, section bar, reduced motion, asset guard',
		args: [ '--engine', 'chromium', '--engine', 'firefox', '--width', '1440' ],
	},
	{
		file: 'probe-ambient-float.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A FR-38A-37 ambient float on fixture page 5297: stored timing, three-time samples, phases, pause button, focus pause, reduced motion',
		args: [ '--engine', 'chromium', '--engine', 'firefox', '--width', '1440' ],
	},
	{
		file: 'probe-motion-loop-delays.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A FR-38A-26 server-written loop delays on a core query loop (fixture page 5436): per-item delays at 1440/768/375, one rule per item, no style attribute, no nth-child ladder',
		args: [ '--page', '5436', '--item-selector', '.m43-query [data-sgs-loop-i]', '--expect', '0,80,160,0,80,160', '--expect-tablet', '0,80,160,0,80,160', '--expect-mobile', '0,80,160,0,80,160' ],
	},
	{
		file: 'probe-motion-loop-delays.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A FR-38A-26 server-written loop delays on a WooCommerce product collection (fixture page 5436): the same judges on .m43-products',
		args: [ '--page', '5436', '--item-selector', '.m43-products [data-sgs-loop-i]', '--expect', '0,80,160,0,80,160', '--expect-tablet', '0,80,160,0,80,160', '--expect-mobile', '0,80,160,0,80,160' ],
	},
	{
		file: 'probe-motion-form-states.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A FR-38A-53 form and choice-flow states on fixture page 5451: invalid shake per submit, step-changed slide forward and back, none under reduced motion',
		args: [ '--form-url', '/?p=5451', '--flow-url', '/?p=5451', '--width', '1440', '--width', '375' ],
	},
	{
		file: 'probe-close-clip-edge-live.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A FR-38A-8 one-edge close on fixture page 5344: a bottom wipe against an all-edges control',
		args: [ '--page', '5344' ],
	},
	{
		file: 'probe-layer-off-per-effect.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A FR-38A-23 per-effect off on fixture page 5346: split-reveal off on mobile and on tablet alone, draggable and the control unaffected',
		args: [ '--page', '5346' ],
	},
	{
		file: 'probe-vanilla-off-per-tier.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A FR-38A-23 vanilla ripple and sheen off per tier on fixture page 5358, read at 375/768/1440 and across a resize',
		args: [ '--page', '5358' ],
	},
	{
		file: 'probe-motion-drawer-close-together.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A FR-38A-51 close order together on fixture page 5316: every item closes with no delay and no hold, with page 5276 (reversed) as the red control',
		args: [ '--page', '5316', '--engine', 'chromium', '--engine', 'firefox' ],
	},
	{
		file: 'probe-parallax.mjs',
		tiers: [ 'smoke', 'full' ],
		what: 'Spec 38A M5.7 parallax on fixture page 5253: hero media ratio, root basis, still frame, clamp and control, compared across engines',
		args: [ '--page', '5253', '--engine', 'chromium', '--engine', 'firefox' ],
	},
	{
		file: 'probe-motion-per-device.mjs',
		tiers: [ 'full' ],
		what: 'Spec 38A M3.9 per-device entrance distances, custom easings, part isolation, tilted cards and the polaroid frame on fixture page 5244',
		args: [ '--page', '5244' ],
	},
	{
		file: 'probe-motion-a11y.mjs',
		tiers: [ 'full' ],
		what: 'Spec 38A M3.10 motion accessibility on fixture page 5287: reduced motion, pause controls, hover captions, axe scoped to the fixture',
		args: [ '--page', '5287', '--axe-scope', 'fixture' ],
	},
	{
		file: 'probe-looping-media.mjs',
		tiers: [ 'full' ],
		// Runs alone in parallel mode: draw-load is a wall-clock span judged within 8% (header), so CPU contention would distort it.
		serial: true,
		what: 'Spec 38A FR-38A-52 looping media on fixture page 5303: Ken Burns zoom-out-once and hold, SVG pulse, pause buttons, Lottie on scroll, logo draw on load, reduced motion, asset guard',
		args: [ '--engine', 'chromium', '--engine', 'firefox', '--width', '1440' ],
	},
	{
		file: 'probe-marquee.mjs',
		tiers: [ 'full' ],
		// Runs alone in parallel mode: the rate is the painted speed over wall-clock time, judged within 2%, and hover drives a mouse (header).
		serial: true,
		what: 'Spec 38A FR-38A-44 marquee on fixture page 5305: three reference drafts within 2% (45px/s, 24s, 64s, 30s), hover rate, touch pause, edge fade, pause buttons, breakpoint range, reduced motion; 375 runs the below-breakpoint marquees',
		args: [ '--engine', 'chromium', '--engine', 'firefox', '--width', '1440', '--width', '375' ],
	},
];

const loadProbes = () => {
	const override = process.env.SGS_MOTION_QA_PROBES_JSON;
	if ( ! override ) return REAL_PROBES;
	return JSON.parse( override.trimStart().startsWith( '[' ) ? override : fs.readFileSync( override, 'utf8' ) );
};
const PROBES = loadProbes();

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

const run = ( probe ) =>
	new Promise( ( resolve ) => {
		const child = spawn( process.execPath, [ probePath( probe, HERE ), ...( probe.args ?? [] ) ], {
			stdio: 'inherit',
		} );
		child.on( 'close', ( code ) => resolve( code ?? 1 ) );
		child.on( 'error', () => resolve( 1 ) );
	} );

const options = parseRunnerArgs( process.argv.slice( 2 ) );
if ( options.error ) {
	console.error( `[motion-qa] ${ options.error }` );
	process.exit( 2 );
}
const unknown = unknownOnly( PROBES, options.only );
if ( unknown.length ) {
	console.error( `[motion-qa] --only names no probe in the roster: ${ unknown.join( ', ' ) }. Roster: ${ PROBES.map( ( p ) => p.file ).join( ', ' ) }` );
	process.exit( 2 );
}
const SELECTED = selectProbes( PROBES, options );
if ( options.list ) {
	console.log( `[motion-qa] --list tier ${ options.tier }: ${ SELECTED.length } of ${ PROBES.length } probe(s); nothing was run.` );
	SELECTED.forEach( ( probe ) => console.log( `  ${ probe.file }` ) );
	process.exit( 0 );
}
if ( ! SELECTED.length ) {
	console.error( `[motion-qa] no probe matches --tier ${ options.tier }${ options.only.length ? ' with --only' : '' }; nothing was run.` );
	process.exit( 2 );
}
// Headed browsers share the one physical pointer, so parallel headed runs would fight over it.
const parallel = process.env.SGS_HEADED ? 1 : options.parallel;

console.log( `[motion-qa] running ${ SELECTED.length } live probe(s) against the canary
` );
if ( options.tier !== 'full' || options.only.length ) {
	console.log( `[motion-qa] tier ${ options.tier }${ options.only.length ? ', --only' : '' }: ${ SELECTED.length } of ${ PROBES.length } probe(s)
` );
}
if ( options.parallel > 1 ) {
	console.log( '[motion-qa] WARNING: --parallel above 1 tripped the Hostinger canary CDN bot protection on 2026-10-17 (fixture pages stopped answering, then 403 for every request); do not use it against the canary.\n' );
}
if ( options.parallel > 1 && parallel === 1 ) {
	console.log( '[motion-qa] SGS_HEADED is set: running serially, headed browsers share one pointer\n' );
}

const failed = [];
const results = [];
const runStarted = performance.now();
if ( parallel === 1 ) {
	for ( const probe of SELECTED ) {
		console.log( `[motion-qa] --- ${ probe.file }: ${ probe.what }` );
		const probeStarted = performance.now();
		const code = await run( probe );
		const seconds = ( performance.now() - probeStarted ) / 1000;
		console.log( `[motion-qa] ${ probe.file } took ${ seconds.toFixed( 1 ) }s` );
		results.push( { file: probe.file, seconds, passed: code === 0 } );
		if ( code !== 0 ) failed.push( probe.file );
		console.log( '' );
	}
	console.log( formatProbeTable( results, ( performance.now() - runStarted ) / 1000 ) + '\n' );
} else {
	const captured = await schedule( SELECTED, parallel, ( probe ) => runCaptured( probe, HERE ), printBlock );
	captured.forEach( ( r, i ) => r.code !== 0 && failed.push( SELECTED[ i ].file ) );
	console.log( formatParallelTable( SELECTED, captured, ( performance.now() - runStarted ) / 1000, parallel ) + '\n' );
}

if ( failed.length ) {
	console.error(
		`[motion-qa] FAIL — ${ failed.length } of ${ SELECTED.length } probe(s) failed:\n` +
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

console.log( `[motion-qa] PASS — all ${ SELECTED.length } live probe(s) green.` );

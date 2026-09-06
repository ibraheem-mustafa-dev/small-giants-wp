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
 * SCOPE, STATED HONESTLY. This runner registers the THREE probes that are standing
 * regression checks with negative controls and stable canary fixtures. The other probes in
 * this directory are one-shot investigation artefacts tied to a specific incident; they
 * are still runnable by hand and are NOT claimed to be covered here. Promoting one means
 * giving it a stable fixture and a negative control, then adding it to PROBES below.
 *
 * Run:  npm run qa:motion
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );

const PROBES = [
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
];

const run = ( file ) =>
	new Promise( ( resolve ) => {
		const child = spawn( process.execPath, [ path.join( HERE, file ) ], {
			stdio: 'inherit',
		} );
		child.on( 'close', ( code ) => resolve( code ?? 1 ) );
		child.on( 'error', () => resolve( 1 ) );
	} );

console.log( `[motion-qa] running ${ PROBES.length } live probe(s) against the canary\n` );

const failed = [];
for ( const probe of PROBES ) {
	console.log( `[motion-qa] --- ${ probe.file }: ${ probe.what }` );
	const code = await run( probe.file );
	if ( code !== 0 ) failed.push( probe.file );
	console.log( '' );
}

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

#!/usr/bin/env node
// The foundation command: a site's foundation (tokens, media, menus, business details, then the header, footer and nav drawer) built from
// a client's handoff folder on one site by one command, with no hand step between the steps.
//   node scripts/computed-route/build-foundation.mjs <client> --site <target>
//        [--plan] [--force step,step] [--through step] [--replace-snapshot] [--allow-missing-paint sgs/a,sgs/b] [--allow-unpicked] [--picks <file>]
// The steps run in this order (lib/foundation-plan.mjs): preflight, handoff-check, intake-files, intake, apply-review, tokens, plugin-build, sync,
// snapshot-push, site-info, media, catalogue, site-build, manifest, fixtures, looks, skeletons, surfaces. Each prints one line: `ok`, `skip` with the reason (its result is
// current, or it has nothing to do by design), `FAIL` with the next action, or `stop` when a step it depends on failed. A step that already holds a
// current result is skipped, so a rerun after a failure costs little; the state is kept in sites/<client>/build/foundation/<site>.json (gitignored) and
// each step's own logs in sites/<client>/build/qa/foundation/<stamp>/. Exit 0 when no step failed or stopped, 1 otherwise, 2 on a usage error.
//   --plan                  prints what each step would do (or why it would not) and runs nothing; the preflight makes only its file checks, and no site is contacted
//   --force a,b             runs the named steps whatever they hold
//   --through step          runs the steps up to and including `step` and none after it (`--through site-build` stops before the looks, the skeletons and the
//                           header, footer and drawer); the summary says which steps were left out
//   --replace-snapshot      lets the token extraction replace the client's committed theme-snapshot.json, from a worktree only; without it a client that
//                           has a snapshot keeps it and the extraction is written to a scratch file and compared
//   --allow-missing-paint   (lib/paint-gate.mjs) blocks that go through without default paint, never a wildcard
//   --allow-unpicked        lets skeleton rows that await an agent pick go through on the writer's proposal (lib/clone-surface.mjs)
//   --picks <file>          the finaliser's picks file, applied (intake.mjs --finalise, then --apply-picks) before the surfaces step reads the skeleton rows
// --site is the only site read or written: a protected site is refused by the preflight before any other check. Run it from a worktree.
import path from 'path';
import { fileURLToPath } from 'url';
import { STEP_IDS, buildSteps } from './lib/foundation-plan.mjs';
import { realPorts } from './lib/foundation-ports.mjs';
import { readState, runFoundation, stateFile } from './lib/foundation-run.mjs';
import { allowMissingPaintArg } from './lib/paint-gate.mjs';
import { readTargets } from './lib/site-targets.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const USAGE = 'usage: build-foundation.mjs <client> --site <target> [--plan] [--force step,step] [--through step] [--replace-snapshot] [--allow-missing-paint sgs/a,sgs/b] [--allow-unpicked] [--picks <file>]';
const stamp = () => new Date().toISOString().replace( /\.\d+Z$/, '' ).replace( /:/g, '-' );

// The summary line of a finished run.
export function summaryLine( { client, site, results, plan = false } ) {
	const count = ( s ) => results.filter( ( r ) => r.status === s ).length;
	const bad = results.filter( ( r ) => [ 'fail', 'stop' ].includes( r.status ) );
	return `foundation ${ client } on ${ site }${ plan ? ' (plan)' : '' }: ${ count( 'ok' ) } ok, ${ count( 'skip' ) } skipped${ plan ? `, ${ count( 'plan' ) } would run` : '' }, ${ count( 'fail' ) } failed, ${ count( 'stop' ) } stopped${ bad.length ? `; first to fix: ${ bad.find( ( r ) => 'fail' === r.status )?.id ?? bad[ 0 ].id }` : '' }`;
}

export async function main( argv, { repo = REPO, makePorts = realPorts, log = console.log, error = console.error, targets = null } = {} ) {
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = argv[ 0 ] && ! argv[ 0 ].startsWith( '--' ) ? argv[ 0 ] : null;
	const site = flag( '--site' );
	if ( ! client || ! site ) {
		error( USAGE );
		return 2;
	}
	try {
		const forced = flag( '--force' )?.split( ',' ) ?? [];
		const unknown = forced.filter( ( id ) => ! STEP_IDS.includes( id ) );
		if ( unknown.length ) {
			error( `--force names ${ unknown.join( ', ' ) }, which ${ 1 === unknown.length ? 'is' : 'are' } not a step (${ STEP_IDS.join( ', ' ) })` );
			return 2;
		}
		const through = flag( '--through' );
		if ( through && ! STEP_IDS.includes( through ) ) {
			error( `--through names ${ through }, which is not a step (${ STEP_IDS.join( ', ' ) })` );
			return 2;
		}
		const all = targets ?? readTargets();
		const plan = argv.includes( '--plan' );
		const file = stateFile( { repo, client, site } );
		const state = readState( file );
		const ports = makePorts( { repo, client, site, target: all[ site ], logDir: path.join( repo, 'sites', client, 'build', 'qa', 'foundation', stamp() ) } );
		const planned = buildSteps( {
			client, site, repo, targets: all, ports, state, log,
			options: { replaceSnapshot: argv.includes( '--replace-snapshot' ), allowMissingPaint: allowMissingPaintArg( argv ), allowUnpicked: argv.includes( '--allow-unpicked' ), picks: flag( '--picks' ) ? path.resolve( flag( '--picks' ) ) : null, plan },
		} );
		const steps = through ? planned.slice( 0, STEP_IDS.indexOf( through ) + 1 ) : planned;
		through && log( `through ${ through }: ${ planned.slice( steps.length ).map( ( x ) => x.id ).join( ', ' ) || 'no step' } left out` );
		const run = await runFoundation( { steps, state, file: plan ? null : file, force: forced, plan, log } );
		log( summaryLine( { client, site, results: run.results, plan } ) );
		return run.ok ? 0 : 1;
	} catch ( e ) {
		error( e.message );
		return 2;
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) ).then( ( code ) => {
		process.exitCode = code;
	} );
}

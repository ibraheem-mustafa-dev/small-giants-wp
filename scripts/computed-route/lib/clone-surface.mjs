// The surface command's logic (clone-surface.mjs): one or more surfaces of a client taken through every stage by site-run.mjs, with
// nothing left to a hand step. A clone goes through by default (Spec 48 section 8), so the command is the whole pass test: it
// succeeds only when each surface's inventory, propose, fill, build, apply and walk stages all ran and passed.
//   - finaliserVerdict: the finaliser picks. A skeleton row the writer is unsure of awaits an agent's pick (intake.mjs --finalise
//     and --apply-picks); a surface with such rows fails the command, naming the next action, unless the run names the allowance
//     `--allow-unpicked` (the rows then go through on the writer's proposal, listed).
//   - siteRunArgs: the one site-run.mjs command line, `--strict`, one job, never `--no-copies`, so a page's template copy is rebuilt
//     with the page and a recorded shell that names a colour the Fill no longer writes is replaced.
//   - timedOutBuilds, mergeRetry: a build that timed out is retried once with `--stages build,apply,walk`, which builds the surface's
//     newest Fill (site-run.mjs::fillOutDir) and does not Fill again; the retry's records replace the failed ones.
//   - surfaceVerdict: every stage of every surface that ran, one line each (`ok`, `skip`, `FAIL`), and whether the pass is clean: a
//     failed stage or a stage that did not run (other than one recorded not applicable) fails it.
//   - prepare: the site settings an account surface's draft needs (clone-surface.mjs::accountStep), set before the run so its walk sees them.
//   - cloneSurfaces: the sequence, with the site-run launch injected (`run`), so tests run no site.
// Solve (solve.mjs) is not a stage here: it reads the committed stage-3 tree named by surfaces.json `tree`, which a site run does not
// write (the run builds Fill's own filled.tree.json), so a Solve after this command would repair a different tree from the one built.
import { allowMissingPaintArgs } from './paint-gate.mjs';
import { needsFinaliser } from './intake-run-finalise.mjs';
import { stageLine, stageProblems } from '../site-run.mjs';

export const SURFACE_STAGES = [ 'inventory', 'propose', 'fill', 'build', 'apply', 'walk' ];
export const RETRY_STAGES = [ 'build', 'apply', 'walk' ];
const TIMEOUT = /time[ -]?out|timed out|ETIMEDOUT/i;

// Whether a stage's failure detail says the stage timed out.
export const isTimeout = ( detail ) => TIMEOUT.test( String( detail ?? '' ) );

// The finaliser check of one surface: { ok, detail, next? }. `intake` is intake.json; `intakeSurface` the surface's skeleton record
// (surfaces.json `intakeSurface`; none for a template copy, which reads no draft). `noIntake` is the surface's row of the manifest's
// noIntake list (lib/manifest-build.mjs::buildManifest), if any: a surface whose draft record matched but which intake holds no
// skeleton for stops here, because its run would build a stock copy in place of the draft; only a surface with no draft record
// passes as a copy.
export function finaliserVerdict( { intake, intakeSurface, client, allowUnpicked = false, noIntake = null } ) {
	if ( ! intakeSurface && noIntake?.record ) {
		return {
			ok: false,
			detail: `the draft record ${ noIntake.record } matches it but intake holds no skeleton for that record, so a copy would stand in for the draft`,
			next: `run node scripts/computed-route/intake.mjs ${ client }, then node scripts/computed-route/manifest.mjs ${ client } --site <site> --only ${ noIntake.key } --apply`,
		};
	}
	if ( ! intakeSurface ) {
		return { ok: true, detail: 'no skeleton of its own (a copy reads no draft)' };
	}
	const rows = intake?.skeletons?.[ intakeSurface ]?.rows ?? [];
	const waiting = rows.filter( needsFinaliser ).length;
	if ( ! waiting ) {
		return { ok: true, detail: 'no row awaits a pick' };
	}
	if ( allowUnpicked ) {
		return { ok: true, detail: `${ waiting } row${ 1 === waiting ? ' goes' : 's go' } through on the writer's proposal (--allow-unpicked)` };
	}
	return {
		ok: false,
		detail: `${ waiting } skeleton row${ 1 === waiting ? ' awaits' : 's await' } an agent pick`,
		next: `run node scripts/computed-route/intake.mjs --finalise ${ client }, dispatch an agent with scripts/computed-route/prompts/skeleton-finaliser.md to write finalise-picks.json, run node scripts/computed-route/intake.mjs --apply-picks ${ client }; or pass --allow-unpicked to go through on the proposals`,
	};
}

// The arguments of the one site-run.mjs command for `keys` (after the script path). Every stage by default; the retry passes
// RETRY_STAGES and `strict: false`, because the stages left out are the earlier run's.
export function siteRunArgs( { client, site, keys, stages = SURFACE_STAGES, strict = true, jobs = 1, allowMissingPaint = [] } ) {
	return [ client, '--site', site, '--only', keys.join( ',' ), '--stages', stages.join( ',' ), '--jobs', String( jobs ), ...( strict ? [ '--strict' ] : [] ), ...allowMissingPaintArgs( allowMissingPaint ) ];
}

// The surfaces whose build failed on a timeout, from a status object (site-run's status.json).
export const timedOutBuilds = ( status ) => Object.entries( status ?? {} ).filter( ( [ , s ] ) => s.build && ! s.build.ok && isTimeout( s.build.detail ) ).map( ( [ key ] ) => key );

// The first run's status with the retry's records laid over it: a stage the retry ran replaces the first run's record, a stage it left out
// (`skipped`) keeps it.
export function mergeRetry( first, retry ) {
	const out = JSON.parse( JSON.stringify( first ?? {} ) );
	for ( const [ key, stages ] of Object.entries( retry ?? {} ) ) {
		for ( const [ stage, record ] of Object.entries( stages ) ) {
			if ( ! record.skipped || ! out[ key ]?.[ stage ] ) {
				( out[ key ] ||= {} )[ stage ] = record;
			}
		}
	}
	return out;
}

// The clean-pass test and the report lines of a merged status. `keys` are the surfaces asked for: each must have a record of every stage in
// SURFACE_STAGES (a surface that stopped at a failed stage fails there; one with no record at all fails here). `runDir` names the folder of the
// stage logs.
export function surfaceVerdict( { status, keys, runDir = null } ) {
	const lines = [];
	const missing = [];
	for ( const [ key, stages ] of Object.entries( status ?? {} ) ) {
		for ( const stage of [ ...SURFACE_STAGES, ...Object.keys( stages ).filter( ( s ) => ! SURFACE_STAGES.includes( s ) ) ] ) {
			const r = stages[ stage ];
			r && lines.push( `${ stageLine( key, stage, r ) }${ r.ok || ! runDir ? '' : ` (log ${ runDir }/${ key }.${ stage }.log)` }` );
		}
	}
	for ( const key of keys ) {
		! status?.[ key ] && missing.push( `${ key }: no stage ran` );
	}
	const { failed, skipped } = stageProblems( status ?? {} );
	return { ok: ! failed.length && ! skipped.length && ! missing.length, lines, failed, skipped, missing };
}

// The whole command. `prepare( { keys } )` (optional) sets the site settings the draft needs before the run and resolves { ok, detail } or null;
// a failure stops the command before the run. `run( args )` launches one site-run.mjs and resolves { status, runDir, error }, `status` being its status.json (null
// when the run stopped before any stage, with `error` the reason). `noIntake` is the manifest's noIntake list for `keys`. Returns { ok, lines, failed, skipped, missing } and logs each line.
export async function cloneSurfaces( { client, site, keys, intake, surfaces, run, noIntake = [], prepare = null, allowMissingPaint = [], allowUnpicked = false, retry = true, jobs = 1, log = console.log } ) {
	const say = ( l ) => log( l );
	const unknown = keys.filter( ( k ) => ! Object.hasOwn( surfaces, k ) );
	if ( unknown.length ) {
		say( `FAIL ${ unknown.join( ', ' ) } - not in surfaces.json (known: ${ Object.keys( surfaces ).join( ', ' ) })` );
		return { ok: false, lines: [], failed: unknown.map( ( k ) => `${ k }: not in surfaces.json` ), skipped: [], missing: [] };
	}
	const picks = keys.map( ( key ) => ( { key, ...finaliserVerdict( { intake, intakeSurface: surfaces[ key ].intakeSurface, client, allowUnpicked, noIntake: noIntake.find( ( n ) => n.key === key ) ?? null } ) } ) );
	picks.forEach( ( p ) => say( p.ok ? `ok   ${ p.key } finalise - ${ p.detail }` : `FAIL ${ p.key } finalise - ${ p.detail }; next: ${ p.next }` ) );
	if ( picks.some( ( p ) => ! p.ok ) ) {
		return { ok: false, lines: [], failed: picks.filter( ( p ) => ! p.ok ).map( ( p ) => `${ p.key } finalise: ${ p.detail }` ), skipped: [], missing: [] };
	}
	// The site settings a surface's draft needs before its run (the account page's registration options): { ok, detail } or null when none applies.
	const prepared = prepare ? await prepare( { keys } ) : null;
	prepared && say( `${ prepared.ok ? 'ok  ' : 'FAIL' } ${ keys.join( ', ' ) } prepare - ${ prepared.detail }` );
	if ( prepared && ! prepared.ok ) {
		return { ok: false, lines: [], failed: [ `prepare: ${ prepared.detail }` ], skipped: [], missing: [] };
	}
	const first = await run( siteRunArgs( { client, site, keys, jobs, allowMissingPaint } ) );
	if ( ! first.status ) {
		say( `FAIL ${ keys.join( ', ' ) } run - site-run stopped before any stage: ${ first.error ?? 'no status.json was written' }` );
		return { ok: false, lines: [], failed: [ `run: ${ first.error ?? 'no status.json' }` ], skipped: [], missing: [] };
	}
	let status = first.status;
	let runDir = first.runDir;
	const late = retry ? timedOutBuilds( status ) : [];
	if ( late.length ) {
		say( `retry ${ late.join( ', ' ) } - the build timed out; building the newest Fill again with --stages ${ RETRY_STAGES.join( ',' ) }` );
		const again = await run( siteRunArgs( { client, site, keys: late, stages: RETRY_STAGES, strict: false, jobs, allowMissingPaint } ) );
		if ( again.status ) {
			status = mergeRetry( status, again.status );
			runDir = again.runDir ?? runDir;
		}
	}
	const verdict = surfaceVerdict( { status, keys, runDir } );
	verdict.lines.forEach( say );
	say( verdict.ok
		? `clone-surface ${ client } on ${ site }: ${ keys.join( ', ' ) } - every stage ran and passed`
		: `clone-surface ${ client } on ${ site }: not clean - ${ [ ...verdict.failed.map( ( l ) => `failed: ${ l }` ), ...verdict.skipped.map( ( l ) => `not run: ${ l }` ), ...verdict.missing ].join( '; ' ) }` );
	return verdict;
}

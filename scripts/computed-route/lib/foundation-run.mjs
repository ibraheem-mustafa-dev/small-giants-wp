// The foundation command's sequencer (build-foundation.mjs): its steps run in order, each reporting one line, a step that already holds a
// current result is skipped, and the run stops at the first failure a later step depends on.
// A step is { id, deps, applicable(), holds(), run(), fingerprint() }, every one optional but `id` and `run`:
//   - applicable() returns a reason when the step has nothing to do by design (a local copy takes its snapshot with the sync, a hosted site is
//     deployed by build-deploy.py), else null; the step is then `skip` and a dependency on it is satisfied.
//   - holds() returns a reason when the step's result is already current (its outputs exist for these inputs, or the state records say nothing
//     it reads has changed since it last succeeded), else null; the step is then `skip`. `--force` runs a step whatever holds() says.
//   - run() does the work and resolves a one-line detail; a throw is the failure, and an error's `next` names what to do about it.
//   - always: true makes the step run even under `plan` (the preflight, whose plan-mode checks probe nothing).
//   - fingerprint() is a string of the step's inputs and outputs after it ran, recorded in the state file with the detail (and what record()
//     returns); heldByState says whether a record still matches it.
// A run's report is one line per step: `ok   <id> <seconds>s - <detail>`, `skip <id> - <reason>`, `FAIL <id> <seconds>s - <detail>; next: <action>`
// and `stop <id> - depends on <step>, which failed` (or `did not run`). With `plan` a step that would run prints `plan <id> - would run: <title>`
// and runs nothing. runFoundation resolves { ok, results }; ok is false when any step failed or stopped.
import fs from 'fs';
import path from 'path';

// The state of one client on one site: { steps: { <id>: { at, after, detail } } }, kept in a gitignored file.
export const stateFile = ( { repo, client, site } ) => path.join( repo, 'sites', client, 'build', 'foundation', `${ site }.json` );

export function readState( file ) {
	if ( ! fs.existsSync( file ) ) {
		return { steps: {} };
	}
	try {
		const state = JSON.parse( fs.readFileSync( file, 'utf8' ) );
		return state && 'object' === typeof state && state.steps ? state : { steps: {} };
	} catch {
		return { steps: {} };
	}
}

export function writeState( file, state ) {
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( state, null, 2 ) }\n` );
}

// Whether the state record of step `id` still matches `fingerprint`: the step succeeded and nothing it reads or wrote has changed since.
export const heldByState = ( state, id, fingerprint ) => Boolean( fingerprint ) && state.steps?.[ id ]?.after === fingerprint;

// The printed line of one result.
export function resultLine( r ) {
	if ( 'skip' === r.status || 'plan' === r.status ) {
		return `${ r.status } ${ r.id } - ${ r.reason }`;
	}
	if ( 'stop' === r.status ) {
		return `stop ${ r.id } - depends on ${ r.dependsOn }, which ${ r.dependsOnStatus }`;
	}
	const head = `${ 'ok' === r.status ? 'ok  ' : 'FAIL' } ${ r.id } ${ r.seconds }s`;
	return 'ok' === r.status ? `${ head }${ r.detail ? ` - ${ r.detail }` : '' }` : `${ head } - ${ r.detail }${ r.next ? `; next: ${ r.next }` : '' }`;
}

// Runs `steps` in order. `state` is read with readState and written (to `file`, when given) after each success. `force` lists the ids that run
// whatever holds() says. `plan: true` runs nothing: each line says what the step would do (`would run`) or why it would not. `log` receives each line.
export async function runFoundation( { steps, state = { steps: {} }, file = null, force = [], plan = false, log = console.log, now = () => Date.now(), stamp = () => new Date().toISOString() } ) {
	const results = [];
	const failed = new Map();
	const say = ( r ) => {
		results.push( r );
		log( resultLine( r ) );
	};
	for ( const step of steps ) {
		const blocker = ( step.deps ?? [] ).find( ( d ) => failed.has( d ) );
		if ( blocker ) {
			failed.set( step.id, 'stop' );
			say( { id: step.id, status: 'stop', dependsOn: blocker, dependsOnStatus: 'stop' === failed.get( blocker ) ? 'did not run' : 'failed' } );
			continue;
		}
		const na = step.applicable?.() ?? null;
		if ( na ) {
			say( { id: step.id, status: 'skip', reason: na, notApplicable: true } );
			continue;
		}
		const held = force.includes( step.id ) ? null : await step.holds?.() ?? null;
		if ( held ) {
			say( { id: step.id, status: 'skip', reason: held } );
			continue;
		}
		if ( plan && ! step.always ) {
			say( { id: step.id, status: 'plan', reason: `would run${ force.includes( step.id ) ? ' (--force)' : '' }: ${ step.title ?? step.id }` } );
			continue;
		}
		const t = now();
		try {
			const detail = await step.run();
			const record = { id: step.id, status: 'ok', seconds: Math.round( ( now() - t ) / 1000 ), detail: detail ?? '' };
			state.steps[ step.id ] = { at: stamp(), after: await step.fingerprint?.() ?? null, detail: record.detail, ...( step.record?.() ?? {} ) };
			file && writeState( file, state );
			say( record );
		} catch ( e ) {
			failed.set( step.id, 'failed' );
			say( { id: step.id, status: 'fail', seconds: Math.round( ( now() - t ) / 1000 ), detail: String( e.message ?? e ).slice( 0, 700 ), next: e.next ?? null } );
		}
	}
	return { ok: ! results.some( ( r ) => [ 'fail', 'stop' ].includes( r.status ) ), results };
}

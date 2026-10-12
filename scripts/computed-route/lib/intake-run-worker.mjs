// The intake command's secret-free worker (Spec 48 FR-48-23, FR-48-17): started by lib/intake-run.mjs through
// lib/intake-process.mjs::runIsolated with an allowlisted environment, it refuses to start when any secret variable is
// present, then runs every browser stage (lib/intake-run-stages.mjs) and writes their results as JSON for the parent to
// assemble, validate and write. Every stage's `blocked` list (each sandbox's aborted requests) is gathered as it ends
// (the replay top-up reads them) and merged into the result's `blocked` (lib/intake-run-collapse.mjs::mergeBlocked). Progress lines go to the job's progress file, which the parent echoes live.
// Usage (internal): node lib/intake-run-worker.mjs <job.json>
import fs from 'fs';
import { createRequire } from 'module';
import { assertSecretFree } from './intake-process.mjs';
import { harnessSettings } from './intake-harness.mjs';
import { STAGES } from './intake-run-stages.mjs';
import { mergeBlocked } from './intake-run-collapse.mjs';

assertSecretFree();

const secs = ( ms ) => `${ ( ms / 1000 ).toFixed( 1 ) }s`;

async function main( jobFile ) {
	const job = JSON.parse( fs.readFileSync( jobFile, 'utf8' ) );
	const log = ( line ) => fs.appendFileSync( job.progressFile, `${ line }\n` );
	const ctx = { gaps: [], blocked: [] };
	const parts = {};
	const timings = [];
	for ( const [ name, run ] of STAGES ) {
		const t0 = Date.now();
		log( `${ name }: started` );
		try {
			const out = ( await run( job, ctx, log ) ) || {};
			const { gaps = [], note = '', ...rest } = out;
			Object.assign( ctx, 'routing' === name ? { routing: rest.routing } : {} );
			parts[ name ] = rest;
			ctx.blocked.push( ...( rest.blocked || [] ) );
			gaps.forEach( ( g ) => ctx.gaps.push( { ...g, draftId: String( g.draftId ?? '' ), error: String( g.error ?? '' ), stage: name } ) );
			timings.push( { stage: name, ms: Date.now() - t0, gaps: gaps.length, note } );
			log( `${ name }: done in ${ secs( Date.now() - t0 ) }; ${ gaps.length } gap row(s)${ note ? `; ${ note }` : '' }` );
		} catch ( e ) {
			const error = ( e?.message || String( e ) ).split( '\n' ).slice( 0, 3 ).join( ' ' );
			ctx.gaps.push( { construct: `stage:${ name }`, draftId: job.entry, error, stage: name } );
			timings.push( { stage: name, ms: Date.now() - t0, gaps: 1, failed: error } );
			log( `${ name }: FAILED in ${ secs( Date.now() - t0 ) }: ${ error }` );
		}
	}
	const require = createRequire( import.meta.url );
	const result = {
		tools: { playwright: require( 'playwright/package.json' ).version, browser: parts.replay?.browser ?? 'not launched (the replay stage failed)', runtime: `support.js sha256 ${ job.runtimeSha }` },
		harness: harnessSettings( {} ),
		parts, gaps: ctx.gaps, timings, blocked: mergeBlocked( ctx.blocked ),
	};
	fs.writeFileSync( job.outFile, JSON.stringify( result ) );
}

main( process.argv[ 2 ] ).catch( ( e ) => {
	process.stderr.write( `${ e?.stack || e }\n` );
	process.exit( 1 );
} );

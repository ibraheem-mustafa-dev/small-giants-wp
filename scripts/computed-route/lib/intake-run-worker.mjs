// The intake command's secret-free worker (Spec 48 FR-48-23, FR-48-17): started by lib/intake-run.mjs through
// lib/intake-process.mjs::runIsolated with an allowlisted environment, it refuses to start when any secret variable is
// present, then runs every browser stage (lib/intake-run-stages.mjs) and writes their results as JSON for the parent to
// assemble, validate and write. Every stage's `blocked` list (each sandbox's aborted requests) is gathered as it ends
// (the replay top-up reads them) and merged into the result's `blocked` (lib/intake-run-collapse.mjs::mergeBlocked). Progress lines go to the job's progress file, which the parent echoes live.
//
// With a browser-unit pool above 1 (INTAKE_POOL, lib/intake-pool.mjs) stages run side by side: each starts once the
// stages it needs have ended (STAGE_NEEDS: the earlier stages whose context fields it reads), so the palette reads run
// beside the census and the skeletons beside the draft defects. Every stage's parts, gap rows, blocked requests and
// timing are still applied strictly in STAGES order, each once it and every stage before it have ended, so the result is
// the one-at-a-time run's. A stage that opens a browser outside the pool (SLOT_STAGES) holds one pool slot meanwhile.
// INTAKE_POOL=1 runs the stages one after another.
// Usage (internal): node lib/intake-run-worker.mjs <job.json>
import fs from 'fs';
import { createRequire } from 'module';
import { assertSecretFree } from './intake-process.mjs';
import { harnessSettings } from './intake-harness.mjs';
import { STAGES, STAGE_NEEDS, SLOT_STAGES } from './intake-run-stages.mjs';
import { mergeBlocked } from './intake-run-collapse.mjs';
import { poolSize, withSlot } from './intake-pool.mjs';

assertSecretFree();

const secs = ( ms ) => `${ ( ms / 1000 ).toFixed( 1 ) }s`;

async function main( jobFile ) {
	const job = JSON.parse( fs.readFileSync( jobFile, 'utf8' ) );
	const log = ( line ) => fs.appendFileSync( job.progressFile, `${ line }\n` );
	const ctx = { gaps: [], blocked: [] };
	const parts = {};
	const timings = [];
	const side = poolSize() > 1;
	// One stage run: { ms, out } or { ms, error }. The routing stage's routes go into the context as soon as it ends.
	const attempt = async ( name, run ) => {
		const t0 = Date.now();
		log( `${ name }: started` );
		try {
			const go = () => run( job, ctx, log );
			const out = ( await ( side && SLOT_STAGES.includes( name ) ? withSlot( go ) : go() ) ) || {};
			if ( 'routing' === name ) {
				ctx.routing = out.routing;
			}
			return { ms: Date.now() - t0, out };
		} catch ( error ) {
			return { ms: Date.now() - t0, error };
		}
	};
	// A stage's result applied to the record: its parts, gap rows (each with its stage), blocked requests and timing.
	const apply = ( name, r ) => {
		let failure = r.error;
		if ( ! failure ) {
			try {
				const { gaps = [], note = '', ...rest } = r.out;
				parts[ name ] = rest;
				ctx.blocked.push( ...( rest.blocked || [] ) );
				gaps.forEach( ( g ) => ctx.gaps.push( { ...g, draftId: String( g.draftId ?? '' ), error: String( g.error ?? '' ), stage: name } ) );
				timings.push( { stage: name, ms: r.ms, gaps: gaps.length, note } );
				log( `${ name }: done in ${ secs( r.ms ) }; ${ gaps.length } gap row(s)${ note ? `; ${ note }` : '' }` );
				return;
			} catch ( e ) {
				failure = e;
			}
		}
		const error = ( failure?.message || String( failure ) ).split( '\n' ).slice( 0, 3 ).join( ' ' );
		ctx.gaps.push( { construct: `stage:${ name }`, draftId: job.entry, error, stage: name } );
		timings.push( { stage: name, ms: r.ms, gaps: 1, failed: error } );
		log( `${ name }: FAILED in ${ secs( r.ms ) }: ${ error }` );
	};
	if ( side ) {
		const ended = new Map();
		const applied = new Map();
		let cursor = Promise.resolve();
		for ( const [ i, [ name, run ] ] of STAGES.entries() ) {
			const needs = STAGE_NEEDS[ name ] ?? [ '*' ];
			const before = STAGES.slice( 0, i ).map( ( [ n ] ) => n );
			const ready = needs.includes( '*' ) ? Promise.all( before.map( ( n ) => applied.get( n ) ) ) : Promise.all( needs.map( ( n ) => ended.get( n ) ) );
			const result = ready.then( () => attempt( name, run ) );
			ended.set( name, result );
			cursor = cursor.then( () => result ).then( ( r ) => apply( name, r ) );
			applied.set( name, cursor );
		}
		await cursor;
	} else {
		for ( const [ name, run ] of STAGES ) {
			apply( name, await attempt( name, run ) );
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

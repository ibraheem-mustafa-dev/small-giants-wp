// The flow result shape, the per-flow JSON writer, the flows-only table and the shared command-line entry
// (Spec 47 FR-47-7). Flow results are kept apart from parity rows on purpose: they are written under
// sites/eye-care-ward-end/build/qa/flows/<timestamp>/<flow>.json and never into a walker report, solve-report.json
// or triage.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, baseUrl, launch, freshContext } from './browser.mjs';

export const STATUS = Object.freeze( { PASS: 'pass', FAIL: 'fail', ERROR: 'error' } );

// A flow module exports `meta` (name, precondition, expected, failureSignals, optional knownFailure) and
// `run( { page, base, note } )`, which returns { status, signal, detail, evidence }. A flow that cannot reach a state
// it needs throws; execute() records that as ERROR, never as a pass or a fail, because it proves nothing either way.
export async function execute( flow, { page, base, now = () => Date.now() } ) {
	const startedAt = new Date( now() ).toISOString();
	const t0 = now();
	const steps = [];
	const note = ( name, data = {} ) => steps.push( { at: now() - t0, name, ...data } );
	let outcome;
	try {
		outcome = await flow.run( { page, base, note } );
	} catch ( err ) {
		outcome = { status: STATUS.ERROR, signal: 'flow-error', detail: String( err && err.message ? err.message : err ), evidence: {} };
	}
	const failed = outcome.status === STATUS.FAIL;
	return {
		flow: flow.meta.name,
		status: outcome.status,
		signal: outcome.signal ?? null,
		detail: outcome.detail ?? null,
		// Printed only when the flow fails, so whoever runs it is not misled by a failure that is already documented.
		knownFailure: failed && flow.meta.knownFailure ? flow.meta.knownFailure : null,
		precondition: flow.meta.precondition,
		expected: flow.meta.expected,
		failureSignals: flow.meta.failureSignals,
		baseUrl: base,
		startedAt,
		durationMs: now() - t0,
		steps,
		evidence: outcome.evidence ?? {},
	};
}

export function flowsOutRoot( env = process.env ) {
	return env.SGS_FLOWS_OUT || path.join( REPO_ROOT, 'sites', 'eye-care-ward-end', 'build', 'qa', 'flows' );
}

export function stamp( d = new Date() ) {
	return d.toISOString().replace( /\.\d+Z$/, '' ).replace( /:/g, '-' );
}

export function writeFlowResult( result, dir ) {
	fs.mkdirSync( dir, { recursive: true } );
	const file = path.join( dir, `${ result.flow }.json` );
	fs.writeFileSync( file, JSON.stringify( result, null, '\t' ) + '\n' );
	return file;
}

// The flows-only table. One row per flow; a failing row carries its signal, a known failure its explanation.
export function formatTable( results ) {
	const rows = results.map( ( r ) => [ r.flow, r.status.toUpperCase(), r.signal ?? '-', r.detail ?? '' ] );
	const head = [ 'flow', 'status', 'signal', 'detail' ];
	const w = head.map( ( h, i ) => Math.max( h.length, ...rows.map( ( r ) => String( r[ i ] ).length ) ) );
	const line = ( r ) => r.map( ( c, i ) => String( c ).padEnd( w[ i ] ) ).join( '  ' ).trimEnd();
	const out = [ line( head ), line( w.map( ( n ) => '-'.repeat( n ) ) ), ...rows.map( line ) ];
	for ( const r of results ) {
		if ( r.knownFailure ) {
			out.push( '', `note (${ r.flow }): ${ r.knownFailure }` );
		}
	}
	return out.join( '\n' );
}

// 0 when every flow passed, 1 when any failed, 2 when any could not run (an error is never read as a pass).
export function exitCodeFor( results ) {
	if ( results.some( ( r ) => r.status === STATUS.ERROR ) ) {
		return 2;
	}
	return results.some( ( r ) => r.status === STATUS.FAIL ) ? 1 : 0;
}

export function parseArgs( argv ) {
	const out = {};
	for ( let i = 0; i < argv.length; i++ ) {
		if ( argv[ i ].startsWith( '--' ) ) {
			out[ argv[ i ].slice( 2 ) ] = argv[ i + 1 ] && ! argv[ i + 1 ].startsWith( '--' ) ? argv[ ++i ] : true;
		}
	}
	return out;
}

// Runs one flow in its own browser and context, writes its JSON and prints the table. Used by each flow script and
// by run-all.mjs (which passes `dir` so every flow of one run lands in the same timestamped folder).
export async function runOne( flow, { base, dir, headed, quiet } = {} ) {
	const browser = await launch( { headed } );
	try {
		const { context, page } = await freshContext( browser );
		const result = await execute( flow, { page, base } );
		await context.close();
		result.file = writeFlowResult( result, dir );
		if ( ! quiet ) {
			console.log( formatTable( [ result ] ) );
			console.log( `\nwritten: ${ result.file }` );
		}
		return result;
	} finally {
		await browser.close();
	}
}

// The body of every flow script's `if run directly` block.
export async function main( flow, argv = process.argv.slice( 2 ) ) {
	const args = parseArgs( argv );
	const base = baseUrl( { arg: typeof args.base === 'string' ? args.base : undefined } );
	const dir = path.join( flowsOutRoot(), typeof args.stamp === 'string' ? args.stamp : stamp() );
	const result = await runOne( flow, { base, dir } );
	process.exitCode = exitCodeFor( [ result ] );
}

export function isDirectRun( metaUrl ) {
	return !! process.argv[ 1 ] && metaUrl === pathToFileURL( path.resolve( process.argv[ 1 ] ) ).href;
}

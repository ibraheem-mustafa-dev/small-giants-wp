// Runs the four functional flows in order against one site (Spec 47 FR-47-7).
//
//   node scripts/parity/flows/run-all.mjs [--base <url>] [--only bag-two-products,filter-apply-clear] [--stamp <ts>]
//
// Base URL: --base, else SGS_FLOW_BASE_URL, else WP_URL_EYECARETEST from .claude/secrets/eye-care-test.env.
// SGS_HEADED=1 shows the browser. Each flow gets its own browser and fresh context. At least 31 s is left between
// flows so the per-fingerprint cooldown (30 s) and the per-variation limit window (30 s) of the shop's add-to-bag
// route can never turn one flow's add into another flow's false failure. Results go to
// sites/eye-care-ward-end/build/qa/flows/<timestamp>/<flow>.json plus a flows-only table; nothing is written into
// walker reports, solve-report.json or triage. Exit code: 0 all passed, 1 a flow failed, 2 a flow could not run.
import path from 'node:path';
import { baseUrl } from './lib/browser.mjs';
import { runOne, flowsOutRoot, stamp, formatTable, exitCodeFor, parseArgs, writeFlowResult, isDirectRun } from './lib/flow.mjs';
import * as twoProducts from './bag-two-products.mjs';
import * as secondUnit from './bag-second-unit.mjs';
import * as lensSkip from './lens-skip-to-bag.mjs';
import * as filters from './filter-apply-clear.mjs';

export const MIN_GAP_MS = 31000;
export const FLOWS = [ twoProducts, secondUnit, lensSkip, filters ];

const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

// `gapMs` is clamped up to MIN_GAP_MS unless `allowShortGap` is set, which only the mock-shop tests do (the mock
// has no real cooldown clock to respect between flows; every flow there uses its own fresh cookie).
export async function runAll( { base, dir, flows = FLOWS, gapMs = MIN_GAP_MS, allowShortGap = false, wait = sleep, quiet = false } ) {
	const gap = allowShortGap ? gapMs : Math.max( gapMs, MIN_GAP_MS );
	const results = [];
	for ( let i = 0; i < flows.length; i++ ) {
		if ( i > 0 ) {
			if ( ! quiet ) {
				console.log( `\nwaiting ${ gap / 1000 } s so the add-to-bag cooldown windows clear...` );
			}
			await wait( gap );
		}
		if ( ! quiet ) {
			console.log( `\n== ${ flows[ i ].meta.name } ==` );
		}
		results.push( await runOne( flows[ i ], { base, dir, quiet } ) );
	}
	writeFlowResult( { flow: '_summary', status: exitCodeFor( results ) === 0 ? 'pass' : 'fail', results: results.map( ( r ) => ( { flow: r.flow, status: r.status, signal: r.signal } ) ) }, dir );
	return results;
}

if ( isDirectRun( import.meta.url ) ) {
	const args = parseArgs( process.argv.slice( 2 ) );
	const only = typeof args.only === 'string' ? args.only.split( ',' ) : null;
	const flows = only ? FLOWS.filter( ( f ) => only.includes( f.meta.name ) ) : FLOWS;
	if ( ! flows.length ) {
		throw new Error( `--only matched no flow; names: ${ FLOWS.map( ( f ) => f.meta.name ).join( ', ' ) }` );
	}
	const base = baseUrl( { arg: typeof args.base === 'string' ? args.base : undefined } );
	const dir = path.join( flowsOutRoot(), typeof args.stamp === 'string' ? args.stamp : stamp() );
	const results = await runAll( { base, dir, flows } );
	console.log( '\n' + formatTable( results ) + `\n\nwritten: ${ dir }` );
	process.exitCode = exitCodeFor( results );
}

#!/usr/bin/env node
// Try-before-write replay (Spec 47 route-accuracy R6).
//   node scripts/computed-route/trial.mjs --client <slug> --surface <s> --run <solve run dir> [--round 1]
//     [--site <calibration target>] [--widths 375,768,1440] [--out <dir>]
// Takes one round's writes from a Solve run's solve-report.json and tries each (one setting on one block) in the open
// live page of --site (default the surface's own site) before anything is saved (lib/trial-run.mjs::openTrial, the
// same step Solve runs between a write round and the rebuild): the block rendered with the attributes saved on the
// surface's post and with the write, the self-check, the CSS difference applied on the live uid, the pairs in and after
// the block measured at every width against the run's draft cache, the change undone. Writes, into --out (default
// <run>/trial-round-<n>): trial.json, trial.md and writes-kept.json ({ writes, wrong: [] }, the writes the trial kept,
// in solve-report form so answer-sheet.mjs --solve scores them). Nothing on any site is changed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { retargetLive } from '../parity/lib/helpers.mjs';
import { candidatesOf } from './lib/trial.mjs';
import { readEnv } from './lib/trial-page.mjs';
import { openTrial, draftBoxes } from './lib/trial-run.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = flag( '--client' );
	const surface = flag( '--surface' );
	const runDir = path.resolve( REPO, flag( '--run' ) || '' );
	const round = Number( flag( '--round' ) || 1 );
	const widths = ( flag( '--widths' ) || '375,768,1440' ).split( ',' ).map( Number );
	const outDir = path.resolve( REPO, flag( '--out' ) || path.join( runDir, `trial-round-${ round }` ) );
	const buildDir = path.join( REPO, 'sites', client, 'build' );
	const s = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) )[ surface ];
	const target = flag( '--site' ) ? JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) )[ flag( '--site' ) ] : { envFile: s.envFile, envKey: s.envKey };
	const origin = readEnv( path.join( REPO, target.envFile ) )[ `WP_URL_${ target.envKey }` ].replace( /\/+$/, '' );
	const walkerCfg = retargetLive( ( await import( pathToFileURL( path.join( buildDir, s.walkerFull || s.walker ) ).href ) ).default, origin );
	const report = JSON.parse( fs.readFileSync( path.join( runDir, 'solve-report.json' ), 'utf8' ) );
	const trial = await openTrial( { envFile: target.envFile, envKey: target.envKey, walkerCfg, target: s.target } );
	let results;
	try {
		results = await trial.round( candidatesOf( report.writes || [], round ), draftBoxes( runDir, widths ), widths );
	} finally {
		await trial.close();
	}
	fs.mkdirSync( outDir, { recursive: true } );
	// A write the trial could not judge (no box moved, a rebuild needed, an error) is kept: the rebuild and walk decide
	// it, as in Solve. Only a reject is dropped.
	const rejected = new Set( results.filter( ( r ) => 'reject' === r.verdict ).map( ( r ) => `${ r.ref }|${ r.attr }` ) );
	const writesKept = ( report.writes || [] ).filter( ( w ) => w.round !== round || ! rejected.has( `${ w.ref }|${ w.attr }` ) );
	fs.writeFileSync( path.join( outDir, 'trial.json' ), JSON.stringify( { run: path.relative( REPO, runDir ), round, widths, results }, null, 1 ) );
	fs.writeFileSync( path.join( outDir, 'writes-kept.json' ), JSON.stringify( { writes: writesKept, wrong: [] }, null, 1 ) );
	const count = ( v ) => results.filter( ( r ) => r.verdict === v ).length;
	fs.writeFileSync( path.join( outDir, 'trial.md' ), [ `# Trial: ${ surface } round ${ round }`, '', `${ results.length } writes: keep ${ count( 'keep' ) }, reject ${ count( 'reject' ) }, no box change ${ count( 'no-box-change' ) }, needs a rebuild ${ count( 'needs-rebuild' ) }, same CSS ${ count( 'no-css' ) }, error ${ count( 'error' ) }.`, '', '| Ref | Setting | Verdict | Delta px | Worse | Why |', '|---|---|---|---|---|---|', ...results.map( ( r ) => `| ${ r.ref } | ${ r.attr } | ${ r.verdict } | ${ r.delta ?? '' } | ${ ( r.worse || [] ).map( ( x ) => `${ x.pair }@${ x.width } +${ x.by }` ).join( ', ' ) } | ${ r.why || '' } |` ), '' ].join( '\n' ) );
	// A trial that left the live page changed makes every later verdict suspect: the replay says so and fails.
	const dirty = results.filter( ( r ) => false === r.restored );
	dirty.length && console.error( `[FAIL] the live page was not restored after ${ dirty.map( ( r ) => `${ r.ref } ${ r.attr }` ).join( ', ' ) }: the verdicts after it are not trusted` );
	process.exitCode = dirty.length ? 1 : 0;
	console.log( `trial ${ surface }: keep ${ count( 'keep' ) }, reject ${ count( 'reject' ) }, no box change ${ count( 'no-box-change' ) }, rebuild ${ count( 'needs-rebuild' ) }, same CSS ${ count( 'no-css' ) }, error ${ count( 'error' ) }. ${ path.relative( REPO, outDir ) }` );
}

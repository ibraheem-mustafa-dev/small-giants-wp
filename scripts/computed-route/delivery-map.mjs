#!/usr/bin/env node
// Checks a client's delivery map against its intake review, handoff animations and surfaces, the plan the map names and
// the coverage map (lib/delivery-map.mjs::mapProblems). A done animation key needs live evidence: the effect layers and
// settings in the client's built trees (sites/<client>/build/trees), or a walker effect row (kind `effect`) in a report
// given with --walk.
//   node scripts/computed-route/delivery-map.mjs <client> --check [--walk <report.json>]...
//                                                                   exit 0 when right, 1 naming each problem, 2 usage
//   node scripts/computed-route/delivery-map.mjs <client> --status  the same check, then open keys per unit and the
//                                                                    done and accepted counts
import fs from 'fs';
import path from 'path';
import { REPO } from './lib/capabilities.mjs';
import { loadCoverage } from './lib/clone-coverage.mjs';
import { animationEvidence, clientTrees, commitExists, expectedKeys, mapPath, mapProblems, planUnits, treeFacts, walkerEffectRows } from './lib/delivery-map.mjs';

const [ client, mode, ...rest ] = process.argv.slice( 2 );
if ( ! client || ! [ '--check', '--status' ].includes( mode ) ) {
	console.error( 'usage: node delivery-map.mjs <client> --check | --status [--walk <report.json>]...' );
	process.exit( 2 );
}
const file = mapPath( client );
if ( ! fs.existsSync( file ) ) {
	console.error( `${ path.relative( REPO, file ) } does not exist` );
	process.exit( 1 );
}
const raw = fs.readFileSync( file, 'utf8' );
let map;
try {
	map = JSON.parse( raw );
} catch ( e ) {
	console.error( `the map is not valid JSON: ${ e.message }` );
	process.exit( 1 );
}
if ( ! map || 'object' !== typeof map || Array.isArray( map ) ) {
	console.error( 'the map is not a JSON object' );
	process.exit( 1 );
}
const plan = 'string' === typeof map.plan ? path.join( REPO, map.plan ) : '';
if ( ! plan || ! fs.existsSync( plan ) ) {
	console.error( `the map's "plan" (${ map.plan }) is not a file in the repo` );
	process.exit( 1 );
}
const units = planUnits( fs.readFileSync( plan, 'utf8' ) );
const keys = map.keys || {};
const walkRows = rest.flatMap( ( a, i ) => ( '--walk' === a ? [ rest[ i + 1 ] ] : [] ) ).flatMap( ( f ) => walkerEffectRows( JSON.parse( fs.readFileSync( f, 'utf8' ) ) ) );
const facts = treeFacts( clientTrees( client ) );
const records = new Map( ( fs.existsSync( path.join( REPO, 'sites', client, 'handoff', 'animations.json' ) ) ? JSON.parse( fs.readFileSync( path.join( REPO, 'sites', client, 'handoff', 'animations.json' ), 'utf8' ) ).records || [] : [] ).map( ( r ) => [ `animation:${ r.id }`, r ] ) );
const evidenceFor = ( k ) => ( records.has( k ) ? animationEvidence( records.get( k ), facts, walkRows ) : { ok: false, why: 'the handoff animations.json has no record of it' } );
const problems = mapProblems( { raw, expected: expectedKeys( client ), units, coverage: loadCoverage(), hasCommit: ( h ) => commitExists( h ), evidenceFor } );
for ( const p of problems ) {
	console.log( p );
}
if ( problems.length ) {
	console.log( `${ problems.length } problem(s)` );
	process.exit( 1 );
}
if ( '--check' === mode ) {
	console.log( `delivery map OK (${ Object.keys( keys ).length } keys)` );
	process.exit( 0 );
}
const open = {};
let done = 0;
let accepted = 0;
for ( const v of Object.values( keys ) ) {
	if ( 'string' === typeof v ) {
		open[ v ] = ( open[ v ] || 0 ) + 1;
	} else if ( 'done' in v ) {
		done++;
	} else {
		accepted++;
	}
}
for ( const [ u, n ] of Object.entries( open ).sort() ) {
	console.log( `${ u }: ${ n } open` );
}
console.log( `done ${ done }, accepted ${ accepted }` );

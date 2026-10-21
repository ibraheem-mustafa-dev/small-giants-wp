#!/usr/bin/env node
// Checks a client's delivery map against its intake review, handoff animations and surfaces, the plan the map names and
// the coverage map (lib/delivery-map.mjs::mapProblems).
//   node scripts/computed-route/delivery-map.mjs <client> --check   exit 0 when right, 1 naming each problem, 2 usage
//   node scripts/computed-route/delivery-map.mjs <client> --status  open keys per unit, then done and accepted counts
import fs from 'fs';
import path from 'path';
import { REPO } from './lib/capabilities.mjs';
import { loadCoverage } from './lib/clone-coverage.mjs';
import { commitExists, expectedKeys, mapPath, mapProblems, planUnits } from './lib/delivery-map.mjs';

const [ client, mode ] = process.argv.slice( 2 );
if ( ! client || ! [ '--check', '--status' ].includes( mode ) ) {
	console.error( 'usage: node delivery-map.mjs <client> --check | --status' );
	process.exit( 2 );
}
const file = mapPath( client );
if ( ! fs.existsSync( file ) ) {
	console.error( `${ path.relative( REPO, file ) } does not exist` );
	process.exit( 1 );
}
const raw = fs.readFileSync( file, 'utf8' );
const map = JSON.parse( raw );
const plan = path.join( REPO, map.plan || '' );
if ( ! map.plan || ! fs.existsSync( plan ) ) {
	console.error( `the map's "plan" (${ map.plan }) is not a file in the repo` );
	process.exit( 1 );
}
const units = planUnits( fs.readFileSync( plan, 'utf8' ) );
if ( '--check' === mode ) {
	const problems = mapProblems( { raw, expected: expectedKeys( client ), units, coverage: loadCoverage(), hasCommit: ( h ) => commitExists( h ) } );
	for ( const p of problems ) {
		console.log( p );
	}
	console.log( problems.length ? `${ problems.length } problem(s)` : `delivery map OK (${ Object.keys( map.keys ).length } keys)` );
	process.exit( problems.length ? 1 : 0 );
}
const open = {};
let done = 0;
let accepted = 0;
for ( const v of Object.values( map.keys ) ) {
	if ( 'string' === typeof v ) {
		open[ v ] = ( open[ v ] || 0 ) + 1;
	} else if ( v.done ) {
		done++;
	} else {
		accepted++;
	}
}
for ( const [ u, n ] of Object.entries( open ).sort() ) {
	console.log( `${ u }: ${ n } open` );
}
console.log( `done ${ done }, accepted ${ accepted }` );

// The applier writes a draft element to a saved block only when it is the element the run that saved the post recorded for it
// (lib/apply-targets.mjs::pairsReport, lib/apply-origin-gate.mjs). The fixture is a real origin file; the stale pairs file is what a
// reclone leaves behind: the same refs, each naming the element the origin gives the ref two places later (the proof's careers surface:
// the pairs file mapped `-11` to the element the origin gives `-13`, so a 720px wrapper's width was written onto a 1240px band).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pairsReport } from '../lib/apply-targets.mjs';
import { staleRecordProblems, targetsOffOrigin } from '../lib/apply-origin-gate.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const origin = readJson( path.join( REPO, 'sites', 'indus-foods', 'build', 'careers.origin.json' ) );
const refs = Object.keys( origin );
const shiftedBy = ( n ) => Object.fromEntries( refs.slice( 0, refs.length - n ).map( ( ref, i ) => [ ref, { tpl: origin[ refs[ i + n ] ].tpl, how: 'kept from the previous pairs' } ] ) );
const stale = { generated: 'refresh-pairs.mjs', pairs: shiftedBy( 2 ), unpaired: {} };
const careers11 = 'cr-ref-careers-11';

test( 'the real origin gives the shifted pair a different element (the fixture can fail)', () => {
	assert.notEqual( stale.pairs[ careers11 ].tpl, origin[ careers11 ].tpl );
} );

test( "a stale pairs file never replaces the origin's element for a ref the origin holds, and is listed", () => {
	const report = pairsReport( {}, origin, stale );
	assert.equal( report.pairs.find( ( p ) => p.ref === careers11 ).tpl, origin[ careers11 ].tpl );
	assert.ok( report.pairs.every( ( p ) => origin[ p.ref ]?.tpl === p.tpl ), "every pair is the origin's element" );
	const bad = report.disagree.filter( ( d ) => 'refresh' === d.source );
	assert.ok( bad.length > refs.length / 2, `${ bad.length } shifted refs are listed` );
	assert.deepEqual( bad.find( ( d ) => careers11 === d.ref ), { ref: careers11, source: 'refresh', was: stale.pairs[ careers11 ].tpl, origin: origin[ careers11 ].tpl } );
} );

test( 'a pairs file that agrees with the origin is not stale, and keeps its part and reveal pairs', () => {
	const agreeing = { pairs: { [ careers11 ]: { tpl: origin[ careers11 ].tpl }, 'cr-ref-careers-12': { tpl: 'Root/9#0', part: 'icon' } }, unpaired: {} };
	const report = pairsReport( {}, origin, agreeing );
	assert.deepEqual( report.disagree, [] );
	assert.equal( report.pairs.find( ( p ) => 'cr-ref-careers-12' === p.ref ).tpl, 'Root/9#0' );
} );

test( 'a config pair that names another element than the origin is overridden and listed', () => {
	const cfg = { pairs: [ { live: `.${ careers11 }`, draft: { tpl: origin[ 'cr-ref-careers-13' ].tpl } } ] };
	const report = pairsReport( cfg, origin, null );
	assert.equal( report.pairs.find( ( p ) => p.ref === careers11 ).tpl, origin[ careers11 ].tpl );
	assert.deepEqual( report.disagree.map( ( d ) => d.source ), [ 'pair' ] );
} );

test( "with no pairs file every pair is the origin's and nothing is stale", () => {
	const report = pairsReport( {}, origin, null );
	assert.equal( report.pairs.length, refs.length );
	assert.deepEqual( report.disagree, [] );
} );

test( 'the applier refuses a surface whose records disagree with its origin, naming the file', () => {
	const surface = { name: 'careers', ...pairsReport( {}, origin, stale ) };
	const problems = staleRecordProblems( [ surface, { name: 'home', disagree: [] } ], 'indus-foods' );
	assert.equal( problems.length, 1 );
	assert.match( problems[ 0 ], /^careers: \d+ pairs in careers\.pairs\.json name another draft element than careers\.origin\.json/ );
	assert.match( problems[ 0 ], /git rm sites\/indus-foods\/build\/careers\.pairs\.json/ );
} );

test( 'a planned target off the origin is named; skeleton, part and reveal targets are not compared', () => {
	const planned = [
		{ ref: careers11, tpl: stale.pairs[ careers11 ].tpl, via: 'refresh' },
		{ ref: 'cr-ref-careers-12', tpl: origin[ 'cr-ref-careers-12' ].tpl, via: 'origin' },
		{ ref: 'cr-ref-careers-13', tpl: 'Root/1#0', part: 'icon' },
		{ ref: 'cr-ref-careers-14', tpl: 'Root/2#0', reveal: 'open' },
		{ ref: 'cr-ref-careers-15', tpl: 'Root/3#0', via: 'skeleton' },
	];
	assert.deepEqual( targetsOffOrigin( { pairs: planned, origin } ), [ `${ careers11 }: planned for ${ stale.pairs[ careers11 ].tpl }, the origin records ${ origin[ careers11 ].tpl }` ] );
} );

test( 'no committed pairs file disagrees with its origin file (delete it, or regenerate with refresh-pairs.mjs --write)', () => {
	const bad = [];
	for ( const client of fs.readdirSync( path.join( REPO, 'sites' ) ) ) {
		const build = path.join( REPO, 'sites', client, 'build' );
		if ( ! fs.existsSync( build ) ) {
			continue;
		}
		for ( const f of fs.readdirSync( build ).filter( ( x ) => x.endsWith( '.pairs.json' ) ) ) {
			const name = f.replace( /\.pairs\.json$/, '' );
			const originFile = path.join( build, `${ name }.origin.json` );
			const report = pairsReport( {}, fs.existsSync( originFile ) ? readJson( originFile ) : {}, readJson( path.join( build, f ) ) );
			report.disagree.length && bad.push( `${ client }/${ f }: ${ report.disagree.length } pairs differ from the origin` );
		}
	}
	assert.deepEqual( bad, [] );
} );

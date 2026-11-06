// PF11: a site run ranks each page's open walker rows into a top 50 and hands them to the gate chain as a Solve-shaped report.
// Only status.json survives of sites/indus-foods/build/qa/site-run/2026-10-28T06-08-38/ (no walker report), so the fixture is a
// reduced walker report in the saved report's row shape (kind, key, draft, live, ref, path, pair boxes), sized from that
// status.json's own open counts (the surfaces and how many open rows each left).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { rankRows, writeRanking, solveShaped, magnitude, TOP_N } from '../lib/site-run-rank.mjs';
import { issuesOf } from '../lib/triage.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const SAVED = path.resolve( HERE, '..', '..', '..', 'sites', 'indus-foods', 'build', 'qa', 'site-run', '2026-10-28T06-08-38', 'status.json' );
const saved = fs.existsSync( SAVED ) ? JSON.parse( fs.readFileSync( SAVED, 'utf8' ) ) : { home: { walk: { detail: 'x: 300 open' } }, about: { walk: { detail: 'x: 200 open' } } };
const opens = Object.fromEntries( Object.entries( saved ).map( ( [ k, v ] ) => [ k, Number( /(\d+) open/.exec( v.walk?.detail ?? '' )?.[ 1 ] ?? 0 ) ] ).filter( ( [ , n ] ) => n ) );
const range = ( a, b ) => Array.from( { length: b - a + 1 }, ( _, i ) => a + i );

// A walker report: `repeated` causes shown on 3 elements at 3 widths, plus unique noise rows and rows that are not issues.
function walkerReport( surface, { repeated, noise } ) {
	const runs = [ 1440, 768, 375 ].map( ( width ) => ( { state: 'default', width, pairs: {} } ) );
	const row = ( i, extra ) => ( { kind: 'style', key: `prop-${ i }`, draft: '10px', live: `${ 10 + ( i % 7 ) + 1 }px`, ref: `cr-ref-${ surface }-${ i % 9 }`, path: '', accepted: null, ...extra } );
	for ( const run of runs ) {
		for ( let e = 1; e <= 3; e++ ) {
			run.pairs[ `el-${ e }` ] = { live: { box: { w: 800, h: 200 } }, diffs: repeated.map( ( i ) => row( i, { path: `section:nth-of-type(${ e }) > h2` } ) ) };
		}
		run.pairs.noise = { live: { box: { w: 20, h: 20 } }, diffs: [] };
	}
	for ( let i = 0; i < noise; i++ ) {
		runs[ 0 ].pairs.noise.diffs.push( row( 1000 + i, { path: `div:nth-of-type(${ i })`, live: '11px' } ) );
		runs[ 0 ].pairs.noise.diffs.push( { kind: 'auto', key: `word-${ i }`, draft: 'a', live: 'b', accepted: null } );
	}
	runs[ 0 ].pairs.noise.diffs.push( row( 5000, { accepted: 'ok' } ) );
	return { runs };
}
const pages = () => ( {
	home: walkerReport( 'home', { repeated: range( 1, 40 ), noise: Math.min( 400, opens.home || 300 ) } ),
	about: walkerReport( 'about', { repeated: [ ...range( 1, 10 ), ...range( 41, 60 ) ], noise: Math.min( 300, opens.about || 200 ) } ),
} );

test( 'the ranking keeps 50 rows, collapses repeats into one counted row and ranks the widest-shown cause first', () => {
	const { total, causes, ranked } = rankRows( pages() );
	assert.equal( ranked.length, TOP_N );
	assert.ok( total > 1000, `the flood is real (${ total } open issue rows)` );
	assert.ok( causes < total / 2, `repeats collapsed: ${ total } rows are ${ causes } causes` );
	assert.equal( new Set( ranked.map( ( r ) => r.causeKey ) ).size, ranked.length, 'one row per cause' );
	const first = ranked[ 0 ];
	assert.equal( first.pages, 2, 'a cause both pages show ranks first' );
	assert.equal( first.count, 3 * 3 * 2, 'its count is 3 elements x 3 widths x 2 pages' );
	assert.ok( ranked.every( ( r, i ) => 0 === i || ranked[ i - 1 ].score >= r.score ), 'sorted by score' );
	assert.ok( ranked.every( ( r ) => 'auto' !== r.kind && ! r.accepted ), 'non-issue and accepted rows never rank' );
} );

test( 'negative control: uncut, the collapsed causes exceed 50, so the cut is the ranking and not the data', () => {
	const { ranked, total } = rankRows( pages(), { limit: 5000 } );
	assert.ok( ranked.length < total / 2 && ranked.length > TOP_N );
	assert.equal( magnitude( { draft: '10px', live: '10px' } ), 0, 'an equal value has no magnitude' );
	assert.equal( magnitude( { draft: 'red', live: 'blue' } ), 1 );
} );

test( 'writeRanking writes the top 50 and a Solve-shaped report per surface that the gate chain can read', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'rank-' ) );
	const parity = path.join( dir, 'parity' );
	for ( const [ s, r ] of Object.entries( pages() ) ) {
		fs.mkdirSync( path.join( parity, s ), { recursive: true } );
		fs.writeFileSync( path.join( parity, s, 'report.json' ), JSON.stringify( r ) );
	}
	const out = writeRanking( { runDir: path.join( dir, 'run' ), parityOut: parity, surfaces: [ 'home', 'about', 'missing-page' ] } );
	assert.equal( JSON.parse( fs.readFileSync( out.file, 'utf8' ) ).ranked.length, 50 );
	let chained = 0;
	for ( const s of out.surfaces ) {
		const report = JSON.parse( fs.readFileSync( path.join( dir, 'run', 'gate', s, 'solve-report.json' ), 'utf8' ) );
		assert.ok( fs.existsSync( path.join( dir, 'run', 'gate', s, 'round-1', 'report.json' ) ), 'the walker report sits beside it as round-1' );
		chained += issuesOf( report, s ).length;
	}
	assert.equal( chained, 50, 'the gate chain reads exactly the 50 ranked rows as issues' );
	assert.equal( issuesOf( solveShaped( 'home', [] ), 'home' ).length, 0, 'negative control: no ranked rows, no issues' );
} );

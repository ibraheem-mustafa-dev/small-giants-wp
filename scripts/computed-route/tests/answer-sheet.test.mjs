// Proves the answer sheet (Spec 47 route-accuracy R1): rows match a walk by element, not by pair name; triage artefact
// labels drop a false alarm but `consequence` never drops a real problem; a real problem that passed in the baseline and
// is gone now fails the gate. Built on the committed sheet's own footer rows, so it runs offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchKey, reportRows, outcomeOf, scoreSurface, baselineOf, regressions, writtenGroups } from '../lib/answer-sheet.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const SHEET = JSON.parse( fs.readFileSync( path.resolve( HERE, '../../../sites/eye-care-ward-end/build/qa/answer-sheet.json' ), 'utf8' ) );
const footer = SHEET.filter( ( r ) => 'footer' === r.surface && 'wrong-write' !== r.label );

// A walk report holding each given sheet row as an open diff, under a renamed pair (pairs.mjs renumbers its names).
const walkOf = ( rows ) => {
	const runs = new Map();
	for ( const r of rows ) {
		const k = `${ r.state }|${ r.width }`;
		runs.has( k ) || runs.set( k, { state: r.state, width: r.width, pairs: {} } );
		const pairs = runs.get( k ).pairs;
		const name = `renamed-${ r.pair }`;
		pairs[ name ] ||= { diffs: [] };
		pairs[ name ].diffs.push( { kind: r.kind, key: r.property, draft: r.draftValue, live: r.liveValue, ref: r.ref, path: r.path, accepted: null } );
	}
	return { config: 'footer', runs: [ ...runs.values() ] };
};

test( 'the sheet is the frozen 100 rows with every label', () => {
	assert.equal( SHEET.length, 100 );
	const by = ( l ) => SHEET.filter( ( r ) => r.label === l ).length;
	assert.deepEqual( [ by( 'false-alarm' ), by( 'wrong-write' ), by( 'real-problem' ) ], [ 47, 29, 24 ] );
} );

test( 'a row matches the walk by state, width, element, path, kind and property; the pair name is ignored, and a block-less row matches by pair', () => {
	const rp = footer.find( ( r ) => 'RP-FT-01' === r.id );
	assert.equal( matchKey( rp ), matchKey( { ...rp, pair: 'gen-footer-99' } ) );
	assert.notEqual( matchKey( rp ), matchKey( { ...rp, width: rp.width + 1 } ) );
	assert.equal( matchKey( { ref: 'None', pair: 'brands-top-first', state: 'mega-brands', width: 1440, path: '', kind: 'text', property: 'text' } ), 'mega-brands|1440|pair:brands-top-first||text|text' );
	assert.equal( outcomeOf( rp, { report: walkOf( [ rp ] ) } ), 'open' );
	assert.equal( reportRows( walkOf( [ rp ] ) )[ 0 ].pair, `renamed-${ rp.pair }` );
} );

test( 'an accepted row and an absent row count as dropped; without a walk a row is not scored', () => {
	const fa = footer.find( ( r ) => 'false-alarm' === r.label );
	const walk = walkOf( [ fa ] );
	walk.runs[ 0 ].pairs[ `renamed-${ fa.pair }` ].diffs[ 0 ].accepted = 'paints nothing';
	assert.equal( outcomeOf( fa, { report: walk } ), 'accepted' );
	assert.equal( outcomeOf( fa, { report: walkOf( [] ) } ), 'absent' );
	assert.equal( outcomeOf( fa, {} ), 'not-scored' );
} );

test( 'a triage artefact label drops a false alarm; `consequence` never drops a real problem', () => {
	const fa = footer.find( ( r ) => 'false-alarm' === r.label );
	const rp = footer.find( ( r ) => 'real-problem' === r.label );
	const verdict = ( r, decidedBy ) => ( { key: r.triageKey || [ r.ref, r.path, r.kind, r.property ].join( '|' ), decidedBy } );
	assert.equal( outcomeOf( fa, { report: walkOf( [ fa ] ), triage: { verdicts: [ verdict( fa, 'mispaired' ) ] } } ), 'artefact' );
	assert.equal( outcomeOf( rp, { report: walkOf( [ rp ] ), triage: { verdicts: [ verdict( rp, 'consequence' ) ] } } ), 'open' );
} );

test( 'a wrong write is avoided only when none of its groups was written or reverted', () => {
	const ww = SHEET.find( ( r ) => 'WW-HM-01' === r.id );
	assert.equal( outcomeOf( ww, { solve: { writes: [ { group: ww.groups[ 0 ] } ], wrong: [] } } ), 'written' );
	assert.equal( outcomeOf( ww, { solve: { writes: [], wrong: [ { group: ww.groups[ 0 ] } ] } } ), 'written' );
	assert.equal( outcomeOf( ww, { solve: { writes: [], wrong: [] } } ), 'avoided' );
	assert.deepEqual( [ ...writtenGroups( { writes: [ { group: 'a' } ], wrong: [ { group: 'b' } ] } ) ], [ 'a', 'b' ] );
} );

test( 'MUST FAIL (a route change hides a real problem): a real problem kept in the baseline and missing from the new walk is a regression', () => {
	const walk = walkOf( footer );
	const base = baselineOf( scoreSurface( SHEET, 'footer', { report: walk } ) );
	const kept = footer.filter( ( r ) => 'real-problem' === r.label ).map( ( r ) => r.id );
	assert.ok( kept.length && kept.every( ( id ) => base.pass.includes( id ) ) );
	const dropped = 'RP-FT-01';
	const planted = walkOf( footer.filter( ( r ) => r.id !== dropped ) );
	assert.deepEqual( regressions( scoreSurface( SHEET, 'footer', { report: planted } ), base ).map( ( r ) => r.id ), [ dropped ] );
} );

test( 'negative control: the same walk scored again has no regression, and a row that never passed is not one', () => {
	const walk = walkOf( footer );
	const score = scoreSurface( SHEET, 'footer', { report: walk } );
	assert.deepEqual( regressions( score, baselineOf( score ) ), [] );
	assert.ok( score.rows.some( ( r ) => false === r.pass ) );
	assert.deepEqual( regressions( score, { pass: [] } ), [] );
} );

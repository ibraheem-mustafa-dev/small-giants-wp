// Proves the answer sheet (Spec 47 route-accuracy R1): rows match a walk by element, not by pair name; triage artefact
// labels drop a false alarm but `consequence` never drops a real problem; a real problem that passed in the baseline and
// is gone now fails the gate. Built on the committed sheet's own footer rows, so it runs offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchKey, reportRows, outcomeOf, scoreSurface, baselineOf, regressions, writtenGroups, passes } from '../lib/answer-sheet.mjs';

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
		pairs[ name ] ||= { live: { trace: { ref: r.ref } }, diffs: [] };
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
	const other = walkOf( [ footer.find( ( r ) => r.ref === fa.ref && r.id !== fa.id && r.state === fa.state && r.width === fa.width ) || { ...fa, property: 'zz-other' } ] );
	assert.equal( outcomeOf( fa, { report: other } ), 'absent' );
	assert.equal( outcomeOf( fa, {} ), 'not-scored' );
} );

test( 'a triage artefact label drops a false alarm; `consequence` never drops a real problem', () => {
	const fa = footer.find( ( r ) => 'false-alarm' === r.label );
	const rp = footer.find( ( r ) => 'real-problem' === r.label );
	const verdict = ( r, decidedBy ) => ( { key: r.triageKey || [ r.ref, r.path, r.kind, r.property ].join( '|' ), decidedBy } );
	assert.equal( outcomeOf( fa, { report: walkOf( [ fa ] ), triage: { verdicts: [ verdict( fa, 'mispaired' ) ] } } ), 'artefact' );
	assert.equal( outcomeOf( rp, { report: walkOf( [ rp ] ), triage: { verdicts: [ verdict( rp, 'consequence' ) ] } } ), 'open' );
} );

test( 'a row the walker flagged mispaired counts as an artefact without any triage', () => {
	const fa = footer.find( ( r ) => 'false-alarm' === r.label );
	const walk = walkOf( [ fa ] );
	walk.runs[ 0 ].pairs[ `renamed-${ fa.pair }` ].diffs[ 0 ].mispaired = 'identity and words disagree';
	assert.equal( outcomeOf( fa, { report: walk } ), 'artefact' );
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

test( 'MUST FAIL (council 2026-10-10): a row is dropped only when the walk measured its block there; an unmeasured block scores nothing', () => {
	const fa = footer.find( ( r ) => 'false-alarm' === r.label && r.ref );
	const rp = footer.find( ( r ) => 'real-problem' === r.label && r.ref );
	const measured = walkOf( [] );
	measured.runs = [ { state: fa.state, width: fa.width, pairs: { other: { live: { trace: { ref: fa.ref } }, diffs: [] } } } ];
	assert.equal( outcomeOf( fa, { report: measured } ), 'absent' );
	const empty = { runs: [ { state: fa.state, width: fa.width, pairs: {} } ] };
	assert.equal( outcomeOf( fa, { report: empty } ), 'unmeasured' );
	assert.equal( passes( 'false-alarm', 'unmeasured' ), null );
	assert.equal( passes( 'real-problem', 'unmeasured' ), false );
	assert.equal( outcomeOf( rp, { report: { runs: [ { state: rp.state, width: rp.width, pairs: {} } ] } } ), 'unmeasured' );
} );

// A real problem caused by a wrong write disappears once the write is never made (home RP-HM-01..03, 2026-10-10: the
// trial rejected the doubled card padding, so the 247px card content is 291px on both sides). Measured equal on the
// block's own element, it is fixed, never "lost"; anything short of that proof still fails.
const RP_HM_02 = SHEET.find( ( r ) => 'RP-HM-02' === r.id );
const measuredWalk = ( live, draft = RP_HM_02.draftValue, ref = RP_HM_02.ref ) => ( { runs: [ { state: RP_HM_02.state, width: RP_HM_02.width, pairs: {
	'gen-home-32': { live: { trace: { ref }, styles: { [ RP_HM_02.property ]: live } }, draft: { styles: { [ RP_HM_02.property ]: draft } }, diffs: [] },
} } ] } );

test( 'MUST FAIL: a real problem absent because its element now measures the draft value is fixed, and passes', () => {
	const outcome = outcomeOf( RP_HM_02, { report: measuredWalk( '291px' ) } );
	assert.equal( outcome, 'fixed' );
	assert.equal( passes( 'real-problem', outcome ), true );
} );

test( 'negative control: absent while the element still reads another value, or measured on another block, is not fixed', () => {
	assert.equal( outcomeOf( RP_HM_02, { report: measuredWalk( '260px' ) } ), 'absent' );
	assert.equal( passes( 'real-problem', 'absent' ), false );
	assert.equal( outcomeOf( RP_HM_02, { report: measuredWalk( '291px', '291px', 'cr-ref-home-99' ) } ), 'unmeasured' );
	assert.equal( outcomeOf( { ...RP_HM_02, path: '.sgs-x__inner' }, { report: measuredWalk( '291px' ) } ), 'absent' );
} );

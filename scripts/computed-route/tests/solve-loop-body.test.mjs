// FR-48-14 on a Solve round: solve.mjs loads the fact record, the surface's origin map and the served root component
// (lib/solve-loop-body.mjs::solveLoopBody) and passes the loop-body check to solve.mjs::writeRound, so a parent setting whose
// paint reaches several copies of one `sc-for` body is one parent write; a copy outside the loop keeps the row a gap on the
// child. The planted build folder is tests/fixtures/solve-loop-body/repo (a panel of four tiles: three copies of loop
// `Demo Site/9`, one tile outside it). Run against the real framework DB and the real hop.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeRound } from '../solve.mjs';
import { solveLoopBody, rootComponentOf } from '../lib/solve-loop-body.mjs';
import { openDb } from '../lib/db.mjs';

const REPO = path.join( path.dirname( fileURLToPath( import.meta.url ) ), 'fixtures', 'solve-loop-body', 'repo' );
const readFacts = ( c ) => JSON.parse( fs.readFileSync( path.join( REPO, 'sites', c, 'build', 'intake', 'facts.json' ), 'utf8' ) );
const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const TILE = '.sgs-mega-panel__content > .sgs-mega-group';
// The panel's calibration ties groupPadding to every tile; the tile blocks have none of their own (the child resolves to a
// gap, so the ancestor hop decides).
const calFor = ( b ) => ( 'sgs/mega-panel' === b ? { elements: { '': {} }, settings: { groupPadding: { slot: TILE, slots: [ TILE ], property: 'padding', state: null } } } : null );
const tree = () => [ { name: 'sgs/mega-panel', attributes: { className: 'cr-ref-panel-0' }, innerBlocks: [ 1, 2, 3, 4 ].map( ( i ) => ( { name: 'sgs/container', attributes: { className: `cr-ref-panel-${ i }` } } ) ) } ];
const row = ( i ) => ( { kind: 'style', key: 'padding-top', draft: '26px', live: '0px', ref: `cr-ref-panel-${ i }`, block: 'sgs-container', path: '', owners: [ { ref: 'cr-ref-panel-0', block: 'sgs-mega-panel', path: `${ TILE }:nth-of-type(${ i })` } ] } );
const report = ( tiles ) => ( { runs: [ { state: 'open', width: 1440, pairs: Object.fromEntries( tiles.map( ( i ) => [ `tile-${ i }`, { draft: { styles: { 'padding-top': '26px' } }, diffs: [ row( i ) ] } ] ) ) } ] } );
const round = ( tiles, loopBody ) => {
	const t = tree();
	const r = writeRound( report( tiles ), t, { db, snapshot, round: 1, log: [], stateMap: { open: null }, calFor, canvas: true, loopBody } );
	return { r, panel: t[ 0 ].attributes, children: t[ 0 ].innerBlocks.map( ( c ) => c.attributes ) };
};

test( 'MUST FAIL WITHOUT THE LOAD: three tiles of one loop body get one parent setting, and no tile is written', () => {
	const { loopBody, note } = solveLoopBody( { repo: REPO, client: 'demo', surface: 'panel', draftIndex: 'Demo Site.dc.html', readFacts } );
	assert.ok( loopBody, note );
	const { r, panel, children } = round( [ 1, 2, 3 ], loopBody );
	assert.deepEqual( [ ...new Set( r.writes.map( ( w ) => `${ w.ref }|${ w.attr }` ) ) ], [ 'cr-ref-panel-0|groupPadding' ], 'one setting on the parent' );
	assert.deepEqual( panel.groupPadding, { top: '26px' } );
	assert.ok( children.every( ( c ) => 1 === Object.keys( c ).length ), 'no tile carries a write' );
	assert.deepEqual( r.gaps, {} );
} );

test( 'MUST FAIL WITHOUT THE REFUSAL: a tile outside the loop keeps every row a gap on the child, with the parent unwritten', () => {
	const { loopBody } = solveLoopBody( { repo: REPO, client: 'demo', surface: 'panel', draftIndex: 'Demo Site.dc.html', readFacts } );
	const { r, panel } = round( [ 1, 2, 4 ], loopBody );
	assert.equal( r.writes.length, 0 );
	assert.equal( panel.groupPadding, undefined );
	assert.ok( Object.values( r.gaps ).every( ( g ) => 'canvas-settable' === g.cite?.check && undefined === g.cite.loop && 3 === g.cite.measuredDescendants.length ) );
} );

test( 'with no loop check (no fact record or origin map) the hop writes only for one descendant, as before', () => {
	assert.equal( round( [ 1, 2, 3 ], null ).r.writes.length, 0 );
	assert.equal( round( [ 2 ], null ).r.writes[ 0 ]?.attr, 'groupPadding' );
} );

test( 'the loader names a missing origin map or fact record, and the served root comes from the surface\'s draft index', () => {
	assert.equal( solveLoopBody( { repo: REPO, client: 'demo', surface: 'nope', readFacts } ).loopBody, null );
	assert.match( solveLoopBody( { repo: REPO, client: 'demo', surface: 'nope', readFacts } ).note, /nope\.origin\.json/ );
	assert.match( solveLoopBody( { repo: REPO, client: 'absent', surface: 'panel', readFacts } ).note, /origin\.json/ );
	const intake = { inventory: { animations: { drafts: [ { file: 'Other.dc.html', dc: 'Other' }, { file: 'Demo Site.dc.html', dc: 'Demo Site' } ] } } };
	assert.equal( rootComponentOf( intake, 'Demo Site.dc.html' ), 'Demo Site' );
	assert.equal( rootComponentOf( intake, null ), 'Other' );
	assert.equal( rootComponentOf( null ), null );
	// The root names the record's key space: with the wrong draft index the origin's Root/10 keys miss the record.
	const wrong = solveLoopBody( { repo: REPO, client: 'demo', surface: 'panel', draftIndex: 'Other.dc.html', readFacts } );
	assert.equal( round( [ 1, 2, 3 ], wrong.loopBody ).r.writes.length, 0 );
} );

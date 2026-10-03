// Proves R-47-9's regression guard: when a round makes rows worse, only the write whose calibrated side effects (or
// own property) explain a regressed row on its node is reverted and blocked; rows below that node pin nothing more,
// and a box-size row alone never blames every write on a node already explained. Also proves the walker state mapping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { revertRegressions } from '../solve.mjs';

const tree = () => [ { name: 'sgs/site-footer-row', attributes: { className: 'cr-ref-f-1', padding: { desktop: { top: '104px' } }, maxWidth: { desktop: '1440px' } }, innerBlocks: [
	{ name: 'sgs/heading', attributes: { className: 'cr-ref-f-2', margin: { desktop: { bottom: '4px' } } } } ] } ];
const run = ( rows ) => ( { runs: [ { state: 'opening', width: 375, pairs: { row: { diffs: rows.filter( ( r ) => 'row' === r.pair ) }, head: { diffs: rows.filter( ( r ) => 'head' === r.pair ) } } } ] } );
const writes = [
	{ round: 1, group: 'g-pad', ref: 'cr-ref-f-1', block: 'sgs/site-footer-row', attr: 'padding', prop: 'padding-top', before: null, after: {} },
	{ round: 1, group: 'g-max', ref: 'cr-ref-f-1', block: 'sgs/site-footer-row', attr: 'maxWidth', prop: 'max-width', before: null, after: {} },
	{ round: 1, group: 'g-mar', ref: 'cr-ref-f-2', block: 'sgs/heading', attr: 'margin', prop: 'margin-bottom', before: null, after: {} },
];
const cal = ( block ) => ( { 'sgs/site-footer-row': { settings: { maxWidth: { effects: [ '|margin-left', '|margin-right', '|width' ] }, padding: { effects: [] } } }, 'sgs/heading': { settings: { margin: { effects: [ '|width' ] } } } } )[ block ];
const before = run( [] );
const after = run( [
	{ pair: 'row', kind: 'style', key: 'margin-left', draft: '0px', live: '167.5px', ref: 'cr-ref-f-1', path: '' },
	{ pair: 'row', kind: 'box', key: 'h', draft: 425, live: 1973, ref: 'cr-ref-f-1', path: '' },
	{ pair: 'head', kind: 'style', key: 'width', draft: '335px', live: '0px', ref: 'cr-ref-f-2', path: '' },
] );

test( 'MUST FAIL TO OVER-REVERT: only the write whose side effect matches is reverted', () => {
	const t = tree();
	const blocked = new Map();
	const out = revertRegressions( before, after, t, structuredClone( writes ), blocked, cal );
	assert.deepEqual( out.map( ( w ) => w.attr ), [ 'maxWidth' ] );
	assert.equal( t[ 0 ].attributes.maxWidth, undefined );
	assert.deepEqual( t[ 0 ].attributes.padding, { desktop: { top: '104px' } } );
	assert.equal( blocked.get( 'g-max' ).gap, 'breaks-layout' );
} );

test( 'with no matching side effect, every write on the regressed node is suspect', () => {
	const out = revertRegressions( before, after, tree(), structuredClone( writes ), new Map(), () => ( { settings: {} } ) );
	assert.deepEqual( out.map( ( w ) => w.attr ).sort(), [ 'maxWidth', 'padding' ] );
} );

test( 'no regression, no revert', () => {
	assert.equal( revertRegressions( before, before, tree(), structuredClone( writes ), new Map(), cal ).length, 0 );
} );

// Walker state mapping (Spec 47 §5 stage 3): rows are written only from walker states the surface maps to a setting
// state; a scrolled run's values never land in rest settings, and draft values come only from the group's own states.
import { writeRound } from '../solve.mjs';
import { writableGroups, draftValues } from '../lib/solve-rows.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const headCal = () => ( { elements: { '': {} }, settings: { fontSize: { slot: '', property: 'font-size' } } } );
const headTree = () => [ { name: 'sgs/heading', attributes: { className: 'cr-ref-h-1', content: 'Hi' } } ];
const pairRun = ( state, draftPx, rows ) => ( { state, width: 1440, pairs: { head: { draft: { styles: { 'font-size': draftPx } }, diffs: rows } } } );
const stateReport = () => ( { runs: [
	pairRun( 'opening', '18px', [] ),
	pairRun( 'scrolled', '15px', [ { kind: 'style', key: 'font-size', draft: '15px', live: '18px', ref: 'cr-ref-h-1', path: '' } ] ),
] } );

test( 'MUST FAIL TO WRITE: a row from an unmapped scrolled state produces no group and no write', () => {
	const t = headTree();
	const r = writeRound( stateReport(), t, { db, snapshot, round: 1, log: [], stateMap: { opening: null }, calFor: headCal } );
	assert.equal( r.writes.length, 0 );
	assert.equal( t[ 0 ].attributes.fontSize, undefined );
	assert.equal( writableGroups( stateReport(), { opening: null } ).unmappedState.length, 1 );
} );

test( 'positive control: the same row mapped to rest is written (so the case above is not vacuous)', () => {
	const r = writeRound( stateReport(), headTree(), { db, snapshot, round: 1, log: [], stateMap: { opening: null, scrolled: null }, calFor: headCal } );
	assert.equal( r.writes.length, 1 );
	assert.equal( r.writes[ 0 ].attr, 'fontSize' );
} );

test( 'a mapped scrolled row keys its group with that state and reads draft values only from that state', () => {
	const { groups } = writableGroups( stateReport(), { opening: null, scrolled: 'scrolled' } );
	assert.equal( groups.length, 1 );
	assert.equal( groups[ 0 ].state, 'scrolled' );
	assert.match( groups[ 0 ].key, /\|scrolled$/ );
	assert.deepEqual( draftValues( stateReport(), 'head', 'font-size', false, groups[ 0 ].walkerStates ).perWidth, { 1440: '15px' } );
	assert.deepEqual( draftValues( stateReport(), 'head', 'font-size', false ).perWidth, { 1440: '15px' } );
	assert.deepEqual( draftValues( stateReport(), 'head', 'font-size', false, [ 'opening' ] ).perWidth, { 1440: '18px' } );
} );

test( 'a hover row from a non-rest state is not writable', () => {
	const rep = { runs: [ pairRun( 'scrolled', '15px', [ { kind: 'hover', key: 'color', draft: 'rgb(0, 0, 0)', live: 'rgb(1, 1, 1)', ref: 'cr-ref-h-1', path: '' } ] ) ] };
	const out = writableGroups( rep, { scrolled: 'scrolled' } );
	assert.equal( out.groups.length, 0 );
	assert.equal( out.unmappedState.length, 1 );
} );

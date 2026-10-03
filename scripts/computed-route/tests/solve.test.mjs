// Proves R-47-9's regression guard: when a round makes rows worse, only the write whose calibrated side effects (or
// own property) explain a regressed row on its node is reverted and blocked; rows below that node pin nothing more,
// and a box-size row alone never blames every write on a node already explained.
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

// The build and apply stages' run ledger rows (lib/run-ledger-build.mjs): each Fill write against the markup the build saved
// (wp-build-page.js --save-built), keyed by cr-ref, and each applier plan row by its draft element. Negative controls: a write
// the saved block holds, and one left out of the markup at its block.json default, are passed on. No browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunRows, applyRunRows, filledByRef } from '../lib/run-ledger-build.mjs';
import { unknownStages } from '../site-run.mjs';

const filled = [ { name: 'sgs/container', attributes: { className: 'cr-ref-s-0', padding: { top: 4 }, gap: 'none' }, innerBlocks: [
	{ name: 'sgs/heading', attributes: { className: 'cr-ref-s-1', fontSize: 40 }, innerBlocks: [] },
	{ name: 'sgs/text', attributes: { className: 'cr-ref-s-2', colour: 'red' }, innerBlocks: [] },
] } ];
const saved = [
	'<!-- wp:sgs/container {"className":"cr-ref-s-0","padding":{"top":4}} -->',
	'<!-- wp:sgs/heading {"className":"cr-ref-s-1","fontSize":32} /-->',
	'<!-- /wp:sgs/container -->',
].join( '\n' );
const writes = [
	{ node: 'cr-ref-s-0', slot: '', prop: 'padding-top', attr: 'padding', after: { top: 4 }, widths: [ 1440 ] },
	{ node: 'cr-ref-s-0', slot: '', prop: 'padding-left', attr: 'padding', after: { left: 9 } },
	{ node: 'cr-ref-s-0', slot: '', prop: 'gap', attr: 'gap', after: 'none' },
	{ node: 'cr-ref-s-1', slot: '', prop: 'font-size', attr: 'fontSize', after: 40 },
	{ node: 'cr-ref-s-2', slot: '', prop: 'color', attr: 'colour', after: 'red' },
	{ node: 'cr-ref-s-2', slot: '', prop: '(content)', attr: null },
];
const schemaOf = ( b ) => ( { 'sgs/container': { gap: { default: 'none' } } }[ b ] ?? {} );
const rows = buildRunRows( { surface: 's', writes, filled, saved, savedFile: 'qa/ledger/s/R/built.json', draftKeyOf: ( n ) => ( { 'cr-ref-s-1': 'Root/2#0' }[ n ] ?? null ), schemaOf } );
const by = Object.fromEntries( rows.map( ( r ) => [ r.outcome.setting, r ] ) );

test( 'MUST FAIL: a write the editor rewrote, or whose block the saved markup lacks, is dropped by the build', () => {
	assert.equal( rows.length, 5, 'a write with no setting is no build row' );
	assert.deepEqual( [ by.fontSize.outcome.kind, by.fontSize.draftKey, by.fontSize.stage ], [ 'dropped', 'Root/2#0', 'build' ] );
	assert.match( by.fontSize.outcome.reason, /the saved block holds 32/ );
	assert.match( by.colour.outcome.reason, /holds no block cr-ref-s-2/ );
	assert.equal( filledByRef( filled, 's' ).get( 'cr-ref-s-2' ).block, 'sgs/text' );
} );

test( 'negative control: a setting the saved block holds, or leaves out at its default, is passed on', () => {
	assert.deepEqual( rows.filter( ( r ) => 'padding' === r.outcome.setting ).map( ( r ) => r.outcome.kind ), [ 'passed-on', 'passed-on' ], 'an earlier write a later one replaced is judged by the Filled tree value' );
	assert.equal( by.gap.outcome.kind, 'passed-on' );
	const noDefault = buildRunRows( { surface: 's', writes: writes.slice( 2, 3 ), filled, saved, savedFile: 'f' } );
	assert.equal( noDefault[ 0 ].outcome.kind, 'dropped' );
} );

test( 'MUST FAIL: the applier\'s plan rows are rows of their draft element, and verify is a stage --stages may name', () => {
	const plan = { rows: [
		{ ref: 'cr-ref-s-1', tpl: 'Root/2#0', family: 'motion', status: 'written', prop: 'motion', why: 'plays on load' },
		{ ref: 'cr-ref-s-1', tpl: 'Root/2#0', family: 'state', status: 'equal', prop: 'color', why: 'same' },
		{ ref: 'cr-ref-s-0', tpl: 'Root/1#0', family: 'state', status: 'no-setting', prop: 'outline', why: 'no setting', state: 'focus' },
		{ family: '*', status: 'unpaired', why: 'skipped' },
	] };
	const a = applyRunRows( { plan, planFile: 'qa/apply/s.plan.json' } );
	assert.deepEqual( a.map( ( r ) => [ r.draftKey, r.property, r.state, r.outcome.kind ] ), [ [ 'Root/2#0', 'motion', 'rest', 'written' ], [ 'Root/2#0', 'color', 'rest', 'judged-equal' ], [ 'Root/1#0', 'outline', 'focus', 'dropped' ] ] );
	assert.match( a[ 2 ].outcome.reason, /^no-setting: no setting/ );
	assert.deepEqual( unknownStages( [ 'fill', 'verify', 'veryfy' ] ), [ 'veryfy' ] );
} );

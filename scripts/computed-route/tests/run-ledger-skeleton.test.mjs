// The skeleton stage's run ledger rows (lib/run-ledger-skeleton.mjs::skeletonRunRows): every painted element the proposal does
// not carry to a node gets a row per painted property naming what happened (a refused pairing, an absorbing rule, an unwrap, no
// row), and a node whose block prints another element kind than the draft's gets a tag row. Negative controls: a carried
// element and a matching tag write nothing. No browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { skeletonRunRows, dropOutcome } from '../lib/run-ledger-skeleton.mjs';

const el = ( key, tag, resolved ) => ( { key, tag, resolved } );
const inventory = { elements: [
	el( 'Root/1#0', 'section', { 1440: { 'background-color': 'red' } } ),
	el( 'Root/2#0', 'div', { 1440: { 'border-top-width': '1px' }, 375: { 'border-top-width': '1px' } } ),
	el( 'Root/3#0', 'div', { 1440: { 'min-width': '90px' } } ),
	el( 'Root/4#0', 'div', { 1440: { 'background-color': 'blue' } } ),
	el( 'Root/5#0', 'span', { 1440: { color: 'red' } } ),
	el( 'Root/6#0', 'div', { 1440: {} } ),
	el( 'Root/7#0', 'span', { 1440: { 'font-size': '12px' } } ),
] };
const skeleton = [ { name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, innerBlocks: [
	{ name: 'sgs/brand-strip', draftRef: { tpl: 'Root/5#0' }, innerBlocks: [] },
] } ];
const proposal = { rows: [
	{ key: 'Root/1#0', block: 'sgs/container' },
	{ key: 'Root/2#0', action: 'absorbed', into: 'Root/5#0', rule: 'marquee', conserve: [ { kind: 'unpaired', block: 'sgs/brand-strip', candidates: [ '.a', '.b' ] } ] },
	{ key: 'Root/3#0', action: 'absorbed', into: 'Root/5#0', rule: 'marquee' },
	{ key: 'Root/4#0', action: 'unwrap', rule: 'centringWrapper' },
	{ key: 'Root/5#0', block: 'sgs/brand-strip', parts: [ 'Root/7#0' ] },
	{ key: 'Root/6#0', action: 'unwrap' },
] };

test( 'MUST FAIL: a refused pairing, an absorbing rule, an unwrap and a drawn part each write a row per painted property', () => {
	const rows = skeletonRunRows( { surface: 's', inventory, proposal, skeleton } );
	const by = Object.fromEntries( rows.map( ( r ) => [ `${ r.draftKey } ${ r.property }`, r ] ) );
	assert.deepEqual( Object.keys( by ).sort(), [ 'Root/2#0 border-top-width', 'Root/3#0 min-width', 'Root/4#0 background-color', 'Root/7#0 font-size' ] );
	assert.equal( by[ 'Root/2#0 border-top-width' ].outcome.kind, 'absorbed' );
	assert.match( by[ 'Root/2#0 border-top-width' ].outcome.reason, /pairing refused it: several parts of sgs\/brand-strip fit it \(\.a \| \.b\)/ );
	assert.deepEqual( by[ 'Root/2#0 border-top-width' ].widths, [ 375, 1440 ] );
	assert.equal( by[ 'Root/3#0 min-width' ].outcome.into, 'sgs/brand-strip' );
	assert.match( by[ 'Root/3#0 min-width' ].outcome.reason, /rule marquee: no part of the block names it/ );
	assert.equal( by[ 'Root/4#0 background-color' ].outcome.kind, 'dropped' );
	assert.match( by[ 'Root/4#0 background-color' ].outcome.reason, /unwrapped \(rule centringWrapper\)/ );
	assert.match( by[ 'Root/7#0 font-size' ].outcome.reason, /drawn as a part of sgs\/brand-strip/ );
	assert.ok( rows.every( ( r ) => 'skeleton' === r.stage && r.record.file === 'skeleton/s.proposal.json' ) );
} );

test( 'negative control: a carried element (a node\'s draftRef) and an element painting nothing write no row; no row at all is its own reason', () => {
	const rows = skeletonRunRows( { surface: 's', inventory, proposal, skeleton } );
	assert.ok( ! rows.some( ( r ) => [ 'Root/1#0', 'Root/5#0', 'Root/6#0' ].includes( r.draftKey ) ) );
	assert.match( dropOutcome( null, new Map(), null ).outcome.reason, /holds no row/ );
} );

test( 'MUST FAIL: a block printing another element kind than the draft writes a tag row; the same kind writes none', () => {
	const calTags = ( b ) => ( { 'sgs/container': { '': 'div' }, 'sgs/brand-strip': { '': 'span' } }[ b ] );
	const tags = skeletonRunRows( { surface: 's', inventory, proposal, skeleton, calTags } ).filter( ( r ) => 'tag' === r.property );
	assert.deepEqual( tags.map( ( r ) => [ r.draftKey, r.draft, r.outcome.value ] ), [ [ 'Root/1#0', 'section', 'div' ] ] );
} );

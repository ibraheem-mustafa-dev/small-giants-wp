// A parent's read of an element a block inside it reads itself (lib/fill-child-held.mjs::childHeld): the accordion reads the
// open row at its calibrated child path, and the item reads the same draft element as its own root, so a property the
// accordion has no setting for there and the item met is the item's, settled `child-held` on the accordion, never two rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { childHeld } from '../lib/fill-child-held.mjs';
import { SETTLED } from '../lib/fill-report.mjs';

const ROW = '.c:nth-of-type(1)';
const st = ( o = {} ) => {
	const flat = [ { name: 'sgs/accordion', attributes: { className: 'cr-ref-p' } }, { name: 'sgs/accordion-item', attributes: { className: 'cr-ref-c' } } ];
	return {
		flat,
		nodes: [
			{ index: 0, name: 'sgs/accordion', parent: null, children: [ 1 ], targets: [ { slot: '', finder: { tpl: 'list' } }, { slot: ROW, finder: { tpl: o.rowFinder ?? 'row' } } ] },
			{ index: 1, name: 'sgs/accordion-item', parent: 0, children: [], targets: [ { slot: '', finder: { tpl: 'row' } } ] },
		],
		out: {
			writes: [ { node: 'cr-ref-c', slot: '', prop: 'border-top-width', attr: 'borderWidth' } ],
			unmapped: [
				{ node: 'cr-ref-p', slot: ROW, property: 'border-top-width', value: '2px', reason: 'no-setting: no border-top-width setting on sgs/accordion paints the row' },
				{ node: 'cr-ref-p', slot: ROW, property: 'opacity', value: '0.5', reason: 'no-setting: sgs/accordion has no setting for opacity' },
				{ node: 'cr-ref-p', slot: ROW, property: 'box-shadow', value: '4px', reason: 'conflict: itemShadow (one setting, two elements)' },
				{ node: 'cr-ref-c', slot: '', property: 'opacity', value: '0.5', reason: 'no-setting: sgs/accordion-item has no setting for opacity' },
				{ node: 'cr-ref-c', slot: '', property: 'box-shadow', value: '0px', reason: 'no-setting: sgs/accordion-item has no setting for box-shadow' },
				...( o.extra || [] ),
			],
			settled: [],
		},
	};
};

test( 'MUST FAIL WITHOUT THE PASS: a parent row at an inner block\'s own element, for a property that block met, is settled child-held naming the block', () => {
	const s = st();
	assert.equal( childHeld( s ), 2 );
	assert.deepEqual( s.out.unmapped.map( ( u ) => [ u.node, u.property ] ), [ [ 'cr-ref-p', 'box-shadow' ], [ 'cr-ref-c', 'opacity' ], [ 'cr-ref-c', 'box-shadow' ] ], 'a conflict row stays the parent\'s even where the item met the property, and the item keeps its own rows' );
	assert.deepEqual( s.out.settled.map( ( x ) => [ x.property, x.reason ] ), [ [ 'border-top-width', 'child-held' ], [ 'opacity', 'child-held' ] ] );
	assert.match( s.out.settled[ 0 ].detail, /sgs\/accordion-item cr-ref-c reads this draft element itself/ );
	assert.ok( SETTLED.includes( 'child-held' ), 'the report knows the reason' );
} );

test( 'negative control: a parent target at an element no inner block reads, or a property the inner block never met, keeps its row', () => {
	const other = st( { rowFinder: 'elsewhere' } );
	assert.equal( childHeld( other ), 0 );
	assert.equal( other.out.unmapped.length, 5 );
	const unmet = st( { extra: [ { node: 'cr-ref-p', slot: ROW, property: 'cursor', value: 'pointer', reason: 'no-setting: sgs/accordion has no setting for cursor' } ] } );
	childHeld( unmet );
	assert.ok( unmet.out.unmapped.some( ( u ) => 'cursor' === u.property && 'cr-ref-p' === u.node ) );
} );

// The general slot path of paint conservation (lib/skeleton-conserve-slots.mjs): an absorbed painted element is read at the
// host block's calibrated part slot that lands on it, recorded no-part where no setting of the calibration paints its looks,
// not-calibrated where the block has no calibration, and left unmatched (a proposal problem) where a setting paints a look of
// it but no slot reaches it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { partLooks, walkSlot, absorbedSlots } from '../lib/skeleton-conserve-slots.mjs';

const el = ( key, tag = 'div', kids = [] ) => ( { key, tag, kids } );
const kids = ( e ) => e.kids;
const finder = ( e ) => ( { tpl: e.key } );
const chipA = el( 'Root/3#0', 'button' );
const chipB = el( 'Root/3#1', 'button' );
const note = el( 'Root/4#0', 'span' );
const list = el( 'Root/2#0', 'div', [ chipA, chipB ] );
const host = el( 'Root/1#0', 'div', [ list ] );
const SETTINGS = {
	pillBg: { slot: '.options > .option:nth-of-type(2)', property: 'background-color', state: null },
	pillSelectedBg: { slot: '.options > .option:nth-of-type(1)', property: 'background-color', state: 'current' },
	pillHover: { slot: '.options > .option:nth-of-type(3)', property: 'border-color', state: 'hover' },
	glow: { slot: '::before', property: 'background-image', state: null },
	gap: { slot: '', property: 'gap', state: null },
	size: { slot: '.options > .option:nth-of-type(1)', property: 'font-size', state: null },
};

test( 'partLooks keeps the part slots that paint at rest or as the current item, never the root, a pseudo-element or a hover', () => {
	const parts = partLooks( SETTINGS );
	assert.deepEqual( [ ...parts.keys() ].sort(), [ '.options > .option:nth-of-type(1)', '.options > .option:nth-of-type(2)' ] );
	assert.deepEqual( [ ...parts.get( '.options > .option:nth-of-type(1)' ) ], [ 'background' ] );
} );

test( 'walkSlot follows nth-of-type to the k-th child and a lone step to the only child, and stops where the draft cannot follow', () => {
	assert.equal( walkSlot( '.options > .option:nth-of-type(2)', host, kids ), chipB );
	assert.equal( walkSlot( '.options > .option:nth-of-type(3)', host, kids ), null );
	assert.equal( walkSlot( '.option', list, kids ), null, 'a lone step over two children is no element' );
} );

test( 'absorbedSlots reads each chip at the slot that lands on it (MUST FAIL with no slot path), and records or leaves the rest', () => {
	const absorbed = [ { element: chipA, looks: [ 'background', 'radius' ] }, { element: chipB, looks: [ 'background' ] } ];
	const made = absorbedSlots( { host, node: {}, absorbed, kids, finder, settings: SETTINGS, block: 'sgs/option-picker', checked: 'cache/option-picker.json' } );
	assert.deepEqual( made.slots, { '.options > .option:nth-of-type(2)': { tpl: 'Root/3#1' }, '.options > .option:nth-of-type(1)': { tpl: 'Root/3#0' } } );
	assert.equal( made.records.size, 0 );
	// A slot the node already holds is not taken again, and a slot whose settings paint none of the element's looks reads nothing.
	const held = absorbedSlots( { host, node: { draftSlots: { '.options > .option:nth-of-type(1)': { tpl: 'Root/9#0' } } }, absorbed, kids, finder, settings: SETTINGS, block: 'sgs/option-picker', checked: 'c' } );
	assert.deepEqual( Object.keys( held.slots ), [ '.options > .option:nth-of-type(2)' ] );
	assert.deepEqual( held.unmatched.map( ( u ) => u.key ), [ 'Root/3#0' ], 'the chip whose look a setting paints is left for a finder' );
	const shadow = absorbedSlots( { host, node: {}, absorbed: [ { element: chipB, looks: [ 'shadow' ] } ], kids, finder, settings: SETTINGS, block: 'sgs/option-picker', checked: 'c' } );
	assert.deepEqual( [ shadow.slots, shadow.records.get( 'Root/3#1' ) ], [ {}, { kind: 'no-part', block: 'sgs/option-picker', looks: [ 'shadow' ], checked: 'c' } ], 'no setting paints a shadow: no-part' );
	// A tag the calibration records for the slot must be the element's.
	const tagged = absorbedSlots( { host, node: {}, absorbed, kids, finder, settings: SETTINGS, tags: { '.options > .option:nth-of-type(2)': 'A' }, block: 'b', checked: 'c' } );
	assert.ok( ! tagged.slots[ '.options > .option:nth-of-type(2)' ] );
} );

test( 'a look a hover or pseudo setting paints is no no-part, and a block with no calibration is not-calibrated', () => {
	const border = absorbedSlots( { host, node: {}, absorbed: [ { element: note, looks: [ 'border' ] } ], kids, finder, settings: SETTINGS, block: 'b', checked: 'c' } );
	assert.deepEqual( [ border.records.size, border.unmatched[ 0 ].key ], [ 0, 'Root/4#0' ] );
	const none = absorbedSlots( { host, node: {}, absorbed: [ { element: note, looks: [ 'border' ] } ], kids, finder, settings: {}, block: 'b', checked: 'c' } );
	assert.deepEqual( none.records.get( 'Root/4#0' ), { kind: 'not-calibrated', block: 'b', looks: [ 'border' ] } );
} );

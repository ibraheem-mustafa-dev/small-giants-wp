// An accordion whose draft opens no item at load (lib/skeleton-child-slots.mjs::unitSlots with `revealed`, Spec 48 FR-48-6):
// the open unit's parts (its row and answer, read for the open item's settings) exist only in the state that opens it, which
// the inventory read and kept in `revealed` (each record with the `reveal` { component, keys } that shows it). The open unit is
// the first unit holding exactly one revealed panel of a state setting its own toggle key alone; each current path carries
// that state (`reveals`), which reaches Fill as the node's draftSlotReveals and each target's `reveal`
// (lib/fill-skeleton.mjs::skeletonNodes, lib/fill-read.mjs::jobsFor). Real case: a product page's four "Good to know"
// questions, all closed at load, whose answers' padding was a state-only paint conservation problem.
import test from 'node:test';
import assert from 'node:assert/strict';
import { unitSlots } from '../lib/skeleton-child-slots.mjs';
import { skeletonNodes, skeletonProblems, cleanTree } from '../lib/fill-skeleton.mjs';
import { jobsFor } from '../lib/fill-read.mjs';

const box = ( w, h ) => ( { 375: null, 768: null, 1440: { x: 0, y: 0, w, h } } );
const el = ( key, extra = {} ) => ( { key, tag: 'span', box: box( 200, 40 ), visible: { 1440: true }, words: '', srcOwnText: '', ...extra } );
// Two closed units on toggle key `acc`, each a control holding a 36px ring.
const mk = ( i ) => {
	const unit = el( `Root/493#${ i }`, { tag: 'div' } );
	const control = el( `Root/494#${ i }`, { tag: 'button', box: box( 470, 77 ), parentKey: unit.key } );
	const ring = el( `Root/496#${ i }`, { box: box( 36, 36 ), words: '+', srcOwnText: '+', parentKey: control.key } );
	return { u: { el: unit, control, rendered: [], key: 'acc' }, els: [ unit, control, ring ] };
};
const a = mk( 0 );
const b = mk( 1 );
const els = [ ...a.els, ...b.els ];
const byKey = Object.fromEntries( els.map( ( e ) => [ e.key, e ] ) );
const m = { byKey, kids: ( e ) => els.filter( ( x ) => x.parentKey === e.key ) };
const finder = ( e ) => ( { tpl: e.key } );
const ONE = '.c:nth-of-type(1)';
const TWO = '.c:nth-of-type(2)';
const settings = {
	headerFontWeight: { slot: `${ TWO } > .header` },
	itemBackgroundOpen: { slot: ONE, slots: [ ONE ] },
	headerPadding: { slot: `${ ONE } > .header`, slots: [ `${ ONE } > .header`, `${ TWO } > .header` ] },
	contentPadding: { slot: `${ ONE } > .content`, slots: [ `${ ONE } > .content`, `${ TWO } > .content` ] },
};
const cfg = {
	currentState: 'open',
	resting: 'headerFontWeight',
	current: 'itemBackgroundOpen',
	parts: [
		{ part: 'header', child: 'resting', setting: 'headerPadding' },
		{ part: 'row', child: 'current', setting: 'itemBackgroundOpen' },
		{ part: 'answer', child: 'current', setting: 'contentPadding' },
	],
};
const OPEN = { component: 'Root', keys: { acc: { 0: true, 1: true } } };
const answer = ( i, reveal = OPEN, parentKey = `Root/493#${ i }` ) => ( { key: `Root/498#${ i }`, parentKey, tag: 'div', reveal } );
const run = ( revealed, o = {} ) => unitSlots( { cfg, units: [ a.u, b.u ], open: [], m, finder, settings, revealed, ...o } );

test( 'MUST FAIL WITHOUT THE REVEALED UNIT: with no unit open at load, the first unit the revealed state opens gives the current row and answer, each path carrying that state', () => {
	const r = run( [ answer( 0 ), answer( 1 ) ] );
	assert.deepEqual( r.slots[ ONE ], { tpl: 'Root/493#0' } );
	assert.deepEqual( r.slots[ `${ ONE } > .content` ], { tpl: 'Root/498#0' }, 'the answer is the revealed panel' );
	assert.deepEqual( r.reveals, { [ ONE ]: OPEN, [ `${ ONE } > .content` ]: OPEN } );
	assert.deepEqual( r.states, { [ ONE ]: 'open', [ `${ ONE } > .content` ]: 'open' } );
	assert.deepEqual( r.slots[ `${ TWO } > .header` ], { tpl: 'Root/494#0' }, 'the resting parts are the closed unit\'s, read at load' );
	assert.doesNotMatch( r.notes.join( ' ' ), /no open unit/ );
	// An element inside the revealed panel is the panel's, never a second panel.
	const nested = run( [ answer( 0 ), { key: 'Root/499#0', parentKey: 'Root/498#0', tag: 'p', reveal: OPEN } ] );
	assert.deepEqual( nested.slots[ `${ ONE } > .content` ], { tpl: 'Root/498#0' } );
} );

test( 'negative control: a unit open at load is the current unit, and no path carries a state to set', () => {
	const shown = { ...a.u, rendered: [ el( 'Root/498#0', { parentKey: 'Root/493#0' } ) ] };
	const r = unitSlots( { cfg, units: [ shown, b.u ], open: [ 0 ], m, finder, settings, revealed: [ answer( 1 ) ] } );
	assert.deepEqual( r.slots[ `${ ONE } > .content` ], { tpl: 'Root/498#0' } );
	assert.deepEqual( r.reveals, {} );
} );

test( 'negative control: a revealed element of a state that sets another key too, or outside every unit, or two in one unit, opens no unit', () => {
	const mixed = { component: 'Root', keys: { acc: { 0: true }, curSwatch: 1 } };
	for ( const revealed of [ [ answer( 0, mixed ) ], [ answer( 0, OPEN, 'Root/1#0' ) ], [ answer( 0 ), { ...answer( 0 ), key: 'Root/499#0' } ], [ answer( 0, { keys: { acc: true } } ) ] ] ) {
		const r = run( revealed );
		assert.equal( undefined, r.slots[ `${ ONE } > .content` ], JSON.stringify( revealed ) );
		assert.deepEqual( r.reveals, {} );
		assert.match( r.notes.join( ' ' ), /no open unit, so no current child's parts/ );
	}
	// A unit with no toggle key is never opened by a state.
	const keyless = unitSlots( { cfg, units: [ { ...a.u, key: undefined }, { ...b.u, key: undefined } ], open: [], m, finder, settings, revealed: [ answer( 0 ) ] } );
	assert.deepEqual( keyless.reveals, {} );
} );

test( 'MUST FAIL WITHOUT THE TARGET REVEAL: a node\'s draftSlotReveals reaches its slot\'s target and job, no other target carries one, and cleanTree strips it', () => {
	const tree = [ { name: 'sgs/accordion', draftRef: { tpl: 'Root/490#0' }, draftSlots: { [ ONE ]: { tpl: 'Root/493#0' }, [ TWO ]: { tpl: 'Root/493#1' } }, draftSlotReveals: { [ ONE ]: OPEN }, attributes: {}, innerBlocks: [] } ];
	const nodes = skeletonNodes( tree );
	const t = Object.fromEntries( nodes[ 0 ].targets.map( ( x ) => [ x.slot, x ] ) );
	assert.deepEqual( t[ ONE ].reveal, OPEN );
	assert.equal( undefined, t[ TWO ].reveal );
	assert.equal( undefined, t[ '' ].reveal );
	const jobs = Object.fromEntries( jobsFor( nodes ).map( ( j ) => [ j.id, j ] ) );
	assert.deepEqual( jobs[ `0:${ ONE }` ].reveal, OPEN );
	assert.equal( undefined, jobs[ `0:${ TWO }` ].reveal );
	assert.deepEqual( skeletonProblems( tree ), [] );
	assert.ok( ! JSON.stringify( cleanTree( tree ) ).includes( 'draftSlotReveals' ) );
} );

test( 'negative control: a draftSlotReveals entry naming no draftSlots path, or no component and keys, is a problem', () => {
	const tree = [ { name: 'sgs/accordion', draftRef: { tpl: 'Root/490#0' }, draftSlots: { [ ONE ]: { tpl: 'Root/493#0' } }, draftSlotReveals: { '.nowhere': OPEN, [ ONE ]: { keys: {} } }, attributes: {}, innerBlocks: [] } ];
	const p = skeletonProblems( tree ).join( '\n' );
	assert.match( p, /draftSlotReveals "\.nowhere" must name a draftSlots path/ );
	assert.match( p, /draftSlotReveals "\.c:nth-of-type\(1\)" must name a draftSlots path and the state that shows it/ );
} );

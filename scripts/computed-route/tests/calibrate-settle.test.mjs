// FR-47-2: a block's calibration holds one page's readings at a time. Each marked instance is settled as its page is read
// (lib/calibrate-block.mjs::settleInstance, passed to lib/calibrate-pages.mjs::measurePages as `settle`): it keeps the slot
// slotFor finds, or a discovery instance's effects, and drops its readings. Holding every marked reading until the block's
// file was written outgrew the run's 8 GB heap on sgs/nav-bar-menu (1,200 instances x 416 elements x 139 properties x 3
// widths, 2026-11-21). Each MUST FAIL test turns red under a mutation in tests/calibrate-settle.mutations.json
// (python E:\sgs-tmp\general-cloning\mutate_slow.py scripts\computed-route tests\calibrate-settle.mutations.json tests/calibrate-settle.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { settleInstance } from '../lib/calibrate-block.mjs';
import { slotFor, discoverEffects } from '../lib/calibrate.mjs';

const W3 = ( f ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, f( w ) ] ) );
const DEF = W3( () => ( { '': { color: 'rgb(0, 0, 0)', 'background-color': 'rgba(0, 0, 0, 0)' }, 'span': { color: 'rgb(0, 0, 0)' } } ) );
const READ = W3( ( w ) => ( { '': { color: 'rgb(255, 0, 0)', 'background-color': 1440 === w ? 'rgb(1, 2, 3)' : 'rgba(0, 0, 0, 0)' }, 'span': { color: 'rgb(255, 0, 0)' } } ) );
const SCROLLED = W3( () => ( { '': { color: 'rgb(0, 255, 0)', 'background-color': 'rgba(0, 0, 0, 0)' }, 'span': { color: 'rgb(0, 0, 0)' } } ) );
const row = { attr_name: 'navColour', css_property: 'color', tier_shape: null, css_state: null };
const marker = { label: 'hex', attrs: {}, expect: 'rgb(255, 0, 0)' };
const inst = ( o = {} ) => ( { key: 'k', row, marker, trigger: undefined, read: READ, def: DEF, readScrolled: {}, defScrolled: {}, hoverMissed: false, ...o } );
const opts = { block: 'sgs/x', containerQuery: false };
const readings = [ 'read', 'def', 'readScrolled', 'defScrolled' ];

test( 'MUST FAIL: a settled marked instance holds its slot and none of its readings', () => {
	const s = settleInstance( inst(), opts );
	assert.deepEqual( readings.filter( ( k ) => Object.hasOwn( s, k ) ), [] );
	assert.deepEqual( s.slot, slotFor( row, marker, DEF, READ, { containerQuery: false, own: null } ) );
	assert.equal( s.slot.slot, '' );
	assert.equal( s.hoverMissed, false, 'what foldMeasured reads besides the readings stays' );
} );

test( 'MUST FAIL: a scrolled marker is settled on its scrolled readings, and a container-query block keeps its tier flag', () => {
	const s = settleInstance( inst( { trigger: 'scroll', row: { ...row, css_state: 'scrolled' }, marker: { ...marker, expect: 'rgb(0, 255, 0)' }, readScrolled: SCROLLED, defScrolled: DEF } ), opts );
	assert.deepEqual( s.slot.slots, [ '' ] );
	assert.deepEqual( s.slot.reaches, [ '' ], 'the scrolled reading changes the root only; the resting one reaches the span too' );
	assert.equal( s.slot.reachedAt.length, 3 );
	const tier = { ...row, attr_name: 'bg', css_property: 'background-color', tier_shape: 'tier_object' };
	const cq = settleInstance( inst( { row: tier, marker: { label: 'hex', attrs: {}, expect: 'rgb(1, 2, 3)' } } ), { block: 'sgs/x', containerQuery: true } );
	assert.equal( cq.slot.containerTier, true );
	assert.equal( cq.slot.oneWidth, false );
	assert.equal( settleInstance( inst( { row: tier, marker: { label: 'hex', attrs: {}, expect: 'rgb(1, 2, 3)' } } ), opts ).slot.oneWidth, true );
} );

test( 'MUST FAIL: a discovery instance keeps what its value paints and drops its readings', () => {
	const s = settleInstance( inst( { row: undefined, marker: undefined, discover: { attr: 'mode', value: 'a' } } ), opts );
	assert.deepEqual( s.effects, discoverEffects( DEF, READ ) );
	assert.deepEqual( readings.filter( ( k ) => Object.hasOwn( s, k ) ), [] );
} );

test( 'negative control: a default, paint-state or content instance keeps its readings (the default paint and the content read)', () => {
	for ( const o of [ { isDefault: true }, { paintState: { name: 'p' } }, { content: { attr: 'x' } } ] ) {
		const i = inst( o );
		assert.equal( settleInstance( i, opts ), i );
	}
} );

// A setting that paints two properties (`height,width`: tileCheckSize, 30 such settings) is a candidate for a row on either one
// (lib/resolve.mjs::resolve reads the record entry's `properties`, lib/css-families.mjs::paintedProps). Real framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve, resolveViaAncestor } from '../lib/resolve.mjs';
import { paintedProps } from '../lib/css-families.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const SLOT = '.sgs-form-tile__check';
const at = ( v ) => ( { 375: v, 768: v, 1440: v } );
const run = ( prop, entry, siblings = {} ) => resolve( { block: 'sgs/form-field-tiles', slot: SLOT, prop, perWidth: at( '24px' ), siblings }, { db, snapshot, calibration: { settings: { tileCheckSize: { slot: SLOT, slots: [ SLOT ], state: null, forms: [], reachedAt: [ 375, 768, 1440 ], effects: [], tiers: [ [] ], ...entry } } } } );

test( 'paintedProps names every property of a multi-property entry, else its one property, else none', () => {
	assert.deepEqual( paintedProps( { property: 'height', properties: [ 'height', 'width' ] } ), [ 'height', 'width' ] );
	assert.deepEqual( paintedProps( { property: 'color' } ), [ 'color' ] );
	assert.deepEqual( paintedProps( { slot: '' } ), [] );
} );

test( 'MUST FAIL: a width row finds the setting whose record entry paints height and width, and so does a height row', () => {
	for ( const prop of [ 'width', 'height' ] ) {
		const r = run( prop, { property: 'height', properties: [ 'height', 'width' ] } );
		assert.equal( r.writes?.[ 0 ]?.attr, 'tileCheckSize', `${ prop }: ${ r.gap ?? '' } ${ r.detail ?? '' }` );
	}
} );

test( 'negative control: an entry that lists only height is no candidate for a width row', () => {
	const r = run( 'width', { property: 'height' } );
	assert.equal( r.writes, undefined );
	assert.equal( r.gap, 'no-setting' );
} );

const BOTH = { property: 'height', properties: [ 'height', 'width' ] };

test( 'MUST FAIL: a width row is not tied to a height,width setting when the draft gives the height as something else', () => {
	for ( const other of [ 'auto', '48px' ] ) {
		const r = run( 'width', BOTH, { height: at( other ) } );
		assert.equal( r.writes, undefined, `height ${ other }: tied ${ r.writes?.[ 0 ]?.attr }` );
		assert.equal( r.gap, 'no-setting' );
	}
} );

test( 'a width row still finds the height,width setting when the draft height is the same size, or unread', () => {
	for ( const siblings of [ { height: at( '24px' ) }, {}, { height: { 375: '24px' } } ] ) {
		assert.equal( run( 'width', BOTH, siblings ).writes?.[ 0 ]?.attr, 'tileCheckSize' );
	}
} );

test( 'a row on a non-size property never reads the other painted sizes', () => {
	const r = resolve( { block: 'sgs/form-field-tiles', slot: SLOT, prop: 'color', perWidth: at( 'rgb(0, 0, 0)' ), siblings: { height: at( '48px' ) } }, { db, snapshot, calibration: { settings: { tileCheckColour: { slot: SLOT, slots: [ SLOT ], state: null, forms: [], reachedAt: [ 375, 768, 1440 ], effects: [], tiers: [ [] ], property: 'color', properties: [ 'color', 'height' ] } } } } );
	assert.notEqual( 'no-setting', r.gap, r.detail );
} );

const hop = ( siblings ) => resolveViaAncestor( { block: 'sgs/heading', slot: '', prop: 'width', state: null, perWidth: at( '24px' ), siblings },
	{ db, snapshot, canvas: true, measuredSlots: [ SLOT ], ancestors: [ { ref: 'a', block: 'sgs/form-field-tiles', path: SLOT, tag: 'span', attributes: {}, calibration: { settings: { tileCheckSize: { slot: SLOT, slots: [ SLOT ], reaches: [ SLOT ], state: null, ...BOTH } } } } ] } );

test( 'MUST FAIL: the ancestor hop proves a height,width setting for a width row only when the draft height agrees', () => {
	assert.equal( hop( { height: at( '24px' ) } ).cite.via, 'calibration' );
	assert.equal( hop( { height: at( 'auto' ) } ).cite.via, 'declared', 'a draft height of auto is not what the setting paints' );
} );

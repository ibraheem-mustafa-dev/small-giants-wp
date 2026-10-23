// Which device tiers Fill writes (lib/fill-prop.mjs::tiersDiffering): an empty narrower tier shows a wider written value only
// where the block's calibrated default paint of the property is the same at both widths (lib/fill-held.mjs::paintedAt);
// where the block keeps a fallback of its own at the narrower width, the draft's value there is written explicitly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tiersDiffering, resolveProperty } from '../lib/fill-prop.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
// A block whose own stylesheet paints an 8px gap on a phone and 12px from 768 up.
const fallback = ( w ) => ( w < 768 ? '8px' : '12px' );

test( 'MUST FAIL: a desktop value does not carry down to a tier where the block\'s default paint changes; that tier is written', () => {
	assert.deepEqual( tiersDiffering( 'column-gap', { 1440: '10px', 768: '10px', 375: '10px' }, fallback, fallback ), { 1440: '10px', 375: '10px' } );
} );

test( 'MUST FAIL: the nearest wider written tier is the one judged, and a tablet value stops at the width where the default changes', () => {
	assert.deepEqual( tiersDiffering( 'column-gap', { 1440: '10px', 768: '14px', 375: '14px' }, fallback, fallback ), { 1440: '10px', 768: '14px', 375: '14px' } );
} );

test( 'a tablet value carries to mobile where the default paint is the same at those two widths, whatever desktop paints', () => {
	const wide = ( w ) => ( w < 1024 ? '8px' : '12px' );
	assert.deepEqual( tiersDiffering( 'column-gap', { 1440: '10px', 768: '14px', 375: '14px' }, wide, wide ), { 1440: '10px', 768: '14px' } );
} );

test( 'where calibration did not measure the property at every tier width nothing stops the carry, so the wider value carries down', () => {
	assert.deepEqual( tiersDiffering( 'column-gap', { 1440: '10px', 768: '10px', 375: '10px' }, () => '0px', () => undefined ), { 1440: '10px' } );
	assert.deepEqual( tiersDiffering( 'column-gap', { 1440: '10px', 768: '10px', 375: '10px' }, () => '0px', ( w ) => ( 375 === w ? undefined : '0px' ) ), { 1440: '10px' } );
} );

test( 'a narrower tier the block\'s fallback already paints at the draft value stays unwritten', () => {
	assert.deepEqual( tiersDiffering( 'column-gap', { 1440: '10px', 768: '10px', 375: '8px' }, fallback, fallback ), { 1440: '10px' } );
} );

test( 'where the default paint is the same at both widths the wider value carries and the narrower tier is not written', () => {
	const flat = () => '12px';
	assert.deepEqual( tiersDiffering( 'column-gap', { 1440: '10px', 768: '10px', 375: '10px' }, flat, flat ), { 1440: '10px' } );
	assert.deepEqual( tiersDiffering( 'column-gap', { 1440: '10px', 768: '10px', 375: '12px' }, flat, flat ), { 1440: '10px', 375: '12px' }, 'a return to the default under a carried value is written' );
} );

test( 'MUST FAIL: resolveProperty judges the carry by the block\'s calibrated paint at the slot, so a uniform draft gap writes the mobile tier too, whatever the baseline', () => {
	const paint = { 375: { 'column-gap': '8px', gap: '8px' }, 768: { 'column-gap': '12px', gap: '12px' }, 1440: { 'column-gap': '12px', gap: '12px' } };
	const calibration = { elements: { '': paint }, settings: { gap: { slot: '', slots: [ '' ], reaches: [ '' ], property: 'gap', state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } } };
	const r = resolveProperty( { node: { attributes: {} }, block: 'sgs/multi-button', prop: 'gap', draft: { 1440: '10px', 768: '10px', 375: '10px' }, baseline: () => '12px', slots: [ '' ], calibration, db, snapshot, log: [] } );
	assert.equal( r.status, 'written' );
	assert.deepEqual( r.included, { 1440: '10px', 375: '10px' } );
} );

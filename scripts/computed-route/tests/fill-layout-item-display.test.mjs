// A layout setting calibration discovered painting `display` is asked at the element laying out the block's children, never
// at one copy of a repeated item (lib/fill-resolve-state.mjs::alternateSlots). Indus's "How to open a trade account" steps are a
// three-column grid; process steps' `list` layout paints each step `display: grid`, so the root's grid was written as the
// vertical list layout (2026-11-19).
import test from 'node:test';
import assert from 'node:assert/strict';
import { alternateSlots } from '../lib/fill-resolve-state.mjs';

const ITEM = ( n ) => `.sgs-process-steps__step:nth-of-type(${ n })`;
const cal = { discovered: {
	layout: { display: { slots: [ ITEM( 1 ), ITEM( 2 ), ITEM( 3 ) ], values: { list: { 1440: 'grid' } } } },
	columns: { display: { slots: [ '.sgs-x__grid' ], values: { grid: { 1440: 'grid' } } } },
} };

test( 'MUST FAIL: a repeated item\'s display is never an alternate slot for the read element\'s display', () => {
	assert.deepEqual( alternateSlots( cal, 'display', { 1440: 'grid' } ), [ '.sgs-x__grid' ] );
} );

test( 'negative control: the element laying out the children stays an alternate, and a hide keeps none', () => {
	assert.ok( alternateSlots( cal, 'display', { 1440: 'grid' } ).includes( '.sgs-x__grid' ) );
	assert.deepEqual( alternateSlots( cal, 'display', { 375: 'none', 1440: 'grid' } ), [] );
	assert.deepEqual( alternateSlots( { discovered: { a: { display: { slots: [ '.inner:nth-of-type(2) > .grid' ] } } } }, 'display', { 1440: 'flex' } ), [ '.inner:nth-of-type(2) > .grid' ], 'an element inside an item is not the item' );
} );

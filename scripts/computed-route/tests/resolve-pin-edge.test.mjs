// A draft's `position: sticky` is written to a pin setting as the edge its offset names (lib/resolve-enum.mjs::pinEdges, called from
// lib/resolve.mjs::resolve): sgs/container's `pinEdge` lists "", none, top and bottom, and the block's pin CSS
// (includes/container-pin-edge-css.php) ignores any other value, so a written "sticky" pinned nothing. A sticky element with
// neither top nor bottom set has no edge to pin to: no write, a shape row. Real block schema and framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const run = ( perWidth, siblings ) => resolve( { block: 'sgs/container', slot: '', prop: 'position', perWidth, siblings },
	{ db, snapshot, calibration: { settings: { pinEdge: { slot: '', property: 'position' } } } } );
const sticky = { 375: 'static', 768: 'sticky', 1440: 'sticky' };

test( 'MUST FAIL: a sticky element is written the edge its offset names, a static tier as none', () => {
	const r = run( sticky, { top: { 375: 'auto', 768: '16px', 1440: '24px' }, bottom: { 375: 'auto', 768: 'auto', 1440: 'auto' } } );
	assert.deepEqual( r.writes, [ { attr: 'pinEdge', value: { mobile: 'none', tablet: 'top', desktop: 'top' }, merge: 'deep' } ] );
} );

test( 'MUST FAIL: a sticky element with only a bottom offset is pinned to the bottom', () => {
	const r = run( { 1440: 'sticky' }, { top: { 1440: 'auto' }, bottom: { 1440: '12px' } } );
	assert.deepEqual( r.writes?.[ 0 ]?.value, { desktop: 'bottom' } );
} );

test( 'MUST FAIL: a sticky element with neither offset set is not written', () => {
	const r = run( { 1440: 'sticky' }, { top: { 1440: 'auto' }, bottom: { 1440: 'auto' } } );
	assert.equal( r.writes, undefined );
	assert.equal( r.gap, 'shape' );
	assert.match( r.detail, /names no edge/ );
	assert.equal( run( { 1440: 'sticky' }, {} ).writes, undefined );
} );

// A position the pin cannot hold is a row, never written raw; a tier the draft leaves unpinned is none.
test( 'negative control: a fixed element is no pin edge and is not written raw', () => {
	const r = resolve( { block: 'sgs/container', slot: '', prop: 'position', perWidth: { 1440: 'fixed' }, siblings: { top: { 1440: '0px' } } },
		{ db, snapshot, calibration: { settings: { pinEdge: { slot: '', property: 'position' } } } } );
	assert.equal( r.writes, undefined, 'fixed is no pin edge' );
} );

test( 'negative control: a draft that leaves every tier static is written none, never sticky', () => {
	assert.deepEqual( run( { 375: 'static', 768: 'relative', 1440: 'static' }, {} ).writes?.[ 0 ]?.value, { mobile: 'none', tablet: 'none', desktop: 'none' } );
} );

// A size a setting cannot hold in its own shape stays a row instead of being written (lib/resolve-declared.mjs::sizeShape, called
// from lib/resolve.mjs::formatValue): a count per device (the brand strip's columns, painted into max-width as a formula) takes
// neither a keyword nor a length, and a floor of nothing (min-height 0) is no number a bare-number setting holds. Real block
// schemas and the real framework DB; the calibration is the setting's recorded slot and property.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { sizeShape } from '../lib/resolve-declared.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const run = ( block, attr, prop, value ) => resolve( { block, slot: '', prop, perWidth: { 375: value, 768: value, 1440: value } },
	{ db, snapshot, calibration: { settings: { [ attr ]: { slot: '', property: prop } } } } );

test( 'MUST FAIL: a count per device is never written a keyword or a length for a size property', () => {
	for ( const value of [ 'none', '1200px', 'max-content' ] ) {
		const r = run( 'sgs/brand-strip', 'columns', 'max-width', value );
		assert.equal( r.writes, undefined, `max-width ${ value } was written: ${ JSON.stringify( r.writes ) }` );
		assert.equal( r.gap, 'shape' );
		assert.match( r.detail, new RegExp( `^${ value } cannot be held` ) );
	}
} );

test( 'MUST FAIL: a floor of nothing is not written to a setting that stores a bare number', () => {
	for ( const value of [ '0px', '0', '0.0px' ] ) {
		const r = run( 'sgs/brand-strip', 'maxHeight', 'min-height', value );
		assert.equal( r.writes, undefined, `min-height ${ value } was written: ${ JSON.stringify( r.writes ) }` );
		assert.equal( r.gap, 'shape' );
		assert.match( r.detail, /no floor/ );
	}
} );

// Negative controls: what the rule must leave as it was.
test( 'a floor above nothing is still written to the number setting, as the plain number', () => {
	assert.deepEqual( run( 'sgs/brand-strip', 'maxHeight', 'min-height', '120px' ).writes, [ { attr: 'maxHeight', value: 120, merge: 'replace' } ] );
} );

test( 'a floor of nothing is still written to a tier-object length setting (it holds "0px")', () => {
	assert.deepEqual( run( 'sgs/container', 'minHeight', 'min-height', '0px' ).writes?.[ 0 ]?.value, { mobile: '0px', tablet: '0px', desktop: '0px' } );
} );

test( 'a ceiling keyword still reaches a length tier object, and a count setting still takes a count', () => {
	assert.deepEqual( run( 'sgs/container', 'maxWidth', 'max-width', 'none' ).writes?.[ 0 ]?.value, { mobile: 'none', tablet: 'none', desktop: 'none' } );
	assert.equal( sizeShape( { prop: 'max-width', raw: 'none', def: { type: 'object', default: {} } } ), null );
	assert.equal( sizeShape( { prop: 'font-size', raw: '12px', def: { type: 'object', default: { desktop: 12 } } } ), null );
	assert.equal( sizeShape( { prop: 'min-height', raw: '0px', def: { type: 'string' } } ), null );
	assert.equal( sizeShape( { prop: 'max-height', raw: '0px', def: { type: 'number' } } ), null );
	assert.equal( sizeShape( { prop: 'min-height', raw: '48px', def: { type: 'number' } } ), null );
	assert.equal( sizeShape( { prop: 'min-height', raw: '0px', def: { type: [ 'number', 'string' ] } } ), null );
	assert.equal( sizeShape( { prop: 'min-height', raw: '0px', def: { type: [ 'number', 'object' ] } } ), null );
	assert.equal( sizeShape( { prop: 'min-height', raw: '0px', def: { type: 'number' } } ).error.startsWith( '0px cannot be held' ), true );
} );

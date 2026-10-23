// R6: a size keyword (none, auto, fit-content, min-content, max-content) is written to a size-family setting whose emitter
// prints it (lib/resolve-declared.mjs::sizeKeyword, called from lib/resolve.mjs::formatValue), and refused by a setting whose
// emitter stores a number (a unit partner, a number type) or by a property that does not take it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { sizeKeyword } from '../lib/resolve-declared.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const SIZE_PROPS = [ 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height' ];
const keywordFor = ( prop ) => ( prop.startsWith( 'max-' ) ? 'none' : 'auto' );
const run = ( block, attr, prop, value ) => resolve( { block, slot: '', prop, perWidth: { 375: value, 768: value, 1440: value } },
	{ db, snapshot, calibration: { settings: { [ attr ]: { slot: '', property: prop } } } } );

test( 'MUST FAIL: max-width none is written to a tier-object ceiling at every tier', () => {
	const r = run( 'sgs/container', 'maxWidth', 'max-width', 'none' );
	assert.deepEqual( r.writes, [ { attr: 'maxWidth', value: { mobile: 'none', tablet: 'none', desktop: 'none' }, merge: 'deep' } ] );
} );

test( 'MUST FAIL: every size keyword reaches a tier-object setting of a property that takes it', () => {
	for ( const [ prop, attr, words ] of [ [ 'max-width', 'maxWidth', [ 'none', 'fit-content', 'min-content', 'max-content' ] ], [ 'min-height', 'minHeight', [ 'auto', 'fit-content', 'min-content', 'max-content' ] ] ] ) {
		for ( const w of words ) {
			assert.deepEqual( run( 'sgs/container', attr, prop, w ).writes?.[ 0 ]?.value, { mobile: w, tablet: w, desktop: w }, `${ prop } ${ w }` );
		}
	}
} );

test( 'MUST FAIL: a keyword the property does not take is a shape gap, never written', () => {
	for ( const [ prop, attr, w ] of [ [ 'min-height', 'minHeight', 'none' ], [ 'max-width', 'maxWidth', 'auto' ] ] ) {
		const r = run( 'sgs/container', attr, prop, w );
		assert.equal( r.writes, undefined );
		assert.equal( r.gap, 'shape' );
		assert.match( r.detail, new RegExp( `^${ w } cannot be held` ) );
	}
} );

test( 'a setting that stores a number beside a unit refuses the keyword (the logo ceiling the render strips to digits)', () => {
	for ( const [ block, attr, prop ] of [ [ 'sgs/responsive-logo', 'maxWidth', 'max-width' ], [ 'sgs/media', 'maxHeight', 'max-height' ], [ 'sgs/heading', 'customWidth', 'width' ] ] ) {
		const r = run( block, attr, prop, keywordFor( prop ) );
		assert.equal( r.gap, 'shape', `${ block } ${ attr }` );
		assert.match( r.detail, /cannot be held/ );
	}
} );

test( 'a measured length is formatted as before (a negative control for the keyword branch)', () => {
	assert.deepEqual( run( 'sgs/container', 'maxWidth', 'max-width', '1200px' ).writes, [ { attr: 'maxWidth', value: { mobile: '1200px', tablet: '1200px', desktop: '1200px' }, merge: 'deep' } ] );
	assert.equal( sizeKeyword( { prop: 'max-width', raw: '1200px', def: { type: 'object' } } ), null );
	assert.equal( sizeKeyword( { prop: 'color', raw: 'none', def: { type: 'string' } } ), null );
} );

test( 'MUST FAIL: logical size properties follow their physical form', () => {
	assert.deepEqual( sizeKeyword( { prop: 'max-inline-size', raw: 'none', def: { type: 'object' } } ), { value: 'none' } );
	assert.equal( sizeKeyword( { prop: 'min-block-size', raw: 'none', def: { type: 'object' } } ).error?.startsWith( 'none cannot be held' ), true );
	assert.deepEqual( sizeKeyword( { prop: 'inline-size', raw: 'Fit-Content', def: { type: 'string' } } ), { value: 'fit-content' } );
} );

// The variant list: every size-family setting in the framework DB, with the outcome the emitter rule predicts from the
// schema alone (a tier object or a string with no unit partner and no enum prints a keyword; any other shape refuses it).
test( 'MUST FAIL: every size-family setting in the DB writes or refuses its keyword as its shape says', () => {
	const rows = db.prepare( `SELECT block_slug, attr_name, attr_type, css_property, enum_values FROM block_attributes WHERE css_property IN (${ SIZE_PROPS.map( () => '?' ).join( ',' ) })` ).all( ...SIZE_PROPS );
	const unit = db.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' );
	let written = 0;
	let refused = 0;
	for ( const r of rows ) {
		if ( r.enum_values ) {
			continue;
		}
		const holds = [ 'object', 'string' ].includes( r.attr_type ) && ! unit.get( r.block_slug, `${ r.attr_name }Unit` );
		const out = run( r.block_slug, r.attr_name, r.css_property, keywordFor( r.css_property ) );
		assert.equal( !! out.writes, holds, `${ r.block_slug }.${ r.attr_name } (${ r.attr_type })` );
		holds ? written++ : refused++;
	}
	assert.ok( written > 100 && refused > 20, `${ written } written, ${ refused } refused` );
} );

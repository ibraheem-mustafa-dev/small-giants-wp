// A value form a setting cannot print as it stands is mapped to the setting's own form, or the row names why not (lib/resolve-declared.mjs::
// sizePercent and keywordForm, called from lib/resolve.mjs::formatValue): a percentage of the parent on a size setting that prints a
// CSS length string, `letter-spacing: normal` (no added spacing, 0), `rotate: none` (no turn, 0) and the line height `normal`
// that no number states. Real block schemas and the real framework DB; the calibration is the setting's recorded slot and property.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { sizePercent, keywordForm } from '../lib/resolve-declared.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const run = ( block, attr, prop, value ) => resolve( { block, slot: '', prop, perWidth: { 375: value, 768: value, 1440: value } },
	{ db, snapshot, calibration: { settings: { [ attr ]: { slot: '', property: prop } } } } );
const tiers = ( v ) => ( { mobile: v, tablet: v, desktop: v } );

test( 'MUST FAIL: a percentage of the parent on a size setting that prints a CSS length is written as that string', () => {
	assert.deepEqual( run( 'sgs/media', 'maxWidth', 'max-width', '100%' ).writes, [ { attr: 'maxWidth', value: tiers( '100%' ), merge: 'deep' } ] );
	assert.deepEqual( run( 'sgs/media', 'height', 'height', '100%' ).writes, [ { attr: 'height', value: tiers( '100%' ), merge: 'deep' } ] );
	assert.deepEqual( run( 'sgs/hero', 'splitHeight', 'height', '46.5%' ).writes, [ { attr: 'splitHeight', value: tiers( '46.5%' ), merge: 'deep' } ] );
} );

test( 'MUST FAIL: a percentage on a setting that stores a number of pixels is a row that says so', () => {
	const r = run( 'sgs/responsive-logo', 'width', 'width', '100%' );
	assert.equal( r.writes, undefined );
	assert.equal( r.gap, 'shape' );
	assert.match( r.detail, /^100% cannot be held \(width is stored as a number of pixels, so a percentage of the parent is not a value it holds\)/ );
} );

test( 'MUST FAIL: letter-spacing normal is no added spacing, written as 0 in the setting\'s own form', () => {
	assert.deepEqual( run( 'sgs/heading', 'letterSpacing', 'letter-spacing', 'normal' ).writes, [ { attr: 'letterSpacing', value: tiers( 0 ), merge: 'deep' } ] );
} );

test( 'MUST FAIL: rotate none is no turn, written as 0 to a setting that stores degrees as a number', () => {
	assert.deepEqual( run( 'sgs/icon', 'iconRotate', 'rotate', 'none' ).writes, [ { attr: 'iconRotate', value: 0, merge: 'replace' } ] );
} );

test( 'MUST FAIL: line-height normal is a row that names why no number holds it', () => {
	const r = run( 'sgs/heading', 'lineHeight', 'line-height', 'normal' );
	assert.equal( r.writes, undefined );
	assert.equal( r.gap, 'shape' );
	assert.match( r.detail, /^normal cannot be held \(line-height normal is the font's own spacing, which no number or length states/ );
} );

// Negative controls: what the rules must leave as it was.
test( 'a value already in the setting\'s form is unchanged, and a value no rule names stays the row it was', () => {
	assert.deepEqual( run( 'sgs/media', 'maxWidth', 'max-width', '480px' ).writes, [ { attr: 'maxWidth', value: tiers( '480px' ), merge: 'deep' } ] );
	assert.notDeepEqual( run( 'sgs/heading', 'letterSpacing', 'letter-spacing', '2px' ).writes[ 0 ].value, tiers( 0 ), 'a measured spacing is not the 0 of normal' );
	assert.equal( run( 'sgs/icon', 'iconRotate', 'rotate', '45deg' ).gap, 'shape' );
	assert.equal( run( 'sgs/brand-strip', 'columns', 'max-width', '100%' ).detail.startsWith( '100% cannot be held (max-width is painted from a count per device' ), true, 'a count per device keeps its own reason' );
} );

test( 'sizePercent and keywordForm leave other properties, other keywords and settings that hold the keyword alone', () => {
	assert.equal( sizePercent( { prop: 'border-radius', raw: '50%', def: { type: 'object' } } ), null );
	assert.equal( sizePercent( { prop: 'width', raw: '12px', def: { type: 'object' } } ), null );
	assert.deepEqual( sizePercent( { prop: 'max-width', raw: '80%', def: { type: 'string' } } ), { value: '80%' } );
	assert.equal( sizePercent( { prop: 'width', raw: '80%', def: { type: 'number' }, unit: '' } ).error.startsWith( '80% cannot be held' ), true, 'a number beside a unit setting' );
	assert.equal( keywordForm( { prop: 'letter-spacing', raw: '0.05em', def: { type: 'object' } } ), null );
	assert.equal( keywordForm( { prop: 'rotate', raw: 'none', def: { type: 'object' } } ), null, 'a rotate setting that is not a plain degrees number' );
	assert.equal( keywordForm( { prop: 'justify-content', raw: 'normal', def: { type: 'object' } } ), null );
	assert.deepEqual( keywordForm( { prop: 'word-spacing', raw: 'normal', def: { type: 'object' } } ), { length: '0px' } );
} );

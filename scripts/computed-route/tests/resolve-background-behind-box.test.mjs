// A text gradient never stands for a background the draft paints behind its box (lib/resolve-side-effects.mjs::backgroundBehindBox,
// used by lib/resolve.mjs::resolve). `sgs/business-info`'s text gradient is the one setting that paints background-image on its
// root, and its marker clips the background to the text and clears the text colour (calibration's effects list the root's
// background-clip). A footer credit link the draft underlines with `linear-gradient(gold, gold) no-repeat left bottom / 0% 1px`
// (background-clip: border-box) was written to it, and the link's text went invisible. The draft's own background-clip decides:
// a clip other than text drops the text-clip settings, and the row stays for the residual writer; a draft that clips to text, or
// whose clip was not read, keeps them. Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { backgroundBehindBox } from '../lib/resolve-side-effects.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const GRADIENT = 'linear-gradient(rgb(216, 202, 80), rgb(216, 202, 80))';
const at = ( v ) => ( { 375: v, 768: v, 1440: v } );
// Calibration as it records the text gradient of sgs/business-info (the shape every block's text gradient records).
const calibration = ( extra = {} ) => ( {
	settings: { textColourGradient: { slot: '', slots: [ '' ], property: 'background-image', state: null, effects: [ '|color', '|background-clip' ] }, ...extra },
	elements: { '': at( { 'background-clip': 'border-box' } ) },
} );
const run = ( block, siblings, cal = calibration() ) => resolve( { block, slot: '', prop: 'background-image', perWidth: at( GRADIENT ), siblings }, { db, snapshot, calibration: cal } );

test( 'MUST FAIL: the only background-image setting clips to the text, and the draft does not: it is no setting', () => {
	const r = run( 'sgs/business-info', { 'background-clip': at( 'border-box' ) } );
	assert.equal( r.writes, undefined, `written: ${ JSON.stringify( r.writes ) }` );
	assert.equal( r.gap, 'no-setting' );
	assert.match( r.detail, /behind the box \(textColourGradient clips/ );
} );

test( 'negative control: a draft that clips to the text, or whose clip was not read, still writes the text gradient', () => {
	for ( const siblings of [ { 'background-clip': at( 'text' ) }, {}, { 'background-clip': { 375: 'border-box', 768: 'border-box', 1440: 'text' } } ] ) {
		const r = run( 'sgs/business-info', siblings );
		assert.equal( r.gap, undefined, r.detail );
		assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'textColourGradient' ] );
	}
} );

test( 'negative control: with a second setting the side-effect tie rule decides, as before', () => {
	const cal = calibration( { backgroundColourGradient: { slot: '', slots: [ '' ], property: 'background-image', state: null, effects: [] } } );
	const r = run( 'sgs/container', { 'background-clip': at( 'border-box' ) }, cal );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'backgroundColourGradient' ] );
	assert.equal( run( 'sgs/container', { 'background-clip': at( 'text' ) }, cal ).gap, 'ambiguous' );
} );

test( 'MUST FAIL: backgroundBehindBox drops only a setting whose effect on the read element is its background-clip', () => {
	const rows = [ { attr_name: 'a' }, { attr_name: 'b' } ];
	const base = { slot: '.x', same: ( p, s ) => p === s, siblings: { 'background-clip': at( 'border-box' ) } };
	const effects = { a: [ '.x|background-clip' ], b: [ '.x|color' ] };
	const ofRow = ( r ) => effects[ r.attr_name ];
	assert.deepEqual( backgroundBehindBox( rows, { ...base, effectsOf: ofRow } ).rows.map( ( r ) => r.attr_name ), [ 'b' ] );
	assert.deepEqual( backgroundBehindBox( rows, { ...base, effectsOf: ofRow } ).dropped.map( ( r ) => r.attr_name ), [ 'a' ] );
	assert.equal( backgroundBehindBox( rows, { ...base, effectsOf: ofRow, siblings: { 'background-clip': at( 'text' ) } } ).dropped.length, 0, 'a draft that clips to text keeps both' );
	assert.equal( backgroundBehindBox( rows, { ...base, effectsOf: ofRow, siblings: {} } ).dropped.length, 0, 'an unread clip keeps both' );
	assert.equal( backgroundBehindBox( rows, { ...base, effectsOf: () => [ '.y|background-clip' ] } ).dropped.length, 0, 'an effect on another element decides nothing' );
	assert.equal( backgroundBehindBox( rows, { ...base, effectsOf: () => [ '.x|color' ] } ).dropped.length, 0, 'another effect decides nothing' );
} );

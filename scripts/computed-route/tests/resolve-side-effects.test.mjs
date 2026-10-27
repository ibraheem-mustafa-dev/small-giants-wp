// The resolver's side-effect tie rule (lib/resolve-side-effects.mjs, used by lib/resolve.mjs::resolve): of two settings that
// both paint background-image on one element, the one whose marker also clips the background to the text cannot give a
// draft whose background-clip is the element's default paint, so the other is written. A draft that does clip, or that was
// not read, stays ambiguous; a length effect never decides.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { sideEffectFree } from '../lib/resolve-side-effects.mjs';
import { PROPS, TIE_PROPS } from '../lib/fill-read.mjs';
import { FILL_READS } from '../lib/intake-missing.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const GRADIENT = 'linear-gradient(135deg, rgb(235, 221, 120) 0%, rgb(216, 202, 80) 100%)';
const at = ( v ) => ( { 375: v, 768: v, 1440: v } );
// Calibration as it records sgs/container's two gradients: both paint background-image on the root; the text gradient's
// marker also changed the root's background-clip and colours.
const calibration = {
	settings: {
		backgroundColourGradient: { slot: '', slots: [ '' ], property: 'background-image', state: null, effects: [] },
		textColourGradient: { slot: '', slots: [ '' ], property: 'background-image', state: null, effects: [ '|color', '|background-clip', '|-webkit-text-stroke-color' ] },
	},
	elements: { '': { 375: { 'background-clip': 'border-box' }, 768: { 'background-clip': 'border-box' }, 1440: { 'background-clip': 'border-box' } } },
};
const run = ( siblings ) => resolve( { block: 'sgs/container', slot: '', prop: 'background-image', perWidth: at( GRADIENT ), siblings }, { db, snapshot, calibration } );

test( 'MUST FAIL: a background gradient on a draft that keeps background-clip at the default paint is the background gradient setting', () => {
	const r = run( { 'background-clip': at( 'border-box' ) } );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'backgroundColourGradient', GRADIENT ] ] );
} );

test( 'negative control: a draft that clips to the text, or whose background-clip was not read, stays ambiguous', () => {
	assert.equal( run( { 'background-clip': at( 'text' ) } ).gap, 'ambiguous' );
	assert.equal( run( {} ).gap, 'ambiguous' );
	assert.equal( run( { 'background-clip': { 375: 'border-box', 768: 'border-box', 1440: 'text' } } ).gap, 'ambiguous', 'one width off the default paint convicts nothing' );
} );

test( 'MUST FAIL: the side-effect rule is the last resort; a tie an earlier rule breaks keeps its answer', () => {
	// minHeight's marker also made the root a flex column (an effect only a non-zero value makes); the DB ties
	// bgSvgMinHeight to a part, so the element's own minHeight is the answer whatever the draft's display.
	const cal = {
		settings: {
			minHeight: { slot: '', slots: [ '' ], property: 'min-height', state: null, effects: [ '|height', '|display', '|flex-direction' ] },
			bgSvgMinHeight: { slot: '', slots: [ '' ], property: 'min-height', state: null, effects: [ '|height' ] },
		},
		elements: { '': { 375: { display: 'block', 'min-height': 'auto' }, 768: { display: 'block', 'min-height': 'auto' }, 1440: { display: 'block', 'min-height': 'auto' } } },
	};
	const r = resolve( { block: 'sgs/container', slot: '', prop: 'min-height', perWidth: { 1440: '0px' }, siblings: { display: at( 'block' ) } }, { db, snapshot, calibration: cal } );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'minHeight' ] );
} );

test( 'MUST FAIL: sideEffectFree drops only a setting whose effect on the read element the draft shows at the default paint', () => {
	const rows = [ { attr_name: 'a' }, { attr_name: 'b' } ];
	const base = { slot: '.x', same: ( p, s ) => p === s, paintOf: () => at( 'border-box' ), equal: ( p, x, y ) => x === y, isLength: ( v ) => /px$/.test( String( v ) ) };
	const effects = { a: [ '.x|background-clip' ], b: [] };
	assert.deepEqual( sideEffectFree( rows, { ...base, effectsOf: ( r ) => effects[ r.attr_name ], siblings: { 'background-clip': at( 'border-box' ) } } ).map( ( r ) => r.attr_name ), [ 'b' ] );
	assert.deepEqual( sideEffectFree( rows, { ...base, effectsOf: ( r ) => ( { a: [ '.y|background-clip' ], b: [] } )[ r.attr_name ], siblings: { 'background-clip': at( 'border-box' ) } } ).length, 2, 'an effect on another element decides nothing' );
	assert.equal( sideEffectFree( rows, { ...base, effectsOf: () => [ '.x|background-clip' ], siblings: { 'background-clip': at( 'border-box' ) } } ).length, 2, 'a tie it would empty is left as it is' );
	assert.equal( sideEffectFree( [ rows[ 0 ] ], { ...base, effectsOf: () => [ '.x|background-clip' ], siblings: { 'background-clip': at( 'border-box' ) } } ).length, 1, 'a single row is no tie' );
	const len = { ...base, paintOf: () => at( '20px' ), effectsOf: ( r ) => ( { a: [ '.x|height' ], b: [] } )[ r.attr_name ], siblings: { height: at( '20px' ) } };
	assert.equal( sideEffectFree( rows, len ).length, 2, 'a length effect never decides' );
} );

test( 'MUST FAIL: Fill reads background-clip on every draft element as a tie read, never as a property it carries', () => {
	assert.ok( TIE_PROPS.includes( 'background-clip' ) );
	assert.ok( PROPS.includes( 'background-clip' ), 'read on every element' );
	assert.equal( FILL_READS.has( 'background-clip' ), false, 'not counted as a property Fill carries' );
} );

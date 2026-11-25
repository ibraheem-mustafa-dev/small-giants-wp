// lib/fill-rest-width.mjs: a burger bar drawn at a fixed width no width setting holds (the draft's third bar is 16px beside two
// 22px bars) is written as the part's hover state restWidth; a bar already resting somewhere else, a width that changes by tier,
// a non-px length, a root row, a hover row and a block with no motion part are left raised.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { restWidthWrites } from '../lib/fill-rest-width.mjs';

const db = openDb();
const schema = loadMotionSchema();
const ICON = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon';
const bar = ( n ) => `${ ICON } > .sgs-nav-bar-menu__burger-bar-${ n }`;
const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/50#0' } }, ...[ 1, 2, 3 ].map( ( n ) => ( { id: `0:bar${ n }`, slot: bar( n ), finder: { tpl: `Root/${ 60 + n }#0` } } ) ) ] } ];
const row = ( property, value, over = {} ) => ( { node: 'r0', block: 'sgs/nav-bar-menu', slot: bar( 3 ), property, value, state: null, reason: 'no-setting: test', ...over } );
const run = ( unmapped, attributes = {} ) => {
	const flat = [ { name: 'sgs/nav-bar-menu', attributes, ref: 'r0' } ];
	return { out: restWidthWrites( { unmapped, nodes, flat, refOf: ( x ) => x.ref, mdb: motionDb( db ), db, calFor: () => null, schema } ), motion: flat[ 0 ].attributes.sgsMotion };
};

test( 'MUST FAIL: the third bar\'s fixed 16px width is written as that part\'s hover state restWidth, and the row is answered', () => {
	const { out, motion } = run( [ row( 'width', '16px' ) ] );
	assert.equal( motion?.elements?.[ 'burger-bar-3' ]?.hover?.state?.values?.restWidth, '16px' );
	assert.deepEqual( out.unmapped, [] );
	assert.deepEqual( out.answered.map( ( a ) => a.widths ), [ [ 375, 768, 1440 ] ] );
	assert.equal( out.writes.length, 1 );
	assert.equal( out.writes[ 0 ].attr, 'sgsMotion' );
} );

test( 'a bar\'s existing hover state keeps its other values; the same width given per width is one resting width', () => {
	const held = { v: 1, elements: { 'burger-bar-3': { hover: { state: { values: { width: '22px', duration: 300 }, source: 'item' } } } } };
	const { out, motion } = run( [ row( 'width', '{"375":"16px","768":"16px","1440":"16px"}' ) ], { sgsMotion: held } );
	assert.deepEqual( motion.elements[ 'burger-bar-3' ].hover.state.values, { width: '22px', duration: 300, restWidth: '16px' } );
	assert.equal( out.answered.length, 1 );
} );

test( 'negative control: a differing resting width, a width that changes by tier, a non-px length, and root, hover and other-property rows stay raised', () => {
	const held = { v: 1, elements: { 'burger-bar-3': { hover: { state: { values: { restWidth: '8px', width: '22px', duration: 300 } } } } } };
	const differing = run( [ row( 'width', '16px' ) ], { sgsMotion: held } );
	assert.equal( differing.out.unmapped.length, 1 );
	assert.match( differing.out.unmapped[ 0 ].reason, /already rests at 8px/ );
	assert.equal( differing.motion.elements[ 'burger-bar-3' ].hover.state.values.restWidth, '8px', 'the held value is not overwritten' );
	const kept = [ row( 'width', '{"375":"16px","1440":"22px"}' ), row( 'width', '50%' ), row( 'width', '16px', { slot: '' } ), row( 'width', '16px', { state: 'hover' } ), row( 'height', '16px' ), row( 'width', '16px', { slot: bar( 9 ) } ) ];
	const r = run( kept );
	assert.equal( r.out.unmapped.length, kept.length );
	assert.equal( r.out.writes.length, 0 );
	assert.equal( r.motion, undefined );
} );

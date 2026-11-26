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
const run = ( unmapped, attributes = {}, reads ) => {
	const flat = [ { name: 'sgs/nav-bar-menu', attributes, ref: 'r0' } ];
	return { out: restWidthWrites( { unmapped, nodes, flat, refOf: ( x ) => x.ref, mdb: motionDb( db ), db, calFor: () => null, schema, reads } ), motion: flat[ 0 ].attributes.sgsMotion };
};
// The draft read of the third bar: its width per read width.
const readsOf = ( widthAt ) => ( { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:bar3': { styles: { width: widthAt[ w ] } } } ] ) ) } );

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

test( 'MUST FAIL: a row covering some read widths writes the one resting width only where the part is that width at the others', () => {
	const part = '{"375":"16px","768":"16px"}';
	// The bar is 22px at 1440: one restWidth of 16px would shrink it there, so the row stays raised and says why.
	const wide = run( [ row( 'width', part ) ], {}, readsOf( { 375: '16px', 768: '16px', 1440: '22px' } ) );
	assert.equal( wide.motion, undefined );
	assert.equal( wide.out.writes.length, 0 );
	assert.equal( wide.out.unmapped.length, 1 );
	assert.match( wide.out.unmapped[ 0 ].reason, /states 16px at 375, 768 only and the part's draft width at the other read widths is not 16px, or was not read/ );
	// The bar is 16px at 1440 too: the row's value is the part's one resting width.
	const same = run( [ row( 'width', part ) ], {}, readsOf( { 375: '16px', 768: '16px', 1440: '16px' } ) );
	assert.equal( same.motion?.elements?.[ 'burger-bar-3' ]?.hover?.state?.values?.restWidth, '16px' );
	assert.deepEqual( same.out.answered.map( ( a ) => a.widths ), [ [ 375, 768 ] ] );
	// No read of the part at the missing width proves nothing.
	const noRead = run( [ row( 'width', part ) ] ).out.unmapped;
	assert.equal( noRead.length, 1 );
	assert.match( noRead[ 0 ].reason, /no draft read of the part was given/, 'a missing read says so' );
} );

test( 'MUST FAIL: a width the part is not drawn at is skipped, and a width within the route PX_TOL of the row px holds', () => {
	const part = '{"375":"16px","768":"16px"}';
	const at = ( w1440 ) => ( { widths: { 375: { '0:bar3': { styles: { width: '16px' } } }, 768: { '0:bar3': { styles: { width: '16px' } } }, 1440: { '0:bar3': w1440 } } } );
	const hidden = run( [ row( 'width', part ) ], {}, at( { styles: { display: 'none', width: 'auto' } } ) );
	assert.equal( hidden.motion?.elements?.[ 'burger-bar-3' ]?.hover?.state?.values?.restWidth, '16px', 'display none at 1440: nothing to hold there' );
	const absent = run( [ row( 'width', part ) ], {}, at( { missing: true } ) );
	assert.equal( absent.out.writes.length, 1, 'not drawn at 1440: nothing to hold there' );
	const close = run( [ row( 'width', part ) ], {}, at( { styles: { width: '16.3px' } } ) );
	assert.equal( close.out.writes.length, 1, '0.3px is within the route tolerance (0.5px)' );
	const far = run( [ row( 'width', part ) ], {}, at( { styles: { width: '16.8px' } } ) );
	assert.equal( far.out.writes.length, 0, '0.8px is not' );
	assert.match( far.out.unmapped[ 0 ].reason, /is not 16px, or was not read/ );
} );

test( 'a row with no reason still gives a refusal text without "undefined"', () => {
	const held = { v: 1, elements: { 'burger-bar-3': { hover: { state: { values: { restWidth: '8px' } } } } } };
	const r = run( [ row( 'width', '16px', { reason: undefined } ) ], { sgsMotion: held } );
	assert.match( r.out.unmapped[ 0 ].reason, /^no reason recorded; the part's hover state already rests at 8px/ );
	const part = run( [ row( 'width', '{"375":"16px"}', { reason: undefined } ) ], {}, readsOf( { 375: '16px', 768: '22px', 1440: '22px' } ) );
	assert.ok( ! /undefined/.test( part.out.unmapped[ 0 ].reason ) );
} );

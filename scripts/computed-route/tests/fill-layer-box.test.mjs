// Fill's decorative-layer box (lib/fill-layer-box.mjs, shared code lib/layer-box.mjs): z-index follows the draft (auto is 0), a layer
// inside a hero is anchored to the section, a layer drawn by both sides is 100% wide. Each case has a negative control.
// Run: node --test tests/fill-layer-box.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { fillLayerBox } from '../lib/fill-layer-box.mjs';
import { directWrite, zValue, stretchedSize } from '../lib/layer-box.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snap = ( styles ) => ( { styles } );
const run = ( { name = 'sgs/decorative-image', slot = '', parent = 'sgs/hero', styles, declared = { inset: '0' } } ) => {
	const writes = [];
	const st = { db, nodes: [ { name: 'sgs/hero' }, { name: parent } ], reads: { declared: { 1440: { t: declared }, 768: { t: declared }, 375: { t: declared } } } };
	const apply = ( s, rec, ref, target, prop, res ) => writes.push( ...res.writes.map( ( w ) => ( { prop, ...w } ) ) );
	const snaps = Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, snap( styles ) ] ) );
	const handled = fillLayerBox( { st: { ...st, nodes: [ { name: parent }, { name: parent } ] }, rec: { name, parent: 0, index: 1 }, ref: 'r', target: { id: 't', slot }, snaps, apply } );
	return { writes, handled };
};
const glow = { 'z-index': 'auto', top: '0px', right: '0px', bottom: '0px', left: '0px', width: '1440px', height: '600px' };

test( 'zValue: auto is 0 and a number is itself', () => {
	assert.equal( zValue( 'auto' ), 0 );
	assert.equal( zValue( '3' ), 3 );
	assert.equal( zValue( undefined ), 0 );
} );

test( 'fill: an inset layer in a hero gets zIndex 0, anchorTo section and 100% size; MUST FAIL for another block or a slot', () => {
	const { writes, handled } = run( { styles: glow } );
	assert.deepEqual( writes.find( ( w ) => 'zIndex' === w.attr ), { prop: 'z-index', attr: 'zIndex', value: 0 } );
	assert.equal( writes.find( ( w ) => 'anchorTo' === w.attr ).value, 'section' );
	assert.equal( writes.find( ( w ) => 'width' === w.attr ).value.desktop, '100%' );
	assert.equal( writes.find( ( w ) => 'height' === w.attr ).value.desktop, '100%' );
	assert.deepEqual( [ ...handled ].sort(), [ 'height', 'width', 'z-index' ] );
	assert.equal( run( { name: 'sgs/container', styles: glow } ).writes.length, 0 );
	assert.equal( run( { slot: '.x', styles: glow } ).writes.length, 0 );
} );

test( 'fill: a numbered draft z-index is written as that number; a layer outside a hero has no anchorTo; a side-placed layer keeps its measured size', () => {
	const { writes, handled } = run( { parent: 'sgs/container', styles: { ...glow, 'z-index': '4' }, declared: { top: '-2px', left: '0' } } );
	assert.equal( writes.find( ( w ) => 'zIndex' === w.attr ).value, 4 );
	assert.equal( writes.some( ( w ) => 'anchorTo' === w.attr ), false );
	assert.equal( handled.has( 'width' ), false );
} );

test( 'layer-box: stretched size is 100% when flush and a calc() otherwise; z-index must agree across widths', () => {
	const both = { top: true, right: true, bottom: true, left: true };
	assert.equal( stretchedSize( both, [ 'left', 'right' ], '0px', '0px' ), '100%' );
	assert.equal( stretchedSize( both, [ 'left', 'right' ], '10px', '6px' ), 'calc(100% - 16px)' );
	assert.equal( stretchedSize( { ...both, right: false }, [ 'left', 'right' ], '0px', '0px' ), null );
	assert.ok( directWrite( db, 'z-index', { 1440: 'auto', 768: '2' } ).gap );
} );

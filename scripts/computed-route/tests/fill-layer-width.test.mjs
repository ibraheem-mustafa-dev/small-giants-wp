// A decorative layer's width declared as a percentage (lib/fill-layer-box.mjs, lib/layer-box.mjs::declaredSizes): written to the
// layer's width setting as the declared text, never the measured px and never refused as "cannot be held". Each case has a negative control.
// Run: node tools/run-tests.mjs tests/fill-layer-width.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { fillLayerBox } from '../lib/fill-layer-box.mjs';
import { declaredSizes, plainDeclaredLength } from '../lib/layer-box.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const run = ( { declared, name = 'sgs/decorative-image', slot = '', measured = { 'z-index': 'auto', width: '662px', height: '827px' } } ) => {
	const writes = [];
	const at = ( w ) => ( 'function' === typeof declared ? declared( w ) : declared );
	const st = { db, nodes: [ { name: 'sgs/container' } ], reads: { declared: Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, { t: at( w ) } ] ) ) } };
	const apply = ( s, rec, ref, target, prop, res ) => writes.push( ...res.writes.map( ( x ) => ( { prop, ...x } ) ) );
	const snaps = Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, { styles: measured } ] ) );
	const handled = fillLayerBox( { st, rec: { name, parent: 0, index: 1 }, ref: 'r', target: { id: 't', slot }, snaps, apply } );
	return { writes, handled };
};

test( 'plainDeclaredLength and declaredSizes: a plain length per width with at least one percentage; anything else is null', () => {
	assert.equal( plainDeclaredLength( '46%' ), '46%' );
	assert.equal( plainDeclaredLength( ' 132px ' ), '132px' );
	assert.equal( plainDeclaredLength( 'calc(100% - 4px)' ), null );
	assert.equal( plainDeclaredLength( 'auto' ), null );
	assert.equal( plainDeclaredLength( '46' ), null );
	assert.deepEqual( declaredSizes( { 1440: { width: '46%' }, 768: { width: '46%' } }, 'width' ), { 1440: '46%', 768: '46%' } );
	assert.equal( declaredSizes( { 1440: { width: '120px' }, 768: { width: '120px' } }, 'width' ), null );
	assert.equal( declaredSizes( { 1440: { width: '46%' }, 768: {} }, 'width' ), null );
} );

test( 'fill: a layer declaring width 46% gets layerWidth 46%, not the measured px; MUST FAIL for another block or a slot', () => {
	const { writes, handled } = run( { declared: { left: '2%', top: '10%', width: '46%' } } );
	assert.deepEqual( writes.find( ( w ) => 'layerWidth' === w.attr )?.value, { desktop: '46%' } );
	assert.equal( handled.has( 'width' ), true );
	assert.equal( run( { name: 'sgs/container', declared: { width: '46%' } } ).writes.length, 0 );
	assert.equal( run( { slot: '.x', declared: { width: '46%' } } ).writes.length, 0 );
} );

test( 'fill: a percentage at one width and px at another keeps each (a narrower tier equal to the wider is not repeated); a px-only or keyword width is left to the resolver', () => {
	const mixed = run( { declared: ( w ) => ( { width: 1440 === w ? '58%' : '300px' } ) } );
	assert.deepEqual( mixed.writes.find( ( w ) => 'layerWidth' === w.attr )?.value, { desktop: '58%', tablet: '300px' } );
	assert.equal( run( { declared: { left: '0', width: '132px' } } ).handled.has( 'width' ), false );
	assert.equal( run( { declared: { left: '0', width: 'max-content' } } ).handled.has( 'width' ), false );
	assert.equal( run( { declared: { left: '0' } } ).handled.has( 'width' ), false );
} );

test( 'fill: a layer declaring height 50% gets layerHeight 50%; the width is untouched', () => {
	const { writes, handled } = run( { declared: { left: '0', height: '50%' } } );
	assert.deepEqual( writes.find( ( w ) => 'layerHeight' === w.attr )?.value, { desktop: '50%' } );
	assert.equal( handled.has( 'width' ), false );
} );

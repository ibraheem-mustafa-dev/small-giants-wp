// The divergence ledger refuses a ruling that could excuse unrelated work (lib/apply-ledger.mjs::ledgerIndex).
// Run: node --test tests/apply-ledger-refusal.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ledgerIndex, ledgerMatch, surfaceNames } from '../lib/apply-ledger.mjs';
import { writableProps } from '../lib/apply-writable.mjs';

const refused = ( rows, options ) => {
	try {
		ledgerIndex( rows, options );
		return null;
	} catch ( e ) {
		return e.message;
	}
};

test( 'writableProps is derived from the families and the state, form, tile and timing reads', () => {
	const props = writableProps();
	for ( const p of [ 'box-shadow', 'background-color', 'color', 'opacity', 'display', 'transition-duration', 'font-family', 'grid-column', 'border-top-width' ] ) {
		assert.ok( props.includes( p ), p );
	}
	for ( const p of [ 'breakpoint', 'min-height', 'content', 'tile count' ] ) {
		assert.ok( ! props.includes( p ), `${ p } is never written` );
	}
} );

test( 'a writable property with no cr-ref node, block or part is refused, naming the entry and what to add', () => {
	const message = refused( [ { id: 'D-38', scope: 'mega pages', node: 'panel shadow', property: 'box-shadow' } ] );
	assert.match( message, /D-38/ );
	assert.match( message, /box-shadow/ );
	assert.match( message, /`node`.*`block`.*`part`/ );
} );

test( 'negative control: naming a cr-ref, a block, a block-slug node or a part keeps the same ruling', () => {
	const base = { id: 'D-1', scope: 'home', property: 'color' };
	assert.equal( refused( [ { ...base, node: 'heading cr-ref-home-4' } ] ), null );
	assert.equal( refused( [ { ...base, node: 'timeline headings', block: 'sgs/timeline' } ] ), null );
	assert.equal( refused( [ { ...base, node: 'sgs/timeline' } ] ), null );
	assert.equal( refused( [ { ...base, node: 'the label', part: 'label' } ] ), null );
} );

test( 'negative control: a ruling about what the applier never writes stays as it is', () => {
	assert.equal( refused( [ { id: 'D-2', scope: 'home', node: 'x', property: 'breakpoint' }, { id: 'D-3', scope: 'about', node: 'x', property: 'min-height' }, { id: 'D-4', scope: 'home', node: 'x', property: 'content' } ] ), null );
} );

test( 'a ruling that lists a writable property among others is refused; the whole list is read', () => {
	assert.match( refused( [ { id: 'D-29', scope: 'about', node: 'timeline', property: 'pin, opacity, transform' } ] ), /D-29/ );
} );

test( 'a surfaces entry naming no surface of the client is refused; an empty list is too', () => {
	const rows = ( surfaces ) => [ { id: 'D-5', scope: 'x', node: 'cr-ref-a-1', property: 'color', surfaces } ];
	assert.match( refused( rows( [ 'mega-about', 'nowhere' ] ), { surfaces: [ 'mega-about' ] } ), /"nowhere"/ );
	assert.match( refused( rows( [] ), { surfaces: [ 'mega-about' ] } ), /empty/ );
	assert.equal( refused( rows( [ 'mega-about' ] ), { surfaces: [ 'mega-about' ] } ), null );
} );

test( 'every refusal is listed in one message', () => {
	const message = refused( [ { id: 'D-7', scope: 'a', node: 'x', property: 'color' }, { id: 'D-8', scope: 'a', node: 'x', property: 'display' }, { id: 'D-9', scope: 'a', node: 'x', property: 'breakpoint' } ] );
	assert.match( message, /2 rulings/ );
	assert.match( message, /D-7/ );
	assert.match( message, /D-8/ );
	assert.doesNotMatch( message, /D-9/ );
} );

test( 'a part ruling matches only a target whose slot holds the part', () => {
	const index = ledgerIndex( [ { id: 'D-6', scope: 'home', node: 'the label', property: 'color', part: 'label' } ] );
	assert.equal( ledgerMatch( index, { ref: 'r', surface: 'home', prop: 'color', part: 'Row label' } ), 'D-6' );
	assert.equal( ledgerMatch( index, { ref: 'r', surface: 'home', prop: 'color', part: 'Row icon' } ), null );
	assert.equal( ledgerMatch( index, { ref: 'r', surface: 'home', prop: 'color' } ), null );
} );

test( 'surfaceNames reads the surfaces and the page map of a build folder', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'ledger-' ) );
	fs.writeFileSync( path.join( dir, 'surfaces.json' ), JSON.stringify( { home: {}, 'mega-about': {} } ) );
	fs.writeFileSync( path.join( dir, 'page-map.json' ), JSON.stringify( [ { slug: 'home' }, { slug: 'trade' } ] ) );
	assert.deepEqual( surfaceNames( dir ).sort(), [ 'home', 'mega-about', 'trade' ] );
	assert.deepEqual( surfaceNames( path.join( dir, 'none' ) ), [] );
	fs.rmSync( dir, { recursive: true } );
} );

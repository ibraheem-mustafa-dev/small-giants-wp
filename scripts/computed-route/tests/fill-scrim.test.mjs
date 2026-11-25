// The page dimming behind the drawers and the basket panel (lib/fill-scrim.mjs; Spec 48 FR-48-8, plan RF1). Real case: Mama's
// draft dims the page with a fixed backdrop painted `rgba(58, 42, 34, 0.45)` that fades its opacity over 0.25s; the hand-built
// site sets `scrimColour` #3a2a22, `scrimOpacity` 0.45 and `scrimFadeDuration` 250 on the drawer and the basket, and the clone wrote
// none, so both dimmed with the block's black at 0.55. The facts are an excerpt of the real fact record.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { backdropLook, scrimWrites } from '../lib/fill-scrim.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const facts = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'scrim', 'mamas-header.facts.json' ), 'utf8' ) );
const db = openDb();
const scrimBlocks = new Set( db.prepare( "SELECT DISTINCT block_slug FROM block_attributes WHERE css_element = 'scrim' AND attr_name = 'scrimColour'" ).all().map( ( r ) => r.block_slug ) );
const defaultOf = ( b, a ) => JSON.parse( db.prepare( 'SELECT default_value FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( b, a )?.default_value ?? 'null' );
const tree = () => [ { name: 'sgs/nav-drawer', attributes: {} }, { name: 'sgs/cart', attributes: {} }, { name: 'sgs/container', attributes: {} } ];
const run = ( f = facts ) => {
	const flat = tree();
	const nodes = flat.map( ( n, index ) => ( { index, name: n.name } ) );
	return { flat, ...scrimWrites( { nodes, flat, refOf: ( n ) => n.name, facts: f, scrimBlocks, defaultOf } ) };
};

test( 'the framework DB names the blocks that paint a scrim', () => {
	assert.ok( scrimBlocks.has( 'sgs/nav-drawer' ) && scrimBlocks.has( 'sgs/cart' ) );
} );

test( 'MUST FAIL: the draft\'s backdrop is read as an opaque colour, a strength and a fade', () => {
	assert.deepEqual( backdropLook( facts ), { colour: '#3a2a22', opacity: 0.45, blur: null, fade: 250 } );
} );

test( 'MUST FAIL: the drawer and the basket take the draft\'s scrim colour, opacity and fade, the container nothing', () => {
	const { flat, writes } = run();
	for ( const n of flat.slice( 0, 2 ) ) {
		assert.equal( n.attributes.scrimColour, '#3a2a22', n.name );
		assert.deepEqual( n.attributes.scrimOpacity, { desktop: 0.45 }, n.name );
		assert.equal( n.attributes.scrimFadeDuration, 250, n.name );
		assert.equal( undefined, n.attributes.scrimBlur, 'a draft with no blur writes none' );
	}
	assert.deepEqual( flat[ 2 ].attributes, {} );
	assert.equal( writes.length, 6 );
} );

test( 'negative control: no backdrop part in the draft writes nothing, and a set value is kept', () => {
	assert.equal( run( { surfaces: {}, elements: {} } ).writes.length, 0 );
	const flat = [ { name: 'sgs/cart', attributes: { scrimColour: '#112233' } } ];
	scrimWrites( { nodes: [ { index: 0, name: 'sgs/cart' } ], flat, refOf: ( n ) => n.name, facts, scrimBlocks, defaultOf } );
	assert.equal( flat[ 0 ].attributes.scrimColour, '#112233' );
} );

test( 'negative control: a value equal to the setting\'s default is not written', () => {
	const same = JSON.parse( JSON.stringify( facts ) );
	same.elements[ 'SiteHeader/55' ].template.style.static = same.elements[ 'SiteHeader/55' ].template.style.static.map( ( [ p, v ] ) => ( 'background-color' === p ? [ p, 'rgba(0, 0, 0, 0.55)' ] : [ p, v ] ) );
	const { flat } = run( same );
	assert.equal( undefined, flat[ 0 ].attributes.scrimColour );
	assert.equal( undefined, flat[ 0 ].attributes.scrimOpacity );
	assert.equal( flat[ 0 ].attributes.scrimFadeDuration, 250 );
} );

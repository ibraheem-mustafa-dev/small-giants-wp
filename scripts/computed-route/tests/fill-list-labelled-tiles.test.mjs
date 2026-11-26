// A strip of tiles that are links or buttons naming themselves by an aria-label (a brand strip's tiles, each an empty picture
// placeholder) gives each tile's label as the item's name (lib/fill-list-items.mjs::holeField `labelled`), and a strip whose code
// doubles its loop so it can scroll without a gap is read once (::readOnce). Before, the Indus homepage's ten brands came out as
// "20 items carry no words or uploaded picture sgs/brand-strip can show, so its logos are not written": only each tile's address
// was a field, the label (`aria-label="{{ l.name }}"`) was no field, and the two copies of the ten were two lists (2026-11-19).
// The rows are the committed Indus homepage inventory (sites/indus-foods/build/skeleton/home.inventory.json); the template holes are
// the draft's own for elements 223 to 225. Mutation list: tests/fill-list-labelled-tiles.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { holeField, loopItems, readOnce } from '../lib/fill-list-items.mjs';
import { listContentWrites } from '../lib/fill-list-content.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const INVENTORY = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', 'indus-foods', 'build', 'skeleton', 'home.inventory.json' ), 'utf8' ) );
const C = 'Indus Foods Website v2';
const LOOP = { key: `${ C }/223`, list: '{{ brandTiles }}', as: 'l' };
const fact = ( n, tag, holes ) => [ `${ C }/${ n }`, { template: { key: `${ C }/${ n }`, tag, realTag: tag, holes: holes.map( ( [ where, p ] ) => ( { where, path: p } ) ), parentChain: [], membership: { scFor: 223 === n ? [] : [ LOOP ] } } } ];
const FACTS = { elements: Object.fromEntries( [
	fact( 222, 'div', [] ),
	fact( 223, 'sc-for', [ [ 'attr:list', 'brandTiles' ] ] ),
	fact( 224, 'a', [ [ 'attr:href', 'l.href' ], [ 'attr:aria-label', 'l.name' ], [ 'style:width', 'R.logoTile' ] ] ),
	fact( 225, 'image-slot', [ [ 'attr:id', 'l.id' ], [ 'attr:placeholder', 'l.name' ] ] ),
] ) };

test( 'MUST FAIL: an aria-label is a field only for an element with no words of its own', () => {
	const hole = { where: 'attr:aria-label', path: 'l.name' };
	assert.deepEqual( holeField( hole, 'a', true ), { head: 'l', name: 'name', image: false, text: false, attr: 'aria-label' } );
	assert.equal( holeField( hole, 'a', false ), null, 'beside words it repeats them' );
	assert.equal( holeField( hole, 'a' ), null, 'no flag, no field' );
	assert.equal( holeField( { where: 'attr:aria-label', path: 'name' }, 'a', true ), null, 'a label with no loop head is no item field' );
} );

test( 'MUST FAIL: the real brand strip: twenty tiles, the ten brands read once, each with its label and address', () => {
	const list = loopItems( { inventory: INVENTORY, facts: FACTS, rootKey: 'Root/222#0', rootComponent: C } );
	assert.equal( list.items.length, 10 );
	assert.deepEqual( list.items.slice( 0, 6 ).map( ( i ) => i.name ), [ 'Sanam', 'Shan', 'Green Leaf', 'The Lemon Tree', 'Indus Foods', 'Partner brand' ] );
	assert.deepEqual( list.fields.map( ( f ) => f.name ).sort(), [ 'href', 'id', 'name' ] );
	assert.match( list.source, /a loop doubled for a scroll read once \(10 items\)/ );
} );

test( 'MUST FAIL: Fill writes the ten brands as the strip\'s logos, each with its name (the pictures stay with the client)', () => {
	const db = new DatabaseSync( ':memory:' );
	db.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT, alt_companion_attr TEXT )' );
	db.exec( 'CREATE TABLE block_composition ( block_slug TEXT, accepts_allowed_blocks TEXT )' );
	db.exec( "INSERT INTO block_attributes VALUES ( 'sgs/brand-strip', 'logos', 'array', 'content', NULL, NULL )" );
	const schema = { logos: { type: 'array', default: [], items: { type: 'object', properties: { source: { type: 'object', role: 'image-object' }, alt: { type: 'string', role: 'image-alt' }, linkUrl: { type: 'string', role: 'url-href' }, name: { type: 'string', role: 'text-content' } } } } };
	const flat = [ { name: 'sgs/brand-strip', attributes: { className: 'cr-ref-t-0' }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: 'sgs/brand-strip', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/222#0' } } ] } ];
	const r = listContentWrites( { nodes, flat, refOf: ( n ) => n.attributes.className, facts: FACTS, inventory: INVENTORY, idxFor: () => null, db, schemaOf: () => schema, media: {}, pages: [], rootComponent: C } );
	const logos = flat[ 0 ].attributes.logos;
	assert.equal( logos.length, 10 );
	assert.deepEqual( logos.map( ( l ) => l.name ).slice( 0, 5 ), [ 'Sanam', 'Shan', 'Green Leaf', 'The Lemon Tree', 'Indus Foods' ] );
	assert.equal( r.writes.filter( ( w ) => 'logos' === w.attr ).length, 1 );
	assert.equal( r.handover.some( ( h ) => /carry no words, link or uploaded picture/.test( h.reason ) ), false, 'the strip is no longer named as holding nothing the block can show' );
} );

test( 'a loop is read once only when its second half repeats the first and every item holds something', () => {
	const a = { name: 'A', href: '#/a' };
	const b = { name: 'B', href: '#/b' };
	assert.deepEqual( readOnce( [ a, b, a, b ] ), [ a, b ] );
	assert.deepEqual( readOnce( [ a, b, a, { ...b, name: 'C' } ] ), [ a, b, a, { ...b, name: 'C' } ], 'a second half that differs is a longer list' );
	assert.equal( readOnce( [ a, b, a ] ).length, 3, 'an odd count cannot be two halves' );
	assert.equal( readOnce( [ a, a ] ).length, 2, 'two items are never folded' );
	const blank = { name: null, href: null, id: null };
	assert.equal( readOnce( [ blank, blank, blank, blank ] ).length, 4, 'items holding nothing cannot be told apart, so none are folded' );
} );

test( 'MUST FAIL: a strip of tiles that carry only a label (no address) is still a loop, and one with words of its own is not read by its label', () => {
	const facts = { elements: Object.fromEntries( [ fact( 222, 'div', [] ), fact( 223, 'sc-for', [ [ 'attr:list', 'brandTiles' ] ] ), fact( 224, 'button', [ [ 'attr:aria-label', 'l.name' ] ] ) ] ) };
	const tiles = ( words ) => ( { elements: [ { key: 'Root/222#0', parentKey: null, tag: 'div', words: '', attrs: {}, membership: [] }, ...[ 'Sanam', 'Shan', 'Green Leaf', 'Lemon Tree' ].map( ( n, i ) => ( { key: `Root/224#${ i }`, parentKey: 'Root/222#0', tag: 'button', words, attrs: { 'aria-label': n }, membership: [ { kind: 'sc-for', tpl: '223', as: 'l' } ] } ) ) ] } );
	assert.deepEqual( loopItems( { inventory: tiles( '' ), facts, rootKey: 'Root/222#0', rootComponent: C } ).items.map( ( i ) => i.name ), [ 'Sanam', 'Shan', 'Green Leaf', 'Lemon Tree' ] );
	assert.equal( loopItems( { inventory: tiles( 'Words' ), facts, rootKey: 'Root/222#0', rootComponent: C } ), null, 'a label beside words is no field, so there is no loop to read' );
} );

test( 'negative control: a tile with words of its own does not take its aria-label as a field', () => {
	const words = { ...INVENTORY, elements: INVENTORY.elements.map( ( e ) => ( e.key.startsWith( 'Root/224#' ) ? { ...e, words: 'Brand words' } : e ) ) };
	const list = loopItems( { inventory: words, facts: FACTS, rootKey: 'Root/222#0', rootComponent: C } );
	assert.equal( list.fields.some( ( f ) => 'name' === f.name ), false );
} );

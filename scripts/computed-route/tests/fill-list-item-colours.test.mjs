// A loop's per-item colour (`background:{{ st.bg }}`, `color:{{ st.fg }}` on the element that prints the step's number) is an item
// field: it takes the block's item key that holds a background colour or a text colour (block.json item property role
// `colour-background`, `color`), as the palette token the colour is. Before, a hole in an element's style was no field, so the
// Indus process steps' three number circles (gold, light blue, dark blue) came out one blue (2026-11-20).
// The rows are the committed Indus homepage inventory (sites/indus-foods/build/skeleton/home.inventory.json); the template holes
// are the draft's own for elements 299 to 304. Mutation list: tests/fill-list-item-colours.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { holeStyleField, styleValue, loopItems } from '../lib/fill-list-items.mjs';
import { listContentWrites, matchFields, itemAttrs } from '../lib/fill-list-content.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const INVENTORY = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', 'indus-foods', 'build', 'skeleton', 'home.inventory.json' ), 'utf8' ) );
const C = 'Indus Foods Website v2';
const LOOP = { key: `${ C }/299`, list: '{{ steps }}', as: 'st' };
const fact = ( n, tag, holes ) => [ `${ C }/${ n }`, { template: { key: `${ C }/${ n }`, tag, realTag: tag, holes: holes.map( ( [ where, p, whole ] ) => ( { where, path: p, whole: whole ?? true } ) ), parentChain: [], membership: { scFor: [ LOOP ] } } } ];
const FACTS = { elements: Object.fromEntries( [
	fact( 298, 'div', [ [ 'style:grid-template-columns', 'R.stepsCols' ] ] ),
	fact( 300, 'div', [ [ 'style:gap', 'R.stGap' ] ] ),
	fact( 301, 'span', [ [ 'text', 'st.n', false ], [ 'style:width', 'R.stSize' ], [ 'style:background', 'st.bg' ], [ 'style:color', 'st.fg' ] ] ),
	fact( 303, 'h3', [ [ 'text', 'st.title', false ] ] ),
	fact( 304, 'p', [ [ 'text', 'st.desc', false ] ] ),
] ) };
const SNAPSHOT = { palette: [ { slug: 'brand-gold', colour: { r: 216, g: 202, b: 80, a: 1 } }, { slug: 'brand-dark', colour: { r: 10, g: 126, b: 168, a: 1 } }, { slug: 'slate', colour: { r: 44, g: 62, b: 80, a: 1 } }, { slug: 'white', colour: { r: 255, g: 255, b: 255, a: 1 } } ] };
const KEYS = [
	{ key: 'icon', type: 'string', role: 'icon-slug' }, { key: 'number', type: 'string', role: 'text-content' }, { key: 'title', type: 'string', role: 'text-content' },
	{ key: 'description', type: 'string', role: 'text-content' }, { key: 'numberBackground', type: 'string', role: 'colour-background' }, { key: 'numberColour', type: 'string', role: 'color' },
];
const STEP_ITEM = Object.fromEntries( KEYS.map( ( k ) => [ k.key, { type: k.type, role: k.role } ] ) );

test( 'MUST FAIL: a whole-value background or colour hole on a loop variable is a style field; nothing else is', () => {
	assert.deepEqual( holeStyleField( { where: 'style:background', path: 'st.bg', whole: true } ), { head: 'st', name: 'bg', image: false, text: false, attr: null, style: 'background' } );
	assert.equal( holeStyleField( { where: 'style:color', path: 'st.fg', whole: true } )?.style, 'color' );
	assert.equal( holeStyleField( { where: 'style:background-color', path: 'st.fg', whole: true } )?.style, 'background-color' );
	assert.equal( holeStyleField( { where: 'style:background', path: 'st.bg', whole: false } ), null, 'a hole inside a longer value (a gradient stop) is no colour of its own' );
	assert.equal( holeStyleField( { where: 'style:background', path: 'R.stBg', whole: true } )?.head, 'R', 'the head is read, the caller keeps only the loop variable' );
	assert.equal( holeStyleField( { where: 'style:background', path: 'bg', whole: true } ), null, 'a path with no head is no item field' );
	assert.equal( holeStyleField( { where: 'style:width', path: 'st.w', whole: true } ), null, 'a width is no colour' );
	assert.equal( holeStyleField( { where: 'style:border-color', path: 'st.c', whole: true } ), null );
} );

test( 'styleValue reads one declaration, and the longhand for a background; a colour is not a background-color', () => {
	const style = 'position: relative; background: rgb(216, 202, 80); color: rgb(44, 62, 80);';
	assert.equal( styleValue( style, 'background' ), 'rgb(216, 202, 80)' );
	assert.equal( styleValue( style, 'color' ), 'rgb(44, 62, 80)' );
	assert.equal( styleValue( 'background-color: #fff', 'background' ), '#fff' );
	assert.equal( styleValue( 'background-color: #fff', 'color' ), null, 'a background-color is no text colour' );
	assert.equal( styleValue( undefined, 'color' ), null );
} );

test( 'MUST FAIL: the real process steps: three copies, each with its own circle colours', () => {
	const list = loopItems( { inventory: INVENTORY, facts: FACTS, rootKey: 'Root/298#0', rootComponent: C } );
	assert.equal( list.items.length, 3 );
	assert.deepEqual( list.items.map( ( i ) => i.bg ), [ 'rgb(216, 202, 80)', 'rgb(46, 173, 226)', 'rgb(10, 126, 168)' ] );
	assert.deepEqual( list.items.map( ( i ) => i.fg ), [ 'rgb(44, 62, 80)', 'rgb(255, 255, 255)', 'rgb(255, 255, 255)' ] );
	assert.deepEqual( list.fields.map( ( f ) => [ f.name, f.style ?? null ] ).sort(), [ [ 'bg', 'background' ], [ 'desc', null ], [ 'fg', 'color' ], [ 'n', null ], [ 'title', null ] ] );
} );

test( 'MUST FAIL: a style field takes the key whose role is its colour, by role and not by name; a name match still wins', () => {
	const fields = [ { name: 'bg', image: false, style: 'background' }, { name: 'fg', image: false, style: 'color' }, { name: 'title', image: false } ];
	assert.deepEqual( matchFields( fields, KEYS ).map, { title: 'title', bg: 'numberBackground', fg: 'numberColour' } );
	// Negative control: a block with no colour keys leaves the colours unmatched (and the title still goes to its key).
	const plain = matchFields( fields, KEYS.filter( ( k ) => ! /^colour-background|color$/.test( k.role ) ) );
	assert.deepEqual( plain.map, { title: 'title' } );
	assert.deepEqual( plain.unmatched.sort(), [ 'bg', 'fg' ] );
	// A colour is never put in a words key because its name's words name that role (`text` is a description's word).
	assert.deepEqual( matchFields( [ { name: 'text', image: false, style: 'background' } ], KEYS.filter( ( k ) => 'colour-background' !== k.role ) ).map, {} );
	// A text field is never given a colour key, whatever its name's words are.
	assert.equal( matchFields( [ { name: 'colour', image: false } ], KEYS ).map.colour, undefined );
	// A colour paints one thing: a background colour never takes the text-colour key.
	assert.deepEqual( matchFields( [ { name: 'fg', image: false, style: 'color' } ], KEYS.filter( ( k ) => 'color' !== k.role ) ).map, {} );
} );

test( 'MUST FAIL: Fill writes each step\'s circle colours as palette tokens beside its words', () => {
	const db = new DatabaseSync( ':memory:' );
	db.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT, alt_companion_attr TEXT )' );
	db.exec( 'CREATE TABLE block_composition ( block_slug TEXT, accepts_allowed_blocks TEXT )' );
	db.exec( "INSERT INTO block_attributes VALUES ( 'sgs/process-steps', 'steps', 'array', 'content', 'left,right', NULL )" );
	const schema = { steps: { type: 'array', default: [], items: { type: 'object', properties: STEP_ITEM } } };
	const flat = [ { name: 'sgs/process-steps', attributes: { className: 'cr-ref-t-0' }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: 'sgs/process-steps', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/298#0' } } ] } ];
	const r = listContentWrites( { nodes, flat, refOf: ( n ) => n.attributes.className, facts: FACTS, inventory: INVENTORY, idxFor: () => null, db, schemaOf: () => schema, media: {}, pages: [], rootComponent: C, snapshot: SNAPSHOT } );
	const steps = flat[ 0 ].attributes.steps;
	assert.equal( steps.length, 3 );
	assert.deepEqual( steps.map( ( s ) => s.title ), [ 'Apply online', 'Get approved', 'Start ordering' ] );
	assert.deepEqual( steps.map( ( s ) => s.numberBackground ), [ 'brand-gold', '#2EADE2', 'brand-dark' ], 'a colour the palette holds is its token, any other is hex' );
	assert.deepEqual( steps.map( ( s ) => s.numberColour ), [ 'slate', 'white', 'white' ] );
	assert.equal( r.handover.some( ( h ) => /item field "(bg|fg)"/.test( h.reason ) ), false );
} );

test( 'an item colour is written as hex without a palette, and a gradient or transparent paint is a row, never a write', () => {
	const map = { bg: 'numberBackground', fg: 'numberColour' };
	const hex = itemAttrs( { bg: 'rgb(216, 202, 80)', fg: 'rgb(44, 62, 80)' }, { map, keys: KEYS, media: {}, label: 'item 1' } );
	assert.deepEqual( hex.attrs, { numberBackground: '#D8CA50', numberColour: '#2C3E50' } );
	const bad = itemAttrs( { bg: 'linear-gradient(180deg, #E7D766 0%, #D8CA50 100%)', fg: 'rgba(0, 0, 0, 0)' }, { map, keys: KEYS, media: {}, label: 'item 2', snapshot: SNAPSHOT } );
	assert.deepEqual( bad.attrs, {} );
	assert.equal( bad.rows.length, 2 );
	assert.match( bad.rows[ 0 ].reason, /no solid colour/ );
} );

test( 'a loop whose block has no colour key writes its words only and says so in a note, not a handover row', () => {
	const db = new DatabaseSync( ':memory:' );
	db.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT, alt_companion_attr TEXT )' );
	db.exec( 'CREATE TABLE block_composition ( block_slug TEXT, accepts_allowed_blocks TEXT )' );
	db.exec( "INSERT INTO block_attributes VALUES ( 'sgs/steps-plain', 'steps', 'array', 'content', NULL, NULL )" );
	const schema = { steps: { type: 'array', default: [], items: { type: 'object', properties: { title: { type: 'string', role: 'text-content' }, description: { type: 'string', role: 'text-content' } } } } };
	const flat = [ { name: 'sgs/steps-plain', attributes: { className: 'cr-ref-t-1' }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: 'sgs/steps-plain', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/298#0' } } ] } ];
	const r = listContentWrites( { nodes, flat, refOf: ( n ) => n.attributes.className, facts: FACTS, inventory: INVENTORY, idxFor: () => null, db, schemaOf: () => schema, media: {}, pages: [], rootComponent: C, snapshot: SNAPSHOT } );
	assert.deepEqual( flat[ 0 ].attributes.steps.map( ( s ) => Object.keys( s ).sort() ), [ [ 'description', 'title' ], [ 'description', 'title' ], [ 'description', 'title' ] ] );
	assert.equal( r.handover.some( ( h ) => /"(bg|fg)"/.test( h.reason ) ), false );
	assert.ok( r.notes.some( ( n ) => /item colour "bg" has no colour key/.test( n ) ) );
} );

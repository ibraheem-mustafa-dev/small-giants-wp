// A slider whose draft shows one item at a time (a current-item display: the card prints `tCur.text`, `tCur.name`, ... for the item
// its index picks) is written with one slide visible (lib/fill-list-content.mjs::listContentWrites, `currentItemRule`: data/
// skeleton-decisions.json rules.slider.currentItem). Before, the block kept its default of three cards side by side, so the Indus
// homepage's "Our Partners Love Us!" drew three narrow columns where the draft shows one yellow card (2026-11-19). The list's
// items are read from the draft's own logic (sites/indus-foods/handoff/Indus Foods Website v2.dc.html, its `tCur` over four items).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { logicReader, listContentWrites, currentItemRule } from '../lib/fill-list-content.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const HANDOFF = path.join( HERE, '..', '..', '..', 'sites', 'indus-foods', 'handoff' );
const C = 'Indus Foods Website v2';
const idx = logicReader( HANDOFF )( C );

const db = new DatabaseSync( ':memory:' );
db.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, attr_type TEXT, role TEXT, css_property TEXT, alt_companion_attr TEXT )' );
db.exec( 'CREATE TABLE block_composition ( block_slug TEXT, accepts_allowed_blocks TEXT )' );
db.exec( `INSERT INTO block_attributes VALUES ( 'sgs/testimonial', 'quote', 'string', 'text-content', NULL, NULL ), ( 'sgs/testimonial', 'reviewerName', 'string', 'text-content', NULL, NULL ),
	( 'sgs/testimonial', 'orgName', 'string', 'text-content', NULL, NULL ), ( 'sgs/container', 'overflow', 'string', 'layout', 'overflow', NULL )` );
db.exec( `INSERT INTO block_composition VALUES ( 'sgs/testimonial-slider', '["sgs/testimonial"]' ), ( 'sgs/container', '[]' )` );
const SCHEMAS = { 'sgs/testimonial-slider': { slidesVisible: { type: [ 'number', 'object' ], default: { desktop: 3 } }, autoplay: { type: 'boolean' } }, 'sgs/container': {} };
const schemaOf = ( b ) => SCHEMAS[ b ] || null;

// The slider's wrapper (270) holding the card (274) that prints the current item, as the draft's fact record gives them.
const fact = ( n, tag, holes = [], chain = [] ) => [ `${ C }/${ n }`, { template: { key: `${ C }/${ n }`, tag, realTag: tag, holes: holes.map( ( [ where, p ] ) => ( { where, path: p } ) ), parentChain: chain.map( ( x ) => `${ C }/${ x }` ), membership: { scFor: [] } } } ];
const FACTS = { elements: Object.fromEntries( [
	fact( 270, 'div' ),
	fact( 276, 'p', [ [ 'text', 'tCur.text' ] ], [ 274, 271, 270 ] ),
	fact( 281, 'span', [ [ 'text', 'tCur.name' ] ], [ 274, 271, 270 ] ),
	fact( 282, 'span', [ [ 'text', 'tCur.company' ] ], [ 274, 271, 270 ] ),
] ) };

function pass( block, { rule } = {} ) {
	const flat = [ { name: block, attributes: { className: 'cr-ref-t-0' }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/270#0' } } ] } ];
	const args = { nodes, flat, refOf: ( n ) => n.attributes?.className, facts: FACTS, inventory: { elements: [ { key: 'Root/270#0', parentKey: null, tag: 'div', words: '', attrs: {}, membership: [] } ] }, idxFor: () => idx, db, schemaOf, media: {}, pages: null, rootComponent: C };
	const r = listContentWrites( undefined === rule ? args : { ...args, oneAtATime: rule } );
	return { r, flat };
}

test( 'the rule is read from the standing decisions: the testimonial slider\'s visible-slides setting, one slide', () => {
	assert.deepEqual( currentItemRule(), { blocks: [ 'sgs/testimonial-slider' ], attr: 'slidesVisible', value: 1 } );
} );

test( 'MUST FAIL: the draft\'s current-item display of four testimonials is a slider showing one slide', () => {
	const { r, flat } = pass( 'sgs/testimonial-slider' );
	assert.equal( flat[ 0 ].innerBlocks.length, 0, 'children are placed by applyChildren after the pass' );
	assert.equal( r.children[ 0 ].nodes.length, 4, 'the four items are read from the draft\'s logic' );
	assert.equal( flat[ 0 ].attributes.slidesVisible, 1 );
	assert.ok( r.writes.some( ( w ) => 'slidesVisible' === w.attr && 1 === w.after ) );
	assert.ok( r.notes.some( ( n ) => /one item at a time/.test( n ) ) );
} );

test( 'negative control: a setting the node already holds is kept, a block the rule does not name gets nothing, and no rule writes nothing', () => {
	const held = pass( 'sgs/testimonial-slider' );
	assert.equal( held.flat[ 0 ].attributes.slidesVisible, 1 );
	const own = [ { name: 'sgs/testimonial-slider', attributes: { className: 'cr-ref-t-0', slidesVisible: { desktop: 2 } }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: 'sgs/testimonial-slider', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/270#0' } } ] } ];
	listContentWrites( { nodes, flat: own, refOf: ( n ) => n.attributes.className, facts: FACTS, inventory: { elements: [ { key: 'Root/270#0', parentKey: null, tag: 'div', words: '', attrs: {}, membership: [] } ] }, idxFor: () => idx, db, schemaOf, media: {}, rootComponent: C } );
	assert.deepEqual( own[ 0 ].attributes.slidesVisible, { desktop: 2 } );
	const bare = [ { name: 'sgs/testimonial-slider', attributes: { className: 'cr-ref-t-0' }, innerBlocks: [] } ];
	listContentWrites( { nodes, flat: bare, refOf: ( n ) => n.attributes.className, facts: FACTS, inventory: { elements: [ { key: 'Root/270#0', parentKey: null, tag: 'div', words: '', attrs: {}, membership: [] } ] }, idxFor: () => idx, db, schemaOf: () => ( { autoplay: {} } ), media: {}, rootComponent: C } );
	assert.equal( bare[ 0 ].attributes.slidesVisible, undefined, 'a block that declares no such setting is given none' );
	assert.equal( pass( 'sgs/testimonial-slider', { rule: null } ).flat[ 0 ].attributes.slidesVisible, undefined );
	assert.equal( pass( 'sgs/testimonial-slider', { rule: { blocks: [ 'sgs/other' ], attr: 'slidesVisible', value: 1 } } ).flat[ 0 ].attributes.slidesVisible, undefined );
} );

test( 'negative control: a loop of copies the draft draws all at once is no current-item display, so no visible-slides write', () => {
	// The same slider, its cards a loop (sc-for 11, variable r) of three copies rendered side by side.
	const inv = ( key, parentKey, tag, words = '', loop = true ) => ( { key, parentKey, tag, words, attrs: {}, membership: loop ? [ { kind: 'sc-for', tpl: '11', as: 'r' } ] : [] } );
	const facts = { elements: Object.fromEntries( [
		fact( 270, 'div' ), fact( 11, 'sc-for', [ [ 'attr:list', 'reviews' ] ], [ 270 ] ),
		fact( 12, 'div', [], [ 11, 270 ] ), fact( 13, 'p', [ [ 'text', 'r.text' ] ], [ 12, 11, 270 ] ), fact( 14, 'span', [ [ 'text', 'r.name' ] ], [ 12, 11, 270 ] ),
	] ) };
	facts.elements[ `${ C }/12` ].template.membership = { scFor: [ { as: 'r', key: `${ C }/11` } ] };
	const inventory = { elements: [ inv( 'Root/270#0', null, 'div', '', false ), ...[ 0, 1, 2 ].flatMap( ( i ) => [ inv( `Root/12#${ i }`, 'Root/270#0', 'div' ), inv( `Root/13#${ i }`, `Root/12#${ i }`, 'p', `Quote ${ i }` ), inv( `Root/14#${ i }`, `Root/12#${ i }`, 'span', `Name ${ i }` ) ] ) ] };
	const flat = [ { name: 'sgs/testimonial-slider', attributes: { className: 'cr-ref-t-0' }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: 'sgs/testimonial-slider', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/270#0' } } ] } ];
	const r = listContentWrites( { nodes, flat, refOf: ( n ) => n.attributes.className, facts, inventory, idxFor: () => idx, db, schemaOf, media: {}, rootComponent: C } );
	assert.equal( r.children[ 0 ]?.nodes.length, 3, 'the three copies are the slides' );
	assert.equal( flat[ 0 ].attributes.slidesVisible, undefined, 'a loop shows its copies together: the geometry, not this rule, decides how many show' );
} );

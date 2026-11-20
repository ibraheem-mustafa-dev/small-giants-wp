// A slider whose draft shows one review at a time: the visible card is the slide's wrapper (lib/skeleton-current-slide.mjs,
// lib/fill-list-items.mjs::currentFieldElements). The slider is a client decision with no `slides` in the draft's markup, so
// the slide block was placed by Fill with words only and the card's colour, corners, padding and parts were read nowhere
// (Indus Home: the card stood white, the draft's is gold).
import test from 'node:test';
import assert from 'node:assert/strict';
import { N, run, find } from './fixtures/skeleton-widgets/build.mjs';
import { currentFieldElements } from '../lib/fill-list-items.mjs';
import { applyChildren, expandTemplate, listDecisions } from '../lib/fill-list-content.mjs';
import { currentSlide } from '../lib/skeleton-current-slide.mjs';
import { cleanTree } from '../lib/fill-skeleton.mjs';

const LOGIC = `class Component { state = { i: 0 }; renderVals() { return { reviews: [ { text: 'a', name: 'Ann' }, { text: 'b', name: 'Bo' } ] }; } }`;
const CAL = { quoteFontSize: { slot: '.sgs-testimonial__quote' }, nameFontWeight: { slot: '.n > .name' } };
const page = ( { fields = true } = {} ) => N( 'section', {}, [
	N( 'div', {}, [
		N( 'div', { style: 'display:flex' }, [
			N( 'button', { attrs: { 'aria-label': 'Previous' }, words: '<' } ),
			N( 'div', { style: 'background:#D8CA50;border-radius:16px;padding:24px' }, [
				N( 'span', { words: '\u201c' } ),
				N( 'p', fields ? { text: 'cur.text', words: 'Lovely service.' } : { words: 'Lovely service.' } ),
				N( 'span', fields ? { text: 'cur.name', words: 'Ann' } : { words: 'Ann' } ),
			] ),
			N( 'button', { attrs: { 'aria-label': 'Next' }, words: '>' } ),
		] ),
	] ),
] );
// As in the intake review: the slider is a client decision and the row of arrows and card is absorbed into it.
const decide = { surfaces: { fixture: { 'Root/2#0': { block: 'sgs/testimonial-slider' }, 'Root/3#0': { remove: true, reason: 'absorbed into its parent block' } } } };
const slider = ( r ) => find( r.skeleton, ( x ) => 'sgs/testimonial-slider' === x.name )[ 0 ];
const go = ( root, o = {} ) => run( root, LOGIC, { clientDecisions: decide, calSettings: ( slug ) => ( 'sgs/testimonial' === slug ? CAL : {} ), ...o } );

test( 'MUST FAIL: the one visible card of a current-item slider is the slide node, read at its own element, standing for every item', () => {
	const s = slider( go( page() ) );
	assert.equal( s.innerBlocks.length, 1 );
	const slide = s.innerBlocks[ 0 ];
	assert.equal( slide.name, 'sgs/testimonial' );
	assert.equal( slide.itemTemplate, true );
	assert.equal( slide.draftRef.tpl, 'Root/5#0', 'the card (the lowest element holding the words and the name), not the row or the slider' );
	assert.deepEqual( Object.keys( slide.draftSlots || {} ).sort(), [ '.n > .name', '.sgs-testimonial__quote' ] );
} );

test( 'negative control: a draft whose elements print no item field gets no slide node', () => {
	assert.equal( slider( go( page( { fields: false } ) ) ).innerBlocks.length, 0 );
} );

test( 'negative control: a block that is not a listed slider block gets none, though it too accepts one child block', () => {
	const r = go( page(), { clientDecisions: { surfaces: { fixture: { 'Root/2#0': { block: 'sgs/feature-grid' }, 'Root/3#0': { remove: true } } } } } );
	assert.equal( find( r.skeleton, ( x ) => 'sgs/feature-grid' === x.name ).length, 1 );
	assert.equal( find( r.skeleton, ( x ) => x.itemTemplate ).length, 0 );
} );

// The fact record keys its elements by template key (`Root/<n>`), the inventory by instance key (`Root/<n>#<copy>`).
const rec = ( n, path, tag = 'p' ) => [ `Root/${ n }`, { template: { key: `Root/${ n }`, tag, realTag: tag, holes: path ? [ { where: 'text', path } ] : [], membership: { scFor: [] } } } ];
const el = ( n, parent, extra = {} ) => ( { key: `Root/${ n }#0`, parentKey: parent ? `Root/${ parent }#0` : null, words: 'x', membership: [], ...extra } );
const look = ( els, paths ) => currentFieldElements( { inventory: { elements: els }, facts: { elements: Object.fromEntries( paths.map( ( [ n, path ] ) => rec( n, path ) ) ) }, rootKey: 'Root/1#0', rootComponent: 'Root' } );

test( 'MUST FAIL: currentFieldElements names the lowest element holding every field as the card', () => {
	// root 1 > row 2 > card 3 > [ box 4 > words 5, name 6 ]: the card is above the first field's own parent
	const got = look( [ el( 1 ), el( 2, 1 ), el( 3, 2 ), el( 4, 3 ), el( 5, 4 ), el( 6, 3 ) ], [ [ 1 ], [ 2 ], [ 3 ], [ 4 ], [ 5, 'cur.text' ], [ 6, 'cur.name' ] ] );
	assert.equal( got.card.key, 'Root/3#0' );
	assert.deepEqual( got.fields.map( ( f ) => f.name ), [ 'text', 'name' ] );
	assert.equal( got.head, 'cur' );
} );

test( 'negative controls: two different heads, fields sharing only the root, one field, and a loop variable name no card', () => {
	const flat = [ el( 1 ), el( 2, 1 ), el( 3, 1 ), el( 4, 1 ), el( 5, 1 ) ];
	const nested = [ el( 1 ), el( 2, 1 ), el( 3, 2 ), el( 4, 2 ), el( 5, 2 ), el( 6, 2 ) ];
	assert.equal( look( nested, [ [ 1 ], [ 2 ], [ 3, 'a.text' ], [ 4, 'a.name' ], [ 5, 'b.text' ], [ 6, 'b.name' ] ] ), null, 'two heads, each with a card of its own' );
	assert.equal( look( flat.slice( 0, 3 ), [ [ 1 ], [ 2, 'a.text' ], [ 3, 'a.name' ] ] ), null, 'the fields share only the root' );
	assert.equal( look( [ el( 1 ), el( 2, 1 ), el( 3, 2 ) ], [ [ 1 ], [ 2 ], [ 3, 'a.text' ] ] ), null, 'one field is no item' );
	const looped = [ el( 1 ), el( 2, 1 ), el( 3, 2, { membership: [ { kind: 'sc-for', as: 'a', tpl: 'f9' } ] } ), el( 4, 2, { membership: [ { kind: 'sc-for', as: 'a', tpl: 'f9' } ] } ) ];
	assert.equal( look( looped, [ [ 1 ], [ 2 ], [ 3, 'a.text' ], [ 4, 'a.name' ] ] ), null, 'a loop variable is a loop, not a current item' );
} );

test( 'MUST FAIL: Fill gives every item a copy of the template slide; only the first keeps the draft element reference', () => {
	const template = { name: 'sgs/testimonial', attributes: { className: 'cr-ref-home-9 keep', backgroundColour: 'gold' }, innerBlocks: [] };
	const items = [ { name: 'sgs/testimonial', attributes: { quote: 'a' } }, { name: 'sgs/testimonial', attributes: { quote: 'b' } }, { name: 'sgs/testimonial', attributes: { quote: 'c' } } ];
	const made = expandTemplate( template, items );
	assert.deepEqual( made.map( ( m ) => m.attributes.quote ), [ 'a', 'b', 'c' ] );
	assert.ok( made.every( ( m ) => 'gold' === m.attributes.backgroundColour ), 'each copy carries the card look' );
	assert.deepEqual( made.map( ( m ) => m.attributes.className ), [ 'cr-ref-home-9 keep', 'keep', 'keep' ] );
	const flat = [ { innerBlocks: [ template ] } ];
	applyChildren( flat, [ { index: 0, nodes: items, template: true } ] );
	assert.equal( flat[ 0 ].innerBlocks.length, 3 );
	const plain = [ { innerBlocks: [] } ];
	applyChildren( plain, [ { index: 0, nodes: items } ] );
	assert.equal( plain[ 0 ].innerBlocks, items, 'negative control: no template flag, the items are placed as they are' );
	assert.equal( flat[ 0 ].innerBlocks[ 1 ].attributes.backgroundColour, 'gold', 'the placed copies carry the look' );
} );

const TARGET = { kind: 'children', child: 'sgs/testimonial', keys: [ { key: 'quote', type: 'string', role: 'text-content', html: false } ] };
const LIST = { items: [ { text: 'a' }, { text: 'b' }, { text: 'c' } ], fields: [ { name: 'text', image: false } ], source: 'current item cur of a 3-item list' };

test( 'MUST FAIL: the template slide is no item: three items make three children, not "the items are not placed"', () => {
	const node = { innerBlocks: [ { name: 'sgs/testimonial', attributes: { backgroundColour: 'gold' } } ] };
	const d = listDecisions( { block: 'sgs/testimonial-slider', target: TARGET, node, list: LIST, template: true } );
	assert.deepEqual( d.children.map( ( c ) => c.attributes.quote ), [ 'a', 'b', 'c' ] );
	const plain = listDecisions( { block: 'sgs/testimonial-slider', target: TARGET, node, list: LIST } );
	assert.equal( plain.children, null, 'negative control: without the flag one skeleton child against three items is refused' );
	assert.match( plain.rows[ 0 ].reason, /are not placed/ );
} );

test( 'the template key stays out of the built tree', () => {
	const tree = cleanTree( [ { name: 'sgs/testimonial-slider', attributes: {}, innerBlocks: [ { name: 'sgs/testimonial', attributes: {}, itemTemplate: true, draftRef: { tpl: 'Root/5#0' }, innerBlocks: [] } ] } ] );
	assert.equal( Object.hasOwn( tree[ 0 ].innerBlocks[ 0 ], 'itemTemplate' ), false );
} );

test( 'currentSlide takes the words of the item into the slide block content settings and leaves a picture field to the list pass', () => {
	const mk = ( n, parent, tag, hole ) => [ { key: `Root/${ n }#0`, parentKey: parent ? `Root/${ parent }#0` : null, words: 'x', membership: [] }, [ `Root/${ n }`, { template: { key: `Root/${ n }`, tag, realTag: tag, holes: hole ? [ hole ] : [], membership: { scFor: [] } } } ] ];
	const parts = [ mk( 1, 0, 'div' ), mk( 2, 1, 'div' ), mk( 3, 2, 'p', { where: 'text', path: 'cur.text' } ), mk( 4, 2, 'image-slot', { where: 'attr:id', path: 'cur.avatar' } ) ];
	const q = () => [ { attr_name: 'quote', attr_type: 'string', role: 'text-content' }, { attr_name: 'avatarSource', attr_type: 'object', role: 'image-object' } ];
	const got = currentSlide( { facts: { q }, factRecord: { elements: Object.fromEntries( parts.map( ( p ) => p[ 1 ] ) ) }, inventory: { elements: parts.map( ( p ) => p[ 0 ] ) }, rootKey: 'Root/1#0', rootComponent: 'Root', slideBlock: 'sgs/testimonial', entry: ( e ) => ( { template: { key: e.key.replace( /#0$/, '' ) } } ) } );
	assert.equal( got.card.key, 'Root/2#0' );
	assert.deepEqual( got.slideFields, [ { key: 'quote', element: 'Root/3' } ] );
	assert.equal( currentSlide( { facts: { q }, factRecord: null, inventory: { elements: [] }, rootKey: 'Root/1#0', slideBlock: 'sgs/testimonial', entry: () => null } ), null );
} );

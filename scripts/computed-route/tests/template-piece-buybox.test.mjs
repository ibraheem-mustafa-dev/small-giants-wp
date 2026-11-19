// The product template's buy box (Spec 48 FR-48-60, FR-48-96; lib/template-piece-buybox.mjs): the skeleton nodes the
// draft's own buy box controls became are replaced by one working sgs/buybox, found from the shop parts record by
// structure, and Fill's shop-part writer reaches it. Tests marked MUST FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { place, runOf } from '../lib/template-piece-buybox.mjs';
import { inventoryIndex } from '../lib/template-piece-draft.mjs';
import { shopPartWrites } from '../lib/fill-shop-parts.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { countBlocks } from '../lib/template-pieces.mjs';

const PIECE = { id: 'buy-box', block: 'sgs/buybox', required: true, kind: 'buybox', find: { surface: 'buybox' } };
// An inventory element: [ tpl, parent tpl, tag, own source text, extra ].
const el = ( tpl, parent, tag, own = '', extra = {} ) => ( { key: `Root/${ tpl }#0`, parentKey: parent ? `Root/${ parent }#0` : 'Root/0#0', tag, template: 'Root', tpl, srcOwnText: own, words: extra.words ?? own, snippet: extra.snippet ?? `<${ tag }>`, visible: { 1440: true }, membership: extra.membership || [], position: extra.position || { 1440: 'static' } } );
// main > grid > [ gallery column, info column [ h1, description, options [ label, picker > choices ], add row > button, assurance ] ], related > picker.
const INVENTORY = { elements: [
	el( 1, null, 'main' ), el( 2, 1, 'div' ), el( 3, 2, 'div' ), el( 4, 3, 'div' ),
	el( 5, 2, 'div' ), el( 6, 5, 'h1', '{{ p.name }}', { words: 'Zookies' } ), el( 7, 5, 'p', '{{ p.short }}', { words: 'Soft cookies' } ),
	el( 8, 5, 'div' ), el( 9, 8, 'span', 'Size' ), el( 10, 8, 'div' ), el( 11, 10, 'button', '{{ o.name }}', { words: 'Small' } ),
	el( 12, 5, 'div' ), el( 13, 12, 'button', '{{ addLabel }}', { words: 'Add to basket' } ), el( 14, 5, 'div', 'Free delivery' ),
	el( 15, 1, 'section' ), el( 16, 15, 'div' ), el( 17, 16, 'button', '{{ c.name }}', { words: 'Red' } ),
] };
const n = ( name, tpl, attributes = {}, innerBlocks = [] ) => ( { name, attributes, innerBlocks, ...( tpl ? { draftRef: { tpl: `Root/${ tpl }#0` } } : {} ) } );
// The skeleton flattened the grid into one container, as Mama's hero is; the related section keeps its own option picker.
const TREE = () => [ n( 'sgs/container', 1, {}, [
	n( 'sgs/container', 2, {}, [ n( 'sgs/media', 4 ), n( 'sgs/heading', 6, { content: 'Zookies' } ), n( 'sgs/text', 7, { text: 'Soft cookies' } ), n( 'sgs/label', 9, { text: 'Size' } ), n( 'sgs/option-picker', 10, {}, [ n( 'sgs/button', 11, { label: 'Small' } ) ] ), n( 'sgs/button', 13, { label: 'Add to basket' } ), n( 'sgs/text', 14, { text: 'Free delivery' } ) ] ),
	n( 'sgs/container', 15, {}, [ n( 'sgs/option-picker', 16 ) ] ),
] ) ];
const part = ( id, home, locators, sample, extra = {} ) => ( { id, label: id, home, write: null, locators, sample, ...extra } );
const RECORD = () => ( { surfaces: [ { kind: 'buybox', file: 'Product.dc.html', parts: [
	part( 'buybox-title', { type: 'part', contains: 'wp:post-title' }, [ 'Product/6' ], [ '{{ p.name }}' ] ),
	part( 'buybox-option-picker', { type: 'setting', block: 'sgs/buybox', settings: [ 'pickerStyle' ] }, [ 'Product/11' ], [ '{{ o.name }}' ] ),
	part( 'buybox-add-to-basket', { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel' ] }, [ 'Product/13' ], [ '{{ addLabel }}' ], { write: { addToCartLabel: 'Add to basket' } } ),
	part( 'buybox-gift-note:hint', { type: 'missing', reason: 'words only' }, [ 'Product/9' ], [ 'Size' ] ),
	// A part homed on another block's settings (the basket drawer's) is no buy box control.
	part( 'drawer-note', { type: 'setting', block: 'sgs/cart', settings: [ 'itemRemoveLabel' ] }, [ 'Product/14' ], [ 'Free delivery' ] ),
] } ] } );
const ctx = ( over = {} ) => ( { key: 'single-product', tree: TREE(), inventory: INVENTORY, shopParts: RECORD(), draftFile: 'Product.dc.html', ...over } );
const names = ( list ) => list.map( ( x ) => x.name );

test( 'MUST FAIL: the buy box controls become one sgs/buybox at the first one\'s place; everything else stays the draft\'s', () => {
	const got = place( ctx(), PIECE );
	assert.deepEqual( got.problems, undefined );
	const hero = got.tree[ 0 ].innerBlocks[ 0 ].innerBlocks;
	assert.deepEqual( names( hero ), [ 'sgs/media', 'sgs/heading', 'sgs/text', 'sgs/buybox', 'sgs/text' ] );
	assert.equal( countBlocks( got.tree, 'sgs/buybox' ), 1 );
	assert.deepEqual( got.placed, [ { id: 'buy-box', block: 'sgs/buybox', at: 'Root/2#0, position 3, in place of Root/9#0, Root/10#0, Root/13#0' } ] );
	// Negative control: the option picker outside the buy box stays, and so do the title, description and assurance.
	assert.equal( got.tree[ 0 ].innerBlocks[ 1 ].innerBlocks[ 0 ].name, 'sgs/option-picker' );
	assert.equal( hero[ 4 ].attributes.text, 'Free delivery' );
	// The run is two elements side by side, so the node has no draftRef; the missing part inside it is named.
	assert.equal( hero[ 3 ].draftRef, undefined );
	assert.match( got.notes.join( '\n' ), /drawn as 2 elements side by side \(Root\/8#0, Root\/12#0\)/ );
	assert.match( got.notes.join( '\n' ), /no setting for \(buybox-gift-note:hint\)/ );
} );

test( 'MUST FAIL: Fill\'s shop-part writer writes the draft\'s value onto the placed buy box', () => {
	const { tree } = place( ctx(), PIECE );
	const nodes = skeletonNodes( tree );
	const flat = nodes.map( ( r ) => r.node );
	const out = shopPartWrites( { record: RECORD(), nodes, flat, refOf: ( x ) => x.name, attrExists: () => true } );
	assert.deepEqual( out.writes.map( ( w ) => [ w.block, w.attr, w.after ] ), [ [ 'sgs/buybox', 'addToCartLabel', 'Add to basket' ] ] );
	assert.equal( countBlocks( tree, 'sgs/buybox' ), 1 );
} );

test( 'MUST FAIL: a buy box drawn as one wrapper is that wrapper, climbing through wrappers that hold only it, and Fill gets a root target', () => {
	const elements = INVENTORY.elements.filter( ( e ) => 9 !== e.tpl ).map( ( e ) => ( 12 === e.tpl ? { ...e, parentKey: 'Root/8#0' } : e ) );
	const index = inventoryIndex( { elements } );
	assert.deepEqual( runOf( index, [ 'Root/11#0', 'Root/13#0' ] ), [ 'Root/8#0' ] );
	// A wrapper around the wrapper is climbed; one holding something else is not.
	const wrapped = [ ...elements.map( ( e ) => ( 8 === e.tpl ? { ...e, parentKey: 'Root/20#0' } : e ) ), { ...el( 20, 5, 'div' ) } ];
	assert.deepEqual( runOf( inventoryIndex( { elements: wrapped } ), [ 'Root/11#0', 'Root/13#0' ] ), [ 'Root/20#0' ] );
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 0 ].innerBlocks.splice( 3, 1 );
	const got = place( ctx( { tree, inventory: { elements } } ), PIECE );
	const box = got.tree[ 0 ].innerBlocks[ 0 ].innerBlocks[ 3 ];
	assert.deepEqual( box, { name: 'sgs/buybox', attributes: {}, innerBlocks: [], draftRef: { tpl: 'Root/8#0' } } );
	assert.deepEqual( skeletonNodes( got.tree ).find( ( r ) => 'sgs/buybox' === r.name ).targets.map( ( t ) => t.finder ), [ { tpl: 'Root/8#0' } ] );
} );

test( 'MUST FAIL: a record that disagrees with the inventory places nothing and says so', () => {
	const record = RECORD();
	record.surfaces[ 0 ].parts[ 2 ].sample = [ 'Add to bag as they are {{ cur.priceLabel }}' ];
	const got = place( ctx( { shopParts: record } ), PIECE );
	assert.equal( got.tree, undefined );
	assert.match( got.problems[ 0 ], /disagree on buybox-add-to-basket \(Product\/13\)/ );
	// A record read from another draft file, no record surface and no located element are refusals too.
	assert.match( place( ctx( { draftFile: 'Other.dc.html' } ), PIECE ).problems[ 0 ], /read from Product\.dc\.html, not from this surface's draft Other\.dc\.html/ );
	assert.match( place( ctx( { shopParts: { surfaces: [] } } ), PIECE ).problems[ 0 ], /has no buybox surface/ );
	const gone = RECORD();
	gone.surfaces[ 0 ].parts.forEach( ( p ) => ( p.locators = [ 'Product/99' ] ) );
	assert.match( place( ctx( { shopParts: gone } ), PIECE ).problems[ 0 ], /no part of the record homed on sgs\/buybox is located/ );
} );

test( 'MUST FAIL: a run holding the page\'s h1 or a part homed elsewhere is two regions, and places nothing', () => {
	const elements = INVENTORY.elements.map( ( e ) => ( 6 === e.tpl ? { ...e, parentKey: 'Root/8#0' } : e ) );
	const got = place( ctx( { inventory: { elements } } ), PIECE );
	assert.match( got.problems[ 0 ], /also hold the page's h1 Root\/6#0 and part buybox-title, homed outside the buy box, so two regions would become one/ );
} );

test( 'MUST FAIL: buy box nodes split across two places, or with another node between them, place nothing', () => {
	const split = TREE();
	const hero = split[ 0 ].innerBlocks[ 0 ].innerBlocks;
	split[ 0 ].innerBlocks[ 1 ].innerBlocks.push( hero.splice( 5, 1 )[ 0 ] );
	assert.match( place( ctx( { tree: split } ), PIECE ).problems[ 0 ], /its 3 skeleton nodes sit in 2 different places/ );
	const between = TREE();
	const h = between[ 0 ].innerBlocks[ 0 ].innerBlocks;
	h.splice( 4, 0, h.splice( 6, 1 )[ 0 ] );
	assert.match( place( ctx( { tree: between } ), PIECE ).problems[ 0 ], /stand between its nodes \(Root\/14#0\)/ );
} );

test( 'MUST FAIL: a fixed bar repeating the add button is not the buy box\'s place; a tree that has a buy box is left alone', () => {
	const elements = [ ...INVENTORY.elements, el( 30, 1, 'div', '', { position: { 1440: 'fixed' } } ), el( 31, 30, 'button', '{{ addLabel }}', { words: 'Add to basket' } ) ];
	const record = RECORD();
	record.surfaces[ 0 ].parts[ 2 ].locators.push( 'Product/31' );
	const got = place( ctx( { inventory: { elements }, shopParts: record } ), PIECE );
	assert.equal( countBlocks( got.tree, 'sgs/buybox' ), 1 );
	assert.match( got.notes[ 0 ], /1 located element\(s\) sit in a fixed bar \(Root\/31#0\)/ );
	const again = place( ctx( { tree: got.tree } ), PIECE );
	assert.equal( again.tree, undefined );
	assert.match( again.notes[ 0 ], /already holds sgs\/buybox/ );
} );

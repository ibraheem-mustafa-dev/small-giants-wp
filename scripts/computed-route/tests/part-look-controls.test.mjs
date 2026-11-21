// The buy box's controls by what they do (lib/part-look-controls.mjs::flowControls): the control that opens the product page's choice
// flow is the part `flow-opener`, found from the draft's click handlers and never from its words; its label is the words it shows.
// Fixture tests/fixtures/surface-openers (the Eye Care shape): a buy box with a size picker, a control that opens the lens flow and a
// separate one that adds to the basket, all inside one wrapper (so the wrapper is the buy box's run). Here the opener's words sit in a span beside a price span, and the wrapper holding both
// buttons carries the opener's handler in its snippet (an inventory element's snippet holds its descendants' markup), as Eye Care's
// does. Tests marked MUST FAIL fail on code that takes the wrapper for a control or reads the button's own (empty) text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { flowControls, openerShopParts, wordsOf, OPENER_PART } from '../lib/part-look-controls.mjs';
import { inventoryIndex } from '../lib/template-piece-draft.mjs';
import { proposePageMap } from '../lib/intake-pagemap.mjs';

const FIX = path.join( path.dirname( fileURLToPath( import.meta.url ) ), 'fixtures', 'surface-openers' );
const ADD = 'addFrame: () => this.setState(s => ({ bag: s.bag.concat([{ id: 1 }]) })),';
const PUSH = 'this.setState(s => { const bag = s.bag.slice(); bag.push({ id: 1 }); return { bag }; })';
const SOURCE = fs.readFileSync( path.join( FIX, 'Store.dc.html' ), 'utf8' );
const DRAFT = SOURCE.replace( ADD, `addFrame: () => ${ PUSH },` );
const ROWS = () => proposePageMap( { folder: FIX } ).rows.map( ( { opens, ...r } ) => ( void opens, { ...r } ) );

const el = ( tpl, parent, tag, words = '', handler = '' ) => ( {
	key: `Root/${ tpl }#0`, parentKey: `Root/${ parent ?? 0 }#0`, tag, template: 'Root', tpl, srcOwnText: words, words,
	snippet: `<${ tag }${ handler ? ` sc-camel-on-click="{{ ${ handler } }}"` : '' }>`, visible: { 1440: true }, membership: [], position: { 1440: 'static' },
} );
// main > [ h1, grid > [ size picker, opener > [ span "Add my prescription", span "from +£59" ], "Add frame only" ] ].
const elements = ( { wrapper = true } = {} ) => {
	const grid = el( 2, 1, 'div' );
	wrapper && ( grid.snippet = '<div><button sc-camel-on-click="{{ openLens }}"><span>' );
	return [ el( 1, null, 'main' ), grid, el( 3, 1, 'h1', 'Round frame' ), el( 4, 2, 'button', 'Which size am I?', 'openSize' ), el( 5, 2, 'button', '', 'openLens' ),
		el( 10, 5, 'span', 'Add my prescription' ), el( 11, 5, 'span', 'from +£59' ), el( 6, 2, 'button', 'Add frame only', 'addFrame' ) ];
};
const part = ( id, home, locators, sample ) => ( { id, label: id, home, write: null, locators, sample } );
const RECORD = { surfaces: [ { kind: 'buybox', file: 'Page.dc.html', parts: [
	part( 'buybox-option-picker', { type: 'setting', block: 'sgs/buybox', settings: [ 'pickerStyle' ] }, [ 'Page/4' ], [ 'Which size am I?' ] ),
	part( 'buybox-add-to-basket', { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel' ] }, [ 'Page/6' ], [ 'Add frame only' ] ),
] } ] };
const contextOf = ( over = {} ) => ( { inventory } ) => ( { inventory, shopParts: RECORD, draftFile: 'Page.dc.html', draftSource: DRAFT, handoffDir: FIX, pageRows: ROWS(), rootComponent: 'Page', ...over } );
const run = ( { wrapper = true, over = {} } = {} ) => flowControls( { repo: FIX, client: 'c', entry: {}, inventory: { elements: elements( { wrapper } ) }, contextOf: contextOf( over ) } );

test( 'MUST FAIL: the control that opens the flow is the part flow-opener, found from the draft\'s handlers, with the words of its first text', () => {
	const c = run();
	assert.deepEqual( c.openers.map( ( o ) => [ o.key, o.dc, o.tpl, o.label ] ), [ [ 'Root/5#0', 'Page', 5, 'Add my prescription' ] ] );
	assert.deepEqual( c.adds, [ 'Root/6#0' ] );
	assert.equal( c.flow, 'choice-flow-lens-configurator' );
	assert.equal( c.why, undefined );
	assert.deepEqual( openerShopParts( c ), { [ OPENER_PART ]: [ { dc: 'Page', tpl: '5' } ] } );
} );

test( 'MUST FAIL: a wrapper whose snippet holds the opener\'s handler is not itself the opener', () => {
	assert.deepEqual( run( { wrapper: true } ).openers.map( ( o ) => o.key ), [ 'Root/5#0' ], 'the innermost element naming the handler is the control' );
	assert.deepEqual( run( { wrapper: false } ).openers.map( ( o ) => o.key ), [ 'Root/5#0' ] );
} );

test( 'a draft whose product page opens no flow gives no opener, says why, and adds no shop part (negative control)', () => {
	const rows = ROWS().map( ( { opensFlow, ...r } ) => ( void opensFlow, { ...r } ) );
	const c = run( { over: { pageRows: rows } } );
	assert.deepEqual( c.openers, [] );
	assert.match( c.why, /no product row of the page map opens a choice flow/ );
	assert.deepEqual( openerShopParts( c ), {} );
} );

test( 'a surface with no inventory says so', () => {
	const c = flowControls( { repo: FIX, client: 'nobody', entry: {}, contextOf: contextOf() } );
	assert.match( c.why, /no inventory at sites\/nobody\/build\/skeleton\/product\.inventory\.json/ );
} );

test( 'wordsOf: the element\'s own words, else the first descendant with some, else nothing', () => {
	const index = inventoryIndex( { elements: elements() } );
	assert.equal( wordsOf( index, 'Root/5#0' ), 'Add my prescription' );
	assert.equal( wordsOf( index, 'Root/6#0' ), 'Add frame only' );
	assert.equal( wordsOf( index, 'Root/3#0' ), 'Round frame' );
	assert.equal( wordsOf( inventoryIndex( { elements: [ el( 1, null, 'main' ), el( 2, 1, 'div' ) ] } ), 'Root/2#0' ), '' );
} );

test( 'the words are the label without the amount the button carries', () => {
	const els = elements();
	els.find( ( e ) => 10 === e.tpl ).words = 'Add my prescription · £59';
	const c = flowControls( { repo: FIX, client: 'c', entry: {}, inventory: { elements: els }, contextOf: contextOf() } );
	assert.equal( c.openers[ 0 ].label, 'Add my prescription' );
} );

// The calibrated child slots of a block that draws its children (lib/skeleton-child-slots.mjs, Spec 48 FR-48-6): the resting and
// current child, and the glyph a child draws beside its label (a navigation item's caret), whose size setting is calibrated on
// the block's own glyph element and so needs the draft's glyph element read, or the caret stays at the block's default size.
import test from 'node:test';
import assert from 'node:assert/strict';
import { childSlots } from '../lib/skeleton-child-slots.mjs';

const box = ( w, h ) => ( { 375: null, 768: null, 1440: { x: 0, y: 0, w, h } } );
const el = ( key, extra = {} ) => ( { key, tag: 'span', box: box( 80, 40 ), visible: { 1440: true }, srcOwnText: '', membership: [], ...extra } );
// Two items: the first without a caret, the second with a label and an 11px square caret holding only an icon hole.
const label = el( 'label', { srcOwnText: '{{ item.label }}' } );
const caret = el( 'caret', { box: box( 11, 11 ), srcOwnText: '{{ caretIcon }}' } );
const underline = el( 'underline', { box: box( 80, 2 ) } );
const item1 = el( 'item1' );
const item2 = el( 'item2' );
const tree = { item1: [ label ], item2: [ label, caret, underline ], label: [], caret: [], underline: [] };
const m = { kids: ( e ) => tree[ e.key ] || [] };
const finder = ( e ) => ( { tpl: e.key } );
const CARET = '.bar > .item:nth-of-type(1) > .sub > .caret';
const settings = { itemColour: { slot: '.bar > .item > .link' }, itemColourCurrent: { slot: '.bar > .item.current > .link', state: 'current' }, submenuCaretSize: { slot: CARET } };
const run = ( cfg, o = {} ) => childSlots( { cfg, items: [ item1, item2 ], m, finder, settings, states: [], ...o } );

test( 'MUST FAIL WITHOUT THE GLYPH SLOT: the first child holding a small square wordless element is read for the glyph setting\'s calibrated slot', () => {
	const r = run( { resting: 'itemColour', current: 'itemColourCurrent', glyph: 'submenuCaretSize' } );
	assert.deepEqual( r.slots[ CARET ], { tpl: 'caret' } );
	assert.equal( r.slots[ '.bar > .item > .link' ].tpl, 'item1' );
} );

test( 'MUST FAIL WITHOUT THE GLYPH TEST: a label, an underline strip and a square element with words are not a glyph', () => {
	const words = el( 'caret', { box: box( 11, 11 ), srcOwnText: 'Menu {{ x }}' } );
	const r = childSlots( { cfg: { resting: 'itemColour', glyph: 'submenuCaretSize' }, items: [ item2 ], m: { kids: ( e ) => ( 'item2' === e.key ? [ label, underline, words ] : [] ) }, finder, settings, states: [] } );
	assert.equal( undefined, r.slots[ CARET ] );
	assert.match( r.notes.join( ' ' ), /no draft child holds a glyph element/ );
	const svg = el( 'svg', { tag: 'svg', box: box( 14, 14 ), srcOwnText: '' } );
	const s = childSlots( { cfg: { glyph: 'submenuCaretSize' }, items: [ item2 ], m: { kids: ( e ) => ( 'item2' === e.key ? [ label, svg ] : [] ) }, finder, settings, states: [] } );
	assert.deepEqual( s.slots[ CARET ], { tpl: 'svg' } );
} );

test( 'a config without a glyph setting adds no glyph slot, and a glyph setting the calibration lacks is said', () => {
	assert.equal( undefined, run( { resting: 'itemColour' } ).slots[ CARET ] );
	const r = run( { glyph: 'submenuCaretSize' }, { settings: {} } );
	assert.deepEqual( r.slots, {} );
	assert.match( r.notes.join( ' ' ), /no slot for submenuCaretSize, so no glyph slot/ );
} );

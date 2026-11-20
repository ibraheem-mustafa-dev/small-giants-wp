// Fill reads a list's marker in every form the draft draws it (re-applies a510fd016's rule on today's code): an svg (icon), a typed
// ordinal 1, 01, 1., (1), i., a) counting up from 1 (numbered, with its number style), a dot or bar glyph, a disc, circle or square
// list style or a painted mark (bullet), any other glyph (emoji, written to each item's icon-name field with iconSource emoji), a
// list-style image, and the CSS an item's own element draws (list-style type, ::marker content, a ::before counter, glyph or small
// painted dot when its list style is none). markerType and numberFormat are written only from the framework DB's enum values.
// Run on the real framework DB (lib/fill-list-marker.mjs::listMarkerDecisions), plus a served local draft proving the collector
// reads a list item's CSS marker (lib/fill-read-collect.mjs). Mutation list: tests/fill-list-marker-forms.mutations.json.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { openDb } from '../lib/db.mjs';
import { listMarkerDecisions, markerSlots, ordinal, glyph, drawnByCss, itemSlotAt, markerSettingsFrom } from '../lib/fill-list-marker.mjs';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';

const db = openDb();
const ITEM = ( k ) => `.sgs-icon-list > .sgs-icon-list__item:nth-of-type(${ k })`;
const MARK = ( k ) => `${ ITEM( k ) } > .sgs-icon-list__icon`;
const cal = {
	block: 'sgs/icon-list',
	settings: {
		iconColour: { slot: MARK( 1 ), slots: [ MARK( 1 ) ] },
		iconColourGradient: { slot: `${ MARK( 1 ) } > svg`, slots: [ `${ MARK( 1 ) } > svg` ] },
		itemFontSize: { slot: ITEM( 1 ), slots: [ ITEM( 1 ) ] },
		gap: { slot: '.sgs-icon-list' },
		markerColour: { slot: `${ ITEM( 1 ) }::marker`, slots: [ `${ ITEM( 1 ) }::marker`, `${ ITEM( 1 ) }::marker > svg` ] },
	},
};
const items = [ { text: 'One' }, { text: 'Two' }, { text: 'Three' } ];
const decide = ( reads, attributes = { items: items.map( ( i ) => ( { ...i } ) ) } ) => listMarkerDecisions( { db, block: 'sgs/icon-list', cal, attributes, reads } );
const typed = ( ...words ) => Object.fromEntries( words.map( ( w, i ) => [ MARK( i + 1 ), { words: w } ] ) );
const write = ( r, attr ) => r.writes.find( ( x ) => attr === x.attr )?.value;
const css = ( over ) => ( { marker: { type: 'none', image: 'none', content: 'normal' }, pseudo: {}, ...over } );
const itemReads = ( ...each ) => Object.fromEntries( each.map( ( r, i ) => [ ITEM( i + 1 ), r ] ) );

test( 'MUST FAIL: a typed ordinal is read in every form a draft writes it, with the number styles that print it', () => {
	assert.deepEqual( ordinal( '1' ), { n: 1, formats: [ 'decimal' ] } );
	assert.deepEqual( ordinal( '01' ), { n: 1, formats: [ 'decimal-leading-zero' ] } );
	assert.deepEqual( ordinal( '(2)' ), { n: 2, formats: [ 'decimal' ] } );
	assert.deepEqual( ordinal( '3.' ), { n: 3, formats: [ 'decimal' ] } );
	assert.deepEqual( ordinal( 'iv.' ), { n: [ 4 ], formats: [ 'lower-roman' ] } );
	assert.deepEqual( ordinal( 'a)' ), { n: [ 1 ], formats: [ 'lower-alpha' ] } );
	assert.deepEqual( ordinal( 'i.' ), { n: [ 1, 9 ], formats: [ 'lower-roman', 'lower-alpha' ] }, 'a letter that is also a numeral reads both ways' );
	assert.equal( ordinal( 'Step one' ), null );
	assert.deepEqual( ordinal( 'B.' ), { n: [ 2 ], formats: [ 'upper-alpha' ] } );
	assert.deepEqual( ordinal( 'IV)' ), { n: [ 4 ], formats: [ 'upper-roman' ] } );
	assert.equal( ordinal( '1234' ), null, 'a year is no ordinal' );
} );

test( 'an svg at every marker part is still icon, read by the icon reader and written to the item', () => {
	const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	const r = decide( Object.fromEntries( [ 1, 2, 3 ].map( ( k ) => [ MARK( k ), { svg: { markup: svg } } ] ) ) );
	assert.equal( write( r, 'markerType' ), 'icon' );
	assert.deepEqual( write( r, 'items' ).map( ( i ) => i.iconSource ), [ 'lucide', 'lucide', 'lucide' ] );
} );

test( 'MUST FAIL: numbers counting up from 1 are numbered, and a leading-zero or roman style writes numberFormat', () => {
	const zero = decide( typed( '01', '02', '03' ) );
	assert.equal( write( zero, 'markerType' ), 'numbered' );
	assert.equal( write( zero, 'numberFormat' ), 'decimal-leading-zero' );
	const plain = decide( typed( '1.', '2.', '3.' ) );
	assert.equal( write( plain, 'markerType' ), 'numbered' );
	assert.equal( write( plain, 'numberFormat' ), undefined, 'the default style is not written over itself' );
	assert.deepEqual( plain.decided, { markerType: 'numbered', numberFormat: 'decimal' } );
	const over = decide( typed( '1', '2', '3' ), { items: items.map( ( i ) => ( { ...i } ) ), numberFormat: 'decimal-leading-zero' } );
	assert.equal( write( over, 'numberFormat' ), 'decimal', 'the default style is written over another value' );
} );

test( 'MUST FAIL: a style the framework DB does not list is a named row and writes no style', () => {
	const r = decide( typed( 'i.', 'ii.', 'iii.' ) );
	assert.equal( write( r, 'markerType' ), 'numbered' );
	assert.equal( write( r, 'numberFormat' ), undefined );
	const row = r.unmapped.find( ( u ) => 'list-style-type' === u.property );
	assert.equal( row?.value, 'lower-roman', JSON.stringify( r.unmapped ) );
} );

test( 'MUST FAIL: numbers that do not count up from 1, or whose styles differ, choose no marker type', () => {
	assert.match( decide( typed( '1', '3', '4' ) ).notes.join(), /do not count up from 1/ );
	assert.match( decide( typed( '1', '2', '03' ) ).notes.join(), /number styles differ/ );
	assert.equal( write( decide( typed( '1', '3', '4' ) ), 'markerType' ), undefined );
} );

test( 'MUST FAIL: a dot or bar glyph is a bullet; any other glyph is an emoji written to each item with its source emoji', () => {
	assert.equal( glyph( '•' ).kind, 'bullet' );
	assert.equal( glyph( '–' ).kind, 'bullet' );
	assert.equal( write( decide( typed( '•', '•', '•' ) ), 'markerType' ), 'bullet' );
	const r = decide( typed( '🔥', '🔥', '⭐' ) );
	assert.equal( write( r, 'markerType' ), 'emoji', 'two different glyphs are still all emoji' );
	assert.deepEqual( write( r, 'items' ).map( ( i ) => [ i.iconSource, i.iconName, i.text ] ), [ [ 'emoji', '🔥', 'One' ], [ 'emoji', '🔥', 'Two' ], [ 'emoji', '⭐', 'Three' ] ] );
	const held = items.map( ( i ) => ( { ...i, iconSource: 'emoji', iconName: '🔥' } ) );
	assert.equal( write( decide( typed( '🔥', '🔥', '🔥' ), { items: held } ), 'items' ), undefined, 'items that already hold the glyph are not written again' );
} );

test( 'MUST FAIL: the CSS an item draws is its marker: list-style type, ::marker content, ::before counter, glyph and painted dot', () => {
	const at = ( r ) => drawnByCss( r );
	assert.deepEqual( at( css( { marker: { type: 'decimal', image: 'none', content: 'normal' } } ) ), { kind: 'numbered', n: null, formats: [ 'decimal' ] } );
	assert.deepEqual( at( css( { marker: { type: 'lower-roman', image: 'none', content: 'normal' } } ) ), { kind: 'numbered', n: null, formats: [ 'lower-roman' ] } );
	assert.equal( at( css( { marker: { type: 'disc', image: 'none', content: 'normal' } } ) ).kind, 'bullet' );
	assert.equal( at( css( { marker: { type: 'disc', image: 'none', content: '"✓ "' } } ) ).glyph, '✓' );
	assert.equal( at( css( { marker: { type: 'disc', image: 'none', content: '""' } } ) ).kind, 'bullet', 'an empty ::marker content keeps the list style' );
	assert.equal( at( css( { marker: { type: '"→"', image: 'none', content: 'normal' } } ) ).glyph, '→' );
	assert.equal( at( css( { marker: { type: 'disc', image: 'url("a.png")', content: 'normal' } } ) ).kind, 'image' );
	assert.deepEqual( at( css( { pseudo: { '::before': { content: 'counter(item) ". "' } } } ) ), { kind: 'numbered', n: null, formats: [ 'decimal' ] } );
	assert.deepEqual( at( css( { pseudo: { '::before': { content: 'counter(item, upper-roman)' } } } ) ).formats, [ 'upper-roman' ] );
	assert.equal( at( css( { pseudo: { '::before': { content: '"▸"' } } } ) ).glyph, '▸' );
	assert.equal( at( css( { pseudo: { '::before': { content: '""', 'background-color': 'rgb(200, 0, 0)', width: '8px', height: '8px' } } } ) ).kind, 'bullet' );
} );

test( 'negative control: CSS that draws no marker is none, and a painted ::before that is a rule, not a dot, is not a marker', () => {
	assert.equal( drawnByCss( css() ), null );
	assert.equal( drawnByCss( css( { marker: { type: '""', image: 'none', content: 'normal' } } ) ), null, 'an empty list-style string draws nothing' );
	assert.equal( drawnByCss( css( { pseudo: { '::before': { content: '""', 'background-color': 'rgb(200, 0, 0)', width: '100%', height: '2px' } } } ) ), null, 'a full-width rule is no marker' );
	assert.equal( drawnByCss( css( { pseudo: { '::before': { content: '""', width: '8px', height: '8px' } } } ) ), null, 'an unpainted empty box is no marker' );
	assert.equal( drawnByCss( css( { pseudo: { '::before': { content: 'none' } } } ) ), null );
} );

test( 'MUST FAIL: an item whose own element draws a CSS marker pairs with the block\'s ::marker, never taking the item as a marker part', () => {
	assert.equal( itemSlotAt( MARK( 1 ), 2 ), ITEM( 2 ) );
	assert.equal( itemSlotAt( '.sgs-no-step', 2 ), null );
	const numbered = css( { marker: { type: 'decimal', image: 'none', content: 'normal' } } );
	const reads = itemReads( numbered, numbered, numbered );
	assert.deepEqual( markerSlots( { cal, slots: Object.keys( reads ), reads } ), { 1: `${ ITEM( 1 ) }::marker`, 2: `${ ITEM( 2 ) }::marker`, 3: `${ ITEM( 3 ) }::marker` } );
	const r = decide( reads );
	assert.equal( write( r, 'markerType' ), 'numbered' );
	assert.equal( write( r, 'items' ), undefined, 'a CSS marker writes no item setting' );
	const both = { ...itemReads( numbered ), [ MARK( 1 ) ]: { words: '•' } };
	assert.deepEqual( markerSlots( { cal, slots: Object.keys( both ), reads: both } ), { 1: MARK( 1 ) }, 'a marker part is kept over its item\'s CSS marker' );
	const mixed = itemReads( numbered, css(), numbered );
	assert.deepEqual( Object.keys( markerSlots( { cal, slots: Object.keys( mixed ), reads: mixed } ) ), [ '1', '3' ] );
	assert.match( decide( mixed ).notes.join(), /differ/ );
} );

test( 'negative control: an item part that draws no CSS marker, or a missing read, is no marker and the type is none', () => {
	const reads = itemReads( css(), css(), { missing: true } );
	assert.deepEqual( markerSlots( { cal, slots: Object.keys( reads ), reads } ), {} );
	assert.equal( write( decide( reads ), 'markerType' ), 'none' );
	assert.deepEqual( markerSlots( { cal: { settings: { itemFontSize: { slot: ITEM( 1 ) } } }, slots: Object.keys( reads ), reads } ), {}, 'a block with no marker part pairs nothing' );
} );

test( 'the marker settings come from a block\'s enum rows: the setting holding three marker kinds, and the one holding decimal', () => {
	const rows = [ { attr_name: 'markerType', enum_values: '["icon","emoji","bullet","numbered","none"]', default_value: '"icon"' }, { attr_name: 'numberFormat', enum_values: '["decimal","decimal-leading-zero"]', default_value: '"decimal"' }, { attr_name: 'align', enum_values: '["left","right"]', default_value: null } ];
	const S = markerSettingsFrom( rows );
	assert.equal( S.marker?.attr_name, 'markerType' );
	assert.equal( S.number?.attr_name, 'numberFormat' );
	assert.equal( S.number?.fallback, 'decimal' );
	assert.deepEqual( markerSettingsFrom( [ rows[ 2 ] ] ), { marker: null, number: null } );
} );

const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
ol.n, ul.b, ul.s { margin: 0; padding-left: 24px; }
ol.n { list-style: lower-roman; }
ul.b { list-style: disc; }
ul.s { list-style: none; }
ul.s li::before { content: "▸ "; }
ul.p { list-style: none; padding: 0; margin: 0; }
div.plain { display: block; }
</style></head><body><main>
<ol class="n"><li>One</li></ol>
<ul class="b"><li>Two</li></ul>
<ul class="s"><li>Three</li></ul>
<ul class="p"><li>Four</li></ul>
<div class="plain">Five</div>
</main></body></html>`;
const TREE = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/text', draftRef: 'ol.n li', attributes: {} },
	{ name: 'sgs/text', draftRef: 'ul.b li', attributes: {} },
	{ name: 'sgs/text', draftRef: 'ul.s li', attributes: {} },
	{ name: 'sgs/text', draftRef: 'ul.p li', attributes: {} },
	{ name: 'sgs/text', draftRef: 'div.plain', attributes: {} },
] } ];
let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-list-marker-forms-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: skeletonNodes( TREE ), headless: true, sweep: false } );
} );
after( () => served?.close() );
const at = ( id ) => read.widths[ 1440 ][ id ];

test( 'MUST FAIL: the collector reads a list item\'s CSS marker, and a non-list element has none', () => {
	assert.equal( at( '1:' ).marker?.type, 'lower-roman' );
	assert.equal( at( '2:' ).marker?.type, 'disc' );
	assert.equal( at( '3:' ).marker?.type, 'none' );
	assert.equal( at( '3:' ).pseudo?.[ '::before' ]?.content, '"▸ "' );
	assert.equal( at( '4:' ).marker?.type, 'none' );
	assert.equal( at( '5:' ).marker, null, 'a block element is not a list item' );
	assert.deepEqual( [ 1, 2, 3, 4 ].map( ( n ) => drawnByCss( at( `${ n }:` ) )?.kind ?? null ), [ 'numbered', 'bullet', 'emoji', null ] );
} );

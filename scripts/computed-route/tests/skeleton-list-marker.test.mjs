// A list item's own marker is read at the draft element that draws it (re-applies 567d088d2's rule on the skeleton's side):
// the list node gets a draftSlots entry at each item copy's marker part, so Fill can read the item's own svg. The marker part
// is the calibrated slot under the repeated item step whose `> svg` the calibration also names; an item with no marker gets
// none, and a block whose calibration holds no such part gets none at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const db = openDb();
const SHOWN = { 375: true, 768: true, 1440: true };
const boxAt = ( y, h = 24, x = 0, w = 240 ) => ( { 375: { x, y, w, h }, 768: { x, y, w, h }, 1440: { x, y, w, h } } );
const tplOf = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words, x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: tplOf( key ), attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ tplOf( key ) }">${ words }</${ tag }>`, box: x.box ?? boxAt( 0, 200 ), visible: SHOWN, display: x.display ?? 'block', flexDirection: 'row', screenshots: {} } );
// Three stacked links; those in `marked` hold an svg before their words.
const inventory = ( marked, links = [ [ 4, 'Certifications' ], [ 6, 'Trade' ], [ 8, 'Brands' ] ] ) => {
	const rows = [];
	links.forEach( ( [ n, words ], i ) => {
		rows.push( el( `Root/${ n }#0`, 'Root/3#0', 'a', words, { depth: 3, attrs: { href: `#/${ words.toLowerCase() }` }, box: boxAt( i * 30 ) } ) );
		marked.includes( i ) && rows.push( el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'svg', '', { depth: 4, box: boxAt( i * 30, 16, 0, 16 ) } ) );
	} );
	return { generated: 'x', source: 'planted', root: 'main', keyFormat: 'x', checks: { duplicateKeys: 0 }, elements: [ el( 'Root/1#0', null, 'main', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '' ), el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2 } ), ...rows ] };
};
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: new URL( '../../..', import.meta.url ).pathname.replace( /^\/([A-Za-z]:)/, '$1' ), siteName: 'Planted' } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const ITEM = '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(1)';
const CAL = { iconColour: { slot: `${ ITEM } > .sgs-icon-list__icon`, slots: [ `${ ITEM } > .sgs-icon-list__icon` ] }, iconColourGradient: { slot: `${ ITEM } > .sgs-icon-list__icon > svg` }, itemFontSize: { slot: ITEM } };
const listOf = ( marked, calSettings, links ) => nodes( proposeSkeleton( { inventory: inventory( marked, links ), facts: facts(), surface: 'footer', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings } ).skeleton ).find( ( n ) => facts().listSlug === n.name );
const markerSlot = ( k ) => `.sgs-icon-list > .sgs-icon-list__item:nth-of-type(${ k }) > .sgs-icon-list__icon`;

test( 'MUST FAIL: each item\'s svg is read at its own copy\'s marker part', () => {
	const list = listOf( [ 0, 1, 2 ], ( b ) => ( 'sgs/icon-list' === b ? CAL : {} ) );
	assert.equal( list.draftSlots?.[ markerSlot( 1 ) ]?.tpl, 'Root/5#0' );
	assert.equal( list.draftSlots?.[ markerSlot( 2 ) ]?.tpl, 'Root/7#0' );
	assert.equal( list.draftSlots?.[ markerSlot( 3 ) ]?.tpl, 'Root/9#0' );
} );

test( 'an item with no svg gets no marker slot, and the others keep theirs at their own copy number', () => {
	const list = listOf( [ 0, 2 ], ( b ) => ( 'sgs/icon-list' === b ? CAL : {} ) );
	assert.deepEqual( Object.keys( list.draftSlots || {} ).filter( ( s ) => s.endsWith( '__icon' ) ).sort(), [ markerSlot( 1 ), markerSlot( 3 ) ] );
} );

test( 'negative control: a calibration with no part holding the svg gives the list no marker slot', () => {
	const list = listOf( [ 0, 1, 2 ], () => ( { itemFontSize: { slot: ITEM } } ) );
	assert.deepEqual( Object.keys( list.draftSlots || {} ).filter( ( s ) => s.includes( '__icon' ) ), [] );
} );

test( 'a row the brief-only rule removes is no item copy: the marker slots count the rows that stay', () => {
	const list = listOf( [ 0, 1, 2, 3 ], ( b ) => ( 'sgs/icon-list' === b ? CAL : {} ), [ [ 4, 'Certifications' ], [ 6, 'Coming soon' ], [ 8, 'Trade' ], [ 10, 'Brands' ] ] );
	assert.deepEqual( list.attributes.items.map( ( i ) => i.text ), [ 'Certifications', 'Trade', 'Brands' ] );
	assert.deepEqual( Object.entries( list.draftSlots ).filter( ( [ s ] ) => s.endsWith( '__icon' ) ).map( ( [ s, f ] ) => [ s, f.tpl ] ), [ [ markerSlot( 1 ), 'Root/5#0' ], [ markerSlot( 2 ), 'Root/9#0' ], [ markerSlot( 3 ), 'Root/11#0' ] ] );
} );

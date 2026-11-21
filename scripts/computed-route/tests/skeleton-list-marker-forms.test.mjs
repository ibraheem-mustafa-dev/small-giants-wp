// A list row's typed ordinal, dot or glyph marker is read at the draft element that draws it (re-applies a510fd016's rule on the
// skeleton's side): the list node gets a draftSlots entry at each item copy's marker part for the row's leading marker element
// (an empty dot or bar, a typed ordinal, an emoji or other glyph), as it already does for an svg. A row whose first child is
// ordinary words, or a long run of text, has no marker element and gets none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const db = openDb();
const SHOWN = { 375: true, 768: true, 1440: true };
const boxAt = ( y, h = 24, x = 0, w = 240 ) => ( { 375: { x, y, w, h }, 768: { x, y, w, h }, 1440: { x, y, w, h } } );
const tplOf = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words, x = {} ) => ( { hiddenAt: x.hidden, key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: tplOf( key ), attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ tplOf( key ) }">${ words }</${ tag }>`, box: x.box ?? boxAt( 0, 200 ), visible: x.hidden ? { 375: false, 768: false, 1440: false } : SHOWN, display: x.display ?? 'block', flexDirection: 'row', screenshots: {} } );
// Three stacked links; the first child of each is `lead` (words, or null for none) in a span.
const inventory = ( lead, dot = false, leadTag = 'span', leadShown = true ) => {
	const rows = [];
	[ 'Certifications', 'Trade', 'Brands' ].forEach( ( words, i ) => {
		const n = 4 + i * 2;
		rows.push( el( `Root/${ n }#0`, 'Root/3#0', 'a', words, { depth: 3, attrs: { href: `#/${ words.toLowerCase() }` }, box: boxAt( i * 30 ), allText: `${ lead( i ) ?? '' } ${ words }` } ) );
		null !== lead( i ) && rows.push( el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, leadTag, lead( i ), { depth: 4, box: boxAt( i * 30, 16, 0, 16 ), attrs: dot ? { style: 'width:8px;height:8px' } : {}, hidden: ! leadShown } ) );
	} );
	return { generated: 'x', source: 'planted', root: 'main', keyFormat: 'x', checks: { duplicateKeys: 0 }, elements: [ el( 'Root/1#0', null, 'main', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '' ), el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2 } ), ...rows ] };
};
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: new URL( '../../..', import.meta.url ).pathname.replace( /^\/([A-Za-z]:)/, '$1' ), siteName: 'Planted' } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const ITEM = '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(1)';
const CAL = { iconColour: { slot: `${ ITEM } > .sgs-icon-list__icon`, slots: [ `${ ITEM } > .sgs-icon-list__icon` ] }, iconColourGradient: { slot: `${ ITEM } > .sgs-icon-list__icon > svg` }, itemFontSize: { slot: ITEM } };
const listOf = ( lead, calSettings = ( b ) => ( 'sgs/icon-list' === b ? CAL : {} ), dot = false, leadTag = 'span', leadShown = true ) => nodes( proposeSkeleton( { inventory: inventory( lead, dot, leadTag, leadShown ), facts: facts(), surface: 'footer', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings } ).skeleton ).find( ( n ) => facts().listSlug === n.name );
const markerSlot = ( k ) => `.sgs-icon-list > .sgs-icon-list__item:nth-of-type(${ k }) > .sgs-icon-list__icon`;
const slotTpls = ( list ) => Object.entries( list.draftSlots || {} ).filter( ( [ s ] ) => s.endsWith( '__icon' ) ).map( ( [ s, f ] ) => [ s, f.tpl ] );

test( 'MUST FAIL: a typed ordinal at the start of each row is read at the element that draws it', () => {
	const list = listOf( ( i ) => String( i + 1 ) );
	assert.deepEqual( slotTpls( list ), [ [ markerSlot( 1 ), 'Root/5#0' ], [ markerSlot( 2 ), 'Root/7#0' ], [ markerSlot( 3 ), 'Root/9#0' ] ] );
} );

test( 'MUST FAIL: an emoji or other glyph at the start of a row is its marker element', () => {
	assert.deepEqual( slotTpls( listOf( () => '🔥' ) ).map( ( [ , t ] ) => t ), [ 'Root/5#0', 'Root/7#0', 'Root/9#0' ] );
	assert.deepEqual( slotTpls( listOf( () => '→' ) ).map( ( [ , t ] ) => t ), [ 'Root/5#0', 'Root/7#0', 'Root/9#0' ] );
} );

test( 'negative control: a first child holding words is no marker, and a block with no marker part gets no marker slot', () => {
	assert.deepEqual( slotTpls( listOf( () => 'New' ) ), [] );
	assert.deepEqual( slotTpls( listOf( () => null ) ), [] );
	assert.deepEqual( slotTpls( listOf( () => '1', () => ( {} ) ) ), [] );
} );

test( 'MUST FAIL: an empty dot or bar at the start of a row is its marker element', () => {
	assert.deepEqual( slotTpls( listOf( () => '', undefined, true ) ).map( ( [ , t ] ) => t ), [ 'Root/5#0', 'Root/7#0', 'Root/9#0' ] );
} );

test( 'negative control: a short phrase is not one glyph, and an empty element of no marker size is no dot', () => {
	assert.deepEqual( slotTpls( listOf( () => 'x, y' ) ), [] );
	assert.deepEqual( slotTpls( listOf( () => '' ) ), [], 'an empty span with no size is not a dot' );
	assert.deepEqual( slotTpls( listOf( () => 'é' ) ), [], 'a letter outside a-z is text, not a glyph' );
	assert.deepEqual( slotTpls( listOf( () => '→→' ) ), [], 'two glyphs are not one marker' );
	assert.deepEqual( slotTpls( listOf( () => '→', undefined, false, 'a' ) ), [], 'a link is a control, not a marker' );
	assert.deepEqual( slotTpls( listOf( () => '→', undefined, false, 'button' ) ), [], 'a button is a control, not a marker' );
	assert.deepEqual( slotTpls( listOf( () => '→', undefined, false, 'span', false ) ), [], 'a first child no width shows is not a marker' );
} );

// Rows of text, each after a typed ordinal: a row that paints a look of its own (padding, a rule) is read at its copy's item part
// too, as the marker is at the marker part (lib/skeleton-write-units.mjs::markerSlotsOf); a row that paints nothing is not.
const textRows = ( style, tag = 'div' ) => {
	const rows = [];
	[ 'Trade accounts', 'Orders', 'Pricing' ].forEach( ( words, i ) => {
		const n = 4 + i * 2;
		rows.push( el( `Root/${ n }#0`, 'Root/3#0', tag, words, { depth: 3, attrs: { ...( style ? { style } : {} ), ...( 'a' === tag ? { href: `#/${ i }` } : {} ) }, box: boxAt( i * 30 ), allText: `0${ i + 1 } ${ words }` } ) );
		rows.push( el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'span', `0${ i + 1 }`, { depth: 4, box: boxAt( i * 30, 16, 0, 16 ) } ) );
	} );
	return { generated: 'x', source: 'planted', root: 'main', keyFormat: 'x', checks: { duplicateKeys: 0 }, elements: [ el( 'Root/1#0', null, 'main', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '' ), el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2 } ), ...rows ] };
};
const itemTpls = ( style, tag ) => {
	const list = nodes( proposeSkeleton( { inventory: textRows( style, tag ), facts: facts(), surface: 'page', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings: ( b ) => ( 'sgs/icon-list' === b ? CAL : {} ) } ).skeleton ).find( ( n ) => facts().listSlug === n.name );
	return Object.entries( list?.draftSlots || {} ).filter( ( [ s ] ) => /__item:nth-of-type\(\d\)$/.test( s ) ).map( ( [ sl, f ] ) => [ sl, f.tpl ] );
};

test( 'MUST FAIL: a padded text row beside its marker is read at its own copy\'s item part; negative control: a row that paints nothing is not', () => {
	assert.deepEqual( itemTpls( 'padding:8px 0 8px 16px' ), [ [ '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(1)', 'Root/4#0' ], [ '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(2)', 'Root/6#0' ], [ '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(3)', 'Root/8#0' ] ] );
	assert.deepEqual( itemTpls( null ), [] );
	assert.deepEqual( itemTpls( 'padding:8px 0 8px 16px', 'a' ), [], 'a padded link row is the link part\'s, never the item\'s' );
} );

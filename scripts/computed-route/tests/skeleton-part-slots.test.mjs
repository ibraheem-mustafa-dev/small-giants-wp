// An element a drawing block absorbs that is one of the block's own parts (Spec 48 FR-48-6): the control that opens the
// drawer is the navigation block's burger part, so it becomes the navigation node's draftSlots entry at the part's
// calibrated slot, and its children become the part's sub-part slots (the bars) where calibration measured them.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { mediaSelfSlot, drawnSvgParts, codeItemSlots, codeIconSlots, itemSlots, itemHolder, ABSENT_PART } from '../lib/skeleton-part-slots.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Example Co' } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const idOf = ( n ) => n.variantKey ?? n.draftRef?.tpl;
const nodeAt = ( r, key ) => nodes( r.skeleton ).find( ( n ) => idOf( n ) === key );
const at = ( x, y, w = 100 ) => ( { x, y, w, h: 20 } );
const el = ( id, parent, tag, words, x = {} ) => {
	const shown = x.widths || [ 375, 768, 1440 ];
	const vis = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, shown.includes( w ) ] ) );
	const box = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, vis[ w ] ? x.box : null ] ) );
	return { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: x.depth ?? 1, tag, template: 'Root', tpl: id, attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: x.snippet || `<${ tag }></${ tag }>`, visible: vis, box, display: x.display || 'block', widths: shown, flexDirection: x.flexDirection || null };
};
const inv = ( elements ) => ( { checks: {}, source: 'fixture', root: 'header', generated: 'fixture', elements } );
const DRAWER = { elements: {}, surfaces: { 'S-09': { id: 'S-09', kind: 'drawer', name: 'Mobile menu', parent: null } } };
const withDrawer = { factRecord: DRAWER, openers: { 'S-09': 'Burger button (toggleMobile) on tablet and mobile' } };
const click = '<button data-dc-tpl="59" sc-camel-on-click="{{ toggleMobile }}"></button>';
const COMPACT = [ 375, 768 ];
const HEADER = [
	el( 1, null, 'header', '', { depth: 0, box: at( 0, 0, 1000 ), display: 'flex' } ),
	el( 45, 1, 'nav', '', { depth: 1, box: at( 0, 0, 400 ), display: 'flex', allText: 'Home About' } ),
	el( 46, 45, 'a', 'Home', { depth: 2, box: at( 0, 0, 50 ), attrs: { href: '/' } } ),
	el( 47, 45, 'a', 'About', { depth: 2, box: at( 60, 0, 50 ), attrs: { href: '/about' } } ),
	el( 56, 1, 'div', '', { depth: 1, widths: COMPACT, box: at( 500, 0 ), display: 'flex' } ),
	el( 59, 56, 'button', '', { depth: 2, widths: COMPACT, box: at( 500, 0 ), snippet: click, display: 'flex' } ),
];
// The bars straight in the button (the draft draws no icon box), or inside one span.
const BARS = [ 60, 61, 62 ].map( ( id, i ) => el( id, 59, 'span', '', { depth: 3, widths: COMPACT, box: at( 500, i * 6, 18 - ( 5 * i ) ) } ) );
const BOXED = [ el( 63, 59, 'span', '', { depth: 3, widths: COMPACT, box: at( 500, 0, 18 ) } ), ...[ 60, 61, 62 ].map( ( id, i ) => el( id, 63, 'span', '', { depth: 4, widths: COMPACT, box: at( 500, i * 6, 18 ) } ) ) ];

const BURGER = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger';
const ICON = `${ BURGER } > .sgs-nav-bar-menu__burger-icon`;
const BAR = ( n ) => `${ ICON } > .sgs-nav-bar-menu__burger-bar:nth-of-type(${ n })`;
// The slots the real cache holds for these settings (cache/nav-bar-menu.json), burgerSize and burgerWidth at the burger.
const CAL = {
	burgerSize: { slot: BURGER, slots: [ BURGER ] },
	burgerPadding: { slot: BURGER, slots: [ BURGER ] },
	burgerBg: { slot: BURGER, slots: [ BURGER ] },
	burgerBorderWidth: { slot: BURGER, slots: [ BURGER ] },
	burgerIconWidth: { slot: ICON, slots: [ ICON, BAR( 1 ), BAR( 2 ), BAR( 3 ) ] },
	burgerBarThickness: { slot: BAR( 1 ), slots: [ BAR( 1 ), BAR( 2 ), BAR( 3 ) ] },
};
const run = ( elements, calSettings = () => CAL ) => proposeSkeleton( { inventory: inv( elements ), facts, surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db, ...withDrawer, calSettings } );
const slotsOf = ( r ) => nodeAt( r, 'Root/45#0' ).draftSlots || {};

test( 'MUST FAIL (the opener is the nav\'s burger part): the absorbed button is the nav\'s draftSlots entry at the burger\'s calibrated slot', () => {
	const r = run( [ ...HEADER, ...BARS ] );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/59#0' === x.key ).rule, 'drawerOpener' );
	assert.equal( slotsOf( r )[ BURGER ].tpl, 'Root/59#0' );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/45#0' === x.key ).slots[ BURGER ].tpl, 'Root/59#0' );
} );

test( 'MUST FAIL (the bars are the part\'s sub-part slots): bars that sit straight in the button are the calibrated bar paths, in order; the box the draft does not draw is named, not invented', () => {
	const r = run( [ ...HEADER, ...BARS ] );
	assert.deepEqual( [ 1, 2, 3 ].map( ( n ) => slotsOf( r )[ BAR( n ) ]?.tpl ), [ 'Root/60#0', 'Root/61#0', 'Root/62#0' ] );
	assert.ok( ! ( ICON in slotsOf( r ) ), 'no draft element is the icon box' );
	assert.ok( r.proposal.rows.find( ( x ) => 'Root/45#0' === x.key ).slotNotes.some( ( n ) => n.startsWith( `${ ICON }:` ) ) );
} );

test( 'MUST FAIL (a drawn icon box is its slot): bars inside one span give the box and its bars their own elements', () => {
	const r = run( [ ...HEADER, ...BOXED ] );
	assert.equal( slotsOf( r )[ ICON ].tpl, 'Root/63#0' );
	assert.deepEqual( [ 1, 2, 3 ].map( ( n ) => slotsOf( r )[ BAR( n ) ]?.tpl ), [ 'Root/60#0', 'Root/61#0', 'Root/62#0' ] );
} );

// The bars in a box beside the burger's word (two same-shaped bars, then a word shown only on the tablet): the box is the
// icon slot, the bars are bars 1 and 2, and the third bar the calibration measures is absent, not the word.
const BARITEM = ( id, i ) => el( id, 63, 'span', '', { depth: 4, widths: COMPACT, box: { x: 500, y: i * 6.5, w: 22, h: 1.5 } } );
const WORDED = [ el( 63, 59, 'span', '', { depth: 3, widths: COMPACT, box: { x: 500, y: 0, w: 22, h: 8 } } ), BARITEM( 60, 0 ), BARITEM( 61, 1 ), el( 64, 59, 'span', 'Menu', { depth: 3, widths: [ 768 ], box: { x: 532, y: 0, w: 36, h: 16 } } ) ];
const CAL3 = { ...CAL, burgerBar3BorderRadius: { slot: BAR( 3 ), slots: [ BAR( 3 ) ] } };

test( 'MUST FAIL (the bars\' box beside a word): the box holding the same-shaped bars is the icon slot, the bars are bars 1 and 2, and the third is absent', () => {
	const r = run( [ ...HEADER, ...WORDED ], () => CAL3 );
	assert.equal( slotsOf( r )[ ICON ]?.tpl, 'Root/63#0', JSON.stringify( slotsOf( r ) ) );
	assert.deepEqual( [ 1, 2 ].map( ( n ) => slotsOf( r )[ BAR( n ) ]?.tpl ), [ 'Root/60#0', 'Root/61#0' ] );
	assert.deepEqual( slotsOf( r )[ BAR( 3 ) ], ABSENT_PART, 'the third bar has the finder that finds nothing' );
	assert.ok( r.proposal.rows.find( ( x ) => 'Root/45#0' === x.key ).slotNotes.some( ( n ) => n.startsWith( `${ BAR( 3 ) }:` ) && n.includes( 'draws 2' ) ) );
} );

test( 'negative controls: bars of different sizes are no repeated items (no absent bar), a step with no calibrated repeated part is never the bars\' box, and different tags are no items', () => {
	const uneven = [ ...HEADER, el( 63, 59, 'span', '', { depth: 3, widths: COMPACT, box: at( 500, 0, 22 ) } ), el( 60, 63, 'span', '', { depth: 4, widths: COMPACT, box: at( 500, 0, 22 ) } ), el( 61, 63, 'span', '', { depth: 4, widths: COMPACT, box: at( 500, 6, 12 ) } ), el( 64, 59, 'span', 'Menu', { depth: 3, widths: [ 768 ], box: at( 532, 0, 36 ) } ) ];
	const r = run( uneven, () => CAL3 );
	assert.ok( ! ( BAR( 3 ) in slotsOf( r ) ), JSON.stringify( slotsOf( r ) ) );
	assert.ok( ! ( ICON in slotsOf( r ) ), 'no child holds same-shaped items, so the icon box is not invented' );
	const lone = run( [ ...HEADER, ...WORDED ], () => ( { burgerSize: CAL.burgerSize, burgerIconWidth: { slot: ICON, slots: [ ICON ] } } ) );
	assert.ok( ! ( ICON in slotsOf( lone ) ), 'a step the calibration repeats no part inside is never chosen by its children\'s shape' );
	const mixed = [ ...HEADER, el( 63, 59, 'span', '', { depth: 3, widths: COMPACT, box: at( 500, 0, 22 ) } ), el( 60, 63, 'span', '', { depth: 4, widths: COMPACT, box: at( 500, 0, 22 ) } ), el( 61, 63, 'i', '', { depth: 4, widths: COMPACT, box: at( 500, 6, 22 ) } ), el( 64, 59, 'span', 'Menu', { depth: 3, widths: [ 768 ], box: at( 532, 0, 36 ) } ) ];
	assert.ok( ! ( BAR( 3 ) in slotsOf( run( mixed, () => CAL3 ) ) ), 'two elements of different tags are no repeated items' );
} );

test( 'MUST FAIL (a layer is read at its element): a calibrated path naming the ::before layer of the icon box gives no slot with the suffix; the box is read once, at its plain path', () => {
	const WITH_LAYER = { ...CAL, burgerIconWidth: { slot: ICON, slots: [ ICON, `${ ICON }::before`, BAR( 1 ), BAR( 2 ), BAR( 3 ) ] } };
	const slots = slotsOf( run( [ ...HEADER, ...BOXED ], () => WITH_LAYER ) );
	assert.deepEqual( Object.keys( slots ).filter( ( k ) => /::/.test( k ) ), [], 'no slot names a pseudo-element layer (Fill refuses it, lib/fill-skeleton.mjs::skeletonProblems)' );
	assert.equal( slots[ ICON ].tpl, 'Root/63#0', 'the layer is read at its element, the icon box' );
	assert.deepEqual( [ 1, 2, 3 ].map( ( n ) => slots[ BAR( n ) ]?.tpl ), [ 'Root/60#0', 'Root/61#0', 'Root/62#0' ], 'the bars keep their own slots' );
} );

test( 'MUST FAIL (no calibration, no slot): a block with no calibrated burger gains no slot and says so', () => {
	const r = run( [ ...HEADER, ...BARS ], () => ( {} ) );
	assert.ok( ! Object.keys( slotsOf( r ) ).some( ( k ) => k.includes( 'burger' ) ) );
	assert.ok( r.proposal.rows.find( ( x ) => 'Root/45#0' === x.key ).slotNotes.some( ( n ) => n.includes( 'no slot for the burger part' ) ) );
} );

// A draft element that is itself the media a block draws at one inner element of the same tag (lib/skeleton-part-slots.mjs::mediaSelfSlot).
const LOGO_TAGS = { '': 'div', '.sgs-responsive-logo__link': 'a', '.sgs-responsive-logo__link > .sgs-responsive-logo__picture': 'span', '.sgs-responsive-logo__link > .sgs-responsive-logo__picture > .sgs-media-el': 'img' };
const IMG_SLOT = '.sgs-responsive-logo__link > .sgs-responsive-logo__picture > .sgs-media-el';

test( 'MUST FAIL: a draft <img> the block wraps in its own root, link and picture is the slot of the block\'s one inner <img> too', () => {
	assert.equal( mediaSelfSlot( { tag: 'img', tags: LOGO_TAGS } ), IMG_SLOT );
	assert.equal( mediaSelfSlot( { tag: 'IMG', tags: LOGO_TAGS } ), IMG_SLOT, 'the tag compares in lower case' );
	const logo = [ el( 1, null, 'header', '', { depth: 0, box: at( 0, 0, 1000 ), display: 'flex' } ), el( 2, 1, 'a', '', { depth: 1, box: at( 0, 0, 200 ), attrs: { href: '/', 'aria-label': 'Home' } } ), el( 3, 2, 'img', '', { depth: 2, box: at( 0, 0, 200 ), attrs: { src: 'assets/logo.png', alt: 'Acme' } } ) ];
	const r = proposeSkeleton( { inventory: inv( logo ), facts, surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db, calTags: () => LOGO_TAGS } );
	const img = nodes( r.skeleton ).find( ( n ) => 'Root/3#0' === n.draftRef?.tpl );
	assert.ok( img, 'the image has a node of its own' );
	assert.equal( img.draftSlots?.[ IMG_SLOT ]?.tpl, 'Root/3#0', JSON.stringify( img.draftSlots ) );
	const none = proposeSkeleton( { inventory: inv( logo ), facts, surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db } );
	assert.equal( nodes( none.skeleton ).find( ( n ) => 'Root/3#0' === n.draftRef?.tpl )?.draftSlots?.[ IMG_SLOT ], undefined, 'no calibrated tags, no slot' );
} );

test( 'the media pairing does not fire for a block whose root is the image, one with two inner images, or a draft element that is not media', () => {
	assert.equal( mediaSelfSlot( { tag: 'img', tags: { '': 'img', '.sgs-x > img': 'img' } } ), null, 'the root is the image: the draft element is already the root' );
	assert.equal( mediaSelfSlot( { tag: 'img', tags: { ...LOGO_TAGS, '.sgs-responsive-logo__dark': 'img' } } ), null, 'two inner images: no single one to pair' );
	assert.equal( mediaSelfSlot( { tag: 'div', tags: LOGO_TAGS } ), null );
	assert.equal( mediaSelfSlot( { tag: 'svg', tags: { '': 'div', '.x > svg': 'svg' } } ), null, 'an inline svg is a part, paired by its own rule' );
	assert.equal( mediaSelfSlot( { tag: 'img', tags: { '': 'div', '.x::before': 'img' } } ), null, 'a pseudo-element is never the media' );
} );

test( 'MUST FAIL: an inline SVG part drawn only at a narrower width (a phone bar\'s icon) is still a glyph slot; one drawn at no width, a non-part and a non-SVG are not', () => {
	const kid = ( tag, visible, part = true ) => ( { tag, visible, part } );
	const phone = kid( 'svg', { 375: true, 768: true, 1440: false } );
	const desk = kid( 'svg', { 375: false, 768: false, 1440: true } );
	const never = kid( 'svg', { 375: false, 768: false, 1440: false } );
	const notPart = kid( 'svg', { 375: true, 768: true, 1440: true }, false );
	const span = kid( 'span', { 375: true, 768: true, 1440: true } );
	assert.deepEqual( drawnSvgParts( [ phone, desk, never, notPart, span ], ( k ) => k.part ), [ phone, desk ] );
} );

test( 'codeItemSlots: each named setting\'s calibrated element is read at the first code-built item; a pseudo slot or an unknown setting is a note', () => {
	const r = codeItemSlots( { at: [ 0, 2 ], settings: [ 'itemGap', 'glow', 'missing' ], calibrated: { itemGap: { slot: '.a > .b' }, glow: { slot: '.a::before' } } } );
	assert.deepEqual( Object.keys( r.slots ), [ '.a > .b' ] );
	assert.equal( r.notes.length, 2 );
	assert.deepEqual( codeItemSlots( { at: [ -1 ], settings: [ 'itemGap' ], calibrated: { itemGap: { slot: '.a' } } } ).slots, {}, 'a path that is no index list gives no slot' );
} );

test( 'codeIconSlots: a setting two ways of drawing share is read at the first item svg only at the slots the chosen way own settings are calibrated at; with no such setting, every first-item slot (MUST FAIL without the mode filter)', () => {
	const A = ( k ) => `.t > .b:nth-of-type(${ k }) > .circle > svg`;
	const B = ( k ) => `.t > .b:nth-of-type(${ k }) > .bare > svg`;
	const calibrated = { colour: { slot: A( 1 ), slots: [ A( 1 ), B( 1 ), A( 2 ), B( 2 ) ] }, bareSize: { slot: B( 1 ), slots: [ B( 1 ), B( 2 ) ] }, pseudo: { slot: '.t::before' } };
	const bare = codeIconSlots( { at: [ 0, 3 ], settings: [ 'colour' ], calibrated, modeSettings: [ 'bareSize' ] } );
	assert.deepEqual( Object.keys( bare.slots ), [ B( 1 ) ] );
	assert.match( bare.slots[ B( 1 ) ].js, /\[ 0, 3 \]/ );
	assert.match( bare.slots[ B( 1 ) ].js, /querySelector\( 'svg' \)/ );
	assert.deepEqual( Object.keys( codeIconSlots( { at: [ 0, 3 ], settings: [ 'colour' ], calibrated, modeSettings: [] } ).slots ), [ A( 1 ), B( 1 ) ], 'no mode setting calibrated: both ways, first item' );
	const none = codeIconSlots( { at: [ 0 ], settings: [ 'colour', 'pseudo', 'missing' ], calibrated: { ...calibrated, colour: { slot: A( 1 ) } }, modeSettings: [ 'bareSize' ] } );
	assert.deepEqual( [ none.slots, none.notes.length ], [ {}, 3 ], 'a setting with no slot at the chosen part, a pseudo-element slot and an unknown setting are notes' );
	assert.deepEqual( codeIconSlots( { at: [ -1 ], settings: [ 'colour' ], calibrated } ).slots, {}, 'a path that is no index list gives no slot' );
} );

test( 'MUST FAIL: the element a block lays its items out on (its calibrated item slot\'s steps before the item) is read at the draft element holding the items, which may be the draft element itself; an item that is the draft element, a holder outside it, a slot below the item and a taken slot give none', () => {
	const ITEM = '.sgs-gallery__grid > .sgs-gallery__item:nth-of-type(1)';
	const calibrated = { tile: { slot: ITEM }, label: { slot: `${ ITEM } > .sgs-gallery__caption` }, root: { slot: '.sgs-gallery__item:nth-of-type(1)' }, cell: { slot: '.sgs-table > .sgs-table__row:nth-of-type(1) > .sgs-table__cell:nth-of-type(1)' } };
	const item = { tpl: 'Root/3#0' };
	const box = { tpl: 'Root/2#0' };
	assert.deepEqual( itemSlots( { finder: item, settings: [ 'tile' ], calibrated, container: box } ).slots, { [ ITEM ]: item, '.sgs-gallery__grid': box }, 'the grid is the holder' );
	assert.deepEqual( itemSlots( { finder: item, settings: [ 'tile' ], calibrated } ).slots, { [ ITEM ]: item }, 'no holder, no grid slot' );
	assert.deepEqual( itemSlots( { finder: item, settings: [ 'label', 'root', 'cell' ], calibrated, container: box } ).slots, { [ `${ ITEM } > .sgs-gallery__caption` ]: item, '.sgs-gallery__item:nth-of-type(1)': item, [ calibrated.cell.slot ]: item }, 'a slot below the item, an item straight under the root and an item inside another repeated item name no container' );
	// The holder is the first item's parent, inside the block's draft element or the element itself.
	const els = { root: { key: 'root', parentKey: 'page' }, page: { key: 'page', parentKey: null }, row: { key: 'row', parentKey: 'root' }, a: { key: 'a', parentKey: 'row' }, b: { key: 'b', parentKey: 'root' } };
	const m = { byKey: els };
	assert.equal( itemHolder( m, els.b, els.root ), els.root, 'items laid out on the draft element itself' );
	assert.equal( itemHolder( m, els.a, els.root ), els.row, 'items laid out on an element inside it' );
	assert.equal( itemHolder( m, els.root, els.root ), null, 'an item that is the draft element has no holder in the block' );
	assert.equal( itemHolder( m, els.root, els.row ), null, 'a parent outside the block is no holder' );
} );

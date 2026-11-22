// rules.splitMenu (Spec 48 FR-48-30): a header menu drawn in two halves. The page map flags the navigation links on the logo's
// far side from the header's nav as items of the nav's own menu (`splitItem`) and records where it splits (`splitAfter`,
// lib/intake-pagemap-split.mjs). The skeleton (lib/skeleton-split-menu.mjs) draws the nav as the first half and the far side's
// links as ONE second `sgs/nav-bar-menu` bound to the same menu, both carrying `splitSide` and `splitAfterItemId` (the item
// identifier menu-map.json records), the second with no burger; the far side's first link is that block and the others are
// absorbed into it. The second half reads its outer element and bar at the group holding its links and its items at its first
// link; the nav reads its bar at itself. Each MUST FAIL test turns red under a mutation in tests/skeleton-split-menu.mutations.json
// (python E:\sgs-tmp\general-cloning\mutate_slow.py scripts\computed-route tests\skeleton-split-menu.mutations.json tests/skeleton-split-menu.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { linkContext } from '../lib/draft-link.mjs';
import { splitMenuOf, splitLinkOf, splitSlots, sidesOf } from '../lib/skeleton-split-menu.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const boxes = ( y, h = 20, w = 100, x = 0 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || boxes( 100 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} } );
// The header (Root/1), its bar (Root/2) holding the nav (Root/3, two links) and a right-hand group (Root/6) holding a phone
// link, the About and Help links (outside the nav) and an account button.
const header = () => [
	el( 'Root/1#0', null, 'header', '', { depth: 0, box: boxes( 90, 60 ) } ),
	el( 'Root/2#0', 'Root/1#0', 'div', '', { display: 'flex' } ),
	el( 'Root/3#0', 'Root/2#0', 'nav', '', { depth: 2, display: 'flex' } ),
	el( 'Root/4#0', 'Root/3#0', 'a', 'Shop', { depth: 3, attrs: { href: '/shop' } } ),
	el( 'Root/5#0', 'Root/3#0', 'a', 'Brands', { depth: 3, attrs: { href: '/brands' } } ),
	el( 'Root/6#0', 'Root/2#0', 'div', '', { depth: 2, display: 'flex' } ),
	el( 'Root/7#0', 'Root/6#0', 'a', 'Call', { depth: 3, attrs: { href: '/call' } } ),
	el( 'Root/8#0', 'Root/6#0', 'a', 'About us', { depth: 3, attrs: { href: '/about' } } ),
	el( 'Root/9#0', 'Root/6#0', 'a', 'Help', { depth: 3, attrs: { href: '#' } } ),
	el( 'Root/10#0', 'Root/6#0', 'a', 'Sign in', { depth: 3, attrs: { href: '/account' } } ),
];
const inv = ( elements ) => ( { generated: 'fixture', source: 'fixture', root: 'header', checks: { rootKey: 'Root/1#0' }, elements } );
const item = ( label, position, x = {} ) => ( { label, targets: [], position, children: [], parentItem: null, ...x } );
const split = ( after = { position: 2, label: 'Brands' } ) => [ { menu: 'header', region: 'header', file: 'Site.dc.html', items: [ item( 'Shop', 1 ), item( 'Brands', 2 ), item( 'About us', 3, { splitItem: true } ), item( 'Help', 4, { splitItem: true } ) ], ...( after ? { splitAfter: after } : {} ) } ];
const IDS = { header: 30 };
const ITEMS = { header: { Shop: 'id:11', Brands: 'id:12', 'About us': 'id:13', Help: 'id:14' } };
const carried = { logo: () => null, menu: ( kind ) => IDS[ kind ] ?? null, items: ( kind ) => ( { ...ITEMS[ kind ] } ), attribute: () => null };
// The two calibrated slots the halves read (the nav-bar-menu calibration's own paths).
const CAL = { gap: { slot: '.sgs-nav-bar-menu__bar' }, itemColour: { slot: '.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link' } };
const run = ( elements, { menuItems = split(), kind = 'header', carry = carried } = {} ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: kind, surfaceKind: kind, surfaceName: 'Header', db, carried: carry, draftLinks: linkContext( { menuItems } ), calSettings: ( b ) => ( 'sgs/nav-bar-menu' === b ? CAL : {} ) } );
const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const navs = ( r ) => flat( r.skeleton ).filter( ( n ) => 'sgs/nav-bar-menu' === n.name );
const buttons = ( r ) => flat( r.skeleton ).filter( ( n ) => 'sgs/button' === n.name ).map( ( n ) => n.attributes.label );
const BAR = '.sgs-nav-bar-menu__bar';
const ITEM = /^\.sgs-nav-bar-menu__bar > \.sgs-nav-bar-menu__item(:nth-of-type\(\d+\))? > \.sgs-nav-bar-menu__link$/;

test( 'MUST FAIL: the menu is drawn twice: the nav before the split, the far side\'s links after it, one ref, no burger on the second', () => {
	const r = run( header() );
	const [ first, second, ...rest ] = navs( r );
	assert.equal( rest.length, 0, 'two menu bars, one per half' );
	assert.deepEqual( [ first.attributes.ref, first.attributes.splitSide, first.attributes.splitAfterItemId ], [ 30, 'before', 'id:12' ] );
	assert.deepEqual( [ second.attributes.ref, second.attributes.splitSide, second.attributes.splitAfterItemId, second.attributes.showBurger ], [ 30, 'after', 'id:12', false ] );
	assert.equal( first.attributes.showBurger, undefined, 'the nav keeps its burger' );
	assert.deepEqual( second.innerBlocks, [], 'the second half draws its items from the menu: no words inside it' );
	assert.deepEqual( buttons( r ), [ 'Call', 'Sign in' ], 'About and Help are no buttons; the links that are no split item stay as they are' );
	// The far half reads the group holding its links as slots only (draftSlotsOnly), so the group's own container is the one block that
	// reads that element's root: no problem names the menu, and none says one element is read by two blocks.
	assert.deepEqual( r.problems.filter( ( p ) => /menu|ref|split|read by two blocks/i.test( p ) ), [] );
} );

test( 'MUST FAIL: the far side\'s first link is the block and every later one is absorbed into it', () => {
	const rows = run( header() ).proposal.rows;
	const row = ( k ) => rows.find( ( x ) => x.key === k );
	assert.deepEqual( [ row( 'Root/8#0' ).block, row( 'Root/8#0' ).rule ], [ 'sgs/nav-bar-menu', 'splitMenu' ] );
	assert.deepEqual( [ row( 'Root/9#0' ).action, row( 'Root/9#0' ).into ], [ 'absorbed', 'Root/8#0' ] );
} );

test( 'MUST FAIL: each half reads its own bar, and the second half its items at its first link, never at its outer element', () => {
	const [ first, second ] = navs( run( header() ) );
	assert.equal( second.draftRef, undefined, 'the second half reads no root: the group holding its links belongs to its container' );
	assert.equal( second.draftSlotsOnly, true );
	assert.equal( second.draftSlots[ BAR ].tpl, 'Root/6#0', 'its gap is the group\'s' );
	const items = Object.entries( second.draftSlots ).filter( ( [ k ] ) => ITEM.test( k ) );
	assert.ok( items.length > 0 && items.every( ( [ , f ] ) => 'Root/8#0' === f.tpl ), JSON.stringify( second.draftSlots ) );
	assert.equal( first.draftRef.tpl, 'Root/3#0' );
	assert.equal( first.draftSlots[ BAR ].tpl, 'Root/3#0', 'the nav\'s gap is its own' );
} );

test( 'MUST FAIL: an identifier menu-map.json lacks is reported on both halves, never left out in silence', () => {
	const r = run( header(), { carry: { ...carried, items: () => ( { Shop: 'id:11' } ) } } );
	assert.equal( r.problems.filter( ( p ) => /splitAfterItemId/.test( p ) && /Brands/.test( p ) ).length, 2, r.problems.join( '\n' ) );
	assert.ok( navs( r ).every( ( n ) => undefined === n.attributes.splitAfterItemId ) );
} );

test( 'negative control: a header menu with no split draws one nav, and the links stay as they were', () => {
	const r = run( header(), { menuItems: split( null ) } );
	assert.equal( navs( r ).length, 1 );
	assert.equal( navs( r )[ 0 ].attributes.splitSide, undefined );
	assert.ok( buttons( r ).includes( 'About us' ) );
	const none = proposeSkeleton( { inventory: inv( header() ), facts: facts(), surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db, carried } );
	assert.equal( navs( none ).length, 1, 'no draft menus at all changes nothing' );
} );

test( 'negative control: a drawer is never split', () => {
	const r = run( header(), { kind: 'drawer' } );
	assert.equal( flat( r.skeleton ).filter( ( n ) => 'splitMenu' === n.rule || undefined !== n.attributes?.splitSide ).length, 0 );
} );

test( 'MUST FAIL: splitMenuOf reads the main header menu\'s split; a nav after the far side\'s links takes the second half', () => {
	const got = splitMenuOf( split() );
	assert.deepEqual( [ got.menu, got.after, [ ...got.labels ], got.first ], [ 'header', 'Brands', [ 'about us', 'help' ], 'nav' ] );
	assert.deepEqual( sidesOf( got ), { nav: 'before', links: 'after' } );
	const links = [ { menu: 'header', region: 'header', items: [ item( 'Our story', 1, { splitItem: true } ), item( 'Cakes', 2 ) ], splitAfter: { position: 1, label: 'Our story' } } ];
	assert.deepEqual( sidesOf( splitMenuOf( links ) ), { nav: 'after', links: 'before' } );
	assert.equal( splitMenuOf( split( null ) ), null, 'no recorded split' );
	assert.equal( splitMenuOf( [ { ...split()[ 0 ], menu: 'header-2' } ] ), null, 'only the main header menu splits' );
	assert.equal( splitMenuOf( [ { ...split()[ 0 ], region: 'drawer' } ] ), null );
	assert.equal( splitMenuOf( null ), null );
} );

test( 'MUST FAIL: splitLinkOf takes a link or button outside every nav, by its aria-label or words', () => {
	const els = header();
	const byKey = Object.fromEntries( els.map( ( x ) => [ x.key, x ] ) );
	const sp = splitMenuOf( split() );
	const ask = ( e, kind = 'header' ) => splitLinkOf( { e, els, byKey, split: sp, surfaceKind: kind } );
	assert.deepEqual( ask( byKey[ 'Root/9#0' ] ), { key: 'Root/9#0', first: 'Root/8#0', group: 'Root/6#0' } );
	assert.deepEqual( ask( { ...byKey[ 'Root/9#0' ], tag: 'button', words: '', attrs: { 'aria-label': ' HELP ' } } ).key, 'Root/9#0', 'case and spacing do not matter' );
	assert.equal( ask( { ...byKey[ 'Root/9#0' ], tag: 'span' } ), null, 'a span is no link' );
	assert.equal( ask( { ...byKey[ 'Root/9#0' ], parentKey: 'Root/3#0' } ), null, 'inside the nav it is the nav\'s own item' );
	assert.equal( ask( byKey[ 'Root/7#0' ] ), null, 'another label' );
	assert.equal( ask( byKey[ 'Root/9#0' ], 'footer' ), null );
} );

test( 'splitSlots reads each named setting at its calibrated slot, and notes a setting with none', () => {
	const finder = ( e ) => ( { tpl: e.key } );
	const got = splitSlots( { at: { key: 'G' }, link: { key: 'L' }, finder, settings: { bar: [ 'gap' ], item: [ 'itemColour', 'nothing', 'empty', 'pseudo' ] }, calibrated: { gap: { slot: '.b' }, itemColour: { slot: '.i' }, empty: { slot: '' }, pseudo: { slot: '.i::after' } } } );
	assert.deepEqual( got.slots, { '.b': { tpl: 'G' }, '.i': { tpl: 'L' } } );
	assert.equal( got.notes.length, 3, 'no slot, an empty slot and a pseudo-element are each said, not read' );
	assert.deepEqual( splitSlots( { at: { key: 'G' }, finder, settings: { bar: [ 'gap' ], item: [ 'itemColour' ] }, calibrated: { gap: { slot: '.b' }, itemColour: { slot: '.i' } } } ).slots, { '.b': { tpl: 'G' } }, 'the nav\'s half reads no item here' );
} );

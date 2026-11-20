// rules.megaOpenerMenu (Spec 48 FR-48-30): a header control outside the header's nav that opens a mega panel is an item of a
// second header menu (lib/intake-pagemap-mega-slots.mjs::megaSlots, flagged `megaOpener` on the item), so the skeleton draws it
// as a second `sgs/nav-bar-menu` bound to that menu (no burger of its own) in place of the `sgs/button` it would be, and the
// panel opens from that item. Each MUST FAIL test turns red under a mutation in tests/skeleton-mega-opener-menu.mutations.json
// (python E:\sgs-tmp\general-cloning\mutate_slow.py scripts\computed-route tests\skeleton-mega-opener-menu.mutations.json tests/skeleton-mega-opener-menu.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import { linkContext } from '../lib/draft-link.mjs';
import { megaOpenerMenus, menuOfOpener } from '../lib/skeleton-mega-opener.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const boxes = ( y, h = 20, w = 100, x = 0 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || boxes( 100 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} } );
// The header (Root/1), its bar (Root/2) holding the main nav (Root/3, two links) and a right-hand cluster (Root/6) with the
// About link and the Help opener, which sits outside the nav.
const header = ( { helpInNav = false } = {} ) => [
	el( 'Root/1#0', null, 'header', '', { depth: 0, box: boxes( 90, 60 ) } ),
	el( 'Root/2#0', 'Root/1#0', 'div', '', { display: 'flex' } ),
	el( 'Root/3#0', 'Root/2#0', 'nav', '', { depth: 2 } ),
	el( 'Root/4#0', 'Root/3#0', 'a', 'Shop', { depth: 3, attrs: { href: '/shop' } } ),
	el( 'Root/5#0', 'Root/3#0', 'a', 'Brands', { depth: 3, attrs: { href: '/brands' } } ),
	...( helpInNav ? [ el( 'Root/7#0', 'Root/3#0', 'a', 'Help', { depth: 3, attrs: { href: '#' } } ) ] : [] ),
	el( 'Root/6#0', 'Root/2#0', 'div', '', { depth: 2, display: 'flex' } ),
	el( 'Root/8#0', 'Root/6#0', 'a', 'About us', { depth: 3, attrs: { href: '/about' } } ),
	...( helpInNav ? [] : [ el( 'Root/9#0', 'Root/6#0', 'a', 'Help', { depth: 3, attrs: { href: '#' } } ) ] ),
];
const inv = ( elements ) => ( { generated: 'fixture', source: 'fixture', root: 'header', checks: { rootKey: 'Root/1#0' }, elements } );
const item = ( label, position, x = {} ) => ( { label, targets: [], position, children: [], parentItem: null, ...x } );
const main = () => ( { menu: 'header', region: 'header', file: 'Site.dc.html', items: [ item( 'Shop', 1 ), item( 'Brands', 2 ) ] } );
const menus = ( { second = [ item( 'Help', 1, { megaOpener: true } ) ], secondName = 'header-2' } = {} ) => [ main(), ...( second ? [ { menu: secondName, region: 'header', file: 'Site.dc.html', items: second } ] : [] ) ];
const IDS = { header: 30, 'header-2': 31 };
const carried = { logo: () => null, menu: ( kind ) => IDS[ kind ] ?? null, attribute: () => null };
const run = ( elements, { menuItems = menus(), kind = 'header', carry = carried } = {} ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: kind, surfaceKind: kind, surfaceName: 'Header', db, carried: carry, draftLinks: linkContext( { menuItems } ) } );
const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const navs = ( r ) => flat( r.skeleton ).filter( ( n ) => 'sgs/nav-bar-menu' === n.name );
const helpButtons = ( r ) => flat( r.skeleton ).filter( ( n ) => 'sgs/button' === n.name && 'Help' === n.attributes.label );

test( 'MUST FAIL: the intake flags a mega opener outside the nav as an item of the second header menu', () => {
	const mega = proposePageMap( { folder: path.join( HERE, 'fixtures', 'intake-pagemap', 'mega-openers' ), surfacesHint: null } );
	const second = mega.menuItems.find( ( m ) => 'header-2' === m.menu );
	assert.deepEqual( second.items.map( ( it ) => [ it.label, it.megaOpener ] ), [ [ 'Help', true ] ] );
	const first = mega.menuItems.find( ( m ) => 'header' === m.menu );
	assert.ok( ! first.items.find( ( it ) => 'Lenses' === it.label ).megaOpener, 'an item the nav itself held is no opener item' );
	assert.ok( ! mega.menuItems.find( ( m ) => 'footer' === m.menu ).items.some( ( it ) => it.megaOpener ), 'nor is a footer item' );
} );

test( 'MUST FAIL: the opener outside the nav is a second menu bar bound to header-2, with no burger, and no button for it', () => {
	const r = run( header() );
	const bars = navs( r );
	assert.equal( bars.length, 2, 'the main nav and the opener' );
	const [ first, second ] = bars;
	assert.equal( first.attributes.ref, 30 );
	assert.equal( second.attributes.ref, 31, 'the id the menu map holds for header-2' );
	assert.equal( second.attributes.showBurger, false, 'the main menu owns the drawer burger' );
	assert.deepEqual( helpButtons( r ), [], 'Help is drawn once, by the menu' );
	assert.equal( second.draftRef.tpl, 'Root/9#0', 'it reads the opener element' );
	assert.deepEqual( r.problems.filter( ( p ) => /menu|ref/i.test( p ) ), [] );
} );

test( 'MUST FAIL: the row records the rule that decided it', () => {
	const row = run( header() ).proposal.rows.find( ( x ) => 'Root/9#0' === x.key );
	assert.equal( row.block, 'sgs/nav-bar-menu' );
	assert.equal( row.rule, 'megaOpenerMenu' );
} );

test( 'MUST FAIL: a missing menu id for header-2 is reported, never drawn as an unbound menu in silence', () => {
	const r = run( header(), { carry: { ...carried, menu: ( kind ) => ( 'header-2' === kind ? null : IDS[ kind ] ?? null ) } } );
	assert.ok( r.problems.some( ( p ) => /header-2/.test( p ) ), r.problems.join( '\n' ) );
} );

test( 'negative control: an item without the opener flag leaves the control a button', () => {
	const r = run( header(), { menuItems: menus( { second: [ item( 'Help', 1 ) ] } ) } );
	assert.equal( navs( r ).length, 1 );
	assert.equal( helpButtons( r ).length, 1 );
} );

test( 'negative control: a control inside the nav is the nav\'s own item, never a second bar', () => {
	const r = run( header( { helpInNav: true } ) );
	assert.equal( navs( r ).length, 1 );
} );

test( 'negative control: an opener whose menu is the header\'s main menu is not a second bar', () => {
	const r = run( header(), { menuItems: [ { ...main(), items: [ ...main().items, item( 'Help', 3, { megaOpener: true } ) ] } ] } );
	assert.equal( navs( r ).length, 1 );
	assert.equal( helpButtons( r ).length, 1 );
} );

test( 'negative control: a control of another label is untouched', () => {
	const r = run( header(), { menuItems: menus( { second: [ item( 'Support', 1, { megaOpener: true } ) ] } ) } );
	assert.equal( navs( r ).length, 1 );
	assert.equal( helpButtons( r ).length, 1 );
} );

test( 'negative control: no draft menus at all changes nothing', () => {
	const r = proposeSkeleton( { inventory: inv( header() ), facts: facts(), surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db, carried } );
	assert.equal( navs( r ).length, 1 );
	assert.equal( helpButtons( r ).length, 1 );
} );

// menuOfOpener on its own: the guards a proposal run reaches only through its other rules.
const byKey = ( els ) => Object.fromEntries( els.map( ( x ) => [ x.key, x ] ) );
const asked = ( els, key, o = {} ) => menuOfOpener( { e: byKey( els )[ key ], byKey: byKey( els ), openers: megaOpenerMenus( menus() ), surfaceKind: 'header', ...o } );

test( 'MUST FAIL: menuOfOpener names the menu of a link or button outside every nav, by its words or aria-label', () => {
	const els = header();
	assert.equal( asked( els, 'Root/9#0' ), 'header-2' );
	const aria = [ ...els.slice( 0, -1 ), el( 'Root/9#0', 'Root/6#0', 'button', '', { depth: 3, attrs: { 'aria-label': ' HELP ' } } ) ];
	assert.equal( asked( aria, 'Root/9#0' ), 'header-2', 'case and spacing do not matter; the aria-label wins' );
	assert.equal( asked( [ ...els.slice( 0, -1 ), el( 'Root/9#0', 'Root/6#0', 'span', 'Help', { depth: 3 } ) ], 'Root/9#0' ), null, 'a span is no control' );
} );

test( 'MUST FAIL: menuOfOpener refuses a control inside a nav and a surface that is not a header', () => {
	const inside = header( { helpInNav: true } );
	assert.equal( asked( inside, 'Root/7#0' ), null, 'inside a nav it is the nav own item' );
	assert.equal( asked( header(), 'Root/9#0', { surfaceKind: 'drawer' } ), null );
	assert.equal( asked( header(), 'Root/9#0', { surfaceKind: 'footer' } ), null );
} );

test( 'megaOpenerMenus: a label two second menus both claim names none, and the main menu names none', () => {
	const two = [ ...menus(), { menu: 'header-3', region: 'header', file: 'Site.dc.html', items: [ item( 'Help', 1, { megaOpener: true } ), item( 'Sales', 2, { megaOpener: true } ) ] } ];
	assert.deepEqual( [ ...megaOpenerMenus( two ) ], [ [ 'sales', 'header-3' ] ] );
	assert.deepEqual( [ ...megaOpenerMenus( [ { ...main(), items: [ item( 'Help', 1, { megaOpener: true } ) ] } ] ) ], [] );
	assert.deepEqual( [ ...megaOpenerMenus( [ { menu: 'drawer-2', region: 'drawer', items: [ item( 'Help', 1, { megaOpener: true } ) ] } ] ) ], [], 'a drawer menu is no header menu' );
	assert.deepEqual( [ ...megaOpenerMenus( null ) ], [] );
} );

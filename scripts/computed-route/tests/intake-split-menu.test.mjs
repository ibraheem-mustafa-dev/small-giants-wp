// Spec 48 FR-48-30: a header whose links sit on both sides of its logo holds ONE header menu, drawn in two halves. Intake
// (lib/intake-pagemap-split.mjs::splitLinks, through lib/intake-pagemap-surfaces.mjs::codeSurfaces) makes each navigation
// link on the logo's far side from the nav an item of the nav's menu, after its own items in draft order (before them when the
// nav sits after the logo), flagged `splitItem`; the page map's menuItems record where the split falls (`splitAfter`,
// lib/intake-pagemap-split.mjs::splitPoint). Navigation is a link, or a mega panel's opener, with static words of its own, no
// bound value inside it, that reaches a page of the site holding no password field or opens a mega panel. An opener outside
// the nav's bar (another row of the header) still makes a second header menu (lib/intake-pagemap-mega-slots.mjs::megaSlots).
// Fixtures: tests/fixtures/intake-pagemap/split-menu (every shape a right-hand link might be), split-menu-nav-right (the nav
// after the logo), mega-openers-other-row (a Help opener in a utility row above the bar). Each MUST FAIL test turns red under
// a mutation in tests/intake-split-menu.mutations.json
// (python E:\sgs-tmp\general-cloning\mutate_slow.py scripts\computed-route tests\intake-split-menu.mutations.json tests/intake-split-menu.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import { splitPoint, placeSplit } from '../lib/intake-pagemap-split.mjs';
import { desiredMenus } from '../lib/site-build-menus.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-pagemap', name );
const split = proposePageMap( { folder: FIX( 'split-menu' ), surfacesHint: null } );
const right = proposePageMap( { folder: FIX( 'split-menu-nav-right' ), surfacesHint: null } );
const other = proposePageMap( { folder: FIX( 'mega-openers-other-row' ), surfacesHint: null } );
const menu = ( m, name ) => m.menuItems.find( ( x ) => x.menu === name );
const labels = ( m, name ) => menu( m, name ).items.map( ( it ) => `${ it.position } ${ it.label }${ it.splitItem ? ' *' : '' }` );
const rowMenus = ( m, slug ) => m.rows.find( ( r ) => r.slug === slug ).menus;

test( 'MUST FAIL: the navigation links on the logo\'s far side are items of the header menu after the nav\'s own, and the split falls after the nav\'s last item', () => {
	assert.deepEqual( labels( split, 'header' ), [ '1 Shop', '2 Frames', '3 Our story *', '4 Help *' ] );
	assert.deepEqual( menu( split, 'header' ).splitAfter, { position: 2, label: 'Frames' }, 'a mega opener the nav\'s items lacked (Frames) is placed before the split is read' );
	assert.equal( split.menuItems.some( ( m ) => 'header-2' === m.menu ), false, 'no second header menu' );
} );

test( 'MUST FAIL: the page map puts the far side\'s pages and panels in the header menu at their slots', () => {
	assert.deepEqual( rowMenus( split, 'our-story' ), [ { menu: 'header', position: 3, parentItem: null }, { menu: 'footer', position: 1, parentItem: null } ] );
	assert.deepEqual( rowMenus( split, 'mega-menu-help' ), [ { menu: 'header', position: 4, parentItem: null } ], 'a mega opener on the far side is the header item its panel takes' );
	const got = desiredMenus( split.rows.map( ( r, i ) => ( { ...r, id: i + 1 } ) ) );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( got.menus.header.map( ( it ) => `${ it.order } ${ it.label }` ), [ '1 Shop', '2 Frames', '3 Our story', '4 Help' ], 'the site build makes one header menu holding both halves' );
} );

test( 'negative control: what is not navigation stays out of the menu', () => {
	const names = menu( split, 'header' ).items.map( ( it ) => it.label );
	for ( const [ word, why ] of [
		[ 'Visit us', 'a link in another row of the header is outside the bar' ],
		[ 'Sale', 'a link on the nav\'s own side of the logo' ],
		[ 'Call us', 'a phone link (no page, bound words)' ],
		[ 'Email us', 'an email link (no page)' ],
		[ 'Sign in', 'a link to a page holding a password field' ],
		[ 'Account', 'an icon-only link (no words of its own)' ],
		[ 'Basket', 'a link holding a bound value (a count)' ],
		[ 'Bag', 'a button that opens no mega panel' ],
		[ 'Book a visit', 'a button that reaches a page is a call to action, not a link' ],
		[ 'Offers', 'an icon-only link to a page (its aria-label is no words of its own)' ],
		[ 'All frames', 'a link inside a mega panel that sits in the bar' ],
		[ 'Delivery', 'nor any other panel link' ],
		[ 'Opticians home', 'the logo' ],
	] ) {
		assert.ok( ! names.some( ( n ) => n.startsWith( word ) ), `${ word }: ${ why }` );
	}
} );

test( 'MUST FAIL: a nav after the logo takes the links before the logo as its first half', () => {
	assert.deepEqual( labels( right, 'header' ), [ '1 Our story *', '2 Visit *', '3 Cakes', '4 Bread' ] );
	assert.deepEqual( menu( right, 'header' ).splitAfter, { position: 2, label: 'Visit' } );
	assert.deepEqual( rowMenus( right, 'cakes' ), [ { menu: 'header', position: 3, parentItem: null } ] );
} );

test( 'negative control: an opener in another row of the header is a different menu, header-2, and the main menu is not split', () => {
	assert.deepEqual( labels( other, 'header' ), [ '1 Frames', '2 Lenses' ] );
	assert.equal( menu( other, 'header' ).splitAfter, undefined );
	assert.deepEqual( labels( other, 'header-2' ), [ '1 Help' ] );
	assert.deepEqual( rowMenus( other, 'mega-menu-help' ), [ { menu: 'header-2', position: 1, parentItem: null } ] );
} );

test( 'negative control: a header with links on one side of its logo only is not split (the Mama\'s Munches redesign draft)', () => {
	const real = proposePageMap( { folder: path.join( REPO, 'sites', 'mamas-munches-redesign', 'handoff' ) } );
	const headers = real.menuItems.filter( ( m ) => 'header' === m.region );
	assert.ok( headers.length > 0 );
	assert.deepEqual( headers.filter( ( m ) => m.splitAfter || m.items.some( ( it ) => it.splitItem ) ).map( ( m ) => m.menu ), [] );
} );

test( 'MUST FAIL: splitPoint reads the split from the final items, and none from items not on one side', () => {
	const it = ( label, position, s = false ) => ( { label, position, ...( s ? { splitItem: true } : {} ) } );
	assert.deepEqual( splitPoint( [ it( 'A', 1 ), it( 'B', 2 ), it( 'C', 3, true ) ] ), { position: 2, label: 'B' } );
	assert.deepEqual( splitPoint( [ it( 'C', 1, true ), it( 'D', 2, true ), it( 'A', 3 ) ] ), { position: 2, label: 'D' } );
	assert.equal( splitPoint( [ it( 'A', 1 ), it( 'B', 2 ) ] ), null, 'no split item, no split' );
	assert.equal( splitPoint( [ it( 'C', 1, true ) ] ), null, 'split items alone are no two halves' );
	assert.equal( splitPoint( [ it( 'A', 1 ), it( 'C', 2, true ), it( 'B', 3 ) ] ), null, 'split items between nav items are not one side' );
	assert.equal( splitPoint( [ it( 'C', 1, true ), it( 'A', 2 ), it( 'D', 3, true ) ] ), null );
	assert.equal( splitPoint(), null );
} );

test( 'placeSplit appends after a nav that comes first, prepends before one that comes second, and renumbers', () => {
	const mk = () => ( { items: [ { label: 'A', position: 1 }, { label: 'B', position: 2 } ] } );
	const made = () => [ { label: 'X', splitItem: true } ];
	assert.deepEqual( placeSplit( mk(), made(), 'nav' ).items.map( ( x ) => `${ x.position }${ x.label }` ), [ '1A', '2B', '3X' ] );
	assert.deepEqual( placeSplit( mk(), made(), 'links' ).items.map( ( x ) => `${ x.position }${ x.label }` ), [ '1X', '2A', '3B' ] );
} );

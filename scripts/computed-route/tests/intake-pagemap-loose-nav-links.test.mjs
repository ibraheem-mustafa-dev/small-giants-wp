// Spec 48 FR-48-30 and §3.4 rule 3 (register row C3): a header link outside the <nav>, set in the nav links' own look, is an item
// of the header menu (lib/intake-pagemap-loose-links.mjs), after the nav's items and in document order; a link in another look,
// a link the nav already has and a draft with no styles at all (tests/fixtures/intake-pagemap/mega-openers) stay out.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import { desiredMenus } from '../lib/site-build-menus.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-pagemap', name );
const map = proposePageMap( { folder: FIX( 'loose-nav-links' ), surfacesHint: null } );
const plain = proposePageMap( { folder: FIX( 'mega-openers' ), surfacesHint: null } );
const menusOf = ( m, slug ) => m.rows.find( ( r ) => r.slug === slug ).menus;
const header = ( position ) => ( { menu: 'header', position, parentItem: null } );
const inHeader = ( m, slug ) => menusOf( m, slug ).filter( ( x ) => 'header' === x.menu );

test( 'MUST FAIL: a header link outside the <nav> in the nav links\' look is a header menu item after the nav items', () => {
	assert.deepEqual( inHeader( map, 'about' ), [ header( 4 ) ] );
} );

test( 'MUST FAIL: the opener that was already a header item keeps being one, at its place in document order', () => {
	assert.deepEqual( inHeader( map, 'help' ), [ header( 5 ) ] );
	assert.deepEqual( inHeader( map, 'mega-menu-help' ), [ header( 5 ) ] );
} );

test( 'MUST FAIL: the header menu the site build makes carries the loose links', () => {
	const rows = map.rows.map( ( r, i ) => ( { ...r, id: i + 1 } ) );
	const got = desiredMenus( rows );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( got.menus.header.map( ( it ) => `${ it.order } ${ it.label }` ), [ '1 Frames', '2 Brands', '3 Lenses', '4 About', '5 Help' ] );
} );

test( 'negative control: a link in another look (smaller type) stays out of the header menu', () => {
	assert.deepEqual( inHeader( map, 'contact' ), [] );
} );

test( 'negative control: a draft that sets no look on its links makes no loose item (the About link stays out of the header menu)', () => {
	assert.deepEqual( inHeader( plain, 'about' ), [] );
	assert.deepEqual( inHeader( plain, 'help' ), [ header( 4 ) ] );
} );

test( 'negative control: a link holding an icon and a link inside a list stay out of the header menu', () => {
	assert.deepEqual( inHeader( map, 'stores' ), [], 'an icon link is no nav link' );
	assert.deepEqual( inHeader( map, 'offers' ), [], 'a link inside an sc-for list is the list\'s' );
} );

test( 'MUST FAIL: with two navs the loose link joins the first nav\'s menu only, and the second nav\'s own link is not added to the first', () => {
	const two = proposePageMap( { folder: FIX( 'loose-nav-links-two-navs' ), surfacesHint: null } );
	assert.deepEqual( menusOf( two, 'about' ).map( ( x ) => x.menu ), [ 'header-main' ] );
	assert.deepEqual( menusOf( two, 'shop' ).map( ( x ) => x.menu ), [ 'header-main' ] );
	assert.deepEqual( menusOf( two, 'press' ).map( ( x ) => x.menu ), [ 'header-extra' ] );
} );

test( 'negative control: a link the nav already has is not added again, and a link that reaches no page is no item (the Help item stays fifth)', () => {
	assert.deepEqual( inHeader( map, 'prescription-lenses' ), [ header( 3 ) ] );
	assert.deepEqual( inHeader( map, 'help' ), [ header( 5 ) ] );
} );

test( 'negative control: only a header joins its loose links to its menu: a drawer link outside the drawer nav does not join the drawer menu', () => {
	const drawer = proposePageMap( { folder: FIX( 'loose-nav-links-drawer' ), surfacesHint: null } );
	assert.deepEqual( menusOf( drawer, 'shop' ).map( ( x ) => x.menu ), [ 'drawer' ] );
	assert.deepEqual( menusOf( drawer, 'about' ), [] );
} );

// rules.navigation, links outside the <nav> (Spec 48 §3.4 rule 3, register row C3): a header link that sits outside the
// <nav> but is laid out as one of the nav's links (a text-only link to a destination, in the nav links' own type: size,
// case and tracking) is one of the navigation's items, never a button. The decision is by structure and style, never by
// the words. A link the draft styles differently (a different size or case), a link holding an icon, a button, and a
// header with no navigation to join all stay what they were. Synthetic inventories in the reader's shape
// (lib/skeleton-inventory.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const boxes = ( y, h = 20, w = 100, x = 0 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || boxes( 100 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} } );
const inv = ( elements ) => ( { generated: 'fixture', source: 'fixture', root: 'header', checks: { rootKey: 'Root/1#0' }, elements } );
const run = ( inventory ) => proposeSkeleton( { inventory, facts: facts(), surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db } );
const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const rowOf = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );
const blockAt = ( r, key ) => flat( r.skeleton ).find( ( n ) => n.draftRef?.tpl === key )?.name ?? null;

const NAV_TYPE = 'font-size:13.5px;letter-spacing:.06em;text-transform:uppercase';
const LINK = 'padding:6px 10px;white-space:nowrap';
// A header: a <nav> of two links in NAV_TYPE, then a right cluster that inherits NAV_TYPE and holds a phone link with an icon in
// its own type, two plain links (About and Help), a link in a different type, and an account button.
const header = ( { nav = true, other = `padding:12px 20px;font-size:15px;text-transform:none` } = {} ) => [
	el( 'Root/1#0', null, 'header', '', { depth: 0, box: boxes( 90, 60 ) } ),
	el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1, display: 'flex' } ),
	...( nav ? [
		el( 'Root/3#0', 'Root/2#0', 'nav', '', { depth: 2, display: 'flex', attrs: { style: NAV_TYPE } } ),
		el( 'Root/4#0', 'Root/3#0', 'a', 'Sunglasses', { depth: 3, attrs: { href: '/sunglasses', style: LINK } } ),
		el( 'Root/5#0', 'Root/3#0', 'a', 'Brands', { depth: 3, attrs: { href: '/brands', style: LINK } } ),
	] : [] ),
	el( 'Root/6#0', 'Root/2#0', 'div', '', { depth: 2, display: 'flex', attrs: { style: `display:flex;${ NAV_TYPE }` } } ),
	el( 'Root/7#0', 'Root/6#0', 'a', '0121 729 8233', { depth: 3, attrs: { href: 'tel:01217298233', style: 'font-size:12.5px;text-transform:none;letter-spacing:.04em' } } ),
	el( 'Root/8#0', 'Root/7#0', 'svg', '', { depth: 4 } ),
	el( 'Root/9#0', 'Root/6#0', 'a', 'About us', { depth: 3, attrs: { href: '/about', style: LINK } } ),
	el( 'Root/10#0', 'Root/6#0', 'a', 'Help', { depth: 3, attrs: { href: '/help', style: LINK } } ),
	el( 'Root/11#0', 'Root/6#0', 'a', 'Contact', { depth: 3, attrs: { href: '/contact', style: other } } ),
	el( 'Root/12#0', 'Root/6#0', 'button', '', { depth: 3, attrs: { 'aria-label': 'Account' } } ),
];

test( 'the standing decisions data is sound', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
} );

test( 'MUST FAIL: header links outside the <nav>, in the nav links\' own type, join the navigation instead of becoming buttons', () => {
	const r = run( inv( header() ) );
	for ( const key of [ 'Root/9#0', 'Root/10#0' ] ) {
		const row = rowOf( r, key );
		assert.equal( row.action, 'absorbed', `${ key } joins the navigation` );
		assert.equal( row.into, 'Root/3#0' );
		assert.equal( row.rule, 'navigationLink' );
		assert.equal( blockAt( r, key ), null, `${ key } has no block of its own` );
	}
	assert.equal( blockAt( r, 'Root/3#0' ), 'sgs/nav-bar-menu' );
} );

test( 'negative control: a link in a different type (size and case), a link holding an icon and a button stay what they were', () => {
	const r = run( inv( header() ) );
	assert.notEqual( rowOf( r, 'Root/11#0' ).action, 'absorbed', 'a differently set link is not a nav link' );
	assert.equal( blockAt( r, 'Root/11#0' ), 'sgs/button' );
	assert.notEqual( rowOf( r, 'Root/7#0' )?.rule, 'navigationLink', 'the phone link with an icon is not a nav link' );
	assert.notEqual( rowOf( r, 'Root/12#0' )?.rule, 'navigationLink' );
} );

test( 'negative control: the decision is by style, not words: the same words in the nav type join, in another type do not', () => {
	const other = run( inv( header() ) );
	assert.equal( rowOf( other, 'Root/9#0' ).action, 'absorbed' );
	const inventory = inv( header() );
	inventory.elements.find( ( e ) => 'Root/9#0' === e.key ).attrs.style = `${ LINK };font-size:18px`;
	const r = run( inventory );
	assert.notEqual( rowOf( r, 'Root/9#0' ).action, 'absorbed', 'a different size is a different look' );
	assert.equal( blockAt( r, 'Root/9#0' ), 'sgs/button' );
} );

test( 'negative control: a header with no navigation has nothing for a link to join', () => {
	const r = run( inv( header( { nav: false } ) ) );
	assert.equal( rowOf( r, 'Root/9#0' ).action ?? null, null );
	assert.equal( blockAt( r, 'Root/9#0' ), 'sgs/button' );
} );

const joins = ( r ) => 'absorbed' === rowOf( r, 'Root/9#0' ).action && 'navigationLink' === rowOf( r, 'Root/9#0' ).rule;
const withAbout = ( change ) => {
	const inventory = inv( header() );
	change( inventory.elements.find( ( e ) => 'Root/9#0' === e.key ), inventory );
	return run( inventory );
};

test( 'negative control: each property of the look counts alone: a different size, case or tracking is a different look', () => {
	for ( const style of [ `${ LINK };font-size:14px`, `${ LINK };text-transform:none`, `${ LINK };letter-spacing:.2em` ] ) {
		assert.equal( joins( withAbout( ( a ) => { a.attrs.style = style; } ) ), false, style );
	}
	assert.equal( joins( withAbout( () => {} ) ), true );
} );

test( 'negative control: a link with markup inside, a link beside an icon, a link in a list and a link that goes nowhere stay what they were', () => {
	const inner = withAbout( ( a, inventory ) => inventory.elements.push( el( 'Root/20#0', 'Root/9#0', 'span', '', { depth: 4 } ) ) );
	assert.equal( joins( inner ), false, 'a link holding an element' );
	const icon = withAbout( ( a, inventory ) => inventory.elements.push( el( 'Root/21#0', 'Root/9#0', 'svg', '', { depth: 4 } ) ) );
	assert.equal( joins( icon ), false, 'a link with an icon beside its words' );
	assert.equal( joins( withAbout( ( a ) => { a.membership = [ { kind: 'sc-for', tpl: '5' } ]; } ) ), false, 'a link in a list' );
	assert.equal( joins( withAbout( ( a ) => { a.attrs.href = '#'; } ) ), false, 'a link with no destination and no click handler' );
	assert.equal( joins( withAbout( ( a ) => { a.words = ''; a.allText = ''; } ) ), false, 'a link with no words' );
} );

test( 'negative control: a link with a click handler and no href is a navigation link, and the same header in a drawer joins nothing', () => {
	const handler = withAbout( ( a ) => { delete a.attrs.href; a.snippet = '<a data-dc-tpl="9" sc-camel-on-click="{{ goAbout }}">About us</a>'; } );
	assert.equal( joins( handler ), true );
	const drawer = proposeSkeleton( { inventory: inv( header() ), facts: facts(), surface: 'drawer', surfaceKind: 'drawer', surfaceName: 'Drawer', db } );
	assert.notEqual( rowOf( drawer, 'Root/9#0' ).rule, 'navigationLink', 'only a header\'s own links join its navigation' );
} );

test( 'negative control: a header that sets no look on its links (nothing declared for the nav or the link) joins nothing, and neither does one whose navigation holds no link', () => {
	const bare = inv( header() );
	bare.elements.forEach( ( e ) => { e.attrs = { ...e.attrs, style: '' }; } );
	assert.equal( joins( run( bare ) ), false );
	const empty = inv( header() );
	empty.elements = empty.elements.filter( ( e ) => ! [ 'Root/4#0', 'Root/5#0' ].includes( e.key ) );
	assert.equal( joins( run( empty ) ), false );
} );

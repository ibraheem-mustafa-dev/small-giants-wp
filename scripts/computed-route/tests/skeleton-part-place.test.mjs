// Where an absorbed part's block stands (lib/skeleton-part-slots.mjs::placePart): the burger the navigation block draws
// was grouped in the draft with a tablet-only call to action in a compact-only wrapper, which the draft hides where the
// desktop navigation shows, so the navigation stays beside that wrapper, never inside it; a wrapper whose only content was
// the part leaves no empty node.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Example Co' } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const idOf = ( n ) => n.variantKey ?? n.draftRef?.tpl;
const nodeAt = ( r, key ) => nodes( r.skeleton ).find( ( n ) => idOf( n ) === key );
const rowAt = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );
const kidIds = ( n ) => ( n.innerBlocks || [] ).map( idOf );

const at = ( x, y, w = 100 ) => ( { x, y, w, h: 20 } );
// el( id, parent, tag, words, { widths: the widths it renders at, box, attrs, display, snippet } ).
const el = ( id, parent, tag, words, x = {} ) => {
	const shown = x.widths || [ 375, 768, 1440 ];
	const vis = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, shown.includes( w ) ] ) );
	const box = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, vis[ w ] ? x.box : null ] ) );
	return { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: x.depth ?? 1, tag, template: 'Root', tpl: id, attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: x.snippet || `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`, box, visible: vis, display: x.display || 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { checks: {}, source: 'fixture', root: 'header', generated: 'fixture', elements } );
const DRAWER = { elements: {}, surfaces: { 'S-09': { id: 'S-09', kind: 'drawer', name: 'Mobile menu', parent: null } } };
const run = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts, surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db, factRecord: DRAWER, openers: { 'S-09': 'Burger button (toggleMobile) on tablet and mobile' } } );

// A header row (40, its inner box 41): a logo link, a compact-only wrapper (56) holding a tablet-only button (58) and the burger (59), the
// desktop navigation (45) and a desktop-only button (54). `navAt` is the navigation's widths, `order` the row's children.
const BURGER = '<button data-dc-tpl="59" sc-camel-on-click="{{ toggleMobile }}"></button>';
const ROW = ( { navAt = [ 1440 ], withButton = true, order = [ 42, 56, 45, 54 ] } = {} ) => {
	const kids = {
		42: [ el( 42, 41, 'a', 'Home page', { depth: 3, box: at( 0, 0 ), attrs: { href: '/' } } ) ],
		56: [
			el( 56, 41, 'div', '', { depth: 3, widths: [ 375, 768 ], box: at( 500, 0, 160 ), display: 'flex' } ),
			...( withButton ? [ el( 58, 56, 'a', 'Register now', { depth: 4, widths: [ 768 ], box: at( 500, 0 ), attrs: { href: '/apply' } } ) ] : [] ),
			el( 59, 56, 'button', '', { depth: 4, widths: [ 375, 768 ], box: at( 610, 0, 48 ), snippet: BURGER } ),
		],
		45: [
			el( 45, 41, 'nav', '', { depth: 3, widths: navAt, box: at( 200, 0, 400 ), display: 'flex', allText: 'Home About' } ),
			el( 46, 45, 'a', 'Home', { depth: 4, widths: navAt, box: at( 200, 0, 50 ), attrs: { href: '/' } } ),
			el( 47, 45, 'a', 'About', { depth: 4, widths: navAt, box: at( 260, 0, 50 ), attrs: { href: '/about' } } ),
		],
		54: [ el( 54, 41, 'a', 'Register today', { depth: 3, widths: [ 1440 ], box: at( 700, 0 ), attrs: { href: '/apply' } } ) ],
	};
	return [
		el( 1, null, 'header', '', { depth: 0, box: at( 0, 0, 1000 ) } ),
		el( 40, 1, 'div', '', { depth: 1, box: at( 0, 0, 1000 ) } ),
		el( 41, 40, 'div', '', { depth: 2, box: at( 0, 0, 1000 ), display: 'flex' } ),
		...order.flatMap( ( id ) => kids[ id ] ) ];
};

test( 'MUST FAIL (never under a wrapper hidden where it shows): the desktop navigation stays beside the compact-only wrapper of the burger and a tablet button', () => {
	const r = run( ROW() );
	assert.equal( rowAt( r, 'Root/59#0' ).rule, 'drawerOpener', 'the burger is the navigation\'s part' );
	const wrap = nodeAt( r, 'Root/56#0' );
	assert.deepEqual( kidIds( wrap ), [ 'Root/58#0' ], 'the wrapper keeps its button only' );
	const holder = nodes( r.skeleton ).find( ( n ) => kidIds( n ).includes( 'Root/45#0' ) );
	assert.ok( kidIds( holder ).includes( 'Root/56#0' ), 'the navigation is the wrapper\'s sibling' );
	assert.ok( rowAt( r, 'Root/45#0' ).slotNotes.some( ( n ) => /stays beside Root\/56#0: Root\/56#0 is hidden at 1440, where Root\/45#0 renders/.test( n ) ), 'the review says why' );
	// No block anywhere stands under a node whose element the draft hides at a width the block's element shows.
	const parents = new Map();
	const walk = ( list, p ) => list.forEach( ( n ) => ( parents.set( n, p ), walk( n.innerBlocks || [], n ) ) );
	walk( r.skeleton, null );
	const elOf = ( n ) => ROW().find( ( x ) => x.key === idOf( n ) );
	for ( const [ n, p ] of parents ) {
		const shown = elOf( n ) && [ 375, 768, 1440 ].filter( ( w ) => elOf( n ).visible[ w ] );
		p && elOf( p ) && shown && assert.ok( shown.every( ( w ) => elOf( p ).visible[ w ] ), `${ idOf( n ) } under ${ idOf( p ) }` );
	}
} );

test( 'MUST FAIL (a wrapper of the part alone): it is dropped, never left as an empty node, and the navigation stays where it is', () => {
	for ( const navAt of [ [ 1440 ], [ 375, 768, 1440 ] ] ) {
		const r = run( ROW( { withButton: false, navAt } ) );
		assert.equal( nodeAt( r, 'Root/56#0' ), undefined, 'no node for the wrapper' );
		assert.equal( rowAt( r, 'Root/56#0' ).action, 'remove' );
		assert.ok( nodeAt( r, 'Root/45#0' ), 'the navigation is in the tree' );
		assert.equal( nodes( r.skeleton ).filter( ( n ) => 'sgs/container' === n.name && ! n.innerBlocks.length ).length, 0, 'no empty container anywhere' );
	}
} );

test( 'NEGATIVE (a wrapper shown at the navigation\'s width): the navigation stays, and the review names the other reason', () => {
	const shown = ROW().flatMap( ( e ) => ( 56 === e.tpl ? [ el( 56, 41, 'div', '', { depth: 3, box: at( 500, 0, 160 ), display: 'flex' } ), el( 57, 56, 'a', 'Call us', { depth: 4, box: at( 500, 0 ), attrs: { href: '/call' } } ) ] : [ e ] ) );
	const kept = run( shown );
	const holder = nodes( kept.skeleton ).find( ( n ) => kidIds( n ).includes( 'Root/45#0' ) );
	assert.equal( idOf( holder ), 'Root/41#0', 'a wrapper shown at 1440 does not take the navigation' );
	assert.ok( nodeAt( kept, 'Root/56#0' ), 'the wrapper is a node' );
	assert.ok( rowAt( kept, 'Root/45#0' ).slotNotes.some( ( n ) => /Root\/56#0 renders at Root\/45#0's widths/.test( n ) ) );
	// The navigation and the desktop button share their own box (44): the navigation stays in it.
	const boxed = [ ...ROW( { order: [ 42, 56 ] } ), el( 44, 41, 'div', '', { depth: 3, widths: [ 1440 ], box: at( 200, 0, 700 ), display: 'flex' } ), ...ROW( { order: [ 45, 54 ] } ).slice( 3 ).map( ( e ) => ( { ...e, parentKey: 41 === Number( e.parentKey?.match( /\/(\d+)#/ )[ 1 ] ) ? 'Root/44#0' : e.parentKey, depth: e.depth + 1 } ) ) ];
	const inBox = run( boxed );
	assert.deepEqual( kidIds( nodeAt( inBox, 'Root/44#0' ) ), [ 'Root/45#0', 'Root/54#0' ], 'the navigation stays in its own box' );
	assert.deepEqual( kidIds( nodeAt( inBox, 'Root/56#0' ) ), [ 'Root/58#0' ] );
} );

test( 'MUST FAIL (a node that already holds the block): the header row built on the burger\'s wrapper keeps the navigation and is never dropped', () => {
	// The navigation and the wrapper straight under the header: the header's row node stands on the wrapper and holds the navigation.
	const flat = [
		el( 1, null, 'header', '', { depth: 0, box: at( 0, 0, 1000 ), display: 'flex' } ),
		...ROW( { withButton: false, navAt: [ 375, 768, 1440 ], order: [ 45, 56 ] } ).slice( 3 ).map( ( e ) => ( { ...e, parentKey: 'Root/41#0' === e.parentKey ? 'Root/1#0' : e.parentKey, depth: e.depth - 2 } ) ),
	];
	const r = run( flat );
	const holder = nodes( r.skeleton ).find( ( n ) => kidIds( n ).includes( 'Root/45#0' ) );
	assert.ok( holder, 'the navigation is still in the tree' );
	assert.equal( idOf( holder ), 'Root/56#0', 'its node stands on the wrapper' );
	assert.equal( rowAt( r, 'Root/56#0' ).action, null, 'the wrapper\'s row is not removed' );
	assert.deepEqual( ( rowAt( r, 'Root/45#0' ).slotNotes || [] ).filter( ( n ) => /Root\/56#0/.test( n ) ), [], 'nothing to say: the navigation already stands there' );
} );

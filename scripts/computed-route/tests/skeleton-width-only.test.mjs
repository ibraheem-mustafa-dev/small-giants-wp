// Elements that render only below 1440 (an sc-if on a width) in the skeleton writer (Spec 48 §3.4, FR-48-50): a block is
// classified on what renders at 1440; a width-only sibling is its own node; a width-only element inside a block that draws
// its own content is absorbed with the width alternative named; the control that opens the drawer is the navigation block's.
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

const at = ( x, y, w = 100 ) => ( { x, y, w, h: 20 } );
// el( id, parent, tag, words, { widths: the widths it renders at, box, attrs, display, snippet } ).
const el = ( id, parent, tag, words, x = {} ) => {
	const shown = x.widths || [ 375, 768, 1440 ];
	const vis = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, shown.includes( w ) ] ) );
	const box = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, vis[ w ] ? x.box : null ] ) );
	return { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: x.depth ?? 1, tag, template: 'Root', tpl: id, attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: x.snippet || `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`, box, visible: vis, display: x.display || 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { checks: {}, source: 'fixture', root: 'header', generated: 'fixture', elements } );
const run = ( elements, o = {} ) => proposeSkeleton( { inventory: inv( elements ), facts, surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db, ...o } );

// A pill group: [ 13 (renders below 768 only) ] [ 14 a pill link holding 16 (768 and up) and 18 (below 768) ] [ 20 ].
const GROUP = [
	el( 1, null, 'header', '', { depth: 0, box: at( 0, 0, 800 ), display: 'flex' } ),
	el( 11, 1, 'div', '', { depth: 1, box: at( 0, 0, 500 ), display: 'flex' } ),
	el( 13, 11, 'a', 'Register today', { depth: 2, widths: [ 375 ], box: at( 0, 0 ), attrs: { href: '/apply' } } ),
	el( 14, 11, 'a', '', { depth: 2, box: at( 110, 0 ), attrs: { href: '/contact' }, allText: 'Order now' } ),
	el( 16, 14, 'span', 'Order now', { depth: 3, widths: [ 768, 1440 ], box: at( 110, 0 ) } ),
	el( 18, 14, 'span', 'Call', { depth: 3, widths: [ 375 ], box: at( 110, 0 ) } ),
	el( 20, 11, 'a', 'Email us', { depth: 2, box: at( 220, 0 ), attrs: { href: '/email' } } ),
	el( 21, 11, 'a', 'Tablet only', { depth: 2, widths: [ 768 ], box: at( 330, 0 ), attrs: { href: '/tablet' } } ),
];
const without = ( list, ...ids ) => list.filter( ( e ) => ! ids.includes( e.tpl ) );

test( 'MUST FAIL (a block is classified on what renders at 1440): width-only descendants never change an element\'s block or rule hits', () => {
	const base = run( without( GROUP, 13, 18 ) );
	const wide = run( GROUP );
	for ( const id of [ 11, 14, 20 ] ) {
		const key = `Root/${ id }#0`;
		assert.equal( rowAt( wide, key ).block, rowAt( base, key ).block, `${ key } keeps its block` );
		assert.equal( rowAt( wide, key ).rule, rowAt( base, key ).rule, `${ key } keeps its rule` );
	}
	assert.equal( rowAt( wide, 'Root/14#0' ).rule, 'pillButton' );
	assert.deepEqual( nodeAt( wide, 'Root/14#0' ).attributes, nodeAt( base, 'Root/14#0' ).attributes, 'the pill keeps its own label' );
	assert.equal( rowAt( wide, 'Root/16#0' ).action, 'absorbed', 'the 1440 label is absorbed into the pill' );
} );

test( 'MUST FAIL (a width-only sibling is its own node): the element beside the pills is a node in the same parent, after the one it follows', () => {
	const r = run( GROUP );
	const group = nodeAt( r, 'Root/11#0' );
	assert.deepEqual( group.innerBlocks.map( idOf ), [ 'Root/13#0', 'Root/14#0', 'Root/18#0', 'Root/20#0', 'Root/21#0' ], 'the pill\'s width variant follows the pill' );
	assert.equal( group.innerBlocks[ 0 ].name, group.innerBlocks[ 1 ].name, 'the same block as the pill beside it' );
	assert.equal( rowAt( r, 'Root/13#0' ).action, null );
} );

test( 'MUST FAIL (a per-width label is one instance per variation): the "Call" label is its own pill instance beside the pill, each knowing the widths it is shown at', () => {
	const r = run( GROUP );
	const pill = nodeAt( r, 'Root/14#0' );
	const call = nodeAt( r, 'Root/18#0' );
	assert.equal( call.name, pill.name, 'the same block as the pill' );
	assert.equal( Object.values( call.attributes ).includes( 'Call' ), true, 'its words are the variation' );
	assert.equal( Object.values( pill.attributes ).includes( 'Order now' ), true, 'the pill keeps its own label' );
	assert.deepEqual( call.widthShown, [ 375 ] );
	assert.deepEqual( call.draftRef, pill.draftRef, 'measured on the pill itself, not on the words element' );
	assert.deepEqual( pill.widthVariants, [ { key: 'Root/18#0', shown: [ 375 ] } ] );
	assert.equal( rowAt( r, 'Root/18#0' ).rule, 'widthVariant' );
	assert.equal( call.attributes.href ?? call.attributes.url, pill.attributes.href ?? pill.attributes.url, 'the same link' );
	assert.deepEqual( r.proposal.widthAlternatives, [], 'a built variation is not listed as unbuilt' );
	assert.equal( nodeAt( run( without( GROUP, 18 ) ), 'Root/14#0' ).widthVariants, undefined, 'no width-only element, no variant' );
} );

test( 'MUST FAIL (two or three variations): each width-only label is an instance; the default is hidden where any variant shows', () => {
	const three = [ ...without( GROUP, 18 ), el( 18, 14, 'span', 'Call', { depth: 3, widths: [ 375 ], box: at( 110, 0 ) } ), el( 19, 14, 'span', 'Phone us', { depth: 3, widths: [ 768 ], box: at( 110, 0 ) } ) ];
	const r = run( three );
	const group = nodeAt( r, 'Root/11#0' );
	assert.deepEqual( group.innerBlocks.map( idOf ), [ 'Root/13#0', 'Root/14#0', 'Root/18#0', 'Root/19#0', 'Root/20#0', 'Root/21#0' ] );
	assert.deepEqual( nodeAt( r, 'Root/14#0' ).widthVariants.map( ( v ) => v.shown ), [ [ 375 ], [ 768 ] ] );
} );

test( 'MUST FAIL (a variation that is not words): an icon-only or container variation is built as the sibling block it is', () => {
	const icon = [ ...without( GROUP, 18 ), el( 18, 14, 'span', '', { depth: 3, widths: [ 375 ], box: at( 110, 0 ), display: 'flex' } ), el( 19, 18, 'a', 'Menu', { depth: 4, widths: [ 375 ], box: at( 110, 0 ), attrs: { href: '/menu' } } ) ];
	const r = run( icon );
	assert.ok( nodeAt( r, 'Root/18#0' ), 'a node for the width-only element' );
	assert.deepEqual( nodeAt( r, 'Root/18#0' ).widthShown, [ 375 ] );
	assert.equal( nodeAt( r, 'Root/14#0' ).widthVariants[ 0 ].key, 'Root/18#0' );
} );

// The header: the navigation (a block that draws its own burger) and a compact-only wrapper holding the burger.
const click = ( h ) => `<button data-dc-tpl="59" sc-camel-on-click="{{ ${ h } }}"></button>`;
const HEADER = ( handler ) => [
	el( 1, null, 'header', '', { depth: 0, box: at( 0, 0, 1000 ), display: 'flex' } ),
	el( 45, 1, 'nav', '', { depth: 1, box: at( 0, 0, 400 ), display: 'flex', allText: 'Home About' } ),
	el( 46, 45, 'a', 'Home', { depth: 2, box: at( 0, 0, 50 ), attrs: { href: '/' } } ),
	el( 47, 45, 'a', 'About', { depth: 2, box: at( 60, 0, 50 ), attrs: { href: '/about' } } ),
	el( 56, 1, 'div', '', { depth: 1, widths: [ 375, 768 ], box: at( 500, 0 ), display: 'flex' } ),
	el( 59, 56, 'button', '', { depth: 2, widths: [ 375, 768 ], box: at( 500, 0 ), snippet: click( handler ) } ),
];
const DRAWER = { elements: {}, surfaces: { 'S-09': { id: 'S-09', kind: 'drawer', name: 'Mobile menu', parent: null } } };
const withDrawer = { factRecord: DRAWER, openers: { 'S-09': 'Burger button (toggleMobile) on tablet and mobile' } };

test( 'MUST FAIL (the drawer opener is the navigation block\'s): the control named in the drawer\'s opener is absorbed into the navigation that draws its own burger', () => {
	const r = run( HEADER( 'toggleMobile' ), withDrawer );
	const row = rowAt( r, 'Root/59#0' );
	assert.equal( row.action, 'absorbed' );
	assert.equal( row.rule, 'drawerOpener' );
	assert.equal( row.into, 'Root/45#0' );
	assert.equal( nodeAt( r, 'Root/59#0' ), undefined, 'no node for the burger' );
	assert.ok( facts.decisions.rules.navigation.collapseAttribute[ nodeAt( r, 'Root/45#0' ).name ], 'the navigation block holds a collapse setting' );
} );

test( 'MUST FAIL (only the drawer\'s own opener): a button with another handler, or with no drawer recorded, stays a node', () => {
	assert.notEqual( rowAt( run( HEADER( 'toggleSearch' ), withDrawer ), 'Root/59#0' ).rule, 'drawerOpener', 'another handler' );
	assert.notEqual( rowAt( run( HEADER( 'toggleMobile' ) ), 'Root/59#0' ).rule, 'drawerOpener', 'no drawer in the record' );
} );

// A phone pill whose words are the number itself reads Site Info for its label; its "Call" variant has other words.
const PHONE = [
	el( 1, null, 'header', '', { depth: 0, box: at( 0, 0, 800 ), display: 'flex' } ),
	el( 11, 1, 'div', '', { depth: 1, box: at( 0, 0, 500 ), display: 'flex' } ),
	el( 30, 11, 'a', '', { depth: 2, box: at( 0, 0 ), attrs: { href: 'tel:01217714330' }, allText: '0121 771 4330' } ),
	el( 31, 30, 'span', '0121 771 4330', { depth: 3, widths: [ 768, 1440 ], box: at( 0, 0 ) } ),
	el( 32, 30, 'span', 'Call', { depth: 3, widths: [ 375 ], box: at( 0, 0 ) } ),
];

test( 'MUST FAIL (a variant re-decides what its words decide): the "Call" variant of a phone pill keeps the phone link but not the label read from Site Info', () => {
	const r = run( PHONE );
	const pill = nodeAt( r, 'Root/30#0' );
	const call = nodeAt( r, 'Root/32#0' );
	assert.equal( pill.attributes.labelFromSiteInfo, true, 'the number pill reads its label from Site Info' );
	assert.equal( call.attributes.label, 'Call' );
	assert.equal( call.attributes.linkSource, pill.attributes.linkSource, 'the same phone link' );
	assert.equal( call.attributes.labelFromSiteInfo, undefined, 'a label that is not the number never reads Site Info' );
} );

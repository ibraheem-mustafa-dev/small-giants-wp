// rules.blockPartOpener (Spec 48 FR-48-6, FR-48-87; Bean S5, 2026-10-23): in a header, the control whose click handler opens a
// drawer the page map hands to a block (a part with owner `block` of the cart row) is that block, sgs/cart in drawer mode,
// with its trigger settings drawn from the control (a label beside a count is a pill, no words an icon; a painted count a
// bubble) and the control's own content absorbed. Read by structure: the handler's state write (the draft's logic syntax
// tree, lib/skeleton-handler-opens.mjs) against the drawer's surfaces.json states, and the page map's part. Synthetic
// inventories, fact records and drafts in the readers' shapes. Tests marked MUST FAIL fail before the rule; each carries its
// negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { handlerOpens, opensOn } from '../lib/skeleton-handler-opens.mjs';
import { blockPartSurfaces } from '../lib/skeleton-surface-role.mjs';
import { narrowedLists } from '../lib/skeleton-narrowing.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = ( repo, edit = null ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	edit && edit( f.decisions.rules );
	return { ...f, repo };
};

// A temp repo holding the client's draft `Root.dc.html` whose logic is `logic`; returns { repo, hash }.
function draftRepo( logic ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'bpo-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ logic }\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), text );
	return { repo, hash: crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) };
}
const LOGIC = ( vals ) => `class Component {
	state = { bag: false, menu: false };
	renderVals() {
		return { ${ vals } };
	}
}`;
const VALS = 'openBag: () => this.setState( { bag: true } ), closeBag: () => this.setState( { bag: false, toast: null } ), toggleMenu: () => this.setState( ( s ) => ( { menu: ! s.menu } ) )';

// el( n, parent n, tag, words, { attrs, click (handler), style (recorded declarations), depth } ) in the inventory's shape;
// rec( … ) the same element's fact-record entry.
const box = ( n ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: n * 10, y: 0, w: 60, h: 20 } ] ) );
const el = ( n, parent, tag, words, o = {} ) => ( { key: `Root/${ n }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: o.depth ?? 1, tag, template: 'Root', tpl: n, attrs: o.attrs || {}, words, allText: o.allText ?? words, membership: [], srcTag: tag, srcOwnText: words,
	snippet: `<${ tag } data-dc-tpl="${ n }"${ o.click ? ` sc-camel-on-click="{{ ${ o.click } }}"` : '' }>${ words }</${ tag }>`, visible: { 375: true, 768: true, 1440: true }, box: box( n ), display: o.display || 'block', widths: [ 375, 768, 1440 ], flexDirection: 'row' } );
const rec = ( n, parent, tag, o = {}, chain = [] ) => ( { template: { key: `Root/${ n }`, component: 'Root', n: String( n ), tag, realTag: tag, attrs: { ...( o.attrs || {} ), ...( o.click ? { onClick: `{{ ${ o.click } }}` } : {} ) }, style: { static: o.style || [], holes: [] }, pseudo: {}, holes: [],
	parent: parent ? `Root/${ parent }` : null, realParent: parent ? `Root/${ parent }` : null, parentChain: chain, membership: { scIf: [], scFor: [], dcImport: [] }, own: {}, inHelmet: false, inFor: false, ref: null, hooks: {}, events: [], words: '', srcLine: n }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} } );

const BUBBLE = [ [ 'border-top-left-radius', '999px' ], [ 'background', 'var(--accent,#9C8B78)', 'unexpanded' ] ];
// The header: a navigation with two links, its burger (toggleMenu, opening the menu drawer) and the bag pill (openBag) holding
// a label and a painted count.
const HEADER = ( pill = {} ) => [
	[ 1, null, 'header', '', { depth: 0, display: 'flex' } ],
	[ 2, 1, 'nav', '', { display: 'flex', allText: 'Home About' } ],
	[ 3, 2, 'a', 'Home', { depth: 2, attrs: { href: '/' } } ],
	[ 4, 2, 'a', 'About', { depth: 2, attrs: { href: '/about' } } ],
	[ 5, 1, 'button', '', { click: 'toggleMenu', attrs: { 'aria-label': 'Menu' } } ],
	[ 6, 1, pill.tag ?? 'button', '', { click: pill.click ?? 'openBag', attrs: { 'aria-label': pill.aria ?? 'Bag' }, allText: 'Bag 0' } ],
	...( false === pill.label ? [] : [ [ 7, 6, 'span', 'Bag', { depth: 2 } ] ] ),
	...( false === pill.count ? [] : [ [ 8, 6, 'span', pill.countWords ?? '0', { depth: 2, style: pill.countStyle ?? BUBBLE } ] ] ),
];
const PART = { kind: 'drawer', label: 'Your bag', owner: 'block', draftId: 'Root.dc.html:9:3 <div aria-label="Your bag">' };
const CART = ( part = {} ) => ( { slug: 'cart', postType: 'page', template: 'cart', parts: [ { ...PART, ...part } ] } );
// The record's drawers: the menu drawer (its own surface, opened by `menu`) and the bag drawer (opened by `bag`).
const SURFACES = ( bagStates = [ { name: 'closed', state_keys: { bag: false } }, { name: 'open', state_keys: { bag: true } } ] ) => ( {
	'S-05': { id: 'S-05', kind: 'drawer', name: 'Menu', dc: 'Root', parent: null, roots: [ 'Root/30' ], parts: [], states: [ { name: 'open', state_keys: { menu: true } } ] },
	'S-24': { id: 'S-24', kind: 'drawer', name: 'Bag drawer', dc: 'Root', parent: null, roots: [ 'Root/40' ], parts: [], states: bagStates },
} );
const chainOf = ( list, n ) => {
	const out = [];
	for ( let p = list.find( ( x ) => x[ 0 ] === n )?.[ 1 ]; p; p = list.find( ( x ) => x[ 0 ] === p )?.[ 1 ] ) {
		out.push( `Root/${ p }` );
	}
	return out;
};

function run( o = {} ) {
	const list = o.header ?? HEADER( o.pill );
	const draft = draftRepo( o.logic ?? LOGIC( VALS ) );
	const drawerEls = [ [ 30, null, 'aside', { attrs: { 'aria-label': 'Menu' } } ], [ 40, null, 'div', {} ], [ 41, 40, 'div', { attrs: { role: 'dialog', 'aria-label': 'Your bag' } } ] ];
	const elements = Object.fromEntries( [
		...list.map( ( [ n, p, tag, , x ] ) => [ `Root/${ n }`, rec( n, p, tag, x, chainOf( list, n ) ) ] ),
		...drawerEls.map( ( [ n, p, tag, x ] ) => [ `Root/${ n }`, rec( n, p, tag, x, p ? [ `Root/${ p }` ] : [] ) ] ),
	] );
	const factRecord = { schema: '1', client: 'fixture-client', elements, surfaces: o.surfaces ?? SURFACES(), sources: { files: { 'Root.dc.html': draft.hash } } };
	const inventory = { checks: {}, source: 'fixture', root: 'header', generated: 'fixture', elements: list.map( ( [ n, p, tag, words, x ] ) => el( n, p, tag, words, x ) ) };
	return proposeSkeleton( { inventory, facts: facts( draft.repo, o.edit ), surface: 'header', surfaceKind: o.kind ?? 'header', surfaceName: 'Header', db, factRecord, openers: o.openers ?? { 'S-05': 'Menu button (toggleMenu)', 'S-24': 'Bag button' }, pageMap: o.pageMap ?? [ CART() ] } );
}
const all = ( l ) => l.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
const nodeOf = ( r, k ) => all( r.skeleton ).find( ( n ) => n.draftRef?.tpl === k );
const rowOf = ( r, k ) => r.proposal.rows.find( ( x ) => x.key === k );

test( 'MUST FAIL: the header control opening the cart row\'s block-owned drawer is sgs/cart in drawer mode with a pill trigger drawn from it', () => {
	const r = run();
	const cart = nodeOf( r, 'Root/6#0' );
	assert.equal( cart?.name, 'sgs/cart' );
	assert.deepEqual( cart.attributes, { displayMode: 'drawer', triggerStyle: 'pill', pillLabel: 'Bag', pillCountStyle: 'bubble', showZero: true, ariaLabel: 'Bag' } );
	assert.equal( cart.innerBlocks.length, 0, 'the block draws its own trigger' );
	assert.equal( rowOf( r, 'Root/6#0' ).rule, 'blockPartOpener' );
	for ( const k of [ 'Root/7#0', 'Root/8#0' ] ) {
		assert.deepEqual( [ rowOf( r, k ).action, rowOf( r, k ).rule, rowOf( r, k ).into ], [ 'absorbed', 'blockPartOpener', 'Root/6#0' ] );
	}
	assert.match( rowOf( r, 'Root/6#0' ).reason, /opens S-24 \(Bag drawer\).*"Your bag" of the cart row/ );
	assert.equal( 1, all( r.skeleton ).filter( ( n ) => 'sgs/cart' === n.name ).length );
} );

test( 'MUST FAIL: the trigger follows the control\'s structure: no words is an icon, an unpainted count plain, a non-zero count leaves showZero, a bound aria-label is no name', () => {
	const icon = nodeOf( run( { pill: { label: false, countStyle: [], countWords: '2', aria: '{{ bagLabel }}' } } ), 'Root/6#0' );
	assert.deepEqual( icon.attributes, { displayMode: 'drawer', triggerStyle: 'icon', pillCountStyle: 'plain' } );
	const bare = nodeOf( run( { pill: { label: false, count: false, aria: 'Open basket' } } ), 'Root/6#0' );
	assert.deepEqual( bare.attributes, { displayMode: 'drawer', triggerStyle: 'icon', ariaLabel: 'Open basket' } );
} );

test( 'MUST FAIL: a renderVals returned through Object.assign is read (its handlers and its lists)', () => {
	const logic = `class Component {
	renderVals() {
		const base = { chips: [ 1 ].map( () => ( { pick: () => this.setState( { f: 1 } ) } ) ) };
		return Object.assign( base, { openBag: ( e ) => { e.preventDefault(); this.setState( { bag: true, toast: null } ); }, shown: [ 1 ].filter( () => this.state.f ) } );
	}
}`;
	assert.equal( nodeOf( run( { logic } ), 'Root/6#0' ).name, 'sgs/cart' );
	const { repo, hash } = draftRepo( logic );
	const folder = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	const record = { sources: { files: { 'Root.dc.html': hash } } };
	assert.deepEqual( [ ...handlerOpens( { folder, record, component: 'Root', handler: 'openBag' } ) ], [ 'bag' ] );
	assert.deepEqual( narrowedLists( { folder, record, component: 'Root', listKey: 'chips' } ), [ 'shown' ] );
} );

test( 'NEGATIVE: the navigation drawer\'s opener stays the burger, and no page map, a page surface, a closing handler, a draft-notes part, another part or a drawer not opened by the key keep the bag pill', () => {
	const r = run();
	assert.deepEqual( [ rowOf( r, 'Root/5#0' ).action, rowOf( r, 'Root/5#0' ).rule ], [ 'absorbed', 'drawerOpener' ], 'the menu drawer is its own surface: the navigation takes its opener' );
	const kept = ( o, why ) => assert.notEqual( nodeOf( run( o ), 'Root/6#0' )?.name, 'sgs/cart', why );
	kept( { pageMap: [] }, 'no page map' );
	kept( { kind: 'page' }, 'a page\'s own link to the drawer stays a link' );
	kept( { pill: { click: 'closeBag' } }, 'a handler writing only closing values opens nothing' );
	kept( { pill: { tag: 'span' } }, 'only a button or link is a control' );
	kept( { pageMap: [ CART( { owner: 'draft-notes' } ) ] }, 'a part the draft notes own is no block part' );
	kept( { pageMap: [ CART( { draftId: 'Root.dc.html:9:3 <div aria-label="Filters">' } ) ] }, 'a part naming another element is another surface' );
	kept( { pageMap: [ { ...CART(), template: 'page' } ] }, 'a row whose template names no owning block' );
	kept( { surfaces: SURFACES( [ { name: 'open', state_keys: { menu: true } } ] ) }, 'a drawer no state of which holds the written key' );
	kept( { edit: ( R ) => delete R.blockPartOpener }, 'the rule removed' );
} );

// rules.drawerOpener by the handler's state write (FR-48-6): the drawer's opened_by words name no handler ("Menu button
// (below 1060px)"), so only the handler's write of a key a drawer state holds at true says the burger opens it.
const UNNAMED = { 'S-05': 'Menu button (below 1060px)', 'S-24': 'Bag button' };
const MENU_VALS = `${ VALS }, showMenu: () => this.setState( { menu: true } ), closeMenu: () => this.setState( { menu: false } ), openSize: () => this.setState( { size: true } ), setWidth: () => this.setState( { w: 375 } )`;
// The header with one more button (element 9) whose click handler is `click`.
const WITH = ( click, tag = 'button' ) => [ ...HEADER(), [ 9, 1, tag, '', { click, attrs: { 'aria-label': 'Other' } } ] ];
const SIZE = { 'S-25': { id: 'S-25', kind: 'modal', name: 'Size guide', dc: 'Root', parent: null, roots: [ 'Root/50' ], parts: [], states: [ { name: 'open', state_keys: { size: true } } ] } };
const burgered = ( r, k ) => [ rowOf( r, k )?.action, rowOf( r, k )?.rule, rowOf( r, k )?.into ];

test( 'MUST FAIL: a burger whose drawer\'s opened_by words name no handler is the navigation\'s burger when its handler writes a key the drawer opens on (a toggle, or a plain true)', () => {
	assert.deepEqual( burgered( run( { openers: UNNAMED } ), 'Root/5#0' ), [ 'absorbed', 'drawerOpener', 'Root/2#0' ], 'toggleMenu toggles menu, which S-05\'s open state holds at true' );
	assert.deepEqual( burgered( run( { openers: UNNAMED, header: WITH( 'showMenu' ), logic: LOGIC( MENU_VALS ) } ), 'Root/9#0' ), [ 'absorbed', 'drawerOpener', 'Root/2#0' ], 'a handler writing menu: true' );
} );

test( 'NEGATIVE: with no handler named, a closing handler, a modal\'s opener and a key no drawer opens on stay; the bag pill stays the cart; the name match still opens', () => {
	const at = ( click, o = {} ) => rowOf( run( { openers: UNNAMED, header: WITH( click ), logic: LOGIC( MENU_VALS ), ...o } ), 'Root/9#0' ).rule;
	assert.notEqual( at( 'closeMenu' ), 'drawerOpener', 'a handler writing only menu: false opens nothing' );
	assert.notEqual( at( 'openSize', { surfaces: { ...SURFACES(), ...SIZE } } ), 'drawerOpener', 'a modal, not a drawer' );
	assert.notEqual( at( 'setWidth' ), 'drawerOpener', 'a key no drawer state holds at true' );
	const named = ( header ) => rowOf( run( { header, logic: LOGIC( MENU_VALS ) } ), 'Root/9#0' ).rule;
	assert.notEqual( named( WITH( 'toggleMenu', 'span' ) ), 'drawerOpener', 'only a button or link is the burger, whatever its handler' );
	assert.notEqual( named( WITH( undefined ) ), 'drawerOpener', 'a button with no click handler opens nothing' );
	const r = run( { openers: UNNAMED } );
	assert.equal( nodeOf( r, 'Root/6#0' )?.name, 'sgs/cart', 'the control opening the block-owned bag drawer is the cart, never the burger' );
	assert.equal( rowOf( r, 'Root/6#0' ).rule, 'blockPartOpener' );
	assert.deepEqual( burgered( run( { logic: LOGIC( VALS.replace( '( s ) => ( { menu: ! s.menu } )', '{ x: 1 }' ) ) } ), 'Root/5#0' ), [ 'absorbed', 'drawerOpener', 'Root/2#0' ], 'the opened_by words naming toggleMenu still open, whatever it writes' );
	assert.notEqual( rowOf( run( { openers: UNNAMED, edit: ( R ) => delete R.drawerOpener } ), 'Root/5#0' ).rule, 'drawerOpener', 'the rule removed' );
} );

test( 'handlerOpens, opensOn and blockPartSurfaces read structure, never names', () => {
	const { repo, hash } = draftRepo( LOGIC( `${ VALS }, clear: () => this.setState( { a: 0, b: '', c: undefined, d: null } ), [ 'x' + 1 ]: () => this.setState( { bag: true } )` ) );
	const at = ( handler ) => [ ...handlerOpens( { folder: path.join( repo, 'sites', 'fixture-client', 'handoff' ), record: { sources: { files: { 'Root.dc.html': hash } } }, component: 'Root', handler } ) ];
	assert.deepEqual( at( 'openBag' ), [ 'bag' ] );
	assert.deepEqual( at( 'closeBag' ), [], 'false and null close' );
	assert.deepEqual( at( 'toggleMenu' ), [ 'menu' ], 'a function returning the patch' );
	assert.deepEqual( at( 'clear' ), [], 'every falsy literal' );
	assert.deepEqual( at( 'missing' ), [] );
	assert.deepEqual( [ ...handlerOpens( { folder: path.join( repo, 'sites', 'fixture-client', 'handoff' ), record: { sources: { files: {} } }, component: 'Root', handler: 'openBag' } ) ], [], 'a component the record names no file for' );
	assert.equal( opensOn( SURFACES()[ 'S-24' ], new Set( [ 'bag' ] ) ), true );
	assert.equal( opensOn( SURFACES()[ 'S-24' ], new Set( [ 'menu' ] ) ), false );
	assert.equal( opensOn( { states: [ { state_keys: { bag: 'yes' } } ] }, new Set( [ 'bag' ] ) ), false, 'only a key held at true' );
	const elements = { 'Root/40': rec( 40, null, 'div' ), 'Root/41': rec( 41, 40, 'div', { attrs: { 'aria-label': 'Your bag' } }, [ 'Root/40' ] ), 'Root/30': rec( 30, null, 'aside', { attrs: { 'aria-label': 'Menu' } } ) };
	assert.deepEqual( blockPartSurfaces( { pageMap: [ CART() ], surfaces: SURFACES(), elements } ).map( ( d ) => [ d.surface.id, d.row.slug, d.part.label ] ), [ [ 'S-24', 'cart', 'Your bag' ] ] );
	assert.deepEqual( blockPartSurfaces( { pageMap: [ CART() ], surfaces: SURFACES(), elements, kind: 'modal' } ), [], 'a part is a surface of its own kind only' );
	assert.deepEqual( blockPartSurfaces( { pageMap: [], surfaces: SURFACES(), elements } ), [] );
} );

test( 'decisionsProblems refuses a block-owned part trigger naming a setting its block lacks', () => {
	assert.deepEqual( decisionsProblems( facts( REPO ) ), [] );
	const bad = decisionsProblems( facts( REPO, ( R ) => ( R.blockOwnedPart.byTemplate.cart.trigger.label = 'noSuchSetting' ) ) );
	assert.ok( bad.some( ( p ) => /blockOwnedPart\.byTemplate\.cart\.trigger\.label/.test( p ) ) );
	assert.ok( decisionsProblems( facts( REPO, ( R ) => delete R.blockOwnedPart.byTemplate.cart.trigger.style ) ).some( ( p ) => /trigger\.style/.test( p ) ) );
} );

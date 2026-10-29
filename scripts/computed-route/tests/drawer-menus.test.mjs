// Spec 48 FR-48-55 and Spec 36 FR-36-6 (audit register A5): each navigation group of a drawer binds the menu the page map made
// for it, by surface kind and order (`drawer-1`, `drawer-2`), never the header menu when the drawer has menus of its own;
// and the draft's close control is the drawer block's own close (a part of `sgs/nav-drawer`), not a second dead button.
// Tests marked MUST FAIL fail before the rule; each carries its negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { boundMenu, placeholderTree, writeMenuMap } from '../lib/site-build-map.mjs';
import { carriedIds } from '../lib/skeleton-carried.mjs';
import crypto from 'crypto';
import { handlerCloses } from '../lib/skeleton-handler-opens.mjs';
import { linkContext } from '../lib/draft-link.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();

test( 'MUST FAIL: a drawer binds its own menus by order; a header, a lone drawer menu and a drawer with none keep their binding', () => {
	const names = [ 'header', 'drawer-2', 'drawer-1', 'drawer-10' ];
	assert.equal( boundMenu( 'drawer', names ), 'drawer-1' );
	assert.equal( boundMenu( 'drawer', names, 1 ), 'drawer-2' );
	assert.equal( boundMenu( 'drawer', names, 2 ), 'drawer-10', 'the order is numeric: 10 follows 2' );
	assert.equal( boundMenu( 'drawer', names, 3 ), null, 'a third group has no menu of its own: none is bound' );
	assert.equal( boundMenu( 'drawer', [ 'header', 'drawer' ] ), 'drawer', 'a lone menu named drawer' );
	assert.equal( boundMenu( 'drawer', [ 'header', 'drawer', 'drawer-1' ] ), 'drawer', 'the exact name comes first' );
	assert.equal( boundMenu( 'drawer', [ 'header' ] ), 'header', 'a drawer with no menu of its own shows the header menu' );
	assert.equal( boundMenu( 'drawer', [ 'header' ], 1 ), 'header' );
	assert.equal( boundMenu( 'drawer', [ 'header', 'drawerish', 'drawers-2' ] ), 'header', 'only the exact name or a dash suffix makes a drawer menu, never a longer word' );
	assert.equal( boundMenu( 'header', names ), 'header' );
	assert.equal( boundMenu( 'footer', [ 'footer-shop' ] ), 'footer' );
} );

test( 'MUST FAIL: the drawer placeholder holds one menu block per drawer menu, in order', () => {
	const menus = { header: 30, 'drawer-1': 29, 'drawer-2': 31 };
	const refs = ( ids ) => placeholderTree( { postType: 'sgs_drawer' }, ids )[ 0 ].innerBlocks.map( ( b ) => [ b.name, b.attributes.ref ] );
	assert.deepEqual( refs( menus ), [ [ 'sgs/nav-drawer-menu', 29 ], [ 'sgs/nav-drawer-menu', 31 ] ] );
	assert.deepEqual( refs( { header: 30 } ), [ [ 'sgs/nav-drawer-menu', 30 ] ], 'no drawer menu: the header menu, as before' );
	assert.deepEqual( refs( { header: 30, 'drawer-1': 0, 'drawer-2': 0 } ), [ [ 'sgs/nav-drawer-menu', 0 ], [ 'sgs/nav-drawer-menu', 0 ] ], 'menus not made yet are bound once they exist' );
} );

test( 'MUST FAIL: the menu a skeleton carries for the n-th navigation group of a drawer is the n-th drawer menu', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'drawer-menus-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'build' ), { recursive: true } );
	writeMenuMap( path.join( repo, 'sites', 'c', 'build', 'menu-map.json' ), 't', [ { slug: 'header', owner: 'header', id: 30 }, { slug: 'drawer-1', owner: 'drawer-1', id: 29 }, { slug: 'drawer-2', owner: 'drawer-2', id: 31 } ] );
	const c = carriedIds( { repo, client: 'c', site: 't' } );
	assert.deepEqual( [ c.menu( 'drawer' ), c.menu( 'drawer', 1 ), c.menu( 'drawer', 2 ), c.menu( 'header' ) ], [ 29, 31, null, 30 ] );
} );

// A drawer surface: its panel, a close button, and two navigation groups.
const box = { x: 0, y: 0, w: 300, h: 100 };
const el = ( n, parent, tag, words = '', x = {} ) => ( {
	key: `Root/${ n }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: x.depth ?? 1, tag, template: 'Root', tpl: n, attrs: x.attrs || {}, words, allText: x.all ?? words,
	membership: [], srcTag: tag, snippet: `<${ tag }${ Object.entries( x.attrs || {} ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' ) }>${ words }</${ tag }>`,
	visible: { 375: true, 768: true, 1440: true }, box: { 375: box, 768: box, 1440: box }, display: 'block', widths: [ 375, 768, 1440 ], flexDirection: 'column', position: {}, own: {},
} );
const DRAWER = [
	el( 1, null, 'aside', '', { depth: 0 } ),
	el( 2, 1, 'nav', '', { all: 'Home Shop', attrs: { 'aria-label': 'Main' } } ),
	el( 3, 2, 'a', 'Home', { depth: 2, attrs: { href: '#/' } } ), el( 4, 2, 'a', 'Shop', { depth: 2, attrs: { href: '#/shop' } } ),
	el( 8, 2, 'nav', '', { depth: 2, all: 'Shop', attrs: { 'aria-label': 'Inner' } } ),
	el( 5, 1, 'nav', '', { all: 'Help Contact', attrs: { 'aria-label': 'More' } } ),
	el( 6, 5, 'a', 'Help', { depth: 2, attrs: { href: '#/help' } } ), el( 7, 5, 'a', 'Contact', { depth: 2, attrs: { href: '#/contact' } } ),
];
const inv = { generated: 'test', source: 'test', root: 'aside', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements: DRAWER };
const all = ( l ) => l.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const run = ( menu ) => proposeSkeleton( { inventory: inv, facts: facts(), surface: 'drawer', surfaceKind: 'drawer', surfaceName: 'Drawer', db, carried: { logo: () => null, menu } } );

test( 'MUST FAIL: the n-th navigation group of a drawer skeleton carries the n-th drawer menu', () => {
	const asked = [];
	const { skeleton } = run( ( kind, i = 0 ) => ( asked.push( [ kind, i ] ), [ 29, 31 ][ i ] ?? null ) );
	const menus = all( skeleton ).filter( ( n ) => 'sgs/nav-drawer-menu' === n.name );
	assert.deepEqual( menus.map( ( n ) => n.attributes.ref ), [ 29, 31 ] );
	assert.deepEqual( asked, [ [ 'drawer', 0 ], [ 'drawer', 1 ] ] );
} );

test( 'NEGATIVE: a header surface asks for its one menu and a drawer sharing the header menu carries it for every group', () => {
	const { skeleton } = run( () => 30 );
	assert.deepEqual( all( skeleton ).filter( ( n ) => 'sgs/nav-drawer-menu' === n.name ).map( ( n ) => n.attributes.ref ), [ 30, 30 ] );
} );

// The close control (FR-36-6): a drawer surface with a body, a navigation group and a close button whose handler closes it. The
// draft's logic and fact record are written in the readers' shapes.
function closeRun( o = {} ) {
	const logic = o.logic ?? `class Component {
	renderVals() {
		return { closeMenu: () => this.setState( { menuOpen: false } ), toggleMenu: () => this.setState( ( s ) => ( { menuOpen: ! s.menuOpen } ) ), openMenu: () => this.setState( { menuOpen: true } ), reopen: () => { this.setState( { menuOpen: false } ); this.setState( { menuOpen: true } ); }, pick: () => this.setState( { picked: 1 } ) };
	}
}`;
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'drawer-close-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ logic }\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), text );
	const click = o.click ?? 'closeMenu';
	// o.logo: a logo element in the row holding the close ('row'), or in the body beside the navigation ('body').
	const closeParent = 'row' === o.logo ? 9 : 1;
	const list = [
		{ ...el( 1, null, 'aside', '', { depth: 0 } ) },
		// 'apart': the logo in a wrapper of its own in the body, beside the row holding the close.
		...( o.logo ? [ el( 9, 1, 'div' ), { ...el( 14, 9, 'a', 'Call us', { depth: 2, attrs: { href: 'tel:+440000' } } ), snippet: '<a href="tel:+440000" data-dc-tpl="14">Call us</a>' }, el( 15, 1, 'div' ), el( 10, { row: 9, body: 1, apart: 15 }[ o.logo ], 'site-logo', '', { depth: 2 } ) ] : [] ),
		{ ...el( 2, closeParent, o.tag ?? 'button', o.words ?? '×', { attrs: { 'aria-label': 'Close' } } ), snippet: `<${ o.tag ?? 'button' } data-dc-tpl="2" sc-camel-on-click="{{ ${ click } }}">${ o.words ?? '×' }</${ o.tag ?? 'button' }>` },
		...( o.noNav ? [] : [ el( 3, 1, 'nav', '', { all: 'Home Shop' } ), el( 4, 3, 'a', 'Home', { depth: 2, attrs: { href: '#/' } } ), el( 5, 3, 'a', 'Shop', { depth: 2, attrs: { href: '#/shop' } } ) ] ),
		...( o.cta ? [ { ...el( 11, 1, 'a', '', { all: 'Apply now', attrs: { href: '#/apply' } } ), snippet: '<a href="#/apply" data-dc-tpl="11"><span>Apply now</span><span></span></a>' }, el( 12, 11, 'span', 'Apply now', { depth: 2 } ), el( 13, 11, 'span', '', { depth: 2 } ) ] : [] ),
	];
	const rec = ( n, parent, tag, onClick ) => ( { template: { key: `Root/${ n }`, component: 'Root', n: String( n ), tag, realTag: tag, attrs: onClick ? { onClick: `{{ ${ onClick } }}` } : {}, style: { static: [], holes: [] }, pseudo: {}, holes: [],
		parent: parent ? `Root/${ parent }` : null, realParent: parent ? `Root/${ parent }` : null, parentChain: parent ? [ `Root/${ parent }` ] : [], membership: { scIf: [], scFor: [], dcImport: [] }, own: {}, inHelmet: false, inFor: false, ref: null, hooks: {}, events: [], words: '', srcLine: n }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} } );
	const elements = Object.fromEntries( list.map( ( x ) => [ `Root/${ x.tpl }`, rec( x.tpl, x.parentKey ? Number( /\/(\d+)#/.exec( x.parentKey )[ 1 ] ) : null, x.tag, 2 === x.tpl ? click : null ) ] ) );
	const states = o.states ?? [ { name: 'open', state_keys: { menuOpen: true } } ];
	const factRecord = { schema: '1', client: 'fixture-client', elements, surfaces: { 'S-05': { id: 'S-05', kind: 'drawer', name: 'Mobile menu', dc: 'Root', parent: null, roots: [ 'Root/1' ], parts: [], states } },
		sources: { files: { 'Root.dc.html': crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) } } };
	const inventory = { checks: {}, source: 'fixture', root: 'aside', generated: 'fixture', elements: list };
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	o.edit && o.edit( f.decisions.rules );
	return { ...proposeSkeleton( { inventory, facts: { ...f, repo }, surface: 'drawer', surfaceKind: o.kind ?? 'drawer', surfaceName: 'Mobile menu', db, factRecord, openers: { 'S-05': 'Menu button' }, pageMap: o.pageMap ?? [], ...( o.carried ? { carried: o.carried } : {} ), ...( o.draftLinks ? { draftLinks: o.draftLinks } : {} ) } ), repo, text };
}
const nodeAt = ( r, key ) => all( r.skeleton ).find( ( n ) => n.draftRef?.tpl === key );
const rowAt = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );

test( 'MUST FAIL: the draft\'s close button in a drawer surface is absorbed into the drawer block, never built as a second close', () => {
	const r = closeRun();
	assert.equal( nodeAt( r, 'Root/1#0' ).name, 'sgs/nav-drawer' );
	assert.deepEqual( [ rowAt( r, 'Root/2#0' ).action, rowAt( r, 'Root/2#0' ).rule, rowAt( r, 'Root/2#0' ).into ], [ 'absorbed', 'drawerClose', 'Root/1#0' ] );
	assert.equal( nodeAt( r, 'Root/2#0' ), undefined, 'no sgs/button for the ×' );
	assert.equal( all( r.skeleton ).filter( ( n ) => 'sgs/button' === n.name ).length, 0 );
} );

test( 'MUST FAIL: a close control with words of its own gives the block\'s closeLabel; a bare glyph leaves the block\'s default', () => {
	assert.equal( nodeAt( closeRun( { words: 'Close menu' } ), 'Root/1#0' ).attributes.closeLabel, 'Close menu' );
	assert.equal( nodeAt( closeRun(), 'Root/1#0' ).attributes.closeLabel, undefined );
} );

test( 'NEGATIVE: a toggle, an opener, a handler writing no state the drawer opens on, a non-control, a page surface and the rule removed keep the button', () => {
	const kept = ( o, why ) => assert.notEqual( rowAt( closeRun( o ), 'Root/2#0' ).rule, 'drawerClose', why );
	kept( { click: 'toggleMenu' }, 'a toggle opens as well as closes' );
	kept( { click: 'openMenu' }, 'an opener' );
	kept( { click: 'pick' }, 'a handler writing a key the drawer does not open on' );
	kept( { states: [ { name: 'open', state_keys: { other: true } } ] }, 'a drawer whose states hold another key' );
	kept( { tag: 'span' }, 'only a button or link is a control' );
	kept( { kind: 'page' }, 'a page surface has no drawer block to take it' );
	kept( { edit: ( R ) => delete R.drawerClose }, 'the rule removed' );
	// A drawer the page map hands to another row's block is drawn by that block, which absorbs the control.
	const owned = [ { slug: 'cart', postType: 'page', template: 'cart', parts: [ { kind: 'drawer', label: 'Bag', owner: 'block', draftId: 'surfaces.json S-05' } ] } ];
	const r = closeRun( { pageMap: owned } );
	assert.equal( r.proposal.surfaceRole?.role, 'blockPart', 'the fixture is a block-owned part' );
	assert.notEqual( rowAt( r, 'Root/2#0' ).rule, 'drawerClose', 'a block-owned drawer is the owning block, not the navigation drawer' );
} );

test( 'handlerCloses reads falsy writes, and a key the handler also opens is a toggle\'s', () => {
	const r = closeRun();
	const folder = path.join( r.repo, 'sites', 'fixture-client', 'handoff' );
	const record = { sources: { files: { 'Root.dc.html': crypto.createHash( 'sha256' ).update( r.text ).digest( 'hex' ) } } };
	const of = ( handler ) => [ ...handlerCloses( { folder, record, component: 'Root', handler } ) ];
	assert.deepEqual( of( 'closeMenu' ), [ 'menuOpen' ] );
	assert.deepEqual( of( 'openMenu' ), [] );
	assert.deepEqual( of( 'toggleMenu' ), [] );
	assert.deepEqual( of( 'reopen' ), [], 'a key written both closed and open is not a close' );
	assert.deepEqual( of( 'missing' ), [] );
} );

// The close handler as a member of the component (`closeMenu: this.shut`): a class field holding an arrow, or a class method.
const memberLogic = ( member ) => `class Component {
	shutField = () => { if ( this.busy ) { return; } this.setState( { menuOpen: false } ); };
	shutMethod() {
		this.setState( { menuOpen: false } );
	}
	flip = () => this.setState( ( s ) => ( { menuOpen: ! s.menuOpen } ) );
	reopen = () => { this.setState( { menuOpen: false } ); this.setState( { menuOpen: true } ); };
	renderVals() {
		return { closeMenu: this.${ member } };
	}
}`;

test( "MUST FAIL: a close handler that names a class field or a class method of the component is the drawer's own close", () => {
	for ( const member of [ 'shutField', 'shutMethod' ] ) {
		assert.deepEqual( [ rowAt( closeRun( { logic: memberLogic( member ) } ), 'Root/2#0' ).rule ], [ 'drawerClose' ], member );
	}
} );

test( 'NEGATIVE: a member that toggles, reopens or does not exist is no close', () => {
	for ( const member of [ 'flip', 'reopen', 'missing' ] ) {
		assert.notEqual( rowAt( closeRun( { logic: memberLogic( member ) } ), 'Root/2#0' ).rule, 'drawerClose', member );
	}
} );

const LOGO = { logo: () => ( { id: 81, asset: 'logo.svg' } ), menu: () => null };

test( "MUST FAIL: a logo in the drawer's top row (beside its close) is the drawer block's own top-row logo: absorbed, its attachment the block's logo setting, no second logo block", () => {
	const r = closeRun( { logo: 'row', carried: LOGO } );
	assert.deepEqual( [ rowAt( r, 'Root/10#0' ).action, rowAt( r, 'Root/10#0' ).rule, rowAt( r, 'Root/10#0' ).into ], [ 'absorbed', 'drawerLogo', 'Root/1#0' ] );
	assert.equal( nodeAt( r, 'Root/1#0' ).attributes.chromeLogoId, 81 );
	assert.equal( all( r.skeleton ).filter( ( n ) => r.facts?.logoBlocks?.includes( n.name ) || /logo/.test( n.name ) ).length, 0, 'no logo block' );
} );

test( 'NEGATIVE: a logo in the body (beside the navigation, not the close), a page surface and the rule removed keep the logo block', () => {
	const logoRow = ( o ) => rowAt( closeRun( { carried: LOGO, ...o } ), 'Root/10#0' );
	assert.notEqual( logoRow( { logo: 'body' } ).rule, 'drawerLogo', 'the row holding both the logo and the close is the drawer root itself' );
	assert.notEqual( logoRow( { logo: 'body', noNav: true } ).rule, 'drawerLogo', 'the drawer root is never its own top row, navigation or none' );
	assert.notEqual( logoRow( { logo: 'apart' } ).rule, 'drawerLogo', 'a logo in a wrapper of its own beside the close row is in the body' );
	assert.notEqual( logoRow( { logo: 'row', kind: 'modal' } ).rule, 'drawerLogo', 'a modal surface has no drawer block' );
	assert.notEqual( rowAt( closeRun( { logo: 'row', carried: LOGO } ), 'Root/14#0' ).rule, 'drawerLogo', 'a link in the top row is no logo' );
	assert.notEqual( logoRow( { logo: 'row', kind: 'page' } ).rule, 'drawerLogo', 'a page surface has no drawer' );
	assert.notEqual( logoRow( { logo: 'row', edit: ( R ) => delete R.drawerLogo } ).rule, 'drawerLogo', 'the rule removed' );
	assert.equal( nodeAt( closeRun( { logo: 'body', carried: LOGO } ), 'Root/1#0' ).attributes.chromeLogoId, undefined );
} );

test( 'MUST FAIL: a pill button holding a label and a glyph keeps its own link, resolved from the draft route', () => {
	const draftLinks = linkContext( { rows: [ { route: 'apply', slug: 'apply', title: 'Apply', parent: null, template: 'page', postType: 'page' } ], routing: { adapter: 'hash', links: [] } } );
	const r = closeRun( { cta: true, draftLinks } );
	assert.equal( rowAt( r, 'Root/11#0' ).block, 'sgs/button' );
	assert.deepEqual( nodeAt( r, 'Root/11#0' ).attributes, { label: 'Apply now', url: '/apply/' } );
} );

test( 'NEGATIVE: a pill button whose draft route no page-map row holds writes no url', () => {
	const draftLinks = linkContext( { rows: [], routing: { adapter: 'hash', links: [] } } );
	const r = closeRun( { cta: true, draftLinks } );
	assert.equal( nodeAt( r, 'Root/11#0' ).attributes.url, undefined, 'a route no page-map row holds is never written' );
} );

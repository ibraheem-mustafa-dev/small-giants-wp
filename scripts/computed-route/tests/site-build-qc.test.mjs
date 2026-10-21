// Wave 2 QC fixes for the site build's menu labels (each MUST FAIL when its rule breaks): the draft link text is keyed
// by the surface a menu feeds, a bare "#" is no route, and two lists giving one route different text are reported.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { desiredMenus } from '../lib/site-build-menus.mjs';
import { labelRoutes, readLinkTextReport } from '../lib/site-build-labels.mjs';
import { loadDraft } from '../lib/intake-ast.mjs';
import { menuSurfaceKind } from '../lib/site-build-map.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'qc-' ) );
const labelOf = ( menus, name, slug ) => menus[ name ].find( ( i ) => i.rowKey?.endsWith( `:${ slug }` ) ).label;

test( 'MUST FAIL: link text follows the surface a menu feeds, however the page map names the menu', () => {
	const rows = [
		row( { slug: 'shop', title: 'Shop', menus: [ { menu: 'footer-shop', position: 1, parentItem: null }, { menu: 'drawer-menu-links', position: 1, parentItem: null }, { menu: 'nav-main', position: 1, parentItem: null } ] } ),
	];
	const text = { footer: { shop: 'Browse' }, drawer: { shop: 'Menu shop' }, header: { shop: 'Store' } };
	const surfaces = { 'nav-main': { tree: 'trees/sgs_header/header.json' } };
	const { menus } = desiredMenus( rows, text, surfaces );
	assert.equal( labelOf( menus, 'footer-shop', 'shop' ), 'Browse' );
	assert.equal( labelOf( menus, 'drawer-menu-links', 'shop' ), 'Menu shop' );
	assert.equal( labelOf( menus, 'nav-main', 'shop' ), 'Store' );
	assert.equal( menuSurfaceKind( 'sidebar', {} ), null );
} );

test( 'MUST FAIL: a header menu the drawer also binds (no drawer menu) takes the drawer text where the header has none', () => {
	const rows = [ row( { slug: 'a', title: 'A', menus: [ { menu: 'header', position: 1, parentItem: null } ] } ), row( { slug: 'b', title: 'B', menus: [ { menu: 'header', position: 2, parentItem: null } ] } ) ];
	const { menus } = desiredMenus( rows, { header: { a: 'Alpha' }, drawer: { a: 'Drawer alpha', b: 'Bravo' } } );
	assert.equal( labelOf( menus, 'header', 'a' ), 'Alpha' );
	assert.equal( labelOf( menus, 'header', 'b' ), 'Bravo' );
	const own = desiredMenus( [ ...rows, row( { slug: 'c', title: 'C', menus: [ { menu: 'drawer', position: 1, parentItem: null } ] } ) ], { header: {}, drawer: { b: 'Bravo' } } ).menus;
	assert.equal( labelOf( own, 'header', 'b' ), 'B' );
} );

const DRAFT = `<x-dc><nav><sc-for list="{{ items }}" as="item"><a>{{ item.label }}</a></sc-for></nav></x-dc>
<script data-dc-script>
class Page { get items() { return [ { label: 'More', href: '#' }, { label: 'Home', href: '#/' }, { label: 'Hi', href: '#/hi' } ]; } }
</script>`;

test( 'MUST FAIL: a bare "#" href is a disclosure, no route (never the front page)', () => {
	const dir = tmp();
	fs.writeFileSync( path.join( dir, 'p.dc.html' ), DRAFT );
	const m = labelRoutes( [ loadDraft( dir, 'p.dc.html' ) ], 'home' );
	assert.equal( m.has( 'More' ), false );
	assert.equal( m.get( 'Home' ), 'home' );
	assert.equal( m.get( 'Hi' ), 'hi' );
} );

test( 'MUST FAIL: two lists on one surface giving one route different text are reported, not first-wins', () => {
	const repo = tmp();
	const build = path.join( repo, 'sites', 'c', 'build', 'intake' );
	fs.mkdirSync( build, { recursive: true } );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'handoff', 'p.dc.html' ), `<x-dc></x-dc>
<script data-dc-script>
class Page { get a() { return [ { label: 'Contact', href: '#/contact' }, { label: 'Contact Us', href: '#/contact' }, { label: 'Hi', href: '#/hi' } ]; } }
</script>` );
	const hole = ( labels ) => ( { 1440: { loop: true, v: labels.map( ( v ) => ( { t: 'string', v } ) ) } } );
	const el = ( labels ) => ( { template: { inFor: true, holes: [ { id: 'text#0', where: 'text', path: 'item.label' } ] }, logic: { holes: { 'text#0': hole( labels ) } }, surfaces: [ { kind: 'footer' } ] } );
	fs.writeFileSync( path.join( build, 'facts.json' ), JSON.stringify( { elements: { a: el( [ 'Contact', 'Hi' ] ), b: el( [ 'Contact Us' ] ) } } ) );
	const r = readLinkTextReport( { repo, client: 'c' } );
	assert.deepEqual( r.text, { footer: { hi: 'Hi' } } );
	assert.equal( r.conflicts.length, 1 );
	assert.match( r.conflicts[ 0 ], /footer surface.*"contact".*"Contact" and "Contact Us"/ );
} );

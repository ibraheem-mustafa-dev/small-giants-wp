// FR-48-55 menu item labels and FR-48-58 carried ids (each MUST FAIL when its rule breaks): a menu item shows the draft
// link's own text, and a skeleton's logoId and menu ref come from the media map and the menu map, never a hand-set value.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import path from 'path';
import { desiredMenus } from '../lib/site-build-menus.mjs';
import { labelRoutes, readLinkText } from '../lib/site-build-labels.mjs';
import { loadDraft } from '../lib/intake-ast.mjs';
import { carriedIds, logoFile, mediaEntry, sourceMaps } from '../lib/skeleton-carried.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { writeMenuMap } from '../lib/site-build-map.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const ROWS = () => [
	row( { slug: 'contact', title: 'Contact Us', menus: [ { menu: 'header', position: 1, parentItem: null } ] } ),
	row( { slug: 'about', title: 'About', menus: [ { menu: 'header', position: 2, parentItem: null } ] } ),
	row( { slug: 'apply', title: 'Apply for Trade Account', menus: [ { menu: 'header', position: 3, parentItem: null } ] } ),
	row( { slug: 'apply-mega', route: undefined, postType: 'sgs_mega_menu', title: 'Trade mega menu', menus: [ { menu: 'header', position: 3, parentItem: null } ] } ),
];
const items = ( linkText ) => desiredMenus( ROWS(), linkText ).menus.header;
const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'carried-' ) );
const sha = ( s ) => crypto.createHash( 'sha256' ).update( s ).digest( 'hex' );

test( 'MUST FAIL: a link text that differs from the page title is the menu item label and its stored title', () => {
	const contact = items( { header: { contact: 'Contact' } } ).find( ( i ) => i.rowKey?.endsWith( ':contact' ) );
	assert.equal( contact.label, 'Contact' );
	assert.equal( contact.title, 'Contact' );
} );

test( 'a link text equal to the page title stores no title, and no link text keeps the page title', () => {
	const list = items( { header: { about: 'About' } } );
	assert.equal( list.find( ( i ) => i.rowKey?.endsWith( ':about' ) ).title, '' );
	const none = items( {} ).find( ( i ) => i.rowKey?.endsWith( ':contact' ) );
	assert.deepEqual( [ none.label, none.title ], [ 'Contact Us', '' ] );
} );

test( 'MUST FAIL: a mega item takes the link text of the section page on its slot, else the panel label', () => {
	assert.equal( items( { header: { apply: 'Trade' } } ).find( ( i ) => 'sgs_mega_menu' === i.postType ).label, 'Trade' );
	assert.equal( items( { header: { apply: 'Sign up' } } ).find( ( i ) => 'sgs_mega_menu' === i.postType ).label, 'Sign up' );
	assert.equal( items( {} ).find( ( i ) => 'sgs_mega_menu' === i.postType ).label, 'Trade' );
} );

test( 'link text is per menu: the footer text never renames a header item, and each menu shows its own', () => {
	const rows = ROWS();
	rows.find( ( r ) => 'about' === r.slug ).menus.push( { menu: 'footer', position: 1, parentItem: null } );
	const { menus } = desiredMenus( rows, { header: { about: 'About' }, footer: { about: 'Who we are', contact: 'Write to us' } } );
	assert.equal( menus.header.find( ( i ) => i.rowKey?.endsWith( ':about' ) ).label, 'About' );
	assert.equal( menus.footer.find( ( i ) => i.rowKey?.endsWith( ':about' ) ).label, 'Who we are' );
	assert.equal( menus.header.find( ( i ) => i.rowKey?.endsWith( ':contact' ) ).label, 'Contact Us' );
} );

test( 'MUST FAIL: a changed label is an item-update in the plan, and an item already showing it is not', () => {
	const rows = [ row( { slug: 'contact', title: 'Contact Us', id: 10, menus: [ { menu: 'header', position: 1, parentItem: null } ] } ) ];
	const post = { id: 10, type: 'page', status: 'publish', rowKey: 'page:contact', title: 'Contact Us', slug: 'contact', parent: 0, template: '', treeHash: '' };
	const state = ( title ) => ( { posts: { 10: post }, marked: { 'page:contact': [ 10 ] }, holders: {}, menus: [ { id: 5, slug: 'header', owner: 'header', items: [ { id: 31, type: 'post_type', object: 'page', objectId: 10, parent: 0, order: 1, title } ] } ], locations: {}, registeredLocations: [], templates: {}, options: {}, pointers: {} } );
	const updates = ( title, linkText ) => planBuild( { rows, state: state( title ), repo: tmp(), client: 'c', linkText } ).actions.filter( ( a ) => 'item-update' === a.type );
	const [ u ] = updates( '', { header: { contact: 'Contact' } } );
	assert.equal( u.title, 'Contact' );
	assert.match( u.say, /title "" -> "Contact"/ );
	assert.equal( updates( 'Contact', { header: { contact: 'Contact' } } ).length, 0 );
	assert.equal( updates( '', {} ).length, 0 );
} );

const DRAFT = `<x-dc><nav><sc-for list="{{ items }}" as="item"><a>{{ item.label }}</a></sc-for></nav></x-dc>
<script data-dc-script>
class Page { get items() { return [ { label: 'Contact', href: '#/contact' }, { label: 'Dup', href: '#/a' }, { label: 'Dup', href: '#/b' }, { label: 'Home', href: '#/' } ]; } }
</script>`;
const hole = ( labels ) => ( { 1440: { loop: true, v: labels.map( ( v ) => ( { t: 'string', v } ) ) } } );

test( 'MUST FAIL: the label to route map reads each label beside its href and drops a label two routes claim', () => {
	const dir = tmp();
	fs.writeFileSync( path.join( dir, 'p.dc.html' ), DRAFT );
	const m = labelRoutes( [ loadDraft( dir, 'p.dc.html' ) ] );
	assert.equal( m.get( 'Contact' ), 'contact' );
	assert.equal( m.get( 'Home' ), 'home' );
	assert.equal( m.get( 'Dup' ), null );
} );

test( 'MUST FAIL: readLinkText gives, per surface kind, the text of each looped label keyed by its route', () => {
	const repo = tmp();
	const build = path.join( repo, 'sites', 'c', 'build', 'intake' );
	fs.mkdirSync( build, { recursive: true } );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'handoff', 'p.dc.html' ), DRAFT );
	const el = { template: { inFor: true, holes: [ { id: 'text#0', where: 'text', path: 'item.label' } ] }, logic: { holes: { 'text#0': hole( [ 'Contact', 'Dup', 'Home' ] ) } }, surfaces: [ { kind: 'header' } ] };
	fs.writeFileSync( path.join( build, 'facts.json' ), JSON.stringify( { elements: { a: el } } ) );
	assert.deepEqual( readLinkText( { repo, client: 'c' } ), { header: { contact: 'Contact', home: 'Home' } } );
	assert.deepEqual( readLinkText( { repo, client: 'none' } ), {} );
} );

// A client with a custom logo element drawn from a script's source map, and an <img> logo.
function logoRepo( { hashOf = ( s ) => sha( s ), extra = [] } = {} ) {
	const repo = tmp();
	const handoff = path.join( repo, 'sites', 'c', 'handoff' );
	fs.mkdirSync( path.join( handoff, 'assets' ), { recursive: true } );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'assets' ), { recursive: true } );
	fs.writeFileSync( path.join( handoff, 'logo.js' ), "const SRC = { wide: './assets/wide.svg', square: './assets/square.svg' };\n" );
	fs.writeFileSync( path.join( handoff, 'assets', 'wide.svg' ), '<svg>wide</svg>' );
	fs.writeFileSync( path.join( handoff, 'assets', 'square.svg' ), '<svg>square</svg>' );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'assets', 'wide.svg' ), '<svg>other wide</svg>' );
	const files = [
		{ asset: 'sites/c/assets/wide.svg', sha256: sha( '<svg>other wide</svg>' ), storedSha256: 'x', id: 10 },
		{ asset: 'sites/c/handoff/assets/wide.svg', sha256: hashOf( '<svg>wide</svg>' ), storedSha256: 'y', id: 11 },
		{ asset: 'sites/c/handoff/assets/square.svg', sha256: sha( '<svg>square</svg>' ), storedSha256: 'z', id: 12 },
		...extra,
	];
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'build', 'media-map.json' ), JSON.stringify( { sites: { t: { files } } } ) );
	return repo;
}
const logoEl = ( variant ) => ( { key: 'Root/1#0', tag: 'x-logo', attrs: { 'aria-label': 'Logo', variant } } );

test( 'MUST FAIL: a custom logo element takes the attachment of the file its script names for its variant, chosen by local sha256', () => {
	const repo = logoRepo();
	const c = carriedIds( { repo, client: 'c', site: 't' } );
	assert.deepEqual( c.logo( logoEl( 'wide' ) ), { id: 11, asset: 'sites/c/handoff/assets/wide.svg' } );
	assert.equal( c.logo( logoEl( 'square' ) ).id, 12 );
	assert.equal( c.logo( logoEl( 'unknown' ) ), null );
} );

test( 'MUST FAIL: an entry whose source sha256 is not the local file is never carried (storedSha256 is not the match)', () => {
	const repo = logoRepo( { hashOf: () => 'f'.repeat( 64 ) } );
	const hit = carriedIds( { repo, client: 'c', site: 't' } ).logo( logoEl( 'wide' ) );
	assert.equal( hit.id, undefined );
	assert.match( hit.reason, /not in the media map/ );
} );

test( 'two entries with the same bytes but different attachments are reported, not guessed', () => {
	const repo = logoRepo( { extra: [ { asset: 'sites/c/other/assets/wide.svg', sha256: sha( '<svg>wide</svg>' ), storedSha256: 'q', id: 99 } ] } );
	assert.match( mediaEntry( { map: JSON.parse( fs.readFileSync( path.join( repo, 'sites', 'c', 'build', 'media-map.json' ), 'utf8' ) ), site: 't', repo, folder: path.join( repo, 'sites', 'c', 'handoff' ), file: 'assets/wide.svg' } ).reason, /different attachments/ );
} );

test( 'an <img> logo is its src; a src from another origin carries nothing', () => {
	const maps = sourceMaps( path.join( logoRepo(), 'sites', 'c', 'handoff' ) );
	assert.equal( logoFile( { e: { tag: 'img', attrs: { src: './assets/wide.svg?v=2' } }, maps } ), 'assets/wide.svg' );
	assert.equal( logoFile( { e: { tag: 'img', attrs: { src: 'https://cdn.example/x.svg' } }, maps } ), null );
} );

test( 'MUST FAIL: the menu a surface carries is the one site-build recorded by name; a drawer without its own menu takes the header menu', () => {
	const repo = logoRepo();
	writeMenuMap( path.join( repo, 'sites', 'c', 'build', 'menu-map.json' ), 't', [ { slug: 'header', owner: 'header', id: 7 }, { slug: 'footer', owner: 'footer', id: 8 }, { slug: 'foreign', owner: '', id: 9 } ] );
	const c = carriedIds( { repo, client: 'c', site: 't' } );
	assert.equal( c.menu( 'header' ), 7 );
	assert.equal( c.menu( 'drawer' ), 7 );
	assert.equal( c.menu( 'footer' ), 8 );
	assert.equal( carriedIds( { repo, client: 'c', site: 'other' } ).menu( 'header' ), null );
} );

// The proposal over the committed Eye Care footer inventory, whose <img> logo is a sgs/responsive-logo node.
const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const inventory = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', 'eye-care-ward-end', 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' ) );
const db = openDb();
const facts = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Eye Care Birmingham' } );
const propose = ( o = {} ) => proposeSkeleton( { inventory, facts, surface: 'footer', db, ...o } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const logoNode = ( r ) => nodes( r.skeleton ).find( ( n ) => 'sgs/responsive-logo' === n.name );
const logoRow = ( r ) => r.proposal.rows.find( ( x ) => 'sgs/responsive-logo' === x.block );

test( 'MUST FAIL: a carried logoId reaches the logo node and the row names where it came from', () => {
	const r = propose( { carried: { logo: () => ( { id: 81, asset: 'a.svg' } ), menu: () => null } } );
	assert.equal( logoNode( r ).attributes.logoId, 81 );
	assert.deepEqual( logoRow( r ).carried, { logoId: 'media-map.json: a.svg' } );
	assert.equal( undefined, logoNode( propose() ).attributes.logoId );
} );

test( 'MUST FAIL: a carried id wins over a differing decision value, which is reported and never applied; an equal one is silent', () => {
	const key = logoRow( propose() ).key;
	const decide = ( id ) => ( { surfaces: { footer: { [ key ]: { block: 'sgs/responsive-logo', attributes: { logoId: id }, signature: logoRow( propose() ).tag + '|' + logoRow( propose() ).words } } } } );
	const carried = { logo: () => ( { id: 81, asset: 'a.svg' } ), menu: () => null };
	const differs = propose( { carried, clientDecisions: decide( 6 ) } );
	assert.equal( logoNode( differs ).attributes.logoId, 81 );
	assert.match( logoRow( differs ).stale, /sets logoId 6, which is not applied; the build carries 81/ );
	const same = propose( { carried, clientDecisions: decide( 81 ) } );
	assert.equal( logoNode( same ).attributes.logoId, 81 );
	assert.ok( ! logoRow( same ).stale );
} );

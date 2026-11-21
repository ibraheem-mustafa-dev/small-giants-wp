// FR-48-55 menu item labels and FR-48-58 carried ids (each MUST FAIL when its rule breaks): a menu item shows the draft
// link's own text, and a skeleton's logo Source and menu ref come from the media map and the menu map, never a hand-set value.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import path from 'path';
import { desiredMenus } from '../lib/site-build-menus.mjs';
import { labelRoutes, readLinkText, handlerLinkText } from '../lib/site-build-labels.mjs';
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

// Static links (no list): the words a header link shows beside the route its click handler opens, from the intake's routing.
const LINKS = [ { call: 'onClick="{{ goAbout }}"', route: 'about' }, { call: 'onClick="{{ goAbout }}"', route: 'about' }, { call: 'onClick="{{ go }}"', route: 'a' }, { call: 'onClick="{{ go }}"', route: 'b' }, { call: 'onMouseEnter="{{ goHelp }}"', route: 'help' } ];
const link = ( words, expr, kind = 'header', extra = {} ) => ( { template: { tag: 'a', words, inFor: false, holes: [], events: [ { name: 'onClick', expr } ], ...extra }, surfaces: [ { kind } ] } );

test( 'MUST FAIL: a static link\'s own words are the text of the one route its click handler opens, per surface kind', () => {
	assert.deepEqual( handlerLinkText( { a: link( 'About  Eye Care', 'goAbout' ), b: link( 'About Eye Care', 'goAbout', 'drawer' ) }, LINKS ), { header: { about: 'About Eye Care' }, drawer: { about: 'About Eye Care' } } );
	assert.deepEqual( handlerLinkText( { a: link( 'Help', 'goAbout', 'header', { events: [ { name: 'onMouseEnter', expr: 'openMega' }, { name: 'onClick', expr: 'goAbout' } ] } ) }, LINKS ), { header: { about: 'Help' } }, 'the click handler, whatever comes before it' );
	const repo = tmp();
	const build = path.join( repo, 'sites', 'c', 'build', 'intake' );
	fs.mkdirSync( build, { recursive: true } );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'handoff', 'p.dc.html' ), DRAFT );
	const looped = { template: { inFor: true, holes: [ { id: 'text#0', where: 'text', path: 'item.label' } ] }, logic: { holes: { 'text#0': hole( [ 'Contact' ] ) } }, surfaces: [ { kind: 'header' } ] };
	fs.writeFileSync( path.join( build, 'facts.json' ), JSON.stringify( { elements: { a: looped, b: link( 'About Eye Care', 'goAbout' ), c: { ...link( 'Get in touch', 'goContact' ) } } } ) );
	fs.writeFileSync( path.join( build, 'intake.json' ), JSON.stringify( { routing: { links: [ ...LINKS, { call: 'onClick="{{ goContact }}"', route: 'contact' } ] } } ) );
	assert.deepEqual( readLinkText( { repo, client: 'c' } ), { header: { contact: 'Contact', about: 'About Eye Care' } }, 'a looped label keeps its route; a static link fills the routes no list gives' );
} );

test( 'negative controls: a handler two routes share, a link inside a list, words with a hole, no click handler, and two words for one route give no text', () => {
	assert.deepEqual( handlerLinkText( { a: link( 'Go', 'go' ) }, LINKS ), {} );
	assert.deepEqual( handlerLinkText( { a: link( 'About', 'goAbout', 'header', { inFor: true } ) }, LINKS ), {} );
	assert.deepEqual( handlerLinkText( { a: link( 'Hi {{ name }}', 'goAbout', 'header', { holes: [ { where: 'text' } ] } ) }, LINKS ), {} );
	assert.deepEqual( handlerLinkText( { a: link( 'Help', 'goHelp' ) }, LINKS ), {}, 'a hover handler is no link' );
	assert.deepEqual( handlerLinkText( { a: link( 'About', 'goAbout' ), b: link( 'Our story', 'goAbout' ) }, LINKS ), { header: {} } );
	assert.deepEqual( handlerLinkText( { a: link( '', 'goAbout' ) }, LINKS ), {} );
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

// local-eye-care mirrors eye-care-clone-test (calibration-targets.json mirrorOf): the site build records a menu it makes on
// the mirror under the mirror's own name (site-build.mjs::writeMenuMap is given the site it ran on).
test( 'MUST FAIL: a menu the site build recorded under a mirror\'s own name is carried there, over its test site\'s record', () => {
	const repo = logoRepo();
	const file = path.join( repo, 'sites', 'c', 'build', 'menu-map.json' );
	writeMenuMap( file, 'eye-care-clone-test', [ { slug: 'header', owner: 'header', id: 17 }, { slug: 'footer', owner: 'footer', id: 18 } ] );
	writeMenuMap( file, 'local-eye-care', [ { slug: 'header', owner: 'header', id: 30 }, { slug: 'header-2', owner: 'header-2', id: 90 } ] );
	const c = carriedIds( { repo, client: 'c', site: 'local-eye-care' } );
	assert.equal( c.menu( 'header-2' ), 90, 'a menu only the mirror\'s own record holds' );
	assert.equal( c.menu( 'header' ), 30, 'the mirror\'s own id wins over its test site\'s' );
	assert.equal( c.menu( 'footer' ), 18, 'a menu the mirror\'s own record lacks is still its test site\'s' );
} );

test( 'a mirror with no menu record of its own reads the record of the test site it mirrors', () => {
	const repo = logoRepo();
	writeMenuMap( path.join( repo, 'sites', 'c', 'build', 'menu-map.json' ), 'eye-care-clone-test', [ { slug: 'header', owner: 'header', id: 17 } ] );
	assert.equal( carriedIds( { repo, client: 'c', site: 'local-eye-care' } ).menu( 'header' ), 17 );
	assert.equal( carriedIds( { repo, client: 'c', site: 'eye-care-clone-test' } ).menu( 'header' ), 17 );
} );

// The proposal over a frozen copy of the Eye Care footer inventory, whose <img> logo is a sgs/responsive-logo node (the
// client's own file is regenerated by every site run, so the test keeps its own copy).
const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const inventory = JSON.parse( fs.readFileSync( path.join( path.dirname( fileURLToPath( import.meta.url ) ), 'fixtures', 'site-build-carried', 'footer.inventory.json' ), 'utf8' ) );
const db = openDb();
const facts = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Eye Care Birmingham' } );
const propose = ( o = {} ) => proposeSkeleton( { inventory, facts, surface: 'footer', db, ...o } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const logoNode = ( r ) => nodes( r.skeleton ).find( ( n ) => 'sgs/responsive-logo' === n.name );
const SRC81 = { desktop: { kind: 'image', id: 81, url: 'https://t.test/a.svg', mime: 'image/svg+xml' } };
const logoRow = ( r ) => r.proposal.rows.find( ( x ) => 'sgs/responsive-logo' === x.block );

test( 'MUST FAIL: a carried logo Source reaches the logo node and the row names where it came from', () => {
	const r = propose( { carried: { logo: () => ( { id: 81, asset: 'a.svg', url: 'https://t.test/a.svg' } ), menu: () => null } } );
	assert.deepEqual( logoNode( r ).attributes.logoSource, SRC81 );
	assert.deepEqual( logoRow( r ).carried, { logoSource: 'media-map.json: a.svg' } );
	assert.equal( undefined, logoNode( propose() ).attributes.logoSource );
} );

test( 'MUST FAIL: a carried id wins over a differing decision value, which is reported and never applied; an equal one is silent', () => {
	const key = logoRow( propose() ).key;
	const decide = ( id ) => ( { surfaces: { footer: { [ key ]: { block: 'sgs/responsive-logo', attributes: { logoSource: { desktop: { kind: 'image', id, url: 'https://t.test/a.svg', mime: 'image/svg+xml' } } }, signature: logoRow( propose() ).tag + '|' + logoRow( propose() ).words } } } } );
	const carried = { logo: () => ( { id: 81, asset: 'a.svg', url: 'https://t.test/a.svg' } ), menu: () => null };
	const differs = propose( { carried, clientDecisions: decide( 6 ) } );
	assert.deepEqual( logoNode( differs ).attributes.logoSource, SRC81 );
	assert.match( logoRow( differs ).stale, /sets logoSource .*"id":6.*, which is not applied; the build carries .*"id":81/ );
	const same = propose( { carried, clientDecisions: decide( 81 ) } );
	assert.deepEqual( logoNode( same ).attributes.logoSource, SRC81 );
	assert.ok( ! logoRow( same ).stale );
} );

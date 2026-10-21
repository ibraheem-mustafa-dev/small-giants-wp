// The surfaces manifest builder (lib/manifest-build.mjs) and its command (manifest.mjs). No browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildManifest, matchRecord, surfaceKey, walkerKey } from '../lib/manifest-build.mjs';

const vocab = [ { state: 'open', kind: 'class', token: '--open' }, { state: 'current', kind: 'class', token: '--current' }, { state: 'active', kind: 'class', token: '--active' }, { state: 'scrolled', kind: 'class', token: '--scrolled' }, { state: 'hover', kind: 'pseudo-class', token: ':hover' } ];
const target = { envFile: '.claude/secrets/x.env', envKey: 'X' };
const run = ( rows, records = [], extra = {} ) => buildManifest( { client: 'acme', site: 'x-test', rows, records, target, entryFile: 'Site.dc.html', vocab, ...extra } );
const row = ( postType, slug, id = 1, extra = {} ) => ( { postType, slug, title: slug, id, route: 'page' === postType ? slug : undefined, ...extra } );
const rec = ( id, kind, name, states = [ { name: 'default', state_keys: {} } ], extra = {} ) => ( { id, kind, name, states, ...extra } );

test( 'a mega menu and a page with one slug give distinct keys', () => {
	const { entries } = run( [ row( 'sgs_mega_menu', 'about', 2 ), row( 'page', 'about', 3 ) ] );
	assert.deepEqual( Object.keys( entries ).sort(), [ 'about', 'mega-about' ] );
	assert.equal( surfaceKey( row( 'sgs_drawer', 'drawer-main' ) ), 'drawer-main' );
	assert.equal( surfaceKey( row( 'sgs_header', 'header' ) ), 'header' );
} );

test( 'two same-kind records matching one row by name are unresolved, not picked', () => {
	const records = [ rec( 'S-1', 'menu', 'About' ), rec( 'S-2', 'menu', ' about ' ), rec( 'S-3', 'menu', 'Other' ) ];
	const m = matchRecord( row( 'sgs_mega_menu', 'x', 1, { title: 'About' } ), records );
	assert.equal( m.record, undefined );
	const out = run( [ row( 'sgs_mega_menu', 'x', 1, { title: 'About' } ) ], records );
	assert.deepEqual( out.entries[ 'mega-x' ].states, { resting: null } );
	assert.equal( out.unresolved[ 0 ].reason, 'states-unresolved' );
	const one = matchRecord( row( 'sgs_mega_menu', 'x', 1, { title: 'Other' } ), records );
	assert.equal( one.record.id, 'S-3' );
} );

test( 'a lone record of the kind matches whatever its name; a page matches by page_key', () => {
	assert.equal( matchRecord( row( 'sgs_header', 'header' ), [ rec( 'S-1', 'header', 'Sticky header' ) ] ).record.id, 'S-1' );
	const pages = [ rec( 'S-1', 'page', 'A', undefined, { page_key: 'a' } ), rec( 'S-2', 'page', 'B', undefined, { page_key: 'b' } ) ];
	assert.equal( matchRecord( row( 'page', 'b' ), pages ).record.id, 'S-2' );
} );

test( 'a CPT row is a canvas and a page is not', () => {
	const { entries } = run( [ row( 'sgs_drawer', 'menu', 5 ), row( 'page', 'home', 6 ) ] );
	assert.equal( entries[ 'drawer-menu' ].canvas, true );
	assert.equal( 'canvas' in entries.home, false );
} );

test( 'fixed fields: tree, target, walkers, draft, provides', () => {
	const { entries } = run( [ row( 'sgs_header', 'header', 9 ), row( 'sgs_form', 'enquiry', 8 ), row( 'sgs_footer', 'footer', 7 ), row( 'page', 'home', 6 ) ] );
	const h = entries.header;
	assert.equal( h.tree, 'header.tree.json' );
	assert.deepEqual( h.target, { postId: 9 } );
	assert.equal( h.walker, 'qa/parity/header.mjs' );
	assert.equal( h.walkerFull, 'qa/parity/header.full.mjs' );
	assert.equal( h.draftDir, 'sites/acme/handoff' );
	assert.equal( h.draftIndex, 'Site.dc.html' );
	assert.equal( h.envKey, 'X' );
	assert.equal( h.site, 'x-test' );
	assert.deepEqual( h.provides, [ 'core/template-part:header' ] );
	assert.deepEqual( entries.footer.provides, [ 'core/template-part:footer' ] );
	assert.deepEqual( entries[ 'form-enquiry' ].provides, [ 'sgs/form:enquiry' ] );
	assert.equal( 'provides' in entries.home, false );
	assert.equal( 'draftRecords' in h, false );
} );

test( 'a row with a null or missing id is skipped and listed', () => {
	const out = run( [ row( 'page', 'a', null ), { postType: 'page', slug: 'b', title: 'b', route: 'b' }, row( 'page', 'c', 3 ) ] );
	assert.deepEqual( Object.keys( out.entries ), [ 'c' ] );
	assert.equal( out.skipped.length, 2 );
} );

test( 'an existing entry keeps its hand-set fields and gains only missing ones', () => {
	const existing = { home: { tree: 'custom.json', states: { opening: null }, draftUrl: 'https://x.test/' } };
	const out = run( [ row( 'page', 'home', 6 ) ], [], { existing } );
	assert.equal( out.entries.home.tree, 'custom.json' );
	assert.deepEqual( out.entries.home.states, { opening: null } );
	assert.equal( out.entries.home.draftUrl, 'https://x.test/' );
	assert.equal( out.entries.home.walker, 'qa/parity/home.mjs' );
	assert.ok( out.added.home.includes( 'walker' ) );
	assert.equal( out.added.home.includes( 'tree' ), false );
} );

test( 'two rows giving one key is a hard error naming both', () => {
	assert.throws( () => run( [ row( 'sgs_mega_menu', 'mega-a', 1 ), row( 'sgs_mega_menu', 'a', 2 ) ] ), /sgs_mega_menu:mega-a and sgs_mega_menu:a both give the key mega-a/ );
} );

test( 'a trailing parenthesised qualifier is dropped from the walker key and maps to its setting state', () => {
	assert.equal( walkerKey( 'scrolled (> 8px)' ), 'scrolled' );
	assert.equal( walkerKey( 'compact (< 1024): hamburger' ), 'compact-1024-hamburger' );
	const records = [ rec( 'S-1', 'header', 'H', [ { name: 'scrolled (> 8px)', state_keys: {} } ] ) ];
	assert.deepEqual( run( [ row( 'sgs_header', 'header' ) ], records ).entries.header.states, { scrolled: 'scrolled' } );
} );

test( 'a state with no page-condition word maps to null, and its keys are never read', () => {
	const records = [ rec( 'S-1', 'header', 'H', [ { name: 'nav label magnet', state_keys: {} }, { name: 'drawer shown', state_keys: { mobileOpen: true, active: true } } ] ) ];
	assert.deepEqual( run( [ row( 'sgs_header', 'header' ) ], records ).entries.header.states, { 'nav-label-magnet': null, 'drawer-shown': null } );
} );

test( "'current section' maps to current", () => {
	const records = [ rec( 'S-1', 'header', 'H', [ { name: 'current section', state_keys: { 'item.current': true } } ] ) ];
	assert.deepEqual( run( [ row( 'sgs_header', 'header' ) ], records ).entries.header.states, { 'current-section': 'current' } );
} );

test( 'a mega menu open state keeps setting state null', () => {
	const records = [ rec( 'S-1', 'menu', 'M', [ { name: 'closed', state_keys: {} }, { name: 'open', state_keys: { active: true, open: true } } ] ) ];
	assert.deepEqual( run( [ row( 'sgs_mega_menu', 'm', 1, { title: 'M' } ) ], records ).entries[ 'mega-m' ].states, { open: null } );
} );

test( "'link hover' is dropped and listed as a pointer state", () => {
	const records = [ rec( 'S-1', 'menu', 'M', [ { name: 'open', state_keys: {} }, { name: 'link hover', state_keys: {} } ] ) ];
	const out = run( [ row( 'sgs_mega_menu', 'm', 1, { title: 'M' } ) ], records );
	assert.deepEqual( Object.keys( out.entries[ 'mega-m' ].states ), [ 'open' ] );
	assert.deepEqual( out.pointer, [ { key: 'mega-m', name: 'link hover' } ] );
} );

test( "a drawer's closed and closing states are dropped and listed; none open falls back to resting", () => {
	const records = [ rec( 'S-1', 'drawer', 'D', [ { name: 'closed', state_keys: {} }, { name: 'open', state_keys: {} }, { name: 'closing', state_keys: {} } ] ) ];
	const out = run( [ row( 'sgs_drawer', 'd' ) ], records );
	assert.deepEqual( out.entries[ 'drawer-d' ].states, { open: null } );
	assert.deepEqual( out.dropped.map( ( d ) => d.name ), [ 'closed', 'closing' ] );
	const none = run( [ row( 'sgs_drawer', 'd' ) ], [ rec( 'S-1', 'drawer', 'D', [ { name: 'closed', state_keys: {} } ] ) ] );
	assert.deepEqual( none.entries[ 'drawer-d' ].states, { resting: null } );
	assert.equal( none.unresolved.length, 0 );
} );

test( 'two states with one key keep the first', () => {
	const records = [ rec( 'S-1', 'header', 'H', [ { name: 'scrolled (a)', state_keys: {} }, { name: 'scrolled (b)', state_keys: {} } ] ) ];
	assert.deepEqual( run( [ row( 'sgs_header', 'header' ) ], records ).entries.header.states, { scrolled: 'scrolled' } );
} );

test( 'a record with no states and an unmatched row get resting and are listed', () => {
	const out = run( [ row( 'sgs_header', 'header' ), row( 'sgs_footer', 'footer' ) ], [ rec( 'S-1', 'header', 'H', [] ) ] );
	assert.deepEqual( out.entries.header.states, { resting: null } );
	assert.deepEqual( out.entries.footer.states, { resting: null } );
	assert.deepEqual( out.unresolved.map( ( u ) => u.key ), [ 'header', 'footer' ] );
} );

test( 'intake with different state names is listed and changes nothing', () => {
	const records = [ rec( 'S-1', 'header', 'H', [ { name: 'open', state_keys: {} }, { name: 'closed', state_keys: {} } ] ) ];
	const intake = { inventory: { surfaces: { records: [ rec( 'S-9', 'header', 'header', [ { name: 'open', state_keys: {} } ] ) ] } } };
	const withIntake = run( [ row( 'sgs_header', 'header' ) ], records, { intake } );
	assert.equal( withIntake.disagree.length, 1 );
	assert.deepEqual( withIntake.entries, run( [ row( 'sgs_header', 'header' ) ], records ).entries );
	const same = { inventory: { surfaces: { records: [ rec( 'S-9', 'header', 'header', [ { name: 'closed', state_keys: {} }, { name: 'open', state_keys: {} } ] ) ] } } };
	assert.equal( run( [ row( 'sgs_header', 'header' ) ], records, { intake: same } ).disagree.length, 0 );
} );

test( 'the command prints without --apply, writes with --apply and keeps a rerun stable', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'manifest-' ) );
	const site = path.join( repo, 'sites', 'acme' );
	fs.mkdirSync( path.join( site, 'build' ), { recursive: true } );
	fs.mkdirSync( path.join( site, 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( site, 'build', 'page-map.json' ), `${ JSON.stringify( [ row( 'page', 'home', 4 ) ], null, 2 ) }\n` );
	fs.writeFileSync( path.join( site, 'handoff', 'surfaces.json' ), JSON.stringify( { records: [ rec( 'S-1', 'page', 'Home', undefined, { page_key: 'home' } ) ] } ) );
	fs.writeFileSync( path.join( site, 'handoff', 'MANIFEST.json' ), JSON.stringify( { entry_drafts: [ 'Site.dc.html' ] } ) );
	const cmd = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'manifest.mjs' );
	const go = ( ...more ) => spawnSync( process.execPath, [ cmd, 'acme', '--site', 'indus-test', '--repo', repo, ...more ], { encoding: 'utf8' } );
	const out = path.join( site, 'build', 'surfaces.json' );
	const dry = go();
	assert.equal( dry.status, 0, dry.stdout + dry.stderr );
	assert.equal( fs.existsSync( out ), false );
	assert.equal( go( '--apply' ).status, 0 );
	const first = fs.readFileSync( out, 'utf8' );
	assert.equal( JSON.parse( first ).home.target.postId, 4 );
	assert.equal( go( '--apply' ).status, 0 );
	assert.equal( fs.readFileSync( out, 'utf8' ), first );
	assert.equal( spawnSync( process.execPath, [ cmd ], { encoding: 'utf8' } ).status, 2 );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'a form or post row is unmatched and the command still exits 0', () => {
	const out = run( [ row( 'sgs_form', 'enquiry', 8 ), row( 'post', 'news', 9 ) ], [ rec( 'S-1', 'form', 'Enquiry Form' ) ] );
	assert.deepEqual( out.entries[ 'form-enquiry' ].states, { resting: null } );
	assert.equal( out.unmatched.length, 2 );
	assert.equal( out.unresolved.length, 0 );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'manifest-' ) );
	const site = path.join( repo, 'sites', 'acme' );
	fs.mkdirSync( path.join( site, 'build' ), { recursive: true } );
	fs.mkdirSync( path.join( site, 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( site, 'build', 'page-map.json' ), `${ JSON.stringify( [ row( 'sgs_form', 'enquiry', 8 ) ], null, 2 ) }
` );
	fs.writeFileSync( path.join( site, 'handoff', 'surfaces.json' ), JSON.stringify( { records: [] } ) );
	fs.writeFileSync( path.join( site, 'handoff', 'MANIFEST.json' ), JSON.stringify( { entry_drafts: [ 'Site.dc.html' ] } ) );
	const cmd = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'manifest.mjs' );
	const r = spawnSync( process.execPath, [ cmd, 'acme', '--site', 'indus-test', '--repo', repo ], { encoding: 'utf8' } );
	assert.equal( r.status, 0, r.stdout + r.stderr );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

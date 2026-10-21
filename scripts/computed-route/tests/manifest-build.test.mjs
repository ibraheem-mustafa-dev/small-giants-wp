// The surfaces manifest builder (lib/manifest-build.mjs) and its command (manifest.mjs). No browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { buildManifest, matchRecord, statesOf, surfaceKey, walkerKey } from '../lib/manifest-build.mjs';

const vocab = [ { state: 'open', kind: 'class', token: '--open' }, { state: 'current', kind: 'class', token: '--current' }, { state: 'active', kind: 'class', token: '--active' }, { state: 'scrolled', kind: 'class', token: '--scrolled' }, { state: 'shrunk', kind: 'class', token: '--shrunk' }, { state: 'hover', kind: 'pseudo-class', token: ':hover' } ];
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
	assert.equal( h.tree, 'trees/sgs_header/header.json' );
	assert.deepEqual( h.target, { postId: 9 } );
	assert.equal( h.walker, 'qa/parity/header.fill-base.mjs' );
	assert.equal( h.walkerFull, 'qa/parity/header.fill.mjs' );
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
	assert.equal( out.entries.home.walker, 'qa/parity/home.fill-base.mjs' );
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
	const records = [ rec( 'S-1', 'header', 'H', [ { name: 'edge', state_keys: {} }, { name: 'edge (scrolled)', state_keys: {} } ] ) ];
	assert.deepEqual( run( [ row( 'sgs_header', 'header' ) ], records ).entries.header.states, { edge: null } );
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


test( 'focus and active are pointer words; shrunk is a page look; a look absent from the vocabulary gives null', () => {
	const records = [ rec( 'S-1', 'header', 'H', [ { name: 'field focus', state_keys: {} }, { name: 'pressed active', state_keys: {} }, { name: 'shrunk', state_keys: {} } ] ) ];
	const out = run( [ row( 'sgs_header', 'header' ) ], records );
	assert.deepEqual( out.entries.header.states, { shrunk: 'shrunk' } );
	assert.deepEqual( out.pointer.map( ( p ) => p.name ), [ 'field focus', 'pressed active' ] );
	const bare = run( [ row( 'sgs_header', 'header' ) ], records, { vocab: vocab.filter( ( v ) => 'shrunk' !== v.state ) } );
	assert.deepEqual( bare.entries.header.states, { shrunk: null } );
} );

test( 'an accordion keeps its expanded states only; a state whose key slugs to nothing is listed as dropped', () => {
	const acc = statesOf( rec( 'S-1', 'accordion', 'A', [ { name: 'collapsed' }, { name: 'expanded' } ] ), vocab );
	assert.deepEqual( acc.states, { expanded: null } );
	assert.deepEqual( acc.dropped, [ 'collapsed' ] );
	const empty = statesOf( rec( 'S-1', 'header', 'H', [ { name: '---' }, { name: 'scrolled' } ] ), vocab );
	assert.deepEqual( empty.dropped, [ '---' ] );
	assert.deepEqual( empty.states, { scrolled: 'scrolled' } );
} );

test( 'prototype-named slugs and states are plain data, not duplicates or existing entries', () => {
	const records = [ rec( 'S-1', 'header', 'H', [ { name: 'constructor' }, { name: 'toString' } ] ) ];
	const out = run( [ row( 'page', 'constructor', 1 ), row( 'page', 'valueof', 2 ), row( 'sgs_header', 'header', 3 ) ], records );
	assert.deepEqual( Object.keys( out.entries ), [ 'constructor', 'valueof', 'header' ] );
	assert.deepEqual( out.added, {} );
	assert.deepEqual( Object.keys( out.entries.header.states ), [ 'constructor', 'tostring' ] );
} );

test( 'a slug that is empty, missing, a path or upper case is a named error', () => {
	for ( const slug of [ '', undefined, '../x', 'Up', 'a/b', '-x' ] ) {
		assert.throws( () => run( [ { postType: 'page', slug, id: 1 } ] ), /page-map row page:.* has no usable slug/, String( slug ) );
	}
	assert.doesNotThrow( () => run( [ row( 'page', 'ok-1', 1 ) ] ) );
	assert.doesNotThrow( () => run( [ { postType: 'page', slug: '', id: null } ] ) );
} );

test( 'a key whose existing entry has states lists none of the generated states and is not counted', () => {
	const records = [ rec( 'S-1', 'menu', 'M', [ { name: 'link hover' }, { name: 'closed' } ] ), rec( 'S-2', 'menu', 'N', [ { name: 'open' } ] ) ];
	const rows = [ row( 'sgs_mega_menu', 'm', 1, { title: 'M' } ), row( 'sgs_mega_menu', 'z', 2, { title: 'Z' } ) ];
	const free = run( rows, records );
	assert.ok( free.pointer.length && free.dropped.length && free.unresolved.length );
	const held = run( rows, records, { existing: { 'mega-m': { states: { open: null } }, 'mega-z': { states: { open: null } } } } );
	assert.deepEqual( [ held.pointer, held.dropped, held.unresolved, held.disagree ], [ [], [], [], [] ] );
	assert.deepEqual( held.entries[ 'mega-m' ].states, { open: null } );
} );

test( 'an existing surfaces.json that is not an object of entries is a named error', () => {
	for ( const existing of [ [], null, 'x', { a: 1 }, { a: [] } ] ) {
		assert.throws( () => run( [ row( 'page', 'a', 1 ) ], [], { existing } ), /existing surfaces\.json is not an object of entry objects/ );
	}
} );

// A temp repo for the command: sites/acme with a page map, handoff surfaces and MANIFEST.json. `go` runs manifest.mjs.
const CMD = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'manifest.mjs' );
function fixture( { rows = [ row( 'page', 'home', 4 ) ], records = [ rec( 'S-1', 'page', 'Home', undefined, { page_key: 'home' } ) ], drafts = [ 'Site.dc.html' ], manifest = true, pageMapText = null } = {} ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'manifest-' ) );
	const site = path.join( repo, 'sites', 'acme' );
	fs.mkdirSync( path.join( site, 'build' ), { recursive: true } );
	fs.mkdirSync( path.join( site, 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( site, 'build', 'page-map.json' ), pageMapText ?? `${ JSON.stringify( rows, null, 2 ) }\n` );
	fs.writeFileSync( path.join( site, 'handoff', 'surfaces.json' ), JSON.stringify( { records } ) );
	manifest && fs.writeFileSync( path.join( site, 'handoff', 'MANIFEST.json' ), JSON.stringify( { entry_drafts: drafts } ) );
	const go = ( ...more ) => spawnSync( process.execPath, [ CMD, 'acme', '--site', 'indus-test', '--repo', repo, ...more ], { encoding: 'utf8' } );
	const tree = () => fs.readdirSync( repo, { recursive: true } ).sort();
	return { repo, site, out: path.join( site, 'build', 'surfaces.json' ), go, tree, done: () => fs.rmSync( repo, { recursive: true, force: true } ) };
}
const said = ( r ) => `${ r.stdout }${ r.stderr }`;

test( 'the command prints without --apply, writes with --apply, keeps a rerun stable and leaves nothing else behind', () => {
	const f = fixture();
	const before = f.tree();
	assert.equal( f.go().status, 0 );
	assert.deepEqual( f.tree(), before, 'a dry run writes nothing' );
	assert.equal( f.go( '--apply' ).status, 0 );
	const first = fs.readFileSync( f.out, 'utf8' );
	assert.equal( JSON.parse( first ).home.target.postId, 4 );
	assert.deepEqual( f.tree(), [ ...before, path.join( 'sites', 'acme', 'build', 'surfaces.json' ) ].sort(), 'no .tmp or other file' );
	assert.equal( f.go( '--apply' ).status, 0 );
	assert.equal( fs.readFileSync( f.out, 'utf8' ), first );
	f.done();
} );

test( 'exit 1 on an unresolved page, header or mega row; --apply still writes; a matched row exits 0', () => {
	for ( const [ r, kind ] of [ [ row( 'page', 'home', 4 ), 'page' ], [ row( 'sgs_header', 'header', 4 ), 'header' ], [ row( 'sgs_mega_menu', 'm', 4 ), 'menu' ] ] ) {
		const bad = fixture( { rows: [ r ], records: [] } );
		const got = bad.go( '--apply' );
		assert.equal( got.status, 1, kind + said( got ) );
		assert.equal( fs.existsSync( bad.out ), true, `${ kind }: entries are still written` );
		bad.done();
		const good = fixture( { rows: [ r ], records: [ rec( 'S-1', kind, r.title, undefined, { page_key: 'home' } ) ] } );
		assert.equal( good.go().status, 0, kind );
		good.done();
	}
} );

test( 'a hand-set field survives a rerun through the command', () => {
	const f = fixture();
	f.go( '--apply' );
	const kept = JSON.parse( fs.readFileSync( f.out, 'utf8' ) );
	kept.home.tree = 'hand.tree.json';
	kept.other = { tree: 'other.tree.json' };
	fs.writeFileSync( f.out, JSON.stringify( kept ) );
	assert.equal( f.go( '--apply' ).status, 0 );
	const after = JSON.parse( fs.readFileSync( f.out, 'utf8' ) );
	assert.equal( after.home.tree, 'hand.tree.json' );
	assert.equal( after.other.tree, 'other.tree.json', 'an entry outside the page map is kept' );
	assert.equal( after.home.walker, 'qa/parity/home.fill-base.mjs' );
	f.done();
} );

test( 'the command refuses an input it cannot use with exit 2 and writes nothing', () => {
	const cases = {
		'no MANIFEST.json': { manifest: false },
		'no entry file': { drafts: [] },
		'a malformed page-map.json': { pageMapText: '{ not json' },
	};
	for ( const [ why, opts ] of Object.entries( cases ) ) {
		const f = fixture( opts );
		const got = f.go( '--apply' );
		assert.equal( got.status, 2, why + said( got ) );
		assert.equal( fs.existsSync( f.out ), false, why );
		f.done();
	}
	const ok = fixture();
	assert.equal( ok.go().status, 0, 'control' );
	const unknown = spawnSync( process.execPath, [ CMD, 'acme', '--site', 'no-such-site', '--repo', ok.repo ], { encoding: 'utf8' } );
	assert.equal( unknown.status, 2 );
	assert.match( unknown.stderr, /no envFile and envKey for no-such-site/ );
	ok.done();
} );

test( 'an empty states table stops the command; a populated one lets it run', () => {
	const f = fixture();
	const db = path.join( f.repo, 'vocab.db' );
	const make = ( withRow ) => {
		fs.rmSync( db, { force: true } );
		const w = new DatabaseSync( db );
		w.exec( 'CREATE TABLE states (id INTEGER PRIMARY KEY, state TEXT, family TEXT, kind TEXT, token TEXT, reach TEXT, call TEXT, note TEXT)' );
		withRow && w.exec( "INSERT INTO states (state, kind, token) VALUES ('open', 'class', '--open')" );
		w.close();
	};
	const withDb = () => spawnSync( process.execPath, [ CMD, 'acme', '--site', 'indus-test', '--repo', f.repo, '--db', db ], { encoding: 'utf8' } );
	make( false );
	const empty = withDb();
	assert.equal( empty.status, 2, said( empty ) );
	assert.match( empty.stderr, /states table of the framework DB has no rows/ );
	make( true );
	const full = withDb();
	assert.equal( full.status, 0, said( full ) );
	f.done();
} );

test( 'argument errors are usage errors that name the problem', () => {
	const f = fixture();
	const run2 = ( ...a ) => spawnSync( process.execPath, [ CMD, ...a ], { encoding: 'utf8' } );
	let got = run2( 'acme', '--site', '--apply', '--repo', f.repo );
	assert.equal( got.status, 2 );
	assert.match( got.stderr, /--site needs a value/ );
	got = run2( 'acme', 'extra', '--site', 'indus-test', '--repo', f.repo );
	assert.equal( got.status, 2 );
	assert.match( got.stderr, /unexpected argument "extra"/ );
	got = run2( 'acme', '--site', 'indus-test', '--bogus' );
	assert.match( got.stderr, /unknown option --bogus/ );
	assert.equal( run2( '--site', 'indus-test' ).status, 2 );
	assert.equal( run2( 'acme', '--site', 'indus-test', '--repo', f.repo ).status, 0, 'control' );
	f.done();
} );

test( 'a form or post row is unmatched and the command still exits 0', () => {
	const out = run( [ row( 'sgs_form', 'enquiry', 8 ), row( 'post', 'news', 9 ) ], [ rec( 'S-1', 'form', 'Enquiry Form' ) ] );
	assert.deepEqual( out.entries[ 'form-enquiry' ].states, { resting: null } );
	assert.equal( out.unmatched.length, 2 );
	assert.equal( out.unresolved.length, 0 );
	const f = fixture( { rows: [ row( 'sgs_form', 'enquiry', 8 ) ], records: [] } );
	const got = f.go();
	assert.equal( got.status, 0, said( got ) );
	f.done();
} );

test( '--only limits the run to the named keys; an unknown key is a usage error naming the valid ones', () => {
	const rows = [ row( 'page', 'a', 1 ), row( 'page', 'b', 2 ), row( 'sgs_mega_menu', 'a', 3 ) ];
	assert.deepEqual( Object.keys( run( rows, [], { only: [ 'mega-a', 'b' ] } ).entries ), [ 'b', 'mega-a' ] );
	assert.throws( () => run( [ row( 'page', 'a', 1 ), row( 'page', 'a', 2 ) ], [], { only: [ 'zzz' ] } ), /both give the key a/ );
	const f = fixture( { rows } );
	f.go( '--apply', '--only', 'a' );
	const written = JSON.parse( fs.readFileSync( f.out, 'utf8' ) );
	assert.deepEqual( Object.keys( written ), [ 'a' ] );
	const bad = f.go( '--only', 'nope,a' );
	assert.equal( bad.status, 2 );
	assert.match( bad.stderr, /--only names nope, which no page-map row with an id generates; valid keys: a, b, mega-a/ );
	f.go( '--apply' );
	const all = JSON.parse( fs.readFileSync( f.out, 'utf8' ) );
	all.b.tree = 'hand.json';
	fs.writeFileSync( f.out, JSON.stringify( all ) );
	f.go( '--apply', '--only', 'a' );
	assert.equal( JSON.parse( fs.readFileSync( f.out, 'utf8' ) ).b.tree, 'hand.json', 'an entry outside the slice is untouched' );
	f.done();
} );

test( 'a key in surfaces.json but not in the page map is printed as stale and kept, with no exit effect', () => {
	const out = run( [ row( 'page', 'a', 1 ) ], [], { existing: { gone: { tree: 'x' }, a: {} } } );
	assert.deepEqual( out.stale, [ 'gone' ] );
	const f = fixture();
	f.go( '--apply' );
	const kept = JSON.parse( fs.readFileSync( f.out, 'utf8' ) );
	kept.gone = { tree: 'gone.tree.json' };
	fs.writeFileSync( f.out, JSON.stringify( kept ) );
	const got = f.go( '--apply' );
	assert.equal( got.status, 0 );
	assert.match( got.stdout, /^stale gone: /m );
	assert.equal( JSON.parse( fs.readFileSync( f.out, 'utf8' ) ).gone.tree, 'gone.tree.json' );
	f.done();
} );

test( 'a hand-set draftUrl wins: draftDir and draftIndex are not added beside it', () => {
	const kept = run( [ row( 'page', 'a', 1 ) ], [], { existing: { a: { draftUrl: 'https://x.test/' } } } );
	assert.equal( 'draftDir' in kept.entries.a, false );
	assert.equal( 'draftIndex' in kept.entries.a, false );
	assert.equal( kept.entries.a.draftUrl, 'https://x.test/' );
	assert.equal( run( [ row( 'page', 'a', 1 ) ], [], { existing: { a: {} } } ).entries.a.draftDir, 'sites/acme/handoff' );
} );

test( 'intakeSurface is the slug of the intake skeleton with the matched record id, never by position; a hand-set value is kept', () => {
	const records = [ rec( 'S-3', 'header', 'Sticky header' ) ];
	const intake = { skeletons: { 'top-bar': { id: 'S-1' }, 'sticky-header': { id: 'S-3' }, footer: { id: 'S-14' } } };
	assert.equal( run( [ row( 'sgs_header', 'header', 9 ) ], records, { intake } ).entries.header.intakeSurface, 'sticky-header' );
	const swapped = { skeletons: { footer: { id: 'S-14' }, 'sticky-header': { id: 'S-3' } } };
	assert.equal( run( [ row( 'sgs_header', 'header', 9 ) ], records, { intake: swapped } ).entries.header.intakeSurface, 'sticky-header' );
	const kept = run( [ row( 'sgs_header', 'header', 9 ) ], records, { intake, existing: { header: { intakeSurface: 'hand-set' } } } );
	assert.equal( kept.entries.header.intakeSurface, 'hand-set' );
	assert.equal( kept.noIntake.length, 0 );
} );

test( 'an entry whose record has no intake skeleton gets no intakeSurface and is listed', () => {
	const records = [ rec( 'S-3', 'header', 'Sticky header' ) ];
	const out = run( [ row( 'sgs_header', 'header', 9 ) ], records, { intake: { skeletons: { footer: { id: 'S-14' } } } } );
	assert.equal( 'intakeSurface' in out.entries.header, false );
	assert.equal( out.noIntake.length, 1 );
	assert.equal( out.noIntake[ 0 ].key, 'header' );
	assert.equal( run( [ row( 'sgs_header', 'header', 9 ) ], records ).noIntake.length, 1, 'no intake file at all is listed too' );
	const twice = run( [ row( 'sgs_header', 'header', 9 ) ], records, { intake: { skeletons: { a: { id: 'S-3' }, b: { id: 'S-3' } } } } );
	assert.equal( 'intakeSurface' in twice.entries.header, false, 'two intake skeletons with one id are not picked between' );
	assert.equal( twice.noIntake.length, 1 );
} );

test( 'the generated tree path is trees/<postType>/<slug>.json, the path site-build-map reads; a hand-set tree is kept', () => {
	const out = run( [ row( 'sgs_mega_menu', 'about', 2 ), row( 'page', 'home', 3 ) ], [], { existing: { home: { tree: 'hand.json' } } } );
	assert.equal( out.entries[ 'mega-about' ].tree, 'trees/sgs_mega_menu/about.json' );
	assert.equal( out.entries.home.tree, 'hand.json' );
} );

// Eye Care's mega menu (S-04): each panel is a state that sets `mega`, with no word `open` in its name.
const MEGA = [ { name: 'closed', state_keys: { mega: null } }, { name: 'Sunglasses', state_keys: { mega: 'sun' } }, { name: 'Brands', state_keys: { mega: 'brands' } }, { name: 'Lenses', state_keys: { mega: 'lenses' } }, { name: 'Help', state_keys: { mega: 'help' } } ];

test( 'MUST FAIL (FR-48-6): an openable surface keeps each state that sets a real state key to a set value', () => {
	const got = statesOf( rec( 'S-4', 'menu', 'Mega menu', MEGA ), vocab );
	assert.deepEqual( Object.keys( got.states ), [ 'sunglasses', 'brands', 'lenses', 'help' ] );
	assert.deepEqual( got.dropped, [ 'closed' ], 'a null value is the closed state' );
} );

test( 'MUST FAIL (FR-48-6): derived and instance keys do not make a state; an unset value does not either', () => {
	const states = [
		{ name: 'wide', state_keys: { 'R.wide': true } },
		{ name: 'row item', state_keys: { 'item.current': true } },
		{ name: 'closing', state_keys: { _closing: true } },
		{ name: 'gift note shown', state_keys: { 'gift.on': true } },
		{ name: 'empty list', state_keys: { faq: {} } },
		{ name: 'text empty', state_keys: { acc: '{}' } },
		{ name: 'none picked', state_keys: { faq: -1 } },
		{ name: 'off', state_keys: { sumOpen: false } },
		{ name: 'real', state_keys: { 'R.wide': true, nav: true } },
	];
	const got = statesOf( rec( 'S-2', 'drawer', 'D', states ), vocab );
	assert.deepEqual( Object.keys( got.states ), [ 'real' ] );
	const ownR = statesOf( rec( 'S-2', 'drawer', 'D', [ { name: 'responsive', state_keys: { R: 1 } }, { name: 'wide', state_keys: { 'R.wide': true } }, { name: 'rows', state_keys: { item: 1 } }, { name: 'row current', state_keys: { 'item.current': true } } ] ), vocab );
	assert.deepEqual( ownR.dropped, [ 'responsive', 'wide', 'rows', 'row current' ], 'R.* and item.* are derived even when the record also holds a bare R or item' );
	const owned = statesOf( rec( 'S-2', 'drawer', 'D', [ { name: 'gift', state_keys: { gift: 1 } }, { name: 'gift note shown', state_keys: { 'gift.on': true } } ] ), vocab );
	assert.deepEqual( Object.keys( owned.states ), [ 'gift', 'gift-note-shown' ], 'a dotted path under a state key the record owns is real' );
	assert.deepEqual( got.dropped, [ 'wide', 'row item', 'closing', 'gift note shown', 'empty list', 'text empty', 'none picked', 'off' ] );
} );

test( 'a pointer word is matched before the state keys, and a state named open stays whatever its keys', () => {
	const got = statesOf( rec( 'S-2', 'menu', 'M', [ { name: 'link hover', state_keys: { active: 1 } }, { name: 'open', state_keys: {} }, { name: 'open, empty', state_keys: { basket: true } } ] ), vocab );
	assert.deepEqual( got.pointer, [ 'link hover' ] );
	assert.deepEqual( Object.keys( got.states ), [ 'open', 'open-empty' ] );
} );

test( 'a header (not openable) keeps every non-pointer state whatever its keys', () => {
	const got = statesOf( rec( 'S-1', 'header', 'H', [ { name: 'scrolled', state_keys: { scrolled: true } }, { name: 'plain', state_keys: { _x: 1 } } ] ), vocab );
	assert.deepEqual( Object.keys( got.states ), [ 'scrolled', 'plain' ] );
} );

test( 'MUST FAIL (FR-48-6): a page whose route is a draft file matches the record whose page_key is the file base name', () => {
	const pages = [ rec( 'S-1', 'page', 'Home', undefined, { page_key: 'Home' } ), rec( 'S-2', 'page', 'Shop', undefined, { page_key: 'Shop' } ) ];
	assert.equal( matchRecord( row( 'page', 'home', 1, { route: 'Home.dc.html' } ), pages ).record.id, 'S-1' );
	assert.equal( matchRecord( row( 'page', 'shop', 1, { route: 'Shop.dc.html?tab=2#top' } ), pages ).record.id, 'S-2', 'the query string and fragment are ignored' );
	assert.equal( matchRecord( row( 'page', 'x', 1, { route: 'Basket.dc.html' } ), pages ).record, undefined );
	assert.equal( matchRecord( row( 'page', 'home', 1, { route: 'Home' } ), pages ).record.id, 'S-1', 'the control: a route that is the key itself still matches' );
} );

test( 'MUST FAIL (FR-48-6): several entry drafts: a surface takes the draft whose base name is its record dc, else the first', () => {
	const records = [ rec( 'S-1', 'page', 'Shop', undefined, { page_key: 'Shop', dc: 'Shop' } ), rec( 'S-2', 'header', 'H', undefined, { dc: 'SiteHeader' } ) ];
	const out = run( [ row( 'page', 'shop', 1, { route: 'Shop.dc.html' } ), row( 'sgs_header', 'header', 2 ) ], records, { entryFile: undefined, entryFiles: [ 'Home.dc.html', 'Shop.dc.html' ] } );
	assert.equal( out.entries.shop.draftIndex, 'Shop.dc.html' );
	assert.equal( out.entries.header.draftIndex, 'Home.dc.html' );
} );

test( 'the command accepts several entry drafts', () => {
	const f = fixture( { drafts: [ 'Home.dc.html', 'Shop.dc.html' ], rows: [ row( 'page', 'shop', 4, { route: 'Shop.dc.html' } ) ], records: [ rec( 'S-1', 'page', 'Shop', undefined, { page_key: 'Shop', dc: 'Shop' } ) ] } );
	assert.equal( f.go( '--apply' ).status, 0 );
	assert.equal( JSON.parse( fs.readFileSync( f.out, 'utf8' ) ).shop.draftIndex, 'Shop.dc.html' );
	f.done();
} );

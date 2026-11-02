// Spec 48 FR-48-17 / FR-48-35: the intake command (intake.mjs, lib/intake-run*.mjs) end to end on the fixture export
// tests/fixtures/intake-command/export (a hash-routed draft with a header, a drawer that renders only when its state
// opens, a looped card list with lorem copy, a footer with a phone, email and address, tokens, and a README holding two
// planted command lines), copied into a repository root in the OS temp folder so nothing is written into the real
// sites/. The first run records the replay file (it needs the network once; the file is cached in the OS temp folder).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { staticCensus } from '../lib/intake-census.mjs';
import { surfaceRoots, proposeSkeletons } from '../lib/intake-skeletons.mjs';
import { parseReview, isoDay, reviewRows, renderReview } from '../lib/intake-review.mjs';
import { recordProblems, parseArgs } from '../lib/intake-run.mjs';
import { collapseSkeletonRows, collapseSkeletons, collapseFlags, collapseMissing, paletteUsage, templateOf } from '../lib/intake-run-collapse.mjs';
import { pageMapProblems } from '../lib/intake-pagemap.mjs';
import { factsProblems } from '../lib/fact-record.mjs';
import { defectReviewRows } from '../lib/intake-run-defects.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-command', 'export' );
const INTAKE = path.join( HERE, '..', 'intake.mjs' );
const CACHE = path.join( os.tmpdir(), 'sgs-intake-command-replay' );
const REPO = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-intake-command-' ) );
const CLIENT = 'fx';

const sha = ( b ) => crypto.createHash( 'sha256' ).update( b ).digest( 'hex' );
const walk = ( d, rel = '' ) => fs.readdirSync( d, { withFileTypes: true } ).flatMap( ( e ) => ( e.isDirectory() ? walk( path.join( d, e.name ), `${ rel }${ e.name }/` ) : [ `${ rel }${ e.name }` ] ) );
// Rewrites MANIFEST.json for the folder's current bytes (the export's own format); `version` overrides schema_version.
function writeManifest( folder, version = '1.0' ) {
	const files = walk( folder ).filter( ( f ) => 'MANIFEST.json' !== f ).sort();
	const m = { schema_version: version, generated: '2026-10-12', project: 'Intake command fixture', entry_drafts: [ 'Home.dc.html' ], runtime_sha256: sha( fs.readFileSync( path.join( folder, 'support.js' ) ) ),
		files: files.map( ( f ) => {
			const b = fs.readFileSync( path.join( folder, f ) );
			return { path: f, bytes: b.length, sha256: sha( b ) };
		} ) };
	fs.writeFileSync( path.join( folder, 'MANIFEST.json' ), `${ JSON.stringify( m, null, 2 ) }\n` );
	return '1.0' === version ? recheckManifest( folder ).manifestHash : null;
}
const handoff = ( client ) => path.join( REPO, 'sites', client, 'handoff' );
const at = ( client, ...p ) => path.join( REPO, 'sites', client, 'build', ...p );
function makeClient( client ) {
	fs.mkdirSync( handoff( client ), { recursive: true } );
	fs.cpSync( FIXTURE, handoff( client ), { recursive: true } );
	return recheckManifest( handoff( client ) ).manifestHash;
}
// The replay file is the same for every copy of the fixture (pinned runtime scripts only), so a cached one is placed
// under each manifest hash.
const placeHar = ( client, hash ) => {
	const target = at( client, 'intake', 'replay', `${ hash }.har` );
	fs.mkdirSync( path.dirname( target ), { recursive: true } );
	fs.copyFileSync( path.join( CACHE, 'fixture.har' ), target );
};
const run = ( ...args ) => {
	const r = spawnSync( process.execPath, [ INTAKE, ...args, '--repo', REPO ], { encoding: 'utf8', timeout: 900000 } );
	return { code: r.status, out: `${ r.stdout }${ r.stderr }` };
};
const read = ( client, ...p ) => JSON.parse( fs.readFileSync( at( client, ...p ), 'utf8' ) );
const bytes = ( client, ...p ) => fs.readFileSync( at( client, ...p ), 'utf8' );
// review.md with "Accept all" ticked in every section except `except`, and Mark cells set from `marks`.
function marked( md, { except = [], marks = {} } = {} ) {
	let section = null;
	return md.split( '\n' ).map( ( l ) => {
		const h = /^## .*\(([a-z-]+)\)$/.exec( l );
		if ( h ) {
			section = h[ 1 ];
		}
		if ( /^Accept all: \[ \]$/.test( l ) && ! except.includes( section ) ) {
			return 'Accept all: [x]';
		}
		const id = /^\| `([^`]+)` \|/.exec( l )?.[ 1 ];
		return id && id in marks ? l.replace( /\|\s*[^|]*\|$/, `| ${ marks[ id ] } |` ) : l;
	} ).join( '\n' );
}

let first;

test.before( () => {
	const hash = makeClient( CLIENT );
	if ( fs.existsSync( path.join( CACHE, 'fixture.har' ) ) ) {
		placeHar( CLIENT, hash );
		first = run( CLIENT );
	} else {
		first = run( CLIENT, '--record' );
		fs.mkdirSync( CACHE, { recursive: true } );
		0 === first.code && fs.copyFileSync( at( CLIENT, 'intake', 'replay', `${ hash }.har` ), path.join( CACHE, 'fixture.har' ) );
	}
} );

test.after( () => fs.rmSync( REPO, { recursive: true, force: true } ) );

test( 'a full run writes a schema-valid intake.json, review.md and page-map.json, with timings per stage', () => {
	assert.equal( first.code, 0, first.out );
	const intake = read( CLIENT, 'intake', 'intake.json' );
	assert.deepEqual( recordProblems( intake ), [] );
	assert.deepEqual( pageMapProblems( read( CLIENT, 'page-map.json' ) ), [] );
	assert.deepEqual( read( CLIENT, 'page-map.json' ), intake.pageMap );
	assert.deepEqual( parseReview( bytes( CLIENT, 'intake', 'review.md' ) ).problems, [] );
	assert.equal( intake.routing.adapter, 'hash' );
	assert.ok( intake.census.length > 20 && intake.census.every( ( r ) => r.reader || r.gap ) );
	assert.match( intake.tools.browser, /^chromium \d/ );
	assert.equal( intake.harness.clock, '2026-01-05T10:00:00.000Z' );
	for ( const s of [ 'replay', 'census', 'page map', 'tokens and palette', 'site info', 'flags', 'draft defects', 'skeletons', 'facts', 'missing features', 'notices' ] ) {
		assert.match( first.out, new RegExp( `\\[intake\\] ${ s }: done in \\d+\\.\\ds` ), `no timing line for ${ s }` );
	}
	// FR-48-7: the facts stage writes a schema-valid fact record whose instance keys come from the skeleton inventories.
	const facts = read( CLIENT, 'intake', 'facts.json' );
	assert.deepEqual( factsProblems( facts ), [] );
	assert.ok( facts.counts.elements > 10 && facts.counts.instances > 0 && facts.counts.perWidth[ 375 ].resolved > 0, JSON.stringify( facts.counts ) );
	assert.equal( facts.counts.perWidth[ 375 ].unresolved, 0 );
	assert.match( first.out, /proxy attempts 0$/m, 'no live network' );
	assert.ok( intake.siteInfo.rows.some( ( r ) => 'phone' === r.key ) && intake.palette.unused.length >= 1 );
} );

test( 'MUST FAIL: the drawer renders only when its state opens; the skeleton opens it through its surfaces.json state keys', async () => {
	const intake = read( CLIENT, 'intake', 'intake.json' );
	const drawer = intake.skeletons[ 'mobile-drawer' ];
	assert.equal( drawer.gap, undefined );
	assert.equal( drawer.opened.via, 'state' );
	assert.deepEqual( drawer.opened.keys, { drawerOpen: true } );
	assert.deepEqual( drawer.opened.at, [ 375, 768 ], 'the drawer renders below 1024 only' );
	assert.deepEqual( drawer.opened.readAt, { 1440: 768 } );
	assert.ok( drawer.rows.some( ( r ) => 'aside' === r.tag ) );
	const folder = handoff( CLIENT );
	const harPath = at( CLIENT, 'intake', 'replay', `${ recheckManifest( folder ).manifestHash }.har` );
	const census = await staticCensus( { folder, entry: 'Home.dc.html', harPath } );
	const drawerOnly = surfaceRoots( { folder, census } ).surfaces.filter( ( s ) => 'mobile-drawer' === s.slug );
	const off = await proposeSkeletons( { folder, harPath, surfaces: drawerOnly, client: CLIENT, census, openStates: false } );
	assert.equal( off.gaps.length, 1, 'without the opener the drawer is a gap row' );
	assert.match( off.gaps[ 0 ].error, /<aside> Home:8 is not rendered/ );
	const viaTrigger = await proposeSkeletons( { folder, harPath, surfaces: drawerOnly.map( ( s ) => ( { ...s, states: [] } ) ), client: CLIENT, census } );
	assert.equal( viaTrigger.skeletons[ 0 ].opened.via, 'trigger', 'with no state keys, the trigger opened_by names is fired' );
	assert.equal( viaTrigger.skeletons[ 0 ].opened.draftId, 'Home:6' );
	const none = await proposeSkeletons( { folder, harPath, surfaces: drawerOnly.map( ( s ) => ( { ...s, states: [], openedBy: null } ) ), client: CLIENT, census } );
	assert.match( none.gaps[ 0 ].error, /no opener/, 'a surface nothing opens is a gap row naming what was tried' );
} );

test( 'MUST FAIL: loop copies collapse to one skeleton row and repeated flags to one row, every original key kept', () => {
	const intake = read( CLIENT, 'intake', 'intake.json' );
	const cards = intake.skeletons[ 'page-home' ].rows.find( ( r ) => 'Home/18' === r.key );
	assert.equal( cards.copies, 3 );
	assert.deepEqual( cards.keys, [ 'Home/18#0', 'Home/18#1', 'Home/18#2' ] );
	assert.match( first.out, /collapsed: skeleton rows (\d+) -> (\d+) within surfaces -> (\d+) across surfaces, flag rows 3 -> 1/ );
	const main = intake.skeletons[ 'page-home' ].rows.find( ( r ) => 'Home:11' === r.draftId );
	assert.deepEqual( main.alsoIn, [ { surface: 'page-about', keys: [ 'Home/11#0' ] } ], 'the <main> both page surfaces read is one row' );
	assert.equal( intake.skeletons[ 'page-about' ].rows.some( ( r ) => 'Home:11' === r.draftId ), false );
	const across = collapseSkeletons( [ { surface: 'a', rows: [ { key: 'Home/3#0', block: 'sgs/text' } ] }, { surface: 'b', rows: [ { key: 'Home/3#0', block: 'sgs/text' }, { key: 'Home/3#1', block: 'sgs/text' } ] }, { surface: 'c', rows: [ { key: 'Home/3#0', block: 'sgs/heading' } ] } ] );
	assert.deepEqual( [ across.before, across.withinSurfaces, across.after ], [ 4, 3, 2 ] );
	assert.equal( across.skeletons.a.rows[ 0 ].copies, 3 );
	assert.deepEqual( across.skeletons.b.rowsIn, [ 'a' ] );
	assert.equal( across.skeletons.c.rows[ 0 ].block, 'sgs/heading', 'another block for the same element stays its own row' );
	assert.equal( collapseMissing( [ { rowId: 'missing:X:1', draftId: 'X:1', construct: 'element <span>' }, { rowId: 'missing:X:1~2', draftId: 'X:1', construct: 'element <span>' } ] ).rows[ 0 ].count, 2 );
	const lorem = intake.flags.find( ( f ) => /Lorem/.test( f.text ) );
	assert.equal( lorem.count, 3 );
	assert.equal( lorem.rowIds.length, 3 );
	const rows = [ 0, 1, 2 ].map( ( i ) => ( { key: `Home>Card@4#${ i }/2#0`, block: 'sgs/heading', words: `Card ${ i }` } ) );
	assert.equal( collapseSkeletonRows( 's', rows ).length, 1 );
	assert.equal( collapseSkeletonRows( 's', [ ...rows, { key: 'Home>Card@4#3/2#0', block: 'sgs/text' } ] ).length, 2, 'copies sent to different blocks stay apart' );
	assert.deepEqual( templateOf( 'Home>Card@4#2/2#1' ), { key: 'Home>Card@4/2', component: 'Card', draftId: 'Card:2' } );
	assert.equal( collapseFlags( [ { rowId: 'a', kind: 'stock', url: 'u' }, { rowId: 'b', kind: 'placeholder', url: 'u' } ] ).rows.length, 2, 'another kind never merges' );
	const usage = paletteUsage( [ { draftId: 'Home/3#0', path: '#dc-root > div:nth-child(1) > a:nth-child(2)', computed: { color: 'rgb(204, 51, 51)', 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-color': 'rgb(0, 0, 0)', 'border-top-width': '0px' } } ] );
	assert.deepEqual( usage, [ { hex: '#CC3333', property: 'color', draftId: 'Home:3', count: 1, tag: 'a' } ] );
} );

test( 'draft defects are one review row per group, every member row kept inside', () => {
	const rows = [ 'Home:3', 'Home:4', 'Home:9' ].map( ( d, i ) => ( { rowId: `defect:${ d }`, draftId: d, component: 'Home', test: 'unreached', kind: i ? 'sc-if' : 'handler', evidence: {}, widths: [ 375, 768, 1440 ] } ) );
	const groups = [ { groupId: 'defect-group:Home:openMenu', component: 'Home', member: 'openMenu', rowIds: [ 'defect:Home:3', 'defect:Home:4' ], kinds: [ 'handler', 'sc-if' ], evidence: { tests: [ 'unreached' ], draftIds: [ 'Home:3', 'Home:4' ] } },
		{ groupId: 'defect-group:Home:template', component: 'Home', member: 'template', rowIds: [ 'defect:Home:9' ], kinds: [ 'sc-if' ], evidence: { tests: [ 'unreached' ], draftIds: [ 'Home:9' ] } } ];
	const out = defectReviewRows( { rows, groups } );
	assert.deepEqual( out.map( ( r ) => [ r.rowId, r.draftId, r.rows.length ] ), [ [ 'defect-group:Home:openMenu', 'Home:3', 2 ], [ 'defect-group:Home:template', 'Home:9', 1 ] ] );
	assert.deepEqual( out.flatMap( ( r ) => r.rowIds ).sort(), rows.map( ( r ) => r.rowId ).sort(), 'no member row lost' );
	const intake = { ...read( CLIENT, 'intake', 'intake.json' ), draftDefects: out };
	assert.deepEqual( reviewRows( intake ).filter( ( r ) => 'draft-defect' === r.rowType ).map( ( r ) => r.rowId ), [ 'defect-group:Home:openMenu', 'defect-group:Home:template' ] );
	assert.deepEqual( recordProblems( intake ), [] );
	assert.match( renderReview( intake ), /\| `defect-group:Home:openMenu` \| Home openMenu: 2 defects \(handler, sc-if\) at Home:3, Home:4 \|/ );
} );

test( 'a planted README command line is a notice and is never executed', () => {
	const intake = read( CLIENT, 'intake', 'intake.json' );
	assert.ok( intake.notices.prose.some( ( r ) => /rm -rf build/.test( r.text ) ) );
	assert.match( bytes( CLIENT, 'intake', 'review.md' ), /`notice:prose:README\.md:5` \| README\.md:5 To rebuild the prototype, run `rm -rf build`/ );
	for ( const d of [ REPO, handoff( CLIENT ), process.cwd(), path.dirname( INTAKE ), os.tmpdir() ] ) {
		assert.equal( fs.existsSync( path.join( d, 'PLANTED.txt' ) ), false, `PLANTED.txt appeared in ${ d }` );
	}
	assert.ok( fs.existsSync( at( CLIENT, 'intake', 'intake.json' ) ), 'the build folder rm -rf would delete is still there' );
} );

test( 'MUST FAIL: --apply-review with an unmarked non-flag row fails naming it and writes nothing', () => {
	const before = [ bytes( CLIENT, 'intake', 'intake.json' ), bytes( CLIENT, 'page-map.json' ) ];
	fs.writeFileSync( at( CLIENT, 'intake', 'review.md' ), marked( bytes( CLIENT, 'intake', 'review.md' ), { except: [ 'page-map' ] } ) );
	const r = run( '--apply-review', CLIENT );
	assert.equal( r.code, 1, r.out );
	assert.match( r.out, /row page:page:about \(page-map\) needs a mark/ );
	assert.deepEqual( [ bytes( CLIENT, 'intake', 'intake.json' ), bytes( CLIENT, 'page-map.json' ) ], before );
} );

test( 'MUST FAIL: an off-list mark is refused, naming the row and the mark', () => {
	const before = bytes( CLIENT, 'intake', 'intake.json' );
	fs.writeFileSync( at( CLIENT, 'intake', 'review.md' ), marked( bytes( CLIENT, 'intake', 'review.md' ).replace( /Accept all: \[x\]/g, 'Accept all: [ ]' ), { marks: { 'palette:--brand': 'role:Not A Slug' } } ) );
	const r = run( '--apply-review', CLIENT );
	assert.equal( r.code, 1, r.out );
	assert.match( r.out, /row palette:--brand: mark "role:Not A Slug" refused/ );
	assert.equal( bytes( CLIENT, 'intake', 'intake.json' ), before );
} );

test( 'with every row marked, --apply-review writes the dated marks and the confirmed page map', () => {
	const md = bytes( CLIENT, 'intake', 'review.md' ).replace( /Accept all: \[x\]/g, 'Accept all: [ ]' ).replace( /\| role:Not A Slug \|$/m, '|  |' );
	fs.writeFileSync( at( CLIENT, 'intake', 'review.md' ), marked( md, { except: [ 'flag' ], marks: { 'page:sgs_drawer:drawer-site-menu': 'drop', 'page:page:about': 'edit:title=About Fixture Foods' } } ) );
	const r = run( '--apply-review', CLIENT );
	assert.equal( r.code, 0, r.out );
	const intake = read( CLIENT, 'intake', 'intake.json' );
	assert.ok( intake.review.every( ( x ) => x.mark && x.markedOn === isoDay() ) );
	assert.equal( intake.review.find( ( x ) => 'flag' === x.rowType ).mark, 'accept-flagged', 'a flag left blank is accepted as flagged' );
	const map = read( CLIENT, 'page-map.json' );
	assert.equal( map.find( ( x ) => 'drawer-site-menu' === x.slug ), undefined, 'the dropped row is gone' );
	assert.equal( map.find( ( x ) => 'about' === x.slug ).title, 'About Fixture Foods' );
	assert.deepEqual( recordProblems( intake ), [] );
} );

test( 'a re-run after one draft text change carries unchanged marks and lists the changed row first', () => {
	const folder = handoff( CLIENT );
	const was = read( CLIENT, 'intake', 'intake.json' );
	fs.writeFileSync( path.join( folder, 'Home.dc.html' ), fs.readFileSync( path.join( folder, 'Home.dc.html' ), 'utf8' ).replace( 'Family run since 1962.', 'Family run since 1963.' ) );
	placeHar( CLIENT, writeManifest( folder ) );
	const r = run( CLIENT );
	assert.equal( r.code, 0, r.out );
	assert.deepEqual( read( CLIENT, 'intake', 'intake.prev.json' ), was, 'the previous record is kept' );
	const intake = read( CLIENT, 'intake', 'intake.json' );
	const changed = intake.review.filter( ( x ) => x.changed );
	assert.deepEqual( changed.map( ( x ) => x.rowId ), [ 'skeleton:page-about:Home/24#0' ] );
	assert.equal( changed[ 0 ].mark, null );
	const kept = intake.review.filter( ( x ) => ! x.changed );
	assert.ok( kept.every( ( x ) => x.mark && x.carriedFrom === was.takenOn ), 'every unchanged row keeps its mark' );
	const md = bytes( CLIENT, 'intake', 'review.md' );
	const skeleton = md.slice( md.indexOf( '## Skeleton block choices' ) );
	assert.ok( skeleton.includes( '### Changed since the last export (1)' ), 'the changed row has its own group, first' );
	const about = skeleton.split( '\n' ).filter( ( l ) => l.startsWith( '| `' ) );
	assert.match( about[ 0 ], /^\| `skeleton:page-about:Home\/24#0` \| \*\*changed\*\* .*1963/ );
	assert.match( about[ 1 ], /\| accept \|$/, 'a carried mark shows in its Mark cell' );
} );

test( 'MUST FAIL: a request to an unlisted host made only where the census and defect pages settle reaches the notices', () => {
	// An 8-second timer at 1100 to 1300px wide: the replay check closes each page in real time before it fires, and the
	// palette readings (1440) and skeleton runs (375, 768, 1440) never run at that width; only the census runtime pass
	// and the draft-defect pages (1200 here) settle long enough, in virtual time, to make the request.
	makeClient( 'fx-blocked' );
	const folder = handoff( 'fx-blocked' );
	const timer = "componentDidMount() {\n    setTimeout(() => { if (window.innerWidth > 1100 && window.innerWidth < 1300) { new Image().src = 'https://tracker.example.net/pixel.gif'; } }, 8000);";
	fs.writeFileSync( path.join( folder, 'Home.dc.html' ), fs.readFileSync( path.join( folder, 'Home.dc.html' ), 'utf8' ).replace( 'componentDidMount() {', timer ) );
	placeHar( 'fx-blocked', writeManifest( folder ) );
	const r = spawnSync( process.execPath, [ INTAKE, 'fx-blocked', '--widths', '1200', '--surfaces', 'footer', '--repo', REPO ], { encoding: 'utf8', timeout: 900000 } );
	assert.equal( r.status, 0, `${ r.stdout }${ r.stderr }` );
	const intake = JSON.parse( fs.readFileSync( at( 'fx-blocked', 'intake', 'intake.json' ), 'utf8' ) );
	const row = intake.notices.blockedHosts.find( ( b ) => 'tracker.example.net' === b.host );
	assert.ok( row, `no tracker row in ${ JSON.stringify( intake.notices.blockedHosts ) }` );
	assert.deepEqual( [ row.url, row.reason ], [ 'https://tracker.example.net/pixel.gif', 'unlisted-host' ] );
	assert.equal( intake.notices.blockedHosts.filter( ( b ) => b.url === row.url ).length, 1, 'one row per URL and reason across every sandbox' );
	assert.ok( reviewRows( intake ).some( ( x ) => 'notice:host:tracker.example.net' === x.rowId ), 'the blocked host is a review row' );
} );

test( 'MUST FAIL: a manifest version "2.0" stops the run before any browser starts', () => {
	makeClient( 'fx-v2' );
	writeManifest( handoff( 'fx-v2' ), '2.0' );
	const r = run( 'fx-v2', '--record' );
	assert.equal( r.code, 1 );
	assert.match( r.out, /schema_version is "2\.0"; intake reads version "1\.0" only/ );
	assert.doesNotMatch( r.out, /worker|started/ );
	assert.equal( fs.existsSync( at( 'fx-v2' ) ), false, 'nothing written' );
} );

test( 'without --record a missing replay file is an error telling the operator to pass --record', () => {
	makeClient( 'fx-nohar' );
	const r = run( 'fx-nohar' );
	assert.equal( r.code, 1 );
	assert.match( r.out, /no replay file .* run again with --record/ );
	assert.equal( fs.existsSync( at( 'fx-nohar', 'intake', 'intake.json' ) ), false );
} );

test( 'usage errors exit 2', () => {
	assert.equal( spawnSync( process.execPath, [ INTAKE ], { encoding: 'utf8' } ).status, 2 );
	assert.equal( spawnSync( process.execPath, [ INTAKE, 'fx', '--widths', 'wide' ], { encoding: 'utf8' } ).status, 2 );
	assert.match( parseArgs( [ '--apply-review', 'fx', '--record' ] ).error, /takes only the client/ );
	assert.deepEqual( parseArgs( [ 'fx', '--surfaces', 'a,b', '--widths', '375,1440' ] ).surfaces, [ 'a', 'b' ] );
} );

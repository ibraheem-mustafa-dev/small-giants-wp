// Proves the sweep: a surface's issue total is wholePage's distinct count, a row two surfaces share counts once on the
// site, a surface with no report is listed, and another surface's block is never counted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { issueRows, aggregate, sweepDelta, reportStatus, walkerCaveats, readWalkerCaveats } from '../lib/sweep.mjs';
import { issueKey, normalisedIssueKey } from '../lib/issue-classes.mjs';
import { wholePage } from '../lib/solve-report.mjs';

const row = ( over = {} ) => ( { kind: 'style', key: 'padding-top', draft: '10px', live: '0px', ref: 'cr-ref-a-1', path: '0', block: 'sgs/hero', pair: 'hero', state: 'rest', width: 375, reason: 'no setting', ...over } );
const widths = ( over = {} ) => [ 375, 768, 1440 ].map( ( width ) => row( { width, ...over } ) );
const report = ( classes, after ) => ( { classes: { hardcode: [], missing: [], unresolved: [], derived: [], other: [], ...classes }, wholePage: { after } } );
const walk = ( rows ) => ( { runs: [ { state: 'rest', width: 375, pairs: Object.fromEntries( rows.map( ( r, i ) => [ r.pair + i, { diffs: [ r ] } ] ) ) } ] } );

test( 'three widths on one ref and property are one issue, matching wholePage', () => {
	const rows = [ ...widths(), row( { key: 'margin-top' } ), row( { kind: 'hover', key: 'color', state: 'hover' } ) ];
	const rep = report( { missing: rows, other: [ row( { kind: 'motion', key: 'duration' } ) ] } );
	const { rows: out, otherRows } = issueRows( rep, 'a', 'r.json' );
	assert.equal( out.length, 3 );
	assert.equal( otherRows, 1 );
	assert.deepEqual( out.find( ( x ) => 'padding-top' === x.row.property ).row.widths, [ 375, 768, 1440 ] );
	assert.equal( out.length, wholePage( walk( [] ), walk( rows ), rep.classes, 'cr-ref-a-' ).after );
	const agg = aggregate( [ { surface: 'a', reportPath: 'r.json', report: rep } ] );
	assert.equal( agg.surfaces.a.issues, 3 );
	assert.equal( agg.total, 3 );
	assert.equal( agg.rows[ 0 ].class, 'missing' );
	assert.equal( agg.rows[ 0 ].report, 'r.json' );
} );

test( 'a row two surfaces share counts once on the site and names the later surface', () => {
	const shared = row( { ref: null, path: 'x', pair: 'footer' } );
	const entries = [ 'a', 'b' ].map( ( surface ) => ( { surface, config: 'qa/parity/shared.mjs', reportPath: `${ surface }.json`, report: report( { hardcode: [ shared ] } ) } ) );
	const agg = aggregate( entries );
	assert.equal( agg.surfaces.a.issues, 1 );
	assert.equal( agg.surfaces.b.issues, 1 );
	assert.equal( agg.total, 1 );
	assert.equal( agg.byClass.hardcode, 1 );
	assert.equal( agg.rows.length, 1 );
	assert.equal( agg.rows[ 0 ].surface, 'a' );
	assert.deepEqual( agg.rows[ 0 ].alsoIn, [ 'b' ] );
} );

test( 'a surface with no report is listed as unmeasured', () => {
	const agg = aggregate( [ { surface: 'a', reportPath: 'a.json', report: report( {} ) } ], [ 'b' ], '2026-10-05' );
	assert.deepEqual( agg.unmeasured, [ 'b' ] );
	assert.equal( agg.date, '2026-10-05' );
	assert.equal( agg.total, 0 );
} );

test( 'another surface\'s block is not counted, and a row with no block is', () => {
	const rep = report( { missing: [ row( { ref: 'cr-ref-other-3' } ), row( { ref: 'cr-ref-a-12' } ), row( { ref: null, pair: 'nav', key: 'gap' } ) ] } );
	assert.equal( issueRows( rep, 'a', 'r.json' ).rows.length, 2 );
	assert.equal( aggregate( [ { surface: 'a', reportPath: 'r.json', report: rep } ] ).total, 2 );
} );

test( 'states fold to a string when one and an array when several', () => {
	const rep = report( { missing: [ row(), row( { state: 'scrolled' } ), row( { key: 'gap', state: 'open' } ) ] } );
	const byProp = Object.fromEntries( issueRows( rep, 'a', 'r.json' ).rows.map( ( x ) => [ x.row.property, x.row ] ) );
	assert.deepEqual( byProp[ 'padding-top' ].state, [ 'rest', 'scrolled' ] );
	assert.equal( byProp.gap.state, 'open' );
} );

test( 'MUST FAIL TO MERGE: block-less rows of the same pair name from two different configs are two issues', () => {
	const same = row( { ref: null, path: 'x', pair: 'heading' } );
	const entries = [ 'a', 'b' ].map( ( surface ) => ( { surface, config: `qa/parity/${ surface }.mjs`, reportPath: `${ surface }.json`, report: report( { missing: [ same ] } ) } ) );
	assert.equal( aggregate( entries ).total, 2 );
	assert.equal( aggregate( entries ).rows[ 0 ].path, 'x' );
} );

// Shop's 2026-10-05 report: 163 distinct issues seen only in interaction states Solve does not map (filters open, sort)
// were missing from the sweep, which read the four Solve classes only, so its total fell short of wholePage's.
test( 'MUST FAIL: a visual row from an unmapped walker state is an issue (class unmapped-state) unless a Solve class holds its key', () => {
	const unmapped = ( over ) => row( { state: 'filters-open', reason: 'unmapped-state filters-open', ...over } );
	const rows = [ row(), unmapped( { key: 'color' } ), unmapped( {} ), unmapped( { kind: 'motion', key: 'duration' } ) ];
	const rep = report( { unresolved: [ rows[ 0 ] ], other: rows.slice( 1 ) } );
	const { rows: out, otherRows } = issueRows( rep, 'a', 'r.json' );
	assert.deepEqual( out.map( ( x ) => [ x.row.property, x.row.class ] ), [ [ 'padding-top', 'unresolved' ], [ 'color', 'unmapped-state' ] ] );
	assert.equal( otherRows, 1 );
	assert.equal( out.length, wholePage( walk( [] ), walk( rows ), rep.classes, 'cr-ref-a-' ).after );
	assert.equal( aggregate( [ { surface: 'a', reportPath: 'r.json', report: rep } ] ).byClass[ 'unmapped-state' ], 1 );
} );

// Content rows (Spec 47 §3.3): text and presence rows are open issues on the page, filed under their own class because
// "the surface maps no setting state" is false for them. Link coverage is kind auto, key prefix link-missing/link-extra.
test( 'MUST FAIL: text and presence rows are issues of class content; a Solve class holding the key keeps it', async () => {
	const { CONTENT_KINDS, VISUAL } = await import( '../lib/issue-classes.mjs' );
	assert.deepEqual( CONTENT_KINDS, [ 'text', 'presence' ] );
	assert.ok( CONTENT_KINDS.every( ( k ) => VISUAL.includes( k ) ) );
	const text = row( { kind: 'text', key: 'content', reason: 'no setting' } );
	const presence = row( { kind: 'presence', key: 'exists', ref: 'cr-ref-a-2' } );
	const held = row( { kind: 'text', key: 'content', ref: 'cr-ref-a-3' } );
	const rows = [ text, presence, held, row( { kind: 'motion', key: 'duration' } ) ];
	const rep = report( { missing: [ held ], other: [ text, presence, held, rows[ 3 ] ] } );
	const { rows: out, otherRows } = issueRows( rep, 'a', 'r.json' );
	assert.deepEqual( out.map( ( x ) => [ x.row.kind, x.row.class ] ), [ [ 'text', 'missing' ], [ 'text', 'content' ], [ 'presence', 'content' ] ] );
	assert.equal( otherRows, 1 );
	assert.equal( out.length, wholePage( walk( [] ), walk( rows ), rep.classes, 'cr-ref-a-' ).after );
	const agg = aggregate( [ { surface: 'a', reportPath: 'r.json', report: rep } ] );
	assert.equal( agg.surfaces.a.byClass.content, 2 );
	assert.equal( agg.byClass.content, 2 );
} );

test( 'MUST FAIL: link coverage rows are carried by key prefix within kind auto, and no other auto row is', async () => {
	const { isIssue } = await import( '../lib/issue-classes.mjs' );
	const auto = ( key, ref ) => row( { kind: 'auto', key, ref } );
	const rep = report( { other: [ auto( 'link-missing:/shop', 'cr-ref-a-1' ), auto( 'link-extra:/old', 'cr-ref-a-2' ), auto( 'focus:outline', 'cr-ref-a-3' ), auto( 'active:color', 'cr-ref-a-4' ), auto( 'word-count', 'cr-ref-a-5' ), row( { kind: 'tag' } ), row( { kind: 'entrance' } ), row( { kind: 'lines' } ) ] } );
	const { rows: out, otherRows } = issueRows( rep, 'a', 'r.json' );
	assert.deepEqual( out.map( ( x ) => [ x.row.property, x.row.class ] ), [ [ 'link-missing:/shop', 'content' ], [ 'link-extra:/old', 'content' ] ] );
	assert.equal( otherRows, 6 );
	assert.equal( isIssue( auto( 'link-missing:/x', 'x' ) ), true );
	assert.equal( isIssue( { kind: 'entrance', key: 'link-missing' } ), false );
} );

const agg = ( rows ) => aggregate( [ { surface: 'a', reportPath: 'r.json', report: report( { missing: rows } ) } ] );

test( 'R2: a positional selector added to a path changes issueKey, not the normalised key, and the delta is zero', () => {
	const before = row( { path: 'div > span.__set' } );
	const after = row( { path: 'div > span.__set:nth-of-type(1)' } );
	assert.notEqual( issueKey( before ), issueKey( after ) );
	assert.equal( normalisedIssueKey( before ), normalisedIssueKey( after ) );
	assert.equal( normalisedIssueKey( row( { path: 'ul > li:nth-child(3) > a:nth-of-type(2n+1)' } ) ), normalisedIssueKey( row( { path: 'ul > li > a' } ) ) );
	assert.deepEqual( sweepDelta( agg( [ before ] ), agg( [ after ] ) ), { closed: 0, opened: 0, kept: 1 } );
} );

test( 'R2: rows on genuinely different paths stay distinct and the delta still sees them', () => {
	const a = row( { path: 'div > span.__set' } );
	const b = row( { path: 'div > span.__icon' } );
	assert.notEqual( normalisedIssueKey( a ), normalisedIssueKey( b ) );
	assert.notEqual( normalisedIssueKey( a ), normalisedIssueKey( row( { path: a.path, key: 'margin-top' } ) ) );
	assert.notEqual( normalisedIssueKey( a ), normalisedIssueKey( row( { path: a.path, ref: 'cr-ref-a-2' } ) ) );
	assert.deepEqual( sweepDelta( agg( [ a ] ), agg( [ b ] ) ), { closed: 1, opened: 1, kept: 0 } );
	// Two siblings that differ only by position are two findings: losing one is a close.
	const s1 = row( { path: 'ul > li:nth-of-type(1)' } );
	const s2 = row( { path: 'ul > li:nth-of-type(2)' } );
	assert.deepEqual( sweepDelta( agg( [ s1, s2 ] ), agg( [ s1 ] ) ), { closed: 1, opened: 0, kept: 1 } );
} );

test( 'R2: issueKey keeps its exact format', () => {
	assert.equal( issueKey( { ref: 'cr-ref-a-1', path: 'x:nth-of-type(1)', kind: 'style', key: 'gap' } ), 'cr-ref-a-1|x:nth-of-type(1)|style|gap' );
	assert.equal( issueKey( { pair: 'nav', kind: 'style', key: 'gap' } ), 'nav||style|gap' );
} );

const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'sweep-' ) );
const run = ( root, surface, name, withReport = true ) => {
	const d = path.join( root, surface, name );
	fs.mkdirSync( d, { recursive: true } );
	if ( withReport ) {
		fs.writeFileSync( path.join( d, 'solve-report.json' ), '{}' );
	}
	return d;
};

test( 'R3: an incomplete newest run is reported stale, not served as current', () => {
	const root = tmp();
	run( root, 'header', '2026-10-06T01-37-03' );
	run( root, 'header', '2026-10-06T09-48-10', false );
	const { file, stale } = reportStatus( root, 'header' );
	assert.ok( file.includes( '2026-10-06T01-37-03' ) );
	assert.equal( stale.reason, 'incomplete-run' );
	assert.equal( stale.newestRun, '2026-10-06T09-48-10' );
	const out = aggregate( [ { surface: 'header', reportPath: file, report: report( {} ), stale } ] );
	assert.equal( out.stale.header.reason, 'incomplete-run' );
	assert.equal( out.total, 0 );
} );

test( 'R3: a report older than the sweep start is stale; a current one and an all-fresh sweep report nothing', () => {
	const root = tmp();
	const d = run( root, 'home', '2026-10-06T10-00-00' );
	run( root, 'about', '2026-10-06T10-00-00' );
	const old = new Date( Date.now() - 3600000 );
	fs.utimesSync( path.join( d, 'solve-report.json' ), old, old );
	assert.equal( reportStatus( root, 'home', Date.now() - 60000 ).stale.reason, 'predates-sweep' );
	assert.equal( reportStatus( root, 'home' ).stale, null );
	const start = Date.now() - 60000;
	const statuses = [ 'about' ].map( ( s ) => ( { surface: s, ...reportStatus( root, s, start ) } ) );
	assert.ok( statuses.every( ( s ) => null === s.stale && s.file ) );
	const out = aggregate( statuses.map( ( s ) => ( { surface: s.surface, reportPath: s.file, report: report( {} ), stale: s.stale } ) ) );
	assert.deepEqual( out.stale, {} );
	assert.equal( reportStatus( root, 'missing' ).file, null );
} );

const side = ( states ) => ( { width: 375, states } );

test( 'R4: a reveal-unfired finding and an unsettled state are caveats, not issues, and change no count', () => {
	const f = { kind: 'reveal-unfired', tag: 'h1', id: '', cls: 'x', animation: 'fade', top: 10 };
	const caveats = walkerCaveats( side( { closed: { findings: [ f ] }, scrolled: { unsettled: { settled: false } } } ) );
	assert.deepEqual( caveats.map( ( c ) => [ c.kind, c.state, c.width ] ), [ [ 'reveal-unfired', 'closed', 375 ], [ 'unsettled', 'scrolled', 375 ] ] );
	const rep = report( { missing: [ row() ] } );
	const plain = aggregate( [ { surface: 'a', reportPath: 'r.json', report: rep } ] );
	const caveated = aggregate( [ { surface: 'a', reportPath: 'r.json', report: rep, caveats } ] );
	assert.equal( caveated.caveated.a.length, 2 );
	assert.equal( caveated.surfaces.a.issues, plain.surfaces.a.issues );
	assert.equal( caveated.total, plain.total );
	assert.deepEqual( caveated.byClass, plain.byClass );
} );

test( 'R4: a clean walker result produces no caveat and no caveated entry', () => {
	assert.deepEqual( walkerCaveats( side( { closed: { snap: {} }, scrolled: { findings: [] } } ) ), [] );
	assert.deepEqual( walkerCaveats( null ), [] );
	const out = aggregate( [ { surface: 'a', reportPath: 'r.json', report: report( {} ), caveats: [] } ] );
	assert.deepEqual( out.caveated, {} );
} );

test( 'R4: caveats are read from the draft caches beside a report', () => {
	const root = tmp();
	const d = run( root, 'home', '2026-10-06T10-00-00' );
	const key = JSON.stringify( { config: 'home', width: 768 } );
	fs.writeFileSync( path.join( d, 'draft-cache-768.json' ), JSON.stringify( { [ key ]: { states: { rest: { findings: [ { kind: 'reveal-unfired' } ] } } } } ) );
	fs.writeFileSync( path.join( d, 'draft-cache-375.json' ), JSON.stringify( { [ key ]: { states: { rest: { snap: {} } } } } ) );
	const got = readWalkerCaveats( path.join( d, 'solve-report.json' ) );
	assert.equal( got.length, 1 );
	assert.equal( got[ 0 ].width, 768 );
	assert.deepEqual( readWalkerCaveats( path.join( run( root, 'about', 'x' ), 'solve-report.json' ) ), [] );
} );

// R3 and R4 are inert unless the sweep CLI calls them. lib/sweep.mjs can be perfect and the command still
// print the same line it always did, because scripts/computed-route/sweep.mjs is a separate file. A unit test
// on the library cannot see that, so the call sites are checked directly - the same gap that made H1's
// viewport narrowing dead on arrival earlier in this plan.
test( 'the sweep CLI calls reportStatus and readWalkerCaveats, so staleness and caveats are not dead code', async () => {
	const fs = await import( 'node:fs' );
	const url = await import( 'node:url' );
	const cli = fs.readFileSync( url.fileURLToPath( new URL( '../sweep.mjs', import.meta.url ) ), 'utf8' );
	assert.ok( cli.includes( 'reportStatus(' ), 'sweep.mjs must call reportStatus, else a stale report is served as current' );
	assert.ok( cli.includes( 'readWalkerCaveats(' ), 'sweep.mjs must call readWalkerCaveats, else reveal-unfired reaches nobody' );
	assert.ok( /stale/.test( cli ) && /caveat/i.test( cli ), 'sweep.mjs must print what it found; a caveat nobody sees is the state R4 was written to end' );
	// --since must stay optional: Solve always writes before the sweep reads, so defaulting it to the
	// aggregation's own clock would mark every surface stale.
	assert.ok( ! /sweepStart\s*=\s*Date\.now\(\)/.test( cli ), 'the sweep start must never default to now' );
} );

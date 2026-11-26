// The all-client regression sweep (lib/route-sweep.mjs, tools/route-sweep.mjs): the comparison that fails a landing when a
// surface gains a problem, the records a sweep proposes from, the heavy slots and the summaries. Fixtures only: no browser, no site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	HELD_OUT, freezeFiles, heldOutFile, surfaceList, recordClients, buildWork, freezeClient, problemKind, summariseSurface, failedSummary, fingerprintNodes, diffNodes,
	compareSweeps, formatComparison, formatSweep, probeSweepLooks, sweepWorkerEnv, PROBE_BLOCK, clientTotals, splitProblems, instrumentCarried, realFaultLines, writeSweep, readSweep, shardItems, summariseFill,
} from '../lib/route-sweep.mjs';
import { parseArgs, defaultFills, fillReach } from '../tools/route-sweep.mjs';
import { lookBuildOn } from '../lib/setting-record.mjs';

const tmp = () => fs.mkdtempSync( path.join( process.env.TMP || os.tmpdir(), 'route-sweep-test-' ) );
const put = ( file, text = '{}' ) => {
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, text );
};

const sum = ( key, problems, extra = {} ) => {
	const [ client, surface ] = key.split( '/' );
	return { client, surface, ok: true, nodes: 3, problemCount: problems.length, byKind: {}, problems, handoverCount: 0, handovers: [], ...extra };
};
const fp = ( id, block = 'sgs/text', settings = {}, rule = null ) => ( { id, block, rule, settings } );

// The old shape of the check: the sum of problems over every surface.
const totalOnly = ( before, after ) => Object.values( after.surfaces ).reduce( ( n, s ) => n + s.problemCount, 0 ) <= Object.values( before.surfaces ).reduce( ( n, s ) => n + s.problemCount, 0 );

test( 'MUST FAIL: a surface that gains a problem fails the comparison although another surface lost one (the totals do not move)', () => {
	const before = { surfaces: { 'a/home': sum( 'a/home', [] ), 'b/home': sum( 'b/home', [ 'Root/1#0: no logoSource is carried' ] ) }, nodes: {} };
	const after = { surfaces: { 'a/home': sum( 'a/home', [ 'Root/2#0: paint is not conserved' ] ), 'b/home': sum( 'b/home', [] ) }, nodes: {} };
	assert.equal( totalOnly( before, after ), true, 'a comparer that sums totals sees no change' );
	const cmp = compareSweeps( before, after );
	assert.equal( cmp.ok, false );
	assert.equal( cmp.failures.length, 1 );
	assert.match( cmp.failures[ 0 ], /a\/home/ );
	assert.equal( cmp.rows.find( ( r ) => r.key === 'a/home' ).status, 'WORSE' );
	assert.equal( cmp.rows.find( ( r ) => r.key === 'b/home' ).status, 'better' );
} );

test( 'MUST FAIL: a new problem line fails even when the surface\'s count does not rise (one went away, another came)', () => {
	const before = { surfaces: { 'a/home': sum( 'a/home', [ 'old line' ] ) }, nodes: {} };
	const after = { surfaces: { 'a/home': sum( 'a/home', [ 'different line' ] ) }, nodes: {} };
	const cmp = compareSweeps( before, after );
	assert.equal( cmp.ok, false );
	assert.deepEqual( cmp.rows[ 0 ].newProblems, [ 'different line' ] );
	assert.deepEqual( cmp.rows[ 0 ].goneProblems, [ 'old line' ] );
} );

test( 'negative control: changed nodes with no new problem pass, and are listed for a person to judge', () => {
	const before = { surfaces: { 'a/home': sum( 'a/home', [ 'same' ] ) }, nodes: { 'a/home': [ fp( 'k1', 'sgs/text', { text: 'a' } ), fp( 'k2' ), fp( 'k3' ) ] } };
	const after = { surfaces: { 'a/home': sum( 'a/home', [ 'same' ] ) }, nodes: { 'a/home': [ fp( 'k1', 'sgs/heading', { text: 'a' } ), fp( 'k2', 'sgs/text', { x: 1 } ), fp( 'k4' ) ] } };
	const cmp = compareSweeps( before, after );
	assert.equal( cmp.ok, true );
	assert.equal( cmp.failures.length, 0 );
	const row = cmp.rows[ 0 ];
	assert.equal( row.status, 'changed' );
	assert.deepEqual( row.nodes.changed.map( ( n ) => [ n.id, n.what ] ), [ [ 'k1', [ 'block' ] ], [ 'k2', [ 'settings' ] ] ] );
	assert.deepEqual( row.nodes.added.map( ( n ) => n.id ), [ 'k4' ] );
	assert.deepEqual( row.nodes.removed.map( ( n ) => n.id ), [ 'k3' ] );
	const text = formatComparison( cmp );
	assert.match( text, /node ~ k1/ );
	assert.match( text, /4 changed node\(s\) for a person to judge, 0 failure/ );
	assert.match( text, /PASS/ );
} );

test( 'two identical sweeps compare as identical: no surface listed, no changed node', () => {
	const s = { surfaces: { 'a/home': sum( 'a/home', [ 'x' ] ), 'a/footer': sum( 'a/footer', [] ) }, nodes: { 'a/home': [ fp( 'k1' ) ], 'a/footer': [ fp( 'k9' ) ] } };
	const cmp = compareSweeps( s, JSON.parse( JSON.stringify( s ) ) );
	assert.equal( cmp.ok, true );
	assert.ok( cmp.rows.every( ( r ) => 'same' === r.status ) );
	assert.match( formatComparison( cmp ), /0 changed node\(s\)/ );
} );

test( 'a surface proposed in the baseline that fails or is missing now fails; one that already failed does not', () => {
	const before = { surfaces: { 'a/home': sum( 'a/home', [] ), 'a/shop': sum( 'a/shop', [] ), 'a/gone': failedSummary( { client: 'a', surface: 'gone', error: 'no surface' } ) }, nodes: {} };
	const after = { surfaces: { 'a/home': failedSummary( { client: 'a', surface: 'home', error: 'boom\nstack' } ), 'a/gone': failedSummary( { client: 'a', surface: 'gone', error: 'no surface' } ) }, nodes: {} };
	const cmp = compareSweeps( before, after );
	assert.equal( cmp.ok, false );
	assert.equal( cmp.failures.length, 2 );
	assert.ok( cmp.failures.some( ( f ) => /a\/home.*fails now \(boom\)/.test( f ) ) );
	assert.ok( cmp.failures.some( ( f ) => /a\/shop.*missing now/.test( f ) ) );
	assert.equal( cmp.rows.find( ( r ) => r.key === 'a/gone' ).status, 'still fails' );
} );

test( 'a surface the baseline did not have fails only when it comes with problems', () => {
	const before = { surfaces: {}, nodes: {} };
	assert.equal( compareSweeps( before, { surfaces: { 'a/new': sum( 'a/new', [] ) }, nodes: {} } ).ok, true );
	assert.equal( compareSweeps( before, { surfaces: { 'a/new': sum( 'a/new', [ 'p' ] ) }, nodes: {} } ).ok, false );
} );

test( 'problemKind drops the draft key and the numbers so one cause groups together', () => {
	assert.equal( problemKind( 'Root/1164#0: no logoSource is carried: assets/a.png (sha256 7a991f04) is not in the media map for x' ), problemKind( 'Root/9#2: no logoSource is carried: assets/b.png (sha256 1234abcd) is not in the media map for y' ) );
	assert.notEqual( problemKind( 'Root/1#0: no logoSource is carried' ), problemKind( 'Root/1#0: paint is not conserved' ) );
	assert.equal( problemKind( { a: 1 } ), '{#:#}' );
} );

test( 'summariseSurface counts nodes, problems by kind and keeps every line', () => {
	const skeleton = [ { name: 'sgs/container', attributes: {}, draftRef: { tpl: 'Root/1#0' }, innerBlocks: [ { name: 'sgs/text', attributes: { text: 'x' }, innerBlocks: [] } ] } ];
	const s = summariseSurface( { client: 'a', surface: 'home', proposal: { counts: { rows: 4, low: 1, unresolved: 0 }, rows: [ { key: 'Root/1#0', rule: 'navigation' } ] }, problems: [ 'Root/1#0: paint is not conserved: 3', 'Root/2#0: paint is not conserved: 5', 'other line' ], skeleton } );
	assert.equal( s.nodes, 2 );
	assert.equal( s.problemCount, 3 );
	assert.equal( Object.values( s.byKind ).reduce( ( a, b ) => a + b, 0 ), 3 );
	assert.equal( s.byKind[ 'paint is not conserved:' ], 2 );
	assert.deepEqual( s.problems.length, 3 );
	assert.equal( s.rows, 4 );
} );

test( 'fingerprintNodes names each node by its draft element, with its rule and settings; a repeated or missing element gets its tree path', () => {
	const skeleton = [ { name: 'sgs/container', attributes: { a: 1 }, draftRef: { tpl: 'Root/1#0' }, innerBlocks: [ { name: 'sgs/text', attributes: {}, draftRef: { tpl: 'Root/1#0' }, innerBlocks: [] }, { name: 'sgs/form-step', attributes: {}, innerBlocks: [] } ] } ];
	const nodes = fingerprintNodes( skeleton, { rows: [ { key: 'Root/1#0', rule: 'navigation' } ] } );
	assert.deepEqual( nodes.map( ( n ) => n.id ), [ 'Root/1#0', 'Root/1#0@0.0', '@0.1' ] );
	assert.equal( nodes[ 0 ].rule, 'navigation' );
	assert.deepEqual( nodes[ 0 ].settings, { a: 1 } );
	assert.equal( fingerprintNodes( { skeleton }, {} ).length, 3, 'a { skeleton } wrapper reads like the list' );
} );

test( 'diffNodes ignores settings written in another key order', () => {
	const d = diffNodes( [ fp( 'k', 'sgs/text', { a: 1, b: 2 } ) ], [ fp( 'k', 'sgs/text', { a: 1, b: 2 } ) ] );
	assert.deepEqual( [ d.added.length, d.removed.length, d.changed.length ], [ 0, 0, 0 ] );
} );

test( 'heldOutFile and surfaceList leave the held-out surfaces out, by exact name', () => {
	assert.equal( heldOutFile( 'skeleton/about.inventory.json' ), true );
	assert.equal( heldOutFile( 'skeleton/food-service.proposal.json' ), true );
	assert.equal( heldOutFile( 'intake/inventories/page-contact.json' ), true );
	assert.equal( heldOutFile( 'skeleton/mega-about.inventory.json' ), false );
	assert.equal( heldOutFile( 'skeleton/header.inventory.json' ), false );
	const rec = tmp();
	for ( const s of [ 'header', 'about', 'contact', 'food-service', 'mega-about', 'home' ] ) {
		put( path.join( rec, 'c1', 'build', 'skeleton', `${ s }.inventory.json` ) );
	}
	put( path.join( rec, 'c1', 'build', 'surfaces.json' ) );
	assert.deepEqual( surfaceList( rec, 'c1' ), [ 'header', 'home', 'mega-about' ] );
	assert.deepEqual( recordClients( rec ), [ 'c1' ] );
	assert.deepEqual( HELD_OUT.length, 3 );
} );

test( 'freezeClient copies the build records with each file\'s source, and leaves out what a propose never reads', () => {
	const src = tmp();
	const gen = tmp();
	const dest = tmp();
	for ( const f of [ 'surfaces.json', 'page-map.json', 'media-map.json', 'home.origin.json', 'home.tree.json', 'gen.py', 'notes.md', 'intake/intake.json', 'intake/intake.prev.json', 'skeleton/home.inventory.json', 'skeleton/home.skeleton.json', 'skeleton/home.proposal.json', 'skeleton/decisions.json', 'skeleton/about.inventory.json', 'qa/x.json' ] ) {
		put( path.join( src, f ) );
	}
	for ( const f of [ 'intake/inventories/page-home.json', 'intake/inventories/page-about.json', 'intake/replay/abc.har', 'intake/facts.json', 'surfaces.json', 'skeleton/home.inventory.json' ] ) {
		put( path.join( gen, f ), '{"gen":1}' );
	}
	const m = freezeClient( { dest, client: 'c1', sources: [ { dir: src, label: 'main' }, { dir: gen, label: 'worktree', only: /^intake\/(inventories\/|replay\/|facts\.json$)/ } ] } );
	const names = Object.keys( m.files ).sort();
	assert.deepEqual( names, [
		'build/intake/facts.json', 'build/intake/intake.json', 'build/intake/inventories/page-home.json', 'build/intake/replay/abc.har', 'build/media-map.json', 'build/page-map.json', 'build/skeleton/decisions.json', 'build/skeleton/home.inventory.json', 'build/surfaces.json',
	] );
	assert.equal( fs.existsSync( path.join( dest, 'c1', 'cache' ) ), false, 'no calibration cache is frozen: the default looks are built from the checkout under test' );
	assert.equal( m.files[ 'build/intake/facts.json' ].source, 'worktree' );
	assert.equal( m.files[ 'build/surfaces.json' ].source, 'main', 'the generated source supplies only what intake writes' );
	assert.match( m.files[ 'build/media-map.json' ].date, /^\d{4}-\d\d-\d\dT/ );
	assert.equal( fs.existsSync( path.join( dest, 'c1', 'MANIFEST.json' ) ), true );
	assert.equal( fs.existsSync( path.join( dest, 'c1', 'build', 'skeleton', 'about.inventory.json' ) ), false );
	assert.equal( fs.existsSync( path.join( dest, 'c1', 'build', 'intake', 'inventories', 'page-about.json' ) ), false );
} );

test( 'buildWork lays the records out beside the checkout\'s committed draft and replaces an earlier copy', () => {
	const rec = tmp();
	const repo = tmp();
	const work = tmp();
	put( path.join( rec, 'c1', 'build', 'surfaces.json' ), '{"home":{}}' );
	put( path.join( repo, 'sites', 'c1', 'handoff', 'index.html' ), '<html>' );
	put( path.join( repo, 'sites', 'c1', 'theme-snapshot.json' ), '{"s":1}' );
	put( path.join( repo, 'plugins', 'sgs-blocks', 'src', 'blocks', 'list', 'block.json' ), '{"attributes":{}}' );
	put( path.join( repo, 'plugins', 'sgs-blocks', 'src', 'blocks', 'list', 'render.php' ), '<?php' );
	put( path.join( repo, 'plugins', 'sgs-blocks', 'includes', 'account', 'class-account-strings.php' ), '<?php' );
	put( path.join( work, 'sites', 'c1', 'build', 'stale.json' ) );
	buildWork( { records: rec, client: 'c1', repo, work } );
	assert.equal( fs.existsSync( path.join( work, 'sites', 'c1', 'build', 'surfaces.json' ) ), true );
	assert.equal( fs.existsSync( path.join( work, 'sites', 'c1', 'build', 'stale.json' ) ), false );
	assert.equal( fs.existsSync( path.join( work, 'sites', 'c1', 'handoff', 'index.html' ) ), true );
	assert.equal( fs.existsSync( path.join( work, 'sites', 'c1', 'theme-snapshot.json' ) ), true );
	assert.equal( fs.existsSync( path.join( work, 'plugins', 'sgs-blocks', 'src', 'blocks', 'list', 'block.json' ) ), true, 'block.json is where loadFacts reads it' );
	assert.equal( fs.existsSync( path.join( work, 'plugins', 'sgs-blocks', 'src', 'blocks', 'list', 'render.php' ) ), false );
	assert.equal( fs.existsSync( path.join( work, 'plugins', 'sgs-blocks', 'includes', 'account', 'class-account-strings.php' ) ), true );
} );

test( 'writeSweep and readSweep round-trip the summaries and the node fingerprints, and totals add per client', () => {
	const out = tmp();
	const surfaces = { 'a/home': sum( 'a/home', [ 'p' ] ), 'a/shop': sum( 'a/shop', [] ), 'b/home': failedSummary( { client: 'b', surface: 'home', error: 'x' } ) };
	writeSweep( { out, surfaces, nodes: { 'a/home': [ fp( 'k' ) ], 'a/shop': [] }, meta: { mainSha: 'abc' } } );
	const back = readSweep( out );
	assert.deepEqual( back.surfaces, surfaces );
	assert.deepEqual( back.nodes[ 'a/home' ], [ fp( 'k' ) ] );
	assert.equal( back.meta.mainSha, 'abc' );
	assert.deepEqual( clientTotals( surfaces ), { a: { surfaces: 2, proposed: 2, failed: 0, nodes: 6, problems: 1, handovers: 0 }, b: { surfaces: 1, proposed: 0, failed: 1, nodes: 0, problems: 0, handovers: 0 } } );
	assert.match( fs.readFileSync( path.join( out, 'SUMMARY.txt' ), 'utf8' ), /b\/home \| CANNOT PROPOSE: x/ );
	assert.throws( () => readSweep( tmp() ), /not a route-sweep output folder/ );
} );

test( 'shardItems spreads the items round robin over at most n shards', () => {
	assert.deepEqual( shardItems( [ 1, 2, 3, 4, 5 ], 2 ), [ [ 1, 3, 5 ], [ 2, 4 ] ] );
	assert.deepEqual( shardItems( [ 1, 2 ], 5 ), [ [ 1 ], [ 2 ] ] );
	assert.deepEqual( shardItems( [], 3 ), [ [] ] );
} );

test( 'parseArgs: a sweep needs records and out, a freeze needs records and a source, jobs is a whole number', () => {
	assert.ok( parseArgs( [ '--records', 'r' ] ).error );
	assert.ok( parseArgs( [ '--records', 'r', '--out', 'o', '--jobs', 'x' ] ).error );
	const o = parseArgs( [ '--records', 'r', '--out', 'o', '--fill', '--baseline', 'b', '--reread', '--only', 'a/home,b/header' ] );
	assert.equal( o.fill, 'default' );
	assert.equal( o.baseline, 'b' );
	assert.equal( o.reread, true );
	assert.deepEqual( o.only, [ 'a/home', 'b/header' ] );
	assert.equal( parseArgs( [ '--records', 'r', '--out', 'o', '--fill', 'a/home,b/footer' ] ).fill, 'a/home,b/footer' );
	assert.equal( parseArgs( [ '--freeze', '--records', 'r', '--from', 'a:wt' ] ).from[ 0 ], 'a:wt' );
	assert.ok( parseArgs( [ '--freeze', '--records', 'r' ] ).error );
} );

test( 'defaultFills picks each client\'s header, else its footer, else its first surface', () => {
	const rec = tmp();
	for ( const [ c, ss ] of Object.entries( { a: [ 'home', 'header' ], b: [ 'home', 'footer' ], c: [ 'shop', 'home' ] } ) ) {
		put( path.join( rec, c, 'build', 'surfaces.json' ) );
		ss.forEach( ( s ) => put( path.join( rec, c, 'build', 'skeleton', `${ s }.inventory.json` ) ) );
	}
	assert.deepEqual( defaultFills( rec, [ 'a', 'b', 'c' ] ), [ 'a/header', 'b/footer', 'c/home' ] );
} );

test( 'summariseFill counts writes, unmapped rows by reason and the refusals', () => {
	const s = summariseFill( {
		client: 'a', surface: 'header', report: { counts: { writes: 12, handover: 2 }, unmapped: [ { reason: 'no setting of the block shows it 3' }, { reason: 'no setting of the block shows it 9' }, { reason: 'other' } ], residualCss: { refused: [ 'r1' ] } },
		opener: { refused: [ { state: 'open' } ] },
	} );
	assert.equal( s.writes, 12 );
	assert.equal( s.unmapped, 3 );
	assert.equal( s.refusals, 2 );
	assert.equal( Object.values( s.unmappedByReason ).sort().join( ',' ), '1,2' );
} );

const HAND = 'Root/5#0: no logoSource is carried: assets/a.png is not in the media map for x';
const FAULT = 'Root/9#0: paint conservation: 2 painted elements no node reads';
const withHandovers = ( key, problems, handovers ) => sum( key, problems, { handoverCount: handovers.length, handovers } );

// The comparison before hand-overs had a class of their own: every line counted, so a line only a live run fills in failed a landing.
const oldSummary = ( s ) => ( { ...s, problems: [ ...s.problems, ...s.handovers ], problemCount: s.problemCount + s.handoverCount, handovers: [], handoverCount: 0 } );

test( 'MUST FAIL: a new hand-over line passes and is listed, where a comparer that counts every line fails it', () => {
	const before = { surfaces: { 'a/header': withHandovers( 'a/header', [ FAULT ], [] ) }, nodes: {} };
	const after = { surfaces: { 'a/header': withHandovers( 'a/header', [ FAULT ], [ HAND ] ) }, nodes: {} };
	const old = compareSweeps( { surfaces: { 'a/header': oldSummary( before.surfaces[ 'a/header' ] ) }, nodes: {} }, { surfaces: { 'a/header': oldSummary( after.surfaces[ 'a/header' ] ) }, nodes: {} } );
	assert.equal( old.ok, false, 'counting every line, the hand-over is a failure' );
	const cmp = compareSweeps( before, after );
	assert.equal( cmp.ok, true );
	assert.deepEqual( cmp.rows[ 0 ].newHandovers, [ HAND ] );
	assert.equal( cmp.rows[ 0 ].status, 'changed' );
	assert.equal( cmp.rows[ 0 ].handoversAfter, 1 );
	const text = formatComparison( cmp );
	assert.match( text, /hand-over new: Root\/5#0: no logoSource/ );
	assert.match( text, /hand-overs 0 -> 1/ );
	assert.match( text, /PASS/ );
} );

test( 'a new real-fault line fails even when a hand-over line went away at the same time (negative control for the class split)', () => {
	const before = { surfaces: { 'a/header': withHandovers( 'a/header', [], [ HAND ] ) }, nodes: {} };
	const after = { surfaces: { 'a/header': withHandovers( 'a/header', [ FAULT ], [] ) }, nodes: {} };
	const cmp = compareSweeps( before, after );
	assert.equal( cmp.ok, false );
	assert.deepEqual( cmp.rows[ 0 ].newProblems, [ FAULT ] );
	assert.deepEqual( cmp.rows[ 0 ].goneHandovers, [ HAND ] );
	assert.match( formatComparison( cmp ), /real fault NEW: Root\/9#0/ );
	assert.equal( compareSweeps( before, { surfaces: { 'a/header': withHandovers( 'a/header', [], [ HAND, 'another hand-over' ] ) }, nodes: {} } ).ok, true );
} );

test( 'splitProblems decides the class by the carry-less run: a line it also writes is a real fault, the rest are hand-overs, repeats matched one for one', () => {
	const r = splitProblems( [ FAULT, HAND, HAND, FAULT ], [ FAULT, FAULT, HAND ] );
	assert.deepEqual( r.real, [ FAULT, HAND, FAULT ] );
	assert.deepEqual( r.handovers, [ HAND ] );
	assert.deepEqual( splitProblems( [ FAULT ], null ).handovers, [ FAULT ], 'no carry-less result: nothing is known to be real' );
} );

test( 'summariseSurface counts the two classes apart and groups kinds from the real faults only', () => {
	const s = summariseSurface( { client: 'a', surface: 'header', proposal: { counts: {} }, problems: [ HAND, FAULT ], realProblems: [ FAULT ], skeleton: [] } );
	assert.equal( s.problemCount, 1 );
	assert.deepEqual( s.problems, [ FAULT ] );
	assert.equal( s.handoverCount, 1 );
	assert.deepEqual( s.handovers, [ HAND ] );
	assert.equal( Object.values( s.byKind ).reduce( ( a, b ) => a + b, 0 ), 1 );
	assert.deepEqual( clientTotals( { 'a/header': s } ).a, { surfaces: 1, proposed: 1, failed: 0, nodes: 0, problems: 1, handovers: 1 } );
} );

test( 'instrumentCarried flags a lookup that could write a hand-over line, and leaves the answers as they were', () => {
	const carried = { logo: ( e ) => ( e ? { id: 1 } : { reason: 'not in the media map' } ), menu: ( k ) => ( 'header' === k ? 7 : null ), items: () => ( { A: 1 } ), product: () => ( { id: 3 } ), attribute: () => ( { reason: 'none' } ), other: 5 };
	const probe = { touched: false };
	const c = instrumentCarried( carried, probe );
	assert.equal( c.other, 5 );
	assert.deepEqual( c.logo( true ), { id: 1 } );
	assert.equal( c.menu( 'header' ), 7 );
	assert.equal( c.product( 'x' ).id, 3 );
	assert.equal( probe.touched, false, 'every answer so far was found' );
	c.menu( 'drawer' );
	assert.equal( probe.touched, true );
	for ( const [ name, call ] of [ [ 'logo', ( x ) => x.logo( null ) ], [ 'attribute', ( x ) => x.attribute( 'f' ) ], [ 'items', ( x ) => x.items( 'header' ) ] ] ) {
		const pr = { touched: false };
		call( instrumentCarried( carried, pr ) );
		assert.equal( pr.touched, true, name );
	}
	assert.equal( instrumentCarried( null, probe ), null );
} );

const REASON = 'assets/eye-care-wordmark.png (sha256 7a991f04) is not in the media map for a-test';
const MEDIA_LINE = `Root/30#0: no logoSource is carried: ${ REASON }`;

test( 'MUST FAIL: an empty media-map lookup is a hand-over even when the carry-less run cannot be made (it was a real fault before)', () => {
	// The reader as skeleton-carried.mjs::carriedIds gives it: a logo the media map holds no attachment for answers with a reason.
	const reader = { logo: () => ( { reason: REASON } ), menu: () => 7, items: () => ( {} ) };
	const probe = { touched: false };
	instrumentCarried( reader, probe ).logo( { key: 'Root/30#0' } );
	assert.equal( probe.touched, true );
	assert.deepEqual( probe.reasons, [ REASON ] );
	const problems = [ FAULT, MEDIA_LINE ];
	const before = summariseSurface( { client: 'a', surface: 'header', proposal: { counts: {} }, problems, realProblems: null, skeleton: [] } );
	assert.equal( before.problemCount, 2, 'with no carry-less lines the old summary took every line for a fault' );
	const c = realFaultLines( { problems, carryless: null, reasons: probe.reasons } );
	assert.equal( c.by, 'recorded lookup reasons' );
	const s = summariseSurface( { client: 'a', surface: 'header', proposal: { counts: {} }, problems, realProblems: c.lines, classifiedBy: c.by, skeleton: [] } );
	assert.deepEqual( s.problems, [ FAULT ] );
	assert.deepEqual( s.handovers, [ MEDIA_LINE ] );
	assert.equal( s.classifiedBy, 'recorded lookup reasons' );
	assert.equal( compareSweeps( { surfaces: { 'a/header': sum( 'a/header', [ FAULT ] ) }, nodes: {} }, { surfaces: { 'a/header': s }, nodes: {} } ).ok, true );
} );

test( 'realFaultLines takes the carry-less lines when there are some, and a line that merely looks like a hand-over stays real when no lookup said it', () => {
	assert.deepEqual( realFaultLines( { problems: [ FAULT, MEDIA_LINE ], carryless: [ FAULT ], reasons: [] } ), { lines: [ FAULT ], by: 'carry-less run' } );
	const other = 'Root/4#0: no logoSource is carried: some other reason no lookup gave';
	assert.deepEqual( realFaultLines( { problems: [ other ], carryless: null, reasons: [ REASON ] } ).lines, [ other ] );
	assert.deepEqual( realFaultLines( { problems: [ FAULT ], carryless: null } ).lines, [ FAULT ] );
} );

// The default looks (lib/setting-record.mjs::prepareLooks): the propose reads each block's default look for the client, and
// a block without one is proposed with no default paint. Before 2026-11-23 the sweep read the frozen calibration cache, so it
// never built a look and, with none on disk, proposed every block without one and said so only in its log.
test( 'MUST FAIL: a surface proposed with a block that has no default look, where the baseline had one, fails the comparison', () => {
	const before = { surfaces: { 'a/header': sum( 'a/header', [ 'p' ], { withoutLook: [] } ) }, nodes: {} };
	const after = { surfaces: { 'a/header': sum( 'a/header', [ 'p' ], { withoutLook: [ 'sgs/site-header' ] } ) }, nodes: {} };
	const cmp = compareSweeps( before, after );
	assert.equal( cmp.ok, false );
	assert.match( cmp.failures[ 0 ], /a\/header: proposed without the default look of sgs\/site-header/ );
	assert.equal( compareSweeps( after, JSON.parse( JSON.stringify( after ) ) ).ok, true, 'a block the baseline also lacked a look for is no new failure' );
	assert.equal( compareSweeps( { surfaces: { 'a/header': sum( 'a/header', [ 'p' ] ) }, nodes: {} }, before ).ok, true, 'a baseline from before the count was kept reads as none' );
} );

test( 'MUST FAIL: summariseSurface keeps the blocks proposed without a default look, and the sweep table counts them', () => {
	const s = summariseSurface( { client: 'a', surface: 'header', proposal: { counts: {} }, problems: [], skeleton: [], withoutLook: [ 'sgs/trust-bar', 'sgs/site-header' ] } );
	assert.deepEqual( s.withoutLook, [ 'sgs/site-header', 'sgs/trust-bar' ] );
	const text = formatSweep( { surfaces: { 'a/header': s } } );
	assert.match( text, /no default look/ );
	assert.match( text, /a\/header \| 0 \| 0 \| 0 \| - \| 2/ );
} );

test( 'MUST FAIL: the sweep builds one probe block per client before the propose, with the build on, never every block', () => {
	const calls = [];
	const prepare = ( blocks, client, opts ) => ( calls.push( { blocks, client, build: opts.build, log: opts.log } ), [] );
	const log = ( m ) => m;
	probeSweepLooks( { clients: [ 'a', 'b' ], prepare, log } );
	assert.deepEqual( calls.map( ( c ) => [ c.client, c.build, c.blocks ] ), [ [ 'a', true, [ PROBE_BLOCK ] ], [ 'b', true, [ PROBE_BLOCK ] ] ] );
	assert.ok( calls.every( ( c ) => c.log === log ), 'the words of the builder reach the log of the sweep' );
} );

test( 'MUST FAIL: a look builder that cannot build the probe stops the sweep before any propose', () => {
	const calls = [];
	const none = ( blocks, client ) => ( calls.push( client ), blocks );
	assert.throws( () => probeSweepLooks( { clients: [ 'a', 'b' ], prepare: none } ), /no default look could be built for a: the look builder itself fails/ );
	assert.deepEqual( calls, [ 'a' ], 'it stops at the first client' );
} );

test( 'MUST FAIL: the workers of a sweep build each look the first time a stage reads it, with no site', () => {
	const env = sweepWorkerEnv( { PATH: 'p', TMP: 'E:/t' }, 'C:/fallback' );
	assert.equal( env.SGS_LOOK_BUILD, '1' );
	assert.equal( env.SGS_NO_SITE, '1' );
	assert.equal( lookBuildOn( env ), true, 'on, though SGS_NO_SITE is set' );
	assert.equal( lookBuildOn( { SGS_NO_SITE: '1' } ), false, 'negative control: the route tests build nothing' );
	assert.equal( lookBuildOn( {} ), true );
	assert.deepEqual( [ env.PATH, env.TMP, env.TEMP ], [ 'p', 'E:/t', 'C:/fallback' ] );
} );

test( 'MUST FAIL: a baseline written before the look count was kept is no evidence of a lost look, and a lost look fails a surface that is otherwise better', () => {
	const old = { surfaces: { 'a/header': sum( 'a/header', [ 'p' ] ) }, nodes: {} };
	const after = { surfaces: { 'a/header': sum( 'a/header', [ 'p' ], { withoutLook: [ 'sgs/whatsapp-cta' ] } ) }, nodes: {} };
	assert.equal( compareSweeps( old, after ).ok, true, 'no withoutLook in the baseline: the look check is skipped' );
	const before = { surfaces: { 'a/header': sum( 'a/header', [ 'p', 'q' ], { withoutLook: [] } ) }, nodes: {} };
	const cmp = compareSweeps( before, after );
	assert.equal( cmp.ok, false );
	assert.equal( cmp.rows[ 0 ].status, 'WORSE', 'one fault fewer does not hide a lost look' );
} );

test( 'MUST FAIL: the sweep reads the route of a surface and serves its draft with the code of the checkout under test, not its own', async () => {
	const repo = tmp();
	put( path.join( repo, 'scripts', 'computed-route', 'site-run.mjs' ), 'export const surfaceReach = () => ( { hash: "#/from-repo" } );' );
	put( path.join( repo, 'scripts', 'computed-route', 'lib', 'draft.mjs' ), [ 'export const assertDraftPage = ( f ) => f;', 'export const serveDraft = async () => ( { url: "http://served-by-repo/", close: async () => { globalThis.__served = "closed"; } } );' ].join( String.fromCharCode( 10 ) ) );
	const site = path.join( repo, 'sites', 'x' );
	const routed = await fillReach( { repo, site, surface: 's', entry: { draftRoute: '/contact', draftIndex: 'i.html' } } );
	assert.deepEqual( routed.read, { draftUrl: 'http://served-by-repo/#/from-repo' } );
	await routed.close();
	assert.equal( globalThis.__served, 'closed' );
	const plain = await fillReach( { repo, site, surface: 's', entry: {} } );
	assert.deepEqual( plain.read, { draftDir: path.join( site, 'handoff' ) } );
} );

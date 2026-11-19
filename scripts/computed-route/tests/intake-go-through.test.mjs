// Spec 48 FR-48-17, `intake.mjs --apply-review <client> --go-through` (Bean, 2026-11-18: "a clone goes through by
// default"): a row with no mark of its own and no Accept all takes its proposal as its mark, recorded as `by:
// 'go-through'`; Bean's own mark on a row always wins, now and on a later apply; a row with no proposal to take is
// listed in go-through-open.json and does not block. Without the flag an unmarked row still fails the apply.
// In-memory fixture and a scratch repository in the OS temp folder: no real intake, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { renderReview, parseReview, applyReview, carryOver, reviewRows, withDefaultsLine, defaultsLine, DEFAULTED, OPEN_CAUSES } from '../lib/intake-review.mjs';
import { withUnappliedMarks } from '../lib/intake-review-carry.mjs';
import { intoIntake } from '../lib/intake-palette-into.mjs';
import { reviewDecisions } from '../lib/intake-run-finalise.mjs';
import { applyIntakeReview, parseArgs, pathsFor, recordProblems } from '../lib/intake-run.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const TODAY = '2026-11-19';
const LATER = '2026-11-20';
const CLIENT = 'fx-go';

const skRow = ( surface, key, over = {} ) => ( { rowId: `skeleton:${ surface }:${ key }`, key, tag: 'p', words: key, block: 'sgs/text', confidence: 0.9, low: false, reason: null, candidates: [ { block: 'sgs/text', score: 0.9, share: 1 } ], action: null, snippet: `<p>${ key }</p>`, draftId: `Site:${ key }`, ...over } );
const fixture = () => {
	const intake = {
		schemaVersion: '1', client: CLIENT, takenOn: '2026-11-01T09:00:00Z',
		manifest: { schema_version: '1.0', files: { 'Site.dc.html': 'a'.repeat( 64 ) } },
		tools: { playwright: '1.50.0', browser: 'chromium 133', runtime: 'support.js 1' }, harness: { clock: '2026-01-05T10:00:00.000Z', seed: 1, stepMs: 16 },
		census: [], inventory: { animations: null, surfaces: null, diff: [ { rowId: 'inventory:hero', draftId: 'hero', field: 'duration', ours: '600ms', theirs: '400ms' } ] },
		routing: { adapter: 'hash', routes: [], links: [] }, breakpoints: [],
		pageMap: [
			{ route: '#/', slug: 'home', title: 'Home', parent: null, template: null, postType: 'page', collection: 'static', id: null },
			{ route: '#/about', slug: 'about', title: 'About', parent: null, template: null, postType: 'page', collection: 'static', id: null },
		],
		palette: { tokens: [], unused: [], oneOff: [], rows: [
			{ rowId: 'palette:brand', token: 'brand', hex: '#aa3300', role: 'primary', confidence: 'high', why: 'name says brand' },
			{ rowId: 'palette:social', token: 'social', hex: '#3b5998', role: null, confidence: 'high', why: 'social colours have no palette slug' },
		] },
		siteInfo: { refused: [], rows: [
			{ rowId: 'siteinfo:phone', key: 'phone', value: '0121 000 0000', normalised: '+441210000000', sources: [], valid: true, reason: null },
			{ rowId: 'siteinfo:email', key: 'email', value: '', normalised: '', sources: [], valid: true, reason: null },
			{ rowId: 'siteinfo:vat', key: 'vat_number', value: 'GB12', normalised: 'GB12', sources: [], valid: false, reason: 'not nine digits' },
		] },
		flags: [ { rowId: 'flag:placeholder:Hero:3', kind: 'placeholder', draftId: 'Hero:3', text: 'Lorem ipsum', why: 'filler', source: 'template' } ],
		draftDefects: [ { rowId: 'defect:Nav:2', draftId: 'Nav:2', text: 'aria-expanded never flips', why: 'handler sets state but no binding' } ],
		notDefects: [ { draftId: 'Nav:js:3:2', censusId: 'handler@Nav:js:3:2', why: 'dead-code', note: 'closeAll is reached only through renderVals key onClose, which no template binding references' } ],
		missingFeatures: [
			{ rowId: 'missing:Map:1', draftId: 'Map:1', construct: 'store map', from: 'census', block: 'sgs/container', mainFlow: null, why: 'a map embed' },
			{ rowId: 'missing:Quiz:1', draftId: 'Quiz:1', construct: 'flavour quiz', from: 'census', mainFlow: true, why: 'a quiz on the order path' },
		],
		skeletons: { header: { rows: [
			skRow( 'header', 'confident' ),
			skRow( 'header', 'low', { block: 'sgs/heading', confidence: 0.4, low: true } ),
			skRow( 'header', 'picked', { block: 'sgs/container', confidence: 0.8, finalisedBy: 'agent', reason: 'a wrapper', original: { block: null, action: 'unresolved', confidence: 0, low: true, reason: 'no block fits', candidates: [] } } ),
			skRow( 'header', 'unresolved', { block: null, confidence: 0, low: true, candidates: [], action: 'unresolved', reason: 'no block fits this element' } ),
			skRow( 'header', 'absorbed', { block: null, action: 'absorbed', confidence: 1, reason: 'drawn by sgs/container' } ),
		] } },
		notices: { prose: [ { rowId: 'prose:README.md:7', file: 'README.md', line: 7, text: 'run npm install', why: 'starts with npm' } ], blockedHosts: [] },
		gaps: [], review: [],
	};
	intake.review = carryOver( null, intake ).review;
	return intake;
};

const ALL = reviewRows( fixture() );
const OPEN_IDS = [ 'palette:social', 'siteinfo:email', 'siteinfo:vat', 'missing:Quiz:1', 'skeleton:header:unresolved' ];
const byId = ( review ) => Object.fromEntries( review.map( ( r ) => [ r.rowId, r ] ) );
const tick = ( md, types ) => types.reduce( ( m, t ) => m.replace( new RegExp( `(\\(${ t }\\)\\n\\nAccept all: )\\[ \\]` ), '$1[x]' ), md );
const cellMark = ( md, id, mark ) => md.split( '\n' ).map( ( l ) => ( l.startsWith( `| \`${ id }\` |` ) ? l.replace( /\|[^|]*\|$/, `| ${ mark } |` ) : l ) ).join( '\n' );
const go = ( intake, md, over = {} ) => applyReview( intake, md, { today: TODAY, goThrough: true, ...over } );

test( 'the fixture is a valid record and holds every case: confident, low, agent-picked and unresolved skeleton rows, rows with and without a proposal', () => {
	assert.deepEqual( recordProblems( fixture() ), [] );
	assert.deepEqual( ALL.filter( ( r ) => r.open ).map( ( r ) => r.rowId ).sort(), [ ...OPEN_IDS ].sort(), 'exactly the rows with no proposal are open' );
	assert.ok( ALL.some( ( r ) => 'flag' === r.rowType ) && ALL.some( ( r ) => 'not-a-defect' === r.rowType ) && ALL.some( ( r ) => 'notice' === r.rowType ) );
} );

test( 'MUST FAIL: without --go-through an unmarked row still fails the apply (negative control), with it nothing blocks', () => {
	const md = renderReview( fixture() );
	const plain = applyReview( fixture(), md, { today: TODAY } );
	const unmarked = ALL.filter( ( r ) => ! DEFAULTED.includes( r.rowType ) );
	assert.deepEqual( plain.missing.map( ( m ) => m.rowId ).sort(), unmarked.map( ( r ) => r.rowId ).sort(), 'every row that needs a mark is refused' );
	assert.deepEqual( plain.open, [] );
	assert.ok( plain.intake.review.every( ( r ) => ! ( 'by' in r ) ) );
	const r = go( fixture(), md );
	assert.deepEqual( r.problems, [] );
	assert.deepEqual( r.missing, [], 'nothing blocks' );
	assert.equal( r.taken.length, unmarked.length - OPEN_IDS.length );
} );

test( 'MUST FAIL: a defaulted row gets exactly the mark Accept all gives it, dated today and recorded as by go-through; the row type defaults carry no `by`', () => {
	const md = renderReview( fixture() );
	const ticked = applyReview( fixture(), tick( md, [ 'page-map', 'palette-role', 'site-info', 'draft-defect', 'missing-feature', 'skeleton-block', 'inventory-diff', 'notice' ] ), { today: TODAY } );
	assert.deepEqual( ticked.problems, [] );
	const r = go( fixture(), md );
	const got = byId( r.intake.review );
	const want = byId( ticked.intake.review );
	for ( const row of ALL.filter( ( x ) => ! x.open && ! DEFAULTED.includes( x.rowType ) ) ) {
		assert.equal( got[ row.rowId ].mark, want[ row.rowId ].mark, `${ row.rowId } takes what Accept all gives it` );
		assert.equal( got[ row.rowId ].mark, row.acceptAll );
		assert.equal( got[ row.rowId ].by, 'go-through', row.rowId );
		assert.equal( got[ row.rowId ].markedOn, TODAY );
		assert.equal( got[ row.rowId ].carriedFrom, null );
		assert.equal( got[ row.rowId ].contentHash, row.contentHash, 'the hash is the row\'s own: carry-over is unchanged' );
	}
	assert.equal( got[ 'missing:Map:1' ].mark, 'map:sgs/container' );
	assert.equal( got[ 'skeleton:header:picked' ].mark, 'accept' );
	for ( const row of ALL.filter( ( x ) => DEFAULTED.includes( x.rowType ) ) ) {
		assert.ok( got[ row.rowId ].mark, row.rowId );
		assert.ok( ! ( 'by' in got[ row.rowId ] ), `${ row.rowId }: the row type's own default is not a go-through default` );
	}
	assert.deepEqual( recordProblems( r.intake ), [], 'the marked record validates against the schema' );
} );

test( 'MUST FAIL: Bean\'s own mark in a Mark cell is kept and never overwritten, and a ticked Accept all is Bean\'s, not a default', () => {
	let md = renderReview( fixture() );
	md = cellMark( md, 'skeleton:header:confident', 'block:sgs/heading' );
	md = cellMark( md, 'page:page:about', 'drop' );
	md = cellMark( md, 'palette:brand', 'role:accent' );
	md = tick( md, [ 'site-info' ] );
	const r = go( fixture(), md );
	const got = byId( r.intake.review );
	assert.deepEqual( [ got[ 'skeleton:header:confident' ].mark, got[ 'page:page:about' ].mark, got[ 'palette:brand' ].mark ], [ 'block:sgs/heading', 'drop', 'role:accent' ] );
	[ 'skeleton:header:confident', 'page:page:about', 'palette:brand', 'siteinfo:phone' ].forEach( ( id ) => assert.ok( ! ( 'by' in got[ id ] ), `${ id } is Bean's` ) );
	assert.equal( got[ 'siteinfo:phone' ].mark, 'accept', 'the tick stands' );
	assert.equal( got[ 'siteinfo:email' ].mark, 'accept', 'a tick marks a row with an empty value as it always did' );
	assert.ok( ! r.taken.includes( 'siteinfo:phone' ) && ! r.open.some( ( o ) => 'site-info' === o.rowType ), 'a ticked section has no open row' );
	assert.equal( got[ 'page:page:home' ].by, 'go-through', 'an unmarked row beside Bean\'s marks still takes the default' );
} );

test( 'MUST FAIL: a mark that is refused is a problem still, never replaced by a default', () => {
	const r = go( fixture(), cellMark( cellMark( renderReview( fixture() ), 'page:page:about', 'edit:nonsense=1' ), 'missing:Quiz:1', 'bogus' ) );
	assert.ok( r.problems.some( ( p ) => /page:page:about: mark "edit:nonsense=1" refused/.test( p ) ) );
	assert.deepEqual( r.missing.map( ( m ) => m.rowId ).sort(), [ 'missing:Quiz:1', 'page:page:about' ], 'a refused row is a failure, not open and not defaulted, even one that has no proposal' );
	assert.ok( ! r.open.some( ( o ) => 'missing:Quiz:1' === o.rowId ) );
	assert.equal( byId( r.intake.review )[ 'page:page:about' ].mark, null );
} );

test( 'MUST FAIL: Bean\'s mark on a later apply wins over the default, the other defaults keep their first date, and Bean\'s earlier mark survives a blank cell', () => {
	const first = go( fixture(), renderReview( fixture() ) );
	const second = go( first.intake, cellMark( renderReview( first.intake ), 'page:page:about', 'drop' ), { today: LATER } );
	const got = byId( second.intake.review );
	assert.equal( got[ 'page:page:about' ].mark, 'drop' );
	assert.ok( ! ( 'by' in got[ 'page:page:about' ] ) );
	assert.equal( got[ 'page:page:about' ].markedOn, LATER );
	assert.equal( got[ 'page:page:home' ].by, 'go-through' );
	assert.equal( got[ 'page:page:home' ].markedOn, TODAY, 'an unchanged default keeps its first date' );
	assert.equal( second.taken.length, first.taken.length - 1, 'the row Bean marked is no longer a default' );
	// Bean's mark is in intake.json but the cell is blank (a hand-edited review.md): the default does not replace it.
	const bean = go( second.intake, renderReview( { ...second.intake, review: [] } ), { today: LATER } );
	assert.equal( byId( bean.intake.review )[ 'page:page:about' ].mark, 'drop', 'Bean\'s earlier mark stands' );
	assert.ok( ! ( 'by' in byId( bean.intake.review )[ 'page:page:about' ] ) );
	assert.equal( byId( bean.intake.review )[ 'page:page:about' ].markedOn, LATER );
	// A changed row drops its mark and so its default, which is taken again from the new proposal.
	const changed = fixture();
	changed.pageMap[ 1 ] = { ...changed.pageMap[ 1 ], title: 'About us' };
	const third = go( { ...changed, review: carryOver( first.intake, changed ).review }, renderReview( changed ), { today: LATER } );
	assert.equal( byId( third.intake.review )[ 'page:page:about' ].markedOn, LATER );
	assert.equal( byId( third.intake.review )[ 'page:page:about' ].by, 'go-through' );
} );

test( 'MUST FAIL: a row with no proposal is open: listed with why and downstream, not marked, not blocking; without the flag it is a failure', () => {
	const r = go( fixture(), renderReview( fixture() ) );
	assert.deepEqual( r.open.map( ( o ) => o.rowId ).sort(), [ ...OPEN_IDS ].sort() );
	const got = byId( r.intake.review );
	for ( const o of r.open ) {
		assert.equal( got[ o.rowId ].mark, null, `${ o.rowId } is not marked` );
		assert.ok( ! ( 'by' in got[ o.rowId ] ) );
		assert.ok( o.why.length > 20 && o.downstream.length > 40, `${ o.rowId } says why and what happens downstream` );
		assert.ok( ! r.taken.includes( o.rowId ) );
	}
	assert.match( r.open.find( ( o ) => 'siteinfo:vat' === o.rowId ).why, /not nine digits/, 'a refused Site Info value names intake\'s reason' );
	assert.deepEqual( Object.values( OPEN_CAUSES ).map( ( c ) => c.why ).length, 5 );
	const plain = applyReview( fixture(), renderReview( fixture() ), { today: TODAY } );
	OPEN_IDS.forEach( ( id ) => assert.ok( plain.missing.some( ( m ) => m.rowId === id ), `${ id } fails a plain apply` ) );
	// Bean marks an open row: it is no longer open.
	const marked = go( fixture(), cellMark( renderReview( fixture() ), 'missing:Quiz:1', 'difference' ) );
	assert.ok( ! marked.open.some( ( o ) => 'missing:Quiz:1' === o.rowId ) );
	assert.equal( byId( marked.intake.review )[ 'missing:Quiz:1' ].mark, 'difference' );
} );

test( 'MUST FAIL: the downstream text is true of the consumers: an unmarked palette row fills no slot, an unmarked or empty Site Info row is not applied, an unresolved skeleton row saves no decision', () => {
	const r = go( fixture(), renderReview( fixture() ) );
	const decisions = reviewDecisions( r.intake, TODAY );
	assert.deepEqual( decisions.map( ( d ) => d.element.key ), [ 'picked' ], 'only the accepted finaliser pick is saved; the unresolved row saves nothing' );
	assert.match( decisions[ 0 ].reason, /^Taken by default \(--go-through\), not Bean's mark, in the intake review on 2026-11-19: a wrapper/ );
	const ticked = applyReview( fixture(), tick( renderReview( fixture() ), [ 'skeleton-block' ] ), { today: TODAY } );
	assert.match( reviewDecisions( ticked.intake, TODAY )[ 0 ].reason, /^Bean accepted the finaliser's pick in the intake review on/ );
	const dir = path.join( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'scripts' );
	const py = [ 'import sys, json', `sys.path.insert(0, ${ JSON.stringify( path.join( dir, 'theme-extractor' ) ) })`, `sys.path.insert(0, ${ JSON.stringify( dir ) })`,
		'import confirmed_palette as c, site_info_intake as s', 'intake = json.load(sys.stdin)',
		'marked = c.effective_marks(intake, {"primary"})', 'by = {e["rowId"]: e["mark"] for e in marked["review"] if e["rowType"] == "palette-role"}',
		'rows = {r["token"]: r for r in intake["palette"]["rows"]}', 'slugs = {t: c._mark_slugs(t, by[f"palette:{t}"], rows[t]) for t in rows}',
		'import tempfile, pathlib', 'p = pathlib.Path(tempfile.mkdtemp()) / "intake.json"', 'p.write_text(json.dumps(intake))', 'entries, refused = s.read_intake(p)',
		'print(json.dumps({"slugs": slugs, "applied": [e["ref"] for e in entries], "refused": {r["rowId"]: r["reason"] for r in refused}}))' ].join( '\n' );
	const run = spawnSync( 'python', [ '-c', py ], { input: JSON.stringify( r.intake ), encoding: 'utf8' } );
	if ( 0 !== run.status ) {
		assert.fail( `the python consumers did not run: ${ run.error?.message || run.stderr }` );
	}
	const out = JSON.parse( run.stdout );
	assert.deepEqual( out.slugs, { brand: [ 'primary' ], social: [] }, 'the open palette row fills no slot; the defaulted row fills its proposed role' );
	assert.deepEqual( out.applied, [ 'siteinfo:phone' ], 'only the defaulted Site Info row is written' );
	assert.match( out.refused[ 'siteinfo:email' ], /not marked in review/ );
	assert.match( out.refused[ 'siteinfo:vat' ], /not marked in review/ );
	// Marked accept (a ticked section), the same rows are still refused for the reasons the open file gives.
	const accepted = applyReview( fixture(), tick( renderReview( fixture() ), [ 'site-info' ] ), { today: TODAY } );
	const run2 = spawnSync( 'python', [ '-c', py ], { input: JSON.stringify( accepted.intake ), encoding: 'utf8' } );
	assert.equal( run2.status, 0, run2.stderr );
	const out2 = JSON.parse( run2.stdout );
	assert.match( out2.refused[ 'siteinfo:email' ], /row holds no text value/ );
	assert.match( out2.refused[ 'siteinfo:vat' ], /intake refused it: not nine digits/ );
} );

test( 'MUST FAIL: a default mark is not shown in the Mark cell, carries across a re-export as any mark does and is dropped with a changed row', () => {
	const r = go( fixture(), renderReview( fixture() ) );
	const md = renderReview( r.intake );
	const p = parseReview( md );
	assert.deepEqual( p.problems, [] );
	assert.ok( ! ( 'page:page:home' in p.rowMarks ), 'a default is not a mark Bean wrote' );
	assert.equal( p.rowMarks[ 'flag:placeholder:Hero:3' ], 'accept-flagged', 'a row type default is shown as before' );
	const carried = carryOver( r.intake, fixture() );
	const got = byId( carried.review );
	assert.equal( got[ 'page:page:home' ].by, 'go-through' );
	assert.equal( got[ 'page:page:home' ].carriedFrom, '2026-11-01T09:00:00Z' );
	assert.equal( got[ 'page:page:home' ].markedOn, TODAY );
	assert.ok( ! ( 'by' in got[ 'flag:placeholder:Hero:3' ] ) );
	const edited = fixture();
	edited.pageMap[ 0 ] = { ...edited.pageMap[ 0 ], title: 'Welcome' };
	const re = byId( carryOver( r.intake, edited ).review );
	assert.equal( re[ 'page:page:home' ].mark, null );
	assert.ok( ! ( 'by' in re[ 'page:page:home' ] ) && true === re[ 'page:page:home' ].changed );
	// An unapplied cell mark Bean typed before the re-export is carried onto an unmarked row as his own.
	const withCell = cellMark( md, 'palette:social', 'one-off' );
	const kept = withUnappliedMarks( r.intake, withCell, { day: LATER } );
	assert.deepEqual( kept.carried, [ 'palette:social' ] );
	assert.ok( ! ( 'by' in byId( kept.intake.review )[ 'palette:social' ] ) );
	// A palette-only regeneration keeps a default as a default.
	const into = intoIntake( { intake: r.intake, reviewMd: md, palette: fixture().palette, client: CLIENT, takenOn: r.intake.takenOn } );
	assert.equal( byId( into.intake.review )[ 'palette:brand' ].by, 'go-through' );
	assert.ok( ! parseReview( into.reviewMd ).rowMarks[ 'palette:brand' ], 'and does not show it as Bean\'s mark' );
} );

test( 'MUST FAIL: review.md gains one "Taken by default" line at the top, set in place, removed at zero, and no hash or other line moves', () => {
	const r = go( fixture(), renderReview( fixture() ) );
	const n = r.taken.length;
	const line = defaultsLine( n );
	const stale = { ...r.intake, review: [ ...r.intake.review, { rowId: 'page:page:gone', rowType: 'page-map', contentHash: 'x', mark: 'accept', markedOn: TODAY, carriedFrom: null, by: 'go-through' } ] };
	assert.equal( renderReview( stale ).split( '\n' )[ 2 ], line, 'an entry whose row is gone is not counted' );
	assert.match( line, new RegExp( `^Taken by default: ${ n } rows had no mark from Bean and took their proposal` ) );
	assert.match( line, /a mark Bean writes there overrides the default/ );
	const rendered = renderReview( r.intake ).split( '\n' );
	assert.equal( rendered[ 0 ], '# Intake review: fx-go' );
	assert.equal( rendered[ 2 ], line, 'the line is the first paragraph after the title' );
	assert.ok( rendered[ 4 ].startsWith( 'Taken on ' ) );
	assert.ok( ! renderReview( fixture() ).includes( 'Taken by default' ), 'a record with no default has no line' );
	const base = renderReview( fixture() );
	const once = withDefaultsLine( base, r.intake );
	assert.equal( once.split( '\n' )[ 2 ], line );
	assert.equal( withDefaultsLine( once, r.intake ), once, 'setting it again changes nothing' );
	assert.equal( withDefaultsLine( once, fixture() ), base, 'a record with no default removes it and leaves the file as it was' );
	assert.equal( once.replace( `${ line }\n\n`, '' ), base, 'nothing else in the file changes' );
	assert.equal( withDefaultsLine( base.replace( /\n/g, '\r\n' ), r.intake ).split( '\r\n' )[ 2 ], line, 'a CRLF file keeps its line endings' );
	const hashes = ( md ) => parseReview( md ).rowSection;
	assert.deepEqual( hashes( once ), hashes( base ), 'every row is still read back' );
	assert.deepEqual( parseReview( once ).problems, [] );
} );

function scratch( intake = fixture(), md = renderReview( intake ) ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'go-through-' ) );
	const at = pathsFor( repo, CLIENT );
	fs.mkdirSync( at.dir, { recursive: true } );
	fs.writeFileSync( at.intake, `${ JSON.stringify( intake, null, 1 ) }\n` );
	fs.writeFileSync( at.review, md );
	return { repo, at };
}
const quiet = ( lines = [] ) => ( { log: ( l ) => lines.push( l ), today: TODAY, knownBlock: () => true } );
const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );

test( 'MUST FAIL: --apply-review --go-through on a scratch copy marks every row, writes the open list, the decision, the confirmed page map and the review.md line; without the flag nothing is written', () => {
	const { repo, at } = scratch();
	try {
		const before = [ at.intake, at.review ].map( ( f ) => fs.readFileSync( f, 'utf8' ) );
		const lines = [];
		assert.equal( applyIntakeReview( { repo, client: CLIENT }, quiet( lines ) ), 1, 'without the flag an unmarked row fails the apply' );
		assert.match( lines.join( '\n' ), /needs a mark/ );
		assert.deepEqual( [ at.intake, at.review ].map( ( f ) => fs.readFileSync( f, 'utf8' ) ), before, 'a failed apply writes nothing' );
		assert.ok( ! fs.existsSync( at.goThroughOpen ) && ! fs.existsSync( at.confirmed ) );
		const out = [];
		assert.equal( applyIntakeReview( { repo, client: CLIENT, goThrough: true }, quiet( out ) ), 0, out.join( '\n' ) );
		assert.match( out.join( '\n' ), /go-through: \d+ rows took their proposal as a default mark \(by: go-through; .*\); 5 rows had no proposal to take and are open \(.*\), listed in sites[\\/]fx-go[\\/]build[\\/]intake[\\/]go-through-open\.json/ );
		const saved = readJson( at.intake );
		const entries = byId( saved.review );
		assert.equal( saved.review.length, ALL.length );
		assert.equal( saved.review.filter( ( r ) => 'go-through' === r.by ).length, ALL.length - OPEN_IDS.length - ALL.filter( ( r ) => DEFAULTED.includes( r.rowType ) ).length );
		assert.deepEqual( saved.review.filter( ( r ) => null === r.mark ).map( ( r ) => r.rowId ).sort(), [ ...OPEN_IDS ].sort() );
		const open = readJson( at.goThroughOpen );
		assert.equal( open.client, CLIENT );
		assert.equal( open.count, 5 );
		assert.deepEqual( open.rows.map( ( r ) => r.rowId ).sort(), [ ...OPEN_IDS ].sort() );
		open.rows.forEach( ( r ) => assert.deepEqual( Object.keys( r ).sort(), [ 'downstream', 'rowId', 'rowType', 'why' ] ) );
		const md = fs.readFileSync( at.review, 'utf8' );
		assert.equal( md.split( '\n' )[ 2 ], defaultsLine( saved.review.filter( ( r ) => 'go-through' === r.by ).length ) );
		assert.equal( withDefaultsLine( md, saved ), md );
		assert.equal( md.replace( /^.*Taken by default.*\n\n/m, '' ), before[ 1 ], 'only the line was added' );
		assert.ok( fs.existsSync( at.confirmed ) && 2 === readJson( at.pageMap ).length, 'the page map is confirmed with every proposed row' );
		const decisions = readJson( path.join( repo, 'sites', CLIENT, 'build', 'skeleton', 'decisions.json' ) );
		assert.match( JSON.stringify( decisions ), /Taken by default \(--go-through\)/ );
		assert.ok( ! JSON.stringify( decisions ).includes( 'Site:unresolved' ) && ! JSON.stringify( decisions ).includes( '"unresolved"' ), 'the unresolved row saved no decision' );
		assert.deepEqual( recordProblems( saved ), [] );
		assert.equal( entries[ 'skeleton:header:picked' ].by, 'go-through' );
		// Applying again keeps every date and the same open list; Bean's cell mark then wins and the open list shrinks.
		const again = [];
		assert.equal( applyIntakeReview( { repo, client: CLIENT, goThrough: true }, { ...quiet( again ), today: LATER } ), 0, again.join( '\n' ) );
		assert.deepEqual( readJson( at.intake ).review, saved.review, 'a second apply on an unchanged review changes nothing' );
		fs.writeFileSync( at.review, cellMark( cellMark( md, 'palette:social', 'one-off' ), 'page:page:about', 'drop' ) );
		assert.equal( applyIntakeReview( { repo, client: CLIENT, goThrough: true }, { ...quiet(), today: LATER } ), 0 );
		const third = byId( readJson( at.intake ).review );
		assert.deepEqual( [ third[ 'palette:social' ].mark, third[ 'page:page:about' ].mark ], [ 'one-off', 'drop' ] );
		assert.ok( ! ( 'by' in third[ 'palette:social' ] ) && ! ( 'by' in third[ 'page:page:about' ] ) );
		assert.equal( readJson( at.goThroughOpen ).count, 4, 'a row Bean marked leaves the open list' );
		assert.equal( fs.readFileSync( at.review, 'utf8' ).split( '\n' )[ 2 ], defaultsLine( readJson( at.intake ).review.filter( ( r ) => 'go-through' === r.by ).length ) );
		assert.equal( readJson( at.pageMap ).length, 1, 'Bean\'s drop is honoured on the confirmed page map' );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
} );

test( 'MUST FAIL: a sectioned go-through apply lists its own sections\' open rows and keeps the other sections\' open rows and review.md text as they were', () => {
	const { repo, at } = scratch();
	try {
		assert.equal( applyIntakeReview( { repo, client: CLIENT, goThrough: true }, quiet() ), 0 );
		const full = readJson( at.goThroughOpen );
		fs.writeFileSync( at.review, cellMark( fs.readFileSync( at.review, 'utf8' ), 'siteinfo:email', 'drop' ) );
		assert.equal( applyIntakeReview( { repo, client: CLIENT, goThrough: true, sections: [ 'site-info' ] }, quiet() ), 0 );
		const open = readJson( at.goThroughOpen );
		assert.deepEqual( open.rows.map( ( r ) => r.rowId ).sort(), full.rows.map( ( r ) => r.rowId ).filter( ( id ) => 'siteinfo:email' !== id ).sort(), 'the other sections\' rows stay listed' );
		assert.equal( byId( readJson( at.intake ).review )[ 'siteinfo:email' ].mark, 'drop' );
		assert.ok( parseReview( fs.readFileSync( at.review, 'utf8' ) ).problems.length === 0 );
	} finally {
		fs.rmSync( repo, { recursive: true, force: true } );
	}
} );

test( 'MUST FAIL: --go-through parses with --apply-review (and --section) only', () => {
	assert.equal( parseArgs( [ '--apply-review', CLIENT, '--go-through' ] ).goThrough, true );
	assert.equal( parseArgs( [ '--apply-review', CLIENT, '--section', 'site-info', '--go-through' ] ).goThrough, true );
	assert.equal( parseArgs( [ '--apply-review', CLIENT ] ).goThrough, false );
	assert.match( parseArgs( [ CLIENT, '--go-through' ] ).error, /--go-through goes with --apply-review only/ );
	assert.match( parseArgs( [ '--render', CLIENT, '--go-through' ] ).error, /--go-through goes with --apply-review only/ );
	const cli = spawnSync( process.execPath, [ path.join( HERE, '..', 'intake.mjs' ), CLIENT, '--go-through' ], { encoding: 'utf8' } );
	assert.equal( cli.status, 2 );
	assert.match( cli.stderr, /node scripts\/computed-route\/intake.mjs --apply-review <client> \[--section <row type>\[,<row type>...\]\] \[--go-through\]/ );
} );

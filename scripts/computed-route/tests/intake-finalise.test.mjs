// Spec 48 §3.4 steps 3 and 4 and FR-48-17 in the intake command (lib/intake-run-finalise.mjs, lib/intake-review.mjs):
// `--finalise` asks the finaliser agent about exactly the low-confidence and unresolved skeleton rows; `--apply-picks`
// refuses an invalid pick and writes nothing, else the pick becomes the proposal with the writer's original kept and
// every other mark carried; review.md lists the rows needing judgement before the confident ones and still reads every
// Mark cell; `--apply-review` saves only block:<slug> marks and accepted picks to the client decisions file; blocked
// requests from every sandbox merge into one row per URL and reason. Runs the CLI on a repository in the OS temp folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { renderReview, parseReview, reviewRows, carryOver, CONFIDENT_HEADING } from '../lib/intake-review.mjs';
import { recordProblems, parseArgs } from '../lib/intake-run.mjs';
import { mergeBlocked } from '../lib/intake-run-collapse.mjs';
import { intakeFinaliseRequest, reviewDecisions } from '../lib/intake-run-finalise.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const INTAKE = path.join( HERE, '..', 'intake.mjs' );
const REPO = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-intake-finalise-' ) );
const CLIENT = 'fx-final';
const DIR = path.join( REPO, 'sites', CLIENT, 'build', 'intake' );
const file = ( n ) => path.join( DIR, n );
const read = ( n ) => fs.readFileSync( file( n ), 'utf8' );
const run = ( ...args ) => {
	const r = spawnSync( process.execPath, [ INTAKE, ...args, '--repo', REPO ], { encoding: 'utf8' } );
	return { code: r.status, out: `${ r.stdout }${ r.stderr }` };
};

const row = ( surface, key, over ) => ( { rowId: `skeleton:${ surface }:${ key }`, key, tag: 'p', words: '', block: 'sgs/text', confidence: 0.9, low: false, reason: null, candidates: [ { block: 'sgs/text', score: 0.9, share: 1 } ], action: null, snippet: `<p>${ key }</p>`, draftId: `Site:${ key.replace( /\D/g, '' ) }`, ...over } );
const fixture = () => {
	const intake = {
		schemaVersion: '1', client: CLIENT, takenOn: '2026-10-12T09:00:00Z',
		manifest: { schema_version: '1.0', files: { 'Site.dc.html': 'a'.repeat( 64 ) } },
		tools: { playwright: '1.50.0', browser: 'chromium 133', runtime: 'support.js 1' }, harness: { clock: '2026-01-05T10:00:00.000Z', seed: 1, stepMs: 16 },
		census: [], inventory: { animations: null, surfaces: null, diff: [] }, routing: { adapter: 'hash', routes: [], links: [] }, breakpoints: [],
		pageMap: [ { route: '#/', slug: 'home', title: 'Home', parent: null, template: null, postType: 'page', collection: 'static', id: null } ],
		palette: { tokens: [], unused: [], oneOff: [], rows: [] }, siteInfo: { rows: [], refused: [] }, flags: [], draftDefects: [],
		missingFeatures: [
			{ rowId: 'missing:Site:9', draftId: 'Site:9', construct: 'element <div>', from: 'skeleton', key: 'Site/9#0', line: '<div>: no SGS block fits it', mainFlow: null, why: 'no block fits this element' },
			{ rowId: 'missing:Quiz:1', draftId: 'Quiz:1', construct: 'flavour quiz', from: 'census', mainFlow: true, why: 'a quiz on the order path' },
			{ rowId: 'missing:Map:1', draftId: 'Map:1', construct: 'store map', from: 'census', block: 'sgs/container', mainFlow: null, why: 'a map embed' },
		],
		skeletons: {
			header: { rows: [
				row( 'header', 'Site/2#0', { tag: 'a', words: 'Acme', block: 'sgs/container', confidence: 1 } ),
				row( 'header', 'Site/5#0', { tag: 'span', words: '0121 000 0000', confidence: 0.25, low: true } ),
				row( 'header', 'Site/9#0', { tag: 'div', block: null, confidence: 0, low: true, candidates: [], action: 'unresolved', reason: 'no block fits this element', draftId: 'Site:9' } ),
			] },
			footer: { rows: [
				row( 'footer', 'Site/12#0', { words: 'Copyright Acme', confidence: 0.8 } ),
				{ ...row( 'footer', 'Site/18', { tag: 'h2', words: 'Card', confidence: 0.5, low: true } ), copies: 3, keys: [ 'Site/18#0', 'Site/18#1', 'Site/18#2' ], draftId: 'Site:18' },
			] },
		},
		notices: { prose: [], blockedHosts: [] }, gaps: [], review: [],
	};
	intake.review = carryOver( null, intake ).review;
	return intake;
};
const write = ( intake ) => {
	fs.mkdirSync( DIR, { recursive: true } );
	fs.writeFileSync( file( 'intake.json' ), `${ JSON.stringify( intake, null, 1 ) }\n` );
	fs.writeFileSync( file( 'review.md' ), renderReview( intake ) );
	fs.rmSync( file( 'finalise-picks.json' ), { force: true } );
	fs.rmSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton' ), { recursive: true, force: true } );
};
const PICKS = {
	header: [ { key: 'Site/5#0', block: 'sgs/business-info', remove: false, attributes: {}, confidence: 0.85, reason: 'a phone number reads Site Info' },
		{ key: 'Site/9#0', block: null, remove: true, confidence: 0.9, reason: 'a decorative bar the brief added' } ],
	footer: [ { key: 'Site/18', block: 'sgs/heading', remove: false, confidence: 0.8, reason: 'a card title' } ],
};
const pick = ( picks ) => fs.writeFileSync( file( 'finalise-picks.json' ), JSON.stringify( picks ) );
const tableIds = ( md, from, to ) => md.slice( md.indexOf( from ), to ? md.indexOf( to, md.indexOf( from ) + from.length ) : undefined ).split( '\n' ).map( ( l ) => /^\| `([^`]+)` \|/.exec( l )?.[ 1 ] ).filter( Boolean );

test.after( () => fs.rmSync( REPO, { recursive: true, force: true } ) );

test( 'the fixture record is schema-valid; the new modes parse and take only the client', () => {
	assert.deepEqual( recordProblems( fixture() ), [] );
	assert.equal( parseArgs( [ '--finalise', 'fx' ] ).mode, 'finalise' );
	assert.equal( parseArgs( [ '--apply-picks', 'fx' ] ).mode, 'apply-picks' );
	assert.equal( parseArgs( [ '--render', 'fx' ] ).mode, 'render' );
	assert.match( parseArgs( [ '--render', 'fx', '--surfaces', 'a' ] ).error, /--render takes only the client/ );
	assert.match( parseArgs( [ '--render', '--finalise', 'fx' ] ).error, /one mode only/ );
} );

test( 'MUST FAIL: --finalise asks about exactly the low-confidence and unresolved rows, in finaliseRequest\'s shape', () => {
	write( fixture() );
	const r = run( '--finalise', CLIENT );
	assert.equal( r.code, 0, r.out );
	assert.match( r.out, /3 low-confidence or unresolved skeleton rows on 2 surfaces/ );
	assert.match( r.out, /dispatch an agent with scripts\/computed-route\/prompts\/skeleton-finaliser\.md to write .*finalise-picks\.json/ );
	const req = JSON.parse( read( 'finalise-request.json' ) );
	assert.deepEqual( Object.fromEntries( Object.entries( req.surfaces ).map( ( [ s, x ] ) => [ s, x.rows.map( ( y ) => y.key ) ] ) ), { header: [ 'Site/5#0', 'Site/9#0' ], footer: [ 'Site/18' ] } );
	const phone = req.surfaces.header.rows[ 0 ];
	assert.deepEqual( Object.keys( req.surfaces.header ).sort(), [ 'answerShape', 'generated', 'prompt', 'rows', 'source', 'surface' ] );
	assert.equal( phone.element.words, '0121 000 0000' );
	assert.deepEqual( phone.siblings, [] );
	assert.deepEqual( phone.neighbours.map( ( n ) => n.key ), [ 'Site/2#0', 'Site/9#0' ] );
	assert.deepEqual( req.surfaces.footer.rows[ 0 ].keys, [ 'Site/18#0', 'Site/18#1', 'Site/18#2' ] );
	const done = { ...fixture() };
	done.skeletons.header.rows[ 1 ] = { ...done.skeletons.header.rows[ 1 ], finalisedBy: 'agent' };
	assert.equal( intakeFinaliseRequest( done ).counts.rows, 2, 'a row the finaliser already picked is not asked again' );
} );

test( 'MUST FAIL: an invalid pick is refused, naming it, and nothing is written', () => {
	write( fixture() );
	assert.equal( run( '--finalise', CLIENT ).code, 0 );
	const before = [ read( 'intake.json' ), read( 'review.md' ) ];
	for ( const [ bad, why ] of [
		[ { ...PICKS, footer: [ { key: 'Site/18', block: 'sgs/not-a-block', confidence: 0.8, reason: 'x' } ] }, /footer Site\/18: sgs\/not-a-block is not a block in the framework database/ ],
		[ { ...PICKS, footer: [ { key: 'Site/12#0', block: 'sgs/text', confidence: 0.8, reason: 'x' } ] }, /footer Site\/12#0: not a row of the finalise request/ ],
		[ { ...PICKS, header: [ { key: 'Site/5#0', confidence: 0.8, reason: 'x' } ] }, /header Site\/5#0: names neither a block nor remove/ ],
		[ [ PICKS.header ], /finalise-picks\.json must be/ ],
	] ) {
		pick( bad );
		const r = run( '--apply-picks', CLIENT );
		assert.equal( r.code, 1, r.out );
		assert.match( r.out, why );
		assert.match( r.out, /nothing written/ );
		assert.deepEqual( [ read( 'intake.json' ), read( 'review.md' ) ], before );
	}
} );

test( 'MUST FAIL: applied picks become the proposal with the original kept, and every other mark carries', () => {
	const intake = fixture();
	intake.review = intake.review.map( ( r ) => ( [ 'skeleton:header:Site/2#0', 'skeleton:header:Site/5#0' ].includes( r.rowId ) ? { ...r, mark: 'accept', markedOn: '2026-10-11' } : r ) );
	write( intake );
	assert.equal( run( '--finalise', CLIENT ).code, 0 );
	pick( PICKS );
	const r = run( '--apply-picks', CLIENT );
	assert.equal( r.code, 0, r.out );
	assert.match( r.out, /3 picks applied \(0 request rows left as proposed\), 1 missing-feature rows carry the pick/ );
	const after = JSON.parse( read( 'intake.json' ) );
	assert.deepEqual( recordProblems( after ), [] );
	const phone = after.skeletons.header.rows[ 1 ];
	assert.equal( phone.block, 'sgs/business-info' );
	assert.equal( phone.finalisedBy, 'agent' );
	assert.equal( phone.low, false );
	assert.deepEqual( [ phone.original.block, phone.original.confidence, phone.original.low ], [ 'sgs/text', 0.25, true ] );
	const blob = after.skeletons.header.rows[ 2 ];
	assert.deepEqual( [ blob.block, blob.action, blob.original.action ], [ null, 'remove', 'unresolved' ] );
	assert.deepEqual( after.missingFeatures[ 0 ].resolvedByPick, { surface: 'header', key: 'Site/9#0', remove: true } );
	const marks = Object.fromEntries( after.review.map( ( x ) => [ x.rowId, x.mark ] ) );
	assert.equal( marks[ 'skeleton:header:Site/2#0' ], 'accept', 'an untouched row keeps its mark' );
	assert.equal( marks[ 'skeleton:header:Site/5#0' ], null, 'a picked row loses the mark given to the old proposal' );
	const md = read( 'review.md' );
	assert.match( md, /\| `skeleton:header:Site\/2#0` \|[^\n]*\| accept \|$/m, 'the carried mark shows in the re-rendered Mark cell' );
	assert.match( md, /\| `skeleton:header:Site\/5#0` \| [^|]+ \| block:sgs\/business-info \| agent pick 0\.85: a phone number reads Site Info; was block:sgs\/text 0\.25 \|  \|/ );
	assert.deepEqual( tableIds( md, '### header', `### header: ${ CONFIDENT_HEADING }` ), [ 'skeleton:header:Site/5#0', 'skeleton:header:Site/9#0' ], 'finaliser picks are listed with the rows needing judgement' );
	assert.equal( run( '--apply-picks', CLIENT ).code, 1, 'picks already applied are not applied twice' );
} );

test( 'MUST FAIL: review.md lists rows needing judgement first, the confident ones under their own sub-heading, and still reads every Mark cell', () => {
	const intake = fixture();
	const md = renderReview( intake );
	assert.deepEqual( tableIds( md, '### header', `### header: ${ CONFIDENT_HEADING }` ), [ 'skeleton:header:Site/9#0', 'skeleton:header:Site/5#0' ], 'unresolved, then low' );
	assert.deepEqual( tableIds( md, `### header: ${ CONFIDENT_HEADING }`, '### ' ), [ 'skeleton:header:Site/2#0' ] );
	assert.deepEqual( tableIds( md, '## Missing features', `### ${ CONFIDENT_HEADING }` ), [ 'missing:Quiz:1', 'missing:Site:9' ], 'main flow, then rows Accept all cannot mark' );
	assert.deepEqual( tableIds( md, `### ${ CONFIDENT_HEADING }`, '## ' ), [ 'missing:Map:1' ] );
	assert.match( md, /^Rows: 9; 6 need reading, 3 are confident proposals that Accept all covers \(skeleton block choices 2, missing features 1\)\.$/m );
	const ids = reviewRows( intake ).map( ( r ) => r.rowId );
	const all = md.split( '\n' ).map( ( l ) => {
		const id = /^\| `([^`]+)` \|/.exec( l )?.[ 1 ];
		return id ? l.replace( /\|[^|]*\|$/, `| ${ id.startsWith( 'missing' ) ? 'build' : id.startsWith( 'skeleton' ) ? 'block:sgs/heading' : 'accept' } |` ) : l;
	} ).join( '\n' );
	const parsed = parseReview( all );
	assert.deepEqual( parsed.problems, [] );
	assert.deepEqual( Object.keys( parsed.rowMarks ).sort(), [ ...ids ].sort(), 'every row\'s Mark cell is read, confident rows included' );
} );

test( 'MUST FAIL: --apply-review saves block:<slug> marks and accepted finaliser picks only, to the client decisions file', () => {
	write( fixture() );
	assert.equal( run( '--finalise', CLIENT ).code, 0 );
	pick( PICKS );
	assert.equal( run( '--apply-picks', CLIENT ).code, 0 );
	const md = read( 'review.md' ).replace( /Accept all: \[ \]/g, 'Accept all: [x]' ).split( '\n' ).map( ( l ) => {
		const marks = { 'skeleton:footer:Site/12#0': 'block:sgs/heading', 'missing:Quiz:1': 'build', 'missing:Site:9': 'difference' };
		const id = /^\| `([^`]+)` \|/.exec( l )?.[ 1 ];
		return id in marks ? l.replace( /\|[^|]*\|$/, `| ${ marks[ id ] } |` ) : l;
	} ).join( '\n' );
	fs.writeFileSync( file( 'review.md' ), md );
	const r = run( '--apply-review', CLIENT );
	assert.equal( r.code, 0, r.out );
	assert.match( r.out, /6 skeleton choices saved to .*decisions\.json/ );
	const dec = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'decisions.json' ), 'utf8' ) );
	assert.deepEqual( Object.keys( dec.surfaces.header ).sort(), [ 'Site/5#0', 'Site/9#0' ], 'the accepted confident proposal Site/2#0 is not saved' );
	assert.equal( dec.surfaces.header[ 'Site/5#0' ].block, 'sgs/business-info' );
	assert.equal( dec.surfaces.header[ 'Site/5#0' ].signature, 'span|0121 000 0000' );
	assert.equal( dec.surfaces.header[ 'Site/9#0' ].remove, true );
	assert.deepEqual( Object.keys( dec.surfaces.footer ).sort(), [ 'Site/12#0', 'Site/18#0', 'Site/18#1', 'Site/18#2' ], 'every copy of a collapsed row with one text' );
	assert.match( dec.surfaces.footer[ 'Site/12#0' ].reason, /Bean marked block:sgs\/heading/ );
	assert.equal( fs.existsSync( path.join( HERE, '..', 'data', 'skeleton-decisions.json' ) ) ? JSON.stringify( JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'skeleton-decisions.json' ), 'utf8' ) ) ).includes( CLIENT ) : false, false, 'the framework-wide file is never written' );
	const varied = { ...JSON.parse( read( 'intake.json' ) ) };
	varied.skeletons.footer.rows[ 1 ].distinctWords = 3;
	assert.deepEqual( reviewDecisions( varied, '2026-10-12' ).filter( ( d ) => 'footer' === d.surface && d.element.key.startsWith( 'Site/18' ) ).map( ( d ) => d.element.key ), [ 'Site/18#0' ], 'copies with other words save the first copy only' );
} );

test( 'MUST FAIL: --apply-review naming an unknown block in a block:<slug> mark writes nothing', () => {
	write( fixture() );
	const before = read( 'intake.json' );
	fs.writeFileSync( file( 'review.md' ), read( 'review.md' ).replace( /Accept all: \[ \]/g, 'Accept all: [x]' ).replace( /(\| `missing:(Quiz:1|Site:9)` \|.*\|)\s*\|$/gm, '$1 build |' ).replace( /(\| `skeleton:footer:Site\/12#0` \|.*\|)\s*\|$/m, '$1 block:sgs/nope |' ) );
	const r = run( '--apply-review', CLIENT );
	assert.equal( r.code, 1, r.out );
	assert.match( r.out, /skeleton footer Site\/12#0: sgs\/nope is not a block in the framework database/ );
	assert.equal( read( 'intake.json' ), before );
	assert.equal( fs.existsSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'decisions.json' ) ), false );
} );

test( 'MUST FAIL: blocked requests merge to one row per URL and reason, keeping every draft ID', () => {
	const rows = mergeBlocked( [
		{ url: 'https://maps.example/a', host: 'maps.example', reason: 'unlisted-host', draftId: '712' },
		{ url: 'https://maps.example/a', host: 'maps.example', reason: 'unlisted-host', draftId: null },
		{ url: 'https://maps.example/a', host: 'maps.example', reason: 'unlisted-host', draftId: '538' },
		{ url: 'https://fonts.example/f.woff2', host: 'fonts.example', reason: 'replay-miss', draftId: null },
	] );
	assert.deepEqual( rows, [
		{ url: 'https://fonts.example/f.woff2', host: 'fonts.example', reason: 'replay-miss', draftId: null, draftIds: [] },
		{ url: 'https://maps.example/a', host: 'maps.example', reason: 'unlisted-host', draftId: '538', draftIds: [ '538', '712' ] },
	] );
	assert.deepEqual( mergeBlocked( rows ), rows, 'merging a merged list changes nothing' );
} );

test( '--render rewrites review.md from intake.json with the reading counts', () => {
	write( fixture() );
	fs.writeFileSync( file( 'review.md' ), 'stale' );
	const r = run( '--render', CLIENT );
	assert.equal( r.code, 0, r.out );
	assert.equal( read( 'review.md' ), renderReview( fixture() ) );
	assert.match( r.out, /9 rows: 6 need reading, 3 confident proposals Accept all covers \(skeleton 2, missing features 1\)/ );
} );

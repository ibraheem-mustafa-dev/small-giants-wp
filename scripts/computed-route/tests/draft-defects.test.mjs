// FR-48-69: a client's draft-defects list (`sites/<client>/build/qa/draft-defects.json`) holds one entry per draft defect intake
// found, with the draft ID, construct, what the code declares, what the render does and the owner; a re-run keeps the dates an
// entry already holds; the request text carries only entries not yet sent. MUST FAIL: without lib/draft-defects*.mjs nothing loads.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildDraftDefects, mergeDraftDefects, validateDraftDefects, defectRows } from '../lib/draft-defects.mjs';
import { draftDefectsFile, writeDraftDefects, requestText, markSent, defectsPath } from '../lib/draft-defects-file.mjs';

// The shape of intake's defect groups (rows hold the evidence).
const GROUPS = [ { rowId: 'defect-group:Page:template', draftId: 'Page:87', rows: [
	{ rowId: 'defect:Page:87', draftId: 'Page:87', test: 'unresolved-binding', kind: 'style-hover', verdict: 'dropped', widths: [ 375, 768, 1440 ], evidence: { pseudo: 'hover', declared: 'transform:translateY(-6px);color:{{ card.textColor }}', rule: '.a:hover { transform: translateY(-6px) !important; }', decls: [ { prop: 'color', declared: '{{ card.textColor }}', compiled: '', state: 'dropped' }, { prop: 'transform', declared: 'translateY(-6px)', compiled: 'translateY(-6px)', state: 'compiled' } ] } },
	{ rowId: 'defect:Page:670', draftId: 'Page:670', test: 'unreached', kind: 'transition', widths: [ 375, 768, 1440 ], evidence: { forced: { state: [], pseudo: null, event: null }, scrollPass: true, reachedAt: [] } },
] } ];
const LISTED = [ { draftId: 'Page:87', state: 'hover', prop: 'color', declared: '{{ card.textColor }}', built: { 375: '#fff', 1440: '#fff' } } ];
const build = ( over = {} ) => buildDraftDefects( { draftDefects: GROUPS, date: '2026-10-23', ...over } );

function plant( client, intake ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'dd-' ) );
	fs.mkdirSync( path.join( repo, 'sites', client, 'build', 'intake' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', client, 'build', 'intake', 'intake.json' ), JSON.stringify( intake ) );
	return repo;
}

test( 'one entry per defect row, each with the five facts the request needs', () => {
	const list = build();
	assert.equal( defectRows( GROUPS ).length, 2 );
	assert.equal( list.length, 2 );
	const [ binding, unreached ] = list;
	assert.equal( binding.draftId, 'Page:87' );
	assert.equal( binding.construct, 'style-hover :hover' );
	assert.equal( binding.declares, ':hover color: {{ card.textColor }}', 'only the dropped declaration is named, not the compiled transform' );
	assert.match( binding.renders, /browser drops color/ );
	assert.equal( binding.owner, 'Claude Design' );
	assert.equal( unreached.construct, 'transition' );
	assert.match( unreached.renders, /never reached at 375, 768, 1440 px.*scroll pass/ );
	assert.deepEqual( validateDraftDefects( list ), [] );
	assert.equal( buildDraftDefects( { draftDefects: [ ...GROUPS, ...GROUPS ] } ).length, 2, 'the same defect seen twice is listed once' );
} );

test( 'the owner is the caller\'s, and what Fill built from the code is recorded on its defect', () => {
	const list = build( { owner: 'the designer', listed: LISTED } );
	assert.ok( list.every( ( d ) => 'the designer' === d.owner ) );
	assert.deepEqual( list[ 0 ].built, [ { state: 'hover', prop: 'color', values: { 375: '#fff', 1440: '#fff' } } ] );
	assert.equal( list[ 1 ].built, null );
} );

test( 'a re-run keeps the listed and sent dates and owner of a defect still present and drops one the draft lost', () => {
	const earlier = build( { date: '2026-10-01' } ).map( ( d ) => ( { ...d, sentOn: '2026-10-02', owner: 'B5' } ) );
	earlier.push( { ...earlier[ 0 ], draftId: 'Page:999' } );
	const merged = mergeDraftDefects( build(), earlier );
	assert.equal( merged.length, 2 );
	assert.ok( merged.every( ( d ) => '2026-10-01' === d.listedOn && '2026-10-02' === d.sentOn && 'B5' === d.owner ) );
} );

test( 'a list with a missing field or an empty render is invalid', () => {
	const [ d ] = build();
	const { renders, ...noRenders } = d;
	assert.match( validateDraftDefects( [ noRenders ] ).join(), /no renders/ );
	assert.match( validateDraftDefects( [ { ...d, declares: ' ' } ] ).join(), /empty declares/ );
	assert.match( validateDraftDefects( {} ).join(), /not an array/ );
} );

test( 'the file is written under the client\'s qa folder from its intake, and the request lists only the unsent entries', () => {
	const repo = plant( 'acme', { takenOn: '2026-10-23', draftDefects: GROUPS } );
	const file = draftDefectsFile( { client: 'acme', repo, date: '2026-10-23' } );
	const target = writeDraftDefects( file, { client: 'acme', repo } );
	assert.equal( target, defectsPath( 'acme', repo ) );
	assert.equal( JSON.parse( fs.readFileSync( target, 'utf8' ) ).defects.length, 2 );
	const withBuilt = draftDefectsFile( { client: 'acme', repo, date: '2026-10-23', listed: LISTED } );
	writeDraftDefects( withBuilt, { client: 'acme', repo } );
	assert.deepEqual( draftDefectsFile( { client: 'acme', repo } ).defects[ 0 ].built, withBuilt.defects[ 0 ].built, 'a rebuild without Fill keeps what Fill built' );
	assert.ok( withBuilt.defects[ 0 ].built );
	const text = requestText( file );
	assert.match( text, /For Claude Design:/ );
	assert.match( text, /Page:87 \(style-hover :hover\)/ );
	assert.match( text, /Page:670 \(transition\)/ );
	const sent = markSent( file, '2026-10-24' );
	assert.equal( requestText( sent ), '', 'nothing unsent, nothing to ask' );
	assert.ok( markSent( sent, '2026-10-30' ).defects.every( ( d ) => '2026-10-24' === d.sentOn ), 'a second marking keeps the first sent date' );
	writeDraftDefects( sent, { client: 'acme', repo } );
	const again = draftDefectsFile( { client: 'acme', repo, date: '2026-10-25' } );
	assert.ok( again.defects.every( ( d ) => '2026-10-24' === d.sentOn && '2026-10-23' === d.listedOn ), 'a rebuild keeps the sent date' );
	assert.throws( () => draftDefectsFile( { client: 'none', repo } ), /no intake\.json/ );
	assert.throws( () => writeDraftDefects( { defects: [ { draftId: 'x' } ] }, { client: 'acme', repo } ), /invalid/ );
} );

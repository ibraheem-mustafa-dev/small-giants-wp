// Proves G2's input and gaps.json's draftId (gate-chain.mjs::buildContext, lib/draft-identity.mjs): a Solve row's draft
// identity is joined through the surface's origin map to intake's `<component>:<n>` id, so an FR-48-34 defect on the
// row's draft element is seen; the declared value is read at the row's own state and width; a declaration the walk
// cannot answer (no pair, a hover row's used size, no DevTools read) and an unreadable identity fail G2, never pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'draft-identity-' ) );
const build = path.join( repo, 'sites', 'demo', 'build' );
fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
fs.writeFileSync( path.join( build, 'header.origin.json' ), JSON.stringify( { 'cr-ref-header-1': { tpl: 'Root/9#0', slots: { '.inner': 'Root/10#0' } } } ) );
fs.writeFileSync( path.join( build, 'tree.json' ), '[]' );
const intakeFile = path.join( build, 'intake', 'intake.json' );
fs.writeFileSync( intakeFile, JSON.stringify( {
	inventory: { animations: { drafts: [ { file: 'Draft.dc.html', dc: 'Draft' } ] } },
	draftDefects: [ { draftId: 'Draft:9', rows: [ { draftId: 'Draft:9', evidence: { declared: 'width:8px;color:red' } }, { draftId: 'Draft:10', evidence: { pseudo: 'hover', declared: 'width:4px' } } ] } ],
} ) );
process.env.SGS_REPO_ROOT = repo;
const { buildContext } = await import( '../gate-chain.mjs' );
const { g2Intent } = await import( '../lib/gate-chain.mjs' );
const { declaredRead, draftIdentity } = await import( '../lib/draft-identity.mjs' );

const db = new DatabaseSync( ':memory:' );
db.exec( 'CREATE TABLE blocks ( slug TEXT, parent_block TEXT )' );
const surfaces = { header: { tree: 'tree.json', draftIndex: 'Draft.dc.html', states: { rest: null } } };
const walk = { runs: [
	{ state: 'rest', width: 1440, pairs: { head: { draft: { declared: { width: '8px' } } }, bare: { draft: { styles: {} } }, lost: { draft: { missing: true, declared: {} } } } },
	{ state: 'other', width: 1440, pairs: { head: { draft: { declared: { width: '99px' } } } } },
] };
const ctxOf = ( over = {} ) => buildContext( { report: {}, walk, surfaces, surface: 'header', client: 'demo', probes: null, installed: {}, db, intakeFile, ...over } );
const row = ( over = {} ) => ( { ref: 'cr-ref-header-1', path: '', pair: 'head', key: 'width', kind: 'style', state: 'rest', width: 1440, draft: '24px', live: '16px', ...over } );

test( 'MUST FAIL: the row\'s draft identity comes from the origin map, and the FR-48-34 defect on that element is seen', async () => {
	const ctx = ctxOf();
	assert.equal( ctx.draftIdOf( row() ), 'Draft:9' );
	assert.equal( ctx.draftIdOf( row( { path: '.inner' } ) ), 'Draft:10' );
	const i = await ctx.inputs.G2( row() );
	assert.deepEqual( [ i.declared, i.unread, i.fr34Passes ], [ '8px', null, true ] );
	assert.equal( g2Intent( i ).class, 'draft-defect' );
	// a hover defect is not a rest defect
	assert.equal( ( await ctx.inputs.G2( row( { path: '.inner' } ) ) ).fr34Passes, false );
} );

test( 'MUST FAIL: the declared value is read at the row\'s own state and width', () => {
	assert.equal( declaredRead( walk, row(), 'width' ).declared, '8px' );
	assert.equal( declaredRead( walk, row( { state: 'other' } ), 'width' ).declared, '99px' );
} );

test( 'MUST FAIL: a declaration the walk cannot answer fails G2 with its reason, never a pass with nothing declared', async () => {
	const ctx = ctxOf();
	const cases = [
		[ row( { pair: 'gone' } ), /no draft side of pair gone/ ],
		[ row( { pair: 'lost' } ), /no draft side of pair lost/ ],
		[ row( { kind: 'hover' } ), /reads no hover declarations/ ],
		[ row( { pair: 'bare' } ), /read no declarations on pair bare/ ],
		[ row( { width: 375 } ), /no draft side of pair head at 375px/ ],
	];
	for ( const [ r, why ] of cases ) {
		const g = g2Intent( await ctx.inputs.G2( r ) );
		assert.deepEqual( [ g.pass, g.class ], [ false, 'W-walker' ], String( why ) );
		assert.match( g.evidence.line, why );
	}
	// negative control: a property outside the walker's used sizes has no declaration to read, and passes on its render
	assert.equal( g2Intent( await ctx.inputs.G2( row( { key: 'color', draft: 'rgb(0, 0, 0)' } ) ) ).pass, true );
	assert.match( g2Intent( { property: 'width', declared: null, renderedDraft: '1px', fr34Passes: false, ledgered: false } ).evidence.line, /the intent input is missing/, 'an input without unread is incomplete' );
} );

test( 'MUST FAIL: an unreadable draft identity fails G2; gaps.json\'s draftId is null then, never the walker pair', async () => {
	const ctx = ctxOf();
	assert.equal( ctx.draftIdOf( row( { ref: 'cr-ref-header-9' } ) ), null );
	await assert.rejects( async () => ctx.inputs.G2( row( { ref: 'cr-ref-header-9' } ) ), /draft identity is unreadable: no draft identity for cr-ref-header-9/ );
	const none = ctxOf( { surface: 'footer', surfaces: { footer: surfaces.header } } );
	await assert.rejects( async () => none.inputs.G2( row() ), /no footer\.origin\.json/ );
	assert.deepEqual( draftIdentity( { origin: { a: { tpl: 'Root/3#0' } }, rootComponent: 'Draft' } )( { ref: 'a', path: '' } ), { draftId: 'Draft:3' } );
} );

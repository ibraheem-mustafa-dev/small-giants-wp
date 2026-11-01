// A row intake collapsed across surfaces decides each copy by key (lib/skeleton-shared-rows.mjs, skeleton.mjs::surfaceDecisions):
// the outcome of a row naming a surface in `alsoIn` reaches that surface's proposal for the key `alsoIn` gives it, whatever
// the copy's words. Synthetic rows; the wiring tests run skeleton.mjs::proposeSurface over a temp repo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { proposeSurface } from '../skeleton.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { sourcesOf } from '../lib/freshness.mjs';
import { overrideFor } from '../lib/skeleton-classify.mjs';
import { sharedOverrides } from '../lib/skeleton-shared-rows.mjs';

const ROOT = 'Site Draft';
const KEY = `${ ROOT }/81#0`;
const facts = { decisions: { elements: [] } };
const aRow = ( over = {} ) => ( { key: KEY, tag: 'div', words: 'Six decades of heritage', block: 'sgs/heading', confidence: 0.7, reason: 'a title', finalisedBy: 'agent', alsoIn: [ { surface: 'b', keys: [ KEY ] } ], ...over } );
const skeletons = ( row ) => ( { a: { rows: [ row ] }, b: { rows: [] } } );
const NONE = { decisions: {}, picks: {} };

test( 'MUST FAIL (a): a finaliser pick on surface A row reaches surface B copy by key, though the words differ', () => {
	const sh = sharedOverrides( { skeletons: skeletons( aRow() ), surface: 'b', decisions: { surfaces: {} } } );
	const hit = overrideFor( { key: KEY, tag: 'div' }, { clientDecisions: { surfaces: { b: sh.decisions } }, picks: sh.picks, facts, surface: 'b', words: 'Trade with us' } );
	assert.equal( hit.block, 'sgs/heading' );
	assert.equal( hit.source, 'finaliser pick' );
} );

test( 'MUST FAIL (a): a pick that removes carries as remove, and an unpicked row carries nothing', () => {
	const removed = sharedOverrides( { skeletons: skeletons( aRow( { block: null, action: 'remove' } ) ), surface: 'b' } );
	assert.equal( removed.picks[ KEY ].remove, true );
	assert.deepEqual( sharedOverrides( { skeletons: skeletons( aRow( { finalisedBy: undefined } ) ), surface: 'b' } ), NONE );
} );

test( 'MUST FAIL (b): a client decision on A shared row reaches B copy, never stale, though the words differ', () => {
	const decisions = { surfaces: { a: { [ KEY ]: { remove: true, signature: 'div|Six decades of heritage', reason: 'absorbed' } } } };
	const sh = sharedOverrides( { skeletons: skeletons( aRow() ), surface: 'b', decisions } );
	assert.equal( 'signature' in sh.decisions[ KEY ], false );
	const hit = overrideFor( { key: KEY, tag: 'span' }, { clientDecisions: { surfaces: { b: sh.decisions } }, picks: sh.picks, facts, surface: 'b', words: 'About Us' } );
	assert.equal( hit.stale, undefined );
	assert.equal( hit.remove, true );
	assert.equal( hit.source, 'client decision' );
	assert.deepEqual( sh.picks, {}, 'the decision wins over the row pick' );
} );

test( 'MUST FAIL (b): the carried key is translated into the served space', () => {
	assert.deepEqual( Object.keys( sharedOverrides( { skeletons: skeletons( aRow() ), surface: 'b', rootComponent: ROOT } ).picks ), [ 'Root/81#0' ] );
} );

test( 'a decision saved on B own row still goes stale when B element changed (the words check is kept for it)', () => {
	const own = { [ KEY ]: { block: 'sgs/text', signature: 'div|old words' } };
	const hit = overrideFor( { key: KEY, tag: 'div' }, { clientDecisions: { surfaces: { b: own } }, picks: {}, facts, surface: 'b', words: 'new words' } );
	assert.match( hit.stale, /was made for "div\|old words"/ );
} );

test( 'MUST FAIL (d): a decision or pick on A row with no alsoIn naming B does not touch B', () => {
	const row = aRow( { alsoIn: [ { surface: 'c', keys: [ KEY ] } ] } );
	assert.deepEqual( sharedOverrides( { skeletons: skeletons( row ), surface: 'b', decisions: { surfaces: { a: { [ KEY ]: { remove: true } } } } } ), NONE );
	assert.deepEqual( sharedOverrides( { skeletons: skeletons( row ), surface: 'b' } ), NONE );
	assert.deepEqual( sharedOverrides( { skeletons: skeletons( aRow( { alsoIn: undefined } ) ), surface: 'b' } ), NONE );
} );

// The wiring: proposeSurface hands the carried outcome to propose.
const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const CLIENT = 'eye-care-ward-end';
const footer = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' ) );
const SERVED = footer.elements.find( ( e ) => /^Root\/\d+#0$/.test( e.key ) && ( e.words || '' ).trim() && 'p' === e.tag )?.key ?? 'Root/0#0';
const INTAKE = SERVED.replace( /^Root/, 'Eye Care Site' );
const db = openDb();

function fixture( { decisions = { surfaces: {} }, row = {} } = {} ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'skel-shared-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
	fs.mkdirSync( path.join( build, 'skeleton' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { footer: { site: 'x', intakeSurface: 'site-footer' } } ) );
	const header = { id: 'S-1', kind: 'header', name: 'Header', rows: [ { key: INTAKE, tag: 'p', words: 'Header words', block: 'sgs/heading', finalisedBy: 'agent', confidence: 0.7, alsoIn: [ { surface: 'site-footer', keys: [ INTAKE ] } ], ...row } ] };
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons: { 'site-header': header, 'site-footer': { id: 'S-14', kind: 'footer', name: 'Footer', inventory: { checks: { rootName: 'Eye Care Site' } } } }, inventory: { animations: { records: [] } } } ) );
	const handoff = path.join( repo, 'sites', CLIENT, 'handoff' );
	fs.mkdirSync( handoff, { recursive: true } );
	fs.writeFileSync( path.join( handoff, 'Home.dc.html' ), '<p>draft</p>' );
	fs.writeFileSync( path.join( build, 'skeleton', 'footer.inventory.json' ), JSON.stringify( { ...footer, sources: sourcesOf( handoff, { commit: null } ) } ) );
	fs.writeFileSync( path.join( build, 'skeleton', 'decisions.json' ), JSON.stringify( decisions ) );
	const list = loadFacts( { db, client: CLIENT, repo: REPO } ).tagMap.ul.core_block_slug.replace( /^sgs\//, '' );
	fs.mkdirSync( path.join( repo, 'plugins/sgs-blocks/src/blocks', list ), { recursive: true } );
	fs.copyFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ), path.join( repo, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ) );
	return { repo, done: () => fs.rmSync( repo, { recursive: true, force: true } ) };
}
const run = ( f ) => {
	const seen = [];
	proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: ( a ) => ( seen.push( a ), { skeleton: [], proposal: { counts: {}, rows: [] }, problems: [] } ) } );
	return seen[ 0 ];
};

test( 'MUST FAIL (a): proposeSurface passes the other surface pick for the served key of the copy', () => {
	const f = fixture();
	assert.equal( run( f ).picks[ SERVED ].block, 'sgs/heading' );
	f.done();
} );

test( 'MUST FAIL (b): proposeSurface passes the other surface client decision, without its signature, under the served key', () => {
	const f = fixture( { decisions: { surfaces: { 'site-header': { [ INTAKE ]: { remove: true, signature: 'p|Header words' } } } } } );
	assert.deepEqual( run( f ).clientDecisions.surfaces[ 'site-footer' ][ SERVED ], { remove: true } );
	f.done();
} );

test( 'MUST FAIL (c): a decision saved on the surface own row beats the carried one', () => {
	const f = fixture( { decisions: { surfaces: { 'site-header': { [ INTAKE ]: { remove: true } }, 'site-footer': { [ INTAKE ]: { block: 'sgs/text', signature: 'p|x' } } } } } );
	const mine = run( f ).clientDecisions.surfaces[ 'site-footer' ][ SERVED ];
	assert.equal( mine.block, 'sgs/text' );
	assert.equal( mine.remove, undefined );
	f.done();
} );

test( 'MUST FAIL (d): proposeSurface carries nothing when the row alsoIn does not name the surface', () => {
	const f = fixture( { row: { alsoIn: [ { surface: 'elsewhere', keys: [ INTAKE ] } ] }, decisions: { surfaces: { 'site-header': { [ INTAKE ]: { remove: true } } } } } );
	const seen = run( f );
	assert.deepEqual( seen.picks, {} );
	assert.deepEqual( seen.clientDecisions.surfaces[ 'site-footer' ] ?? {}, {} );
	f.done();
} );

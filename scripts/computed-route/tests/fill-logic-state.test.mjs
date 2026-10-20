// The logic-state reader (Spec 48 FR-48-13, FR-48-81, lib/fill-logic-state.mjs) on the draft-defects fixture (Home
// importing Card): `secret` (no code sets it) shows the sc-if holding p.secret. A stylesheet planted into the page gives
// that branch a look; the reader sets the key through lib/intake-state.mjs::setDraftState, reads the branch, restores
// the state, and lib/fill-state.mjs::fillStates writes the look into the real DB setting that holds its state.
// The fixture's HAR is recorded once into the OS temp folder (the first run needs the network).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest, openSandbox } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { preparePage, gotoDraft, settleRest } from '../lib/intake-harness.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { openDevtools, declaredValues } from '../../parity/lib/devtools.mjs';
import { readLogicStates, logicGroups } from '../lib/fill-logic-state.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { openDb, statesVocabulary } from '../lib/db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FOLDER = path.join( HERE, 'fixtures', 'intake-defects' );
const ENTRY = 'Home.dc.html';
const RESOLVE = resolveFinder.toString();
const db = openDb();
const VOCAB = statesVocabulary( db ).rows;
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const JOBS = [ { id: 'secret', finder: 'p.secret' }, { id: 'title', finder: 'h1' } ];
const ROW = { id: 'Home:8', component: 'Home', reach: 'set-state', keys: { secret: true }, settingState: 'open' };

let harPath;
before( async () => {
	const { manifestHash } = recheckManifest( FOLDER );
	harPath = path.join( os.tmpdir(), 'sgs-intake-defects-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FOLDER, index: ENTRY, harPath } );
	}
} );

// One harness page on the fixture with the branch's look planted, its DevTools session and the resting declared read.
async function open() {
	const sb = await openSandbox( { folder: FOLDER, index: ENTRY, harPath, mode: 'replay', widths: [ 1440 ] } );
	const page = await sb.newPage();
	await page.setViewportSize( { width: 1440, height: 900 } );
	const opts = await preparePage( page );
	await gotoDraft( page, sb.origin, ENTRY );
	await settleRest( page, opts );
	await page.addStyleTag( { content: 'p.secret{color:rgb(10,20,30);background-color:rgb(250,240,230)}' } );
	const cdp = await openDevtools( page );
	const rest = {};
	for ( const j of JOBS ) {
		rest[ j.id ] = await declaredValues( cdp, j.finder, RESOLVE, null );
	}
	return { sb, page, cdp, rest };
}

const read = ( o, logicRows ) => readLogicStates( { page: o.page, cdp: o.cdp, jobs: JOBS, rest: o.rest, logicRows, vocab: VOCAB, resolveSrc: RESOLVE } );

test( 'a branch behind a logic state is read with the key set, and the state is restored afterwards', async () => {
	const o = await open();
	try {
		assert.equal( o.rest.secret, null, 'the branch is not rendered at rest' );
		const out = await read( o, [ ROW ] );
		const l = out.looks.secret?.[ 0 ];
		assert.ok( l, 'MUST FAIL WITHOUT THE SETTER: the branch only exists once the key is set' );
		assert.deepEqual( l.states, [ 'open' ] );
		assert.equal( l.declared.color, 'rgb(10, 20, 30)' );
		assert.equal( l.rendered.color, 'rgb(10, 20, 30)' );
		assert.deepEqual( l.logic, { id: 'Home:8', ids: [ 'Home:8' ], keys: { secret: true } } );
		assert.equal( out.looks.title, undefined, 'a target the state does not change has no look' );
		assert.equal( await o.page.locator( 'p.secret' ).count(), 0, 'the state is put back' );
	} finally {
		await o.sb.close();
	}
} );

test( 'a state that is not mounted, and a state no vocabulary word names, stay gaps with their reason', async () => {
	const o = await open();
	try {
		const out = await read( o, [ { ...ROW, id: 'Nope:1', component: 'Nope' }, { ...ROW, id: 'Home:9', keys: { secret: true, zzz: 1 }, settingState: null } ] );
		assert.deepEqual( out.looks, {} );
		assert.equal( out.gaps.length, 2 );
		assert.match( out.gaps.find( ( g ) => g.ids[ 0 ] === 'Nope:1' ).reason, /cannot be set/ );
		assert.match( out.gaps.find( ( g ) => g.ids[ 0 ] === 'Home:9' ).reason, /no setting state/ );
		assert.equal( await o.page.locator( 'p.secret' ).count(), 0 );
	} finally {
		await o.sb.close();
	}
} );

test( 'rows other than set-state are not read; rows sharing keys are one read; the vocabulary names the state from the keys', () => {
	const g = logicGroups( [ { ...ROW, settingState: null, keys: { menuOpen: true } }, { ...ROW, id: 'Home:10', settingState: null, keys: { menuOpen: true } }, { id: 'Home:3', component: 'Home', reach: 'walker' }, { id: 'Home:4', component: 'Home', reach: 'gap' } ], VOCAB );
	assert.equal( g.length, 1 );
	assert.deepEqual( [ g[ 0 ].ids, g[ 0 ].settingState, g[ 0 ].gap ], [ [ 'Home:8', 'Home:10' ], 'open', null ] );
} );

test( 'fillStates writes a logic look into the DB setting that holds its state (an accordion\'s open colour)', async () => {
	const o = await open();
	let out;
	try {
		out = await read( o, [ ROW ] );
	} finally {
		await o.sb.close();
	}
	const attr = db.prepare( "SELECT attr_name, css_property, css_state FROM block_attributes WHERE block_slug = 'sgs/accordion' AND attr_name = 'headerColourOpen'" ).get();
	assert.ok( attr, 'the accordion holds an open colour setting' );
	const cal = { elements: { '': {} }, settings: { [ attr.attr_name ]: { slot: '', slots: [ '' ], reaches: [ '' ], property: attr.css_property, state: attr.css_state, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } } };
	const tree = [ { name: 'sgs/accordion', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	const reads = { states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, out ] ) ) };
	const res = fillStates( { tree, nodes: [ { index: 0, name: 'sgs/accordion', targets: [ { id: 'secret', slot: '' } ] } ], reads, calFor: () => cal, db, snapshot } );
	const w = res.writes.find( ( x ) => 'headerColourOpen' === x.attr );
	assert.ok( w, `written: ${ JSON.stringify( res.unmapped ) }` );
	assert.equal( w.state, 'open' );
	assert.ok( tree[ 0 ].attributes.headerColourOpen, 'the tree holds the value' );
} );

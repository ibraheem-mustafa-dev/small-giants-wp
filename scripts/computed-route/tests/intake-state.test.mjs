// lib/intake-state.mjs: draft state set through the runtime's own setState path, snapshots put back, template
// triggers fired as the DOM events React hears, and code-wired listeners fired. On the draft-defects fixture
// (tests/fixtures/intake-defects/, Home importing Card): `secret` (no code sets it) opens the sc-if holding p.secret; the button's onClick
// runs toggle, which bumps `clicks`. Each helper has a MUST FAIL case. The fixture's HAR is recorded once into the OS
// temp folder (the first run needs the network).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest, openSandbox } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { preparePage, gotoDraft, settleRest } from '../lib/intake-harness.mjs';
import { setDraftState, snapshotDraftState, restoreDraftState, fireTrigger, fireListeners, listenerInit } from '../lib/intake-state.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FOLDER = path.join( HERE, 'fixtures', 'intake-defects' );
const ENTRY = 'Home.dc.html';
let harPath;

test.before( async () => {
	const { manifestHash } = recheckManifest( FOLDER );
	harPath = path.join( os.tmpdir(), 'sgs-intake-defects-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FOLDER, index: ENTRY, harPath } );
	}
} );

// One fresh harness page (the clock is context-wide), with or without the listener recorder.
async function open( { record = true } = {} ) {
	const sb = await openSandbox( { folder: FOLDER, index: ENTRY, harPath, mode: 'replay', widths: [ 1440 ] } );
	const page = await sb.newPage();
	await page.setViewportSize( { width: 1440, height: 900 } );
	const opts = await preparePage( page );
	if ( record ) {
		await page.addInitScript( listenerInit );
	}
	await gotoDraft( page, sb.origin, ENTRY );
	await settleRest( page, opts );
	return { sb, page, settle: () => settleRest( page, opts ) };
}

test( 'setDraftState opens a branch no code opens; restoreDraftState closes it again; an unmounted component is 0', async () => {
	const { sb, page, settle } = await open();
	try {
		assert.equal( await page.locator( 'p.secret' ).count(), 0 );
		assert.equal( await snapshotDraftState( page ), 2, 'Home and the Card it imports' );
		assert.equal( await setDraftState( page, { component: 'Home', keys: { secret: true } } ), 1 );
		await settle();
		assert.equal( await page.locator( 'p.secret' ).count(), 1 );
		assert.equal( await restoreDraftState( page ), 1 );
		await settle();
		assert.equal( await page.locator( 'p.secret' ).count(), 0 );
		assert.equal( await restoreDraftState( page ), 0, 'nothing left to put back' );
		assert.equal( await setDraftState( page, { component: 'Nope', keys: { secret: true } } ), 0, 'MUST FAIL: no such component is mounted' );
	} finally {
		await sb.close();
	}
} );

test( 'fireTrigger runs a template onClick through React; an element that is not rendered is false', async () => {
	const { sb, page } = await open();
	try {
		await snapshotDraftState( page );
		assert.equal( await fireTrigger( page, { selector: 'button' }, 'onClick' ), true );
		assert.equal( await restoreDraftState( page ), 1, 'toggle changed clicks, so there is state to put back' );
		assert.equal( await fireTrigger( page, { component: 'Home', draftId: 'Home:8' }, 'onClick' ), false, 'MUST FAIL: p.secret is not rendered' );
		assert.equal( await fireTrigger( page, { component: 'Home', draftId: 'Home:16' }, 'onMouseEnter' ), true );
		assert.equal( await restoreDraftState( page ), 0, 'MUST FAIL: the button has no onMouseEnter, so nothing changed' );
	} finally {
		await sb.close();
	}
} );

test( 'fireListeners fires a listener wired in code once; without the recorder it fires none', async () => {
	const wire = ( page ) => page.evaluate( () => {
		window.__hits = 0;
		document.querySelector( 'h1' ).addEventListener( 'mouseenter', () => window.__hits++ );
	} );
	const on = await open();
	try {
		await wire( on.page );
		assert.ok( await fireListeners( on.page ) >= 1 );
		assert.equal( await on.page.evaluate( () => window.__hits ), 1 );
	} finally {
		await on.sb.close();
	}
	const off = await open( { record: false } );
	try {
		await wire( off.page );
		assert.equal( await fireListeners( off.page ), 0, 'MUST FAIL: no recorder, no listener list' );
		assert.equal( await off.page.evaluate( () => window.__hits ), 0 );
	} finally {
		await off.sb.close();
	}
} );

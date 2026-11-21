// Fill's read of a target only a draft state shows (lib/fill-read.mjs::readRevealed, Spec 48 FR-48-6): an accordion's answer
// when the draft opens no item at load is in no rest read, so the job carries the state that shows it ({ component, keys },
// lib/skeleton-child-slots.mjs::unitSlots) and the reader sets those keys through lib/intake-state.mjs::setDraftState, reads
// the target's snapshot and declared values, and puts the state back. On the draft-defects fixture (Home importing Card),
// `secret` (no code sets it) shows the sc-if holding p.secret; a stylesheet planted into the page gives it a look.
// The fixture's HAR is recorded once into the OS temp folder (the first run needs the network).
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest, openSandbox } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { preparePage, gotoDraft, settleRest } from '../lib/intake-harness.mjs';
import { openDevtools } from '../../parity/lib/devtools.mjs';
import { readRevealed } from '../lib/fill-read.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FOLDER = path.join( HERE, 'fixtures', 'intake-defects' );
const ENTRY = 'Home.dc.html';
const SECRET = { component: 'Home', keys: { secret: true } };
const PROPS = [ 'color', 'background-color', 'padding-bottom' ];

let harPath;
before( async () => {
	const { manifestHash } = recheckManifest( FOLDER );
	harPath = path.join( os.tmpdir(), 'sgs-intake-defects-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FOLDER, index: ENTRY, harPath } );
	}
} );

async function withPage( fn ) {
	const sb = await openSandbox( { folder: FOLDER, index: ENTRY, harPath, mode: 'replay', widths: [ 1440 ] } );
	try {
		const page = await sb.newPage();
		await page.setViewportSize( { width: 1440, height: 900 } );
		const opts = await preparePage( page );
		await gotoDraft( page, sb.origin, ENTRY );
		await settleRest( page, opts );
		await page.addStyleTag( { content: 'p.secret{color:rgb(10,20,30);padding-bottom:20px}' } );
		await fn( page, await openDevtools( page ) );
	} finally {
		await sb.close();
	}
}

test( 'MUST FAIL WITHOUT THE REVEALED READ: a target only a state shows is read with its keys set, declared values too, and the state is put back', async () => {
	await withPage( async ( page, cdp ) => {
		assert.equal( await page.locator( 'p.secret' ).count(), 0, 'the target is not rendered at rest' );
		const out = await readRevealed( { page, cdp, jobs: [ { id: 'secret', finder: 'p.secret', reveal: SECRET }, { id: 'title', finder: 'h1' } ], props: PROPS } );
		assert.ok( out.widths.secret && ! out.widths.secret.missing, 'the state renders the target' );
		assert.equal( out.widths.secret.styles.color, 'rgb(10, 20, 30)' );
		assert.equal( out.declared.secret?.[ 'padding-bottom' ], '20px' );
		assert.equal( out.widths.title, undefined, 'a target with no state is the rest read\'s, never read here' );
		assert.deepEqual( out.unreached, [] );
		assert.equal( await page.locator( 'p.secret' ).count(), 0, 'the state is put back' );
	} );
} );

test( 'negative control: a state whose component is not mounted reads nothing and says why; no job with a state reads nothing', async () => {
	await withPage( async ( page, cdp ) => {
		const out = await readRevealed( { page, cdp, jobs: [ { id: 'secret', finder: 'p.secret', reveal: { ...SECRET, component: 'Nope' } } ], props: PROPS } );
		assert.deepEqual( out.widths, {} );
		assert.equal( out.unreached.length, 1 );
		assert.match( out.unreached[ 0 ].reason, /cannot be set: Nope is not mounted/ );
		assert.deepEqual( await readRevealed( { page, cdp, jobs: [ { id: 'title', finder: 'h1' } ], props: PROPS } ), { widths: {}, declared: {}, unreached: [] } );
	} );
} );

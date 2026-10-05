// Proves scripts/lib/wp-session.js: a child attached to the run's shared browser survives a page dialog that both
// connections see (2026-10-05: trust-bar's build crashed in Page.handleJavaScriptDialog when the second auto-dismiss
// found the dialog already gone).
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const require = createRequire( import.meta.url );
const wpSession = require( path.join( REPO, 'scripts/lib/wp-session.js' ) );

test( 'MUST FAIL (trust-bar dialog race): both connections to the shared browser survive a dialog, which is dismissed', async () => {
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const profileDir = fs.mkdtempSync( path.join( os.tmpdir(), 'wp-session-test-' ) );
	const shared = await wpSession.launchShared( chromium, { profileDir, headless: true } );
	const errors = [];
	const onError = ( e ) => errors.push( String( e?.message || e ) );
	process.on( 'uncaughtException', onError );
	try {
		const child = await wpSession.connectShared( chromium );
		await child.page.setContent( '<p>x</p>' );
		const answer = await child.page.evaluate( () => new Promise( ( r ) => setTimeout( () => r( window.confirm( 'leave?' ) ), 50 ) ) );
		await child.page.waitForTimeout( 300 );
		assert.equal( answer, false );
		assert.deepEqual( errors, [] );
		await child.close();
		assert.equal( await shared.page.evaluate( () => 1 + 1 ), 2 );
	} finally {
		process.off( 'uncaughtException', onError );
		await shared.close();
		fs.rmSync( profileDir, { recursive: true, force: true } );
	}
} );

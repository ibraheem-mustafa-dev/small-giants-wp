// lib/draft.mjs::serveDraftApart: the draft answers while the process that started it is blocked. On 2026-11-28 five of a Mama's
// run's Fills timed out loading the draft from site-run.mjs's own server while site-run proposed another surface synchronously.
// The block is reproduced with spawnSync: this thread waits on a child that fetches the draft, as a Fill waits on site-run's server.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { serveDraft, serveDraftApart } from '../lib/draft.mjs';

const folder = () => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'serve-apart-' ) );
	fs.writeFileSync( path.join( d, 'Home.dc.html' ), '<!doctype html><p>draft</p>' );
	return d;
};
// Fetches `url` from another process while this thread is held by spawnSync; 'no answer' when nothing answered in 2 seconds.
const fetchWhileBlocked = ( url ) => spawnSync( process.execPath, [ '-e', `fetch(${ JSON.stringify( url ) },{signal:AbortSignal.timeout(2000)}).then(r=>r.text()).then(t=>console.log(t),()=>console.log('no answer'))` ], { encoding: 'utf8', timeout: 10000 } ).stdout.trim();

test( 'MUST FAIL: a draft served apart answers while the process that started it is blocked; one served in-process does not', async () => {
	const d = folder();
	const apart = await serveDraftApart( d, { index: 'Home.dc.html' } );
	assert.match( apart.url, /^http:\/\/127\.0\.0\.1:\d+\/$/ );
	assert.equal( fetchWhileBlocked( apart.url ), '<!doctype html><p>draft</p>', 'the child answers though this thread is held' );
	await apart.close();
	assert.equal( fetchWhileBlocked( apart.url ), 'no answer', 'close() ends the server' );
	// negative control: the in-process server is the fault this replaces
	const here = await serveDraft( d, { index: 'Home.dc.html' } );
	assert.equal( fetchWhileBlocked( here.url ), 'no answer', 'an in-process server cannot answer while its thread is held' );
	await here.close();
} );

test( 'a folder with no page is refused before anything is served, naming the cause', async () => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'serve-apart-empty-' ) );
	await assert.rejects( serveDraftApart( d, { index: 'Missing.dc.html' } ), /stopped \(exit 1\) before it served: .*Missing\.dc\.html/ );
} );

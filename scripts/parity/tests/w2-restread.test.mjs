// Track W wave 2 fix 6 (lib/state-rest.mjs::readRest, draft-live-walk.mjs): the first rest is read like every later one
// (the same settle floor) and a signature is two equal reads, so a page that finishes opening a disclosure 220ms after
// its open is at rest in every state, never refused.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { readRest, toRest } from '../lib/state-rest.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const WALKER = path.join( HERE, '..', 'draft-live-walk.mjs' );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
let browser;
let dir;
before( async () => {
	browser = await chromium.launch( { headless: true } );
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'w2-restread-' ) );
} );
after( async () => {
	await browser?.close();
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL: readRest returns a signature read twice the same, never a first read that was still changing', async () => {
	const A = { scroll: '0,0', disclosures: 0 };
	const B = { scroll: '0,0', disclosures: 1 };
	const reads = [ A, B, B ];
	const page = { waitForTimeout: async () => {}, evaluate: async ( fn ) => ( 'restSignature' === fn.name ? reads.shift() : 0 ) };
	assert.deepEqual( await readRest( page ), B );
	assert.equal( reads.length, 0 );
	// Control: a page that is still on its first read twice returns it after two reads.
	const steady = [ A, A, B ];
	const p2 = { waitForTimeout: async () => {}, evaluate: async ( fn ) => ( 'restSignature' === fn.name ? steady.shift() : 0 ) };
	assert.deepEqual( await readRest( p2 ), A );
	assert.equal( steady.length, 1 );
} );

test( 'MUST FAIL: a page whose open finishes a disclosure 220ms later is at rest in every later state (the first rest waits as long as the others)', () => {
	const html = `<!doctype html><html><body><span id="label">Start</span> <button id="go">Go</button><details id="d"><summary>s</summary>x</details>
		<script>go.onclick = () => { label.textContent = 'Gone'; };</script></body></html>`;
	fs.writeFileSync( path.join( dir, 'late.html' ), html );
	const url = JSON.stringify( pathToFileURL( path.join( dir, 'late.html' ) ).href );
	const click = `( h ) => h.clickText( '^go$', { tag: 'button', optional: true, wait: 100 } )`;
	// The config's open starts a disclosure that finishes opening 220ms later (after two reads 150ms apart, before the 300ms floor): part of the page's rest.
	const late = `( h ) => h.page.evaluate( () => setTimeout( () => { document.getElementById( 'd' ).open = true; }, 220 ) )`;
	fs.writeFileSync( path.join( dir, 'late.mjs' ), `export default { name: 'late', widths: [ 800 ], links: false, draft: { url: ${ url }, open: ${ late } }, live: { url: ${ url }, open: ${ late } },
	states: [ { name: 'first', settle: 100 }, { name: 'second', settle: 100, draft: ${ click }, live: ${ click } }, { name: 'third', settle: 100 } ],
	pairs: [ { name: 'label', states: [ 'first', 'second', 'third' ], draft: '#label', live: '#label', box: [], structure: false } ] };
` );
	const out = path.join( dir, 'late-out' );
	spawnSync( process.execPath, [ WALKER, path.join( dir, 'late.mjs' ), '--out', out, '--headless', '--no-review', '--lean' ], { encoding: 'utf8', timeout: 110000 } );
	const report = JSON.parse( fs.readFileSync( path.join( out, 'report.json' ), 'utf8' ) );
	assert.deepEqual( report.runs.map( ( r ) => [ r.state, !! r.refused ] ), [ [ 'first', false ], [ 'second', false ], [ 'third', false ] ] );
} );

test( 'MUST FAIL: a fresh load that reaches rest hands back the signature it read, which the walker keeps as the rest', async () => {
	const rest = { scroll: '0,0', disclosures: 0 };
	const off = { scroll: '0,400', disclosures: 0 };
	const back = { scroll: '0,0', disclosures: 0, extra: 'read after the load' };
	const reads = [ off, off, back, back ];
	const page = { waitForTimeout: async () => {}, evaluate: async ( fn ) => ( 'restSignature' === fn.name ? reads.shift() : 0 ) };
	let loads = 0;
	const r = await toRest( page, { name: 's' }, rest, async () => { loads++; } );
	assert.deepEqual( [ r.how, r.refused, loads ], [ 'reloaded', undefined, 1 ] );
	assert.equal( r.rest, back );
} );

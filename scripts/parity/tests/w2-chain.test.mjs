// Track W wave 2 fix 7: a state marked `from: 'previous'` runs on the page the state before it left. When that state was
// refused (its page could not be brought to rest), the page under it was never the previous state's, so the chained state
// is refused too, never measured on a reloaded page. The walk runs the real walker (--lean, headless) on local pages.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const WALKER = path.join( HERE, '..', 'draft-live-walk.mjs' );
// Menu opens a modal dialog; on live, `stick` sets a flag that reopens the dialog on every load, so the state after it
// cannot be brought to rest there. Step changes the label.
const PAGE = ( words ) => `<!doctype html><html><body><span id="label">Step 1</span> <button id="menu">Menu</button> <button id="step">Step</button>
<dialog id="drawer"><p>${ words }</p></dialog>
<script>menu.onclick = () => drawer.showModal(); step.onclick = () => { label.textContent = 'Step 2'; };
if ( sessionStorage.getItem( 'stuck' ) ) { drawer.showModal(); }</script></body></html>`;

let dir;
let report;
const runOf = ( state ) => report.runs.find( ( r ) => r.state === state );
before( () => {
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'w2-chain-' ) );
	fs.writeFileSync( path.join( dir, 'draft.html' ), PAGE( 'Words' ) );
	fs.writeFileSync( path.join( dir, 'live.html' ), PAGE( 'Words' ) );
	const url = ( f ) => JSON.stringify( pathToFileURL( path.join( dir, f ) ).href );
	const click = ( src ) => `( h ) => h.clickText( ${ JSON.stringify( src ) }, { tag: 'button', optional: true, wait: 150 } )`;
	const stick = `async ( h ) => { await h.page.evaluate( () => sessionStorage.setItem( 'stuck', '1' ) ); await ( ${ click( '^menu$' ) } )( h ); }`;
	fs.writeFileSync( path.join( dir, 'cfg.mjs' ), `export default {
	name: 'w2-chain', widths: [ 800 ], links: false,
	draft: { url: ${ url( 'draft.html' ) } }, live: { url: ${ url( 'live.html' ) } },
	states: [
		{ name: 'closed', settle: 100 },
		{ name: 'stuck', settle: 100, draft: ${ click( '^menu$' ) }, live: ${ stick } },
		{ name: 'after-stuck', settle: 100, draft: ${ click( '^step$' ) }, live: ${ click( '^step$' ) } },
		{ name: 'chained', settle: 100, from: 'previous' },
		{ name: 'wide-only', settle: 100, widths: [ 1440 ], draft: ${ click( '^step$' ) }, live: ${ click( '^step$' ) } },
		{ name: 'after-gap', settle: 100, from: 'previous' },
		{ name: 'plain', settle: 100, draft: ${ click( '^step$' ) }, live: ${ click( '^step$' ) } },
	],
	pairs: [ { name: 'label', states: [ 'closed', 'stuck', 'after-stuck', 'chained', 'wide-only', 'after-gap', 'plain' ], draft: '#label', live: '#label', box: [], structure: false } ],
};
` );
	const out = path.join( dir, 'out' );
	const r = spawnSync( process.execPath, [ WALKER, path.join( dir, 'cfg.mjs' ), '--out', out, '--headless', '--no-review', '--lean' ], { encoding: 'utf8', timeout: 110000 } );
	report = fs.existsSync( path.join( out, 'report.json' ) ) ? JSON.parse( fs.readFileSync( path.join( out, 'report.json' ), 'utf8' ) ) : { runs: [], failed: `${ r.stdout }\n${ r.stderr }` };
} );
after( () => fs.rmSync( dir, { recursive: true, force: true } ) );

test( 'MUST FAIL: a from-previous state whose previous state was refused is refused too, never measured', () => {
	assert.ok( runOf( 'after-stuck' )?.refused?.live, report.failed || 'the live side of after-stuck is refused' );
	const r = runOf( 'chained' );
	assert.match( String( r.refused?.live ), /previous state after-stuck was refused/ );
	assert.deepEqual( Object.keys( r.pairs ), [ '(state)' ] );
	assert.equal( r.pairs[ '(state)' ].diffs[ 0 ].key, 'not-at-rest' );
} );

test( 'control: a from-previous state after a measured state runs on its page (the draft side kept the step)', () => {
	assert.equal( runOf( 'chained' ).refused.draft, null, 'the draft side of after-stuck was measured, so its chained state runs' );
} );

test( 'MUST FAIL: a from-previous state whose previous state is not run at this width is refused on both sides', () => {
	const r = runOf( 'after-gap' );
	assert.match( String( r.refused?.draft ), /previous state wide-only was refused \(not run at 800px\)/ );
	assert.match( String( r.refused?.live ), /previous state wide-only/ );
} );

test( 'control: a state not marked from previous after a refused one starts from rest as usual', () => {
	assert.equal( runOf( 'plain' ).refused?.draft ?? null, null, 'the draft side of after-gap was refused; plain loads afresh and runs' );
} );

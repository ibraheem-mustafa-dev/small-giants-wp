// Opens a client's Claude Design draft as one working site for a person to review, beside the live site.
//
//   node scripts/computed-route/tools/draft-viewer.mjs <client> [--port 5180] [--live <url>] [--width 1440]
//
// The draft must be served over HTTP: its runtime re-fetches its own file and mounts each <dc-import> (the forms,
// for example) by fetching the sibling .dc.html, which file:// cannot do. This serves sites/<client>/handoff/ on a
// fixed local port (so the address can also be opened in any browser) with the entry draft from MANIFEST.json at the
// root, and opens a visible browser: tab 1 the draft, tab 2 the live site when --live is given. Read-only: it writes
// nothing. It runs until the browser is closed (or Ctrl+C).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDraft } from '../lib/draft.mjs';
import { chromium } from '../node_modules/playwright/index.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const args = process.argv.slice( 2 );
const client = args[ 0 ];
const flag = ( name, fallback ) => {
	const i = args.indexOf( `--${ name }` );
	return i > -1 && args[ i + 1 ] ? args[ i + 1 ] : fallback;
};
if ( ! client || client.startsWith( '--' ) ) {
	console.error( 'Usage: node scripts/computed-route/tools/draft-viewer.mjs <client> [--port 5180] [--live <url>] [--width 1440]' );
	process.exit( 2 );
}
const folder = path.join( REPO, 'sites', client, 'handoff' );
const manifestFile = path.join( folder, 'MANIFEST.json' );
if ( ! fs.existsSync( manifestFile ) ) {
	console.error( `No draft handoff at ${ folder } (MANIFEST.json missing).` );
	process.exit( 1 );
}
const manifest = JSON.parse( fs.readFileSync( manifestFile, 'utf8' ) );
const entry = ( manifest.entry_drafts || [] )[ 0 ];
if ( ! entry ) {
	console.error( 'MANIFEST.json names no entry_drafts.' );
	process.exit( 1 );
}

const port = Number( flag( 'port', 5180 ) );
const width = Number( flag( 'width', 1440 ) );
const live = flag( 'live', '' );
const draft = await serveDraft( folder, { index: entry, port } );
console.log( `Draft: ${ draft.url } (${ entry }; its pages mount the other drafts, e.g. the forms)` );

const browser = await chromium.launch( { headless: false, args: [ `--window-size=${ width + 40 },1000` ] } );
const context = await browser.newContext( { viewport: null } );
const draftTab = await context.newPage();
await draftTab.goto( draft.url, { waitUntil: 'domcontentloaded' } );
if ( live ) {
	const liveTab = await context.newPage();
	await liveTab.goto( live, { waitUntil: 'domcontentloaded' } );
	await draftTab.bringToFront();
	console.log( `Live: ${ live } (second tab)` );
}
console.log( 'Close the browser window to stop.' );
const stop = async () => {
	await draft.close();
	process.exit( 0 );
};
browser.on( 'disconnected', stop );
process.on( 'SIGINT', async () => {
	await browser.close().catch( () => {} );
	await stop();
} );

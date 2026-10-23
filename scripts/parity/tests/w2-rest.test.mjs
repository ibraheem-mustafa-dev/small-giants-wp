// Track W wave 2 fix 5 (lib/state-rest.mjs::restSignature): the rest signature reads what an open drawer or modal changes
// even with no ARIA on it: a fixed or transformed layer in the viewport of any size, `inert` and page-level
// `aria-hidden` toggles, html's position, and the focused element.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { restSignature, restDiff } from '../lib/state-rest.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
let browser;
let dir;
before( async () => {
	browser = await chromium.launch( { headless: true } );
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'w2-rest-' ) );
} );
after( async () => {
	await browser?.close();
	fs.rmSync( dir, { recursive: true, force: true } );
} );

const PAGE = `<style>body{margin:0}main{height:2000px}#aside{position:fixed;top:0;right:0;width:300px;height:100vh;background:#fff;transform:translateX(100%)}
	#chip{position:fixed;bottom:10px;left:10px;width:40px;height:40px;background:red}.slide{position:absolute;top:0;width:20px;height:20px;transform:rotate(10deg)}</style>
	<header id="hd"><button id="b">Menu <span aria-hidden="true">+</span></button><nav id="nav">n</nav><svg id="logo" width="200" height="60" style="display:block"><g id="mark"><path d="M0 0h40v40H0z"/></g></svg><div id="lift" style="width:100px;height:20px;background:#ccc"></div></header><main id="main">x</main><aside id="aside">menu</aside><div id="chip"></div>
	<div class="slide" style="left:0"></div><div class="slide" style="left:-200px"></div>
	<div id="mega" style="position:absolute;top:60px;left:-2000px;width:600px;height:300px;background:#eee"></div>`;
const signatureAfter = async ( change ) => {
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.setContent( PAGE );
	const rest = await page.evaluate( restSignature );
	await page.evaluate( change );
	const now = await page.evaluate( restSignature );
	await page.close();
	return restDiff( rest, now );
};

test( 'MUST FAIL (rater B): a 300px fixed aside with no ARIA sliding into the viewport at 1440 is off rest', async () => {
	assert.equal( ( await signatureAfter( () => { document.getElementById( 'aside' ).style.transform = 'none'; } ) ).length, 1 );
} );

test( 'MUST FAIL: inert and page-level aria-hidden toggles, html position and the focused element are off rest', async () => {
	assert.match( ( await signatureAfter( () => document.getElementById( 'main' ).setAttribute( 'inert', '' ) ) ).join(), /inert/ );
	assert.match( ( await signatureAfter( () => document.getElementById( 'main' ).setAttribute( 'aria-hidden', 'true' ) ) ).join(), /aria-hidden/ );
	assert.match( ( await signatureAfter( () => document.getElementById( 'nav' ).setAttribute( 'aria-hidden', 'true' ) ) ).join(), /aria-hidden/, 'a landmark inside the header' );
	assert.match( ( await signatureAfter( () => { document.documentElement.style.position = 'fixed'; } ) ).join(), /html position|scroll lock/ );
	assert.match( ( await signatureAfter( () => document.getElementById( 'b' ).focus() ) ).join(), /focus/ );
} );

test( 'MUST FAIL: an svg drawing group or an in-flow element taking a transform is no layer (the Indus logo at 1920); an absolute panel that slides into view is', async () => {
	assert.deepEqual( await signatureAfter( () => { document.getElementById( 'mark' ).style.transform = 'translate(10px, 0)'; } ), [] );
	assert.deepEqual( await signatureAfter( () => { document.getElementById( 'lift' ).style.transform = 'translateY(4px)'; } ), [] );
	assert.equal( ( await signatureAfter( () => { const m = document.getElementById( 'mega' ); m.style.left = '0px'; m.style.transform = 'translateY(0)'; } ) ).length, 1 );
} );

test( 'control: an unchanged page, an icon\'s own aria-hidden and a layer still off screen are at rest', async () => {
	assert.deepEqual( await signatureAfter( () => 0 ), [], 'a fixed chip and a rotated decoration present at rest stay at rest' );
	assert.deepEqual( await signatureAfter( () => document.querySelector( '#b span' ).setAttribute( 'aria-hidden', 'false' ) ), [] );
	assert.deepEqual( await signatureAfter( () => { document.getElementById( 'aside' ).style.transform = 'translateX(110%)'; } ), [] );
	assert.deepEqual( await signatureAfter( () => { document.querySelectorAll( '.slide' )[ 1 ].style.left = '30px'; } ), [], 'a second slide of the same name coming into view' );
} );

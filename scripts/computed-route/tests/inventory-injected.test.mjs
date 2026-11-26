// Spec 48 RC12 (FR-48-25's skeleton inventory, lib/skeleton-inventory.mjs::injectedContent): an element the draft's code
// fills at run time with a fetched SVG (written into a holder, or a custom element's own content) is read, at each width,
// as holding that SVG and its source file; the match is by element structure and viewBox, so ids the code renames still
// match. An inline SVG icon the page never fetched is not injected content. Runs in Chromium on a planted page.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import { injectedContent } from '../lib/skeleton-inventory.mjs';

const SVG = ( w ) => `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ w } 100"><metadata>editor</metadata><g id="rays"><path d="M0 0h10v10z"/></g><path id="ground" d="M0 50h${ w }v50H0z"/></svg>`;
const PAGE = `<!doctype html><html><body>
<div data-inv-i="0" id="hero"></div>
<brand-mark data-inv-i="1"></brand-mark>
<span data-inv-i="2"><svg viewBox="0 0 16 16"><path d="M0 0h16v16z"/></svg></span>
<div data-inv-i="3"></div>
<script>
class BrandMark extends HTMLElement { async connectedCallback() { const t = await ( await fetch( 'art/wide.svg' ) ).text(); this.innerHTML = t.replace( /id="([^"]+)"/g, 'id="m1_$1"' ); } }
customElements.define( 'brand-mark', BrandMark );
const wide = innerWidth > 1000;
fetch( wide ? 'art/wide.svg' : 'art/narrow.svg' ).then( ( r ) => r.text() ).then( ( t ) => { document.getElementById( 'hero' ).innerHTML = t.replace( /<metadata>[\\s\\S]*?<\\/metadata>/, '' ); } );
fetch( 'art/narrow.svg' ).then( ( r ) => r.text() ).then( ( t ) => { const d = document.querySelector( '[data-inv-i="3"]' ); d.innerHTML = t.replace( '<g id="rays">', '<g id="rays"><circle r="2"/>' ); } );
</script></body></html>`;

async function read( width ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'inv-injected-' ) );
	fs.mkdirSync( path.join( dir, 'art' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), PAGE );
	fs.writeFileSync( path.join( dir, 'art', 'wide.svg' ), SVG( 2100 ) );
	fs.writeFileSync( path.join( dir, 'art', 'narrow.svg' ), SVG( 1000 ) );
	const served = await serveDraft( dir, { index: 'index.html' } );
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await ( await browser.newContext( { viewport: { width, height: 800 } } ) ).newPage();
		await page.goto( `${ served.url }index.html`, { waitUntil: 'networkidle' } );
		await page.waitForFunction( () => document.querySelectorAll( 'svg' ).length >= 4 );
		return await page.evaluate( injectedContent );
	} finally {
		await browser.close();
		await served.close();
		fs.rmSync( dir, { recursive: true, force: true } );
	}
}

test( 'MUST FAIL: a holder the code fills with a fetched SVG, and a custom element filling itself with ids renamed, hold that SVG and its source at each width', async () => {
	const wide = await read( 1440 );
	assert.deepEqual( wide[ '0' ], { tag: 'svg', viewBox: '0 0 2100 100', source: 'art/wide.svg' } );
	assert.deepEqual( wide[ '1' ], { tag: 'svg', viewBox: '0 0 2100 100', source: 'art/wide.svg' }, 'renamed ids still match the file' );
	const narrow = await read( 375 );
	assert.deepEqual( narrow[ '0' ], { tag: 'svg', viewBox: '0 0 1000 100', source: 'art/narrow.svg' }, 'the narrow width\'s own file' );
} );

test( 'negative control: an inline icon the page never fetched, and an SVG whose elements differ from every fetched file, are not injected content', async () => {
	const wide = await read( 1440 );
	assert.equal( wide[ '2' ], undefined );
	assert.equal( wide[ '3' ], undefined );
} );

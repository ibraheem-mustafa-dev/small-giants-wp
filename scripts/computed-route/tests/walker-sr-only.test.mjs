// A visually hidden link name (the screen-reader text an icon-only link carries, clipped to nothing) paints nothing, so
// the walker never reads it as the pair's text, never lists it in a root's inventory and never names media after it.
// Real shape: the Eye Care footer's sgs/icon links (2026-10-09), whose hidden names read as 117 open rows.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveFinder, collectPair, DEFAULT_PROPS } from '../../parity/lib/collect.mjs';
import { textCarrier, textRun, PAINT_SRC } from '../../parity/lib/paint.mjs';
import { inventory } from '../../parity/lib/chrome.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
const RESOLVE = resolveFinder.toString();
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const HIDDEN = 'position:absolute;inline-size:1px;block-size:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
const row = ( labelStyle ) => `<footer id="f"><div id="row" style="display:flex;gap:10px">
	<div class="sgs-icon" id="icon"><a class="sgs-icon__link" href="#"><span class="sgs-icon__shape" style="display:flex;width:44px;height:44px;align-items:center;justify-content:center;background:#fff;border:1px solid #ddd"><svg width="18" height="18" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg></span><span class="sgs-icon__label" style="${ labelStyle }">Message us on WhatsApp</span></a></div>
</div><p>Designer eyewear</p></footer>`;
const pageWith = async ( html ) => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ html }</body></html>` );
	return page;
};
const carrierOf = ( page ) => page.evaluate( ( src ) => {
	const c = new Function( `return (${ src });` )()( document.querySelector( '#icon' ) );
	return c ? c.textContent : null;
}, textCarrier.toString() );
const runOf = ( page ) => page.evaluate( ( src ) => {
	const r = new Function( `return (${ src });` )()( document.querySelector( '#icon' ) );
	return r ? r.carrier?.textContent || '(box only)' : null;
}, textRun.toString() );

test( 'MUST FAIL: a clipped link name is not the icon pair\'s text carrier', async () => {
	const page = await pageWith( row( HIDDEN ) );
	assert.equal( await carrierOf( page ), null );
	assert.equal( await runOf( page ), null );
	await page.close();
} );

test( 'MUST FAIL: a clipped link name is not in the root inventory, and the icon\'s media is not named after it', async () => {
	const page = await pageWith( row( HIDDEN ) );
	const inv = await page.evaluate( inventory, [ '#f', RESOLVE ] );
	assert.ok( ! inv.texts.includes( 'message us on whatsapp' ), `texts: ${ inv.texts.join( ' | ' ) }` );
	assert.ok( inv.texts.includes( 'designer eyewear' ) );
	assert.ok( inv.media.every( ( m ) => ! /whatsapp/.test( m.host ) ), `media hosts: ${ inv.media.map( ( m ) => m.host ).join( ' | ' ) }` );
	await page.close();
} );

test( 'MUST FAIL: a root pair\'s text is the words it paints, without the clipped link name', async () => {
	const page = await pageWith( row( HIDDEN ) );
	const root = await page.evaluate( collectPair, [ '#f', DEFAULT_PROPS, RESOLVE, null, null, null, PAINT_SRC, null ] );
	assert.equal( root.text, 'Designer eyewear' );
	const icon = await page.evaluate( collectPair, [ '#icon', DEFAULT_PROPS, RESOLVE, null, null, null, PAINT_SRC, null ] );
	assert.equal( icon.text, 'Message us on WhatsApp', 'an element painting no words is named by its hidden link name' );
	await page.close();
} );

test( 'negative control: the same name shown as a visible label is the carrier and is listed', async () => {
	const page = await pageWith( row( 'display:inline' ) );
	assert.equal( await carrierOf( page ), 'Message us on WhatsApp' );
	assert.equal( await runOf( page ), 'Message us on WhatsApp' );
	const inv = await page.evaluate( inventory, [ '#f', RESOLVE ] );
	assert.ok( inv.texts.includes( 'message us on whatsapp' ) );
	await page.close();
} );

test( 'negative control: a 1px absolutely placed element with no clip and visible overflow still paints its text', async () => {
	const page = await pageWith( row( 'position:absolute;left:0;top:60px;font-size:12px' ) );
	assert.equal( await carrierOf( page ), 'Message us on WhatsApp' );
	await page.close();
} );

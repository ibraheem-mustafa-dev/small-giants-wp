// The tpl finder (Spec 47 §3.4, R-47-4): the draft runtime restarts data-dc-tpl at 0 inside every template, so a bare
// [data-dc-tpl="N"] selector lands on whichever copy or nested import comes first. { tpl: "<chain>/<n>#<copy>" } names the
// import-host chain, the number and the copy, and resolves the one element; collect.mjs::tplKeyOf writes the same key.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveFinder, tplKeyOf } from '../../parity/lib/collect.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
const RESOLVE = resolveFinder.toString();
const KEY = tplKeyOf.toString();
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

// Root has two number-5 copies; two Frame Card imports (host stamp 129) each hold their own number 5 and a number 6.
const HTML = `<div class="sc-host" data-sc-name="Root">
	<footer data-dc-tpl="1"><p data-dc-tpl="5" id="root0">Root copy 0</p><p data-dc-tpl="5" id="root1">Root copy 1</p>
		<div class="sc-host" data-sc-name="Frame Card" data-dc-tpl="129" id="card0"><p data-dc-tpl="5" id="c0n5">Card 0 five</p><p data-dc-tpl="6" id="c0n6">Card 0 six</p></div>
		<div class="sc-host" data-sc-name="Frame Card" data-dc-tpl="129" id="card1"><p data-dc-tpl="5" id="c1n5">Card 1 five</p><p data-dc-tpl="6" id="c1n6">Card 1 six</p></div>
	</footer></div>`;
const open = async () => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ HTML }</body></html>` );
	return page;
};
const idOf = ( page, finder ) => page.evaluate( ( [ f, src ] ) => {
	const e = new Function( `return (${ src });` )()( f );
	return e ? e.id : null;
}, [ finder, RESOLVE ] );

test( 'MUST FAIL: a bare [data-dc-tpl] selector picks the first copy in the document, the tpl finder picks the named one', async () => {
	const page = await open();
	assert.equal( await idOf( page, '[data-dc-tpl="5"]' ), 'root0', 'the bare selector can only ever take the first match' );
	assert.equal( await idOf( page, { tpl: 'Root/5#1' } ), 'root1' );
	assert.equal( await idOf( page, { tpl: 'Root/5#0' } ), 'root0' );
	assert.equal( await idOf( page, '[data-dc-tpl="6"]' ), 'c0n6' );
	assert.equal( await idOf( page, { tpl: 'Root>Frame Card@129#1/6#0' } ), 'c1n6', 'the second Frame Card, not the first' );
	assert.equal( await idOf( page, { tpl: 'Root>Frame Card@129#0/5#0' } ), 'c0n5', 'a nested number 5 is not a Root number 5' );
	assert.equal( await idOf( page, { tpl: 'Root>Frame Card@129#1/5#0' } ), 'c1n5' );
	await page.close();
} );

test( 'a tpl finder that names nothing resolves to null, and within keeps it inside its node', async () => {
	const page = await open();
	assert.equal( await idOf( page, { tpl: 'Root/5#2' } ), null );
	assert.equal( await idOf( page, { tpl: 'Root>Frame Card@129#2/5#0' } ), null );
	assert.equal( await idOf( page, { tpl: 'Root>Frame Card@130#0/5#0' } ), null );
	assert.equal( await idOf( page, { tpl: 'Other/5#0' } ), null );
	assert.equal( await idOf( page, { tpl: 'Root>Frame Card@129#1/5#0', within: '#card1' } ), 'c1n5' );
	assert.equal( await idOf( page, { tpl: 'Root>Frame Card@129#1/5#0', within: '#card0' } ), null, 'outside the scope' );
	await page.close();
} );

test( 'tplKeyOf and the tpl finder are inverses for every stamped element', async () => {
	const page = await open();
	const rows = await page.evaluate( ( [ keySrc, resolveSrc ] ) => {
		const keyOf = new Function( `return (${ keySrc });` )();
		const resolve = new Function( `return (${ resolveSrc });` )();
		return [ ...document.querySelectorAll( '[data-dc-tpl]' ) ].map( ( e ) => {
			const key = keyOf( e );
			return { id: e.id || e.tagName, key, back: resolve( { tpl: key } )?.id || resolve( { tpl: key } )?.tagName || null };
		} );
	}, [ KEY, RESOLVE ] );
	assert.equal( rows.length, 9 );
	assert.equal( new Set( rows.map( ( r ) => r.key ) ).size, 9, 'every element has its own key' );
	rows.forEach( ( r ) => assert.equal( r.back, r.id, r.key ) );
	assert.ok( rows.some( ( r ) => 'Root>Frame Card@129#1/6#0' === r.key ) );
	await page.close();
} );

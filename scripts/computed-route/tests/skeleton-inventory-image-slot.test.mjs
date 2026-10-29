// An image placeholder element (<image-slot>) names itself by its id and prints its placeholder text as its alt: the skeleton
// inventory (lib/skeleton-inventory.mjs::readInventory) records both, so a loop of brand logos reads each copy's name
// (lib/fill-list-items.mjs). MUST FAIL: the planted slots' id and placeholder reach the inventory. Negative controls: an input's
// placeholder and an ordinary element's id are not recorded.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readInventory } from '../lib/skeleton-inventory.mjs';

const HTML = `<!doctype html><html><body><div class="sc-host" data-sc-name="Root" data-dc-tpl="">
<div data-dc-tpl="9"><header data-dc-tpl="1" id="top"><a data-dc-tpl="2" href="/a"><image-slot data-dc-tpl="3" id="brand-a" shape="rect" placeholder="Brand A"></image-slot></a>
<a data-dc-tpl="4" href="/b"><image-slot data-dc-tpl="5" id="brand-b" placeholder="Brand B"></image-slot></a>
<image-slot data-dc-tpl="6" id="bare"></image-slot><input data-dc-tpl="7" placeholder="Search the shop"></header></div></div></body></html>`;

let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( async () => {
	await browser?.close();
} );

async function read() {
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.setContent( HTML );
	await page.evaluate( ( src ) => {
		window.__dcAnnotatedTemplate = () => src;
		window.__dcRootName = () => 'Root';
	}, HTML.match( /<div data-dc-tpl="9">[\s\S]*<\/header><\/div>/ )[ 0 ] );
	try {
		return await readInventory( { page, root: 'header', settle: async () => {} } );
	} finally {
		await page.close();
	}
}
const byTpl = ( inv, n ) => inv.elements.find( ( e ) => e.key === `Root/${ n }#0` );

test( 'MUST FAIL: an image placeholder element keeps its id and its placeholder text', async () => {
	const inv = await read();
	assert.deepEqual( [ byTpl( inv, 3 ).attrs.id, byTpl( inv, 3 ).attrs.placeholder ], [ 'brand-a', 'Brand A' ] );
	assert.deepEqual( [ byTpl( inv, 5 ).attrs.id, byTpl( inv, 5 ).attrs.placeholder ], [ 'brand-b', 'Brand B' ] );
	assert.deepEqual( byTpl( inv, 6 ).attrs, { id: 'bare' }, 'a slot with no placeholder keeps only its id' );
} );

test( 'negative control: an input\'s placeholder and an ordinary element\'s id are not recorded', async () => {
	const inv = await read();
	assert.equal( byTpl( inv, 7 ).attrs.placeholder, undefined );
	assert.equal( byTpl( inv, 1 ).attrs.id, undefined );
} );

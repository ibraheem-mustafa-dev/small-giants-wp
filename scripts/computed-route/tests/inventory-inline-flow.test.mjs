// The skeleton inventory (lib/skeleton-inventory.mjs::readInventory) records a text element's content in order (`flow`:
// text runs, line breaks and the keys of its stamped children), the paint an inline element differs from its parent by
// (`inlineDiff`) and each width's display (`displayAt`), so a paragraph holding <b>, <a> or a coloured word is rebuilt as
// one text block's inline HTML (rule: phrasing content inside a text element stays that element's inline HTML). MUST FAIL:
// the planted paragraph's run order, the bold word's difference and the per-width display reach the inventory. Negative
// controls: an element holding no child element records no flow, and a block child records no inline difference.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readInventory } from '../lib/skeleton-inventory.mjs';

const TPL = `<div data-dc-tpl="9"><section data-dc-tpl="1"><p data-dc-tpl="2"><b data-dc-tpl="3">Vegan base:</b> no eggs, see the <a data-dc-tpl="4" href="/help">help page</a>.<br>Thanks <span data-dc-tpl="5" style="color:rgb(200, 0, 0)">today</span></p>
<p data-dc-tpl="6">Plain words only.</p><div data-dc-tpl="7"><div data-dc-tpl="8">A block child</div></div></section></div>`;
const HTML = `<!doctype html><html><body><div class="sc-host" data-sc-name="Root" data-dc-tpl="">${ TPL }</div></body></html>`;

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
	}, TPL );
	try {
		return await readInventory( { page, root: 'section', settle: async () => {} } );
	} finally {
		await page.close();
	}
}
const byTpl = ( inv, n ) => inv.elements.find( ( e ) => e.key === `Root/${ n }#0` );

test( 'MUST FAIL: a paragraph records its runs in order, an inline word its paint difference, every element its per-width display', async () => {
	const inv = await read();
	assert.deepEqual( byTpl( inv, 2 ).flow, [ { key: 'Root/3#0' }, ' no eggs, see the ', { key: 'Root/4#0' }, '.', { br: true }, 'Thanks ', { key: 'Root/5#0' } ] );
	assert.equal( byTpl( inv, 3 ).inlineDiff[ 'font-weight' ], '700' );
	assert.equal( byTpl( inv, 5 ).inlineDiff.color, 'rgb(200, 0, 0)' );
	assert.deepEqual( byTpl( inv, 3 ).displayAt, { 375: 'inline', 768: 'inline', 1440: 'inline' } );
	assert.equal( byTpl( inv, 8 ).displayAt[ 1440 ], 'block' );
	assert.equal( byTpl( inv, 2 ).words, 'no eggs, see the . Thanks', 'the recorded own words are unchanged for every other reader' );
} );

test( 'negative control: an element with no child element records no flow; a block child records no inline difference', async () => {
	const inv = await read();
	assert.equal( byTpl( inv, 6 ).flow, undefined );
	assert.equal( byTpl( inv, 8 ).inlineDiff, undefined );
} );

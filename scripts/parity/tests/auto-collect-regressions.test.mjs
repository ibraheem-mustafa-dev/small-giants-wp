// The automatic collector's clip background: a control inside an overflow-clipped box reads the background of the nearest
// painted ancestor, in a real browser on local HTML.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';

const COLLECT_SRC = readFileSync( new URL( '../lib/auto-collect.mjs', import.meta.url ), 'utf8' ).replace( /^export function/m, 'function' );
const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

test( 'a control in an overflow-hidden box reads the white background of the ancestor that paints it', async () => {
	const page = await browser.newPage();
	try {
		await page.setContent( `<!doctype html><html style="background:#fff"><body style="margin:0">
			<div style="background:transparent;overflow:hidden;width:300px;height:120px;padding:10px">
				<button aria-label="Buy" style="width:40px;height:40px"></button>
			</div></body></html>` );
		await page.addScriptTag( { content: COLLECT_SRC } );
		const clip = await page.evaluate( () => collectAuto( [ {}, [], 10 ] ).controls[ 0 ]?.clip );
		assert.ok( clip, 'the button is collected with a clip ancestor' );
		assert.equal( clip.bg, 'rgb(255,255,255)' );
	} finally {
		await page.close();
	}
} );

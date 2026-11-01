// submitForm on a form whose controls reveal on scroll (the clone reproducing a draft's scroll reveal): the submit button
// has an empty box until it enters the viewport and its transition ends, so a lookup before scrolling sees nothing.
// MUST FAIL: such a button is found and clicked; a form with truly no submit or next button still fails with the same message.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadChromium } from '../lib/fill-read.mjs';
import { submitForm, revealInPage } from '../lib/form-submit-page.mjs';

let browser;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch();
} );
after( async () => browser?.close() );

const page = async ( inner, reveal = true ) => {
	const p = await browser.newPage( { viewport: { width: 375, height: 700 } } );
	await p.setContent( `<!doctype html><html><head><style>
		body{margin:0}.gap{height:1800px}.rev{transform:scale(0);opacity:0;transition:transform .9s,opacity .9s}.rev.in{transform:none;opacity:1}
	</style></head><body><div class="gap"></div><form class="sgs-form__inner" onsubmit="event.preventDefault();window.sent=true">${ inner }</form><div class="gap"></div>
	<script>${ reveal ? "const io=new IntersectionObserver((es)=>es.forEach((e)=>e.isIntersecting&&e.target.classList.add('in')));document.querySelectorAll('.rev').forEach((e)=>io.observe(e));" : '' }</script></body></html>` );
	return p;
};

test( 'MUST FAIL: a submit button that only gets a box after scrolling into view is found and clicked', async () => {
	const p = await page( '<input type="text" name="n" required><button type="submit" class="rev">Send</button>' );
	const out = await submitForm( p, 0, { marker: 'SGS test' } );
	const sent = await p.evaluate( () => window.sent === true );
	await p.close();
	assert.equal( out.steps, 1 );
	assert.equal( sent, true );
} );

test( 'MUST FAIL: a form with no submit and no next button still fails with the same message', async () => {
	const p = await page( '<input type="text" name="n" required><button type="button" class="rev">Not a submit</button>' );
	await assert.rejects( submitForm( p, 0, { marker: 'SGS test' } ), /neither a submit nor a next button is visible/ );
	await p.close();
} );

test( 'MUST FAIL: a control that never reveals is not forced visible', async () => {
	const p = await page( '<button type="submit" class="rev">Send</button>', false );
	await assert.rejects( submitForm( p, 0 ), /neither a submit nor a next button is visible/ );
	await p.close();
} );

test( 'revealInPage returns when the form is absent', async () => {
	const p = await page( '' );
	await p.evaluate( revealInPage, [ '#none', 500 ] );
	await p.close();
} );

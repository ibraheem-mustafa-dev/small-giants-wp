// lib/fill-read.mjs::playEntrances: the draft is read at rest (Spec 48 R-47-4). A reveal the draft's own script drives
// (an IntersectionObserver writing opacity and transform inline, Eye Care's data-reveal) is no animation the browser
// lists, so only a sweep of the page fires it; before the sweep Fill read its start pose (opacity 0, translateY) and
// wrote it as the block's resting Custom CSS, hiding 70 blocks on Eye Care. Run in a real browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadChromium, playEntrances } from '../lib/fill-read.mjs';
import { triggerArmed } from '../../parity/lib/devtools.mjs';

let browser;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch();
} );
after( async () => browser?.close() );

const PAGE = `<!doctype html><body style="margin:0">
	<div style="height:2400px">top</div>
	<p id="r" data-reveal>Revealed by script</p>
	<p id="h" style="opacity:0">Hidden by design</p>
	<div style="height:600px"></div>
	<script>
		const el = document.getElementById( 'r' );
		el.style.opacity = '0'; el.style.transform = 'translateY(26px)';
		new IntersectionObserver( ( es, io ) => es.forEach( ( e ) => {
			if ( e.isIntersecting ) { e.target.style.transition = 'opacity .3s, transform .3s'; e.target.style.opacity = '1'; e.target.style.transform = 'none'; io.unobserve( e.target ); }
		} ) ).observe( el );
	</script></body>`;

const read = ( page ) => page.evaluate( () => [ getComputedStyle( document.getElementById( 'r' ) ).opacity, getComputedStyle( document.getElementById( 'h' ) ).opacity, window.scrollY ] );

test( 'MUST FAIL: a script-driven scroll reveal below the fold is read at rest after playEntrances, and the scroll is put back', async () => {
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.setContent( PAGE );
	await playEntrances( page, { stepMs: 60 } );
	const [ revealed, hidden, y ] = await read( page );
	await page.close();
	assert.equal( revealed, '1' );
	assert.equal( hidden, '0', 'an element hidden by design stays hidden' );
	assert.equal( y, 0 );
} );

test( 'negative control: triggerArmed alone (the previous read) leaves the script-driven reveal at its start pose', async () => {
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.setContent( PAGE );
	await triggerArmed( page );
	const [ revealed ] = await read( page );
	await page.close();
	assert.equal( revealed, '0' );
} );

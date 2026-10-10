// A-1 in a real browser (headless Chromium on local HTML, never a site): the walker settles on the page's animations,
// reads every hover by forcing :hover through the DevTools protocol, and reads declared sizes from the matched rules.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveFinder, hoverStyles } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { openDevtools, settleAnimations, triggerArmed, armedEntrances, forcedHover, declaredValues, cascadeWinner } from '../../parity/lib/devtools.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
const RESOLVE = resolveFinder.toString();
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const pageWith = async ( html ) => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ html }</body></html>` );
	return page;
};
const opacity = ( page ) => page.evaluate( () => getComputedStyle( document.querySelector( '.fade' ) ).opacity );
const FADE = '<style>@keyframes in { from { opacity: 0 } to { opacity: 1 } } .fade { animation: in 1.2s linear 0.2s both }</style><p class="fade">Hi</p><i class="spin" style="display:block;animation:in 1s infinite"></i>';

test( 'MUST FAIL TO READ MID-ENTRANCE: the settle waits for a 1.4s entrance and ignores an infinite loop', async () => {
	const page = await pageWith( FADE );
	const r = await settleAnimations( page, { floor: 100 } );
	assert.equal( r.settled, true );
	assert.equal( await opacity( page ), '1' );
	assert.ok( r.waited < 3000, `settled in ${ r.waited }ms, not held by the infinite loop` );
	await page.close();
} );

test( 'negative control: the floor alone reads the entrance mid-way', async () => {
	const page = await pageWith( FADE );
	await page.waitForTimeout( 300 );
	assert.notEqual( await opacity( page ), '1' );
	await page.close();
} );

const HOVER = `<style>
	.card .title { color: rgb(0, 0, 0) } .card:hover .title { color: rgb(200, 0, 0) }
	.btn { display: inline-block; transition: transform 0.3s } .btn:hover { transform: translateY(-3px) }
</style><div class="card"><h2 class="title">Title</h2><a class="btn" href="#">Shop</a></div>`;
const read = ( page, sel, props ) => () => page.evaluate( hoverStyles, [ sel, props, RESOLVE, PAINT_SRC ] );

test( 'MUST FAIL TO MISS: forced :hover reads a parent-hover colour and a finished lift, then clears', async () => {
	const page = await pageWith( HOVER );
	const cdp = await openDevtools( page );
	const title = await forcedHover( cdp, page, '.title', RESOLVE, read( page, '.title', [ 'color' ] ) );
	assert.equal( title.color, 'rgb(200, 0, 0)', 'the ancestor .card is hovered too' );
	const btn = await forcedHover( cdp, page, '.btn', RESOLVE, read( page, '.btn', [ 'transform' ] ) );
	assert.equal( btn.transform, 'matrix(1, 0, 0, 1, 0, -3)', 'read after the 0.3s transition finished' );
	assert.equal( ( await read( page, '.title', [ 'color' ] )() ).color, 'rgb(0, 0, 0)', 'the force is cleared' );
	assert.equal( await forcedHover( cdp, page, '.nothing', RESOLVE, read( page, '.nothing', [ 'color' ] ) ), null );
	await page.close();
} );

test( 'negative control: without the force the same reads give the rest values', async () => {
	const page = await pageWith( HOVER );
	assert.equal( ( await read( page, '.title', [ 'color' ] )() ).color, 'rgb(0, 0, 0)' );
	assert.equal( ( await read( page, '.btn', [ 'transform' ] )() ).transform, 'none' );
	await page.close();
} );

test( 'MUST FAIL TO FREEZE: declared sizes come from the matched rules where computed style gives used pixels', async () => {
	const page = await pageWith( `<style>
		.wrap { width: 400px } .addr { width: 50%; max-width: 20rem } #a.addr { width: 168px }
		.loose { width: 30% !important } .loose { width: 10px } p { min-height: 1px }
	</style><div class="wrap"><div class="addr" id="a">A</div><div class="addr">B</div><div class="loose">C</div><span class="none">D</span></div>` );
	const cdp = await openDevtools( page );
	assert.deepEqual( await declaredValues( cdp, '.addr:not(#a)', RESOLVE ), { width: '50%', 'max-width': '20rem' } );
	assert.equal( await page.evaluate( () => getComputedStyle( document.querySelector( '.addr:not(#a)' ) ).width ), '200px' );
	assert.deepEqual( await declaredValues( cdp, '#a', RESOLVE ), { width: '168px', 'max-width': '20rem' }, 'the more specific rule wins' );
	assert.deepEqual( await declaredValues( cdp, '.loose', RESOLVE ), { width: '30%' }, '!important beats a later normal rule' );
	assert.deepEqual( await declaredValues( cdp, '.none', RESOLVE ), {}, 'nothing declared: no declared values' );
	await page.close();
} );

test( 'cascade winner: inline beats rules, user-agent rules are ignored, a disabled or unparsed one never wins', () => {
	const rule = ( origin, props ) => ( { rule: { origin, style: { cssProperties: props } } } );
	const m = { matchedCSSRules: [ rule( 'user-agent', [ { name: 'width', value: 'auto' } ] ), rule( 'regular', [ { name: 'width', value: '10px' } ] ), rule( 'regular', [ { name: 'width', value: '12px', disabled: true } ] ) ], inlineStyle: { cssProperties: [ { name: 'width', value: '20px' }, { name: 'height', value: 'x', parsedOk: false } ] } };
	assert.equal( cascadeWinner( m, 'width' ), '20px' );
	assert.equal( cascadeWinner( m, 'height' ), null );
	assert.equal( cascadeWinner( { matchedCSSRules: [ rule( 'user-agent', [ { name: 'width', value: 'auto' } ] ) ] }, 'width' ), null );
} );

test( 'MUST FAIL: a presentation attribute declares, below every author rule, a unitless length in px', () => {
	// The Eye Care footer glyph: <svg width="18">, which CDP lists only as attributesStyle.
	const attrs = { attributesStyle: { cssProperties: [ { name: 'width', value: '18' }, { name: 'fill', value: 'none' } ] } };
	assert.equal( cascadeWinner( attrs, 'width' ), '18px' );
	assert.equal( cascadeWinner( attrs, 'fill' ), 'none' );
	// negative control: any author rule or inline style beats the attribute.
	const rule = ( props ) => ( { rule: { origin: 'regular', style: { cssProperties: props } } } );
	assert.equal( cascadeWinner( { ...attrs, matchedCSSRules: [ rule( [ { name: 'width', value: '24px' } ] ) ] }, 'width' ), '24px' );
	assert.equal( cascadeWinner( { ...attrs, inlineStyle: { cssProperties: [ { name: 'width', value: '30px' } ] } }, 'width' ), '30px' );
} );

test( 'MUST FAIL TO MISS: a text run reads its rows and the space between them in the page', async () => {
	const page = await pageWith( `<style>ul { margin: 0; padding: 0; list-style: none; display: grid; row-gap: 14px; font: 16px/20px sans-serif }</style>
		<ul class="hours"><li><span>Mon</span> <span>9 to 5</span></li><li>Tue 9 to 5</li><li>Wed 9 to 5</li></ul>` );
	const rows = await page.evaluate( ( src ) => new Function( `${ src }; return textRun( document.querySelector( '.hours' ), false ).rows;` )(), PAINT_SRC );
	assert.equal( rows.count, 3, 'a day and its hours on one line are one row' );
	assert.ok( Math.abs( rows.space - 14 ) <= 1, `space ${ rows.space } is the list's 14px gap` );
	await page.close();
} );

// An armed entrance: created paused at its start pose (opacity 0), far below the fold. `WITH_TRIGGER` plays it once it
// nears the viewport (as animation-observer.js does); `NO_TRIGGER` never plays it (a broken reveal).
const ARMED = '<style>.gap { height: 2400px } .rise { opacity: 1 }</style><div class="gap"></div><p class="rise" data-sgs-animation="fade-up">Hi</p>';
const ARM_JS = 'const el = document.querySelector( ".rise" ); const a = el.animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 400, fill: "backwards" } ); a.pause();';
const WITH_TRIGGER = `<script>${ ARM_JS } new IntersectionObserver( ( es ) => es.forEach( ( e ) => e.isIntersecting && a.play() ) ).observe( el );</script>`;
const NO_TRIGGER = `<script>${ ARM_JS }</script>`;
const riseOpacity = ( page ) => page.evaluate( () => getComputedStyle( document.querySelector( '.rise' ) ).opacity );

test( 'MUST FAIL TO READ AT THE START FRAME: an armed entrance is invisible to the settle and played by triggerArmed', async () => {
	const page = await pageWith( ARMED + WITH_TRIGGER );
	const r = await settleAnimations( page, { floor: 100 } );
	assert.equal( r.settled, true, 'the settle alone declares the page settled' );
	assert.equal( ( await page.evaluate( armedEntrances ) ).length, 1, 'while one entrance still sits paused' );
	assert.equal( await riseOpacity( page ), '0', 'negative control: the resting read after the settle alone is the start frame' );
	const t = await triggerArmed( page, { floor: 100 } );
	assert.deepEqual( [ t.armed, t.played, t.unfired.length ], [ 1, 1, 0 ] );
	assert.equal( await riseOpacity( page ), '1', 'the resting read is the settled value' );
	assert.equal( await page.evaluate( () => window.scrollY ), 0, 'the scroll is put back' );
	await page.close();
} );

test( 'MUST NOT OVER-SUPPRESS: an entrance that never fires surfaces as unfired, not as settled', async () => {
	const page = await pageWith( ARMED + NO_TRIGGER );
	const t = await triggerArmed( page, { floor: 100, cap: 1000 } );
	assert.equal( t.armed, 1 );
	assert.equal( t.played, 0 );
	assert.equal( t.unfired.length, 1, 'the walker reports the reveal it cannot resolve' );
	assert.equal( t.unfired[ 0 ].animation, 'fade-up' );
	assert.equal( await riseOpacity( page ), '0', 'and the element really is still at its start frame' );
	await page.close();
} );

test( 'a page with no armed entrance reports nothing', async () => {
	const page = await pageWith( FADE );
	assert.deepEqual( await triggerArmed( page, { floor: 50 } ), { armed: 0, played: 0, unfired: [] } );
	await page.close();
} );

// Walker W1 (GAP-CHECKLIST.md section 29): an icon block paints its circle, ground and shadow on an inner 34px shape inside
// a 44px link, where the draft paints them on the link itself. The walker read the pair's root, so the 2026-10 header walk
// reported border-radius, ground and shadow rows on every social icon although both pages paint the same circle.
// collectPair and hoverStyles read paint properties from the element that paints them (paint.mjs::paintElement), and a
// forced hover runs from the deepest element under the pointer (devtools.mjs::pointerTarget), in headless Chromium.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROPS, HOVER_PROPS, resolveFinder, collectPair, hoverStyles } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { paintedExtras } from '../../parity/lib/chrome.mjs';
import { comparePair } from '../../parity/lib/compare.mjs';
import { openDevtools, forcedHover } from '../../parity/lib/devtools.mjs';

const { chromium } = await import( 'playwright' );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
const PAINT = /^(background-color|background-image|border-radius|box-shadow|border-.*)$/;
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const SVG = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M0 0h16v16H0z" fill="#fff"/></svg>';
const DRAFT = `<a id="icon" href="#" aria-label="LinkedIn" style="width:34px;height:34px;border-radius:50%;background:rgb(10,102,194);display:flex;align-items:center;justify-content:center;">${ SVG }</a>
	<style>#icon{box-shadow:rgba(0,0,0,.18) 0 2px 6px}#icon:hover{box-shadow:rgba(0,0,0,.45) 0 10px 20px -6px}</style>`;
const LIVE = `<style>.icon{display:inline-block}.link{display:flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:50%;position:relative}
	.shape{display:flex;width:34px;height:34px;border-radius:50%;background:rgb(10,102,194);align-items:center;justify-content:center;box-shadow:rgba(0,0,0,.18) 0 2px 6px}
	.label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.link:hover .shape{box-shadow:rgba(0,0,0,.45) 0 10px 20px -6px}</style>
	<div id="icon" class="icon"><a class="link" href="#"><span class="shape">${ SVG }</span><span class="label">LinkedIn</span></a></div>`;
const snapOf = async ( html, { paintPart = true, cdp = false } = {} ) => {
	const page = await browser.newPage();
	await page.setContent( `<!doctype html><html><body>${ html }</body></html>` );
	const opts = { others: [], paintPart };
	const snap = await page.evaluate( collectPair, [ '#icon', DEFAULT_PROPS, RESOLVE, null, null, null, PAINT_SRC, null, opts ] );
	snap.extras = await page.evaluate( paintedExtras, [ '#icon', RESOLVE, PAINT_SRC ] );
	if ( cdp ) {
		const session = await openDevtools( page );
		snap.hover = await forcedHover( session, page, '#icon', RESOLVE, () => page.evaluate( hoverStyles, [ '#icon', HOVER_PROPS, RESOLVE, PAINT_SRC, opts ] ) );
	}
	await page.close();
	return snap;
};
const paintRows = ( d, l ) => comparePair( { text: false, box: [] }, d, l, TOL ).filter( ( r ) => PAINT.test( r.key ) );

test( 'MUST FAIL (header walk 2026-10: 14 groups on the social icons): an inner shape painting the same circle as the draft link makes no paint row', async () => {
	const d = await snapOf( DRAFT );
	const l = await snapOf( LIVE );
	assert.deepEqual( paintRows( d, l ), [] );
	assert.equal( l.styles[ 'border-radius' ], '50%' );
	assert.equal( d.extras.ground, l.extras.ground, 'the painted ground is the shape\'s too' );
	// The reading the walker made before: the root's own paint.
	assert.ok( paintRows( await snapOf( DRAFT, { paintPart: false } ), await snapOf( LIVE, { paintPart: false } ) ).length >= 3 );
} );

test( 'MUST FAIL: the hover shadow on the inner shape (a `.link:hover .shape` rule) is read under a forced hover of the pair', async () => {
	const d = await snapOf( DRAFT, { cdp: true } );
	const l = await snapOf( LIVE, { cdp: true } );
	assert.equal( l.hover[ 'box-shadow' ], 'rgba(0, 0, 0, 0.45) 0px 10px 20px -6px' );
	assert.deepEqual( comparePair( { text: false, box: [] }, d, l, TOL ).filter( ( r ) => 'hover' === r.kind && PAINT.test( r.key ) ), [] );
} );

test( 'negative control: a background planted on the outer link while the shape is unchanged is a background row', async () => {
	const l = await snapOf( LIVE.replace( '.link{display:flex;', '.link{display:flex;background:rgb(200,0,0);' ) );
	const rows = paintRows( await snapOf( DRAFT ), l );
	assert.ok( rows.some( ( r ) => 'background-color' === r.key && 'rgb(200, 0, 0)' === r.live ), JSON.stringify( rows ) );
} );

test( 'a ground colour under the same gradient paints nothing: the painted ground reads as the gradient on both sides', async () => {
	const grad = 'radial-gradient(circle at 30% 107%, rgb(253, 244, 151) 0%, rgb(214, 36, 159) 60%)';
	const d = await snapOf( DRAFT.replace( 'background:rgb(10,102,194)', `background:${ grad }` ) );
	const l = await snapOf( LIVE.replace( 'background:rgb(10,102,194)', `background:${ grad };background-color:rgb(228,64,95)` ) );
	assert.equal( d.extras.ground, 'gradient' );
	assert.equal( l.extras.ground, 'gradient' );
} );

test( 'the paint walk never enters an element another pair measures: a same-box enclosing pair keeps its ground', async () => {
	const page = await browser.newPage();
	await page.setContent( '<!doctype html><html><body><div id="card" style="background:rgb(0,128,0);display:inline-block"><a id="link" href="#" style="display:block;width:80px;height:30px">Go</a></div></body></html>' );
	const read = ( others ) => page.evaluate( collectPair, [ '#link', DEFAULT_PROPS, RESOLVE, null, null, null, PAINT_SRC, null, { others, paintPart: true } ] );
	const own = await read( [ '#card' ] );
	const climbed = await read( [] );
	await page.close();
	assert.equal( own.styles[ 'background-color' ], 'rgba(0, 0, 0, 0)' );
	assert.equal( climbed.styles[ 'background-color' ], 'rgb(0, 128, 0)', 'with no pair there, the same-box ancestor that paints is the ground' );
} );

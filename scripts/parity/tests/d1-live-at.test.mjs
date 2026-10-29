// Register D1 (Bean, 2026-10-29): a value Fill wrote is read on live where its setting paints (the calibrated slot), not on the
// block's wrapper. Shape taken from the Indus brands page: the wrapper `cr-ref-brands-17` holds 0px padding and the container's
// inner band `.sgs-container__inner` holds the 12px the draft declares. Headless Chromium on local HTML.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinder, collectPair } from '../lib/collect.mjs';
import { PAINT_SRC } from '../lib/paint.mjs';
import { readOpts } from '../lib/state-passes.mjs';
import { comparePair } from '../lib/compare.mjs';

const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
const PROPS = [ 'padding-top', 'padding-left', 'gap', 'column-gap', 'background-color' ];
const LIVE = '<div class="cr-ref-x" style="padding:0"><div class="sgs-container__inner" style="padding:12px;display:flex;gap:12px"><a href="#">One</a><a href="#">Two</a></div></div>';
const DRAFT = '<div class="card" style="padding:12px;display:flex;gap:12px"><a href="#">One</a><a href="#">Two</a></div>';
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const read = async ( html, finder, opts = {} ) => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body style="margin:0">${ html }</body></html>` );
	const snap = await page.evaluate( collectPair, [ finder, PROPS, RESOLVE, null, null, null, PAINT_SRC, null, { others: [], textOthers: [], paintPart: true, ...opts } ] );
	await page.close();
	return snap;
};
const rows = ( d, l ) => comparePair( { text: false, box: [] }, d, l, TOL ).map( ( r ) => [ r.key, r.draft, r.live ] );

test( 'MUST FAIL: a written property is read at its calibrated slot, so the inner band\'s 12px matches the draft and no row is raised', async () => {
	const d = await read( DRAFT, '.card' );
	const wrapper = await read( LIVE, '.cr-ref-x' );
	assert.equal( wrapper.styles[ 'padding-top' ], '0px' );
	assert.ok( rows( d, wrapper ).some( ( r ) => 'padding-top' === r[ 0 ] && '12px' === r[ 1 ] && '0px' === r[ 2 ] ), 'the wrapper read still raises the false row' );
	const live = await read( LIVE, '.cr-ref-x', { liveAt: { 'padding-top': '.sgs-container__inner', 'padding-left': '.sgs-container__inner', gap: '.sgs-container__inner' } } );
	assert.equal( live.styles[ 'padding-top' ], '12px' );
	assert.equal( live.styles[ 'padding-left' ], '12px' );
	assert.equal( live.styles.gap, '12px' );
	assert.deepEqual( rows( d, live ).filter( ( r ) => /padding|gap/.test( r[ 0 ] ) ), [] );
} );

test( 'negative control: a property Fill did not write keeps the wrapper read, whatever the inner band holds', async () => {
	const live = await read( LIVE, '.cr-ref-x', { liveAt: { 'padding-left': '.sgs-container__inner' } } );
	assert.equal( live.styles[ 'padding-top' ], '0px' );
	assert.equal( live.styles[ 'padding-left' ], '12px' );
} );

test( 'negative control: a genuinely lost write still raises its row (the slot holds 0px against the draft\'s 12px)', async () => {
	const lost = '<div class="cr-ref-x"><div class="sgs-container__inner" style="padding:0"></div></div>';
	const d = await read( DRAFT, '.card' );
	const live = await read( lost, '.cr-ref-x', { liveAt: { 'padding-top': '.sgs-container__inner' } } );
	assert.ok( rows( d, live ).some( ( r ) => 'padding-top' === r[ 0 ] && '12px' === r[ 1 ] && '0px' === r[ 2 ] ) );
} );

test( 'negative control: a slot that matches no element, or is not a selector, keeps the wrapper read', async () => {
	for ( const slot of [ '.sgs-container__missing', '!!not a selector' ] ) {
		const live = await read( LIVE, '.cr-ref-x', { liveAt: { 'padding-top': slot } } );
		assert.equal( live.styles[ 'padding-top' ], '0px' );
	}
} );

test( 'negative control: a written property the pair does not read adds no reading', async () => {
	const live = await read( LIVE, '.cr-ref-x', { liveAt: { 'padding-right': '.sgs-container__inner' } } );
	assert.equal( live.styles[ 'padding-right' ], undefined );
} );

test( 'a colour written at a slot is read at that slot', async () => {
	const html = '<div class="cr-ref-x"><div class="sgs-container__inner" style="background-color:rgb(1,2,3)"></div></div>';
	const live = await read( html, '.cr-ref-x', { liveAt: { 'background-color': '.sgs-container__inner' } } );
	assert.equal( live.styles[ 'background-color' ], 'rgb(1, 2, 3)' );
} );

test( 'readOpts passes a pair\'s liveAt to its live read only', () => {
	const p = { name: 'a', draft: '.card', live: '.cr-ref-x', liveAt: { gap: '.sgs-container__inner' } };
	assert.deepEqual( readOpts( [ p ], p, 'live' ).liveAt, { gap: '.sgs-container__inner' } );
	assert.equal( readOpts( [ p ], p, 'draft' ).liveAt, undefined );
	const q = { name: 'b', draft: '.x', live: '.y' };
	assert.equal( readOpts( [ q ], q, 'live' ).liveAt, undefined );
} );

// "Does it paint?" (Spec 47 route-accuracy R5, GAP-CHECKLIST 8): a layout difference is accepted only when setting the
// draft value on the live element, on the element the walker read it from, moves no box and no line of text inside the
// pair or after it. Replaces the INERT_LAYOUT rule of thumb (ba31e5157), which accepted these properties for any value
// whenever the pair's own box matched, so children moving inside a same-size box went unreported.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { candidatesOf, neutraliseInPage } from '../../parity/lib/neutralise.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
const RESOLVE = resolveFinder.toString();
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const HTML = `<style>body{margin:0;font:16px/20px sans-serif}</style>
	<a id="addr" href="#" style="display:flex;column-gap:7px;transition:column-gap 1s">12 High Street</a>
	<div id="row" style="display:flex;width:600px;gap:16px;transition:gap 1s"><span style="width:50px">A</span><span style="width:50px">B</span><span style="width:50px">C</span></div>
	<p id="short" style="width:600px">Short</p>
	<p id="fills" style="width:max-content">Fills</p>
	<div id="grid" style="display:grid;grid-template-columns:30px 1fr;grid-template-rows:auto 0px;row-gap:0px"><span>1</span><span>Step</span></div>
	<div id="stack"><p style="margin:0">One</p><p style="margin:0">Two</p></div>
	<p id="after">Below</p>`;
const run = async ( id, items ) => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ HTML }</body></html>` );
	const out = await page.evaluate( neutraliseInPage, [ `#${ id }`, items, RESOLVE, PAINT_SRC ] );
	const style = await page.evaluate( ( i ) => document.getElementById( i ).getAttribute( 'style' ), id );
	await page.close();
	return { out, style };
};

test( 'MUST FAIL (ba31e5157 accepted any gap in a same-size box): a 48px gap against 16px between three children moves them, so it is not inert', async () => {
	assert.equal( ( await run( 'row', [ { prop: 'gap', value: '48px' } ] ) ).out.gap, 'moves' );
} );

test( 'a one-child link\'s gap paints nothing (the footer address link, 0 against 7px), even under a transition', async () => {
	const { out, style } = await run( 'addr', [ { prop: 'column-gap', value: '0px' } ] );
	assert.equal( out[ 'column-gap' ], 'inert' );
	assert.equal( style, 'display:flex;column-gap:7px;transition:column-gap 1s', 'the element is restored exactly' );
} );

test( 'text-align moves short text in a wide box and nothing in a box the text fills', async () => {
	assert.equal( ( await run( 'short', [ { prop: 'text-align', value: 'center' } ] ) ).out[ 'text-align' ], 'moves' );
	assert.equal( ( await run( 'fills', [ { prop: 'text-align', value: 'center' } ] ) ).out[ 'text-align' ], 'inert' );
} );

test( 'a value that would move the own box of the pair (the home process step: a grid with an empty second row, row-gap 0 live against 16px) breaks the box', async () => {
	assert.equal( ( await run( 'grid', [ { prop: 'row-gap', value: '16px' } ] ) ).out[ 'row-gap' ], 'breaks-box' );
} );

test( 'MUST FAIL (council 2026-10-10): a gap on a live element that is not flex or grid paints nothing by construction, so it is not proof of anything and stays open', async () => {
	assert.equal( ( await run( 'stack', [ { prop: 'row-gap', value: '16px' } ] ) ).out[ 'row-gap' ], 'moves' );
} );

test( 'restoring the value runs while transitions are still off, so a later read never catches the element mid-transition', async () => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ HTML }</body></html>` );
	await page.evaluate( neutraliseInPage, [ '#row', [ { prop: 'gap', value: '48px' } ], RESOLVE, PAINT_SRC ] );
	const running = await page.evaluate( () => document.getAnimations().length );
	await page.close();
	assert.equal( running, 0 );
} );

test( 'candidates: only the tested layout properties whose draft and live values differ, never a text run or group pair', () => {
	const d = { styles: { gap: '16px', 'text-align': 'start', color: 'red', display: 'flex' } };
	const l = { styles: { gap: '0px 16px', 'text-align': 'start', color: 'blue', display: 'block' } };
	assert.deepEqual( candidatesOf( d, l ), [ { prop: 'display', value: 'flex' }, { prop: 'gap', value: '16px' } ] );
	assert.deepEqual( candidatesOf( d, { ...l, missing: true } ), [] );
} );

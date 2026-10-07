// R-47-4 for diagrams: fill-diagram.mjs::diagramGeometry measures a rendered dimension drawing in a real browser
// (headless Chromium on local HTML, the Eye Care draft's own front-view geometry) into sgs/diagram-dimension settings,
// matching the draft to the unit, including a guide pair with uneven reaches in one path.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { diagramGeometry } from '../lib/fill-diagram.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const DRAWING = `<div style="position:relative;width:680px">
<svg id="front" viewBox="0 0 680 300" style="width:100%;height:auto;display:block">
	<path id="eye-guides" d="M120 204V244M290 204V244" stroke="#000"/><path id="eye" d="M120 238H290" stroke="#000"/><path id="eye-ticks" d="M120 232v12M290 232v12" stroke="#000"/>
	<path id="ht-guides" d="M524 80H576M524 200H576" stroke="#000"/><path id="ht" d="M570 80V200" stroke="#000"/>
	<path id="tp-guides" d="M92 70V196M556 138 556 196" stroke="#000"/><path id="tp" d="M92 190H556" stroke="#000"/>
</svg>
<span id="eye-label" style="position:absolute;left:30.1%;top:82%;transform:translateX(-50%)">56 mm</span></div>`;

const measure = async ( spec ) => {
	const page = await browser.newPage( { viewport: { width: 900, height: 600 } } );
	await page.setContent( `<!doctype html><html><body style="margin:0">${ DRAWING }</body></html>` );
	const out = await page.evaluate( diagramGeometry, spec );
	await page.close();
	return out;
};
const near = ( actual, expected, tol = 0.05 ) => assert.ok( Math.abs( actual - expected ) <= tol, `${ actual } ≈ ${ expected }` );

test( 'MUST FAIL TO COPY: the lens width line, its guides, ticks and label are measured to the draft', async () => {
	const d = await measure( { svg: '#front', line: '#eye', guides: '#eye-guides', ticks: '#eye-ticks', label: '#eye-label' } );
	near( d.startX, ( 120 / 680 ) * 100 );
	near( d.startY, ( 238 / 300 ) * 100 );
	near( d.endX, ( 290 / 680 ) * 100 );
	near( d.extReach, ( 34 / 680 ) * 100 );
	assert.equal( d.extReachEnd, null, 'both guides reach alike' );
	near( d.extOvershoot, ( 6 / 680 ) * 100 );
	near( d.tickLength, ( 12 / 680 ) * 100 );
	near( d.labelX, 30.1, 0.2 );
	near( d.labelY, 82, 0.2 );
} );

test( 'a vertical line reaching the other way, and uneven reaches in one guide path', async () => {
	const h = await measure( { svg: '#front', line: '#ht', guides: '#ht-guides' } );
	near( h.extReach, ( -46 / 680 ) * 100 );
	const t = await measure( { svg: '#front', line: '#tp', guides: '#tp-guides' } );
	near( t.extReach, ( 120 / 680 ) * 100 );
	near( t.extReachEnd, ( 52 / 680 ) * 100 );
} );

test( 'negative control: a selector that matches nothing is an error, never a zero', async () => {
	assert.ok( ( await measure( { svg: '#front', line: '#missing' } ) ).error );
	assert.ok( ( await measure( { svg: '#nope', line: '#eye' } ) ).error );
} );
